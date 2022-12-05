import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CameraSettingsComponent } from './camera-settings.component';

describe('CameraSettingsComponent', () => {
  let component: CameraSettingsComponent;
  let fixture: ComponentFixture<CameraSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CameraSettingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CameraSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
