/*!
 * Copyright (c) 2019-2020 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { ConfigHandler } from "../../common/classes/ConfigHandler";
import { TccPaths } from "../../common/classes/TccPaths";
import { exec } from "child_process";

export class ShutdownTimerWorker extends DaemonWorker {
    constructor(tccd: TuxedoControlCenterDaemon, private config: ConfigHandler) {
        super(1000, tccd);
    }

    public onStart(): void {
    }

    public async onWork() {
        let time = this.config.getSettingsNoThrow().shutdownTime;
        let shutdownTime = new Date(time);

        if(time == null) {
            return;
        }

        if(shutdownTime < new Date()) {
            let setting = this.config.getSettingsNoThrow();
            setting.shutdownTime = null;
            this.config.writeSettings(setting, TccPaths.SETTINGS_FILE);

            exec("shutdown now", (err, stdout, stderr) => {
                if (err) {
                    this.tccd.logLine(`Error at shutdown, error: ${err.message} - ${err}`);
                } else {
                    
                }
            });
        }
    }

    public onExit(): void {
    }
}