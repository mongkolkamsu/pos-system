const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  printTagsDirect: (data) => ipcRenderer.invoke('print-tags-direct', data),

  // 🟢 สะพานเชื่อมระบบ Release Notes และ อัปเดต
  getCurrentReleaseNotes: () => ipcRenderer.invoke('get-current-release-notes'),
  checkForUpdatesManual: () => ipcRenderer.invoke('check-for-updates-manual'),
  startDownloadUpdate: () => ipcRenderer.invoke('start-download-update'),
  restartAndInstallUpdate: () => ipcRenderer.invoke('restart-and-install-update'),
  onUpdateProgress: (callback) => ipcRenderer.on('update-download-progress', (event, data) => callback(data)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded-to-ui', () => callback()),
  onUpdateError: (callback) => ipcRenderer.on('update-error-to-ui', (event, msg) => callback(msg))
});