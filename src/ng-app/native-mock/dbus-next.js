console.error('DBUS MOCK LOADED');

class Interface {
  static configureMembers(args) {}
}


class Variant {}

const busMock = {
  getProxyObject: async () => ({
    getInterface: () => ({
      on: () => {},
      // Return promises for any method call?
      // Since we don't know method names, we can't implement them easily in a plan object.
      // But ProxyObject usually returns an object that traps calls or has defined methods.
      // For mocking, we might need a Proxy if tests call methods on it.
    })
  }),
  disconnect: () => {},
  requestName: async () => 1,
  export: () => {},
  unexport: () => {}
};


exports.interface = {
  Interface: Interface
};
exports.Interface = Interface;
exports.Variant = Variant;
exports.sessionBus = () => busMock;
exports.systemBus = () => busMock;

exports.default = exports;
 // Points default to the headers object? Circular but essentially correct for `import * as` vs `import d from`

