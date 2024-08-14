import { TestBed, TestBedStatic } from '@angular/core/testing';

import { UtilsService } from './utils.service';

describe('UtilsService', (): void => {
  beforeEach((): TestBedStatic => TestBed.configureTestingModule({}));

  it('should be created', (): void => {
    const service: UtilsService = TestBed.get(UtilsService);
    expect(service).toBeTruthy();
  });
});
