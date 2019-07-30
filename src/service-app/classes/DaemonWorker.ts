import { ITccSettings } from '../../common/models/TccSettings';
import { ITccProfile } from '../../common/models/TccProfile';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

export abstract class DaemonWorker {

    constructor(
        public readonly timeout: number,
        // Also inject the state (i.e configs etc..)
        protected tccd: TuxedoControlCenterDaemon) {}

    public timer: NodeJS.Timer;

    public abstract onStart(): void;
    public abstract onWork(): void;
    public abstract onExit(): void;

}
