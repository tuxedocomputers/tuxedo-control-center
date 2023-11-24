import { ComponentFixture, TestBed } from "@angular/core/testing";

import { PrimeSelectComponent } from "./prime-select.component";

describe("PrimeSelectComponent", () => {
    let component: PrimeSelectComponent;
    let fixture: ComponentFixture<PrimeSelectComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [PrimeSelectComponent],
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
