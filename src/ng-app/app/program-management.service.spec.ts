import { TestBed } from '@angular/core/testing';

import { ProgramManagementService } from './program-management.service';

describe('ProgramManagementService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ProgramManagementService = TestBed.get(ProgramManagementService);
    expect(service).toBeTruthy();
  });
});
