import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WebcamPreviewComponent } from './webcam-preview.component';

describe('WebcamPreviewComponent', () => {
  let component: WebcamPreviewComponent;
  let fixture: ComponentFixture<WebcamPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WebcamPreviewComponent ]
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
