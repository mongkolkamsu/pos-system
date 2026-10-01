const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printTagsDirect: (html) => ipcRenderer.invoke('print-tags-direct', html),
  getAppVersion: () => ipcRenderer.invoke('get-app-version') // 🟢 เพิ่มบรรทัดนี้
});