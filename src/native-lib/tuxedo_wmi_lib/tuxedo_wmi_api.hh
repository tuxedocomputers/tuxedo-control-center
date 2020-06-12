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
#include <string>
#include <vector>
#include <cmath>
#include "tuxedo_cc_wmi_ioctl.h"

class IO {
public:
    IO(const char *file) {
        OpenDevice(file);
    }

    ~IO() {
        CloseDevice();
    }

    bool IOAvailable() {
        return _fileHandle >= 0;
    }

    bool IoctlCall(unsigned long request) {
        if (!IOAvailable()) return false;
        int result = ioctl(_fileHandle, request);
        return result >= 0;
    }

    bool IoctlCall(unsigned long request, int &argument) {
        if (!IOAvailable()) return false;
        int result = ioctl(_fileHandle, request, &argument);
        return result >= 0;
    }

    bool IoctlCall(unsigned long request, std::string &argument, size_t buffer_length) {
        if (!IOAvailable()) return false;
        char *buffer = new char[buffer_length];
        int result = ioctl(_fileHandle, request, buffer);
        argument.clear();
        argument.append(buffer);
        delete[] buffer;
        return result >= 0;
    }

private:
    int _fileHandle = -1;

    void OpenDevice(const char *file) {
        _fileHandle = open(file, O_RDWR);
    }

    void CloseDevice() {
        close(_fileHandle);
    }
};

class DeviceInterface {
public:
    DeviceInterface(IO &io) { this->io = &io; }
    virtual ~DeviceInterface() { }

    virtual bool Identify(bool &identified) = 0;
    virtual bool SetEnableModeSet(bool enabled) = 0;
    virtual bool GetNumberFans(int &nrFans) = 0;
    virtual bool SetFansAuto() = 0;
    virtual bool SetFanSpeedPercent(const int fanNr, const int fanSpeedPercent) = 0;
    virtual bool GetFanSpeedPercent(const int fanNr, int &fanSpeedPercent) = 0;
    virtual bool GetFanTemperature(const int fanNr, int &temperatureCelcius) = 0;
    virtual bool SetWebcam(const bool status) = 0;
    virtual bool GetWebcam(bool &status) = 0;

protected:
    IO *io;
};

class ClevoDevice : public DeviceInterface {
public:
    ClevoDevice(IO &io) : DeviceInterface(io) { }
    virtual bool Identify(bool &identified) {
        int result;
        int ret = io->IoctlCall(R_HWCHECK_CL, result);
        identified = result == 1;
        return ret;
    }

    virtual bool SetEnableModeSet(bool enabled) {
        // Nothing to do (..yet)
        return true;
    }

    virtual bool GetNumberFans(int &nrFans) {
        nrFans = 3;
        return true;
    }

    virtual bool SetFansAuto() {
        int argument = 0;
        argument |= 1;
        argument |= 1 << 0x01;
        argument |= 1 << 0x02;
        argument |= 1 << 0x03;
        return io->IoctlCall(W_FANAUTO, argument);
    }

    virtual bool SetFanSpeedPercent(const int fanNr, const int fanSpeedPercent) {
        int argument = 0;
        int fanSpeedRaw[3];
        int ret;

        if (fanNr < 0 || fanNr >= 3) { return false; }
        if (fanSpeedPercent < 0 || fanSpeedPercent > 100) { return false; }

        for (int i = 0; i < 3; ++i) {
            if (i == fanNr) {
                fanSpeedRaw[i] = (int) std::round(fanSpeedPercent * 0xff / 100.0);
            } else {
                ret = GetFanSpeedRaw(i, fanSpeedRaw[i]);
                if (!ret) { return false; }
            }
        }
        argument |= (fanSpeedRaw[0] & 0xff);
        argument |= (fanSpeedRaw[1] & 0xff) << 0x08;
        argument |= (fanSpeedRaw[2] & 0xff) << 0x10;
        return io->IoctlCall(W_FANSPEED, argument);
    }

    virtual bool GetFanSpeedPercent(const int fanNr, int &fanSpeedPercent) {
        int fanSpeedRaw;
        int ret = GetFanSpeedRaw(fanNr, fanSpeedRaw);
        if (!ret) { return false; }
        fanSpeedPercent = std::round((fanSpeedRaw / (float) MAX_FAN_SPEED) * 100);
        return ret;
    }

    virtual bool GetFanTemperature(const int fanNr, int &temperatureCelcius) {
        int fanInfo;
        int ret = GetFanInfo(fanNr, fanInfo);
        if (!ret) { return false; }
        // Explicitly use temp2 since more consistently implemented
        //int fanTemp1 = (int8_t) ((fanInfo >> 0x08) & 0xff);
        int fanTemp2 = (int8_t) ((fanInfo >> 0x10) & 0xff);
        temperatureCelcius = fanTemp2;
        // If a fan is not available a low value is read out
        if (fanTemp2 <= 1) { ret = false; }
        return ret;
    }

    virtual bool SetWebcam(const bool status) {
        int argument = status ? 1 : 0;
        return io->IoctlCall(W_WEBCAM_SW, argument);
    }

    virtual bool GetWebcam(bool &status) {
        int webcamStatus = 0;
        int ret = io->IoctlCall(R_WEBCAM_SW, webcamStatus);
        status = webcamStatus == 1 ? true : false;
        return ret;
    }

private:
    const int MAX_FAN_SPEED = 0xff;

