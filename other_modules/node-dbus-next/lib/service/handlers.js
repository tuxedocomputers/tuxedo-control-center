const fs = require('fs');
const variant = require('../variant');
const Variant = variant.Variant;
const {collapseSignature} = require('../signature');
const {Message} = require('../message-type');

const {
  isObjectPathValid,
  isInterfaceNameValid,
  isMemberNameValid
} = require('../validators');

const {
  ACCESS_READ,
  ACCESS_WRITE,
  ACCESS_READWRITE
} = require('./interface');

const constants = require('../constants');

const {
  METHOD_RETURN
} = constants.MessageType;

const { DBusError } = require('../errors');

const INVALID_ARGS = 'org.freedesktop.DBus.Error.InvalidArgs';

function sendServiceError(bus, msg, errorMessage) {
  bus.send(Message.newError(msg, 'com.github.dbus_next.ServiceError', `Service error: ${errorMessage}`));
  return true;
}

function handleIntrospect(bus, msg, path) {
  bus.send(Message.newMethodReturn(msg, 's', [bus._introspect(path)]));
}

function handleGetProperty(bus, msg, path) {
  let [ifaceName, prop] = msg.body;

  if (!bus._serviceObjects[path]) {
    bus.send(Message.newError(msg, INVALID_ARGS, `Path not exported on bus: '${path}'`));
    return;
  }

  let obj = bus._getServiceObject(path);
  let iface = obj.interfaces[ifaceName];
  // TODO An empty string may be provided for the interface name; in this case,
  // if there are multiple properties on an object with the same name, the
  // results are undefined (picking one by according to an arbitrary
  // deterministic rule, or returning an error, are the reasonable
  // possibilities).
  if (!iface) {
    bus.send(Message.newError(msg, INVALID_ARGS, `No such interface: '${ifaceName}'`));
    return;
  }

  let properties = iface.$properties || {};

  let options = null;
  let propertyKey = null;
  for (const k of Object.keys(properties)) {
    if (properties[k].name === prop && !properties[k].disabled) {
      options = properties[k];
      propertyKey = k;
      break;
    }
  }
  if (options === null) {
    bus.send(Message.newError(msg, INVALID_ARGS, `No such property: '${prop}'`));
    return;
  }

  let propertyValue = null

  try {
    propertyValue = iface[propertyKey];
  } catch (e) {
    if (e.name === 'DBusError') {
      bus.send(Message.newError(msg, e.type, e.text));
    } else {
      sendServiceError(bus, msg, `The service threw an error.\n${e.stack}`);
    }
    return true;
  }

  if (propertyValue instanceof DBusError) {
    bus.send(Message.newError(msg, propertyValue.type, propertyValue.text));
    return true;
  } else if (propertyValue === undefined) {
    return sendServiceError(bus, msg, 'tried to get a property that is not set: ' + prop);
  }

  if (!(options.access === ACCESS_READWRITE ||
      options.access === ACCESS_READ)) {
    bus.send(Message.newError(msg, INVALID_ARGS, `Property does not have read access: '${prop}'`));
  }

  let body = new Variant(options.signature, propertyValue);

  bus.send(Message.newMethodReturn(msg, 'v', [body]));
}

function handleGetAllProperties(bus, msg, path) {
  let ifaceName = msg.body[0];

  if (!bus._serviceObjects[path]) {
    bus.send(Message.newError(msg, INVALID_ARGS, `Path not exported on bus: '${path}'`));
    return;
  }

  let obj = bus._getServiceObject(path);
  let iface = obj.interfaces[ifaceName];

  let result = {};
  if (iface) {
    let properties = iface.$properties || {};
    for (let k of Object.keys(properties)) {
      let p = properties[k];
      if (!(p.access === ACCESS_READ || p.access === ACCESS_READWRITE) || p.disabled) {
        continue;
      }

      let value = undefined;
      try {
        value = iface[k];
      } catch (e) {
        if (e.name === 'DBusError') {
          bus.send(Message.newError(msg, e.type, e.text));
        } else {
          sendServiceError(bus, msg, `The service threw an error.\n${e.stack}`);
        }
        return true;
      }
      if (value instanceof DBusError) {
        bus.send(Message.newError(msg, value.type, value.text));
        return true;
      } else if (value === undefined) {
        return sendServiceError(bus, msg, 'tried to get a property that is not set: ' + p);
      }

      result[p.name] = new Variant(p.signature, value);
    }
  }

  bus.send(Message.newMethodReturn(msg, 'a{sv}', [result]));
}

