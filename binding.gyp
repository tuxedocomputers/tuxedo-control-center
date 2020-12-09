{
    "targets": [
        {
            "target_name": "TuxedoIOAPI",
            "sources": [ "src/native-lib/tuxedo_io_napi.cc" ],
            "include_dirs": [ "<!@(node -p \"require('node-addon-api').include\")", "./src/native-lib/tuxedo_io_lib" ],
            "dependencies": [ "<!(node -p \"require('node-addon-api').gyp\")" ],
            "defines": [ "NAPI_CPP_EXCEPTIONS" ],
            "cflags_cc": ['-fexceptions']
        }
    ]
}