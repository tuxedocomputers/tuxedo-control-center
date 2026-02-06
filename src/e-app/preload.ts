import { ipcRenderer, shell } from 'electron';

// Expose electron APIs to window global (contextIsolation: false mode)
(window as any).electron = {
  ipcRenderer: ipcRenderer,
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
};
