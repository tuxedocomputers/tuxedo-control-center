import { TestBed } from '@angular/core/testing';

import { UtilsService } from './utils.service';
import { DecimalPipe } from '@angular/common';
import { OverlayContainer } from '@angular/cdk/overlay';
import { MatDialogModule } from '@angular/material/dialog';
import { SysFsService } from './sys-fs.service';
import { ElectronService } from './electron.service';

describe('UtilsService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [MatDialogModule],
    providers: [
      DecimalPipe,
      OverlayContainer,
      { provide: SysFsService, useValue: { getGeneralCpuInfo: () => ({}) } },
      { provide: ElectronService, useValue: {} }
    ]
  }));

  it('should be created', () => {
    const service: UtilsService = TestBed.inject(UtilsService);
    expect(service).toBeTruthy();
  });
});
