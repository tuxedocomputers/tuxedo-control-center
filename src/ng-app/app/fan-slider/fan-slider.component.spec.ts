import { ComponentFixture, TestBed } from "@angular/core/testing";

import { FanSliderComponent } from "./fan-slider.component";

describe("FanSliderComponent", () => {
    let component: FanSliderComponent;
    let fixture: ComponentFixture<FanSliderComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [FanSliderComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(FanSliderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
