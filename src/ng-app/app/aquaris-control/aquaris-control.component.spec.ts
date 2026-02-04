import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { DecimalPipe } from '@angular/common';

import { AquarisControlComponent } from './aquaris-control.component';
import { ElectronService } from '../electron.service';

describe('AquarisControlComponent', () => {
  let component: AquarisControlComponent;
  let fixture: ComponentFixture<AquarisControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AquarisControlComponent, HttpClientTestingModule, RouterTestingModule, MatDialogModule],
      providers: [
        DecimalPipe,
        {
          provide: ElectronService,
          useValue: {
            ipcRenderer: {
              invoke: jasmine.createSpy('invoke').and.callFake((channel: string, args: any[]) => {
                const method = (args && Array.isArray(args) && args.length > 0) ? args[0] : null;

                if (method === 'getState') {
                  return Promise.resolve({
                    deviceUUID: 'mock-uuid',
                    red: 0, green: 0, blue: 0,
                    ledMode: 0,
                    fanDutyCycle: 0, pumpDutyCycle: 0,
                    pumpVoltage: 0,
                    ledOn: false, fanOn: false, pumpOn: false
                  });
                }
                if (method === 'getDevices') {
                  return Promise.resolve([]);
                }
                return Promise.resolve({});
              }),
              send: jasmine.createSpy('send'),
              on: jasmine.createSpy('on')
            }
          }
        }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AquarisControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
