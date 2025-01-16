import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FanChartComponent } from './fan-chart.component';

describe('FanChartComponent', () => {
  let component: FanChartComponent;
  let fixture: ComponentFixture<FanChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FanChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FanChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
