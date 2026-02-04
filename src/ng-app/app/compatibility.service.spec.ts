import { TestBed } from '@angular/core/testing';
import { DecimalPipe } from '@angular/common';

import { CompatibilityService } from './compatibility.service';

describe('CompatibilityService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [DecimalPipe]
  }));

  it('should be created', () => {
    const service: CompatibilityService = TestBed.inject(CompatibilityService);
    expect(service).toBeTruthy();
  });
});
