import { TestBed } from '@angular/core/testing';
import { DecimalPipe } from '@angular/common';

import { StateService } from './state.service';

describe('StateService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [DecimalPipe]
  }));

  it('should be created', () => {
    const service: StateService = TestBed.inject(StateService);
    expect(service).toBeTruthy();
  });
});
