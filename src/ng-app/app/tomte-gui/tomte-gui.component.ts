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
import { Component, OnInit } from '@angular/core';
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

    /* 
        This array is quite an important data structure. It is a two dimensional array, that is filled with information in parseTomteList(data) function
        it reflects the structure that is given back by tomte list command 

        [i][0] modulename - important for all the scripts 
        [i][1] version - not needed for any functionality yet
        [i][2] installation status - is this module installed or not?
        [i][3] blocked status - is this module blocked or not? If it is, installation will not work.
        [i][4] is this module a prerequisite? If yes it can't be blocked or uninstalled

    */
  tomteListArray = [];
  moduleToolTips = new Map();
  columnsToDisplay = ['moduleName', 'moduleVersion', 'moduleInstalled', 'moduleBlocked', 'moduleDescription'];
  tomteMode = "";
  tomteModes =["AUTOMATIC", "UPDATES_ONLY", "DONT_CONFIGURE"];
  showRetryButton = false;
  loadingInformation = false;
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
        this.showRetryButton = false;
        this.loadingInformation = true;
        let tomteinstalled = await this.pmgs.isInstalled("tuxedo-tomte");
        if (tomteinstalled)
            {
                // retries to list the information a couple of times, this is only triggered if tomte is already running.      
                for (let i = 0; i < 30; i++)
                {             
                    let command = "tuxedo-tomte list"
                    this.utils.pageDisabled = true;
                    let results
                    try 
                    {
                        results = await this.utils.execCmd(command);
                        this.utils.pageDisabled = false;
                        this.parseTomteList(results);
                        this.getModuleDescriptions();
                        break;
                    }
                    catch (e)
                    {
                        if(i === 10)
                        {                                       
                            this.throwErrorMessage("Information from command 'tomte list' could not be obtained. Is tomte already running?");
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        if(i === 29)
                        {
                            this.showRetryButton = true;
                        }
                        continue;
                    }
                }
                this.tomteIsInstalled = "true";
                this.utils.pageDisabled = false;

            }
        else
            {
                this.tomteIsInstalled = "false";
                this.utils.pageDisabled = false;
            }
        this.loadingInformation = true;

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
            // TODO for when we do the translations it might be possible to use this $localize function to localize 'yes' 'no' and 'prerequisite' 
            // similar to described here: https://stackoverflow.com/questions/60271964/angular-9-i18n-in-typescript
            // ... if I do this I also have to change the 'if' in the html that looks for if something is prerequisite... mmmh
            // nevermind, I think we should actually do this in the html. Maybe something along the lines of @@Tomte.yes:yes entry in languages file
            // and then we just change what is displayed and not what is saved in the array??? Because that would be a nightmare to maintain!
            if (i < 3)
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
        for (let i = 0; i < this.tomteListArray.length; i++)
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

    private async confirmChangesDialogue()
    {
        const connectNoticeDisable = localStorage.getItem('connectNoticeDisable');
        if (connectNoticeDisable === null || connectNoticeDisable === 'false') {
            const askToClose = await this.utils.confirmDialog({
                title: $localize `:@@tomteBreakingChangesTitle:Are you sure you want to issue this command?`,
                description: $localize `:@@tomteBreakingChangesWarning:Warning: Changes to the default Tomte-configuration can lead to your device not working properly anymore!`,
                linkLabel: '',
                linkHref: '',
                buttonAbortLabel: $localize `:@@tomteAbortButtonLabel:Abort`,
                buttonConfirmLabel: $localize `:@@tomteConfirmButtonLabel:I understand`,
                checkboxNoBotherLabel: $localize `:@@tomteDialogCheckboxNoBotherLabel:Don't ask again`,
                showCheckboxNoBother: true
            });
            if (askToClose.noBother) 
            {
                localStorage.setItem('connectNoticeDisable', 'true');
            }  
            if (!askToClose.confirm) 
            {
                return false;
            }      
        }   
        return true;      
    }

    private async confirmResetDialogue()
    {
        const connectNoticeDisable = localStorage.getItem('connectNoticeDisable');
        if (connectNoticeDisable === null || connectNoticeDisable === 'false') {
            const askToClose = await this.utils.confirmDialog({
                title: $localize `:@@tomteResetDefaultsTitle:Are you sure you want to reset to defaults?`,
                description: $localize `:@@tomteResetDefaultsMessage:This will revert any manual configuration you did, are you sure you want to proceed?`,
                linkLabel: '',
                linkHref: '',
                buttonAbortLabel: $localize `:@@tomteAbortButtonLabel:Abort`,
                buttonConfirmLabel: $localize `:@@tomteConfirmButtonLabel:I understand`,
                checkboxNoBotherLabel: '',
                showCheckboxNoBother: false
            });
            if (askToClose.confirm) 
            {
                return true;
            }    
            if (!askToClose.confirm) 
            {
                return false;
            }         
        }   
    }

/*
========================================================================
===================     BUTTON CLICK FUNCTIONS       ===================
========================================================================
*/

    public async tomteResetToDefaults()
    {
        this.utils.pageDisabled = true;
        let dialogueYes = await this.confirmResetDialogue();
        if (!dialogueYes)
        {
            this.tomtelist();
            this.utils.pageDisabled = false;
            return;
        }
        let command1 = "pkexec tuxedo-tomte AUTOMATIC";
        let command2 = "pkexec tuxedo-tomte unblock all";
        let command3 = "pkexec tuxedo-tomte reconfigure all";
        let res1;
        let res2;
        let res3;
        try
        {
            
            res1 = await this.utils.execFile(command1);
            res2 = await this.utils.execFile(command2);
            res3 = await this.utils.execFile(command3);
            this.tomtelist();
        }
        catch
        {
            console.error("One of the reset commands failed, here is their output: Function 1 Command: " 
            + command1 + " Results: " + res1 + 
            " Function2 Command: " + command2 + " Results: " + res2 +
            " Function2 Command: " + command3 + " Results: " + res3
            );
            this.throwErrorMessage("Reset failed. Maybe Tomte is already running? If that is the case simply try again later.");
        }        
        this.utils.pageDisabled = false;
    }

    public async tomteUn_InstallButton(name,yesno,blocked)
    {
        this.utils.pageDisabled = true;
        let dialogueYes = await this.confirmChangesDialogue();
        if (!dialogueYes)
        {
            this.tomtelist();
            this.utils.pageDisabled = false;
            return;
        }
        if (blocked === "yes")
        {
            this.utils.pageDisabled = false;
            return;
        }
        if (yesno === "yes")
        {
            let command = "yes | pkexec tuxedo-tomte remove " + name;
        
            let results = await this.utils.execCmd(command).catch((err) => {
                this.throwErrorMessage(err);
                this.utils.pageDisabled = false;
                this.tomtelist();
                return;
            });
        }
        else
        {

            let command = "pkexec tuxedo-tomte configure " + name;

            let results = await this.utils.execFile(command).catch((err) => {
                this.throwErrorMessage(err);
                this.utils.pageDisabled = false;
                this.tomtelist();
                return;
            });
        }
        this.tomtelist();
        this.utils.pageDisabled = false;
    }

    public async tomteBlockButton(name,yesno)
    {
        let dialogueYes = await this.confirmChangesDialogue();
        if (!dialogueYes)
        {
            this.tomtelist();
            this.utils.pageDisabled = false;
            return;
        }
        this.utils.pageDisabled = true;
        let command = "pkexec tuxedo-tomte block " + name;
        if (yesno === "yes")
        {
            command = "pkexec tuxedo-tomte unblock " + name ;
        }
        let results = await this.utils.execFile(command).catch((err) => {
            this.throwErrorMessage(err);
            this.utils.pageDisabled = false;
            return;
        });
        this.tomtelist();
        this.utils.pageDisabled = false;
    }

    public async tomteModeButton(mode)
    {
        let dialogueYes = await this.confirmChangesDialogue();
        if (!dialogueYes)
        {
            this.tomtelist();
            this.utils.pageDisabled = false;
            return;
        }
        this.utils.pageDisabled = true;
        let command = "pkexec tuxedo-tomte " + mode ;
        let results = await this.utils.execFile(command).catch((err) => {
            console.error(err);
            this.utils.pageDisabled = false;
            return;
          });
        this.tomtelist();
        this.utils.pageDisabled = false;
    }

    public async installTomteButton()
    {
        this.utils.pageDisabled = true;
        let gotInstalled = await this.pmgs.install("tuxedo-tomte");
        if (!gotInstalled)
        {
            this.throwErrorMessage("Tomte failed to install. Do you use a tuxedo device and are using the tuxedo repos?");
        }
        this.tomteIsInstalled = "";
        this.utils.pageDisabled = false;
        await this.tomtelist();
    }

 
}
