const EventEmitter = require('events').EventEmitter;
const net = require('net');
const message = require('./message');
const clientHandshake = require('./handshake');
const {getDbusAddressFromFs} = require('./address-x11');
const {Message} = require('./message-type');
const {messageToJsFmt, marshallMessage} = require('./marshall-compat');

function createStream(opts) {
  let { busAddress } = opts;

  // TODO according to the dbus spec, we should start a new server if the bus
  // address cannot be found.
  if (!busAddress) {
    busAddress = process.env.DBUS_SESSION_BUS_ADDRESS;
  }
  if (!busAddress) {
    busAddress = getDbusAddressFromFs();
  }

  let addresses = busAddress.split(';');
  for (let i = 0; i < addresses.length; ++i) {
    let address = addresses[i];
    let familyParams = address.split(':');
    let family = familyParams[0];
    let params = {};
    familyParams[1].split(',').map(function(p) {
      let keyVal = p.split('=');
      params[keyVal[0]] = keyVal[1];
    });

    try {
      switch (family.toLowerCase()) {
        case 'tcp':
          host = params.host || 'localhost';
          port = params.port;
          return net.createConnection(port, host);
        case 'unix':
          if (params.socket) {
            return net.createConnection(params.socket);
          }
          if (params.abstract) {
            let abs = require('abstract-socket');
            return abs.connect('\u0000' + params.abstract);
          }
          if (params.path) {
            return net.createConnection(params.path);
          }
          throw new Error(
            "not enough parameters for 'unix' connection - you need to specify 'socket' or 'abstract' or 'path' parameter"
          );
        case 'unixexec':
          let eventStream = require('event-stream');
          let spawn = require('child_process').spawn;
          let args = [];
          for (let n = 1; params['arg' + n]; n++) args.push(params['arg' + n]);
          let child = spawn(params.path, args);

          return eventStream.duplex(child.stdin, child.stdout);
        default:
          throw new Error('unknown address type:' + family);
      }
    } catch (e) {
      if (i < addresses.length - 1) {
        console.warn(e.message);
        continue;
      } else {
        throw e;
      }
    }
  }
}

function createConnection(opts) {
  let self = new EventEmitter();
  opts = opts || {};
  let stream = (self.stream = createStream(opts));
  stream.setNoDelay();

  stream.on('error', function(err) {
    // forward network and stream errors
    self.emit('error', err);
  });

  stream.on('end', function() {
    self.emit('end');
    self.message = function() {
      self.emit('error', new Error('Tried to write a message to a closed stream'));
    };
  });

  self.end = function() {
    stream.end();
    return self;
  };

  clientHandshake(stream, opts, function(error, guid) {
    if (error) {
      return self.emit('error', error);
    }
    self.guid = guid;
    self.emit('connect');
    message.unmarshalMessages(
      stream,
      function(message) {
        try {
          message = new Message(messageToJsFmt(message));
        } catch(err) {
          self.emit('error', err, `There was an error receiving a message (this is probably a bug in dbus-next): ${message}`);
          return;
        }
        self.emit('message', message);
      },
      opts
    );
  });

  self._messages = [];

  // pre-connect version, buffers all messages. replaced after connect
  self.message = function(msg) {
    self._messages.push(msg);
  };

  self.once('connect', function() {
    self.state = 'connected';
    for (let i = 0; i < self._messages.length; ++i) {
      stream.write(marshallMessage(self._messages[i]));
    }
    self._messages.length = 0;

    // no need to buffer once connected
    self.message = function(msg) {
      stream.write(marshallMessage(msg));
    };
  });

  return self;
}

module.exports = createConnection;
