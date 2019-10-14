#include <napi.h>
#include "tuxedo_ec_lib/tuxedo_webcam_api.h"

using namespace Napi;

Boolean webcamOn(const CallbackInfo &info) {
    bool result;
    result = webcam_on();
    return Boolean::New(info.Env(), result);
}

Object Init(Env env, Object exports) {
    exports.Set(Boolean::New(env, "webcamOn"), Function::New(env, webcamOn));
    return exports;
}

NODE_API_MODULE(TuxedoECAPI, Init);
