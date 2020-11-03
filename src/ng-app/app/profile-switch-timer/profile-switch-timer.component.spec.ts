import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileSwitchTimerComponent } from './profile-switch-timer.component';

describe('ProfileSwitchTimerComponent', () => {
  let component: ProfileSwitchTimerComponent;
  let fixture: ComponentFixture<ProfileSwitchTimerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ProfileSwitchTimerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileSwitchTimerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
