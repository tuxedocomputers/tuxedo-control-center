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

export const tomteAPIHandle = 'tomteAPIHandle';

export enum TomteAPIFunctions {
    resetToDefaults = 'resetToDefaults',
    getModuleDescription = 'getModuleDescription',
    getTomteInformation = 'getTomteInformation',
    removeModule = 'removeModule',
    installModule = 'installModule',
    unBlockModue = 'unBlockModule',
    blockModule = 'blockModule',
    setMode = 'setMode',
}

// todo: version should not be string
export interface ITomteModule {
    name: string;
    version: string;
    required: string;
    blocked: string;
    installed: string;
}

export interface ITomteInformation {
    restart: string;
    version: string;
    mode: string;
    modules: ITomteModule[];
}
