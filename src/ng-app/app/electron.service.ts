import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  
  get ipcRenderer() {
    return (window as any).electron ? (window as any).electron.ipcRenderer : null;
  }

  get shell() {
    return (window as any).electron ? (window as any).electron.shell : null;
  }

  get process() {
      return {
          cwd: () => {
              return this.ipcRenderer ? this.ipcRenderer.sendSync('get-cwd') : '';
          }
      };
  }

  get remote() {
      const that = this;
      return {
          app: {
              getVersion: () => {
                  return that.ipcRenderer ? that.ipcRenderer.sendSync('get-app-version') : '';
              }
          },
          process: {
              get versions() {
                  return that.ipcRenderer ? that.ipcRenderer.sendSync('get-process-versions') : {};
              }
          },
          dialog: {
              // Note: This changes behavior from Sync (if used so) to Async promise return.
              // Legacy code awaits it?
              // The error in main-gui.component.ts was strictly property existence.
              showMessageBox: async (winOrOptions: any, options?: any) => {
                 // Handle overloaded signature
                 const actualOptions = options || winOrOptions;
                 return await that.ipcRenderer.invoke('dialog-show-message-box', actualOptions);
              }
          },
          getCurrentWindow: () => {
              return {
                  close: () => that.ipcRenderer.send('window-close'),
                  minimize: () => that.ipcRenderer.send('window-minimize'),
                  maximize: () => that.ipcRenderer.send('window-maximize')
              };
          }
      };
  }
}
