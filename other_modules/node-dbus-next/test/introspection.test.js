let dbus = require('../');

let {
  Interface, property, method, signal,
  ACCESS_READ, ACCESS_WRITE, ACCESS_READWRITE
} = dbus.interface;

const TEST_IFACE = 'org.test.iface';

class IntrospectionTestInterface extends Interface {
  @method({disabled: true})
  DisabledMethod() {
  }

  @method({})
  NopMethod() {
  }

  @method({name: 'RenamedMethod', inSignature: 'd', outSignature: 'd'})
  myRenamedMethod(what) {
    return 53;
  }

  @method({inSignature: 'sd', outSignature: 'sd'})
  SomeMethod(str, d) {
    return [ str, d ];
  }

  @method({name: 'Overloaded', inSignature: 's', outSignature: 's'})
  overloaded1(str) {
    return str;
  }

  @method({name: 'Overloaded', inSignature: 'd', outSignature: 'd'})
  overloaded2(what) {
    return what;
  }

  @signal({name: 'RenamedSignal', signature: 's'})
  signalNamedDifferently(what) {
    return what
  }

  @signal({disabled: true, signature: 'd'})
  DisabledSignal(what) {
    return what
  }

  @signal({signature: 'os'})
  SomeSignal() {
    return '/foo/bar';
  }

  @property({signature: 'd', access: ACCESS_READ})
  SomeProperty = 'foo';

  @property({name: 'RenamedProperty', signature: 's'})
  propertyNamedDifferently = 'RenamedProperty';

  @property({disabled: true, signature: 's'})
  DisabledProperty = 'DisabledProperty';
}

let testIface = new IntrospectionTestInterface(TEST_IFACE);

test('property xml introspection', () => {
  let getProperty = (name) => {
    let properties = testIface.$introspect().property;
    return properties.find((p) => {
      return p['$'].name === name;
    });
  };

  let property = getProperty('SomeProperty');
  expect(property).toBeDefined();
  expect(property['$']).toBeDefined();
  expect(property['$'].type).toEqual('d');
  expect(property['$'].access).toEqual('read');

  expect(getProperty('propertyNamedDifferently')).not.toBeDefined();
  expect(getProperty('DisabledProperty')).not.toBeDefined();

  property = getProperty('RenamedProperty');
  expect(property).toBeDefined();
  expect(property['$']).toBeDefined();
  expect(property['$'].type).toEqual('s');
  expect(property['$'].access).toEqual('readwrite');
});

test('method xml introspection', () => {
  let getMethod = (name) => {
    let methods = testIface.$introspect().method;
    return methods.filter((m) => {
      return m['$'].name === name;
    });
  };

  let method = getMethod('SomeMethod')[0];
  expect(method).toBeDefined();
  expect(method.arg).toBeInstanceOf(Array);
  expect(method.arg.length).toEqual(4);
  expect(method.arg[0]).toEqual({'$': { direction: 'in', type: 's' }});
  expect(method.arg[1]).toEqual({'$': { direction: 'in', type: 'd' }});
  expect(method.arg[2]).toEqual({'$': { direction: 'out', type: 's' }});
  expect(method.arg[3]).toEqual({'$': { direction: 'out', type: 'd' }});

  method = getMethod('RenamedMethod')[0];
  expect(method).toBeDefined();

  method = getMethod('DisabledMethod')[0];
  expect(method).not.toBeDefined();

  let overloaded = getMethod('Overloaded');
  expect(overloaded.length).toEqual(2);
});

test('signal xml introspection', () => {
  let getSignal = (name) => {
    let signals = testIface.$introspect().signal;
    return signals.filter((m) => {
      return m['$'].name === name;
    });
  };

  let signal = getSignal('SomeSignal')[0];
  expect(signal).toBeDefined();
  expect(signal.arg).toBeInstanceOf(Array);
  expect(signal.arg.length).toEqual(2);
  expect(signal.arg[0]).toEqual({'$':{ type: 'o'}})
  expect(signal.arg[1]).toEqual({'$':{ type: 's'}})

  signal = getSignal('DisabledSignal')[0];
  expect(signal).not.toBeDefined();

  signal = getSignal('signalNamedDifferently')[0];
  expect(signal).not.toBeDefined();

  signal = getSignal('RenamedSignal');
  expect(signal).toBeDefined();
});
