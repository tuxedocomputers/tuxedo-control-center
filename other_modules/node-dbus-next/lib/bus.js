const EventEmitter = require('events').EventEmitter;
const constants = require('./constants');
const handleMethod = require('./service/handlers');
const {DBusError} = require('./errors');
const {Message} = require('./message-type');
const ServiceObject = require('./service/object');
const xml2js = require('xml2js');

const {
  METHOD_CALL,
  METHOD_RETURN,
  ERROR,
  SIGNAL,
} = constants.MessageType;

const {
  NO_REPLY_EXPECTED
} = constants.MessageFlag;

const {
  assertBusNameValid,
  assertObjectPathValid,
  assertInterfaceNameValid,
} = require('./validators');

const ProxyObject = require('./client/proxy-object');
const { Interface } = require('./service/interface');

const xmlHeader = `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">\n`

/**
 * @class
 * The `MessageBus` is a class for interacting with a DBus message bus capable
 * of requesting a service [`Name`]{@link module:interface~Name} to export an
 * [`Interface`]{@link module:interface~Interface}, or getting a proxy object
 * to interact with an existing name on the bus as a client. A `MessageBus` is
 * created with `dbus.sessionBus()` or `dbus.systemBus()` methods of the
 * dbus-next module.
 *
 * The `MessageBus` is an `EventEmitter` which emits the following events:
 * * `error` - The underlying connection to the bus has errored.  After
 * receiving an `error` event, the `MessageBus` may be disconnected.
 * * `connected` - The bus is connected and ready to send and receive messages.
 * Before this event, messages are buffered.
 * * `message` - The bus has received a message. Called with the {@link
 * Message} that was received. This is part of the low-level api.
 *
 * @example
 * const dbus = require('dbus-next');
 * const bus = dbus.sessionBus();
 * // get a proxy object
 * let obj = await bus.getProxyObject('org.freedesktop.DBus', '/org/freedesktop/DBus');
 * // request a well-known name
 * await bus.requestName('org.test.name');
 */
class MessageBus extends EventEmitter {
  /**
   * Create a new `MessageBus`. This constructor is not to be called directly.
   * Use `dbus.sessionBus()` or `dbus.systemBus()` to set up the connection to
    * the bus.
   */
  constructor(conn) {
    super();
    this._builder = new xml2js.Builder({ headless: true });
    this._connection = conn;
    this._serial = 1;
    this._methodReturnHandlers = {};
    this._signals = new EventEmitter();
    this._nameOwners = {};
    this._methodHandlers = [];
    this._serviceObjects = {}
    /**
     * The unique name of the bus connection. This will be `null` until the
     * `MessageBus` is connected.
     * @memberof MessageBus#
     * @member {string} name
     */
    this.name = null;

    let handleMessage = (msg) => {
      if (msg.type === METHOD_RETURN ||
        msg.type === ERROR) {
        let handler = this._methodReturnHandlers[msg.replySerial];
        if (handler) {
          delete this._methodReturnHandlers[msg.replySerial];
          handler(msg);
        }
      } else if (msg.type === SIGNAL) {
        // if this is a name owner changed message, cache the new name owner
        let {sender, path, iface, member} = msg;
        if (sender === 'org.freedesktop.DBus' &&
          path === '/org/freedesktop/DBus' &&
          iface === 'org.freedesktop.DBus' &&
          member === 'NameOwnerChanged') {
          let [name, oldOwner, newOwner] = msg.body;
          if (!name.startsWith(':')) {
            this._nameOwners[name] = newOwner;
          }
        }

        let mangled = JSON.stringify({
          path: msg.path,
          'interface': msg['interface'],
          member: msg.member
        });
        this._signals.emit(mangled, msg);
      } else {
        // methodCall (needs to be handled)
        let handled = false;

        for (let handler of this._methodHandlers) {
          // run installed method handlers first
          handled = handler(msg);
          if (handled) {
            break;
          }
        }

        if (!handled) {
          handled = handleMethod(msg, this);
        }

        if (!handled) {
          this.send(Message.newError(msg,
            'org.freedesktop.DBus.Error.UnknownMethod',
            `Method '${msg.member}' on interface '${msg.interface || '(none)'}' does not exist`));
        }
      }
    };

    conn.on('message', (msg) => {
      try {
        // TODO: document this signal
        this.emit('message', msg);
        handleMessage(msg);
      } catch (e) {
        this.send(Message.newError(msg, 'com.github.dbus_next.Error', `The DBus library encountered an error.\n${e.stack}`));
      }
    });

    conn.on('error', (err) => {
      // forward network and stream errors
      this.emit('error', err);
    });

    let helloMessage = new Message({
      path: '/org/freedesktop/DBus',
      destination: 'org.freedesktop.DBus',
      interface: 'org.freedesktop.DBus',
      member: 'Hello'
    });

    this.call(helloMessage)
      .then((msg) => {
        this.name = msg.body[0];
        this.emit('connect');
      })
      .catch((err) => {
        this.emit('error', err);
        throw new Error(err);
      });
  }

