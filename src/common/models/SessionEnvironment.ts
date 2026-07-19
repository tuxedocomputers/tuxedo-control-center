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

/**
 * Raw (uninterpreted) session environment values read from the logged-in user's process
 * environment. Each IDisplayRefreshRateController backend decides for itself, from these
 * raw values, whether the current session is one it applies to.
 */
export interface ISessionEnvironment {
    /** raw XDG_SESSION_TYPE, lowercased/trimmed (e.g. 'x11', 'wayland', 'tty', or '' if unknown) */
    sessionType: string;
    /** raw XDG_CURRENT_DESKTOP, trimmed (e.g. 'KDE', '') */
    currentDesktop: string;
    /** raw DISPLAY */
    display: string;
    /** raw XAUTHORITY, unvalidated */
    xAuthorityRaw: string;
    /** raw USER */
    username: string;
    /** raw WAYLAND_DISPLAY */
    waylandDisplay: string;
    /** raw XDG_RUNTIME_DIR */
    xdgRuntimeDir: string;
    /** raw DBUS_SESSION_BUS_ADDRESS */
    dbusSessionBusAddress: string;
}
