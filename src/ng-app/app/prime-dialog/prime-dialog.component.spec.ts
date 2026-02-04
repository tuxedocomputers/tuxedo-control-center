import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DecimalPipe } from '@angular/common';

import { PrimeDialogComponent } from "./prime-dialog.component";
import { ElectronService } from '../electron.service';

describe("PrimeDialogComponent", () => {
    let component: PrimeDialogComponent;
    let fixture: ComponentFixture<PrimeDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
    imports: [PrimeDialogComponent],
    providers: [DecimalPipe, { provide: ElectronService, useValue: { ipcRenderer: { on: () => {} } } }]
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
