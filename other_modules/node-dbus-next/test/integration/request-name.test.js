let dbus = require('../../');

let {
  Message,
} = dbus;

const {
  PRIMARY_OWNER,
  IN_QUEUE,
  EXISTS,
  ALREADY_OWNER,
} = dbus.RequestNameReply;

const {
  RELEASED,
  NON_EXISTENT,
  NOT_OWNER,
} = dbus.ReleaseNameReply;

const {
  ALLOW_REPLACEMENT,
  REPLACE_EXISTING,
  DO_NOT_QUEUE,
} = dbus.NameFlag;

let bus1 = dbus.sessionBus();
let bus2 = dbus.sessionBus();

bus1.on('error', (err) => {
  console.log(`bus1 got unexpected connection error:\n${err.stack}`);
});
bus2.on('error', (err) => {
  console.log(`bus2 got unexpected connection error:\n${err.stack}`);
});

beforeAll(async () => {
  let connect = [bus1, bus2].map((bus) => {
    return new Promise((resolve) => {
      bus.on('connect', resolve);
    });
  });

  await Promise.all(connect);
});

afterAll(() => {
  bus1.disconnect();
  bus2.disconnect();
});

async function getNameOwner(name) {
  let reply = await bus1.call(new Message({
    destination: 'org.freedesktop.DBus',
    path: '/org/freedesktop/DBus',
    interface: 'org.freedesktop.DBus',
    member: 'GetNameOwner',
    signature: 's',
    body: [name]
  }));

  return reply.body[0];
}

test('name requests', async () => {
  let testName = 'request.name.test';

  reply = await bus1.requestName(testName);
  expect(reply).toEqual(PRIMARY_OWNER);
  reply = await bus1.requestName(testName);
  expect(reply).toEqual(ALREADY_OWNER);

  reply = await bus2.requestName(testName, ALLOW_REPLACEMENT)
  expect(reply).toEqual(IN_QUEUE);

  reply = await bus1.releaseName(testName)
  expect(reply).toEqual(RELEASED);

  reply = await bus1.releaseName('name.doesnt.exist')
  expect(reply).toEqual(NON_EXISTENT);

  reply = await bus1.releaseName(testName)
  expect(reply).toEqual(NOT_OWNER);

  new_owner = await getNameOwner(testName)
  expect(new_owner).toEqual(bus2.name);

  reply = await bus1.requestName(testName, DO_NOT_QUEUE)
  expect(reply).toEqual(EXISTS);

  reply = await bus1.requestName(testName, DO_NOT_QUEUE | REPLACE_EXISTING)
  expect(reply).toEqual(PRIMARY_OWNER);
});
