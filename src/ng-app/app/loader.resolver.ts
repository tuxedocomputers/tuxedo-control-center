import { Injectable, inject } from '@angular/core';


import { Observable, from } from 'rxjs';
import { TccDBusClientService } from './tcc-dbus-client.service';

@Injectable({
    providedIn: 'root'
})
export class LoaderResolver  {
    private dbus = inject(TccDBusClientService);



    resolve(): Observable<any> {
        return from(this.waitForLoading());
    }

    /**
     * @returns Promise that resolves to true when loaded, false if timed out
     */
    private async waitForLoading() {
        return await this.waitForDBusData(2000);
    }

    private async waitForDBusData(timeoutMs: number) {
        let timedOut = false;
        setTimeout(() => { timedOut = true; }, timeoutMs);

        while (!this.dbus.dataLoaded && !timedOut) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        if (timedOut) {
            return false;
        } else {
            return true;
        }
    }
}
