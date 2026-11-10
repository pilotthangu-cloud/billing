const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Optimize for legacy Windows 7 & low-spec counter PCs:
// Disables GPU emulation loops that peg old CPUs at 100%
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-software-rasterizer');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    title: `Beta Pharmacy POS ${app.getVersion()}`,
    backgroundColor: '#09090b',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false
    }
  });

  // Always prioritize loading the local offline high-speed build first
  const localDistPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(localDistPath)) {
    mainWindow.loadFile(localDistPath);
  } else {
    // Development fallback
    mainWindow.loadURL('http://localhost:3000');
  }

  // Keyboard shortcut: F12 for DevTools, Ctrl+R / F5 for reload
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    if ((input.key === 'F5' || (input.control && input.key === 'r')) && input.type === 'keyDown') {
      mainWindow.reload();
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// -------------------------------------------------------------
// NATIVE ZERO-POPUP PRINT HANDLERS (RAW WINSPOOL.DRV ENGINE)
// -------------------------------------------------------------

// 1. Direct Raw ESC/P Text Print via Windows Native Spooler (winspool.drv)
// Bypasses Chromium graphics rasterization, GDI, and A4 driver overrides completely.
// Sends the generated ESC/P stream directly to the Windows RAW spooler.
async function printRawTvs(payload = {}) {
  try {
    const printerName = payload.printerName || 'TVS';
    const tempPrnPath = path.join(app.getPath('temp'), `tvs_raw_${Date.now()}.prn`);
    const psScriptPath = path.join(__dirname, 'rawPrinter.ps1');

    // 1. Prepare raw binary buffer
    let bufferToWrite = null;
    if (payload.rawBytes && Array.isArray(payload.rawBytes)) {
      bufferToWrite = Buffer.from(payload.rawBytes);
    } else if (Buffer.isBuffer(payload.rawBytes)) {
      bufferToWrite = payload.rawBytes;
    } else if (payload.rawText && typeof payload.rawText === 'string') {
      bufferToWrite = Buffer.from(payload.rawText, 'ascii');
    } else {
      bufferToWrite = Buffer.from("EMPTY PRINT JOB\r\n", 'ascii');
    }

    fs.writeFileSync(tempPrnPath, bufferToWrite);

    // 2. Generate self-contained winspool.drv raw print script (No external file dependency, runs safely inside app.asar)
    const psScript = `
$PrinterName = "${(printerName || 'TVS').replace(/"/g, '')}"
$FilePath = "${tempPrnPath.replace(/\\/g, '\\\\')}"

try {
    $allPrinters = if (Get-Command Get-CimInstance -ErrorAction SilentlyContinue) {
        @(Get-CimInstance Win32_Printer)
    } else {
        @(Get-WmiObject Win32_Printer)
    }
    $target = $null

    if ($PrinterName) {
        $target = $allPrinters | Where-Object { $_.Name -eq $PrinterName } | Select-Object -First 1
    }
    if (-not $target) {
        $target = $allPrinters | Where-Object { $_.Name -like "*TVS*" -or $_.Name -like "*MSP*" } | Select-Object -First 1
    }

    if (-not $target) {
        $available = ($allPrinters | ForEach-Object { $_.Name }) -join ", "
        Write-Output "ERROR: Configured TVS/MSP printer was not found. Installed printers: $available"
        exit 1
    }

    $actualPrinterName = $target.Name

    $code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] pBytes) {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Beta Pharmacy Receipt";
        di.pDataType = "RAW";
        bool success = false;

        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(pBytes.Length);
                    Marshal.Copy(pBytes, 0, pUnmanagedBytes, pBytes.Length);
                    int dwWritten = 0;
                    success = WritePrinter(hPrinter, pUnmanagedBytes, pBytes.Length, out dwWritten) && dwWritten == pBytes.Length;
                    Marshal.FreeCoTaskMem(pUnmanagedBytes);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        return success;
    }
}
"@

    Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue

    if (-not (Test-Path $FilePath)) {
        Write-Output "ERROR: Spool file not found at $FilePath"
        exit 2
    }

    $rawBytes = [System.IO.File]::ReadAllBytes($FilePath)
    $ok = [RawPrinterHelper]::SendBytesToPrinter($actualPrinterName, $rawBytes)

    if ($ok) {
        Write-Output "SUCCESS: Printed raw stream to [$actualPrinterName] ($($rawBytes.Length) bytes)"
        exit 0
    } else {
        Write-Output "ERROR: winspool.drv WritePrinter failed for [$actualPrinterName]"
        exit 3
    }
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    exit 4
}
`;

    const encodedCommand = Buffer.from(psScript, 'utf16le').toString('base64');

    // 3. Execute native winspool.drv raw print helper via EncodedCommand
    return new Promise((resolve) => {
      const ps = spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-EncodedCommand', encodedCommand
      ]);

      let stdOut = '';
      let stdErr = '';
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(result);
      };
      const timeout = setTimeout(() => {
        try { ps.kill(); } catch (_) {}
        try { if (fs.existsSync(tempPrnPath)) fs.unlinkSync(tempPrnPath); } catch (_) {}
        finish({ success: false, error: 'TVS printer did not respond within 15 seconds. The bill remains saved for reprint.' });
      }, 15000);

      ps.stdout.on('data', (data) => { stdOut += data.toString(); });
      ps.stderr.on('data', (data) => { stdErr += data.toString(); });

      ps.on('close', (code) => {
        try { if (fs.existsSync(tempPrnPath)) fs.unlinkSync(tempPrnPath); } catch (e) {}

        if (code === 0) {
          console.log('[Native Print OK]:', stdOut.trim());
          finish({ success: true, message: stdOut.trim() });
        } else {
          console.error('[Native Print Failed]:', stdErr || stdOut);
          finish({ success: false, error: (stdErr || stdOut).trim() });
        }
      });

      ps.on('error', (err) => {
        try { if (fs.existsSync(tempPrnPath)) fs.unlinkSync(tempPrnPath); } catch (e) {}
        console.error('[Native Print Spawn Error]:', err);
        finish({ success: false, error: err.message });
      });
    });
  } catch (err) {
    console.error('print-raw-tvs exception:', err);
    return { success: false, error: err.message };
  }
}

ipcMain.handle('print-raw-tvs', async (_event, payload = {}) => printRawTvs(payload));

// 2. Silent Print Route: Always routes dot-matrix print requests to print-raw-tvs
ipcMain.handle('print-silent', async (event, options = {}) => {
  if (options.rawBytes || options.rawText) {
    return printRawTvs(options);
  }
  return { success: false, error: 'Silent printing requires a raw ESC/P byte stream.' };
});

// 3. Fetch list of all installed Windows printers
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  try {
    return await mainWindow.webContents.getPrintersAsync();
  } catch (e) {
    return [];
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
