import { ComponentFixture, TestBed } from "@angular/core/testing";

import { DialogWaitingComponent } from "./dialog-waiting.component";

describe("DialogWaitingComponent", () => {
    let component: DialogWaitingComponent;
    let fixture: ComponentFixture<DialogWaitingComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DialogWaitingComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(DialogWaitingComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
