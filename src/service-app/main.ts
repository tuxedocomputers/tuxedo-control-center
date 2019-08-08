/**
 * Start point of TUXEDO Control Center Service
 */
import { TuxedoControlCenterDaemon } from './classes/TuxedoControlCenterDaemon';

const tccd = new TuxedoControlCenterDaemon();

// Start program
tccd.main().catch((err) => tccd.catchError(err));
