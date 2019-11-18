const {
  assertBusNameValid,
  assertInterfaceNameValid,
  assertObjectPathValid,
  assertMemberNameValid
} = require('./validators');

const {
  METHOD_CALL,
  METHOD_RETURN,
  ERROR,
  SIGNAL,
} = require('./constants').MessageType;

/**
 * @class
 * A `Message` is a class used for sending and receiving messages through the
 * {@link MessageBus} with the low-level api. `Message`s can be constructed by
 * the user directly for method calls or with the static convenience methods on
 * this class for the other types of messages. `Message`s can be sent through a
 * connected MessageBus with {@link MessageBus#call} for method calls that
 * expect a reply from the server or {@link MessageBus#send} for messages that
 * do not expect a reply. See those methods for an example of how to use this
 * class.
 *
 * @see https://dbus.freedesktop.org/doc/dbus-specification.html#message-protocol
 *
 * @param {object} options - Options to construct this `Message` with. See the
 * corresponding member for more information.
 * @param {MessageType} [options.type={@link MessageType.METHOD_CALL}]
 * @param {int} [options.serial]
 * @param {string} [options.destination]
 * @param {string} [options.path]
 * @param {string} [options.interface] - Required for signals.
 * @param {string} [options.member] - Required for method calls and signals.
 * @param {string} [options.signature='']
 * @param {Array} [options.body=[]] -  Must match the signature.
 * @param {string} [options.errorName] - Must be a valid interface name.
 * Required for errors.
 * @param {string} [options.replySerial] - Required for errors and method returns.
 * @param {MessageFlags} [options.flags]
 */
class Message {
  /**
   * Construct a new `Message` to send on the bus.
   */
  constructor(msg) {
    /**
     * @member {MessageType} - The type of message this is.
     */
    this.type = (msg.type ? msg.type : METHOD_CALL);
    this._sent = false;
    this._serial = (isNaN(msg.serial) ? null : msg.serial);
    /**
     * @member {string} - The name of the object path for the message.
     * Required for method calls and signals.
     */
    this.path = msg.path;
    /**
     * @member {string} - The destination interface for this message.
     */
    this.interface = msg.interface;
    /**
     * @member {string} - The destination member on the interface for this message.
     */
    this.member = msg.member;
    /**
     * @member {string} - The name of the error if this is a message of type
     * `ERROR`. Must be a valid interface name.
     */
    this.errorName = msg.errorName;
    /**
     * @member {int} - The serial for the message this is in reply to. Set for
     * types `ERROR` and `METHOD_RETURN`.
     */
    this.replySerial = msg.replySerial;
    /**
     * @member {string} - The address on the bus to send the message
     * to.
     */
    this.destination = msg.destination;
    /**
     * @member {string} - The name of the bus from which this message was sent.
     * Set by the {@link MessageBus}.
     */
    this.sender = msg.sender;
    /**
     * @member {string} - The type signature for the body args.
     */
    this.signature = msg.signature || '';
    /**
     * @member {Array} - The body arguments for this message. Must match the signature.
     */
    this.body = msg.body || [];
    /**
     * @member {MessageFlags} - The flags for this message.
     */
    this.flags = msg.flags || 0;

    if (this.destination) {
      assertBusNameValid(this.destination);
    }

    if (this.interface) {
      assertInterfaceNameValid(this.interface);
    }

    if (this.path) {
      assertObjectPathValid(this.path);
    }

    if (this.member) {
      assertMemberNameValid(this.member);
    }

    if (this.errorName) {
      assertInterfaceNameValid(this.errorName);
    }

    let requireFields = (...fields) => {
      for (let field of fields) {
        if (this[field] === undefined) {
          throw new Error(`Message is missing a required field: ${field}`);
        }
      }
    }

    // validate required fields
    switch (this.type) {
      case METHOD_CALL:
        requireFields('path', 'member');
        break;
      case SIGNAL:
        requireFields('path', 'member', 'interface');
        break;
      case ERROR:
        requireFields('errorName', 'replySerial');
        break;
      case METHOD_RETURN:
        requireFields('replySerial');
        break;
      default:
        throw new Error(`Got unknown message type: ${this.type}`);
        break;
    }
  }
   /**
    * @member {int} - The serial of the message to track through the bus.  You
    * must use {@link MessageBus#newSerial} to get this serial. If not set, it
    * will be set automatically when the message is sent.
    */
  get serial() {
    return this._serial;
  }

  set serial(value) {
    this._sent = false;
    this._serial = value;
  }

  /**
   * Construct a new `Message` of type `ERROR` in reply to the given `Message`.
   *
   * @param {Message} msg - The `Message` this error is in reply to.
   * @param {string} errorName - The name of the error. Must be a valid
   * interface name.
   * @param {string} [errorText='An error occurred.'] - An error message for
   * the error.
   */
  static newError(msg, errorName, errorText='An error occurred.') {
    assertInterfaceNameValid(errorName);
    return new Message({
      type: ERROR,
      replySerial: msg.serial,
      destination: msg.sender,
      errorName: errorName,
      signature: 's',
      body: [errorText]
    });
  }

  /**
   * Construct a new `Message` of type `METHOD_RETURN` in reply to the given
   * message.
   *
   * @param {Message} msg - The `Message` this `Message` is in reply to.
   * @param {string} signature - The signature for the message body.
   * @param {Array} body - The body of the message as an array of arguments.
   * Must match the signature.
   */
  static newMethodReturn(msg, signature='', body=[]) {
    return new Message({
      type: METHOD_RETURN,
      replySerial: msg.serial,
      destination: msg.sender,
      signature: signature,
      body: body
    });
  }

  /**
   * Construct a new `Message` of type `SIGNAL` to broadcast on the bus.
   *
   * @param {string} path - The object path of this signal.
   * @param {string} iface - The interface of this signal.
   * @param {string} signature - The signature of the message body.
   * @param {Array] body - The body of the message as an array of arguments.
   * Must match the signature.
   */
  static newSignal(path, iface, name, signature='', body=[]) {
    return new Message({
      type: SIGNAL,
      interface: iface,
      path: path,
      member: name,
      signature: signature,
      body: body
    });
  }
}

module.exports = {
  Message: Message
};
