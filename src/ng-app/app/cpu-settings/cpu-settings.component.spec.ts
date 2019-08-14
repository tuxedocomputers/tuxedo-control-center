import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CpuSettingsComponent } from './cpu-settings.component';

describe('CpuSettingsComponent', () => {
  let component: CpuSettingsComponent;
  let fixture: ComponentFixture<CpuSettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CpuSettingsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CpuSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
