import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TomteGuiComponent } from './tomte-gui.component';

describe('TomteGuiCompontent', () => {
  let component: TomteGuiComponent;
  let fixture: ComponentFixture<TomteGuiComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TomteGuiComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TomteGuiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
