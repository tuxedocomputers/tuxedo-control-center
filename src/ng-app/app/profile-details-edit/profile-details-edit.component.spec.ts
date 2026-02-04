import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { DecimalPipe } from '@angular/common';

import { ProfileDetailsEditComponent } from './profile-details-edit.component';

describe('ProfileDetailsEditComponent', () => {
  let component: ProfileDetailsEditComponent;
  let fixture: ComponentFixture<ProfileDetailsEditComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ProfileDetailsEditComponent, HttpClientTestingModule, RouterTestingModule, MatDialogModule],
      providers: [DecimalPipe]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileDetailsEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
