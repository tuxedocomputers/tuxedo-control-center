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
        int result = ioctl(_fileHandle, request, argument);
        return result >= 0;
    }
};
