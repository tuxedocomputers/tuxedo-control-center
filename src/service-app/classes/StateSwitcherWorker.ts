import { DaemonWorker } from './DaemonWorker';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';
import { ProfileStates } from '../../common/models/TccSettings';
import { determineState } from '../../common/classes/StateUtils';

export class StateSwitcherWorker extends DaemonWorker {

    private currentState: ProfileStates;

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(500, tccd);
    }

    public onStart(): void {
        // Check state and switch profile if appropriate
        const newState = determineState();

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
        const newState = determineState();

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

}
