import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShutdownTimerComponent } from './shutdown-timer.component';

describe('ShutdownTimerComponent', () => {
  let component: ShutdownTimerComponent;
  let fixture: ComponentFixture<ShutdownTimerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ShutdownTimerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ShutdownTimerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
