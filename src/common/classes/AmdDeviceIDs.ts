/*!
 * Copyright (c) 2019-2025 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

const amdIGpuDeviceIds: string[] = [
    // 3500U (Picasso / Raven 2)
    "15D8",

    // 4700U / 4800H (Renoir)
    "1636",

    // 5300U / 5500U / 5700U (Lucienne)
    "164C",

    // 5800H (Cezanne)
    "1638",

    // 6800H / 6900HX (Rembrandt)
    "1681",

    // 7840HS (Phoenix)
    "15BF",

    // 8845HS (Phoenix3)
    "1900",
    
    // 9955HX (Granite Ridge)
    "13C0",

    // Ryzen AI 7 350
    "1114",
    
    // Ryzen AI 9 365 / Ryzen AI 9 HX 370
    "150E",
];

const amdVendorId = "1002";
export const amdIGpuDeviceIdString: string = amdIGpuDeviceIds
    .map((id: string): string => `${amdVendorId}:${id}`)
    .join("|");

const amdDGpuDeviceIds: string[] = [
    // 7600M XT
    "7480",
];

export const amdDGpuDeviceIdString: string = amdDGpuDeviceIds
    .map((id: string): string => `${amdVendorId}:${id}`)
    .join("|");
