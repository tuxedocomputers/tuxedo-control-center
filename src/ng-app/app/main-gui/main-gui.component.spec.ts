import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { MainGuiComponent } from './main-gui.component';
import { ElectronService } from '../electron.service';
import { UtilsService } from '../utils.service';

describe('MainGuiComponent', () => {
  let component: MainGuiComponent;
  let fixture: ComponentFixture<MainGuiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [MainGuiComponent],
      providers: [
        DecimalPipe,
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null }, data: {} } } },
        { provide: UtilsService, useValue: { 
            dialog: {},
            getLanguagesMenuArray: () => [{id:'en', label:'English'}, {id:'de', label:'German'}],
            getCurrentLanguageId: () => 'en'
        } },
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
            },
            remote: {
                dialog: { showMessageBox: jasmine.createSpy('showMessageBox') },
                getCurrentWindow: () => ({ close: jasmine.createSpy('close') })
            }
          }
        }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MainGuiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
