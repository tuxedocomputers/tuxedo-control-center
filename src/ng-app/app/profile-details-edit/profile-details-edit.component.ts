import { Component, OnInit, Input } from '@angular/core';
import { ITccProfile } from '../../../common/models/TccProfile';
import { UtilsService } from '../utils.service';

@Component({
  selector: 'app-profile-details-edit',
  templateUrl: './profile-details-edit.component.html',
  styleUrls: ['./profile-details-edit.component.scss']
})
export class ProfileDetailsEditComponent implements OnInit {

  @Input() profile: ITccProfile

  constructor(
    private utils: UtilsService
  ) { }

  ngOnInit() {
  }

  public formatFrequency(frequency: number): string {
    return this.utils.formatFrequency(frequency);
  }
}
