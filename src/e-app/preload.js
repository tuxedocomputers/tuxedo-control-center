const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
  'IPC',
  {
    send: ipcRenderer.send,
    invoke: ipcRenderer.invoke
  }
)