function handleSetProperty(bus, msg, path) {
  let [ifaceName, prop, value] = msg.body;

  if (!bus._serviceObjects[path]) {
    bus.send(Message.newError(msg, INVALID_ARGS, `Path not exported on bus: '${path}'`));
    return;
  }

  let obj = bus._getServiceObject(path);
  let iface = obj.interfaces[ifaceName];

  if (!iface) {
    bus.send(Message.newError(msg, INVALID_ARGS, `Interface not found: '${ifaceName}'`));
    return;
  }

  let properties = iface.$properties || {};
  let options = null;
  let propertyKey = null;
  for (const k of Object.keys(properties)) {
    if (properties[k].name === prop && !properties[k].disabled) {
      options = properties[k];
      propertyKey = k;
      break;
    }
  }

  if (options === null) {
    bus.send(Message.newError(msg, INVALID_ARGS, `No such property: '${prop}'`));
    return;
  }

  if (!(options.access === ACCESS_WRITE || options.access === ACCESS_READWRITE)) {
    bus.send(Message.newError(msg, INVALID_ARGS, `Property does not have write access: '${prop}'`));
  }

  if (value.signature !== options.signature) {
    bus.send(Message.newError(msg, INVALID_ARGS, `Cannot set property '${prop}' with signature '${valueSignature}' (expected '${options.signature}')`));
    return;
  }

  try {
    iface[propertyKey] = value.value;
  } catch (e) {
    if (e.name === 'DBusError') {
      bus.send(Message.newError(msg, e.type, e.text));
    } else {
      sendServiceError(bus, msg, `The service threw an error.\n${e.stack}`);
    }
    return true;
  }

  bus.send(Message.newMethodReturn(msg, '', []));
}

function handleStdIfaces(bus, msg) {
  let {
    member,
    path,
    signature
  } = msg;

  let ifaceName = msg.interface;

  if (!isInterfaceNameValid(ifaceName)) {
    bus.send(Message.newError(msg, INVALID_ARGS, `Invalid interface name: '${ifaceName}'`));
    return true;
  }

  if (!isMemberNameValid(member)) {
    bus.send(Message.newError(msg, INVALID_ARGS, `Invalid member name: '${member}'`));
    return true;
  }

  if (!isObjectPathValid(path)) {
    bus.send(Message.newError(msg, INVALID_ARGS, `Invalid path name: '${path}'`));
    return true;
  }

  if (ifaceName === 'org.freedesktop.DBus.Introspectable' &&
        member === 'Introspect' &&
        !signature) {
    handleIntrospect(bus, msg, path);
    return true;
  } else if (ifaceName === 'org.freedesktop.DBus.Properties') {
    if (member === 'Get' && signature === 'ss') {
      handleGetProperty(bus, msg, path);
      return true;
    } else if (member === 'Set' && signature === 'ssv') {
      handleSetProperty(bus, msg, path);
      return true;
    } else if (member === 'GetAll') {
      handleGetAllProperties(bus, msg, path);
      return true;
    }
  } else if (ifaceName === 'org.freedesktop.DBus.Peer') {
    if (member === 'Ping' && !signature) {
      bus._connection.message({
        type: METHOD_RETURN,
        serial: bus._serial++,
        replySerial: msg.serial,
        destination: msg.sender
      });
      return true;
    } else if (member === 'GetMachineId' && !signature) {
      let machineId = fs.readFileSync('/var/lib/dbus/machine-id').toString().trim();
      bus._connection.message({
        type: METHOD_RETURN,
        serial: bus._serial++,
        replySerial: msg.serial,
        destination: msg.sender,
        signature: 's',
        body: [machineId]
      });
      return true;
    }
  }

  return false;
}

function handleMessage(msg, bus) {
  let {
    path,
    member,
    destination,
    signature
  } = msg;

  let ifaceName = msg.interface;

  signature = signature || '';

  if (handleStdIfaces(bus, msg)) {
    return true;
  }

  if (!bus._serviceObjects[path]) {
    return false;
  }

  let obj = bus._getServiceObject(path);
  let iface = obj.interfaces[ifaceName];

  if (!iface) {
    return false;
  }

  let methods = iface.$methods || {};
  for (let m of Object.keys(methods)) {
    let method = methods[m];
    let result = null;

    const handleError = (e) => {
        if (e.name === 'DBusError') {
          bus.send(Message.newError(msg, e.type, e.text));
        } else {
          sendServiceError(bus, msg, `The service threw an error.\n${e.stack}`);
        }
    }

    if (method.name === member && method.inSignature === signature) {
      try {
        result = method.fn.apply(iface, msg.body);
      } catch (e) {
        handleError(e);
        return true;
      }

      const sendReply = (body) => {
        if (body === undefined) {
          body = [];
        } else if (method.outSignatureTree.length === 1) {
          body = [body];
        } else if (method.outSignatureTree.length === 0) {
          return sendServiceError(bus, msg, `method ${iface.$name}.${method.name} was not expected to return a body.`);
        } else if (!Array.isArray(body)) {
          return sendServiceError(bus, msg, `method ${iface.$name}.${method.name} expected to return multiple arguments in an array (signature: '${method.outSignature}')`);
        }

        if (method.outSignatureTree.length !== body.length) {
          return sendServiceError(bus, msg, `method ${iface.$name}.${m} returned the wrong number of arguments (got ${body.length} expected ${method.outSignatureTree.length}) for signature '${method.outSignature}'`);
        }

        bus.send(Message.newMethodReturn(msg, method.outSignature, body));
      };

      if (result && result.constructor === Promise) {
        result.then(sendReply).catch(handleError);
      } else {
        sendReply(result);
      }

      return true;
    }
  }

  return false;
};

module.exports = handleMessage;
