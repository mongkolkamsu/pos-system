const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  printTagsDirect: (data) => ipcRenderer.invoke('print-tags-direct', data),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available-to-ui', (event, data) => callback(data)),
  
  // 🟢 ช่องทางใหม่สำหรับระบบกดอัปเดต
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded-to-ui', () => callback()),
  restartAndInstallUpdate: () => ipcRenderer.invoke('restart-and-install-update'),
  checkForUpdatesManual: () => ipcRenderer.invoke('check-for-updates-manual')
});