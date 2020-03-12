/*!
 * Copyright (c) 2020 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
#pragma once

#include <stdint.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/ioctl.h>
#include "tuxedo_wmi_ioctl.h"

class TuxedoWmiAPI {
/*public:
    TuxedoWmiAPI();
    ~TuxedoWmiAPI();
    bool WmiAvailable();
    bool SetWebcam(bool);

private:
    const char *TUXEDO_WMI_DEVICE_FILE = "/dev/tuxedo_wmi";

    int _fileHandle = -1;
    void OpenDevice();
    void CloseDevice();
    bool IoctlCall(unsigned long);
    bool IoctlCall(unsigned long, int &);
*/
public:
    TuxedoWmiAPI() {
        OpenDevice();
    }

    ~TuxedoWmiAPI() {
        CloseDevice();
    }

    bool WmiAvailable() {
        return _fileHandle >= 0;
    }

    bool SetWebcam(bool status) {
        int argument = status ? 1 : 0;
        return IoctlCall(W_WEBCAM_SW, argument);
    }

    bool SetFanSpeeds(uint8_t speed1, uint8_t speed2, uint8_t speed3, uint8_t speed4) {
        int argument = 0;
        argument |= (speed1 & 0xff);
        argument |= (speed2 & 0xff) << 0x08;
        argument |= (speed3 & 0xff) << 0x10;
        argument |= (speed4 & 0xff) << 0x18;
        return IoctlCall(W_FANSPEED, argument);
    }

    bool SetFanAuto(bool fan1, bool fan2, bool fan3, bool fan4) {
        int argument = 0;
        argument |= (fan1 ? 1 : 0);
        argument |= (fan2 ? 1 : 0) << 0x01;
        argument |= (fan3 ? 1 : 0) << 0x02;
        argument |= (fan4 ? 1 : 0) << 0x03;
        return IoctlCall(W_FANAUTO, argument);
    }

    bool GetFanInfo(int fanNr, int &fanInfo) {
        if (fanNr < 1 || fanNr > 4) return false;
        bool result = false;
        int argument = 0;
        if (fanNr == 1) {
            result = IoctlCall(R_FANINFO1, argument);
        } else if (fanNr == 2) {
            result = IoctlCall(R_FANINFO2, argument);
        } else if (fanNr == 3) {
            result = IoctlCall(R_FANINFO3, argument);
        } else if (fanNr == 4) {
            result = IoctlCall(R_FANINFO4, argument);
        }

        fanInfo = argument;
        return result;
    }

private:
    const char *TUXEDO_WMI_DEVICE_FILE = "/dev/tuxedo_wmi";
    int _fileHandle = -1;

    void OpenDevice() {
        _fileHandle = open(TUXEDO_WMI_DEVICE_FILE, O_RDWR);
    }

    void CloseDevice() {
        close(_fileHandle);
    }

    bool IoctlCall(unsigned long request) {
        if (!WmiAvailable()) return false;
        int result = ioctl(_fileHandle, request);
        return result >= 0;
    }

    bool IoctlCall(unsigned long request, int &argument) {
        if (!WmiAvailable()) return false;
        int result = ioctl(_fileHandle, request, &argument);
        return result >= 0;
    }
};
