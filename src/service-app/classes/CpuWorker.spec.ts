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
const mock: typeof import('mock-fs') = require('mock-fs');

import { SysFsPropertyBoolean, SysFsPropertyInteger } from '../../common/classes/SysFsProperties';
import { defaultCustomProfile, TUXEDODevice } from '../../common/models/DefaultProfiles';
import type { IPerCoreConfig, ITccProfile } from '../../common/models/TccProfile';
import { CpuWorker } from './CpuWorker';
import type { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

// Two-core sysfs tree: CPU0 (always online, no 'online' file) + CPU1 (has 'online').
function mockTwoCoreCpuSysfs(cpu1Online: boolean = true): void {
    mock({
        '/sys/devices/system/cpu/possible': '0-1',
        '/sys/devices/system/cpu/present': '0-1',
        '/sys/devices/system/cpu/cpu0/cpufreq/scaling_min_freq': '800000',
        '/sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq': '3000000',
        '/sys/devices/system/cpu/cpu1/online': cpu1Online ? '1' : '0',
        '/sys/devices/system/cpu/cpu1/cpufreq/scaling_min_freq': '800000',
        '/sys/devices/system/cpu/cpu1/cpufreq/scaling_max_freq': '3000000',
    });
}

function makeTccdStub(logLine: (msg: string) => void = (): void => {}): TuxedoControlCenterDaemon {
    return {
        identifyDevice: (): TUXEDODevice => TUXEDODevice.UNKNOWN,
        logLine,
        settings: { cpuSettingsEnabled: true },
    } as unknown as TuxedoControlCenterDaemon;
}

function makePerCoreProfile(perCoreConfig: IPerCoreConfig[]): ITccProfile {
    return {
        ...defaultCustomProfile,
        cpu: {
            ...defaultCustomProfile.cpu,
            mode: 'per-core',
            perCoreConfig,
        },
    };
}

function readInt(path: string): number {
    return new SysFsPropertyInteger(path).readValue();
}

function readBool(path: string): boolean {
    return new SysFsPropertyBoolean(path).readValue();
}

const CPU0_MIN_FREQ = '/sys/devices/system/cpu/cpu0/cpufreq/scaling_min_freq';
const CPU0_MAX_FREQ = '/sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq';
const CPU1_ONLINE = '/sys/devices/system/cpu/cpu1/online';
const CPU1_MIN_FREQ = '/sys/devices/system/cpu/cpu1/cpufreq/scaling_min_freq';
const CPU1_MAX_FREQ = '/sys/devices/system/cpu/cpu1/cpufreq/scaling_max_freq';

describe('CpuWorker', (): void => {
    let cpuWorker: CpuWorker;

    beforeEach((): void => {
        mockTwoCoreCpuSysfs(true);
        cpuWorker = new CpuWorker(makeTccdStub());
    });

    afterEach((): void => {
        mock.restore();
    });

    describe('applyCpuProfilePerCore', (): void => {
        it('does nothing when perCoreConfig is empty', (): void => {
            const profile: ITccProfile = makePerCoreProfile([]);

            expect((): void => (cpuWorker as any).applyCpuProfilePerCore(profile)).not.toThrow();
            expect(readInt(CPU1_MIN_FREQ)).toBe(800000);
        });

        it('writes online state and frequencies for a non-zero core', (): void => {
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: 1, online: true, scalingMinFrequency: 1000000, scalingMaxFrequency: 2500000 },
            ]);

            (cpuWorker as any).applyCpuProfilePerCore(profile);

            expect(readBool(CPU1_ONLINE)).toBe(true);
            expect(readInt(CPU1_MIN_FREQ)).toBe(1000000);
            expect(readInt(CPU1_MAX_FREQ)).toBe(2500000);
        });

        it('never writes an online file for CPU 0 (always online) but still applies its frequencies', (): void => {
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: 0, online: true, scalingMinFrequency: 900000, scalingMaxFrequency: 2000000 },
            ]);

            // CPU 0 has no 'online' sysfs file in this fixture; writing to it would throw.
            expect((): void => (cpuWorker as any).applyCpuProfilePerCore(profile)).not.toThrow();
            expect(readInt(CPU0_MIN_FREQ)).toBe(900000);
            expect(readInt(CPU0_MAX_FREQ)).toBe(2000000);
        });

        it('does not write frequencies for a core set offline in the profile', (): void => {
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: 1, online: false, scalingMinFrequency: 1000000, scalingMaxFrequency: 2500000 },
            ]);

            (cpuWorker as any).applyCpuProfilePerCore(profile);

            expect(readBool(CPU1_ONLINE)).toBe(false);
            // Untouched: still at the values seeded by mockTwoCoreCpuSysfs()
            expect(readInt(CPU1_MIN_FREQ)).toBe(800000);
            expect(readInt(CPU1_MAX_FREQ)).toBe(3000000);
        });

        // CPU 0's online write is skipped (it's always online), but the offline short-circuit still
        // applies to it, so marking CPU 0 "offline" in a per-core profile silently skips its frequencies
        // too -- even though CPU 0 stays physically online. This documents that current behavior.
        it('skips CPU 0 frequencies entirely when its perCoreConfig entry is marked offline', (): void => {
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: 0, online: false, scalingMinFrequency: 900000, scalingMaxFrequency: 2000000 },
            ]);

            (cpuWorker as any).applyCpuProfilePerCore(profile);

            expect(readInt(CPU0_MIN_FREQ)).toBe(800000);
            expect(readInt(CPU0_MAX_FREQ)).toBe(3000000);
        });

        it('processes the remaining cores even when an earlier core\'s frequency files are not writable', (): void => {
            mock.restore();
            mock({
                '/sys/devices/system/cpu/possible': '0-1',
                '/sys/devices/system/cpu/present': '0-1',
                '/sys/devices/system/cpu/cpu0/cpufreq/scaling_min_freq': '800000',
                '/sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq': '3000000',
                '/sys/devices/system/cpu/cpu1/online': '1',
                '/sys/devices/system/cpu/cpu1/cpufreq/scaling_min_freq': mock.file({ content: '800000', mode: 0o444 }),
                '/sys/devices/system/cpu/cpu1/cpufreq/scaling_max_freq': mock.file({ content: '3000000', mode: 0o444 }),
            });
            cpuWorker = new CpuWorker(makeTccdStub());
            // cpu1 (not writable) listed before cpu0 so a thrown/aborted loop would also skip cpu0.
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: 1, online: true, scalingMinFrequency: 1000000, scalingMaxFrequency: 2500000 },
                { cpuId: 0, online: true, scalingMinFrequency: 900000, scalingMaxFrequency: 2000000 },
            ]);

            expect((): void => (cpuWorker as any).applyCpuProfilePerCore(profile)).not.toThrow();

            expect(readInt(CPU1_MIN_FREQ)).toBe(800000); // untouched: not writable
            expect(readInt(CPU1_MAX_FREQ)).toBe(3000000);
            expect(readInt(CPU0_MIN_FREQ)).toBe(900000); // still applied afterwards
            expect(readInt(CPU0_MAX_FREQ)).toBe(2000000);
        });

        it('ignores an entry with an out-of-range cpuId without throwing', (): void => {
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: 5, online: true, scalingMinFrequency: 1000000, scalingMaxFrequency: 2500000 },
            ]);

            expect((): void => (cpuWorker as any).applyCpuProfilePerCore(profile)).not.toThrow();
        });

        it('ignores an entry with a negative cpuId without throwing', (): void => {
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: -1, online: true, scalingMinFrequency: 1000000, scalingMaxFrequency: 2500000 },
            ]);

            expect((): void => (cpuWorker as any).applyCpuProfilePerCore(profile)).not.toThrow();
        });

        it('ignores an entry with a missing (undefined) cpuId without throwing', (): void => {
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: undefined, online: true, scalingMinFrequency: 1000000, scalingMaxFrequency: 2500000 },
            ]);

            expect((): void => (cpuWorker as any).applyCpuProfilePerCore(profile)).not.toThrow();
        });
    });

    describe('validateCpuFreqPerCore', (): void => {
        it('returns true when perCoreConfig is empty', (): void => {
            const profile: ITccProfile = makePerCoreProfile([]);

            expect((cpuWorker as any).validateCpuFreqPerCore(profile)).toBe(true);
        });

        it('returns true when sysfs state matches the profile', (): void => {
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: 0, online: true, scalingMinFrequency: 800000, scalingMaxFrequency: 3000000 },
                { cpuId: 1, online: true, scalingMinFrequency: 800000, scalingMaxFrequency: 3000000 },
            ]);

            expect((cpuWorker as any).validateCpuFreqPerCore(profile)).toBe(true);
        });

        it('returns false when the profile expects a core offline but it is actually online', (): void => {
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: 1, online: false, scalingMinFrequency: 800000, scalingMaxFrequency: 3000000 },
            ]);

            expect((cpuWorker as any).validateCpuFreqPerCore(profile)).toBe(false);
        });

        it('returns false when the profile expects a core online but it is actually offline', (): void => {
            mock.restore();
            mockTwoCoreCpuSysfs(false);
            cpuWorker = new CpuWorker(makeTccdStub());
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: 1, online: true, scalingMinFrequency: 800000, scalingMaxFrequency: 3000000 },
            ]);

            expect((cpuWorker as any).validateCpuFreqPerCore(profile)).toBe(false);
        });

        it('returns false when scalingMinFrequency does not match the profile', (): void => {
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: 1, online: true, scalingMinFrequency: 1200000, scalingMaxFrequency: 3000000 },
            ]);

            expect((cpuWorker as any).validateCpuFreqPerCore(profile)).toBe(false);
        });

        it('returns false when scalingMaxFrequency does not match the profile', (): void => {
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: 1, online: true, scalingMinFrequency: 800000, scalingMaxFrequency: 2000000 },
            ]);

            expect((cpuWorker as any).validateCpuFreqPerCore(profile)).toBe(false);
        });

        it('skips frequency checks for a core the profile marks offline', (): void => {
            mock.restore();
            mockTwoCoreCpuSysfs(false);
            cpuWorker = new CpuWorker(makeTccdStub());
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: 1, online: false, scalingMinFrequency: 1234567, scalingMaxFrequency: 7654321 },
            ]);

            expect((cpuWorker as any).validateCpuFreqPerCore(profile)).toBe(true);
        });

        // Mirrors the apply-side quirk: CPU 0 is always online, but marking it "offline" in the
        // profile still short-circuits its frequency checks (see applyCpuProfilePerCore above).
        it('skips CPU 0 frequency checks entirely when its perCoreConfig entry is marked offline', (): void => {
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: 0, online: false, scalingMinFrequency: 1234567, scalingMaxFrequency: 7654321 },
            ]);

            expect((cpuWorker as any).validateCpuFreqPerCore(profile)).toBe(true);
        });

        it('ignores an entry with an out-of-range cpuId without throwing', (): void => {
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: 5, online: true, scalingMinFrequency: 800000, scalingMaxFrequency: 3000000 },
            ]);

            expect((): void => (cpuWorker as any).validateCpuFreqPerCore(profile)).not.toThrow();
        });

        it('ignores an entry with a negative cpuId without throwing', (): void => {
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: -1, online: true, scalingMinFrequency: 800000, scalingMaxFrequency: 3000000 },
            ]);

            expect((): void => (cpuWorker as any).validateCpuFreqPerCore(profile)).not.toThrow();
        });

        it('ignores an entry with a missing (undefined) cpuId without throwing', (): void => {
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: undefined, online: true, scalingMinFrequency: 800000, scalingMaxFrequency: 3000000 },
            ]);

            expect((): void => (cpuWorker as any).validateCpuFreqPerCore(profile)).not.toThrow();
        });
    });

    // These exercise the actual profile.cpu.mode === 'per-core' routing in applyCpuProfile()/
    // validateCpuFreq() through CpuWorker's own public API, rather than calling the per-core
    // methods directly -- so a broken dispatch (e.g. the mode check itself) would fail here too.
    describe('dispatch through the public API', (): void => {
        it('start() routes a per-core profile into applyCpuProfilePerCore', async (): Promise<void> => {
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: 1, online: true, scalingMinFrequency: 1000000, scalingMaxFrequency: 2500000 },
            ]);
            cpuWorker.updateProfile(profile);

            await cpuWorker.start();

            expect(readInt(CPU1_MIN_FREQ)).toBe(1000000);
            expect(readInt(CPU1_MAX_FREQ)).toBe(2500000);
        });

        it('work() reapplies a per-core profile once sysfs state has drifted', async (): Promise<void> => {
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: 1, online: true, scalingMinFrequency: 1000000, scalingMaxFrequency: 2500000 },
            ]);
            cpuWorker.updateProfile(profile);
            await cpuWorker.start();

            // Simulate drift: something external changed cpu1's min frequency after it was applied.
            new SysFsPropertyInteger(CPU1_MIN_FREQ).writeValue(800000);
            const logLine = jasmine.createSpy('logLine');
            (cpuWorker as any).tccd = makeTccdStub(logLine);

            await cpuWorker.work();

            expect(logLine).toHaveBeenCalledWith('CpuWorker: Incorrect settings, reapplying profile');
            expect(readInt(CPU1_MIN_FREQ)).toBe(1000000);
        });

        it('work() does not reapply a per-core profile that already matches sysfs state', async (): Promise<void> => {
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: 1, online: true, scalingMinFrequency: 1000000, scalingMaxFrequency: 2500000 },
            ]);
            cpuWorker.updateProfile(profile);
            await cpuWorker.start();

            const logLine = jasmine.createSpy('logLine');
            (cpuWorker as any).tccd = makeTccdStub(logLine);

            await cpuWorker.work();

            expect(logLine).not.toHaveBeenCalledWith('CpuWorker: Incorrect settings, reapplying profile');
        });

        it('work() picks up a core hot-plugged after CpuWorker was constructed', async (): Promise<void> => {
            const profile: ITccProfile = makePerCoreProfile([
                { cpuId: 2, online: true, scalingMinFrequency: 1000000, scalingMaxFrequency: 2500000 },
            ]);
            cpuWorker.updateProfile(profile);

            // cpu2 didn't exist when cpuWorker (and its initial cpuCtrl.cores snapshot) was built above.
            mock.restore();
            mock({
                '/sys/devices/system/cpu/possible': '0-2',
                '/sys/devices/system/cpu/present': '0-2',
                '/sys/devices/system/cpu/cpu0/cpufreq/scaling_min_freq': '800000',
                '/sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq': '3000000',
                '/sys/devices/system/cpu/cpu1/online': '1',
                '/sys/devices/system/cpu/cpu1/cpufreq/scaling_min_freq': '800000',
                '/sys/devices/system/cpu/cpu1/cpufreq/scaling_max_freq': '3000000',
                '/sys/devices/system/cpu/cpu2/online': '1',
                '/sys/devices/system/cpu/cpu2/cpufreq/scaling_min_freq': '800000',
                '/sys/devices/system/cpu/cpu2/cpufreq/scaling_max_freq': '3000000',
            });
            const logLine = jasmine.createSpy('logLine');
            (cpuWorker as any).tccd = makeTccdStub(logLine);

            await cpuWorker.work();

            // Without refreshing the core list first, cpuId 2 would be out of range against the
            // stale 2-core snapshot and this mismatch would go undetected.
            expect(logLine).toHaveBeenCalledWith('CpuWorker: Incorrect settings, reapplying profile');
            expect(readInt('/sys/devices/system/cpu/cpu2/cpufreq/scaling_min_freq')).toBe(1000000);
        });
    });
});
