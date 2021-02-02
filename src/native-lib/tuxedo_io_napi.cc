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

Boolean WmiAvailable(const CallbackInfo &info) {
    TuxedoIOAPI io;
    bool availability = io.WmiAvailable();
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

Boolean SetFansMode(const CallbackInfo &info) {
    if (info.Length() != 1 || !info[0].IsNumber()) { throw Napi::Error::New(info.Env(), "SetFansMode - invalid argument"); }
    TuxedoIOAPI io;
    int mode = info[0].As<Number>();
    bool result = io.SetFansMode(mode);
    return Boolean::New(info.Env(), result);
}

Number GetFansMode(const CallbackInfo &info) {
    TuxedoIOAPI io;
    int mode = 0;
    if (!io.GetFansMode(mode)) {
        mode = -1;
    }
    return Number::New(info.Env(), mode);
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

Object Init(Env env, Object exports) {
    // General
    exports.Set(String::New(env, "getModuleInfo"), Function::New(env, GetModuleInfo));
    exports.Set(String::New(env, "wmiAvailable"), Function::New(env, WmiAvailable));

    exports.Set(String::New(env, "setEnableModeSet"), Function::New(env, SetEnableModeSet));

    // Fan control
    exports.Set(String::New(env, "getNumberFans"), Function::New(env, GetNumberFans));
    exports.Set(String::New(env, "setFansAuto"), Function::New(env, SetFansAuto));
    exports.Set(String::New(env, "setFansMode"), Function::New(env, SetFansMode));
    exports.Set(String::New(env, "getFansMode"), Function::New(env, GetFansMode));
    exports.Set(String::New(env, "setFanSpeedPercent"), Function::New(env, SetFanSpeedPercent));
    exports.Set(String::New(env, "getFanSpeedPercent"), Function::New(env, GetFanSpeedPercent));
    exports.Set(String::New(env, "getFanTemperature"), Function::New(env, GetFanTemperature));

    // Webcam
    exports.Set(String::New(env, "setWebcamStatus"), Function::New(env, SetWebcamStatus));
    exports.Set(String::New(env, "getWebcamStatus"), Function::New(env, GetWebcamStatus));

    return exports;
}

NODE_API_MODULE(TuxedoIOAPI, Init);
