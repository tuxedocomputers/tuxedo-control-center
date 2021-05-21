/*!
 * Copyright (c) 2020-2021 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
#include <napi.h>
#include <cmath>
#include <vector>
#include "tuxedo_io_lib/tuxedo_io_api.hh"

using namespace Napi;

Boolean GetModuleInfo(const CallbackInfo &info) {
    TuxedoIOAPI io;
    if (info.Length() != 1 || !info[0].IsObject()) { throw Napi::Error::New(info.Env(), "GetModuleInfo - invalid argument"); }

    Object moduleInfo = info[0].As<Object>();
    std::string version;

    bool result = io.GetModuleVersion(version);
    moduleInfo.Set("version", version);
    
    std::string activeInterface;
    if (io.DeviceInterfaceIdStr(activeInterface)) {
        moduleInfo.Set("activeInterface", activeInterface);
    } else {
        moduleInfo.Set("activeInterface", "inactive");
    }

    return Boolean::New(info.Env(), result);
}

static inline bool CheckMinVersionByStrings(std::string version, std::string minVersion) {
    unsigned modVersionMajor, modVersionMinor, modVersionPatch, modAPIMinVersionMajor, modAPIMinVersionMinor, modAPIMinVersionPatch;
    if (sscanf(version.c_str(), "%u.%u.%u", &modVersionMajor, &modVersionMinor, &modVersionPatch) < 3 ||
            sscanf(minVersion.c_str(), "%u.%u.%u", &modAPIMinVersionMajor, &modAPIMinVersionMinor, &modAPIMinVersionPatch) < 3) {
        return false;
    }

    if (modVersionMajor < modAPIMinVersionMajor ||
            (modVersionMajor == modAPIMinVersionMajor && modVersionMinor < modAPIMinVersionMinor) ||
            (modVersionMajor == modAPIMinVersionMajor && modVersionMinor == modAPIMinVersionMinor && modVersionPatch < modAPIMinVersionPatch)) {
        return false;
    }

    return true;
}

Boolean WmiAvailable(const CallbackInfo &info) {
    TuxedoIOAPI io;

    std::string modVersion, modAPIMinVersion;

    bool availability = io.GetModuleVersion(modVersion) &&
                        io.GetModuleAPIMinVersion(modAPIMinVersion) &&
                        CheckMinVersionByStrings(modVersion, modAPIMinVersion) &&
                        io.WmiAvailable();

    return Boolean::New(info.Env(), availability);
}

Boolean SetEnableModeSet(const CallbackInfo &info) {
    if (info.Length() != 1 || !info[0].IsBoolean()) { throw Napi::Error::New(info.Env(), "SetEnableModeSet - invalid argument"); }
    TuxedoIOAPI io;
    bool enabled = info[0].As<Boolean>();
    bool result = io.SetEnableModeSet(enabled);
    return Boolean::New(info.Env(), result);
}

Number GetNumberFans(const CallbackInfo &info) {
    TuxedoIOAPI io;
    int nrFans = 0;
    io.GetNumberFans(nrFans);
    return Number::New(info.Env(), nrFans);
}

Boolean SetFansAuto(const CallbackInfo &info) {
    TuxedoIOAPI io;
    bool result = io.SetFansAuto();
    return Boolean::New(info.Env(), result);
}

Boolean SetFanSpeedPercent(const CallbackInfo &info) {
    if (info.Length() != 2 || !info[0].IsNumber() || !info[1].IsNumber()) { throw Napi::Error::New(info.Env(), "SetFanSpeedPercent - invalid argument"); }
    TuxedoIOAPI io;

    int fanNumber = info[0].As<Number>();
    int fanSpeedPercent = info[1].As<Number>();
    bool result = io.SetFanSpeedPercent(fanNumber, fanSpeedPercent);
    return Boolean::New(info.Env(), result);
}

Boolean GetFanSpeedPercent(const CallbackInfo &info) {
    if (info.Length() != 2 || !info[0].IsNumber() || !info[1].IsObject()) { throw Napi::Error::New(info.Env(), "GetFanSpeedPercent - invalid argument"); }
    TuxedoIOAPI io;
    int fanNumber = info[0].As<Number>();
    int fanSpeedPercent;
    bool result = io.GetFanSpeedPercent(fanNumber, fanSpeedPercent);
    Object objWrapper = info[1].As<Object>();
    objWrapper.Set("value", fanSpeedPercent);
    return Boolean::New(info.Env(), result);
}

Boolean GetFanTemperature(const CallbackInfo &info) {
    if (info.Length() != 2 || !info[0].IsNumber() || !info[1].IsObject()) { throw Napi::Error::New(info.Env(), "GetFanTemperature - invalid argument"); }
    TuxedoIOAPI io;
    int fanNumber = info[0].As<Number>();
    int temperatureCelcius;
    bool result = io.GetFanTemperature(fanNumber, temperatureCelcius);
    Object objWrapper = info[1].As<Object>();
    objWrapper.Set("value", temperatureCelcius);
    return Boolean::New(info.Env(), result);
}

Boolean SetWebcamStatus(const CallbackInfo &info) {
    TuxedoIOAPI io;
    if (info.Length() != 1 || !info[0].IsBoolean()) { throw Napi::Error::New(info.Env(), "SetWebcamStatus - invalid argument"); }
    bool status = info[0].As<Boolean>();
    bool result = io.SetWebcam(status);
    return Boolean::New(info.Env(), result);
}

Boolean GetWebcamStatus(const CallbackInfo &info) {
    if (info.Length() != 1 || !info[0].IsObject()) { throw Napi::Error::New(info.Env(), "GetWebcamStatus - invalid argument"); }
    TuxedoIOAPI io;
    bool status = false;
    bool result = io.GetWebcam(status);
    Object objWrapper = info[0].As<Object>();
    objWrapper.Set("value", status);
    return Boolean::New(info.Env(), result);
}

Boolean GetAvailableODMPerformanceProfiles(const CallbackInfo &info) {
    if (info.Length() != 1 || !info[0].IsObject()) { throw Napi::Error::New(info.Env(), "GetAvailableODMPerformanceProfiles - invalid argument"); }
    TuxedoIOAPI io;
    Object objWrapper = info[0].As<Object>();
    std::vector<std::string> profiles;
    bool result = io.GetAvailableODMPerformanceProfiles(profiles);
    auto arr = Array::New(info.Env());
    for (std::size_t i = 0; i < profiles.size(); ++i) {
        arr.Set(i, profiles[i]);
    }
    objWrapper.Set("value", arr);
    return Boolean::New(info.Env(), result);
}

Boolean SetODMPerformanceProfile(const CallbackInfo &info) {
    if (info.Length() != 1 || !info[0].IsString()) { throw Napi::Error::New(info.Env(), "SetODMPerformanceProfile - invalid argument"); }
    std::string performanceProfile = info[0].As<String>();
    TuxedoIOAPI io;
    bool result = io.SetODMPerformanceProfile(performanceProfile);
    return Boolean::New(info.Env(), result);
}

Object Init(Env env, Object exports) {
    // General
    exports.Set(String::New(env, "getModuleInfo"), Function::New(env, GetModuleInfo));
    exports.Set(String::New(env, "wmiAvailable"), Function::New(env, WmiAvailable));

    exports.Set(String::New(env, "setEnableModeSet"), Function::New(env, SetEnableModeSet));

    // Fan control
    exports.Set(String::New(env, "getNumberFans"), Function::New(env, GetNumberFans));
    exports.Set(String::New(env, "setFansAuto"), Function::New(env, SetFansAuto));
    exports.Set(String::New(env, "setFanSpeedPercent"), Function::New(env, SetFanSpeedPercent));
    exports.Set(String::New(env, "getFanSpeedPercent"), Function::New(env, GetFanSpeedPercent));
    exports.Set(String::New(env, "getFanTemperature"), Function::New(env, GetFanTemperature));

    // Webcam
    exports.Set(String::New(env, "setWebcamStatus"), Function::New(env, SetWebcamStatus));
    exports.Set(String::New(env, "getWebcamStatus"), Function::New(env, GetWebcamStatus));

    // ODM Profiles
    exports.Set(String::New(env, "getAvailableODMPerformanceProfiles"), Function::New(env, GetAvailableODMPerformanceProfiles));
    exports.Set(String::New(env, "setODMPerformanceProfile"), Function::New(env, SetODMPerformanceProfile));

    return exports;
}

NODE_API_MODULE(TuxedoIOAPI, Init);
