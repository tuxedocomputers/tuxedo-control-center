import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ConfigService } from '../config.service';
import { ITccProfile } from 'src/common/models/TccProfile';

@Component({
  selector: 'app-profile-manager',
  templateUrl: './profile-manager.component.html',
  styleUrls: ['./profile-manager.component.scss']
})
export class ProfileManagerComponent implements OnInit {

  public currentProfile: ITccProfile;

  constructor(private route: ActivatedRoute, private config: ConfigService) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params.profileName) {
        this.currentProfile = this.config.getProfileByName(params.profileName);
      } else {
        this.currentProfile = this.config.getActiveProfile();
      }
    });
  }

  public setActiveProfile(profileName: string): void {
    setImmediate(() => {
      if (profileName !== this.config.getSettings().activeProfileName) {
        this.config.setActiveProfile(profileName);
      }
    });
  }

  public showApplyProfileButton(): boolean {
    return this.currentProfile.name !== this.config.getActiveProfile().name;
  }

}
