{
    "targets": [
        {
            "target_name": "TuxedoECAPI",
            "sources": [
                "src/native-lib/tuxedo_ec_napi.cc",
                "src/native-lib/tuxedo_ec_lib/tuxedo_ec_io.c",
                "src/native-lib/tuxedo_ec_lib/tuxedo_webcam_api.c"
            ],
            "include_dirs": [ "<!@(node -p \"require('node-addon-api').include\")", "./src/native-lib" ],
            "dependencies": [ "<!(node -p \"require('node-addon-api').gyp\")" ],
            "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ]
        }
    ]
}