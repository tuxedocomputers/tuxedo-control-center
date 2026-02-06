import { Injectable } from '@angular/core';

import * as os from 'os';

@Injectable({
  providedIn: 'root'
})
export class NodeService {
  // No explicit constructor needed - DI handled by Angular

  public getOs() {
    return os;
  }
}
