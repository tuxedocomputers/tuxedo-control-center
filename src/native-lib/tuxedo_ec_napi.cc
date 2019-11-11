#include <napi.h>
#include "tuxedo_ec_lib/headers/tuxedo_webcam_api.h"
#include "tuxedo_ec_lib/headers/tuxedo_fan_api.h"


using namespace Napi;

Boolean webcamOn(const CallbackInfo &info) {
    int result;
    result = webcam_on();
    return Boolean::New(info.Env(), result == EC_SUCCESS);
}

Boolean webcamOff(const CallbackInfo &info) {
    int result;
    result = webcam_off();
    return Boolean::New(info.Env(), result == EC_SUCCESS);
}

Boolean setFanAuto(const CallbackInfo &info) {
    if (info.Length() != 1 || !info[0].IsNumber()) return Boolean::New(info.Env(), false);
    int fanNumber = info[0].As<Number>();
    if (fanNumber < 1 || fanNumber > 4) return Boolean::New(info.Env(), false);

    int result = set_fan_auto(fanNumber);

    return Boolean::New(info.Env(), result == EC_SUCCESS);
}

Boolean setFanSpeedPercent(const CallbackInfo &info) {
    if (info.Length() != 2 || !info[0].IsNumber() || !info[1].IsNumber()) return Boolean::New(info.Env(), false);
    int fanNumber = info[0].As<Number>();
    int speedPercent = info[1].As<Number>();
    if (fanNumber < 1 || fanNumber > 4) return Boolean::New(info.Env(), false);
    if (speedPercent < 0 || speedPercent > 100) return Boolean::New(info.Env(), false);

    int result = set_fan_speed(fanNumber, speedPercent);

    return Boolean::New(info.Env(), result == EC_SUCCESS);
}

Number getFanSpeedPercent(const CallbackInfo &info) {
    if (info.Length() != 1 || !info[0].IsNumber()) return Number::New(info.Env(), -1);
    int fanNumber = info[0].As<Number>();
    if (fanNumber < 1 || fanNumber > 4) return Number::New(info.Env(), -1);

    int fanSpeedPercent = get_fan_speed_percent(fanNumber);

    return Number::New(info.Env(), fanSpeedPercent);
}

Number getFanTemperature(const CallbackInfo &info) {
    if (info.Length() != 1 || !info[0].IsNumber()) return Number::New(info.Env(), -1);
    int fanNumber = info[0].As<Number>();
    if (fanNumber < 1 || fanNumber > 4) return Number::New(info.Env(), -1);

    int fanTemperature = get_fan_temperature(fanNumber);

    return Number::New(info.Env(), fanTemperature);
}

Object Init(Env env, Object exports) {
    // Webcam
    exports.Set(String::New(env, "webcamOn"), Function::New(env, webcamOn));
    exports.Set(String::New(env, "webcamOff"), Function::New(env, webcamOff));

    // Fan control
    exports.Set(String::New(env, "setFanAuto"), Function::New(env, setFanAuto));
    exports.Set(String::New(env, "setFanSpeedPercent"), Function::New(env, setFanSpeedPercent));
    exports.Set(String::New(env, "getFanSpeedPercent"), Function::New(env, getFanSpeedPercent));
    exports.Set(String::New(env, "getFanTemperature"), Function::New(env, getFanTemperature));

    return exports;
}

NODE_API_MODULE(TuxedoECAPI, Init);
