// Isolated Electron test: no pharmacy profile and no network requests.
const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const workspace = path.resolve(__dirname, '..');
const testRoot = path.join(workspace, '.runtime-tests');
fs.mkdirSync(testRoot, { recursive: true });
app.setPath('userData', fs.mkdtempSync(path.join(testRoot, 'storage-')));
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  let win;
  try {
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => callback({ cancel: true }));
    win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, webSecurity: false, preload: path.join(workspace, 'electron/preload.cjs') } });
    await win.loadFile(path.join(workspace, 'dist/index.html'));
    const storageUrl = pathToFileURL(path.join(workspace, 'src/utils/indexedDb.js')).href;
    const result = await win.webContents.executeJavaScript(`(async () => {
      const storage = await import(${JSON.stringify(storageUrl)});
      const first = await storage.idbCacheMedicines([{ code: 'SMOKE', name: 'STORAGE TEST', stock: 435 }], { replace: true });
      const rows = await storage.idbGetCachedMedicines();
      return { pageLoaded: Boolean(document.getElementById('root')?.textContent), electronBridge: window.electronAPI?.isElectron, first, persistedStock: rows.find(m => m.code === 'SMOKE')?.stock, status: storage.getPharmaStorageStatus() };
    })()`);
    console.log(JSON.stringify(result));
    if (!result.pageLoaded || !result.electronBridge || !result.first.success || result.persistedStock !== 435) throw new Error('Electron smoke assertions failed');
    win.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack);
    if (win) win.destroy();
    app.exit(1);
  }
});
