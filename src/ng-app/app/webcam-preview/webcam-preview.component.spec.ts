import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DecimalPipe } from '@angular/common';

import { WebcamPreviewComponent } from './webcam-preview.component';
import { ElectronService } from '../electron.service';

const mockElectronService = {
  ipcRenderer: {
    on: jasmine.createSpy('on')
  }
};

describe('WebcamPreviewComponent', () => {
  let component: WebcamPreviewComponent;
  let fixture: ComponentFixture<WebcamPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [WebcamPreviewComponent],
    providers: [DecimalPipe, { provide: ElectronService, useValue: mockElectronService }]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WebcamPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
