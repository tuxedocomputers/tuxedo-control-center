import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DecimalPipe } from '@angular/common';

import { KeyboardVisualComponent } from "./keyboard-visual.component";

describe("KeyboardVisualComponent", () => {
    let component: KeyboardVisualComponent;
    let fixture: ComponentFixture<KeyboardVisualComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
    imports: [KeyboardVisualComponent],
    providers: [DecimalPipe]
}).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(KeyboardVisualComponent);
        component = fixture.componentInstance;
        component.keyboardBacklightCapabilities = { zones: 4, multiColor: true } as any;
        component.chosenColorHex = ['#000000'];
        spyOn(component, 'updateHeight').and.stub();
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
