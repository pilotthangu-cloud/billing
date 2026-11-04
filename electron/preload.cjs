const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  printSilent: (options) => ipcRenderer.invoke('print-silent', options),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printRawTvs: (data) => ipcRenderer.invoke('print-raw-tvs', data)
});
