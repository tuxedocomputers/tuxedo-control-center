/*!
 * Copyright (c) 2019-2026 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
 *
 * This file is part of TUXEDO Control Center.
 *
 * TUXEDO Control Center is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * TUXEDO Control Center is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with TUXEDO Control Center.  If not, see <https://www.gnu.org/licenses/>.
 */

import { execCommandAsync } from './Utils';

export class VendorService {
    private cpuVendor: string | null = null;

    constructor() {
        this.checkCpuVendor().then((vendor: string): void => {
            this.cpuVendor = vendor;
        });
    }

    async getCpuVendor(): Promise<string> {
        if (this.cpuVendor !== null) {
            return this.cpuVendor;
        }

        const vendor: string = await this.checkCpuVendor();
        this.cpuVendor = vendor;

        return vendor;
    }

    private async checkCpuVendor(): Promise<string> {
        const stdout: string = (await execCommandAsync('cat /proc/cpuinfo | grep vendor_id')).toString();

        const outputLines: string[] = stdout.split('\n');
        const vendorLine: string = outputLines.find((line: string): boolean => line.includes('vendor_id'));

        if (vendorLine) {
            const vendor: string = vendorLine.split(':')[1].trim();

            if (vendor === 'GenuineIntel') {
                return 'intel';
            } else if (vendor === 'AuthenticAMD') {
                return 'amd';
            }
        }
        return 'unknown';
    }
}
