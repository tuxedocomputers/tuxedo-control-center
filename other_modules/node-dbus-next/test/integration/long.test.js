// Test that methods and properties of type 'x' (long int) work correctly

if (typeof BigInt !== 'function') {
  // skip these tests if BigInt is not supported
  BigInt = function(){};
  test = test.skip;
}

let dbus = require('../../');

let {
  Interface, property, method, signal,
  ACCESS_READ, ACCESS_WRITE, ACCESS_READWRITE
} = dbus.interface;

let {
  MAX_INT64_STR, MIN_INT64_STR,
  MAX_UINT64_STR, MIN_UINT64_STR
} = require('../../lib/constants');

const MAX_INT64 = BigInt(MAX_INT64_STR);
const MIN_INT64 = BigInt(MIN_INT64_STR);
const MAX_UINT64 = BigInt(MAX_UINT64_STR);
const MIN_UINT64 = BigInt(MIN_UINT64_STR);

const TEST_NAME = 'org.test.long';
const TEST_PATH = '/org/test/path';
const TEST_IFACE = 'org.test.iface';

let bus = dbus.sessionBus();
bus.on('error', (err) => {
  console.log(`got unexpected connection error:\n${err.stack}`);
});

class LongInterface extends Interface {
  @method({inSignature: 'x', outSignature: 'x'})
  EchoSigned(what) {
    return what;
  }

  @method({inSignature: 't', outSignature: 't'})
  EchoUnsigned(what) {
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

test('test long type works correctly', async () => {
  let object = await bus.getProxyObject(TEST_NAME, TEST_PATH);
  let test = object.getInterface(TEST_IFACE);

  // small numbers
  let what = BigInt(-30);
  let result = await test.EchoSigned(what);
  // XXX jest does not support bigint yet
  expect(result === what).toEqual(true);

  what = BigInt(30);
  result = await test.EchoUnsigned(what);
  expect(result === what).toEqual(true);
  result = await test.EchoSigned(what);
  expect(result === what).toEqual(true);

  // int64 max
  what = MAX_INT64;
  result = await test.EchoSigned(what);
  expect(result === what).toEqual(true);

  // int64 min
  what = MIN_INT64;
  result = await test.EchoSigned(what);
  expect(result === what).toEqual(true);

  // uint64 max
  what = MAX_UINT64;
  result = await test.EchoUnsigned(what);
  expect(result === what).toEqual(true);

  // uint64 min
  what = MIN_UINT64;
  result = await test.EchoUnsigned(what);
  expect(result === what).toEqual(true);
});
