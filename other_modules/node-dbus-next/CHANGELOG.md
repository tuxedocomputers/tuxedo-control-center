# Changelog

## v0.7.1

This release contains breaking changes, bugfixes, and features.

* Fix bus name validator for ProxyObject (#27)
* Move all constants to enum classes (breaking)
* Remove the `Name` class (breaking) (#22)
* Remove the `NameExistsError` (breaking)
* Enable TCP support (#26)
* Use nornagons put fork

## v0.6.1

This release contains new major features.

* Redesign, expose, and add tests for the low-level api (#20)
* Add reply info to DBusError for the client (#21)
* Add the dbus-next-send.js script to demonstrate the low-level api.

For more information on the low-level api, see the documentation for the new
classes and members.

* `Message` class - Represents a DBus message for sending or receiving messages on the bus.
* `MessageBus#call()` - Send a method call message on the bus and wait for a reply.
* `MessageBus#send()` - Send a message on the bus.
* `MessageBus#newSerial()` - Get a serial for sending the message.
* `MessageBus#addMethodHandler()` - Add a custom method handler for messages.
* `MessageBus#removeMethodHandler()` - Remove a method handler.

The `MessageBus` has gained the following events:

* `connect` - Emitted after the bus has connected.
* `message` - Emitted when a message is received on the bus.

## v0.5.1

This release contains some import bugfixes, features, and breaking changes. The
service interface has been upgraded to "somewhat stable".

* Use an ES2015 class for the `MessageBus`.
* Make the low level interface private for now. (breaking, ref #20).
* Document the public api and make everything not documented private (breaking, #10).
* Remove tcp message bus support (breaking).
* Forward connection errors to the `MessageBus`.
* Make `interfaces` member of the `ProxyObject` a map from interface names to `ProxyInterface`s (breaking).
* `ProxyObject#getInterface` now throws an error if the interface is not found (breaking).

## v0.4.2

This release contains some important bugfixes and features.

* Gracefully handle user errors in services by returning the error to the client. (#11)
* Remove the old high-level interfaces. (#15)
* Implement `org.freedesktop.DBus.Peer` for clients. (#16)
* Cache name owners and discriminate signals on owner (fixes a lot of mpris-service test errors).
* Clean up a lot of dead code.

## v0.4.1

This release contains breaking changes to how interfaces are exported on the bus with the public api. See the README and example service for the current way to export interfaces.

* Add continuous integration
* Give DBusError to clients when services throw errors (#11)
* get dbus session bus address from the filesystem when `DBUS_SESSION_BUS_ADDRESS` is not set in the environment (addresses #14)
* Add constants for name request flags
* remove `bus.export()` and `bus.unexport()` (breaking)
* Add `bus.requestName()` to the public api which now returns a promise which resolves to a `Name` object which is now also part of the public api.
* Add `name.release()` to remove a name from the bus

## v0.3.2

* Add bus name validators
* bugfix: allow "-" in bus names
* bugfix: Use Long.js internally to fix issues with sending and receiving negative numbers

## v0.3.1

Export dbus interface and member validators.

## v0.2.1

This version introduces changes for compatibility with node version 6.3.0 and adds the generate-interfaces.js utility.

## v0.2.0

This version contains breaking changes and new features.

* BigInt compatibility mode (breaking) (#7)
* Bump Node engine requirement to 8.2.1 (#7, #6)
* Make emitting of PropertiesChange a static method on Interface (breaking)
* Add `name` option to members to change the name from the JavaScript name (#9)
* Add `disabled` option to members to disable members at runtime (#9)
* Add tests for introspection xml generation

## v0.1.0

* Remove optimist dependency
* Allow throwing DBusError in getter and setter for interfaces
* Use BigInt for 'x' and 't' types
