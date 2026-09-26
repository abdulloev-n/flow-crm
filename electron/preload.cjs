const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('flow', {
  load: () => ipcRenderer.invoke('state:load'),
  save: data => ipcRenderer.invoke('state:save', data),
  onSaveStatus: callback => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('state:status', handler);
    return () => ipcRenderer.removeListener('state:status', handler);
  },
  storageInfo: () => ipcRenderer.invoke('storage:info'),
  chooseStorage: () => ipcRenderer.invoke('storage:choose'),
  moveStorage: (path, useExisting) => ipcRenderer.invoke('storage:move', path, useExisting),
  openStorage: () => ipcRenderer.invoke('storage:open'),
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  restart: () => ipcRenderer.invoke('app:restart'),
  notify: (title, body) => ipcRenderer.invoke('app:notify', title, body),
  appVersion: () => ipcRenderer.invoke('app:version'),
});
