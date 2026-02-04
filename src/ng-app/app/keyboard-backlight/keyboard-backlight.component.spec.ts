import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { of } from 'rxjs';

import { KeyboardBacklightComponent } from './keyboard-backlight.component';
import { ConfigService } from '../config.service';
import { TccDBusClientService } from '../tcc-dbus-client.service';
import { SharedModule } from '../shared/shared.module';

@Component({
  selector: 'app-keyboard-visual',
  template: '<div>Mock Visual</div>',
  standalone: true
})
class MockKeyboardVisualComponent {
  @Input() keyboardBacklightCapabilities: any;
  @Input() chosenColorHex: any;
}

describe('KeyboardBacklightComponent', () => {
  let component: KeyboardBacklightComponent;
  let fixture: ComponentFixture<KeyboardBacklightComponent>;

  const mockConfigService = {
    getSettings: () => ({ keyboardBacklightControlEnabled: true }),
    keyboardBacklightControlDisabledMessage: 'Disabled',
  };

  const mockTccDBusClientService = {
    keyboardBacklightCapabilities: of({ zones: 1, color_red: false, color_green: false, color_blue: false, brightness: true, brightness_min: 0, brightness_max: 255, brightness_step: 1, maxBrightness: 255 }),
    keyboardBacklightStates: of([]),
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [KeyboardBacklightComponent, MockKeyboardVisualComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        DecimalPipe,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TccDBusClientService, useValue: mockTccDBusClientService }
      ]
    })
    .overrideComponent(KeyboardBacklightComponent, {
      remove: { imports: [SharedModule] },
      add: { imports: [SharedModule, MockKeyboardVisualComponent] }
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
