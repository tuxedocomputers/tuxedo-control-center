import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FanGraphComponent } from './fan-graph.component';

describe('FanGraphComponent', () => {
  let component: FanGraphComponent;
  let fixture: ComponentFixture<FanGraphComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FanGraphComponent ]
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
