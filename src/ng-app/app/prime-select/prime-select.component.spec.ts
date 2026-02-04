import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DecimalPipe } from '@angular/common';

import { PrimeSelectComponent } from "./prime-select.component";

describe("PrimeSelectComponent", () => {
    let component: PrimeSelectComponent;
    let fixture: ComponentFixture<PrimeSelectComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
    imports: [PrimeSelectComponent],
    providers: [DecimalPipe]
}).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(PrimeSelectComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
