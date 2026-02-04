import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { DecimalPipe } from '@angular/common';
import { NO_ERRORS_SCHEMA, Component, Input } from '@angular/core';

import { ProfileManagerComponent } from './profile-manager.component';
import { ProfileConflictDialogService } from '../profile-conflict-dialog/profile-conflict-dialog.service';
import { SharedModule } from '../shared/shared.module';

@Component({
  selector: 'app-profile-overview-tile',
  template: '<div>Mock Tile</div>',
  standalone: true
})
class MockProfileOverviewTileComponent {
  @Input() profile: any;
  @Input() hoverEffect: any;
  @Input() isSelected: any;
  @Input() visible: any;
  @Input() active: any;
  @Input() used: any;
  @Input() addProfileTile: any;
  @Input() showDetails: any;
}

describe('ProfileManagerComponent', () => {
  let component: ProfileManagerComponent;
  let fixture: ComponentFixture<ProfileManagerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ProfileManagerComponent, HttpClientTestingModule, RouterTestingModule, MatDialogModule],
      providers: [DecimalPipe, { provide: ProfileConflictDialogService, useValue: {} }],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .overrideComponent(ProfileManagerComponent, {
      remove: { imports: [SharedModule] },
      add: { imports: [SharedModule, MockProfileOverviewTileComponent] }
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
