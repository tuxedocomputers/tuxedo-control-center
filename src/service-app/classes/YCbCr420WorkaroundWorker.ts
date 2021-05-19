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
import { DaemonWorker } from './DaemonWorker';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

import { TuxedoIOAPI } from '../../native-lib/TuxedoIOAPI';
import { SysFsPropertyBoolean } from '../../common/classes/SysFsProperties';

export class YCbCr420WorkaroundWorker extends DaemonWorker {
    private force_ycbcr_420_switches: Object = {};

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(100000, tccd);

        const outputPorts: Array<Array<string>> = TuxedoIOAPI.getOutputPorts();
        if (outputPorts) {
            for (let card in outputPorts) {
                for (let port of outputPorts[card]) {
                    this.force_ycbcr_420_switches["card" + card + "-" + port] = new SysFsPropertyBoolean(
                                                                                        "/sys/kernel/debug/dri/" +
                                                                                        card + "/" + port +
                                                                                        "/force_yuv420_output");
                }
            }
        }
    }

    public onStart(): void {
        for (let card_port in this.force_ycbcr_420_switches) {
            if (this.force_ycbcr_420_switches[card_port].isAvailable()) {
                this.force_ycbcr_420_switches[card_port].writeValue(this.tccd.settings.ycbcr420Workaround);
            }
        }
    }

    public onWork(): void {
        // noop
    }

    public onExit(): void {
        for (let card_port in this.force_ycbcr_420_switches) {
            if (this.force_ycbcr_420_switches[card_port].isAvailable()) {
                this.force_ycbcr_420_switches[card_port].writeValue(false);
            }
        }
    }
}
