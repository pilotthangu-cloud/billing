const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    title: 'Beta Pharmacy POS & Management Terminal',
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
// Guaranteed identical to legacy Clipper / DOS printing.
ipcMain.handle('print-raw-tvs', async (event, payload = {}) => {
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
      bufferToWrite = Buffer.from("EMPTY PRINT JOB\r\n\x0C", 'ascii');
    }

    fs.writeFileSync(tempPrnPath, bufferToWrite);

    // 2. Execute native winspool.drv raw print helper
    return new Promise((resolve) => {
      const ps = spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', psScriptPath,
        '-PrinterName', printerName,
        '-FilePath', tempPrnPath
      ]);

      let stdOut = '';
      let stdErr = '';

      ps.stdout.on('data', (data) => { stdOut += data.toString(); });
      ps.stderr.on('data', (data) => { stdErr += data.toString(); });

      ps.on('close', (code) => {
        try { if (fs.existsSync(tempPrnPath)) fs.unlinkSync(tempPrnPath); } catch (e) {}

        if (code === 0) {
          console.log('[Native Print OK]:', stdOut.trim());
          resolve({ success: true, message: stdOut.trim() });
        } else {
          console.error('[Native Print Failed]:', stdErr || stdOut);
          resolve({ success: false, error: (stdErr || stdOut).trim() });
        }
      });

      ps.on('error', (err) => {
        try { if (fs.existsSync(tempPrnPath)) fs.unlinkSync(tempPrnPath); } catch (e) {}
        console.error('[Native Print Spawn Error]:', err);
        resolve({ success: false, error: err.message });
      });
    });
  } catch (err) {
    console.error('print-raw-tvs exception:', err);
    return { success: false, error: err.message };
  }
});

// 2. Silent Print Route: Always routes dot-matrix print requests to print-raw-tvs
ipcMain.handle('print-silent', async (event, options = {}) => {
  if (options.rawBytes || options.rawText) {
    return ipcMain.emit('print-raw-tvs', event, options);
  }
  return { success: true };
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