  /**
   * Get a {@link ProxyObject} on the bus for the given name and path for interacting
   * with a service as a client. The proxy object contains a list of the
   * [`ProxyInterface`s]{@link ProxyInterface} exported at the name and object path as well as a list
   * of `node`s.
   *
   * @param name {string} - the well-known name on the bus.
   * @param path {string} - the object path exported on the name.
   * @param [xml] {string} - xml introspection data.
   * @returns {Promise} - a Promise that resolves with the `ProxyObject`.
   */
  getProxyObject(name, path, xml) {
    let obj = new ProxyObject(this, name, path);
    return obj._init(xml);
  };

  /**
   * Request a well-known name on the bus.
   *
   * @see {@link https://dbus.freedesktop.org/doc/dbus-specification.html#bus-messages-request-name}
   *
   * @param name {string} - the well-known name on the bus to request.
   * @param flags {NameFlag} - DBus name flags which affect the behavior of taking the name.
   * @returns {Promise} - a Promise that resolves with the {@link RequestNameReply}.
   */
  requestName(name, flags) {
    flags = flags || 0;
    return new Promise((resolve, reject) => {
      assertBusNameValid(name);
      let requestNameMessage = new Message({
        path: '/org/freedesktop/DBus',
        destination: 'org.freedesktop.DBus',
        interface: 'org.freedesktop.DBus',
        member: 'RequestName',
        signature: 'su',
        body: [name, flags]
      });
      this.call(requestNameMessage)
        .then((msg) => {
          return resolve(msg.body[0]);
        })
        .catch((err) => {
          return reject(err);
        });
    });
  }

  /**
   * Release this name. Requests that the name should no longer be owned by the
   * {@link MessageBus}.
   *
   * @returns {Promise} A Promise that will resolve with the {@link ReleaseNameReply}.
   */
  releaseName(name) {
    return new Promise((resolve, reject) => {
      let msg = new Message({
        path: '/org/freedesktop/DBus',
        destination: 'org.freedesktop.DBus',
        interface: 'org.freedesktop.DBus',
        member: 'ReleaseName',
        signature: 's',
        body: [name]
      });
      this.call(msg)
        .then((reply) => {
          return resolve(reply.body[0]);
        })
        .catch((err) => {
          return reject(err);
        });
    });
  }


  /**
   * Disconnect this `MessageBus` from the bus.
   */
  disconnect() {
    this._connection.stream.end();
  }

  /**
   * Get a new serial for this bus. These can be used to set the {@link
   * Message#serial} member to send the message on this bus.
   *
   * @returns {int} - A new serial for this bus.
   */
  newSerial() {
    return this._serial++;
  }

  /**
   * A function to call when a message of type {@link MessageType.METHOD_RETURN} is received. User handlers are run before
   * default handlers.
   *
   * @callback methodHandler
   * @param {Message} msg - The message to handle.
   * @returns {boolean} Return `true` if the message is handled and no further
   * handlers will run.
   */

  /**
   * Add a user method return handler. Remove the handler with {@link
   * MessageBus#removeMethodHandler}
   *
   * @param {methodHandler} - A function to handle a {@link Message} of type
   * {@link MessageType.METHOD_RETURN}. Takes the `Message` as the first
    * argument. Return `true` if the method is handled and no further handlers
    * will run.
   */
  addMethodHandler(fn) {
    this._methodHandlers.push(fn);
  }

  /**
   * Remove a user method return handler that was previously added with {@link
   * MessageBus#addMethodHandler}.
   *
   * @param {methodHandler} - A function that was previously added as a method handler.
   */
  removeMethodHandler(fn) {
    for (let i = 0; i < this._methodHandlers.length; ++i) {
      if (this._methodHandlers[i] === fn) {
        this._methodHandlers.splice(i, 1);
      }
    }
  }

