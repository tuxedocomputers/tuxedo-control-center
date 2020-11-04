{
    "targets": [
        {
            "target_name": "TuxedoWMIAPI",
            "sources": [ "src/native-lib/tuxedo_wmi_napi.cc" ],
            "include_dirs": [ "<!@(node -p \"require('node-addon-api').include\")", "./src/native-lib/tuxedo_wmi_lib" ],
            "dependencies": [ "<!(node -p \"require('node-addon-api').gyp\")" ],
            "defines": [ "NAPI_CPP_EXCEPTIONS" ],
            "cflags_cc": ['-fexceptions']
        }
    ]
}