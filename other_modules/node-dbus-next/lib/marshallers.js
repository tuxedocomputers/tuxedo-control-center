const Buffer = require('safe-buffer').Buffer;
const align = require('./align').align;
const {parseSignature} = require('../lib/signature');
const JSBI = require('jsbi');
const Long = require('long');

const {
  MAX_INT64_STR, MIN_INT64_STR,
  MAX_UINT64_STR, MIN_UINT64_STR
} = require('./constants');

/*
 * MakeSimpleMarshaller
 * @param signature - the signature of the data you want to check
 * @returns a simple marshaller with the "check" method
 *
 * check returns nothing - it only raises errors if the data is
 * invalid for the signature
 */
var MakeSimpleMarshaller = function(signature) {
  var marshaller = {};
  function checkValidString(data) {
    if (typeof data !== 'string') {
      throw new Error(`Data: ${data} was not of type string`);
    } else if (data.indexOf('\0') !== -1) {
      throw new Error('String contains null byte');
    }
  }

  function checkValidSignature(data) {
    if (data.length > 0xff) {
      throw new Error(
        `Data: ${data} is too long for signature type (${data.length} > 255)`
      );
    }

    var parenCount = 0;
    for (var ii = 0; ii < data.length; ++ii) {
      if (parenCount > 32) {
        throw new Error(
          `Maximum container type nesting exceeded in signature type:${data}`
        );
      }
      switch (data[ii]) {
        case '(':
          ++parenCount;
          break;
        case ')':
          --parenCount;
          break;
        default:
          /* no-op */
          break;
      }
    }
    parseSignature(data);
  }

  switch (signature) {
    case 'o':
    // object path
    // TODO: verify object path here?
    case 's': // eslint-disable-line no-fallthrough
      //STRING
      marshaller.check = function(data) {
        checkValidString(data);
      };
      marshaller.marshall = function(ps, data) {
        this.check(data);
        // utf8 string
        align(ps, 4);
        const buff = Buffer.from(data, 'utf8');
        ps
          .word32le(buff.length)
          .put(buff)
          .word8(0);
        ps._offset += 5 + buff.length;
      };
      break;
    case 'g':
      //SIGNATURE
      marshaller.check = function(data) {
        checkValidString(data);
        checkValidSignature(data);
      };
      marshaller.marshall = function(ps, data) {
        this.check(data);
        // signature
        const buff = Buffer.from(data, 'ascii');
        ps
          .word8(data.length)
          .put(buff)
          .word8(0);
        ps._offset += 2 + buff.length;
      };
      break;
    case 'y':
      //BYTE
      marshaller.check = function(data) {
        checkInteger(data);
        checkRange(0x00, 0xff, data);
      };
      marshaller.marshall = function(ps, data) {
        this.check(data);
        ps.word8(data);
        ps._offset++;
      };
      break;
    case 'b':
      //BOOLEAN
      marshaller.check = function(data) {
        checkBoolean(data);
      };
      marshaller.marshall = function(ps, data) {
        this.check(data);
        // booleans serialised as 0/1 unsigned 32 bit int
        data = data ? 1 : 0;
        align(ps, 4);
        ps.word32le(data);
        ps._offset += 4;
      };
      break;
    case 'n':
      //INT16
      marshaller.check = function(data) {
        checkInteger(data);
        checkRange(-0x7fff - 1, 0x7fff, data);
      };
      marshaller.marshall = function(ps, data) {
        this.check(data);
        align(ps, 2);
        const buff = Buffer.alloc(2);
        buff.writeInt16LE(parseInt(data), 0);
        ps.put(buff);
        ps._offset += 2;
      };
      break;
    case 'q':
      //UINT16
      marshaller.check = function(data) {
        checkInteger(data);
        checkRange(0, 0xffff, data);
      };
      marshaller.marshall = function(ps, data) {
        this.check(data);
        align(ps, 2);
        ps.word16le(data);
        ps._offset += 2;
      };
      break;
    case 'i':
      //INT32
      marshaller.check = function(data) {
        checkInteger(data);
        checkRange(-0x7fffffff - 1, 0x7fffffff, data);
      };
      marshaller.marshall = function(ps, data) {
        this.check(data);
        align(ps, 4);
        const buff = Buffer.alloc(4);
        buff.writeInt32LE(parseInt(data), 0);
        ps.put(buff);
        ps._offset += 4;
      };
      break;
    case 'u':
      //UINT32
      marshaller.check = function(data) {
        checkInteger(data);
        checkRange(0, 0xffffffff, data);
      };
      marshaller.marshall = function(ps, data) {
        this.check(data);
        // 32 t unsigned int
        align(ps, 4);
        ps.word32le(data);
        ps._offset += 4;
      };
      break;
    case 't':
      //UINT64
      marshaller.check = function(data) {
        return checkLong(data, false);
      };
      marshaller.marshall = function(ps, data) {
        data = this.check(data);
        let long = Long.fromString(data.toString(), true);
        align(ps, 8);
        ps.word32le(long.low);
        ps.word32le(long.high);
        ps._offset += 8;
      };
      break;
    case 'x':
      //INT64
      marshaller.check = function(data) {
        return checkLong(data, true);
      };
      marshaller.marshall = function(ps, data) {
        data = this.check(data);
        let long = Long.fromString(data.toString(), false);
        align(ps, 8);
        ps.word32le(long.low);
        ps.word32le(long.high);
        ps._offset += 8;
      };
      break;
    case 'd':
      //DOUBLE
      marshaller.check = function(data) {
        if (typeof data !== 'number') {
          throw new Error(`Data: ${data} was not of type number`);
        } else if (Number.isNaN(data)) {
          throw new Error(`Data: ${data} was not a number`);
        } else if (!Number.isFinite(data)) {
          throw new Error('Number outside range');
        }
      };
      marshaller.marshall = function(ps, data) {
        this.check(data);
        align(ps, 8);
        const buff = Buffer.alloc(8);
        buff.writeDoubleLE(parseFloat(data), 0);
        ps.put(buff);
        ps._offset += 8;
      };
      break;
    default:
      throw new Error(`Unknown data type format: ${signature}`);
  }
  return marshaller;
};
exports.MakeSimpleMarshaller = MakeSimpleMarshaller;