  /**
   * Send a {@link Message} of type {@link MessageType.METHOD_CALL} to the bus
   * and wait for the reply.
   *
   * @example
   * let message = new Message({
   *   destination: 'org.freedesktop.DBus',
   *   path: '/org/freedesktop/DBus',
   *   interface: 'org.freedesktop.DBus',
   *   member: 'ListNames'
   * });
   * let reply = await bus.call(message);
   *
   * @param {Message} msg - The message to send.
   * @returns {Promise} reply - A `Promise` that resolves to the {@link
   * Message} which is a reply to the call.
   */
  call(msg) {
    return new Promise((resolve, reject) => {
      if (!(msg instanceof Message)) {
        throw new Error('The call() method takes a Message class as the first argument.');
      }
      if (msg.type !== METHOD_CALL) {
        throw new Error('Only messages of type METHOD_CALL can expect a call reply.');
      }
      if (msg.serial === null || msg._sent) {
        msg.serial = this.newSerial();
      }
      msg._sent = true;
      if (msg.flags & NO_REPLY_EXPECTED) {
        resolve(null);
      } else {
        this._methodReturnHandlers[msg.serial] = (reply) => {
          this._nameOwners[msg.destination] = reply.sender;
          if (reply.type === ERROR) {
            return reject(new DBusError(reply.errorName, reply.body[0], reply));
          } else {
            return resolve(reply);
          }
        };
      }
      this._connection.message(msg);
    });
  };

  /**
   * Send a {@link Message} on the bus that does not expect a reply.
   *
   * @example
   * let message = Message.newSignal('/org/test/path/,
   *                                 'org.test.interface',
   *                                 'SomeSignal');
   * bus.send(message);
   *
   * @param {Message} msg - The message to send.
   */
  send(msg) {
    if (!(msg instanceof Message)) {
      throw new Error('The send() method takes a Message class as the first argument.');
    }
    if (msg.serial === null || msg._sent) {
      msg.serial = this.newSerial();
    }
    this._connection.message(msg);
  }

  /**
   * Export an [`Interface`]{@link module:interface~Interface} on the bus. See
   * the documentation for that class for how to define service interfaces.
   *
   * @param path {string} - The object path to export this `Interface` on.
   * @param iface {module:interface~Interface} - The service interface to export.
   */
  export(path, iface) {
    let obj = this._getServiceObject(path);
    obj.addInterface(iface);
  }

  /**
   * Unexport an `Interface` on the bus. The interface will no longer be
   * advertised to clients.
   *
   * @param {string} path - The object path on which to unexport.
   * @param {module:interface~Interface} [iface] - The `Interface` to unexport.
   * If not given, this will remove all interfaces on the path.
   */
  unexport(path, iface) {
    iface = iface || null;
    if (iface === null) {
      this._removeServiceObject(path);
    } else {
      let obj = this._getServiceObject(path);
      obj.removeInterface(iface);
      if (!obj.interfaces.length) {
        this._removeServiceObject(path);
      }
    }
  }

  _introspect(path) {
    assertObjectPathValid(path);
    let xml = {
      node: {
        node: []
      }
    };

    if (this._serviceObjects[path]) {
      xml.node.interface = this._serviceObjects[path].introspect();
    }

    let pathSplit = path.split('/').filter(n => n);

    for (let key of Object.keys(this._serviceObjects)) {
      let keySplit = key.split('/').filter(n => n);
      if (keySplit.length <= pathSplit.length) {
        continue;
      }
      if (pathSplit.every((v, i) => v === keySplit[i])) {
        let child = keySplit[pathSplit.length];
        xml.node.node.push({
          $: {
            name: child
          }
        });
      }
    }

    return xmlHeader + this._builder.buildObject(xml);
  }

  _getServiceObject(path) {
    assertObjectPathValid(path);
    if (!this._serviceObjects[path]) {
      this._serviceObjects[path] = new ServiceObject(path, this);
    }
    return this._serviceObjects[path];
  }

  _removeServiceObject(path) {
    assertObjectPathValid(path);
    if (this._serviceObjects[path]) {
      let obj = this._serviceObjects[path];
      for (let i of Object.keys(obj.interfaces)) {
        obj.removeInterface(obj.interfaces[i]);
      }
      delete this._serviceObjects[path];
    }
  }

  _addMatch(match) {
    let msg = new Message({
      path: '/org/freedesktop/DBus',
      destination: 'org.freedesktop.DBus',
      interface: 'org.freedesktop.DBus',
      member: 'AddMatch',
      signature: 's',
      body: [match]
    });
    return this.call(msg);
  }

  _removeMatch(match) {
    let msg = new Message({
      path: '/org/freedesktop/DBus',
      destination: 'org.freedesktop.DBus',
      interface: 'org.freedesktop.DBus',
      member: 'RemoveMatch',
      signature: 's',
      body: [match]
    });
    return this.call(msg);
  }
};

module.exports = MessageBus;
