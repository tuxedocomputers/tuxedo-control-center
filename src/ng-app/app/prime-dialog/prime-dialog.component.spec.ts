import { ComponentFixture, TestBed } from "@angular/core/testing";

import { PrimeDialogComponent } from "./prime-dialog.component";

describe("PrimeDialogComponent", () => {
    let component: PrimeDialogComponent;
    let fixture: ComponentFixture<PrimeDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [PrimeDialogComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(PrimeDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