var checkRange = function(minValue, maxValue, data) {
  if (data > maxValue || data < minValue) {
    throw new Error('Number outside range');
  }
};

var checkInteger = function(data) {
  if (typeof data !== 'number') {
    throw new Error(`Data: ${data} was not of type number`);
  }
  if (Math.floor(data) !== data) {
    throw new Error(`Data: ${data} was not an integer`);
  }
};

var checkBoolean = function(data) {
  if (!(typeof data === 'boolean' || data === 0 || data === 1))
    throw new Error(`Data: ${data} was not of type boolean`);
};

const MAX_INT64 = JSBI.BigInt(MAX_INT64_STR);
const MIN_INT64 = JSBI.BigInt(MIN_INT64_STR);
const MAX_UINT64 = JSBI.BigInt(MAX_UINT64_STR);
const MIN_UINT64 = JSBI.BigInt(MIN_UINT64_STR);

var checkLong = function(data, signed) {
  if (typeof data === 'bigint') {
    data = JSBI.BigInt(data.toString());
  } else {
    data = JSBI.BigInt(data);
  }

  if (signed) {
    if (JSBI.greaterThan(data, MAX_INT64)) {
      throw new Error('data was out of range (greater than max int64)');
    } else if (JSBI.lessThan(data, MIN_INT64)) {
      throw new Error('data was out of range (less than min int64)');
    }
  } else {
    if (JSBI.greaterThan(data, MAX_UINT64)) {
      throw new Error('data was out of range (greater than max uint64)');
    } else if (JSBI.lessThan(data, MIN_UINT64)) {
      console.log(data.toString());
      throw new Error('data was out of range (less than min uint64)');
    }
  }

  return data;
};
