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
// NATIVE ZERO-POPUP PRINT HANDLERS
// -------------------------------------------------------------

// 1. Silent HTML Print via Electron Chromium Spooler (Zero Popups)
ipcMain.handle('print-silent', async (event, options = {}) => {
  if (!mainWindow) return { success: false, error: 'No active window' };

  try {
    const printers = await mainWindow.webContents.getPrintersAsync();
    let targetPrinter = options.printerName || '';

    // If specific printer name wasn't found, find any TVS or Default printer
    const tvsPrinter = printers.find(p => p.name.toUpperCase().includes('TVS') || p.name.toUpperCase().includes('MSP'));
    const defaultPrinter = printers.find(p => p.isDefault);

    if (!targetPrinter && tvsPrinter) {
      targetPrinter = tvsPrinter.name;
    } else if (!targetPrinter && defaultPrinter) {
      targetPrinter = defaultPrinter.name;
    }

    return new Promise((resolve) => {
      mainWindow.webContents.print({
        silent: true,
        printBackground: true,
        deviceName: targetPrinter,
        color: false,
        margins: {
          marginType: 'none'
        },
        pageSize: {
          width: 215900,  // 8.5 inches in microns
          height: 139700  // 5.5 inches in microns (Half-Sheet Tractor Continuous)
        }
      }, (success, failureReason) => {
        if (!success) {
          console.warn('Silent print notice:', failureReason);
          resolve({ success: false, error: failureReason });
        } else {
          resolve({ success: true, printer: targetPrinter });
        }
      });
    });
  } catch (err) {
    console.error('Silent print exception:', err);
    return { success: false, error: err.message };
  }
});

// 2. Fetch list of all installed Windows printers
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  try {
    return await mainWindow.webContents.getPrintersAsync();
  } catch (e) {
    return [];
  }
});

// 3. Direct Raw ESC/P Text Print (Streams pure bytes to Windows Print Spooler)
ipcMain.handle('print-raw-tvs', async (event, { printerName, rawText }) => {
  try {
    const tempPrnPath = path.join(app.getPath('temp'), `tvs_bill_${Date.now()}.prn`);
    fs.writeFileSync(tempPrnPath, rawText, 'ascii');

    // Send to Windows printer spooler via PowerShell raw pipe
    const psScript = `
$printer = "${printerName || 'TVS MSP 250 Star'}"
$file = "${tempPrnPath.replace(/\\/g, '\\\\')}"
[System.IO.File]::ReadAllBytes($file) | Out-Null
cmd.exe /c "copy /b \`"$file\`" \`"\\\\localhost\\$printer\`"" 2>&1
`;
    return new Promise((resolve) => {
      const ps = spawn('powershell', ['-NoProfile', '-Command', psScript]);
      ps.on('close', (code) => {
        try { fs.unlinkSync(tempPrnPath); } catch (e) {}
        resolve({ success: code === 0 });
      });
      ps.on('error', () => {
        resolve({ success: false });
      });
    });
  } catch (err) {
    return { success: false, error: err.message };
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
