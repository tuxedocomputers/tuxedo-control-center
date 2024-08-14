import { TestBed, TestBedStatic } from '@angular/core/testing';

import { StateService } from './state.service';

describe('StateService', (): void => {
  beforeEach((): TestBedStatic => TestBed.configureTestingModule({}));

  it('should be created', (): void => {
    const service: StateService = TestBed.get(StateService);
    expect(service).toBeTruthy();
  });
});
