// Test a service configured with Interface.configureMembers()

let dbus = require('../../');
const Variant = dbus.Variant;

const TEST_NAME = 'org.test.configured_service';
const TEST_PATH = '/org/test/path';
const TEST_IFACE = 'org.test.iface';

const Interface = dbus.interface.Interface;

let bus = dbus.sessionBus();
bus.on('error', (err) => {
  console.log(`got unexpected connection error:\n${err.stack}`);
});

class ConfiguredTestInterface extends Interface {
  constructor(name) {
    super(name);
    this._someProperty = 'foo';
  }

  get SomeProperty() {
    return this._someProperty;
  }

  set SomeProperty(value) {
    this._someProperty = value;
  }

  Echo(what) {
    return what;
  }

  HelloWorld() {
    return [ 'hello', 'world' ]
  }

  EmitSignals() {
    this.HelloWorld();
  }
}

ConfiguredTestInterface.configureMembers({
  properties: {
    SomeProperty: {
      signature: 's'
    }
  },
  methods: {
    Echo: {
      inSignature: 'v',
      outSignature: 'v'
    },
    EmitSignals: {}
  },
  signals: {
    HelloWorld: {
      signature: 'ss'
    }
  }
});

let testIface = new ConfiguredTestInterface(TEST_IFACE);

beforeAll(async () => {
  await bus.requestName(TEST_NAME);
  bus.export(TEST_PATH, testIface);
});

afterAll(() => {
  bus.disconnect();
});

test('configured interface', async () => {
  let object = await bus.getProxyObject(TEST_NAME, TEST_PATH);
  let test = object.getInterface(TEST_IFACE);
  expect(test).toBeDefined();
  let properties = object.getInterface('org.freedesktop.DBus.Properties');

  let prop = await properties.Get(TEST_IFACE, 'SomeProperty');
  expect(prop).toBeInstanceOf(Variant);
  expect(prop.signature).toEqual('s');
  expect(prop.value).toEqual('foo');
  expect(prop.value).toEqual(testIface.SomeProperty);

  await properties.Set(TEST_IFACE, 'SomeProperty', new Variant('s', 'bar'));
  expect(testIface.SomeProperty).toEqual('bar');

  let result = await test.Echo(new Variant('s', 'foo'));
  expect(result).toBeInstanceOf(Variant);
  expect(result.signature).toEqual('s');
  expect(result.value).toEqual('foo');

  let onHelloWorld = jest.fn();
  test.once('HelloWorld', onHelloWorld);

  await test.EmitSignals();
  expect(onHelloWorld).toHaveBeenCalledWith('hello', 'world');
});
