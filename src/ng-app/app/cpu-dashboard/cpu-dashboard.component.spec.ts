import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CpuDashboardComponent } from './cpu-dashboard.component';

describe('CpuDashboardComponent', () => {
  let component: CpuDashboardComponent;
  let fixture: ComponentFixture<CpuDashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CpuDashboardComponent ]
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
