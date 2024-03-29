import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AquarisControlComponent } from './aquaris-control.component';

describe('AquarisControlComponent', () => {
  let component: AquarisControlComponent;
  let fixture: ComponentFixture<AquarisControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AquarisControlComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AquarisControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
