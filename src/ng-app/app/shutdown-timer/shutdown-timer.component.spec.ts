import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { DecimalPipe } from '@angular/common';

import { ShutdownTimerComponent } from './shutdown-timer.component';

describe('ShutdownTimerComponent', () => {
  let component: ShutdownTimerComponent;
  let fixture: ComponentFixture<ShutdownTimerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ShutdownTimerComponent, HttpClientTestingModule, RouterTestingModule, MatDialogModule],
      providers: [DecimalPipe]
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
