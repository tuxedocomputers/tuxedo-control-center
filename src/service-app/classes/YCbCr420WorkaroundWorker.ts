/*!
 * Copyright (c) 2019-2021 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import * as fs from 'fs';

import { DaemonWorker } from './DaemonWorker';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

import { TuxedoIOAPI } from '../../native-lib/TuxedoIOAPI';

export class YCbCr420WorkaroundWorker extends DaemonWorker {
    private force_ycbcr_420_switches: Object = {};

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(100000, tccd);

        const outputPorts: Array<Array<string>> = TuxedoIOAPI.getOutputPorts();
        if (outputPorts) {
            for (let card in outputPorts) {
                for (let port of outputPorts[card]) {
                    this.force_ycbcr_420_switches["card" + card + "-" + port] = "/sys/kernel/debug/dri/" + card + "/" + port + "/force_yuv420_output";
                }
            }
        }
    }

    private isWritable(path: string): boolean {
        try {
            fs.accessSync(path, fs.constants.W_OK);
            return true;
        } catch (err) {
            return false;
        }
    }

    public onStart(): void {
        for (let card_port in this.force_ycbcr_420_switches) {
            if (this.isWritable(this.force_ycbcr_420_switches[card_port])) {
                fs.appendFileSync(this.force_ycbcr_420_switches[card_port], this.tccd.settings.ycbcr420Workaround? "1" : "0");
            }
        }
    }

    public onWork(): void {
        // noop
    }

    public onExit(): void {
        for (let card_port in this.force_ycbcr_420_switches) {
            if (this.isWritable(this.force_ycbcr_420_switches[card_port])) {
                fs.appendFileSync(this.force_ycbcr_420_switches[card_port], "0");
            }
        }
    }
}
