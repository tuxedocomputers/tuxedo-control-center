const message = require('../lib/message');
const assert = require('assert');

function msg2buff(msg) {
  return message.marshall(msg);
}

function buff2msg(buff) {
  return message.unmarshall(buff);
}

describe('message marshall/unmarshall', function() {
  var tests = require('./testdata.js');
  var testName, testData, testNum;
  for (testName in tests) {
    for (testNum = 0; testNum < tests[testName].length; ++testNum) {
      testData = tests[testName][testNum];
      var testDesc = `${testName} ${testNum} ${testData[0]}<-${JSON.stringify(
        testData[1]
      )}`;
      if (testData[2] !== false) {
        (function(testData) {
          it(testDesc, function() {
            var msg = {
              type: 1,
              serial: 1,
              destination: 'final',
              flags: 1,
              signature: testData[0],
              body: testData[1]
            };
            assert.deepStrictEqual(msg, buff2msg(msg2buff(msg)));
          });
        })(testData);
      }
    }
  }
});
