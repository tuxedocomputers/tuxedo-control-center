import { contextBridge, ipcRenderer, shell } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
      // Intentionally wrapping to strip the event.sender for security if desired, 
      // but for migration mapping we pass it through or wrapper
      ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
    },
    addListener: (channel: string, listener: (event: any, ...args: any[]) => void) => {
        ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
    },
    once: (channel: string, listener: (event: any, ...args: any[]) => void) => {
        ipcRenderer.once(channel, (event, ...args) => listener(event, ...args));
    },
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    sendSync: (channel: string, ...args: any[]) => ipcRenderer.sendSync(channel, ...args),
    removeListener: (channel: string, listener: any) => ipcRenderer.removeListener(channel, listener),
    off: (channel: string, listener: any) => ipcRenderer.removeListener(channel, listener),
    removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel)
  },
  shell: {
    openExternal: (url: string) => shell.openExternal(url)
  },
  fs: {
    readFile: (path: string) => ipcRenderer.invoke('fs-read-file', path),
    writeFile: (path: string, data: string, options?: any) => ipcRenderer.invoke('fs-write-file', { path, data, options }),
    exists: (path: string) => ipcRenderer.invoke('fs-exists', path),
    mkdir: (path: string, options?: any) => ipcRenderer.invoke('fs-mkdir', { path, options }),
    chmod: (path: string, mode: any) => ipcRenderer.invoke('fs-chmod', { path, mode }),
  }
});
