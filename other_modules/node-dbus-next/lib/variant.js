/**
 * @class
 * A class to represent DBus variants for both the client and service
 * interfaces. The {@link ProxyInterface} and [`Interface`]{@link
 * module:interface~Interface} methods, signals, and properties will use this
 * type to represent variant types. The user should use this class directly for
 * sending variants to methods if their signature expects the type to be a
 * variant.
 *
 * @example
 * let str = new Variant('s', 'hello');
 * let num = new Variant('d', 53);
 * let map = new Variant('a{ss}', { foo: 'bar' });
 * let list = new Variant('as', [ 'foo', 'bar' ]);
 */
class Variant {
 /**
  * Construct a new `Variant` with the given signature and value.
  * @param {string} signature - a DBus type signature for the `Variant`.
  * @param {any} value - the value of the `Variant` with type specified by the type signature.
  */
  constructor(signature, value) {
    this.signature = signature;
    this.value = value;
  }
}

module.exports = {
  Variant: Variant
};
