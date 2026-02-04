import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { GaugeModule } from 'angular-gauge';

import { CpuDashboardComponent } from './cpu-dashboard.component';

describe('CpuDashboardComponent', () => {
  let component: CpuDashboardComponent;
  let fixture: ComponentFixture<CpuDashboardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [CpuDashboardComponent, GaugeModule.forRoot()],
    providers: [DecimalPipe, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null }, data: {} } } }]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CpuDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
