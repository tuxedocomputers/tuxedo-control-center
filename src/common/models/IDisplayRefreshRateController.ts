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

import type { IDisplayFreqRes } from './DisplayFreqRes';
import type { ISessionEnvironment } from './SessionEnvironment';

/**
 * Common contract for a "set refresh rate on profile activation" backend.
 *
 * Each windowing-system/desktop-environment combination that can support this feature
 * (X11 via xrandr, KDE Plasma via kscreen-doctor, ...) implements this the same way, so
 * DisplayRefreshRateWorker can try each backend in turn and drive whichever one applies,
 * without hardcoding per-backend selection logic. Additional backends (GNOME/Mutter,
 * wlroots-based compositors, ...) can be added later by implementing this interface and
 * adding an instance to the worker's controller list.
 */
export interface IDisplayRefreshRateController {
    /**
     * Given the raw session environment, decides whether this backend applies to the
     * current session and, if so, checks whatever else it needs (tool availability, ...).
     * Must be called before checkVariablesAvailable()/getDisplayModes().
     */
    setVariables(env: ISessionEnvironment): Promise<void>;

    /**
     * Whether the last setVariables() call determined that this backend applies to the
     * current session AND found everything it needs to operate.
     */
    checkVariablesAvailable(): boolean;

    /**
     * Clears any cached session state, e.g. on user change.
     */
    resetValues(): void;

    /**
     * Queries the current display modes and active mode/resolution/refresh rate.
     * Returns undefined if that information could not be retrieved.
     */
    getDisplayModes(): IDisplayFreqRes | undefined;

    /**
     * Applies a resolution + refresh rate. Returns true on success.
     */
    setRefreshRateAndResolution(xRes: number, yRes: number, rate: number): boolean;

    /**
     * Backend-specific details for log messages (e.g. display/XAUTHORITY for X11,
     * output name/user for KDE). Not meant to be parsed, only logged.
     */
    getDebugInfo(): string;

    /**
     * Short human-readable description of the windowing system/desktop environment
     * this backend handles (e.g. "x11", "wayland (KDE Plasma)"), for the "Detected ..."
     * log message once this backend has been selected as active.
     */
    getDisplayType(): string;
}
