import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { start } from 'repl';
import { ITccProfile } from 'src/common/models/TccProfile';
import { ITccSettings, ProfileSwitchSettings } from 'src/common/models/TccSettings';
import { ConfigService } from '../config.service';

@Component({
    selector: 'app-profile-switch-timer',
    templateUrl: './profile-switch-timer.component.html',
    styleUrls: ['./profile-switch-timer.component.scss']
})
export class ProfileSwitchTimerComponent implements OnInit {

    public profiles: ITccProfile[];
    public profileSwitchSettings: ProfileSwitchSettings;

    public hours: Array<number> = [...Array(24).keys()];
    public minutes: Array<number> = [...Array(60).keys()];

    private _dayTable = {
        "dayMo": "mon",
        "dayDi": "tue",
        "dayMi": "wed",
        "dayDo": "thu",
        "dayFr": "fri",
        "daySa": "sat",
        "daySo": "sun"
    };

    settingsFormGroup: FormGroup = new FormGroup({
        activate: new FormControl("", Validators.required),
        profileNameAC: new FormControl("", Validators.required),
        profileNameBat: new FormControl("", Validators.required),
        startTimeHour: new FormControl("", Validators.required),
        startTimeMinute: new FormControl("", Validators.required),
        endTimeHour: new FormControl("", Validators.required),
        endTimeMinute: new FormControl("", Validators.required),
        dayMo: new FormControl(""),
        dayDi: new FormControl(""),
        dayMi: new FormControl(""),
        dayDo: new FormControl(""),
        dayFr: new FormControl(""),
        daySa: new FormControl(""),
        daySo: new FormControl(""),
    }, )

    constructor(private config: ConfigService) {
    }

    ngOnInit() {
        this.profiles = this.getAllProfiles();
        this.profileSwitchSettings = this.config.getSettings().profileSwitchSettings;

        this.settingsFormGroup.setValue({
            "activate": this.profileSwitchSettings.activate,
            "profileNameAC": this.profileSwitchSettings.profileNameAC,
            "profileNameBat": this.profileSwitchSettings.profileNameBat,
            "startTimeHour": this.profileSwitchSettings.startTime != null ? new Date(this.profileSwitchSettings.startTime).getHours() : 0,
            "startTimeMinute": this.profileSwitchSettings.startTime != null ? new Date(this.profileSwitchSettings.startTime).getMinutes() : 0,
            "endTimeHour": this.profileSwitchSettings.endTime != null ? new Date(this.profileSwitchSettings.endTime).getHours() : 0,
            "endTimeMinute": this.profileSwitchSettings.endTime != null ? new Date(this.profileSwitchSettings.endTime).getMinutes() : 0,
            "dayMo": this.profileSwitchSettings.days.includes("mon"),
            "dayDi": this.profileSwitchSettings.days.includes("tue"),
            "dayMi": this.profileSwitchSettings.days.includes("wed"),
            "dayDo": this.profileSwitchSettings.days.includes("thu"),
            "dayFr": this.profileSwitchSettings.days.includes("fri"),
            "daySa": this.profileSwitchSettings.days.includes("sat"),
            "daySo": this.profileSwitchSettings.days.includes("sun"),
        });
    }

    public getSettings(): ITccSettings {
        return this.config.getSettings();
    }

    public getAllProfiles(): ITccProfile[] {
        return this.config.getAllProfiles();
    }

    saveSettings() {
        for(let i in this.settingsFormGroup.controls) {
            if(!i.startsWith("day")) {
                console.log(`Name '${i}', value '${this.settingsFormGroup.get(i).value}'`);
            }
        }

        let startTime = new Date();
        startTime.setMilliseconds(0);
        startTime.setSeconds(0);
        startTime.setHours(this.settingsFormGroup.get("startTimeHour").value);
        startTime.setMinutes(this.settingsFormGroup.get("startTimeMinute").value);

        let endTime = new Date();
        endTime.setMilliseconds(0);
        endTime.setSeconds(0);
        endTime.setHours(this.settingsFormGroup.get("endTimeHour").value);
        endTime.setMinutes(this.settingsFormGroup.get("endTimeMinute").value);

        this.profileSwitchSettings.startTime = startTime.toISOString();
        this.profileSwitchSettings.endTime = endTime.toISOString();

        this.profileSwitchSettings.profileNameAC = this.settingsFormGroup.get("profileNameAC").value;
        this.profileSwitchSettings.profileNameBat = this.settingsFormGroup.get("profileNameBat").value;

        this.profileSwitchSettings.days = [];
        for(let i in this.settingsFormGroup.controls) {
            if(i.startsWith("day") && this.settingsFormGroup.get(i).value) {
                console.log(`Name '${i}', value '${this.settingsFormGroup.get(i).value}'`);
                this.profileSwitchSettings.days.push(this._dayTable[i]);
            }
        }

        // console.log(this.profileSwitchSettings.days);

        this.config.saveSettings();
    }
}
