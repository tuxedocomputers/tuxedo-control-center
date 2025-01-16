import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TgpChartComponent } from './tgp-chart.component';

describe('TgpChartComponent', () => {
  let component: TgpChartComponent;
  let fixture: ComponentFixture<TgpChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TgpChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TgpChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
