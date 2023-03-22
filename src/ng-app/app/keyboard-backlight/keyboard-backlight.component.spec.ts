import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { KeyboardBacklightComponent } from './keyboard-backlight.component';

describe('KeyboardBacklightComponent', () => {
  let component: KeyboardBacklightComponent;
  let fixture: ComponentFixture<KeyboardBacklightComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ KeyboardBacklightComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(KeyboardBacklightComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
