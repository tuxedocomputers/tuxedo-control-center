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
#include <napi.h>
#include <cmath>
#include "tuxedo_wmi_lib/tuxedo_wmi_api.hh"

using namespace Napi;

Boolean GetModuleInfo(const CallbackInfo &info) {
    TuxedoWmiAPI wmi;
    if (info.Length() != 1 || !info[0].IsObject()) { throw Napi::Error::New(info.Env(), "GetModuleInfo - invalid argument"); }

    Object moduleInfo = info[0].As<Object>();
    std::string version;
    bool result = wmi.GetModuleVersion(version);
    moduleInfo.Set("version", version);

    return Boolean::New(info.Env(), result);
}

Boolean WmiAvailable(const CallbackInfo &info) {
    TuxedoWmiAPI wmi;
    bool availability = wmi.WmiAvailable();
    return Boolean::New(info.Env(), availability);
}

Boolean SetEnableModeSet(const CallbackInfo &info) {
    if (info.Length() != 1 || !info[0].IsBoolean()) { throw Napi::Error::New(info.Env(), "SetEnableModeSet - invalid argument"); }
    TuxedoWmiAPI wmi;
    bool enabled = info[0].As<Boolean>();
    bool result = wmi.SetEnableModeSet(enabled);
    return Boolean::New(info.Env(), result);
}

Number GetNumberFans(const CallbackInfo &info) {
    TuxedoWmiAPI wmi;
    int nrFans = 0;
    wmi.GetNumberFans(nrFans);
    return Number::New(info.Env(), nrFans);
}

Boolean SetFansAuto(const CallbackInfo &info) {
    TuxedoWmiAPI wmi;
    bool result = wmi.SetFansAuto();
    return Boolean::New(info.Env(), result);
}

Boolean SetFanSpeedPercent(const CallbackInfo &info) {
    if (info.Length() != 2 || !info[0].IsNumber() || !info[1].IsNumber()) { throw Napi::Error::New(info.Env(), "SetFanSpeedPercent - invalid argument"); }
    TuxedoWmiAPI wmi;

    int fanNumber = info[0].As<Number>();
    int fanSpeedPercent = info[1].As<Number>();
    bool result = wmi.SetFanSpeedPercent(fanNumber, fanSpeedPercent);
    return Boolean::New(info.Env(), result);
}

Boolean GetFanSpeedPercent(const CallbackInfo &info) {
    if (info.Length() != 2 || !info[0].IsNumber() || !info[1].IsObject()) { throw Napi::Error::New(info.Env(), "GetFanSpeedPercent - invalid argument"); }
    TuxedoWmiAPI wmi;
    int fanNumber = info[0].As<Number>();
    int fanSpeedPercent;
    bool result = wmi.GetFanSpeedPercent(fanNumber, fanSpeedPercent);
    Object objWrapper = info[1].As<Object>();
    objWrapper.Set("value", fanSpeedPercent);
    return Boolean::New(info.Env(), result);
}

Boolean GetFanTemperature(const CallbackInfo &info) {
    if (info.Length() != 2 || !info[0].IsNumber() || !info[1].IsObject()) { throw Napi::Error::New(info.Env(), "GetFanTemperature - invalid argument"); }
    TuxedoWmiAPI wmi;
    int fanNumber = info[0].As<Number>();
    int temperatureCelcius;
    bool result = wmi.GetFanTemperature(fanNumber, temperatureCelcius);
    Object objWrapper = info[1].As<Object>();
    objWrapper.Set("value", temperatureCelcius);
    return Boolean::New(info.Env(), result);
}

Boolean SetWebcamStatus(const CallbackInfo &info) {
    TuxedoWmiAPI wmi;
    if (info.Length() != 1 || !info[0].IsBoolean()) { throw Napi::Error::New(info.Env(), "SetWebcamStatus - invalid argument"); }
    bool status = info[0].As<Boolean>();
    bool result = wmi.SetWebcam(status);
    return Boolean::New(info.Env(), result);
}

Boolean GetWebcamStatus(const CallbackInfo &info) {
    if (info.Length() != 1 || !info[0].IsObject()) { throw Napi::Error::New(info.Env(), "GetWebcamStatus - invalid argument"); }
    TuxedoWmiAPI wmi;
    bool status = false;
    bool result = wmi.GetWebcam(status);
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

    return exports;
}

NODE_API_MODULE(TuxedoWMIAPI, Init);
