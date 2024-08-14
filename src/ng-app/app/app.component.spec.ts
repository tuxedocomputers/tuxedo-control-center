import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { ElectronService } from './electron-service-wrapper/electron-service';

describe('AppComponent', (): void => {
  beforeEach(async((): void => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule
      ],
      declarations: [
        AppComponent
      ],
      providers: [
        ElectronService
      ]
    }).compileComponents();
  }));

  it('should create the app', (): void => {
    const fixture: ComponentFixture<AppComponent> = TestBed.createComponent(AppComponent);
    const app: any = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });
});
