// Test that methods and properties of type 'x' (long int) work correctly

const JSBI = require('jsbi');

let dbus = require('../../');
dbus.setBigIntCompat(true);

let {
  Interface, property, method, signal, DBusError,
  ACCESS_READ, ACCESS_WRITE, ACCESS_READWRITE
} = dbus.interface;

let {
  MAX_INT64_STR, MIN_INT64_STR,
  MAX_UINT64_STR, MIN_UINT64_STR
} = require('../../lib/constants');

const MAX_INT64 = JSBI.BigInt(MAX_INT64_STR);
const MIN_INT64 = JSBI.BigInt(MIN_INT64_STR);
const MAX_UINT64 = JSBI.BigInt(MAX_UINT64_STR);
const MIN_UINT64 = JSBI.BigInt(MIN_UINT64_STR);

const TEST_NAME = 'org.test.long_compat';
const TEST_PATH = '/org/test/path';
const TEST_IFACE = 'org.test.iface';
const TEST_ERROR_PATH = 'org.test.name.error';

let bus = dbus.sessionBus();
bus.on('error', (err) => {
  console.log(`got unexpected connection error:\n${err.stack}`);
});

class LongInterface extends Interface {
  @method({inSignature: 'x', outSignature: 'x'})
  EchoSigned(what) {
    if (what.prototype !== JSBI.BigInt.prototype) {
      throw new DBusError(TEST_ERROR_PATH, 'interface with long compat expected a JSBI BigInt for type x');
    }
    return what;
  }

  @method({inSignature: 't', outSignature: 't'})
  EchoUnsigned(what) {
    if (what.prototype !== JSBI.BigInt.prototype) {
      throw new DBusError(TEST_ERROR_PATH, 'interface with long compat expected a JSBI BigInt for type t');
    }
    return what;
  }
}

let testIface = new LongInterface(TEST_IFACE);

beforeAll(async () => {
  await bus.requestName(TEST_NAME);
  bus.export(TEST_PATH, testIface);
});

afterAll(() => {
  bus.disconnect();
});

test('test long type works correctly in compatibility mode', async () => {
  let object = await bus.getProxyObject(TEST_NAME, TEST_PATH);
  let test = object.getInterface(TEST_IFACE);

  // small numbers
  let what = JSBI.BigInt(-30);
  let result = await test.EchoSigned(what);
  expect(result.prototype).toEqual(JSBI.BigInt.prototype);
  expect(JSBI.equal(result, what)).toEqual(true);

  what = JSBI.BigInt(30);
  result = await test.EchoUnsigned(what);
  expect(result.prototype).toEqual(JSBI.BigInt.prototype);
  expect(JSBI.equal(result, what)).toEqual(true);
  result = await test.EchoSigned(what);
  expect(JSBI.equal(result, what)).toEqual(true);

  // int64 max
  what = MAX_INT64;
  result = await test.EchoSigned(what);
  expect(result.prototype).toEqual(JSBI.BigInt.prototype);
  expect(JSBI.equal(result, what)).toEqual(true);

  // int64 min
  what = MIN_INT64;
  result = await test.EchoSigned(what);
  expect(result.prototype).toEqual(JSBI.BigInt.prototype);
  expect(JSBI.equal(result, what)).toEqual(true);

  // uint64 max
  what = MAX_UINT64;
  result = await test.EchoUnsigned(what);
  expect(result.prototype).toEqual(JSBI.BigInt.prototype);
  expect(JSBI.equal(result, what)).toEqual(true);

  // uint64 min
  what = MIN_UINT64;
  result = await test.EchoUnsigned(what);
  expect(result.prototype).toEqual(JSBI.BigInt.prototype);
  expect(JSBI.equal(result, what)).toEqual(true);
});
