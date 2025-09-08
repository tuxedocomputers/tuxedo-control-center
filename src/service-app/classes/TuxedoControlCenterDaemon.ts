/*!
 * Copyright (c) 2019-2023 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import * as path from 'path';
import * as os from 'os';
import * as child_process from 'child_process';
import { SIGINT, SIGTERM } from 'constants';
import { SingleProcess } from './SingleProcess';
import { TccPaths } from '../../common/classes/TccPaths';
import { ConfigHandler } from '../../common/classes/ConfigHandler';
import { defaultSettings, ITccSettings, ProfileStates } from '../../common/models/TccSettings';
import { generateProfileId, ITccProfile } from '../../common/models/TccProfile';
import { DaemonWorker } from './DaemonWorker';
import { DaemonListener } from './DaemonListener';
import { DisplayBacklightWorker } from './DisplayBacklightWorker';
import { DisplayRefreshRateWorker } from './DisplayRefreshRateWorker';
import { CpuWorker } from './CpuWorker';
import { ITccAutosave } from '../../common/models/TccAutosave';
import { StateSwitcherWorker } from './StateSwitcherWorker';
import { WebcamWorker } from './WebcamWorker';
import { FanControlWorker } from './FanControlWorker';
import { YCbCr420WorkaroundWorker } from './YCbCr420WorkaroundWorker';
import { ITccFanProfile, customFanPreset } from '../../common/models/TccFanTable';
import { TccDBusService } from './TccDBusService';
import { TccDBusData } from './TccDBusInterface';
import { TuxedoIOAPI, ModuleInfo, TDPInfo } from '../../native-lib/TuxedoIOAPI';
import { ODMProfileWorker } from './ODMProfileWorker';
import { ODMPowerLimitWorker } from './ODMPowerLimitWorker';
import { CpuController } from '../../common/classes/CpuController';
import { DMIController } from '../../common/classes/DMIController';
import { TUXEDODevice, defaultCustomProfile } from '../../common/models/DefaultProfiles';
import { ScalingDriver } from '../../common/classes/LogicalCpuController';
import { ChargingWorker } from './ChargingWorker';
import { WebcamPreset } from 'src/common/models/TccWebcamSettings';
import { GpuInfoWorker } from "./GpuInfoWorker";
import { CpuPowerWorker } from './CpuPowerWorker';
import { PrimeWorker } from './PrimeWorker';
import { KeyboardBacklightListener } from './KeyboardBacklightListener';
import { NVIDIAPowerCTRLListener } from './NVIDIAPowerCTRLListener';
import { AvailabilityService } from "../../common/classes/availability.service";

const tccPackage = require('../../package.json');

export class TuxedoControlCenterDaemon extends SingleProcess {

    static readonly CMD_RESTART_SERVICE = 'systemctl restart tccd.service';
    static readonly CMD_START_SERVICE = 'systemctl start tccd.service';
    static readonly CMD_STOP_SERVICE = 'systemctl stop tccd.service';

    public config: ConfigHandler;

    public settings: ITccSettings;
    public customProfiles: ITccProfile[];
    public autosave: ITccAutosave;
    public fanTables: ITccFanProfile[];

    public dbusData = new TccDBusData(3);

    public activeProfile: ITccProfile;

    private workers: DaemonWorker[] = [];
    private listeners: DaemonListener[] = [];

    protected started = false;

    private stateWorker: StateSwitcherWorker;
    private chargingWorker: ChargingWorker;
    private displayWorker: DisplayRefreshRateWorker;
    constructor() {
        super(TccPaths.PID_FILE);
        this.config = new ConfigHandler(
            TccPaths.SETTINGS_FILE,
            TccPaths.PROFILES_FILE,
            TccPaths.WEBCAM_FILE,
            TccPaths.V4L2_NAMES_FILE,
            TccPaths.AUTOSAVE_FILE,
            TccPaths.FANTABLES_FILE
        );
    }

    async main() {

        if (process.argv.includes('--version')) {
            this.logLine('TUXEDO Control Center v' + tccPackage.version + ' node: ' + process.version + ' arch:' + os.arch());
            process.exit();
        }

        // Only allow to continue if root
        if (process.geteuid() !== 0) {
            throw Error('Not root, bye');
        }

        // Check arguments, start, stop, restart config files etc..
        await this.handleArgumentProgramFlow().catch((err) => this.catchError(err));

        // If program is still running this is the start of the daemon

        this.displayWorker = new DisplayRefreshRateWorker(this);
        this.loadConfigsAndProfiles();
        this.setupSignalHandling();

        this.dbusData.tccdVersion = tccPackage.version;
        this.stateWorker = new StateSwitcherWorker(this);
        this.chargingWorker = new ChargingWorker(this);
        this.workers.push(this.chargingWorker);
        this.workers.push(this.stateWorker);
        this.workers.push(new DisplayBacklightWorker(this));
        this.workers.push(new CpuWorker(this));
        this.workers.push(new WebcamWorker(this));
        this.workers.push(new FanControlWorker(this));
        this.workers.push(new YCbCr420WorkaroundWorker(this));
        this.workers.push(new GpuInfoWorker(this, new AvailabilityService()));
        this.workers.push(new CpuPowerWorker(this));
        this.workers.push(new PrimeWorker(this));
        this.workers.push(new TccDBusService(this, this.dbusData));
        this.workers.push(new ODMProfileWorker(this));
        this.workers.push(new ODMPowerLimitWorker(this));
        this.workers.push(this.displayWorker);

        this.listeners.push(new KeyboardBacklightListener(this));
        this.listeners.push(new NVIDIAPowerCTRLListener(this));

        this.startWorkers();

        this.started = true;
        this.logLine('Daemon started');

        // Start continuous work for each worker with individual interval
        for (const worker of this.workers) {
            worker.timer = setInterval(() => {
                try {
                    worker.work();
                } catch (err) {
                    this.logLine('Failed executing onWork() => ' + err);
                }
            }, worker.timeout);
        }

    }

    public startWorkers(): void {
        for (const worker of this.workers) {
            try {
                worker.updateProfile(this.getCurrentProfile());
                worker.start();
            } catch (err) {
                this.logLine('Failed executing onStart() => ' + err);
            }
        }
    }

    public triggerStateCheck(reset?: boolean) {
        if (reset === undefined) {
            reset = false;
        }
        if (this.stateWorker !== undefined) {
            if (reset) {
                this.stateWorker.reapplyProfile();
            }
            this.stateWorker.work();
        }
    }

    public getChargingWorker() {
        return this.chargingWorker;
    }

    public catchError(err: Error) {
        this.logLine('Tccd Exception');
        const errorLine = err.name + ': ' + err.message;
        this.logLine(errorLine);
        if (err.stack !== undefined) {
            this.logLine(err.stack);
        }
        if (this.started) {
            this.onExit();
        }
        process.exit();
    }

    public onExit() {
        this.workers.forEach((worker) => {
            clearInterval(worker.timer);
        });
        this.workers.forEach((worker) => {
            // On exit events for each worker before exiting and saving settings
            try {
                worker.exit();
            } catch (err) {
                this.logLine('Failed executing onExit() => ' + err);
            }
        });
        this.config.writeAutosave(this.autosave);
        this.config.writeSettings(this.settings);
    }

    private async handleArgumentProgramFlow() {
        if (process.argv.includes('--start')) {
            // Start daemon as this process
            if (!await this.start()) {
                throw Error('Couldn\'t start daemon. It is probably already running');
            } else {
                this.logLine('Starting daemon v' + tccPackage.version + ' (node: ' + process.version + ' arch: ' + os.arch() + ')');
                const modInfo = new ModuleInfo();
                if (TuxedoIOAPI.wmiAvailable()) {
                    TuxedoIOAPI.getModuleInfo(modInfo);
                    this.logLine('tuxedo-io ver ' + modInfo.version + ' [ interface: ' + modInfo.activeInterface + ' ]');
                } else {
                    this.logLine('No tuxedo-io found on start');
                }
            }
        } else if (process.argv.includes('--stop')) {
            // Signal running process to stop
            this.logLine('Stopping daemon..');
            if (await this.stop()) {
                this.logLine('Daemon is stopped');
                process.exit(0);
            } else {
                throw Error('Failed to stop daemon');
            }
        } else if (process.argv.includes('--new_settings') || process.argv.includes('--new_profiles') || process.argv.includes('--new_webcam')) {
            // If new config is specified, replace standard config with new config
            const settingsSaved = this.saveNewConfig<ITccSettings>('--new_settings', this.config.pathSettings, this.config.settingsFileMod);
            const profilesSaved = this.saveNewConfig<ITccProfile[]>('--new_profiles', this.config.pathProfiles, this.config.profileFileMod);
            const webcamSaved = this.saveNewConfig<WebcamPreset[]>('--new_webcam', this.config.pathWebcam, this.config.webcamFileMod);

            // If something changed, reload configs
            if (settingsSaved || profilesSaved || webcamSaved) {
                const pidNumber = this.readPid();
                if (isNaN(pidNumber)) {
                    console.log('Failed to locate running tccd process. Cannot reload config.');
                    process.exit(1);
                } else {
                    process.kill(pidNumber, 'SIGHUP');
                }
            }
            process.exit(0);
        } else {
            throw Error('No argument specified');
        }
    }

    public loadConfigsAndProfiles() {
        const dev = this.identifyDevice();
        this.dbusData.device = JSON.stringify(dev);
        this.readOrCreateConfigurationFiles(dev);

        // Fill exported profile lists (for GUI)
        const defaultProfilesFilled = this.config.getDefaultProfiles(dev).map(this.fillDeviceSpecificDefaults,this)
        let customProfilesFilled = this.customProfiles.map(this.fillDeviceSpecificDefaults,this);

        const defaultValuesProfileFilled = this.fillDeviceSpecificDefaults(JSON.parse(JSON.stringify(this.config.getDefaultCustomProfiles(dev)[0])));

        // Make sure assigned states and assigned profiles exist, otherwise fill with defaults
        let settingsChanged = false;
        let needsTuxedoDefault = false;
        for (const stateId of Object.keys(ProfileStates)) {
            const stateDescriptor = ProfileStates[stateId];
            if (!this.settings.stateMap.hasOwnProperty(stateDescriptor) ||
                 defaultProfilesFilled.concat(customProfilesFilled).find(p => p.id === this.settings.stateMap[stateDescriptor]) === undefined) {
                    // Attempt to find by name
                    const profileByName = defaultProfilesFilled.concat(customProfilesFilled).find(p => p.name === this.settings.stateMap[stateDescriptor]);
                    if (profileByName !== undefined) {
                        console.log('Missing state id assignment for \'' + stateId + '\' but found profile by name \'' + profileByName.name + '\'');
                        this.settings.stateMap[stateDescriptor] = profileByName.id;
                    } else {
                        // Otherwise default to default values profile
                        console.log('Missing state id assignment for \'' + stateId + '\' default to + \'' + defaultValuesProfileFilled.id + '\'');
                        this.settings.stateMap[stateDescriptor] = defaultValuesProfileFilled.id;
                        needsTuxedoDefault = true;
                    }
                    settingsChanged = true;
            }
        }
        if (settingsChanged) {
            // Add default values profile if not existing
            if (needsTuxedoDefault) {
                if (customProfilesFilled.find(p => p.id === defaultValuesProfileFilled.id) === undefined) {
                    customProfilesFilled = [ defaultValuesProfileFilled ].concat(customProfilesFilled);
                    this.customProfiles = customProfilesFilled;
                    this.config.writeProfiles(this.customProfiles);
                    console.log(`Added '${defaultValuesProfileFilled.name}' to profiles`);
                }
            }

            // Write updated settings
            this.config.writeSettings(this.settings);
            console.log('Saved updated settings');
        }

        const allProfilesFilled = defaultProfilesFilled.concat(customProfilesFilled);
        this.dbusData.profilesJSON = JSON.stringify(allProfilesFilled);
        this.dbusData.defaultProfilesJSON = JSON.stringify(defaultProfilesFilled);
        this.dbusData.customProfilesJSON = JSON.stringify(customProfilesFilled);
        this.dbusData.defaultValuesProfileJSON = JSON.stringify(defaultValuesProfileFilled);
        this.dbusData.settingsJSON = JSON.stringify(this.settings);

        // Initialize or update active profile
        if (this.getCurrentProfile() === undefined) {
            // Fallback
            this.activeProfile = this.getDefaultProfile();
        } else {
            const activeProfileId = this.activeProfile.id;
            const activeProfileName = this.activeProfile.name;
            let foundSameProfile = this.setCurrentProfileById(activeProfileId);
            if (!foundSameProfile) {
                console.log('loadConfigsAndProfiles: profile by id not found: ' + activeProfileId)
                foundSameProfile = this.setCurrentProfileByName(activeProfileName);
            }
            if (!foundSameProfile) {
                console.log('loadConfigsAndProfiles: profile by name not found: ' + activeProfileName);
                // Fallback
                this.activeProfile = this.getDefaultProfile();
            }
        }
    }

    private syncOutputPortsSetting() {
        let missingSetting = false;

        let outputPorts = TuxedoIOAPI.getOutputPorts();
        // Delete additional cards from settings
        if (this.settings.ycbcr420Workaround.length > outputPorts.length) {
            this.logLine('Additional ycbcr420Workaround card in settings');
            this.settings.ycbcr420Workaround = this.settings.ycbcr420Workaround.slice(0, outputPorts.length)
            missingSetting = true;
        }
        for (let card = 0; card < outputPorts.length; card++) {
            // Add card to settings if missing
            if (this.settings.ycbcr420Workaround.length <= card) {
                this.logLine('Missing ycbcr420Workaround card in settings');
                this.settings.ycbcr420Workaround[card] = {};
                missingSetting = true;
            }
            // Delete additional ports from settings
            for (let settingsPort in this.settings.ycbcr420Workaround[card]) {
                let stillAvailable: boolean = false;
                for (let port of outputPorts[card]) {
                    if (settingsPort === port) {
                        stillAvailable = true;
                    }
                }
                if (!stillAvailable) {
                    this.logLine('Additional ycbcr420Workaround port in settings');
                    delete this.settings.ycbcr420Workaround[card][settingsPort];
                    missingSetting = true;
                }
            }
            // Add port to settings if missing
            for (let port of outputPorts[card]) {
                if (this.settings.ycbcr420Workaround[card][port] === undefined) {
                    this.logLine('Missing ycbcr420Workaround port in settings');
                    this.settings.ycbcr420Workaround[card][port] = false;
                    missingSetting = true;
                }
            }
        }

        return missingSetting;
    }

    private readOrCreateConfigurationFiles(device: TUXEDODevice) {
        try {
            this.settings = this.config.readSettings();
            var missingSetting: boolean = false;

            // If settings are missing, attempt to recreate default
            // TODO purge settings no longer in ITccSettings
            if (this.settings.stateMap === undefined) {
                this.logLine('Missing statemap');
                this.settings.stateMap = this.config.getDefaultSettings(device).stateMap;
                missingSetting = true;
            }
            if (this.settings.cpuSettingsEnabled === undefined) {
                this.logLine('Missing cpuSettingsEnabled setting');
                this.settings.cpuSettingsEnabled = this.config.getDefaultSettings(device).cpuSettingsEnabled;
                missingSetting = true;
            }
            if (this.settings.fanControlEnabled === undefined) {
                this.logLine('Missing fanControlEnabled setting');
                this.settings.fanControlEnabled = this.config.getDefaultSettings(device).fanControlEnabled;
                missingSetting = true;
            }
            if (this.settings.keyboardBacklightControlEnabled === undefined) {
                this.logLine('Missing keyboardBacklightControlEnabled setting');
                this.settings.keyboardBacklightControlEnabled = this.config.getDefaultSettings(device).keyboardBacklightControlEnabled;
                missingSetting = true;
            }
            if (this.settings.ycbcr420Workaround === undefined) {
                this.logLine('Missing ycbcr420Workaround setting');
                this.settings.ycbcr420Workaround = this.config.getDefaultSettings(device).ycbcr420Workaround;
                missingSetting = true;
            }
            if (this.settings.chargingProfile === undefined) {
                this.logLine('Missing chargingProfile setting');
                this.settings.chargingProfile = this.config.getDefaultSettings(device).chargingProfile;
                missingSetting = true;
            }
            if (this.settings.chargingPriority === undefined) {
                this.logLine('Missing chargingPriority setting');
                this.settings.chargingPriority = this.config.getDefaultSettings(device).chargingPriority;
                missingSetting = true;
            }
            if (this.settings.keyboardBacklightStates === undefined) {
                this.logLine('Missing keyboardBacklightStates setting');
                this.settings.keyboardBacklightStates = this.config.getDefaultSettings(device).keyboardBacklightStates;
                missingSetting = true;
            }
            missingSetting = this.syncOutputPortsSetting();

            if (missingSetting) {
                throw Error('Missing setting');
            }
        } catch (err) {
            try {
                if (this.settings === undefined) {
                    this.settings = this.config.getDefaultSettings(device);
                    this.syncOutputPortsSetting();
                }
                this.config.writeSettings(this.settings);
                this.logLine('Filled missing settings with default: ' + this.config.pathSettings);
            } catch (err) {
                this.logLine('Failed to fill missing settings with default: ' + this.config.pathSettings);
            }
        }

        try {
            this.customProfiles = this.config.readProfiles(device);
        } catch (err) {
            this.customProfiles = this.config.getDefaultCustomProfiles(device);
            try {
                this.config.writeProfiles(this.customProfiles);
                this.logLine('Wrote default profiles: ' + this.config.pathProfiles);
            } catch (err) {
                this.logLine('Failed to write default profiles: ' + this.config.pathProfiles);
            }
        }

        try {
            this.autosave = this.config.readAutosave();
        } catch (err) {
            this.logLine('Failed to read autosave: ' + this.config.pathAutosave);
            // It probably doesn't exist yet so create a structure for saving
            this.autosave = this.config.getDefaultAutosave();
        }

        /*try {
            this.fanTables = this.config.readFanTables();
        } catch (err) {
            this.logLine('Failed to read fan tables: ' + this.config.pathFanTables);
            this.fanTables = [ this.config.getDefaultFanTable() ];
            try {
                this.config.writeFanTables(this.fanTables);
                this.logLine('Wrote default fan tables: ' + this.config.pathFanTables);
            } catch (err) {
                this.logLine('Failed to write default fan tables: ' + this.config.pathFanTables);
            }
        }*/
    }

    private setupSignalHandling() {
        // Setup signal catching/handling
        // SIGINT is the normal exit signal that the service gets from itself
        process.on('SIGINT', () => {
            this.logLine('SIGINT - Exiting');
            this.onExit();
            process.exit(0);
        });

        // Also stop on SIGTERM
        process.on('SIGTERM', () => {
            this.logLine('SIGTERM - Exiting');
            this.onExit();
            process.exit(SIGTERM);
        });

        process.on('SIGHUP', () => {
            this.logLine('Reload configs');
            this.loadConfigsAndProfiles();
            this.triggerStateCheck(true);
        });
    }

    identifyDevice(): TUXEDODevice {

        const dmi = new DMIController('/sys/class/dmi/id');
        const productSKU = dmi.productSKU.readValueNT();
        const boardName = dmi.boardName.readValueNT();
        const modInfo = new ModuleInfo();
        TuxedoIOAPI.getModuleInfo(modInfo);

        const dmiSKUDeviceMap = new Map<string, TUXEDODevice>();
        dmiSKUDeviceMap.set('IBS1706', TUXEDODevice.IBP17G6);
        dmiSKUDeviceMap.set('IBP1XI08MK1', TUXEDODevice.IBPG8);
        dmiSKUDeviceMap.set('IBP1XI08MK2', TUXEDODevice.IBPG8);
        dmiSKUDeviceMap.set('IBP14I08MK2', TUXEDODevice.IBPG8);
        dmiSKUDeviceMap.set('IBP16I08MK2', TUXEDODevice.IBPG8);
        dmiSKUDeviceMap.set('OMNIA08IMK2', TUXEDODevice.IBPG8);
        dmiSKUDeviceMap.set('IBP14A10MK1 / IBP15A10MK1', TUXEDODevice.IBPG10AMD);
        dmiSKUDeviceMap.set('IIBP14A10MK1 / IBP15A10MK1', TUXEDODevice.IBPG10AMD);
        dmiSKUDeviceMap.set('POLARIS1XA02', TUXEDODevice.POLARIS1XA02);
        dmiSKUDeviceMap.set('POLARIS1XI02', TUXEDODevice.POLARIS1XI02);
        dmiSKUDeviceMap.set('POLARIS1XA03', TUXEDODevice.POLARIS1XA03);
        dmiSKUDeviceMap.set('POLARIS1XI03', TUXEDODevice.POLARIS1XI03);
        dmiSKUDeviceMap.set('STELLARIS1XA03', TUXEDODevice.STELLARIS1XA03);
        dmiSKUDeviceMap.set('STEPOL1XA04', TUXEDODevice.STEPOL1XA04);
        dmiSKUDeviceMap.set('STELLARIS1XI03', TUXEDODevice.STELLARIS1XI03);
        dmiSKUDeviceMap.set('STELLARIS1XI04', TUXEDODevice.STELLARIS1XI04);
        dmiSKUDeviceMap.set('PULSE1502', TUXEDODevice.PULSE1502);
        dmiSKUDeviceMap.set('PULSE1403', TUXEDODevice.PULSE1403);
        dmiSKUDeviceMap.set('PULSE1404', TUXEDODevice.PULSE1404);
        dmiSKUDeviceMap.set('STELLARIS1XI05', TUXEDODevice.STELLARIS1XI05);
        dmiSKUDeviceMap.set('POLARIS1XA05', TUXEDODevice.POLARIS1XA05);
        dmiSKUDeviceMap.set('STELLARIS1XA05', TUXEDODevice.STELLARIS1XA05);
        dmiSKUDeviceMap.set('STELLARIS16I06', TUXEDODevice.STELLARIS16I06);
        dmiSKUDeviceMap.set('STELLARIS17I06', TUXEDODevice.STELLARIS17I06);
        dmiSKUDeviceMap.set('STELLSL15A06', TUXEDODevice.STELLSL15A06);
        dmiSKUDeviceMap.set('STELLSL15I06', TUXEDODevice.STELLSL15I06);
        dmiSKUDeviceMap.set('AURA14GEN3', TUXEDODevice.AURA14G3);
        dmiSKUDeviceMap.set('AURA15GEN3', TUXEDODevice.AURA15G3);
        dmiSKUDeviceMap.set('SIRIUS1601', TUXEDODevice.SIRIUS1601);
        dmiSKUDeviceMap.set('SIRIUS1602', TUXEDODevice.SIRIUS1602);

        const skuMatch = dmiSKUDeviceMap.get(productSKU);

        if (skuMatch !== undefined) {
            return skuMatch;
        }

        const uwidDeviceMap = new Map<number, TUXEDODevice>();
        uwidDeviceMap.set(0x13, TUXEDODevice.IBP14G6_TUX);
        uwidDeviceMap.set(0x12, TUXEDODevice.IBP14G6_TRX);
        uwidDeviceMap.set(0x14, TUXEDODevice.IBP14G6_TQF);
        uwidDeviceMap.set(0x17, TUXEDODevice.IBP14G7_AQF_ARX);

        const uwidMatch = uwidDeviceMap.get(parseInt(modInfo.model));
        if (uwidMatch !== undefined) {
            return uwidMatch;
        }

        return undefined;
    }

    getDefaultProfile(): ITccProfile {
        const dev = this.identifyDevice();
        return this.config.getDefaultProfiles(dev)[0];
    }

    getAllProfiles(): ITccProfile[] {
        const dev = this.identifyDevice();
        return this.config.getDefaultProfiles(dev).concat(this.customProfiles);
    }

    getCurrentProfile(): ITccProfile {
        return this.activeProfile;
    }

    setCurrentProfileByName(profileName: string): boolean {
        this.activeProfile = this.getAllProfiles().find(profile => profile.name === profileName);
        let result: boolean = true;
        if (this.activeProfile === undefined) {
            this.activeProfile = this.getDefaultProfile();
            result = false;
        }
        this.listeners.forEach((listener) => {
            listener.onActiveProfileChanged();
        })
        return result;
    }

    setCurrentProfileById(id: string): boolean {
        this.activeProfile = this.getAllProfiles().find(profile => profile.id === id);
        let result: boolean = true;
        if (this.activeProfile === undefined) {
            this.activeProfile = this.getDefaultProfile();
            result = false;
        }
        this.listeners.forEach((listener) => {
            listener.onActiveProfileChanged();
        })
        return result;
    }

    getCurrentFanProfile(chosenProfile?: ITccProfile): ITccFanProfile {
        if (chosenProfile === undefined) {
            chosenProfile = this.getCurrentProfile();
        }
        // If no fanprofile is set in tcc profile, use fallback
        if (chosenProfile.fan === undefined || chosenProfile.fan.fanProfile === undefined) {
            return this.getFallbackFanProfile();
        }

        // Attempt to find fan profile from tcc profile
        let chosenFanProfile = this.config.getDefaultFanProfiles()
            .find(fanProfile => fanProfile.name === chosenProfile.fan.fanProfile);

        if (chosenFanProfile === undefined) {
            chosenFanProfile = this.getFallbackFanProfile();
        }

        return chosenFanProfile;
    }

    getFallbackFanProfile(): ITccFanProfile {
        // Fallback to 'Balanced'
        let chosenFanProfile = this.config.getDefaultFanProfiles().find(fanProfile => fanProfile.name === 'Balanced');
        // Fallback to first in list
        if (chosenFanProfile === undefined) {
            chosenFanProfile = this.config.getDefaultFanProfiles()[0];
        }
        return chosenFanProfile;
    }

    updateDBusActiveProfileData(): void {
        this.dbusData.activeProfileJSON = JSON.stringify(this.fillDeviceSpecificDefaults(this.getCurrentProfile()));
    }

    fillDeviceSpecificDefaults(inputProfile: ITccProfile): ITccProfile {
        const profile: ITccProfile = JSON.parse(JSON.stringify(inputProfile));
        const dev: TUXEDODevice = this.identifyDevice();

        if (profile.id === undefined) {
            profile.id = generateProfileId();
            console.log(`(fillDeviceSpecificDefaults) Generated id (${profile.id}) for ${profile.name}`);
        }

        if (profile.description === 'undefined') {
            profile.description = '';
        }

        const cpu: CpuController = new CpuController('/sys/devices/system/cpu');
        if (profile.cpu.onlineCores === undefined) {
            profile.cpu.onlineCores = cpu.cores.length;
        }

        if (profile.cpu.useMaxPerfGov === undefined) {
            profile.cpu.useMaxPerfGov = false;
        }

        const minFreq = cpu.cores[0].cpuinfoMinFreq.readValueNT();
        if (profile.cpu.scalingMinFrequency === undefined || profile.cpu.scalingMinFrequency < minFreq) {
            profile.cpu.scalingMinFrequency = minFreq;
        }

        const scalingAvailableFrequencies = cpu.cores[0].scalingAvailableFrequencies.readValueNT();
        const scalingdriver = cpu.cores[0].scalingDriver.readValueNT()
        let maxFreq = scalingAvailableFrequencies !== undefined ? scalingAvailableFrequencies[0] : cpu.cores[0].cpuinfoMaxFreq.readValueNT();
        const boost = cpu.boost.readValueNT();
        if (boost !== undefined && scalingdriver === ScalingDriver.acpi_cpufreq) {
            maxFreq += 1000000;
        }
        const reducedAvailableFreq = boost === undefined ?
                                         cpu.cores[0].getReducedAvailableFreqNT() :
                                         cpu.cores[0].cpuinfoMaxFreq.readValueNT();
        // Handle defaults
        if (profile.cpu.scalingMaxFrequency === undefined) {
            profile.cpu.scalingMaxFrequency = maxFreq;
        } else if (profile.cpu.scalingMaxFrequency === -1) {
            profile.cpu.scalingMaxFrequency = reducedAvailableFreq;
        }
        // Enforce boundaries
        if (profile.cpu.scalingMaxFrequency < profile.cpu.scalingMinFrequency) {
            profile.cpu.scalingMaxFrequency = profile.cpu.scalingMinFrequency;
        } else if (profile.cpu.scalingMaxFrequency > maxFreq) {
            profile.cpu.scalingMaxFrequency = maxFreq;
        }

        if (profile.cpu.governor === undefined) {
            profile.cpu.governor = defaultCustomProfile.cpu.governor;
        }

        if (profile.cpu.energyPerformancePreference === undefined) {
            profile.cpu.energyPerformancePreference = defaultCustomProfile.cpu.energyPerformancePreference;
        }

        if (profile.cpu.noTurbo === undefined) {
            profile.cpu.noTurbo = defaultCustomProfile.cpu.noTurbo;
        }

        if(profile.display.useRefRate === undefined)
        {
            profile.display.useRefRate = false;
        }
        if(profile.display.useResolution === undefined)
        {
            profile.display.useResolution = false;
        }

        if (profile.display.refreshRate === undefined) {
            profile.display.refreshRate = -1;
        }
        if (profile.display.xResolution === undefined) {
            profile.display.xResolution = -1;
        }
        if (profile.display.yResolution === undefined) {
            profile.display.yResolution = -1;
        }         

        if (profile.webcam === undefined) {
            profile.webcam = {
                useStatus: false,
                status: true
            };
        }

        if (profile.webcam.useStatus === undefined) {
            profile.webcam.useStatus = false;
        }

        if (profile.webcam.status === undefined) {
            profile.webcam.status = true;
        }

        if (profile.fan === undefined) {
            profile.fan = {
                useControl: true,
                fanProfile: 'Balanced',
                minimumFanspeed: 0,
                maximumFanspeed: 100,
                offsetFanspeed: 0,
                customFanCurve: customFanPreset,
            };
        } else {
            profile.fan.useControl = true;
            if (profile.fan.minimumFanspeed === undefined) {
                profile.fan.minimumFanspeed = 0;
            }
            if (profile.fan.maximumFanspeed === undefined) {
                profile.fan.maximumFanspeed = 100;
            }
            if (profile.fan.offsetFanspeed === undefined) {
                profile.fan.offsetFanspeed = 0;
            }
            if (profile.fan.customFanCurve === undefined) {
                profile.fan.customFanCurve = customFanPreset;
            }
        }

        const defaultODMProfileName = ODMProfileWorker.getDefaultODMPerformanceProfile(dev);
        const availableODMProfiles = ODMProfileWorker.getAvailableODMPerformanceProfiles(dev);
        if (profile.odmProfile === undefined || !availableODMProfiles.includes(profile.odmProfile.name)) {
            profile.odmProfile = {
                name: defaultODMProfileName
            };
        }

        if (profile.odmProfile.name === undefined) {
            profile.odmProfile.name = defaultODMProfileName;
        }

        let tdpInfo: TDPInfo[] = [];
        TuxedoIOAPI.getTDPInfo(tdpInfo);
        if (profile.odmPowerLimits === undefined
            || profile.odmPowerLimits.tdpValues === undefined) {
            profile.odmPowerLimits = { tdpValues: [] };
        }

        const nrMissingValues = tdpInfo.length - profile.odmPowerLimits.tdpValues.length;
        if (nrMissingValues > 0) {
            profile.odmPowerLimits.tdpValues = profile.odmPowerLimits.tdpValues.concat(tdpInfo.slice(-nrMissingValues).map(e => e.max));
        }

        if (profile.nvidiaPowerCTRLProfile === undefined) {
            profile.nvidiaPowerCTRLProfile = { cTGPOffset: 0 };
        }

        if (profile.nvidiaPowerCTRLProfile.cTGPOffset === undefined) {
            profile.nvidiaPowerCTRLProfile.cTGPOffset = 0;
        }

        return profile;
    }

    /**
     * Save config path from argument to the specified target location, basically copying the config.
     *
     * @param optionString      Command line option string that preced the source path
     * @param targetConfigPath  Path to copy config to
     * @param writeFileMode     Access rights for target file
     *
     * @returns True if file is correctly parsed and written, false otherwise
     */
    private saveNewConfig<T>(optionString: string, targetConfigPath: string, writeFileMode: number) {
        const newConfigPath = this.getPathArgument(optionString);
        if (newConfigPath !== '') {
            try {
                let newConfig: T = this.config.readConfig<T>(newConfigPath);
                

                try {
                    this.config.writeConfig<T>(newConfig, targetConfigPath, { mode: writeFileMode });
                } catch (err) {
                    this.logLine('Error on write option ' + optionString);
                    return false;
                }
            } catch (err) {
                this.logLine('Error on read option ' + optionString + ' with path: ' + newConfigPath);
                return false;
            }
            return true;
        } else {
            return false;
        }
    }

    public saveSettings() {
        this.config.writeSettings(this.settings);
    }

    /**
     * Parse the command line arguments looking for a string and fetching the next argument
     *
     * @param optionString  Command line option string that preced the argument with
     *                      the sought data
     * @returns The argument following the argument matching optionString
     */
    private getPathArgument(optionString: string): string {
        const newConfigIndex = process.argv.indexOf(optionString);
        const lastIndex = (process.argv.length - 1);
        // If option is set and there is an argument after the option
        if (newConfigIndex !== -1 && ((newConfigIndex + 1) <= lastIndex)) {
            const newConfigPath = process.argv[newConfigIndex + 1];
            newConfigPath.replace('\'', '');
            return newConfigPath.trim();
        } else {
            return '';
        }
    }

    /**
     * Basic logging functionality
     *
     * @param text Text to log
     */
    public logLine(text: string) {
        console.log(text);
        /*try {
            const logPath = TccPaths.TCCD_LOG_FILE;
            if (!fs.existsSync(path.dirname(logPath))) {
                fs.mkdirSync(path.dirname(logPath), { recursive: true });
            }
            const date: Date = new Date();
            const lineInfo: string = date.toLocaleDateString() + ' ' + date.toLocaleTimeString() + ' (' + process.pid + '): ';
            const strLogLine = lineInfo + text + '\n';
            fs.appendFileSync(logPath, strLogLine, { mode: 0o644 });
        } catch (err) {
            console.log('Can\'t write log');
        }*/
    }
}
