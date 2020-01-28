{
    "targets": [
        {
            "target_name": "TuxedoECAPI",
            "sources": [ "src/native-lib/tuxedo_ec_napi.cc" ],
            "libraries": [ "../src/native-lib/tuxedo_ec_lib/libs/tuxedo_ec_lib.a" ],
            "include_dirs": [ "<!@(node -p \"require('node-addon-api').include\")", "./src/native-lib/tuxedo_ec_lib/headers" ],
            "dependencies": [ "<!(node -p \"require('node-addon-api').gyp\")" ],
            "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ]
        },
        {
            "target_name": "TuxedoWMIAPI",
            "sources": [ "src/native-lib/tuxedo_wmi_napi.cc" ],
            "include_dirs": [ "<!@(node -p \"require('node-addon-api').include\")", "./src/native-lib/tuxedo_ec_lib/headers" ],
            "dependencies": [ "<!(node -p \"require('node-addon-api').gyp\")" ],
            "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ]
        }
    ]
}