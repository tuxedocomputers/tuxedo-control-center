import { Injectable } from '@angular/core';

import * as os from 'os';

@Injectable({
  providedIn: 'root'
})
export class NodeService {

  constructor() { }

  public getOs() {
    return os;
  }
}
