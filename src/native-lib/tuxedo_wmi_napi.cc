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
    bool result = wmi.WmiAvailable();
    return Boolean::New(info.Env(), result);
}

Boolean WebcamOn(const CallbackInfo &info) {
    TuxedoWmiAPI wmi;
    bool result = wmi.SetWebcam(true);
    return Boolean::New(info.Env(), result);
}

Boolean WebcamOff(const CallbackInfo &info) {
    TuxedoWmiAPI wmi;
    bool result = wmi.SetWebcam(false);
    return Boolean::New(info.Env(), result);
}

Boolean SetFanAuto(const CallbackInfo &info) {
    TuxedoWmiAPI wmi;
    if (info.Length() != 4 || !info[0].IsBoolean() || !info[1].IsBoolean() || !info[2].IsBoolean() || !info[3].IsBoolean()) return Boolean::New(info.Env(), false);
    bool fan1 = info[0].As<Boolean>();
    bool fan2 = info[1].As<Boolean>();
    bool fan3 = info[2].As<Boolean>();
    bool fan4 = info[3].As<Boolean>();

    bool result = wmi.SetFanAuto(fan1, fan2, fan3, fan4);

    return Boolean::New(info.Env(), result);
}

Boolean SetFanSpeedByte(const CallbackInfo &info) {
    TuxedoWmiAPI wmi;
    if (info.Length() != 4 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsNumber() || !info[3].IsNumber()) return Boolean::New(info.Env(), false);
    int speed1 = (int)round(info[0].As<Number>());
    int speed2 = (int)round(info[1].As<Number>());
    int speed3 = (int)round(info[2].As<Number>());
    int speed4 = (int)round(info[3].As<Number>());
    if (speed1 < 0x00 || speed1 > 0xff) return Boolean::New(info.Env(), false);
    if (speed2 < 0x00 || speed2 > 0xff) return Boolean::New(info.Env(), false);
    if (speed3 < 0x00 || speed3 > 0xff) return Boolean::New(info.Env(), false);
    if (speed4 < 0x00 || speed4 > 0xff) return Boolean::New(info.Env(), false);

    bool result = wmi.SetFanSpeeds(speed1 & 0xff, speed2 & 0xff, speed3 & 0xff, speed4 & 0xff);

    return Boolean::New(info.Env(), result);
}

Boolean GetFanInfo(const CallbackInfo &info) {
    TuxedoWmiAPI wmi;
    if (info.Length() != 2 || !info[0].IsNumber() || !info[1].IsObject()) return Boolean::New(info.Env(), false);
    int fanNumber = info[0].As<Number>();
    if (fanNumber < 1 || fanNumber > 4) return Boolean::New(info.Env(), false);;
    Object fanInfoParameter = info[1].As<Object>();

    int fanInfo = 0;
    bool result = wmi.GetFanInfo(fanNumber, fanInfo);
    int fanSpeed = fanInfo & 0xff;
    int fanTemp1 = (fanInfo >> 0x08) & 0xff;
    int fanTemp2 = (fanInfo >> 0x10) & 0xff;
    fanInfoParameter.Set("speed", fanSpeed);
    fanInfoParameter.Set("temp1", fanTemp1);
    fanInfoParameter.Set("temp2", fanTemp2);

    return Boolean::New(info.Env(), result);
}

Object Init(Env env, Object exports) {
    // General
    exports.Set(String::New(env, "getModuleInfo"), Function::New(env, GetModuleInfo));
    exports.Set(String::New(env, "wmiAvailable"), Function::New(env, WmiAvailable));

    // Webcam
    exports.Set(String::New(env, "webcamOn"), Function::New(env, WebcamOn));
    exports.Set(String::New(env, "webcamOff"), Function::New(env, WebcamOff));

    // Fan control
    exports.Set(String::New(env, "setFanAuto"), Function::New(env, SetFanAuto));
    exports.Set(String::New(env, "setFanSpeedByte"), Function::New(env, SetFanSpeedByte));
    exports.Set(String::New(env, "getFanInfo"), Function::New(env, GetFanInfo));

    return exports;
}

NODE_API_MODULE(TuxedoWMIAPI, Init);
