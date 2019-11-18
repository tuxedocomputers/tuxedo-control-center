# dbus-next

The next great DBus library for NodeJS.

[Documentation](https://acrisci.github.io/doc/node-dbus-next/).

## About

dbus-next is a fully featured high level library for DBus geared primarily towards integration of applications into Linux desktop and mobile environments.

Desktop application developers can use this library for integrating their applications into desktop environments by implementing common DBus standard interfaces or creating custom plugin interfaces.

Desktop users can use this library to create their own scripts and utilities to interact with those interfaces for customization of their desktop environment.

## Node Compatibility

As of now, dbus-next targets the latest features of JavaScript. The earliest version supported is `6.3.0`. However, the library uses `BigInt` by default for the long integer types which was introduced in `10.8.0`. If you need to support versions earlier than this, set BigInt compatibility mode. This will configure the library to use [JSBI](https://github.com/GoogleChromeLabs/jsbi) as a polyfill for long types.

```javascript
const dbus = require('dbus-next');
dbus.setBigIntCompat(true);
```

## The Client Interface

You can get a proxy object for a name on the bus with the `bus.getProxyObject()` function, passing the name and the path. The proxy object contains introspection data about the object including a list of nodes and interfaces. You can get an interface with the `object.getInterface()` function passing the name of the interface.

The interface object has methods you can call that correspond to the methods in the introspection data. Pass normal JavaScript objects to the parameters of the function and they will automatically be converted into the advertised DBus type. However, you must use the `Variant` class to represent DBus variants.

Methods will similarly return JavaScript objects converted from the advertised DBus type, with the `Variant` class used to represent returned variants. If the method returns multiple values, they will be returned within an array.

The interface object is an event emitter that will emit the name of a signal when it is emitted on the bus. Arguments to the callback should correspond to the arguments of the signal.

This is a brief example of using a proxy object with the [MPRIS](https://specifications.freedesktop.org/mpris-spec/latest/Player_Interface.html) media player interface.

```js
let dbus = require('dbus-next');
let bus = dbus.sessionBus();
let Variant = dbus.Variant;

// getting an object introspects it on the bus and creates the interfaces
let obj = await bus.getProxyObject('org.mpris.MediaPlayer2.vlc', '/org/mpris/MediaPlayer2');

// the interfaces are the primary way of interacting with objects on the bus
let player = obj.getInterface('org.mpris.MediaPlayer2.Player');
let properties = obj.getInterface('org.freedesktop.DBus.Properties');

// call methods on the interface
await player.Play()

// get properties with the properties interface (this returns a variant)
let volumeVariant = await properties.Get('org.mpris.MediaPlayer2.Player', 'Volume');
console.log('current volume: ' + volumeVariant.value);

// set properties with the properties interface using a variant
await properties.Set('org.mpris.MediaPlayer2.Player', 'Volume', new Variant('d', volumeVariant.value + 0.05));

// listen to signals
properties.on('PropertiesChanged', (iface, changed, invalidated) => {
  for (let prop of Object.keys(changed)) {
    console.log(`property changed: ${prop}`);
  }
});
```

For a complete example, see the [MPRIS client](https://github.com/dbusjs/node-dbus-next/blob/master/examples/mpris.js) example which can be used to control media players on the command line.

## The Service Interface

You can use the `Interface` class to define your interfaces. This interfaces uses the proposed [decorators syntax](https://github.com/tc39/proposal-decorators) which is not yet part of the ECMAScript standard, but should be included one day. Unfortunately, you'll need a [Babel plugin](https://www.npmjs.com/package/@babel/plugin-proposal-decorators) to make this code work for now.

```js
let dbus = require('dbus-next');
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

    Interface.emitPropertiesChanged(this, {
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
    // the error is returned to the client
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

let example = new ExampleInterface('org.test.iface');

setTimeout(() => {
  // emit the HelloWorld signal by calling the method with the parameters to
  // send to the listeners
  example.HelloWorld('hello');
}, 500);

async function main() {
  // make a request for the name on the bus
  await bus.requestName('org.test.name');
  // export the interface on the path
  bus.export('/org/test/path', example);
}

main().catch((err) => {
  console.log('Error: ' + err);
});
```

Interfaces extend the `Interface` class. Declare service methods, properties, and signals with the decorators provided from the library. You can optionally request a name on the bus with `bus.requestName()` so clients have a well-known name to connect to. Then call `bus.export()` with the path and interface to expose this interface on the bus.

Methods are called when a DBus client calls that method on the server. Properties can be gotten and set with the `org.freedesktop.DBus.Properties` interface and are included in the introspection xml.

To emit a signal, just call the method marked with the `signal` decorator and the signal will be emitted with the returned value.

If you have an interface xml description, which can be gotten from the `org.freedesktop.DBus.Introspect` method on an exported interface, you can generate dbus-next JavaScript classes from the xml file with the `bin/generate-interfaces.js` utility.

## The Low-Level Interface

The low-level interface can be used to interact with messages directly. Create new messages with the `Message` class to be sent on the bus as method calls, signals, method returns, or errors. Method calls can be called with the `call()` method of the `MessageBus` to await a reply and `send()` can be use for messages that don't expect a reply.

```js
let dbus = require('dbus-next');
let Message = dbus.Message;

let bus = dbus.sessionBus();

// send a method call to list the names on the bus
let methodCall = new Message({
  destination: 'org.freedesktop.DBus',
  path: '/org/freedesktop/DBus',
  interface: 'org.freedesktop.DBus',
  member: 'ListNames'
});

let reply = await bus.call(message);
console.log('names on the bus: ', reply.body[0]);

// add a custom handler for a particular method
bus.addMethodHandler((msg) => {
  if (msg.path === '/org/test/path' &&
      msg.interface === 'org.test.interface'
      && msg.member === 'SomeMethod') {
    // handle the method by sending a reply
    let someMethodReply = Message.newMethodReturn(msg, 's', ['hello']);
    bus.send(someMethodReply);
    return true;
  }
});

// listen to any messages that are sent to the bus
bus.on('message', (msg) => {
  console.log('got a message: ', msg);
});
```

For a complete example of how to use the low-level interface to send messages, see the `dbus-next-send.js` script in the `bin` directory.

## The Type System

Values that are sent or received over the message bus always have an associated signature that specifies the types of those values. For the high-level client and service, these signatures are specified in XML data which is advertised in a [standard DBus interface](https://dbus.freedesktop.org/doc/dbus-specification.html#introspection-format). The high-level client dynamically creates classes based on this introspection data with methods and signals with arguments based on the type signature. The high-level service does the inverse by introspecting the class to create the introspection XML data which is advertised on the bus for clients.

Each code in the signature is mapped to a JavaScript type as shown in the table below.

| Name        | Code | JS Type | Notes                                                              |
|-------------|------|---------|--------------------------------------------------------------------|
| BYTE        | y    | number  |                                                                    |
| BOOLEAN     | b    | boolean |                                                                    |
| INT16       | n    | number  |                                                                    |
| UINT16      | q    | number  |                                                                    |
| INT32       | i    | number  |                                                                    |
| UINT32      | u    | number  |                                                                    |
| INT64       | x    | BigInt  | Use `dbus.setBigIntCompat(true)` to use `JSBI`                     |
| UINT64      | t    | BigInt  | Use `dbus.setBigIntCompat(true)` to use `JSBI`                     |
| DOUBLE      | d    | number  |                                                                    |
| STRING      | s    | string  |                                                                    |
| OBJECT_PATH | o    | string  | Must be a valid object path                                        |
| SIGNATURE   | g    | string  | Must be a valid signature                                          |
| ARRAY       | a    | Array   | Must be followed by a complete type which specifies the child type |
| STRUCT      | (    | Array   | Types in the JS Array must match the types between the parens      |
| VARIANT     | v    | Variant | This class is provided by the library.                             |
| DICT_ENTRY  | {    | Object  | Must be included in an array type to be an object.                 |

The types `a`, `(`, `v`, and `{` are container types that hold other values. Examples of container types and JavaScript examples are in the table below.

| Signature | Example                                | Notes                                                                                                                                     |
|-----------|----------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| `(su)`    | `[ 'foo', 5 ]`                         | Each element in the array must match the corresponding type of the struct member.                                                         |
| `as`      | `[ 'foo', 'bar' ]`                     | The child type comes immediately after the `a`. The array can have any number of elements, but they all must match the child type.        |
| `a{su}`   | `{ 'foo': 5 }`                         | An "array of dict entries" is represented by an Object. The type after `{` is the key type and the type before the `}` is the value type. |
| `ay`      | `Buffer.from([0x62, 0x75, 0x66])`      | Special case: an array of bytes is represented by a Node `Buffer`.                                                                        |
| `v`       | `new Variant('s', 'hello')`            | Signature must be a single type. Value may be a container type.                                                                           |
| `(asv)`   | `[ ['foo'], new Variant('s', 'bar') ]` | Containers may be nested.                                                                                                                 |

For more information on the DBus type system, see [the specification](https://dbus.freedesktop.org/doc/dbus-specification.html#type-system).

## Contributing

Contributions are welcome. Development happens on [Github](https://github.com/dbusjs/node-dbus-next).

## Similar Projects

dbus-next is a fork of [dbus-native](https://github.com/sidorares/dbus-native) library. While this library is great, it has many bugs which I don't think can be fixed without completely redesigning the user API. Another library exists [node-dbus](https://github.com/Shouqun/node-dbus) which is similar, but also not provide enough features to create full-featured DBus services.

## Copyright

You can use this code under an MIT license (see LICENSE).

© 2012, Andrey Sidorov

© 2018, Tony Crisci
