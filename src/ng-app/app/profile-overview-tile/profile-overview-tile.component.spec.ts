import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileOverviewTileComponent } from './profile-overview-tile.component';

describe('ProfileOverviewTileComponent', () => {
  let component: ProfileOverviewTileComponent;
  let fixture: ComponentFixture<ProfileOverviewTileComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ProfileOverviewTileComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileOverviewTileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
