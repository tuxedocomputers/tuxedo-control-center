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


    /*
        executes tomte list command and initiates follow up methods to parse information
    */

    private async tomtelist() {
        this.utils.pageDisabled = true;
    let tomteinstalled = await this.pmgs.isInstalled("tuxedo-tomte");
    if (tomteinstalled)
        {
            // retries to list the information a couple of times, this is only triggered if tomte is already running. 
            // Performance impact seems minimal. If this turns out to be a problem we could add a timeout with:
            //await new Promise(resolve => setTimeout(resolve, 4000)); 
            for (let i = 0; i < 2000; i++)
            {
                let command = "tuxedo-tomte list"
                this.utils.pageDisabled = true;
                let results
                try 
                {
                    results = await this.utils.execCmd(command);
                    this.utils.pageDisabled = false;
                    this.parseTomteList(results);
                    this.tomteIsInstalled = "true";
                    this.getModuleDescriptions();
                    break;
                }
                catch (e)
                {
                    if(i === 100)
                    {                                       
                        this.throwErrorMessage("Information from command 'tomte list' could not be obtained. Is tomte already running?");
                    }
                    continue;
                }
            }
            

        }
    else
        {
            this.tomteIsInstalled = "false";
            this.utils.pageDisabled = false;
        }

    }

    /*
        Parses the raw data from the comandline output and puts it into tomteListArray variable that is then 
        used by the HTML to build the corresponding table
    */
    private parseTomteList(data){
        if (!data)
        {
            return;
        }
        let data3 = data;
        data = "" + data;
        data = data.split("\n");
        let tomtelistarray2 = [];
        let data2 = data[0].split(" ");
        if (data.length < 2)
        {
            this.throwErrorMessage(data);
            return;
        }
        this.tomteMode = data2[data2.length -1];
        for (var i = 0; i < data.length; i++)
        {
            if (i < 2)
            {
                continue;
            }
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

    /*
        Loads the descriptions for each module in the background and puts it into moduleToolTips Variable that is then
        read in the HTML file 
    */
    private async getModuleDescriptions()
    {
        if (this.moduleToolTips.size < 1)
        {
        for (let i = 1; i < this.tomteListArray.length; i++)
            {
                let modulename = this.tomteListArray[i][0];
                let command = "tuxedo-tomte description " + modulename;
                let results = await this.utils.execCmd(command).catch((err) => {
                    // add some kind of error message if you want
                });
                this.moduleToolTips.set(modulename, results);
            }
        }
    }

    /*
========================================================================
===================       UTILITY FUNCTIONS          ===================
========================================================================
*/

    /*
        Opens Dialogue containing given errormessage
    */
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

/*
========================================================================
===================     BUTTON CLICK FUNCTIONS       ===================
========================================================================
*/

    private async tomteUn_InstallButton(name,yesno,blocked)
    {
        this.utils.pageDisabled = true;
        // TODO add a dialogue box reminding the user to reboot their PC for the changes to take effect
        if (blocked === "yes")
        {
            // TODO maybe remove dialogue box, just grey out the button in html and maybe add tooltip to the buttons? like in fan profile settings
            this.throwErrorMessage("error: unblock the module before trying to un-/install it");
            this.utils.pageDisabled = false;
            return;
        }
        let command = "pkexec /bin/sh -c 'tuxedo-tomte configure " + name + "'";
        if (yesno === "yes")
        {
            command = "pkexec /bin/sh -c 'yes | tuxedo-tomte remove " + name + "'";
        }
        let results = await this.utils.execCmd(command).catch((err) => {
            this.throwErrorMessage(err);
            this.utils.pageDisabled = false;
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
            this.utils.pageDisabled = false;
            return;
        });
        this.tomtelist();
        this.utils.pageDisabled = false;
    }

    private async tomteModeButton(mode)
    {
        this.utils.pageDisabled = true;
        let command = "pkexec /bin/sh -c 'tuxedo-tomte " + mode + "'";
        let results = await this.utils.execCmd(command).catch((err) => {
            console.error(err);
            this.utils.pageDisabled = false;
            return;
          });
        this.tomtelist();
        this.utils.pageDisabled = false;
    }

    private async installTomteButton()
    {
        this.utils.pageDisabled = true;
        let gotInstalled = await this.pmgs.install("tuxedo-tomte");
        if (!gotInstalled)
        {
            this.throwErrorMessage("Tomte failed to install. Do you use a tuxedo device and are using the tuxedo mirrors?");
        }
        this.tomteIsInstalled = "";
        this.utils.pageDisabled = false;
        await this.tomtelist();
    }

 
}
