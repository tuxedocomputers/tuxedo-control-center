import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { ITccProfile, TccProfile } from '../../../common/models/TccProfile';
import { UtilsService } from '../utils.service';
import { ITccSettings } from '../../../common/models/TccSettings';
import { ConfigService } from '../config.service';
import { StateService, IStateInfo } from '../state.service';
import { SysFsService, IGeneralCPUInfo } from '../sys-fs.service';
import { Subscription } from 'rxjs';
import { FormGroup, FormBuilder } from '@angular/forms';

@Component({
  selector: 'app-profile-details-edit',
  templateUrl: './profile-details-edit.component.html',
  styleUrls: ['./profile-details-edit.component.scss']
})
export class ProfileDetailsEditComponent implements OnInit, OnDestroy {

  @Input() viewProfile: ITccProfile;

  public gridParams = {
    cols: 8,
    headerSpan: 4,
    valueSpan: 1,
    inputSpan: 3
  };

  public profileFormGroup: FormGroup;

  private subscriptions: Subscription = new Subscription();
  public cpuInfo: IGeneralCPUInfo;
  public editProfile: ITccProfile;

  constructor(
    private utils: UtilsService,
    private config: ConfigService,
    private state: StateService,
    private sysfs: SysFsService,
    private fb: FormBuilder
  ) { }

  ngOnInit() {
    this.subscriptions.add(this.sysfs.generalCpuInfo.subscribe(generalCpuInfo => { this.cpuInfo = generalCpuInfo; }));
    this.subscriptions.add(this.config.editingProfile.subscribe(profile => {

      this.editProfile = profile;
      let p: ITccProfile;
      if (profile !== undefined) {
        p = profile;
      } else {
        // Not displayed dummy
        p = this.config.getDefaultProfiles()[0];
      }

      // Create form group from profile
      this.profileFormGroup = this.fb.group({
        name: p.name,
        display: this.fb.group(p.display),
        cpu: this.fb.group(p.cpu)
      });
    }));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
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
