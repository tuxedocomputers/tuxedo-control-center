import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { ChargingSettingsComponent } from './charging-settings.component';
import { ElectronService } from '../electron.service';
import { TccDBusClientService } from '../tcc-dbus-client.service';

describe('ChargingSettingsComponent', () => {
  let component: ChargingSettingsComponent;
  let fixture: ComponentFixture<ChargingSettingsComponent>;

  const mockDbusInterface = {
    getChargingProfilesAvailable: jasmine.createSpy('getChargingProfilesAvailable').and.returnValue(Promise.resolve([])),
    getCurrentChargingProfile: jasmine.createSpy('getCurrentChargingProfile').and.returnValue(Promise.resolve('')),
    getChargingPrioritiesAvailable: jasmine.createSpy('getChargingPrioritiesAvailable').and.returnValue(Promise.resolve([])),
    getCurrentChargingPriority: jasmine.createSpy('getCurrentChargingPriority').and.returnValue(Promise.resolve('')),
    getChargeStartAvailableThresholds: jasmine.createSpy('getChargeStartAvailableThresholds').and.returnValue(Promise.resolve([])),
    getChargeEndAvailableThresholds: jasmine.createSpy('getChargeEndAvailableThresholds').and.returnValue(Promise.resolve([])),
    getChargeStartThreshold: jasmine.createSpy('getChargeStartThreshold').and.returnValue(Promise.resolve(0)),
    getChargeEndThreshold: jasmine.createSpy('getChargeEndThreshold').and.returnValue(Promise.resolve(0)),
    getChargeType: jasmine.createSpy('getChargeType').and.returnValue(Promise.resolve('')),
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ChargingSettingsComponent, HttpClientTestingModule, RouterTestingModule, MatDialogModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        {
          provide: ElectronService,
          useValue: {
            ipcRenderer: {
              invoke: jasmine.createSpy('invoke').and.returnValue(Promise.resolve()),
              on: jasmine.createSpy('on'),
              send: jasmine.createSpy('send')
            }
          }
        },
        {
          provide: TccDBusClientService,
          useValue: {
            getInterface: () => mockDbusInterface
          }
        }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChargingSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
