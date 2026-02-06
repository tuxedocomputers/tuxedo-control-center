import { Injectable } from '@angular/core';

// Declare the electron interface exposed by preload.ts
interface ElectronWindow {
  electron?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ipcRenderer: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shell: any;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  
  private get electronWindow(): ElectronWindow {
    return window as unknown as ElectronWindow;
  }

  get ipcRenderer() {
    return this.electronWindow.electron ? this.electronWindow.electron.ipcRenderer : null;
  }

  get shell() {
    return this.electronWindow.electron ? this.electronWindow.electron.shell : null;
  }

  get process() {
      return {
          cwd: () => {
              return this.ipcRenderer ? this.ipcRenderer.sendSync('get-cwd') : '';
          }
      };
  }

  get remote() {
      return {
          app: {
              getVersion: () => {
                  return this.ipcRenderer ? this.ipcRenderer.sendSync('get-app-version') : '';
              }
          },
          process: {
              versions: this.ipcRenderer ? this.ipcRenderer.sendSync('get-process-versions') : {}
          },
          dialog: {
              showMessageBox: async (winOrOptions: unknown, options?: unknown) => {
                 const actualOptions = options || winOrOptions;
                 return await this.ipcRenderer.invoke('dialog-show-message-box', actualOptions);
              }
          },
          getCurrentWindow: () => {
              return {
                  close: () => this.ipcRenderer.send('window-close'),
                  minimize: () => this.ipcRenderer.send('window-minimize'),
                  maximize: () => this.ipcRenderer.send('window-maximize')
              };
          }
      };
  }
}
