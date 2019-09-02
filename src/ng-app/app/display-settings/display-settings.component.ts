import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { DBusService } from '../dbus.service';
import { Subscription } from 'rxjs';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-display-settings',
  templateUrl: './display-settings.component.html',
  styleUrls: ['./display-settings.component.scss']
})
export class DisplaySettingsComponent implements OnInit, OnDestroy {

  private subscriptions = new Subscription();
  private updateInterval: NodeJS.Timeout;
  private updateIntervalMs = 1000;

  public inputBrightness = new FormControl(1);
  private disableBrightnessUpdate = false;
  private lastDisableTimer: NodeJS.Timeout;

  constructor(private dbus: DBusService, private ref: ChangeDetectorRef) { }

  ngOnInit() {
    this.periodicUpdate();
    this.updateInterval = setInterval(() => { this.periodicUpdate(); }, this.updateIntervalMs);
    this.initializeDBusBrightness();
  }

  private initializeDBusBrightness(): void {
    if (this.dbus.currentDisplayBrightness !== undefined && this.disableBrightnessUpdate === false) {
      this.inputBrightness.setValue(this.dbus.currentDisplayBrightness);
    }
    this.subscriptions.add(this.dbus.observeDisplayBrightness.subscribe((brightnessPercent) => {
      if (this.disableBrightnessUpdate === false) {
        this.inputBrightness.setValue(brightnessPercent);
        // Speed up change detection for more responsive display
        this.ref.detectChanges();
      }
    }));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.updateInterval) { clearInterval(this.updateInterval); }
  }

  private periodicUpdate(): void {
  }

  inputBrightnessChange(valuePercent: number): void {
    this.disableBrightnessUpdate = true;
    console.log(valuePercent);
    if (valuePercent === 100) {
      this.dbus.setDisplayBrightness(valuePercent);
    } else {
      this.dbus.setDisplayBrightness(valuePercent + 1);
    }
    if (this.lastDisableTimer) { clearTimeout(this.lastDisableTimer); }
    this.lastDisableTimer = setTimeout(() => {
        this.disableBrightnessUpdate = false;
        this.inputBrightness.setValue(this.dbus.currentDisplayBrightness);
    }, 500);
  }
}
