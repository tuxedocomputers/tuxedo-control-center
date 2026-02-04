const path = require('path');

module.exports = {
  resolve: {
    alias: {
      'dbus-next': path.resolve(__dirname, 'src/ng-app/native-mock/dbus-next.js'),
      'node-ble': path.resolve(__dirname, 'src/ng-app/native-mock/empty.js'),
      'abstract-socket': path.resolve(__dirname, 'src/ng-app/native-mock/empty.js'),
    },
    fallback: {
      "assert": false,
      "fs": false,
      "path": false,
      "os": false,
      "child_process": false,
      "crypto": false,
      "net": false,
      "stream": false,
      "timers": false,
      "x11": false,
      "http": false,
      "https": false,
      "util": false,
      "zlib": false,
      "constants": false
    }
  }
};
