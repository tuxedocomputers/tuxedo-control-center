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

export interface IGridParams {
    cols: number;
    header: number;
    space?: number;
    value: number;
    input: number;
    undo?: number;
}

export const GridParamsMenu: IGridParams = {
    cols: 9,
    header: 4,
    value: 2,
    input: 3,
};

export const GridParamsBacklight: IGridParams = {
    cols: 17,
    header: 7,
    space: 2,
    value: 4,
    input: 2,
    undo: 2,
};

export const GridParamsSettings: IGridParams = {
    cols: 17,
    header: 8,
    value: 4,
    input: 3,
    undo: 2,
};

export const GridParamsProfileSettings: IGridParams = {
    cols: 17,
    header: 8,
    value: 4,
    input: 7,
    undo: 2,
};
