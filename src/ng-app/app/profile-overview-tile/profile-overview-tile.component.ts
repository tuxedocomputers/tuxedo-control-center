import { Component, OnInit, Input } from '@angular/core';
import { ITccProfile } from 'src/common/models/TccProfile';
import { UtilsService } from '../utils.service';

@Component({
  selector: 'app-profile-overview-tile',
  templateUrl: './profile-overview-tile.component.html',
  styleUrls: ['./profile-overview-tile.component.scss']
})
export class ProfileOverviewTileComponent implements OnInit {

  @Input() profile: ITccProfile;
  @Input() hoverEffect = false;
  @Input() isSelected = false;

  constructor(
    private utils: UtilsService
  ) { }

  ngOnInit() {
  }

  public formatFrequency(frequency: number): string {
    return this.utils.formatFrequency(frequency);
  }
}
