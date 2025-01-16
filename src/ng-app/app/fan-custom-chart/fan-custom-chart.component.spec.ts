import { ComponentFixture, TestBed } from "@angular/core/testing";

import { FanCustomChartComponent } from "./fan-custom-chart.component";

describe("FanCustomChartComponent", () => {
    let component: FanCustomChartComponent;
    let fixture: ComponentFixture<FanCustomChartComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [FanCustomChartComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(FanCustomChartComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
