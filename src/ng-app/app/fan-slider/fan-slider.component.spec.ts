import { ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { DecimalPipe } from '@angular/common';

import { FanSliderComponent } from "./fan-slider.component";
import { ConfigService } from "../config.service";

const mockConfigService = {
    getSettings: () => ({ fahrenheit: false })
};

describe("FanSliderComponent", () => {
    let component: FanSliderComponent;
    let fixture: ComponentFixture<FanSliderComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FanSliderComponent, HttpClientTestingModule, RouterTestingModule, MatDialogModule],
            providers: [DecimalPipe, { provide: ConfigService, useValue: mockConfigService }]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(FanSliderComponent);
        component = fixture.componentInstance;
        const dummyTable = [20, 30, 40, 50, 60, 70, 80, 90, 100].map(temp => ({ temp, speed: 50 }));
        component.customFanCurve = { tableCPU: dummyTable, tableGPU: dummyTable };
        spyOn(component, 'getFanFormGroupValues').and.returnValue({ tableCPU: dummyTable, tableGPU: dummyTable });
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
