import { ComponentFixture, TestBed } from "@angular/core/testing";

import { KeyboardVisualComponent } from "./keyboard-visual.component";

describe("KeyboardVisualComponent", () => {
    let component: KeyboardVisualComponent;
    let fixture: ComponentFixture<KeyboardVisualComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [KeyboardVisualComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(KeyboardVisualComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
