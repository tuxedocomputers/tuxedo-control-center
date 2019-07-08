import { Component } from '@angular/core';
import { ElectronService } from 'ngx-electron';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  constructor(private electron: ElectronService) {}

  title = 'TUXEDO Control Center';

  buttonExit() {
    this.electron.remote.getCurrentWindow().close();
  }
}
