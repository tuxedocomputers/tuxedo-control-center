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
    if (info.Length() != 1 || !info[0].IsObject()) return Boolean::New(info.Env(), false);

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

void SetEnableModeSet(const CallbackInfo &info) {
    if (info.Length() != 1 || info[0].IsBoolean()) { return; }
    TuxedoWmiAPI wmi;
    bool enabled = info[0].As<Boolean>();
    wmi.SetEnableModeSet(enabled);
}

void SetFansAuto(const CallbackInfo &info) {
    TuxedoWmiAPI wmi;
    wmi.SetFansAuto();
}

void SetFanSpeedPercent(const CallbackInfo &info) {
    if (info.Length() != 2 || !info[0].IsNumber() || !info[1].IsNumber()) { return; }
    TuxedoWmiAPI wmi;

    int fanNumber = info[0].As<Number>();
    int fanSpeedPercent = info[1].As<Number>();
    wmi.SetFanSpeedPercent(fanNumber, fanSpeedPercent);
}

Number GetFanSpeedPercent(const CallbackInfo &info) {
    if (info.Length() != 1 || !info[0].IsNumber()) { return Number::New(info.Env(), 0); }
    TuxedoWmiAPI wmi;
    int fanNumber = info[0].As<Number>();
    int fanSpeedPercent;
    wmi.GetFanSpeedPercent(fanNumber, fanSpeedPercent);
    return Number::New(info.Env(), fanSpeedPercent);
}

Number GetFanTemperature(const CallbackInfo &info) {
    if (info.Length() != 1 || !info[0].IsNumber()) { return Number::New(info.Env(), 0); }
    TuxedoWmiAPI wmi;
    int fanNumber = info[0].As<Number>();
    int temperatureCelcius;
    wmi.GetFanTemperature(fanNumber, temperatureCelcius);
    return Number::New(info.Env(), temperatureCelcius);
}

void SetWebcamStatus(const CallbackInfo &info) {
    TuxedoWmiAPI wmi;
    if (info.Length() != 1 || !info[0].IsBoolean()) return;
    bool status = info[0].As<Boolean>();
    wmi.SetWebcam(status);
}

Boolean GetWebcamStatus(const CallbackInfo &info) {
    TuxedoWmiAPI wmi;
    bool status = false;
    wmi.GetWebcam(status);
    return Boolean::New(info.Env(), status);
}

Object Init(Env env, Object exports) {
    // General
    exports.Set(String::New(env, "getModuleInfo"), Function::New(env, GetModuleInfo));
    exports.Set(String::New(env, "wmiAvailable"), Function::New(env, WmiAvailable));

    exports.Set(String::New(env, "setEnableModeSet"), Function::New(env, SetEnableModeSet));

    // Fan control
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
