const assert = require('assert');

const {parseSignature} = require('./signature');
const put = require('@nornagon/put');
const Marshallers = require('./marshallers');
const align = require('./align').align;

module.exports = function marshall(signature, data, offset) {
  if (typeof offset === 'undefined') offset = 0;
  var tree = parseSignature(signature);
  if (!Array.isArray(data) || data.length !== tree.length) {
    throw new Error(
      `message body does not match message signature. Body:${JSON.stringify(
        data
      )}, signature:${signature}`
    );
  }
  var putstream = put();
  putstream._offset = offset;
  var buf = writeStruct(putstream, tree, data).buffer();
  return buf;
};

// TODO: serialise JS objects as a{sv}
//function writeHash(ps, treeKey, treeVal, data) {
//
//}

function writeStruct(ps, tree, data) {
  if (tree.length !== data.length) {
    throw new Error('Invalid struct data');
  }
  for (var i = 0; i < tree.length; ++i) {
    write(ps, tree[i], data[i]);
  }
  return ps;
}

function write(ps, ele, data) {
  switch (ele.type) {
    case '(':
    case '{':
      align(ps, 8);
      writeStruct(ps, ele.child, data);
      break;
    case 'a':
      // array serialisation:
      // length of array body aligned at 4 byte boundary
      // (optional 4 bytes to align first body element on 8-byte boundary if element
      // body
      var arrPut = put();
      arrPut._offset = ps._offset;
      var _offset = arrPut._offset;
      writeSimple(arrPut, 'u', 0); // array length placeholder
      var lengthOffset = arrPut._offset - 4 - _offset;
      // we need to alighn here because alignment is not included in array length
      if (['x', 't', 'd', '{', '('].indexOf(ele.child[0].type) !== -1)
        align(arrPut, 8);
      var startOffset = arrPut._offset;
      for (var i = 0; i < data.length; ++i)
        write(arrPut, ele.child[0], data[i]);
      var arrBuff = arrPut.buffer();
      var length = arrPut._offset - startOffset;
      // lengthOffset in the range 0 to 3 depending on number of align bytes padded _before_ arrayLength
      arrBuff.writeUInt32LE(length, lengthOffset);
      ps.put(arrBuff);
      ps._offset += arrBuff.length;
      break;
    case 'v':
      // TODO: allow serialisation of simple types as variants, e. g 123 -> ['u', 123], true -> ['b', 1], 'abc' -> ['s', 'abc']
      assert.equal(data.length, 2, 'variant data should be [signature, data]');
      var signatureEle = {
        type: 'g',
        child: []
      };
      write(ps, signatureEle, data[0]);
      var tree = parseSignature(data[0]);
      assert(tree.length === 1);
      write(ps, tree[0], data[1]);
      break;
    default:
      return writeSimple(ps, ele.type, data);
  }
}

var stringTypes = ['g', 'o', 's'];

function writeSimple(ps, type, data) {
  if (typeof data === 'undefined')
    throw new Error(
      "Serialisation of JS 'undefined' type is not supported by d-bus"
    );
  if (data === null)
    throw new Error('Serialisation of null value is not supported by d-bus');

  if (Buffer.isBuffer(data)) data = data.toString(); // encoding?
  if (stringTypes.indexOf(type) !== -1 && typeof data !== 'string') {
    throw new Error(
      `Expected string or buffer argument, got ${JSON.stringify(
        data
      )} of type '${type}'`
    );
  }

  var simpleMarshaller = Marshallers.MakeSimpleMarshaller(type);
  simpleMarshaller.marshall(ps, data);
  return ps;
}
