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
    bool wmiAvailable();
    bool setWebcam();

private:
    const char *TUXEDO_WMI_DEVICE_FILE = "/dev/wmi_driver_dev";

    int _fileHandle = -1;
    void openDevice();
    void closeDevice();
    bool ioctlCall(unsigned long);
    bool ioctlCall(unsigned long, int &);
*/
public:
    TuxedoWmiAPI() {
        openDevice();
    }

    ~TuxedoWmiAPI() {
        closeDevice();
    }

    bool wmiAvailable() {
        return _fileHandle >= 0;
    }

    bool setWebcam(bool status) {
        int argument = status ? 1 : 0;
        return ioctlCall(W_WEBCAM_SW, argument);
    }

private:
    const char *TUXEDO_WMI_DEVICE_FILE = "/dev/tuxedo_wmi";
    int _fileHandle = -1;

    void openDevice() {
        _fileHandle = open(TUXEDO_WMI_DEVICE_FILE, O_RDWR);
    }

    void closeDevice() {
        close(_fileHandle);
    }

    bool ioctlCall(unsigned long request) {
        if (!wmiAvailable()) return false;
        int result = ioctl(_fileHandle, request);
        return result >= 0;
    }

    bool ioctlCall(unsigned long request, int &argument) {
        if (!wmiAvailable()) return false;
        int result = ioctl(_fileHandle, request, argument);
        return result >= 0;
    }
};
