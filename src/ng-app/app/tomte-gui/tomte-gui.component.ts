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
import { Component, OnInit} from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { UtilsService } from '../utils.service';
import { ProgramManagementService } from '../program-management.service';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';


@Component({
  selector: 'app-tomte-gui',
  templateUrl: './tomte-gui.component.html',
  styleUrls: ['./tomte-gui.component.scss'],
  providers: [
    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: { displayDefaultIndicatorType: false }
    }
  ]
})
export class TomteGuiComponent implements OnInit {
    tomteIsInstalled = "";
  tomteListArray = [];
  moduleToolTips = new Map();
  tomteMode = "";
  tomteModes =["AUTOMATIC", "UPDATES_ONLY", "DONT_CONFIGURE"];
  constructor(
    private electron: ElectronService,
    private utils: UtilsService,
    private pmgs: ProgramManagementService
  ) { }


  ngOnInit() {
  }

  ngAfterViewInit() {
    this.tomtelist();
  }

  public focusControl(control): void {
    setImmediate(() => { control.focus(); });
  }

  public openExternalUrl(url: string): void {
    this.electron.shell.openExternal(url);
  }

    private async tomtelist() {
        this.utils.pageDisabled = true;
    let tomteinstalled = await this.pmgs.isInstalled("tuxedo-tomte");
    if (tomteinstalled)
        {
            // TODO add retry mechanism, retry without timeout a bunch of times? should not eat too many ressources anyway
            //await new Promise(resolve => setTimeout(resolve, 4000)); 
            let command = "tuxedo-tomte list"
            this.utils.pageDisabled = true;
            let results = await this.utils.execCmd(command).catch((err) => {
                this.throwErrorMessage("Information from command 'tomte list' could not be obtained. Is tomte already running?");
            });
            this.utils.pageDisabled = false;
            this.parseTomteList(results);
            this.tomteIsInstalled = "true";
            this.getModuleDescriptions();
        }
    else
        {
            this.tomteIsInstalled = "false";
            this.utils.pageDisabled = false;
        }

    }

    private async getModuleDescriptions()
    {
        console.log("Loading module information from " + this.tomteListArray.length +" modules");
        if (this.moduleToolTips.size < 1)
        {
        for (let i = 1; i < this.tomteListArray.length; i++)
            {
                let modulename = this.tomteListArray[i][0];
                let command = "tuxedo-tomte description " + modulename;
                let results = await this.utils.execCmd(command).catch((err) => {
                    // this.throwErrorMessage("Information from command 'tomte list' could not be obtained. Is tomte already running?");
                });
                this.moduleToolTips.set(modulename, results);
                console.log((modulename + " " + results));
            }
        }
    }

    private async installTomteButton()
    {
        this.utils.pageDisabled = true;
        await this.pmgs.install("tuxedo-tomte");
        this.tomteIsInstalled = "";
        await this.tomtelist();
        this.utils.pageDisabled = false;
    }

    private parseTomteList(data){
        if (!data)
        {
            return;
        }
        data = "" + data;
        data = data.split("\n");
        let tomtelistarray2 = [];
        let data2 = data[0].split(" ");
        this.tomteMode = data2[data2.length -1];
        for (var i = 0; i < data.length; i++)
        {
            if (i < 2)
            {
                continue;
            }
            // fill array with proper values
            let data2 = "" + data[i];
            let array2 = (data2).split(/ +/);
            if (!array2[0])
            {
                continue;
            }
            tomtelistarray2.push(array2);
        }
        this.tomteListArray = tomtelistarray2;
    }

    private async tomteModeButton(mode)
    {
        this.utils.pageDisabled = true;
        let command = "pkexec /bin/sh -c 'tuxedo-tomte " + mode + "'";
        let results = await this.utils.execCmd(command).catch((err) => {
            console.error(err);
            return;
          });
        this.tomtelist();
        this.utils.pageDisabled = false;
    }

    private async tomteBlockButton(name,yesno)
    {
        this.utils.pageDisabled = true;
        let command = "pkexec /bin/sh -c 'tuxedo-tomte block " + name + "'";
        if (yesno === "yes")
        {
            command = "pkexec /bin/sh -c 'tuxedo-tomte unblock " + name + "'";
        }
        let results = await this.utils.execCmd(command).catch((err) => {
            this.throwErrorMessage(err);
            return;
          });
        this.tomtelist();
        this.utils.pageDisabled = false;
    }

    private async tomteInstallButton(name,yesno,blocked)
    {
        this.utils.pageDisabled = true;
        // TODO add a dialogue box reminding the user to reboot their PC for the changes to take effect
        if (blocked === "yes")
        {
            // TODO maybe remove dialogue box, just grey out the button in html and maybe add tooltip to the buttons? like in fan profile settings
            this.throwErrorMessage("error: unblock the module before trying to un-/install it");
            return;
        }
        let command = "pkexec /bin/sh -c 'tuxedo-tomte configure " + name + "'";
        if (yesno === "yes")
        {
            command = "pkexec /bin/sh -c 'yes | tuxedo-tomte remove " + name + "'";
        }
        let results = await this.utils.execCmd(command).catch((err) => {
            this.throwErrorMessage(err);
            return;
          });
        this.tomtelist();
        this.utils.pageDisabled = false;
    }

    private async throwErrorMessage(errormessage)
    {
        console.error(errormessage);
        const askToClose = await this.utils.confirmDialog({
            title: $localize `:@@aqDialogErrorTitle:An Error occured!`,
            description: errormessage,
            linkLabel: ``,
            linkHref: null,
            buttonAbortLabel: ``,
            buttonConfirmLabel: `Ok`,
            checkboxNoBotherLabel: `:`,
            showCheckboxNoBother: false
        });
    }
 
}
