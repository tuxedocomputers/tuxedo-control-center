import { ipcRenderer, shell } from 'electron';

// Expose electron APIs to window global (contextIsolation: false mode)
// Note: nodeIntegration is true, so renderer has direct access to Node APIs.
// This preload script provides a clean interface for the ElectronService.
(window as any).electron = {
  ipcRenderer: ipcRenderer,
  shell: {
    openExternal: (url: string) => shell.openExternal(url)
  }
};
