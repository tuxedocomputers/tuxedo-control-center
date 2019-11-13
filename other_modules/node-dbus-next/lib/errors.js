const { assertInterfaceNameValid } = require('./validators');
/**
 * An error that can be thrown from DBus [`Interface`]{@link
 * module:interface~Interface} [methods]{@link module:interface.method} and
 * [property]{@link module:interface.property} getters and setters to return
 * the error to the client.
 *
 * This class will also be thrown by {@link ProxyInterface} method calls when
 * the interface method returns an error to the method call.
 *
 * @param {string} type - The type of error. Must be a valid DBus member name.
 * @param {string} text - The error text. Will be seen by the client.
 */
class DBusError extends Error {
  /**
   * Construct a new `DBusError` with the given type and text.
   */
  constructor(type, text, reply=null) {
    assertInterfaceNameValid(type);
    text = text || '';
    super(text);
    this.name = 'DBusError';
    this.type = type;
    this.text = text;
    this.reply = reply;
  }
}

module.exports = {
  DBusError: DBusError,
};
