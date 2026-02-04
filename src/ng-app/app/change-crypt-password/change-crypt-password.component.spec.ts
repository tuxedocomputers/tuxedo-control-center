import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { DecimalPipe } from '@angular/common';

import { ChangeCryptPasswordComponent } from './change-crypt-password.component';

describe('ChangeCryptPasswordComponent', () => {
  let component: ChangeCryptPasswordComponent;
  let fixture: ComponentFixture<ChangeCryptPasswordComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [ChangeCryptPasswordComponent],
    providers: [DecimalPipe]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChangeCryptPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
