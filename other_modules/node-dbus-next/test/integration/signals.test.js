// Test that signals emit correctly

let dbus = require('../../');
let Variant = dbus.Variant;
let DBusError = dbus.DBusError;

let {
  Interface, property, method, signal,
  ACCESS_READ, ACCESS_WRITE, ACCESS_READWRITE
} = dbus.interface;

const TEST_NAME = 'org.test.signals';
const TEST_NAME2 = 'org.test.signals_name2';
const TEST_PATH = '/org/test/path';
const TEST_IFACE = 'org.test.iface';

let bus = dbus.sessionBus();
bus.on('error', (err) => {
  console.log(`got unexpected connection error:\n${err.stack}`);
});
let bus2 = dbus.sessionBus();
bus2.on('error', (err) => {
  console.log(`got unexpected connection error:\n${err.stack}`);
});

class SignalsInterface extends Interface {
  @signal({signature: 's'})
  HelloWorld(value) {
    return value;
  }

  @signal({signature: 'ss'})
  SignalMultiple() {
    return [
      'hello',
      'world'
    ];
  }

  // a really complicated variant
  complicated = new Variant('a{sv}', {
    foo: new Variant('s', 'bar'),
    bar: new Variant('d', 53),
    bat: new Variant('v', new Variant('as', [ 'foo', 'bar', 'bat'])),
    baz: new Variant('(doodoo)', [ 1, '/', '/', 1, '/', '/' ]),
    fiz: new Variant('(as(s(v)))', [
      [ 'one', 'two' ],
      ['three', [
        new Variant('as', [ 'four', 'five' ]) ]
      ]
    ]),
    buz: new Variant('av', [
      new Variant('as', ['foo']),
      new Variant('a{ss}', { foo: 'bar' }),
      new Variant('v', new Variant('(asas)', [['bar'], ['foo']])),
      new Variant('v', new Variant('v', new Variant('as', [ 'one', 'two' ]))),
      new Variant('a{ss}', { foo: 'bar' })
    ])
  });

  @signal({signature: 'v'})
  SignalComplicated() {
    return this.complicated;
  }

  @method({inSignature: '', outSignature: ''})
  EmitSignals() {
    this.HelloWorld('hello');
    this.SignalMultiple();
    this.SignalComplicated();
  }
}

let testIface = new SignalsInterface(TEST_IFACE);
let testIface2 = new SignalsInterface(TEST_IFACE);

beforeAll(async () => {
  await Promise.all([
    bus.requestName(TEST_NAME),
    bus2.requestName(TEST_NAME2)
  ]);
  bus.export(TEST_PATH, testIface);
  bus2.export(TEST_PATH, testIface2);
});

afterAll(() => {
  bus.disconnect();
  bus2.disconnect();
});

test('test that signals work correctly', async () => {
  let object = await bus.getProxyObject(TEST_NAME, TEST_PATH);
  let test = object.getInterface(TEST_IFACE);

  let onHelloWorld = jest.fn();
  let onSignalMultiple = jest.fn();
  let onSignalMultiple2 = jest.fn();
  let onSignalComplicated = jest.fn();

  test.once('HelloWorld', onHelloWorld);
  test.on('SignalMultiple', onSignalMultiple);
  test.on('SignalMultiple', onSignalMultiple2);
  test.on('SignalComplicated', onSignalComplicated);

  await test.EmitSignals();

  expect(onHelloWorld).toHaveBeenCalledWith('hello');
  expect(onSignalMultiple).toHaveBeenCalledWith('hello', 'world');
  expect(onSignalMultiple2).toHaveBeenCalledWith('hello', 'world');
  expect(onSignalComplicated).toHaveBeenCalledWith(testIface.complicated);

  // removing the event listener on the interface should remove the event
  // listener on the bus as well
  expect(bus._signals.eventNames().length).toEqual(2);
  test.removeListener('SignalMultiple', onSignalMultiple);
  expect(bus._signals.eventNames().length).toEqual(2);

  // removing the listener on a signal should not remove them all
  onSignalMultiple2.mockClear()
  await test.EmitSignals();
  expect(onSignalMultiple2).toHaveBeenCalledWith('hello', 'world');

  test.removeListener('SignalMultiple', onSignalMultiple2);
  expect(bus._signals.eventNames().length).toEqual(1);
  test.removeListener('SignalComplicated', onSignalComplicated);
  expect(bus._signals.eventNames().length).toEqual(0);
});

test('signals dont get mixed up between names that define objects on the same path and interface', async () => {
  // Note that there is a really bad case where a single connection takes two
  // names and exports the same interfaces and paths on them. Then there is no
  // way to tell the signals apart from the names because the messages look
  // identical to us. All we get is the unique name of the sender and not the
  // well known name, and the well known name is what will be different. For
  // this reason, I am going to recommend that people only use one name per bus
  // connection until we can figure that out.
  let object = await bus.getProxyObject(TEST_NAME, TEST_PATH);
  let object2 = await bus.getProxyObject(TEST_NAME2, TEST_PATH);

  let test = object.getInterface(TEST_IFACE);
  let test2 = object2.getInterface(TEST_IFACE);

  let cb = jest.fn();
  let cb2 = jest.fn();

  test.on('HelloWorld', cb);
  test.on('SignalMultiple', cb);
  test.on('SignalComplicated', cb);

  test2.on('HelloWorld', cb2);
  test2.on('SignalMultiple', cb2);
  test2.on('SignalComplicated', cb2);

  await test.EmitSignals();

  expect(cb).toHaveBeenCalledTimes(3);
  expect(cb2).toHaveBeenCalledTimes(0);
});
