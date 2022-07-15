import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainGuiComponent } from './main-gui.component';

describe('MainGuiComponent', () => {
  let component: MainGuiComponent;
  let fixture: ComponentFixture<MainGuiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MainGuiComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MainGuiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
