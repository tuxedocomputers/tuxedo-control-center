export interface ITuxedoECAPI {
    webcamOn(): boolean;
    webcamOff(): boolean;
}

export const TuxedoECAPI: ITuxedoECAPI = require('TuxedoECAPI');
