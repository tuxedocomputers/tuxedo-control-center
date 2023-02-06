/*!
 * Copyright (c) 2020-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
#include <map>
#include <cmath>
#include "tuxedo_io_ioctl.h"

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
    virtual bool DeviceInterfaceIdStr(std::string &interfaceIdStr) = 0;
    virtual bool DeviceModelIdStr(std::string &modelIdStr) = 0;
    virtual bool SetEnableModeSet(bool enabled) = 0;
    virtual bool GetNumberFans(int &nrFans) = 0;
    virtual bool SetFansAuto() = 0;
    virtual bool SetFanSpeedPercent(const int fanNr, const int fanSpeedPercent) = 0;
    virtual bool GetFanSpeedPercent(const int fanNr, int &fanSpeedPercent) = 0;
    virtual bool GetFanTemperature(const int fanNr, int &temperatureCelcius) = 0;
    virtual bool GetFansMinSpeed(int &minSpeed) = 0;
    virtual bool GetFansOffAvailable(bool &offAvailable) = 0;
    virtual bool SetWebcam(const bool status) = 0;
    virtual bool GetWebcam(bool &status) = 0;
    virtual bool GetAvailableODMPerformanceProfiles(std::vector<std::string> &profiles) = 0;
    virtual bool SetODMPerformanceProfile(std::string performanceProfile) = 0;
    virtual bool GetDefaultODMPerformanceProfile(std::string &profileName) = 0;
    virtual bool GetNumberTDPs(int &nrTDPs) = 0;
    virtual bool GetTDPDescriptors(std::vector<std::string> &tdpDescriptors) = 0;
    virtual bool GetTDPMin(const int tdpInde, int &minValue) = 0;
    virtual bool GetTDPMax(const int tdpIndex, int &maxValue) = 0;
    virtual bool SetTDP(const int tdpIndex, const int tdpValue) = 0;
    virtual bool GetTDP(const int tdpIndex, int &tdpValue) = 0;

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

    virtual bool DeviceInterfaceIdStr(std::string &interfaceIdStr) {
        return io->IoctlCall(R_CL_HW_IF_STR, interfaceIdStr, 50);
    }

    virtual bool DeviceModelIdStr(std::string &modelIdStr) {
        return false;
    }

    virtual bool SetEnableModeSet(bool enabled) {
        // Nothing to do (..yet)
        return true;
    }

    virtual bool GetFansMinSpeed(int &minSpeed) {
        minSpeed = 20;
        return true;
    }

    virtual bool GetFansOffAvailable(bool &offAvailable) {
        offAvailable = true;
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
        return io->IoctlCall(W_CL_FANAUTO, argument);
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
        return io->IoctlCall(W_CL_FANSPEED, argument);
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
        return io->IoctlCall(W_CL_WEBCAM_SW, argument);
    }

    virtual bool GetWebcam(bool &status) {
        int webcamStatus = 0;
        int ret = io->IoctlCall(R_CL_WEBCAM_SW, webcamStatus);
        status = webcamStatus == 1 ? true : false;
        return ret;
    }

    virtual bool GetAvailableODMPerformanceProfiles(std::vector<std::string> &profiles) {
        profiles.clear();
        profiles.push_back(PERF_PROF_STR_QUIET);
        profiles.push_back(PERF_PROF_STR_POWERSAVE);
        profiles.push_back(PERF_PROF_STR_ENTERTAINMENT);
        profiles.push_back(PERF_PROF_STR_PERFORMANCE);
        return true;
    }

    virtual bool SetODMPerformanceProfile(std::string performanceProfile) {
        bool result = false;
        bool perfProfileExists = clevoPerformanceProfilesToArgument.find(performanceProfile) != clevoPerformanceProfilesToArgument.end();
        if (perfProfileExists) {
            int perfProfileArgument = clevoPerformanceProfilesToArgument.at(performanceProfile);
            result = io->IoctlCall(W_CL_PERF_PROFILE, perfProfileArgument);
        }
        return result;
    }

    virtual bool GetDefaultODMPerformanceProfile(std::string &profileName) {
        profileName = "performance";
        return true;
    }

    virtual bool GetNumberTDPs(int &nrTDPs) { return false; }
    virtual bool GetTDPDescriptors(std::vector<std::string> &tdpDescriptors) { return false; }
    virtual bool GetTDPMin(const int tdpIndex, int &minValue) { return false; }
    virtual bool GetTDPMax(const int tdpIndex, int &maxValue) { return false; }
    virtual bool SetTDP(const int tdpIndex, int tdpValue) { return false; }
    virtual bool GetTDP(const int tdpIndex, int &tdpValue) { return false; }

private:
    const int MAX_FAN_SPEED = 0xff;
    const std::string PERF_PROF_STR_QUIET = "quiet";
    const std::string PERF_PROF_STR_POWERSAVE = "power_saving";
    const std::string PERF_PROF_STR_PERFORMANCE = "performance";
    const std::string PERF_PROF_STR_ENTERTAINMENT = "entertainment";

    const std::map<std::string, int> clevoPerformanceProfilesToArgument = {
        { PERF_PROF_STR_QUIET,          0x00 },
        { PERF_PROF_STR_POWERSAVE,      0x01 },
        { PERF_PROF_STR_PERFORMANCE,    0x02 },
        { PERF_PROF_STR_ENTERTAINMENT,  0x03 }
    };

    bool GetFanInfo(int fanNr, int &fanInfo) {
        if (fanNr < 0 || fanNr >= 3) return false;
        bool result = false;
        int argument = 0;
        if (fanNr == 0) {
            result = io->IoctlCall(R_CL_FANINFO1, argument);
        } else if (fanNr == 1) {
            result = io->IoctlCall(R_CL_FANINFO2, argument);
        } else if (fanNr == 2) {
            result = io->IoctlCall(R_CL_FANINFO3, argument);
        } else if (fanNr == 3) {
            // result = IoctlCall(R_CL_FANINFO4, argument);
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

    virtual bool DeviceInterfaceIdStr(std::string &interfaceIdStr) {
        interfaceIdStr = "uniwill";
        return true;
    }

    virtual bool DeviceModelIdStr(std::string &modelIdStr) {
        int32_t modelId;
        modelIdStr = "";
        bool success = io->IoctlCall(R_UW_MODEL_ID, modelId);
        if (success) {
            modelIdStr = std::to_string(modelId);
        }
        return success;
    }

    virtual bool SetEnableModeSet(bool enabled) {
        int enabledSet = enabled ? 0x01 : 0x00;
        return io->IoctlCall(W_UW_MODE_ENABLE, enabledSet);
    }

    virtual bool GetFansMinSpeed(int &minSpeed) {
        return io->IoctlCall(R_UW_FANS_MIN_SPEED, minSpeed);
    }

    virtual bool GetFansOffAvailable(bool &offAvailable) {
        int result;
        int ret = io->IoctlCall(R_UW_FANS_OFF_AVAILABLE, result);
        offAvailable = result == 1;
        return ret;
    }

    virtual bool GetNumberFans(int &nrFans) {
        nrFans = 2;
        return true;
    }

    virtual bool SetFansAuto() {
        return io->IoctlCall(W_UW_FANAUTO);
    }

    virtual bool SetFanSpeedPercent(const int fanNr, const int fanSpeedPercent) {
        int fanSpeedRaw = (int) std::round(MAX_FAN_SPEED * fanSpeedPercent / 100.0);
        bool result;

        switch (fanNr) {
            case 0:
                result = io->IoctlCall(W_UW_FANSPEED, fanSpeedRaw);
                break;
            case 1:
                result = io->IoctlCall(W_UW_FANSPEED2, fanSpeedRaw);
                break;
            default:
                result = false;
                break;
        }

        return result;
    }

    virtual bool GetFanSpeedPercent(const int fanNr, int &fanSpeedPercent) {
        int fanSpeedRaw;
        bool result;

        switch (fanNr) {
            case 0:
                result = io->IoctlCall(R_UW_FANSPEED, fanSpeedRaw);
                break;
            case 1:
                result = io->IoctlCall(R_UW_FANSPEED2, fanSpeedRaw);
                break;
            default:
                result = false;
                break;
        }

        fanSpeedPercent = (int) std::round(fanSpeedRaw * 100.0 / MAX_FAN_SPEED);

        return result;
    }

    virtual bool GetFanTemperature(const int fanNr, int &temperatureCelcius) {
        int temp = 0;
        bool result;

        switch (fanNr) {
            case 0:
                result = io->IoctlCall(R_UW_FAN_TEMP, temp);
                break;
            case 1:
                result = io->IoctlCall(R_UW_FAN_TEMP2, temp);
                break;
            default:
                result = false;
                break;
        }

        temperatureCelcius = temp;

        // Also use known set value (0x00) from tccwmi to detect no temp/fan
        if (temp == 0) result = false;

        return result;
    }

    virtual bool SetWebcam(const bool status) {
        // Not implemented
        return false;
    }

    virtual bool GetWebcam(bool &status) {
        // Not implemented
        return false;
    }

    virtual bool GetAvailableODMPerformanceProfiles(std::vector<std::string> &profiles) {
        int nrProfiles = 0;
        profiles.clear();
        bool result = io->IoctlCall(R_UW_PROFS_AVAILABLE, nrProfiles);
        if (nrProfiles < 2) {
            result = false;
        }
        if (nrProfiles >= 2) {
            profiles.push_back(PERF_PROF_STR_BALANCED);
            profiles.push_back(PERF_PROF_STR_ENTHUSIAST);
        }
        if (nrProfiles >= 3) {
            profiles.push_back(PERF_PROF_STR_OVERBOOST);
        }
        return result;
    }

    virtual bool SetODMPerformanceProfile(std::string performanceProfile) {
        bool result = false;
        bool perfProfileExists = uniwillPerformanceProfilesToArgument.find(performanceProfile) != uniwillPerformanceProfilesToArgument.end();
        if (perfProfileExists) {
            int32_t perfProfileArgument = uniwillPerformanceProfilesToArgument.at(performanceProfile);
            result = io->IoctlCall(W_UW_PERF_PROF, perfProfileArgument);
        }
        return result;
    }

    virtual bool GetDefaultODMPerformanceProfile(std::string &profileName) {
        int nrProfiles = 0;
        int nrTDPs = 0;

        bool result = io->IoctlCall(R_UW_PROFS_AVAILABLE, nrProfiles);
        if (result && nrProfiles > 0) {
            GetNumberTDPs(nrTDPs);
            if (nrTDPs > 0) {
                // LEDs only case (default to LEDs off)
                profileName = PERF_PROF_STR_OVERBOOST;
            } else {
                profileName = PERF_PROF_STR_ENTHUSIAST;
            }
        } else {
            result = false;
        }
        return result;
    }

    virtual bool GetNumberTDPs(int &nrTDPs) {

        // Check return status of getters to figure out how many
        // TDPs are configurable
        for (int i = 2; i >= 0; --i) {
            int status = 0;
            bool success = GetTDP(i, status);
            if (success && status >= 0) {
                nrTDPs = i + 1;
                break;
            }
        }

        return true;
    }

    virtual bool GetTDPDescriptors(std::vector<std::string> &tdpDescriptors) {
        int nrTDPs = 0;
        bool result = this->GetNumberTDPs(nrTDPs);
        if (nrTDPs >= 1) {
            tdpDescriptors.push_back("pl1");
        }
        if (nrTDPs >= 2) {
            tdpDescriptors.push_back("pl2");
        }
        if (nrTDPs >= 3) {
            tdpDescriptors.push_back("pl4");
        }
        return result;
    }

    virtual bool GetTDPMin(const int tdpIndex, int &minValue) {
        const unsigned long ioctl_tdp_min[] = { R_UW_TDP0_MIN, R_UW_TDP1_MIN, R_UW_TDP2_MIN };
        if (tdpIndex < 0 || tdpIndex > 2) {
            return -EINVAL;
        }
        return io->IoctlCall(ioctl_tdp_min[tdpIndex], minValue);
    }

    virtual bool GetTDPMax(const int tdpIndex, int &maxValue) {
        const unsigned long ioctl_tdp_max[] = { R_UW_TDP0_MAX, R_UW_TDP1_MAX, R_UW_TDP2_MAX };
        if (tdpIndex < 0 || tdpIndex > 2) {
            return -EINVAL;
        }
        return io->IoctlCall(ioctl_tdp_max[tdpIndex], maxValue);
    }

    virtual bool SetTDP(const int tdpIndex, int tdpValue) {
        const unsigned long ioctl_tdp_set[] = { W_UW_TDP0, W_UW_TDP1, W_UW_TDP2 };
        if (tdpIndex < 0 || tdpIndex > 2) {
            return -EINVAL;
        }
        return io->IoctlCall(ioctl_tdp_set[tdpIndex], tdpValue);
    }

    virtual bool GetTDP(const int tdpIndex, int &tdpValue) {
        const unsigned long ioctl_tdp_get[] = { R_UW_TDP0, R_UW_TDP1, R_UW_TDP2 };
        if (tdpIndex < 0 || tdpIndex > 2) {
            return -EINVAL;
        }
        return io->IoctlCall(ioctl_tdp_get[tdpIndex], tdpValue);
    }

private:
    const int MAX_FAN_SPEED = 0xc8;
    const std::string PERF_PROF_STR_BALANCED = "power_save";
    const std::string PERF_PROF_STR_ENTHUSIAST = "enthusiast";
    const std::string PERF_PROF_STR_OVERBOOST = "overboost";

    const std::map<std::string, int> uniwillPerformanceProfilesToArgument = {
        { PERF_PROF_STR_BALANCED,       0x01 },
        { PERF_PROF_STR_ENTHUSIAST,     0x02 },
        { PERF_PROF_STR_OVERBOOST,      0x03 }
    };

    bool GetFanInfo(int fanNr, int &fanInfo) {
        if (fanNr < 0 || fanNr >= 3) return false;
        bool result = false;
        int argument = 0;
        if (fanNr == 0) {
            result = io->IoctlCall(R_CL_FANINFO1, argument);
        } else if (fanNr == 1) {
            result = io->IoctlCall(R_CL_FANINFO2, argument);
        } else if (fanNr == 2) {
            result = io->IoctlCall(R_CL_FANINFO3, argument);
        } else if (fanNr == 3) {
            // result = IoctlCall(R_CL_FANINFO4, argument);
        }

        fanInfo = argument;
        return result;
    }
};

#define TUXEDO_IO_DEVICE_FILE "/dev/tuxedo_io"

class TuxedoIOAPI : public DeviceInterface {
public:
    IO io = IO(TUXEDO_IO_DEVICE_FILE);

    TuxedoIOAPI() : DeviceInterface(io) {
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

    ~TuxedoIOAPI() {
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

    bool GetModuleAPIMinVersion(std::string &version) {
        version = MOD_API_MIN_VERSION;
        return true;
    }

    virtual bool Identify(bool &identified) {
        if (activeInterface) {
            return activeInterface->Identify(identified);
        } else {
            return false;
        }
    }

    virtual bool DeviceInterfaceIdStr(std::string &interfaceIdStr) {
        if (activeInterface) {
            return activeInterface->DeviceInterfaceIdStr(interfaceIdStr);
        } else {
            return false;
        }
    }

    virtual bool DeviceModelIdStr(std::string &modelIdStr) {
        if (activeInterface) {
            return activeInterface->DeviceModelIdStr(modelIdStr);
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

    virtual bool GetFansMinSpeed(int &minSpeed) {
        if (activeInterface) {
            return activeInterface->GetFansMinSpeed(minSpeed);
        } else {
            return false;
        }
    }

    virtual bool GetFansOffAvailable(bool &offAvailable) {
        if (activeInterface) {
            return activeInterface->GetFansOffAvailable(offAvailable);
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

    virtual bool GetAvailableODMPerformanceProfiles(std::vector<std::string> &profiles) {
        if (activeInterface) {
            return activeInterface->GetAvailableODMPerformanceProfiles(profiles);
        } else {
            return false;
        }
    }

    virtual bool SetODMPerformanceProfile(std::string performanceProfile) {
        if (activeInterface) {
            return activeInterface->SetODMPerformanceProfile(performanceProfile);
        } else {
            return false;
        }
    }

    virtual bool GetDefaultODMPerformanceProfile(std::string &profileName) {
        if (activeInterface) {
            return activeInterface->GetDefaultODMPerformanceProfile(profileName);
        } else {
            return false;
        }
    }

    virtual bool GetNumberTDPs(int &nrTDPs) {
        if (activeInterface) {
            return activeInterface->GetNumberTDPs(nrTDPs);
        } else {
            return false;
        }
    }

    virtual bool GetTDPDescriptors(std::vector<std::string> &tdpDescriptors) {
        if (activeInterface) {
            return activeInterface->GetTDPDescriptors(tdpDescriptors);
        } else {
            return false;
        }
    }

    virtual bool GetTDPMin(const int tdpIndex, int &minValue) {
        if (activeInterface) {
            return activeInterface->GetTDPMin(tdpIndex, minValue);
        } else {
            return false;
        }
    }

    virtual bool GetTDPMax(const int tdpIndex, int &maxValue) {
        if (activeInterface) {
            return activeInterface->GetTDPMax(tdpIndex, maxValue);
        } else {
            return false;
        }
    }

    virtual bool SetTDP(const int tdpIndex, int tdpValue) {
        if (activeInterface) {
            return activeInterface->SetTDP(tdpIndex, tdpValue);
        } else {
            return false;
        }
    }

    virtual bool GetTDP(const int tdpIndex, int &tdpValue) {
        if (activeInterface) {
            return activeInterface->GetTDP(tdpIndex, tdpValue);
        } else {
            return false;
        }
    }

private:
    std::vector<DeviceInterface *> devices;
    DeviceInterface *activeInterface { nullptr };
};
