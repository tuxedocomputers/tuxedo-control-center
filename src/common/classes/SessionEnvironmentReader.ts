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

import * as child_process from 'node:child_process';
import type { ISessionEnvironment } from '../models/SessionEnvironment';

/**
 * Reads the logged-in (non-root) user's process environment in a single shell-out, without
 * interpreting any of it. Shared by all IDisplayRefreshRateController backends so the
 * (relatively expensive) /proc/*\/environ scan happens once per poll rather than once per
 * backend; each backend decides applicability/readiness from the raw values itself.
 */
export class SessionEnvironmentReader {
    public read(): ISessionEnvironment {
        const environmentVariables: string = child_process
            .execSync(
                `cat $(printf "/proc/%s/environ " $(pgrep -vu root | tail -n 20)) 2>/dev/null | \
                tr '\\0' '\\n' | \
                awk ' /DISPLAY=/ && !countDisplay {print; countDisplay++} \
                    /XAUTHORITY=/ && !countXAuthority {print; countXAuthority++} \
                    /XDG_SESSION_TYPE=/ && !countSessionType {print; countSessionType++} \
                    /XDG_CURRENT_DESKTOP=/ && !countDesktop {print; countDesktop++} \
                    /WAYLAND_DISPLAY=/ && !countWaylandDisplay {print; countWaylandDisplay++} \
                    /XDG_RUNTIME_DIR=/ && !countRuntimeDir {print; countRuntimeDir++} \
                    /DBUS_SESSION_BUS_ADDRESS=/ && !countDbusAddress {print; countDbusAddress++} \
                    /USER=/ && !countUser {print; countUser++} \
                    {if (countDisplay && countXAuthority && countSessionType && countDesktop && countWaylandDisplay && countRuntimeDir && countDbusAddress && countUser) exit} '`,
            )
            .toString();

        const displayMatch: RegExpMatchArray = environmentVariables.match(/^DISPLAY=(.*)$/m);
        const xAuthorityMatch: RegExpMatchArray = environmentVariables.match(/^XAUTHORITY=(.*)$/m);
        const xdgSessionMatch: RegExpMatchArray = environmentVariables.match(/^XDG_SESSION_TYPE=(.*)$/m);
        const currentDesktopMatch: RegExpMatchArray = environmentVariables.match(/^XDG_CURRENT_DESKTOP=(.*)$/m);
        const waylandDisplayMatch: RegExpMatchArray = environmentVariables.match(/^WAYLAND_DISPLAY=(.*)$/m);
        const xdgRuntimeDirMatch: RegExpMatchArray = environmentVariables.match(/^XDG_RUNTIME_DIR=(.*)$/m);
        const dbusSessionBusAddressMatch: RegExpMatchArray = environmentVariables.match(
            /^DBUS_SESSION_BUS_ADDRESS=(.*)$/m,
        );
        const userMatch: RegExpMatchArray = environmentVariables.match(/^USER=(.*)$/m);

        return {
            sessionType: xdgSessionMatch ? xdgSessionMatch[1].replace('XDG_SESSION_TYPE=', '').trim().toLowerCase() : '',
            currentDesktop: currentDesktopMatch
                ? currentDesktopMatch[1].replace('XDG_CURRENT_DESKTOP=', '').trim()
                : '',
            display: displayMatch ? displayMatch[1].replace('DISPLAY=', '').trim() : '',
            xAuthorityRaw: xAuthorityMatch ? xAuthorityMatch[1].replace('XAUTHORITY=', '').trim() : '',
            username: userMatch ? userMatch[1].replace('USER=', '').trim() : '',
            waylandDisplay: waylandDisplayMatch
                ? waylandDisplayMatch[1].replace('WAYLAND_DISPLAY=', '').trim()
                : '',
            xdgRuntimeDir: xdgRuntimeDirMatch ? xdgRuntimeDirMatch[1].replace('XDG_RUNTIME_DIR=', '').trim() : '',
            dbusSessionBusAddress: dbusSessionBusAddressMatch
                ? dbusSessionBusAddressMatch[1].replace('DBUS_SESSION_BUS_ADDRESS=', '').trim()
                : '',
        };
    }
}
