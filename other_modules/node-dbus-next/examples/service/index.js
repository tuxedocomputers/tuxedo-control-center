let dbus = require('../../../');
let Variant = dbus.Variant;

let {
  Interface, property, method, signal, DBusError,
  ACCESS_READ, ACCESS_WRITE, ACCESS_READWRITE
} = dbus.interface;

let bus = dbus.sessionBus();

class ExampleInterface extends Interface {
  @property({signature: 's', access: ACCESS_READWRITE})
  SimpleProperty = 'foo';

  _MapProperty = {
    'foo': new Variant('s', 'bar'),
    'bat': new Variant('i', 53)
  };

  @property({signature: 'a{sv}'})
  get MapProperty() {
    return this._MapProperty;
  }

  set MapProperty(value) {
    this._MapProperty = value;

    this.PropertiesChanged({
      MapProperty: value
    });
  }

  @method({inSignature: 's', outSignature: 's'})
  Echo(what) {
    return what;
  }

  @method({inSignature: 'ss', outSignature: 'vv'})
  ReturnsMultiple(what, what2) {
    return [
      new Variant('s', what),
      new Variant('s', what2)
    ];
  }

  @method({inSignature: '', outSignature: ''})
  ThrowsError() {
    throw new DBusError('org.test.iface.Error', 'something went wrong');
  }

  @signal({signature: 's'})
  HelloWorld(value) {
    return value;
  }

  @signal({signature: 'ss'})
  SignalMultiple(x) {
    return [
      'hello',
      'world'
    ];
  }
}

class ExampleInterface2 extends Interface {
  @method({inSignature: '', outSignature: 's'})
  SomeMethod() {
    return 'ok'
  }
}

let example = new ExampleInterface('org.test.iface');
let example2 = new ExampleInterface2('org.test.iface2');

setTimeout(() => {
  // emit the HelloWorld signal
  example.HelloWorld('hello');
}, 500);

async function main() {
  await bus.requestName('org.test.name');
  bus.export('/org/test/path', example);
  bus.export('/org/test/path', example2);
}

main().catch((err) => {
  console.log('Error:' + err);
});
