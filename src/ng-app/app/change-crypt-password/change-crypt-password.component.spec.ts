import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeCryptPasswordComponent } from './change-crypt-password.component';

describe('ChangeCryptPasswordComponent', () => {
  let component: ChangeCryptPasswordComponent;
  let fixture: ComponentFixture<ChangeCryptPasswordComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ChangeCryptPasswordComponent ]
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