    bool GetFanInfo(int fanNr, int &fanInfo) {
        if (fanNr < 0 || fanNr >= 3) return false;
        bool result = false;
        int argument = 0;
        if (fanNr == 0) {
            result = io->IoctlCall(R_FANINFO1, argument);
        } else if (fanNr == 1) {
            result = io->IoctlCall(R_FANINFO2, argument);
        } else if (fanNr == 2) {
            result = io->IoctlCall(R_FANINFO3, argument);
        } else if (fanNr == 3) {
            // result = IoctlCall(R_FANINFO4, argument);
        }

        fanInfo = argument;
        return result;
    }

    bool GetFanSpeedRaw(const int fanNr, int &fanSpeedRaw) {
        int fanInfo;
        int ret = GetFanInfo(fanNr, fanInfo);
        fanSpeedRaw = fanInfo & 0xff;
        return ret;
    }
};

class UniwillDevice : public DeviceInterface {
public:
    UniwillDevice(IO &io) : DeviceInterface(io) { }

    virtual bool Identify(bool &identified) {
        int result;
        int ret = io->IoctlCall(R_HWCHECK_UW, result);
        identified = result == 1;
        return ret;
    }

    virtual bool SetEnableModeSet(bool enabled) {
        int enabledSet = enabled ? 0x01 : 0x00;
        return io->IoctlCall(W_UW_MODE_ENABLE, enabledSet);
    }

    virtual bool GetNumberFans(int &nrFans) {
        nrFans = 1;
        return true;
    }

    virtual bool SetFansAuto() {
        // Setting the mode will return control to the firmware
        int mode = 0xa0;
        return io->IoctlCall(W_UW_MODE, mode);
    }

    virtual bool SetFanSpeedPercent(const int fanNr, const int fanSpeedPercent) {
        int fanSpeedRaw = (int) std::round(0xc8 * fanSpeedPercent / 100.0);
        return io->IoctlCall(W_UW_FANSPEED, fanSpeedRaw);
    }

    virtual bool GetFanSpeedPercent(const int fanNr, int &fanSpeedPercent) {
        int fanSpeedRaw;
        int ret = io->IoctlCall(R_UW_FANSPEED, fanSpeedRaw);
        fanSpeedPercent = (int) std::round(fanSpeedRaw * 100.0 / 0xc8);
        return ret;
    }

    virtual bool GetFanTemperature(const int fanNr, int &temperatureCelcius) {
        if (fanNr != 0) { return false; }
        int temp = 0;
        int ret = io->IoctlCall(R_UW_FAN_TEMP, temp);
        temperatureCelcius = temp;
        return ret;
    }

    virtual bool SetWebcam(const bool status) {
        // Not implemented
        return false;
    }

    virtual bool GetWebcam(bool &status) {
        // Not implemented
        return false;
    }
};

#define TUXEDO_WMI_DEVICE_FILE "/dev/tuxedo_cc_wmi"

class TuxedoWmiAPI : public DeviceInterface {
public:
    IO io = IO(TUXEDO_WMI_DEVICE_FILE);

    TuxedoWmiAPI() : DeviceInterface(io) {
        devices.push_back(new ClevoDevice(io));
        devices.push_back(new UniwillDevice(io));

        for (std::size_t i = 0; i < devices.size(); ++i) {
            bool status, identified;
            status = devices[i]->Identify(identified);
            if (status && identified) {
                activeInterface = devices[i];
                break;
            }
        }
    }

    ~TuxedoWmiAPI() {
        for (std::size_t i = 0; i < devices.size(); ++i) {
            delete devices[i];
        }
    }

    bool WmiAvailable() {
        return io.IOAvailable();
    }

    bool GetModuleVersion(std::string &version) {
        return io.IoctlCall(R_MOD_VERSION, version, 20);
    }

    virtual bool Identify(bool &identified) {
        if (activeInterface) {
            return activeInterface->Identify(identified);
        } else {
            return false;
        }
    }

    virtual bool SetEnableModeSet(bool enabled) {
        if (activeInterface) {
            return activeInterface->SetEnableModeSet(enabled);
        } else {
            return false;
        }
    }

    virtual bool GetNumberFans(int &nrFans) {
        if (activeInterface) {
            return activeInterface->GetNumberFans(nrFans);
        } else {
            return false;
        }
    }
    virtual bool SetFansAuto() {
        if (activeInterface) {
            return activeInterface->SetFansAuto();
        } else {
            return false;
        }
    }

    virtual bool SetFanSpeedPercent(const int fanNr, const int fanSpeedPercent) {
        if (activeInterface) {
            return activeInterface->SetFanSpeedPercent(fanNr, fanSpeedPercent);
        } else {
            return false;
        }
    }

    virtual bool GetFanSpeedPercent(const int fanNr, int &fanSpeedPercent) {
        if (activeInterface) {
            return activeInterface->GetFanSpeedPercent(fanNr, fanSpeedPercent);
        } else {
            return false;
        }
    }

    virtual bool GetFanTemperature(const int fanNr, int &temperatureCelcius) {
        if (activeInterface) {
            return activeInterface->GetFanTemperature(fanNr, temperatureCelcius);
        } else {
            return false;
        }
    }
    virtual bool SetWebcam(const bool status) {
        if (activeInterface) {
            return activeInterface->SetWebcam(status);
        } else {
            return false;
        }
    }
    virtual bool GetWebcam(bool &status) {
        if (activeInterface) {
            return activeInterface->GetWebcam(status);
        } else {
            return false;
        }
    }

private:
    std::vector<DeviceInterface *> devices;
    DeviceInterface *activeInterface { nullptr };
};
