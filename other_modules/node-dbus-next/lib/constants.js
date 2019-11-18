/**
 * @class
 *
 * A flag enum for {@link MessageBus#requestName} to configure the name request
 * options.
 *
 * @see {@link https://dbus.freedesktop.org/doc/dbus-specification.html#bus-messages-request-name}
 */
class NameFlag {}

/**
 * This name allows other clients to replace it as the name owner on a request.
 *
 * @memberof NameFlag
 * @static
 * @constant
 */
NameFlag.ALLOW_REPLACEMENT = 1;

/**
 * This request should replace an existing name if that name allows
 * replacement.
 *
 * @memberof NameFlag
 * @static
 * @constant
 */
NameFlag.REPLACE_EXISTING = 2;

/**
 * This request should not enter the queue of clients requesting this name if
 * it is taken.
 *
 * @memberof NameFlag
 * @static
 * @constant
 */
NameFlag.DO_NOT_QUEUE = 4;

/**
 * @class
 *
 * An enum for the return value of {@link MessageBus#requestName} to indicate
 * the status of the name request.
 *
 * @see {@link https://dbus.freedesktop.org/doc/dbus-specification.html#bus-messages-request-name}
 */
class RequestNameReply {}

/**
 * The application trying to request ownership of a name is already the owner
 * of it.
 *
 * @memberof RequestNameReply
 * @static
 * @constant
 */
RequestNameReply.PRIMARY_OWNER = 1;

/**
 * The name already had an owner, `DBUS_NAME_FLAG_DO_NOT_QUEUE` was not
 * specified, and either the current owner did not specify
 * `DBUS_NAME_FLAG_ALLOW_REPLACEMENT` or the requesting application did not
 * specify `DBUS_NAME_FLAG_REPLACE_EXISTING`.
 *
 * @memberof RequestNameReply
 * @static
 * @constant
 */
RequestNameReply.IN_QUEUE = 2;

/**
 * The name already has an owner, `DBUS_NAME_FLAG_DO_NOT_QUEUE` was specified,
 * and either `DBUS_NAME_FLAG_ALLOW_REPLACEMENT` was not specified by the
 * current owner, or `DBUS_NAME_FLAG_REPLACE_EXISTING` was not specified by the
 * requesting application.
 *
 * @memberof RequestNameReply
 * @static
 * @constant
 */
RequestNameReply.EXISTS = 3;

/**
 * The application trying to request ownership of a name is already the owner
 * of it.
 *
 * @memberof RequestNameReply
 * @static
 * @constant
 */
RequestNameReply.ALREADY_OWNER = 4;

/**
 * @class
 *
 * An enum for the return value of {@link MessageBus#releaseName} to indicate
 * the status of the release name request.
 *
 * @see {@link https://dbus.freedesktop.org/doc/dbus-specification.html#bus-messages-release-name}
 */
class ReleaseNameReply {}

/**
 * The caller has released his claim on the given name. Either the caller was
 * the primary owner of the name, and the name is now unused or taken by
 * somebody waiting in the queue for the name, or the caller was waiting in the
 * queue for the name and has now been removed from the queue.
 *
 * @memberof ReleaseNameReply
 * @static
 * @constant
 */
ReleaseNameReply.RELEASED = 1;

/**
 * The given name does not exist on this bus.
 *
 * @memberof ReleaseNameReply
 * @static
 * @constant
 */
ReleaseNameReply.NON_EXISTENT = 2;

/**
 * The caller was not the primary owner of this name, and was also not waiting
 * in the queue to own this name.
 *
 * @memberof ReleaseNameReply
 * @static
 * @constant
 */
ReleaseNameReply.NOT_OWNER = 3;

/**
 * @class
 *
 * An enum value for the {@link Message} `type` member to indicate the type of message.
 *
 * @see https://dbus.freedesktop.org/doc/dbus-specification.html#message-protocol
 */
class MessageType {}

/**
 * The message is a method call.
 *
 * @memberof MessageType
 * @static
 * @constant
 */
MessageType.METHOD_CALL = 1;

/**
 * The message is a method return to a previous call.
 *
 * @memberof MessageType
 * @static
 * @constant
 */
MessageType.METHOD_RETURN = 2;

/**
 * The message is an error reply.
 *
 * @memberof MessageType
 * @static
 * @constant
 */
MessageType.ERROR = 3;

/**
 * The message is a signal.
 *
 * @memberof MessageType
 * @static
 * @constant
 */
MessageType.SIGNAL = 4;

/**
 * @class
 *
 * An flag enum for the {@link Message} `flags` member to configure behavior
 * for message processing.
 *
 * @see https://dbus.freedesktop.org/doc/dbus-specification.html#message-protocol
 */
class MessageFlag {}

/**
 * No reply is expected from this message.
 *
 * @memberof MessageFlag
 * @static
 * @constant
 */
MessageFlag.NO_REPLY_EXPECTED = 1;

/**
 * This message should not autostart a service.
 *
 * @memberof MessageFlag
 * @static
 * @constant
 */
MessageFlag.NO_AUTO_START = 2;

module.exports = {
  MAX_INT64_STR: '9223372036854775807',
  MIN_INT64_STR: '-9223372036854775807',
  MAX_UINT64_STR: '18446744073709551615',
  MIN_UINT64_STR: '0',

  NameFlag: NameFlag,
  RequestNameReply: RequestNameReply,
  ReleaseNameReply: ReleaseNameReply,
  MessageType: MessageType,
  MessageFlag: MessageFlag,

  headerTypeName: [
    null,
    'path',
    'interface',
    'member',
    'errorName',
    'replySerial',
    'destination',
    'sender',
    'signature'
  ],

  // TODO: merge to single hash? e.g path -> [1, 'o']
  fieldSignature: {
    path: 'o',
    interface: 's',
    member: 's',
    errorName: 's',
    replySerial: 'u',
    destination: 's',
    sender: 's',
    signature: 'g'
  },
  headerTypeId: {
    path: 1,
    interface: 2,
    member: 3,
    errorName: 4,
    replySerial: 5,
    destination: 6,
    sender: 7,
    signature: 8
  },
  protocolVersion: 1,
  endianness: {
    le: 108,
    be: 66
  },
  messageSignature: 'yyyyuua(yv)',
  defaultAuthMethods: ['EXTERNAL', 'DBUS_COOKIE_SHA1', 'ANONYMOUS']
};
