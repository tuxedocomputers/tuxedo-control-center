import { TestBed, TestBedStatic } from '@angular/core/testing';

import { SysFsService } from './sys-fs.service';

describe('SysFsService', (): void => {
  beforeEach((): TestBedStatic => TestBed.configureTestingModule({}));

  it('should be created', (): void => {
    const service: SysFsService = TestBed.get(SysFsService);
    expect(service).toBeTruthy();
  });
});
