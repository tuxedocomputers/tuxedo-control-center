/*!
 * Copyright (c) 2019-2026 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import 'jasmine';

import type { IDisplayFreqRes } from '../models/DisplayFreqRes';
import { KScreenDisplayController } from './KScreenDisplayController';

function kscreenDoctorJSON(overrides: Partial<Record<string, unknown>> = {}): string {
    return JSON.stringify({
        outputs: [
            {
                name: 'eDP-1',
                connected: true,
                enabled: true,
                currentModeId: '1',
                modes: [
                    { id: '0', size: { width: 1920, height: 1080 }, refreshRate: 60.0 },
                    { id: '1', size: { width: 1920, height: 1080 }, refreshRate: 144.0 },
                    { id: '2', size: { width: 1280, height: 720 }, refreshRate: 60.0 },
                ],
                ...overrides,
            },
            {
                name: 'HDMI-A-1',
                connected: false,
                enabled: false,
                currentModeId: '0',
                modes: [{ id: '0', size: { width: 1920, height: 1080 }, refreshRate: 60.0 }],
            },
        ],
    });
}

describe('KScreenDisplayController', (): void => {
    describe('parseKscreenDoctorJSON', (): void => {
        it('returns undefined for invalid JSON', (): void => {
            expect(KScreenDisplayController.parseKscreenDoctorJSON('not json')).toBeUndefined();
        });

        it('returns undefined when no connected/enabled laptop panel output exists', (): void => {
            const json: string = JSON.stringify({
                outputs: [{ name: 'HDMI-A-1', connected: true, enabled: true, currentModeId: '0', modes: [] }],
            });

            expect(KScreenDisplayController.parseKscreenDoctorJSON(json)).toBeUndefined();
        });

        it('ignores a disconnected/disabled output even if it is a laptop panel', (): void => {
            const json: string = JSON.stringify({
                outputs: [
                    {
                        name: 'eDP-1',
                        connected: false,
                        enabled: false,
                        currentModeId: '0',
                        modes: [{ id: '0', size: { width: 1920, height: 1080 }, refreshRate: 60.0 }],
                    },
                ],
            });

            expect(KScreenDisplayController.parseKscreenDoctorJSON(json)).toBeUndefined();
        });

        it('picks the connected/enabled laptop panel output over other outputs', (): void => {
            const result = KScreenDisplayController.parseKscreenDoctorJSON(kscreenDoctorJSON());

            expect(result.outputName).toBe('eDP-1');
        });

        it('groups modes by resolution into a single IDisplayMode entry', (): void => {
            const result = KScreenDisplayController.parseKscreenDoctorJSON(kscreenDoctorJSON());
            const displayFreqRes: IDisplayFreqRes = result.displayFreqRes;

            expect(displayFreqRes.displayModes.length).toBe(2);
            const fullHd = displayFreqRes.displayModes.find(
                (mode): boolean => mode.xResolution === 1920 && mode.yResolution === 1080,
            );
            expect(fullHd.refreshRates.sort((a, b) => a - b)).toEqual([60, 144]);
        });

        it('sets activeMode from currentModeId', (): void => {
            const result = KScreenDisplayController.parseKscreenDoctorJSON(kscreenDoctorJSON());

            expect(result.displayFreqRes.activeMode).toEqual({
                refreshRates: [144],
                xResolution: 1920,
                yResolution: 1080,
            });
        });

        it('builds a mode-id lookup keyed by resolution and refresh rate', (): void => {
            const result = KScreenDisplayController.parseKscreenDoctorJSON(kscreenDoctorJSON());

            expect(result.modeIdByKey.get('1920x1080@144.00')).toBe('1');
            expect(result.modeIdByKey.get('1920x1080@60.00')).toBe('0');
            expect(result.modeIdByKey.get('1280x720@60.00')).toBe('2');
        });

        it('skips a mode entry missing size/refreshRate without throwing', (): void => {
            const json: string = JSON.stringify({
                outputs: [
                    {
                        name: 'eDP-1',
                        connected: true,
                        enabled: true,
                        currentModeId: '0',
                        modes: [
                            { id: '0', size: { width: 1920, height: 1080 }, refreshRate: 60.0 },
                            { id: '1', size: undefined, refreshRate: 144.0 },
                        ],
                    },
                ],
            });

            let result;
            expect((): void => {
                result = KScreenDisplayController.parseKscreenDoctorJSON(json);
            }).not.toThrow();
            expect(result.displayFreqRes.displayModes.length).toBe(1);
        });
    });

    describe('setRefreshRateAndResolution', (): void => {
        it('returns false when session context has not been set', (): void => {
            const controller = new KScreenDisplayController();

            expect(controller.setRefreshRateAndResolution(1920, 1080, 144)).toBe(false);
        });
    });
});
