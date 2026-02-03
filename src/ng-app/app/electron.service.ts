import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  
  get ipcRenderer() {
    return window.electron ? window.electron.ipcRenderer : null;
  }

  get shell() {
    return window.electron ? window.electron.shell : null;
  }
}
