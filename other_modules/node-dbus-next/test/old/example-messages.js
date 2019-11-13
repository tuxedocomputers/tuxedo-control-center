const Buffer = require('safe-buffer').Buffer;
const fs = require('fs');
const assert = require('assert');
const unmarshall = require('../lib/message').unmarshall;
const marshall = require('../lib/message').marshall;

const dir = `${__dirname}/fixtures/messages/`;

describe('given base-64 encoded files with complete messages', function() {
  it('should be able to read them all', function() {
    var messages = fs.readdirSync(dir);
    messages.forEach(function(name) {
      var msg = fs.readFileSync(dir + name, 'ascii');
      var msgBin = Buffer.from(msg, 'base64');
      var unmarshalledMsg = unmarshall(msgBin);
      var marshalled = marshall(unmarshalledMsg);
      assert.deepStrictEqual(unmarshalledMsg, unmarshall(marshalled));
    });
  });
});
