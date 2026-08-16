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

import 'jasmine';

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { ISessionEnvironment } from '../models/SessionEnvironment';
import { XDisplayRefreshRateController } from './XDisplayRefreshRateController';

function sessionEnvironment(overrides: Partial<ISessionEnvironment> = {}): ISessionEnvironment {
    return {
        sessionType: 'x11',
        currentDesktop: '',
        display: ':0',
        xAuthorityRaw: '',
        username: os.userInfo().username,
        waylandDisplay: '',
        xdgRuntimeDir: '',
        dbusSessionBusAddress: '',
        ...overrides,
    };
}

describe('XDisplayRefreshRateController', (): void => {
    let tmpXAuthorityFile: string;

    beforeAll((): void => {
        tmpXAuthorityFile = path.join(os.tmpdir(), `tcc-test-xauthority-${process.pid}`);
        fs.writeFileSync(tmpXAuthorityFile, '');
    });

    afterAll((): void => {
        fs.rmSync(tmpXAuthorityFile, { force: true });
    });

    describe('setVariables / checkVariablesAvailable', (): void => {
        it('applies and becomes available on an X11 session with a valid XAUTHORITY file', async (): Promise<void> => {
            const controller = new XDisplayRefreshRateController();

            await controller.setVariables(sessionEnvironment({ xAuthorityRaw: tmpXAuthorityFile }));

            expect(controller.checkVariablesAvailable()).toBe(true);
            expect(controller.getDisplay()).toBe(':0');
            expect(controller.getXAuthorityFile()).toBe(tmpXAuthorityFile);
        });

        it('does not apply on a Wayland session', async (): Promise<void> => {
            const controller = new XDisplayRefreshRateController();

            await controller.setVariables(sessionEnvironment({ sessionType: 'wayland', xAuthorityRaw: tmpXAuthorityFile }));

            expect(controller.checkVariablesAvailable()).toBe(false);
        });

        it('does not apply on a TTY session', async (): Promise<void> => {
            const controller = new XDisplayRefreshRateController();

            await controller.setVariables(sessionEnvironment({ sessionType: 'tty', xAuthorityRaw: tmpXAuthorityFile }));

            expect(controller.checkVariablesAvailable()).toBe(false);
        });

        it('stays unavailable when the XAUTHORITY file does not exist', async (): Promise<void> => {
            const controller = new XDisplayRefreshRateController();

            await controller.setVariables(sessionEnvironment({ xAuthorityRaw: '/nonexistent/xauthority' }));

            expect(controller.checkVariablesAvailable()).toBe(false);
        });

        it('rejects an XAUTHORITY value taken from the sddm login screen', async (): Promise<void> => {
            const controller = new XDisplayRefreshRateController();

            await controller.setVariables(sessionEnvironment({ xAuthorityRaw: '/var/run/sddm/{deadbeef}' }));

            expect(controller.checkVariablesAvailable()).toBe(false);
        });

        it('rejects an XAUTHORITY value taken from lightdm', async (): Promise<void> => {
            const controller = new XDisplayRefreshRateController();

            await controller.setVariables(sessionEnvironment({ xAuthorityRaw: '/var/lib/lightdm/.Xauthority' }));

            expect(controller.checkVariablesAvailable()).toBe(false);
        });

        it('resetValues() clears applicability so checkVariablesAvailable() is false again', async (): Promise<void> => {
            const controller = new XDisplayRefreshRateController();
            await controller.setVariables(sessionEnvironment({ xAuthorityRaw: tmpXAuthorityFile }));
            expect(controller.checkVariablesAvailable()).toBe(true);

            controller.resetValues();

            expect(controller.checkVariablesAvailable()).toBe(false);
        });
    });

    describe('setRefreshRateAndResolution', (): void => {
        it('returns false when the controller is not available', (): void => {
            const controller = new XDisplayRefreshRateController();

            expect(controller.setRefreshRateAndResolution(1920, 1080, 144)).toBe(false);
        });
    });
});
