import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WebcamSettingsComponent } from './webcam-settings.component';

describe('WebcamSettingsComponent', () => {
  let component: WebcamSettingsComponent;
  let fixture: ComponentFixture<WebcamSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WebcamSettingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WebcamSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
