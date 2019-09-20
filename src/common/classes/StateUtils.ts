import { ProfileStates } from '../models/TccSettings';
import { PowerSupplyController } from './PowerSupplyController';

export function determineState(): ProfileStates {
    const pathAc = '/sys/class/power_supply/AC';
    const powerAc = new PowerSupplyController(pathAc);
    // Default state
    let state: ProfileStates = ProfileStates.AC;

    // Attempt to find state depending on AC online status
    try {
        const acOnline = powerAc.online.readValue();
        if (acOnline) {
            state = ProfileStates.AC;
        } else {
            state = ProfileStates.BAT;
        }
    } catch (err) { }

    return state;
}
