import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { DecimalPipe } from '@angular/common';
import { Chart, registerables } from 'chart.js';

import { FanGraphComponent } from './fan-graph.component';
import { ConfigService } from '../config.service';

const mockConfigService = {
  getSettings: () => ({ fahrenheit: false })
};

describe('FanGraphComponent', () => {
  let component: FanGraphComponent;
  let fixture: ComponentFixture<FanGraphComponent>;

  beforeEach(waitForAsync(() => {
    Chart.register(...registerables);
    TestBed.configureTestingModule({
      imports: [FanGraphComponent, HttpClientTestingModule, RouterTestingModule, MatDialogModule],
      providers: [DecimalPipe, { provide: ConfigService, useValue: mockConfigService }]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FanGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
