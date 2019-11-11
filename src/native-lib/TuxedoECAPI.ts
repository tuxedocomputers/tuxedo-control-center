export interface ITuxedoECAPI {
    /**
     * Connect webcam
     * @returns True if successful, false otherwise
     */
    webcamOn(): boolean;
    /**
     * Disconnect webcam
     * @returns True if successful, false otherwise
     */
    webcamOff(): boolean;

    /**
     * Set standard auto fan control for specified fan
     * @returns True if successful, false otherwise
     */
    setFanAuto(fanNumber: number): boolean;
    /**
     * Set speed of specified fan in percent
     * @returns True if successful, false otherwise
     */
    setFanSpeedPercent(fanNumber: number, setFanSpeedPercent: number): boolean;
    /**
     * Get speed of specified fan in percent
     * @returns The percentage or -1 on error
     */
    getFanSpeedPercent(fanNumber: number): number;
    /**
     * Get temperature of sensor for specified fan
     * @returns Temperature in celcius or -1 on error
     */
    getFanTemperature(fanNumber: number): number;
}

export const TuxedoECAPI: ITuxedoECAPI = require('TuxedoECAPI');
