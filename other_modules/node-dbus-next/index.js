const constants = require('./lib/constants');
const MessageBus = require('./lib/bus');
const errors = require('./lib/errors');
const {Variant} = require('./lib//variant');
const {Message} = require('./lib/message-type.js');
const iface = require('./lib/service/interface');
const createConnection = require('./lib/connection.js');

let createClient = function(params) {
  let connection = createConnection(params || {});
  return new MessageBus(connection);
};

/**
 * Create a new {@link MessageBus} client on the DBus system bus to connect to
 * interfaces or request service names. Connects to the socket specified by the
 * `DBUS_SYSTEM_BUS_ADDRESS` environment variable or
 * `unix:path=/var/run/dbus/system_bus_socket`.
 *
 */
module.exports.systemBus = function() {
  return createClient({
    busAddress:
      process.env.DBUS_SYSTEM_BUS_ADDRESS ||
      'unix:path=/var/run/dbus/system_bus_socket'
  });
};

/**
 * Create a new {@link MessageBus} client on the DBus session bus to connect to
 * interfaces or request service names.
 *
 * @param {object} [options] - Options for `MessageBus` creation.
 * @param {object} [options.busAddress] - The socket path for the session bus.
 * Defaults to finding the bus address in the manner specified in the DBus
 * specification. The bus address will first be read from the
 * `DBUS_SESSION_BUS_ADDRESS` environment variable and when that is not
 * available, found from the `$HOME/.dbus` directory.
 */
module.exports.sessionBus = function(opts) {
  return createClient(opts);
};

/**
 * Use JSBI as a polyfill for long integer types ('x' and 't') in the client
 * and the service. This is required for Node verisons that do not support the
 * native `BigInt` class which is used by default for these types (version <
 * 10.8.0).
 *
 * @function
 * @param {boolean} compat - pass `true` to use JSBI.
 */
module.exports.setBigIntCompat = require('./lib/library-options').setBigIntCompat

module.exports.NameFlag = constants.NameFlag;
module.exports.RequestNameReply = constants.RequestNameReply;
module.exports.ReleaseNameReply = constants.ReleaseNameReply;
module.exports.MessageType = constants.MessageType;
module.exports.MessageFlag = constants.MessageFlag;

module.exports.interface = iface;
module.exports.Variant = Variant;
module.exports.Message = Message;
module.exports.validators = require('./lib/validators');
module.exports.DBusError = errors.DBusError;
