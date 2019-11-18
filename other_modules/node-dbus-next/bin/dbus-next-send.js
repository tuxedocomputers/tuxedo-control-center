#!/usr/bin/env node

// TODO: test signal sending

const program = require('commander');
const dbus = require('../');
const Message = dbus.Message;
const {
  METHOD_RETURN,
  ERROR,
  SIGNAL,
  METHOD_CALL
} = dbus.MessageType;
const {
  isObjectPathValid,
  isMemberNameValid,
  isInterfaceNameValid,
  isBusNameValid
} = dbus.validators;

// XXX: just use yargs instead
const usage = `Usage: dbus-next-send.js [--help] [--system | --session] [--dest=NAME] [--type=TYPE] <objectPath> <interface.member> <body>`

function exitError(message) {
  console.error(usage);
  console.error(message);
  process.exit(1);
}

program
  .version('0.0.1')
  .description('Send a message to a message bus')
  .option('--system', 'Use the system bus')
  .option('--session', 'Use the session bus')
  .option('--dest <name>', 'The destination for the message')
  .option('--type <type>', 'The type of message to send (METHOD_CALL, SIGNAL)')
  .option('--signature <signature>', 'The signature of the message body')
  .arguments('<objectPath> <interface.member> <body>')
  .parse(process.argv);

if (program.system && program.session) {
  exitError('Only one of --system or --session may be passed');
}

if (!program.args[0]) {
  exitError('<objectPath> positional argument is required');
}

if (!program.args[1]) {
  exitError('<interface.member> positional argument is required');
}

const objectPath = program.args[0];
let ifaceMember = program.args[1].split('.');
const member = ifaceMember.splice(-1).join('');
const iface = ifaceMember.join('.');
const bodyStr = program.args[2] || '';

if (!isObjectPathValid(objectPath)) {
  exitError(`got invalid object path: ${objectPath}`);
}

if (!isInterfaceNameValid(iface)) {
  exitError(`got invalid interface: ${iface}`);
}

if (!isMemberNameValid(member)) {
  exitError(`got invalid member: ${member}`);
}

const types = {
  'METHOD_RETURN': METHOD_RETURN,
  'ERROR': ERROR,
  'SIGNAL': SIGNAL,
  'METHOD_CALL': METHOD_CALL
};

let type = types[program.type];

if (program.type && !type) {
  exitError(`got invalid message type: ${program.type}`);
}

type = type || METHOD_CALL;

if (type === ERROR || type === METHOD_RETURN) {
  exitError('only METHOD_CALL and SIGNAL types are currently supported');
}

if (!program.dest) {
  exitError('--dest is a required argument');
}

if (!isBusNameValid(program.dest) && !program.dest.match(/^:\d+/)) {
  exitError(`got invalid destination: ${program.dest}`);
}

let destination = program.dest;

if (bodyStr && !program.signature) {
  exitError('--signature is a required argument when passing a message body');
}

let signature = program.signature || '';
let body = [];
if (bodyStr) {
  try {
    body = JSON.parse(bodyStr);
  } catch (err) {
    exitError(`could not parse body as json: ${bodyStr}`);
  }
}

if (!Array.isArray(body)) {
  exitError('body must be an array of arguments');
}

let bus = (program.system ? dbus.systemBus() : dbus.sessionBus());

let message = new Message({
  type: type,
  destination: destination,
  path: objectPath,
  interface: iface,
  member: member,
  signature: signature,
  body: body
});

if (type === METHOD_CALL) {
  bus.call(message)
    .then((reply) => {
      console.log(JSON.stringify(reply, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error(`Error: ${err}`);
      process.exit(1);
    });
} else {
  bus.send(message);
  process.exit(0);
}
