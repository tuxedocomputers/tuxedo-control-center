import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileDetailsEditComponent } from './profile-details-edit.component';

describe('ProfileDetailsEditComponent', () => {
  let component: ProfileDetailsEditComponent;
  let fixture: ComponentFixture<ProfileDetailsEditComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ProfileDetailsEditComponent ]
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
