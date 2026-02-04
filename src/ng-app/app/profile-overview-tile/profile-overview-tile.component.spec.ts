import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { DecimalPipe } from '@angular/common';

import { ProfileOverviewTileComponent } from './profile-overview-tile.component';
import { StateService } from '../state.service';
import { ConfigService } from '../config.service';

const mockStateService = {
  getProfileStates: () => ({}),
  getStateInputs: () => []
};

const mockConfigService = {
  getDefaultProfiles: () => [{ odmPowerLimits: [], cpu: {} }],
  getCustomProfileById: () => undefined
};

describe('ProfileOverviewTileComponent', () => {
  let component: ProfileOverviewTileComponent;
  let fixture: ComponentFixture<ProfileOverviewTileComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ProfileOverviewTileComponent, HttpClientTestingModule, RouterTestingModule, MatDialogModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [DecimalPipe, { provide: StateService, useValue: mockStateService }, { provide: ConfigService, useValue: mockConfigService }]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileOverviewTileComponent);
    component = fixture.componentInstance;
    component.profile = {
      id: 'test',
      name: 'Test',
      icon: 'icon',
      position: 0,
      cpu: {
        minFrequency: 0,
        maxFrequency: 0,
        governor: 's',
        energy_performance_preference: 's',
        boost: false
      },
      odmPowerLimits: [],
      fans: {
        mode: 'dynamic'
      },
      display: {
        brightness: 50
      }
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
