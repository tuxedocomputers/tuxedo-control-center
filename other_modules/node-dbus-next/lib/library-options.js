let libraryOptions = {
  bigIntCompat: false
}

module.exports.getBigIntCompat = function() {
  return libraryOptions.bigIntCompat;
}

module.exports.setBigIntCompat = function(val) {
  if (typeof val !== 'boolean') {
    throw new Error('dbus.setBigIntCompat() must be called with a boolean parameter');
  }
  libraryOptions.bigIntCompat = val;
}
