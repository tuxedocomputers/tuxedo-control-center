import { TestBed } from '@angular/core/testing';

import { SysFsService } from './sys-fs.service';

describe('SysFsService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SysFsService = TestBed.get(SysFsService);
    expect(service).toBeTruthy();
  });
});
