import { ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DecimalPipe } from '@angular/common';

import { DialogWaitingComponent } from "./dialog-waiting.component";

describe("DialogWaitingComponent", () => {
    let component: DialogWaitingComponent;
    let fixture: ComponentFixture<DialogWaitingComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DialogWaitingComponent, HttpClientTestingModule, RouterTestingModule, MatDialogModule],
            providers: [DecimalPipe, { provide: MatDialogRef, useValue: {} }, { provide: MAT_DIALOG_DATA, useValue: {} }]
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
