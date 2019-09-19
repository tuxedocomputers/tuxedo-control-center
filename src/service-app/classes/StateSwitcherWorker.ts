import { DaemonWorker } from './DaemonWorker';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';
import { PowerSupplyController } from '../../common/classes/PowerSupplyController';
import { ProfileStates } from '../../common/models/TccSettings';

export class StateSwitcherWorker extends DaemonWorker {

    private readonly pathAc = '/sys/class/power_supply/AC';
    private readonly powerAc = new PowerSupplyController(this.pathAc);

    private currentState: ProfileStates;

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(500, tccd);
    }

    public onStart(): void {
        // Check state and switch profile if appropriate
        const newState = this.determineState();

        if (newState !== this.currentState) {
            this.currentState = newState;
            const newActiveProfileName = this.tccd.settings.stateMap[newState.toString()];
            if (newActiveProfileName === undefined) {
                this.tccd.logLine('StateSwitcherWorker: Undefined state mapping for ' + newState.toString());
                this.tccd.activeProfileName = 'Default';
            } else {
                this.tccd.activeProfileName = newActiveProfileName;
            }
            // Note: No need to manually run other workers on fresh start
        }
    }

    public onWork(): void {
        // Check state and switch profile if appropriate
        const newState = this.determineState();

        if (newState !== this.currentState) {
            this.currentState = newState;
            const newActiveProfileName = this.tccd.settings.stateMap[newState.toString()];
            if (newActiveProfileName === undefined) {
                this.tccd.logLine('StateSwitcherWorker: Undefined state mapping for ' + newState.toString());
                this.tccd.activeProfileName = 'Default';
            } else {
                this.tccd.activeProfileName = newActiveProfileName;
            }
            // Also run worker start procedure / application of profile
            this.tccd.startWorkers();
        }
    }

    public onExit(): void {
        // Do nothing
    }

    private determineState(): ProfileStates {
        // Default state
        let state: ProfileStates = ProfileStates.AC;

        // Attempt to find state depending on AC online status
        try {
            const acOnline = this.powerAc.online.readValue();
            if (acOnline) {
                state = ProfileStates.AC;
            } else {
                state = ProfileStates.BAT;
            }
        } catch (err) {
            this.tccd.logLine('StateSwitcherWorker: Failed to determine state => ' + err);
        }

        return state;
    }
}
