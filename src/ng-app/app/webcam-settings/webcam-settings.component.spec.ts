import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DecimalPipe } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { WebcamSettingsComponent } from './webcam-settings.component';
import { ElectronService } from '../electron.service';

describe('WebcamSettingsComponent', () => {
  let component: WebcamSettingsComponent;
  let fixture: ComponentFixture<WebcamSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [WebcamSettingsComponent],
    providers: [
      DecimalPipe,
      {
        provide: ElectronService,
        useValue: {
          ipcRenderer: {
            send: jasmine.createSpy('send'),
            invoke: jasmine.createSpy('invoke').and.returnValue(Promise.resolve()),
            on: jasmine.createSpy('on')
          },
          shell: {
            openExternal: jasmine.createSpy('openExternal')
          }
        }
      }
    ],
    schemas: [NO_ERRORS_SCHEMA]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WebcamSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
