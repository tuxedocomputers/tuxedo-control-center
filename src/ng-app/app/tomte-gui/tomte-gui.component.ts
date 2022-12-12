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

interface ITomteModule {
    moduleName: string,
    version: string,
    installed: boolean,
    blocked: boolean,
    prerequisite: string
}

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
    tomteIsInstalled = false;
    tomteListArray: ITomteModule[] = [];
    moduleToolTips = new Map();
    columnsToDisplay = ['moduleName', 'moduleVersion', 'moduleInstalled', 'moduleBlocked', 'moduleDescription'];
    // TODO maybe there is a better way to handle this too :) 
    tomteMode = "";
    tomteModes =["AUTOMATIC", "UPDATES_ONLY", "DONT_CONFIGURE"];
    // those are basically just flags that are checked by certain gui components to figure out if they should be shown or not.
    showRetryButton = false;
    loadingInformation = false;
    // TODO when installing tomte on a non tuxedo device grab the error message in the tomte-list function and 
    // set this variable to false to output the correct error message in the control center
    isTuxedoDevice = true;
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
        this.showRetryButton = false;
        this.loadingInformation = true;
        this.tomteIsInstalled = await this.pmgs.isInstalled("tuxedo-tomte");
        if (this.tomteIsInstalled)
            {
                // retries to list the information a couple of times, this is only triggered if tomte is already running.      
                for (let i = 0; i < 30; i++)
                {             
                    let command = "tuxedo-tomte list"
                    let results
                    try 
                    {
                        results = await this.utils.execCmd(command);
                        this.parseTomteList("" + results);
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
            }
        this.loadingInformation = false;

    }

    /*
        Parses the raw data from the comandline output and puts it into tomteListArray variable that is then 
        used by the HTML to build the corresponding table
    */
    private parseTomteList(rawTomteListOutput: string | undefined){
        if (!rawTomteListOutput)
        {
            return;
        }
        this.tomteListArray = [];
        let lines = rawTomteListOutput.split("\n");
        // TODO is it possible to clean this up further?
        let modeLine = lines[0].split(" ");
        this.tomteMode = modeLine[modeLine.length -1];
        if (lines.length < 2)
        {
            this.throwErrorMessage(rawTomteListOutput);
            return;
        }
        for (var i = 3; i < lines.length; i++)
        {        
            let line = lines[i].split(/ +/);
            if (!line[0])
            {
                continue;
            }
            this.tomteListArray.push({moduleName: line[0], version: line[1], installed: line[2] === "yes", blocked: line[3] === "yes", prerequisite: line[4]});
        }
    }


    /*
        Loads the descriptions for each module in the background and puts it into moduleToolTips Variable that is then
        read in the HTML file 
    */
    private async getModuleDescriptions()
    {
        //console.log("tooltips saved: " + this.moduleToolTips.size + ", num of modules: " + this.tomteListArray.length);
        if (this.moduleToolTips.size < this.tomteListArray.length) 
        {
            //console.log("loading tooltips");
        for (let i = 0; i < this.tomteListArray.length; i++)
            {
                let modulename = this.tomteListArray[i].moduleName;
                if(this.moduleToolTips.has(modulename))
                {
                    continue;
                }
                //console.log("loading tooltip of: " + modulename);
                let command = "tuxedo-tomte description " + modulename;
                // using try catch so it doesn't fill the tooltip with garbage when it fails.
                try 
                {
                    let results = await this.utils.execCmd(command);
                    this.moduleToolTips.set(modulename, results);
                    //console.log("Obtained Tooltip: " + results);
                }
                catch (err)
                {
                    //console.log("failed to obtain tooltip: " + err);
                }

            }
        }
        else 
        {
            //console.log("already enough tooltips");
        }
    }

    /*
========================================================================
===================       UTILITY FUNCTIONS          ===================
========================================================================
*/

    /*
        Opens Dialogue containing given errormessage
        Also logs the error to the browser console
    */
    private async throwErrorMessage(errorMessage: string | undefined)
    {
        console.error(errorMessage);
        const askToClose = await this.utils.confirmDialog({
            title: $localize `:@@aqDialogErrorTitle:An Error occured!`,
            description: errorMessage,
            linkLabel: ``,
            linkHref: null,
            buttonAbortLabel: ``,
            buttonConfirmLabel: `Ok`,
            checkboxNoBotherLabel: `:`,
            showCheckboxNoBother: false
        });
    }


    /*
        Opens Dialogue asking the user if they are sure to proceed 
    */
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


    /*
        Opens Dialogue informing the user that everything they have customly configured will be rewoken by issueing this command
    */
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

    /*
        Tries to completely restore tomte to default configuration.
        Throws exhaustive error message if it fails.
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
            " Function 2 Command: " + command2 + " Results: " + res2 +
            " Function 3 Command: " + command3 + " Results: " + res3
            );
            this.throwErrorMessage("Reset failed. Maybe Tomte is already running? If that is the case simply try again later.");
        }        
        this.utils.pageDisabled = false;
    }


    /*
        Tries to either install or uninstall a given module, depending on if the module is already installed or not
        Not to be confused with the installTomteButton() function that instead tries to install tomte
    */
    public async tomteUn_InstallButton(name: string, isInstalled: boolean, isBlocked: boolean)
    {
        this.utils.pageDisabled = true;
        let dialogueYes = await this.confirmChangesDialogue();
        if (!dialogueYes)
        {
            this.tomtelist();
            this.utils.pageDisabled = false;
            return;
        }
        if (isBlocked)
        {
            this.utils.pageDisabled = false;
            return;
        }
        if (isInstalled)
        {
            let command = "yes | pkexec tuxedo-tomte remove " + name;
        
            let results = await this.utils.execCmd(command).catch((err) => {
                console.error(err);
                this.utils.pageDisabled = false;
                this.tomtelist();
                return;
            });
        }
        else
        {

            let command = "pkexec tuxedo-tomte configure " + name;

            let results = await this.utils.execFile(command).catch((err) => {
                console.error(err);
                this.utils.pageDisabled = false;
                this.tomtelist();
                return;
            });
        }
        this.tomtelist();
        this.utils.pageDisabled = false;
    }


    /*
        Tries to either block or unblock a given module, depending on if the module is already blocked or not
    */
    public async tomteBlockButton(name: string, isBlocked: boolean)
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
        if (isBlocked)
        {
            command = "pkexec tuxedo-tomte unblock " + name ;
        }
        let results = await this.utils.execFile(command).catch((err) => {
            console.error(err);
            this.utils.pageDisabled = false;
            return;
        });
        this.tomtelist();
        this.utils.pageDisabled = false;
    }


    /*
        Changes the mode tomte is operating in to the mode given and throws an error message if this doesnt work
    */
    public async tomteModeButton(mode: string)
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


    /*
        Tries to install tomte when button is clicked and throws error message if it fails.
        Not to be confused with the tomteUn_InstallButton() function, which tries to un-/install a given module
    */
    public async installTomteButton()
    {
        this.utils.pageDisabled = true;
        let gotInstalled = await this.pmgs.install("tuxedo-tomte");
        if (!gotInstalled)
        {
            this.throwErrorMessage("Tomte failed to install. Do you use a tuxedo device and are using the tuxedo repos?");
        }
        this.utils.pageDisabled = false;
        this.tomtelist();
    }

 
}
