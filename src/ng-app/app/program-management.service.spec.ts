import { TestBed } from '@angular/core/testing';
import { DecimalPipe } from '@angular/common';

import { ProgramManagementService } from './program-management.service';

describe('ProgramManagementService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [DecimalPipe]
  }));

  it('should be created', () => {
    const service: ProgramManagementService = TestBed.inject(ProgramManagementService);
    expect(service).toBeTruthy();
  });
});
