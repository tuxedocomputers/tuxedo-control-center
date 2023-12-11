/*!
 * Copyright (c) 2020-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
 *
 * This file is part of TUXEDO Control Center.
 *
 * TUXEDO Control Center is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * TUXEDO Control Center is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with TUXEDO Control Center.  If not, see <https://www.gnu.org/licenses/>.
 */
import { Injectable } from '@angular/core';
import { ScalingDriver } from '../../common/classes/LogicalCpuController';
import { DMIController } from '../../common/classes/DMIController';
import { SysFsService } from './sys-fs.service';
import { TccDBusClientService } from './tcc-dbus-client.service';

@Injectable({
  providedIn: 'root'
})
export class CompatibilityService {

  private hasAquarisValue: boolean;

  constructor(private tccDbus: TccDBusClientService, private sysfs: SysFsService) {
    // TODO: Manual read until general device id get merged
    const dmi = new DMIController('/sys/class/dmi/id');
    const deviceName = dmi.productSKU.readValueNT();
    const boardVendor = dmi.boardVendor.readValueNT();
    const chassisVendor = dmi.chassisVendor.readValueNT();
    const sysVendor = dmi.sysVendor.readValueNT();
    let showAquarisMenu;
    const isTuxedo = (boardVendor !== undefined && boardVendor.toLowerCase().includes('tuxedo')) ||
                     (chassisVendor !== undefined && chassisVendor.toLowerCase().includes('tuxedo')) ||
                     (sysVendor !== undefined && sysVendor.toLowerCase().includes('tuxedo'));

    if (isTuxedo) {
        if (deviceName !== undefined &&
            (deviceName === 'STELLARIS1XI04' ||
             deviceName === 'STEPOL1XA04' ||
             deviceName === 'STELLARIS1XI05')) {
        showAquarisMenu = true;
      } else {
        showAquarisMenu = false;
      }
    } else {
      showAquarisMenu = true;
    }
    this.hasAquarisValue = showAquarisMenu;
  }

  get hasFanInfo(): boolean {
    return this.hasFanControl;
  }

  // hasFanControl==true implies hasFanInfo==true, but not the other way around
  get hasFanControl(): boolean {
    /*const dmi = new DMIController('/sys/class/dmi/id');
    const boardName = dmi.boardName.readValueNT();
    // when adding or removing devices here don't forget to also alter getFanControlStatus() from FanControlWorker.ts from tccd
    if (boardName === "GMxRGxx") {
      return false;
    }*/
    return this.tccDbus.tuxedoWmiAvailable.value && this.tccDbus.fanData.value.cpu.temp.data.value > 1;
  }

  get fanControlCompatibilityMessage(): string {
    return $localize `:@@compatibilityMessageNoFanControl:This feature is not supported on your model.`;
  }

  get hasWebcamControl(): boolean {
    return this.tccDbus.tuxedoWmiAvailable.value && this.tccDbus.webcamSWAvailable.value;
  }

  get webcamControlCompatibilityMessage(): string {
    return $localize `:@@compatibilityMessageNoWebcamSwitch:This feature is not supported on your model.`;
  }

  get hasODMProfileControl(): boolean {
      return this.tccDbus.odmProfilesAvailable.value !== undefined &&
        this.tccDbus.odmProfilesAvailable.value.length > 0;
  }

  get hasODMPowerLimitControl(): boolean {
      return this.tccDbus.tuxedoWmiAvailable.value &&
        this.tccDbus.odmPowerLimits.value !== undefined &&
        this.tccDbus.odmPowerLimits.value.length > 0;
  }

  get uwLEDOnlyMode(): boolean {
      return this.hasODMPowerLimitControl &&
        this.hasODMProfileControl;
  }

  get tccDbusAvailable() {
    return this.tccDbus.available;
  }

  get hasAquaris() {
    return this.hasAquarisValue;
  }

  /**
  * Condition where max freq workaround is applicable
  * (aka max freq missing regulated through boost flag)
  */
  get hasMissingMaxFreqBoostWorkaround() {
    if (this.sysfs.generalCpuInfo.value !== undefined && this.sysfs.logicalCoreInfo.value !== undefined) {
        const boost = this.sysfs.generalCpuInfo.value.boost;
        const scalingDriver = this.sysfs.logicalCoreInfo.value[0].scalingDriver;
        return boost !== undefined && scalingDriver === ScalingDriver.acpi_cpufreq;
    } else {
        return false;
    }
  }
}
