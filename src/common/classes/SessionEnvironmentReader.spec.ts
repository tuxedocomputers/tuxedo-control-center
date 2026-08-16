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

import type { ISessionEnvironment } from '../models/SessionEnvironment';
import { SessionEnvironmentReader } from './SessionEnvironmentReader';

describe('SessionEnvironmentReader', (): void => {
    it('returns a fully-populated raw-string ISessionEnvironment without throwing', (): void => {
        const reader = new SessionEnvironmentReader();

        let env: ISessionEnvironment;
        expect((): void => {
            env = reader.read();
        }).not.toThrow();

        for (const key of [
            'sessionType',
            'currentDesktop',
            'display',
            'xAuthorityRaw',
            'username',
            'waylandDisplay',
            'xdgRuntimeDir',
            'dbusSessionBusAddress',
        ] as const) {
            expect(typeof env[key]).toBe('string');
        }
        expect(env.sessionType).toBe(env.sessionType.toLowerCase());
    });
});
