import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

import { Observable, of, from } from 'rxjs';
import { TccDBusClientService } from './tcc-dbus-client.service';

@Injectable({
    providedIn: 'root'
})
export class LoaderResolver implements Resolve<Observable<boolean>> {
    constructor(private dbus: TccDBusClientService) {}

    resolve(): Observable<boolean> {
        return from(this.waitForLoading());
    }

    /**
     * @returns Promise that resolves to true when loaded, false if timed out
     */
    private async waitForLoading(): Promise<boolean> {
        return await this.waitForDBusData(2000);
    }

    private async waitForDBusData(timeoutMs: number): Promise<boolean> {
        let timedOut: boolean = false;
        setTimeout((): void => { timedOut = true; }, timeoutMs);

        while (!this.dbus.dataLoaded && !timedOut) {
            await new Promise<void>((resolve: () => void): NodeJS.Timeout => setTimeout(resolve, 50));
        }

        if (timedOut) {
            return false;
        } else {
            return true;
        }
    }
}
