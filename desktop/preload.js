const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  toggleKiosk: () => ipcRenderer.invoke('toggle-kiosk'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  restartAndInstallUpdate: () => ipcRenderer.invoke('restart-and-install-update'),
  relaunch: () => ipcRenderer.invoke('app-relaunch'),
  emergencyHeal: () => ipcRenderer.invoke('emergency-heal'),
  quitApp: () => ipcRenderer.invoke('app-quit'),
  printSilent: (html) => ipcRenderer.invoke('print-silent', html),
  saveStatementPdf: (data) => ipcRenderer.invoke('save-statement-pdf', data),
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (_event, info) => callback(info));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info));
  },
});
