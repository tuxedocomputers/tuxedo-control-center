import { Component, OnInit } from '@angular/core';
import { UtilsService } from '../utils.service';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss']
})
export class InfoComponent implements OnInit {

  public appVersion = this.utils.getAppVersion();
  public nodeVersion = this.utils.getProcessVersions().node;
  public electronVersion = this.utils.getProcessVersions().electron;
  public chromeVersion = this.utils.getProcessVersions().chrome;

  constructor(
    private utils: UtilsService
  ) { }

  ngOnInit() {
  }

}
