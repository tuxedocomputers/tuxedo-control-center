import { Component, OnInit, Input } from '@angular/core';
import { ITccProfile } from '../../../common/models/TccProfile';
import { UtilsService } from '../utils.service';
import { StateService, IStateInfo } from '../state.service';
import { ITccSettings } from '../../../common/models/TccSettings';
import { ConfigService } from '../config.service';

@Component({
  selector: 'app-profile-overview-tile',
  templateUrl: './profile-overview-tile.component.html',
  styleUrls: ['./profile-overview-tile.component.scss']
})
export class ProfileOverviewTileComponent implements OnInit {

  @Input() profile: ITccProfile;
  @Input() hoverEffect = false;
  @Input() isSelected = false;
  @Input() visible = true;
  @Input() active = false;

  constructor(
    private utils: UtilsService,
    private state: StateService,
    private config: ConfigService
  ) { }

  ngOnInit() {
  }

  public getStateInputs(): IStateInfo[] {
    return this.state.getStateInputs();
  }

  public getSettings(): ITccSettings {
    return this.config.getSettings();
  }

  public formatFrequency(frequency: number): string {
    return this.utils.formatFrequency(frequency);
  }
}
