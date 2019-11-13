const Buffer = require('safe-buffer').Buffer;
const marshall = require('../lib/marshall');
const unmarshall = require('../lib/unmarshall');
const assert = require('assert');
const Long = require('long');

var LongMaxS64 = Long.fromString('9223372036854775807', false);
var LongMinS64 = Long.fromString('-9223372036854775808', false);
var LongMaxU64 = Long.fromString('18446744073709551615', true);
var LongMinU64 = Long.fromString('0', true);
var LongMaxS53 = Long.fromString('9007199254740991', false);
var LongMinS53 = Long.fromString('-9007199254740991', false);
var LongMaxU53 = Long.fromString('9007199254740991', true);
var LongMinU53 = Long.fromString('0', true);

/** Take the data and marshall it then unmarshall it */
function marshallAndUnmarshall(signature, data, unmarshall_opts) {
  var marshalledBuffer = marshall(signature, data);
  var result = unmarshall(
    marshalledBuffer,
    signature,
    undefined,
    unmarshall_opts
  );
  return result;
}

function test(signature, data, other_result, unmarshall_opts) {
  var result = marshallAndUnmarshall(signature, data, unmarshall_opts);
  try {
    if (other_result !== undefined) {
      assert.deepStrictEqual(result, other_result);
    } else {
      assert.deepStrictEqual(data, result);
    }
  } catch (e) {
    console.log('signature   :', signature);
    console.log('orig        :', data);
    console.log('unmarshalled:', result);
    if (other_result !== undefined) {
      throw new Error(`results don't match (${result}) != (${other_result})`);
    } else {
      throw new Error(`results don't match (${data}) != (${result})`);
    }
  }
}

var str300chars = '';
for (var i = 0; i < 300; ++i) str300chars += 'i';

var b30000bytes = Buffer.alloc(30000, 60);
var str30000chars = b30000bytes.toString('ascii');

function expectMarshallToThrowOnBadArguments(badSig, badData, errorRegex) {
  assert.throws(function() {
    marshall(badSig, badData);
  }, errorRegex);
}

describe('marshall', function() {
  it('throws error on bad data', function() {
    var badData = [
      ['s', [3], /Expected string or buffer argument/],
      ['s', ['as\0df'], /String contains null byte/],
      ['g', [3], /Expected string or buffer argument/],
      ['g', ['ccc'], /Unknown type.*in signature.*/],
      ['g', ['as\0df'], /String contains null byte/],
      ['g', [str300chars], /Data:.* is too long for signature type/],
      ['g', ['iii(i'], /Bad signature: unexpected end/],
      ['g', ['iii{i'], /Bad signature: unexpected end/],
      [
        'g',
        [
          'i(i(i(i(i(i(i(i(i(i(i(i(i(i(i(i(i(i(i(i(i(i(i(i(i(i(i(i(i(i(i(i(i(i)))))))))))))))))))))))))))))))))'
        ],
        /Maximum container type nesting exceeded/
      ],
      ['y', ['n'], /Data:.*was not of type number/],
      ['y', [-1], /Number outside range/],
      ['y', [1.5], /Data:.*was not an integer/],
      ['y', [256], /Number outside range/],
      ['b', ['n'], /Data:.*was not of type boolean/],
      ['b', [-1], /Data:.*was not of type boolean/],
      ['b', [0.5], /Data:.*was not of type boolean/],
      ['b', [2], /Data:.*was not of type boolean/],
      ['n', ['n'], /Data:.*was not of type number/],
      ['n', [-0x7fff - 2], /Number outside range/],
      ['n', [1.5], /Data:.*was not an integer/],
      ['n', [0x7fff + 1], /Number outside range/],
      ['q', ['n'], /Data:.*was not of type number/],
      ['q', [-1], /Number outside range/],
      ['q', [1.5], /Data:.*was not an integer/],
      ['q', [0xffff + 1], /Number outside range/],
      ['i', ['n'], /Data:.*was not of type number/],
      ['i', [-0x7fffffff - 2], /Number outside range/],
      ['i', [1.5], /Data:.*was not an integer/],
      ['i', [0x7fffffff + 1], /Number outside range/],
      ['u', ['n'], /Data:.*was not of type number/],
      ['u', [-1], /Number outside range/],
      ['u', [1.5], /Data:.*was not an integer/],
      ['u', [0xffffffff + 1], /Number outside range/],
      ['x', ['n'], /Data:.*did not convert correctly to signed 64 bit/],
      ['x', [-Math.pow(2, 53) - 1], /Number outside range.*/],
      ['x', [1.5], /Data:.*was not an integer.*/],
      ['x', [Math.pow(2, 53)], /Number outside range.*/],
      [
        'x',
        ['9223372036854775808'],
        /Data:.*did not convert correctly to signed 64 bit*/
      ], // exceed S64
      [
        'x',
        ['-9223372036854775809'],
        /Data:.*did not convert correctly to signed 64 bit*/
      ], // exceed S64
      ['t', ['n'], /Data:.*did not convert correctly to unsigned 64 bit/],
      ['t', [-1], /Number outside range.*/],
      [
        't',
        ['18446744073709551616'],
        /Data:.*did not convert correctly to unsigned 64 bit*/
      ], // exceed U64
      ['t', [1.5], /Data:.*was not an integer.*/],
      ['t', [Math.pow(2, 53)], /Number outside range.*/],
      [
        'x',
        [LongMaxU53],
        /Longjs object is unsigned, but marshalling into signed 64 bit field/
      ], // Longjs unsigned/signed must match with field?
      [
        't',
        [LongMaxS53],
        /Longjs object is signed, but marshalling into unsigned 64 bit field/
      ],
      ['d', ['n'], /Data:.*was not of type number/],
      ['d', [Number.NEGATIVE_INFINITY], /Number outside range/],
      ['d', [NaN], /Data:.*was not a number/],
      ['d', [Number.POSITIVE_INFINITY], /Number outside range/]
    ];
    for (var ii = 0; ii < badData.length; ++ii) {
      var badRow = badData[ii];
      var badSig = badRow[0];
      var badDatum = badRow[1];
      var errorRegex = badRow[2];
      expectMarshallToThrowOnBadArguments(badSig, badDatum, errorRegex);
    }
  });
  it('throws error on bad signature', function() {
    var badSig = '1';
    var badData = 1;
    expectMarshallToThrowOnBadArguments(
      badSig,
      badData,
      /Unknown type.*in signature.*/
    );
  });
});

describe('marshall/unmarshall', function() {
  // signature, data, not expected to fail?, data after unmarshall (when expected to convert to canonic form and different from input), unmarshall_options
  var tests = {
    'simple types': [
      ['s', ['short string']],
      ['s', [str30000chars]],
      ['o', ['/object/path']],
      ['o', ['invalid/object/path'], false],
      ['g', ['xxxtt(t)s{u}uuiibb']],
      ['g', ['signature'], false], // TODO: validate on input
      //['g', [str300chars], false],  // max 255 chars
      ['o', ['/']],
      ['b', [false]],
      ['b', [true]],
      ['y', [10]],
      //['y', [300], false],  // TODO: validate on input
      //['y', [-10]],  // TODO: validate on input
      ['n', [300]],
      ['n', [16300]],
      //['n', [65535], false] // TODO: signed 16 bit
      //['n', [-100], false];  // TODO: validate on input, should fail
      ['q', [65535]],
      //['q', [-100], false],   // TODO: validate on input, should fail
      // i - signed, u - unsigned
      ['i', [1048576]],
      ['i', [0]],
      ['i', [-1]],
      ['u', [1048576]],
      ['u', [0]],
      //['u', [-1], false]  // TODO validate input, should fail
      ['x', [9007199254740991]], // 53bit numbers convert to 53bit numbers
      ['x', [-9007199254740991]],
      ['t', [9007199254740991]],
      ['t', [0]],
      ['x', ['9007199254740991'], false, [9007199254740991]], // strings should parse and convert to 53bit numbers
      ['x', ['-9007199254740991'], false, [-9007199254740991]],
      ['t', ['9007199254740991'], false, [9007199254740991]],
      ['t', ['0'], false, [0]],
      ['x', ['0x1FFFFFFFFFFFFF'], false, [9007199254740991]], // hex strings
      ['x', ['-0x1FFFFFFFFFFFFF'], false, [-9007199254740991]],
      ['x', ['0x0000'], false, [0]],
      [
        'x',
        ['0x7FFFFFFFFFFFFFFF'],
        false,
        [LongMaxS64],
        { ReturnLongjs: true }
      ],
      ['t', ['0x1FFFFFFFFFFFFF'], false, [9007199254740991]],
      ['t', ['0x0000'], false, [0]],
      [
        't',
        ['0xFFFFFFFFFFFFFFFF'],
        false,
        [LongMaxU64],
        { ReturnLongjs: true }
      ],
      ['x', [LongMaxS53], false, [9007199254740991]], // make sure Longjs objects convert to 53bit numbers
      ['x', [LongMinS53], false, [-9007199254740991]],
      ['t', [LongMaxU53], false, [9007199254740991]],
      ['t', [LongMinU53], false, [0]],
      ['x', [9007199254740991], false, [LongMaxS53], { ReturnLongjs: true }], // 53bit numbers to objects
      ['x', [-9007199254740991], false, [LongMinS53], { ReturnLongjs: true }],
      ['t', [9007199254740991], false, [LongMaxU53], { ReturnLongjs: true }],
      ['t', [0], false, [LongMinU53], { ReturnLongjs: true }],
      [
        'x',
        ['9223372036854775807'],
        false,
        [LongMaxS64],
        { ReturnLongjs: true }
      ], // strings to objects
      [
        'x',
        ['-9223372036854775808'],
        false,
        [LongMinS64],
        { ReturnLongjs: true }
      ],
      [
        't',
        ['18446744073709551615'],
        false,
        [LongMaxU64],
        { ReturnLongjs: true }
      ],
      ['t', ['0'], false, [LongMinU64], { ReturnLongjs: true }],
      ['x', [LongMaxS64], false, [LongMaxS64], { ReturnLongjs: true }], // Longjs object to objects
      ['x', [LongMinS64], false, [LongMinS64], { ReturnLongjs: true }],
      ['t', [LongMaxU64], false, [LongMaxU64], { ReturnLongjs: true }],
      ['t', [LongMinU64], false, [LongMinU64], { ReturnLongjs: true }],
      [
        'x',
        [
          {
            low: LongMaxS64.low,
            high: LongMaxS64.high,
            unsigned: LongMaxS64.unsigned
          }
        ],
        false,
        [LongMaxS64],
        { ReturnLongjs: true }
      ], // non-instance Longjs object to objects
      [
        'x',
        [
          {
            low: LongMaxS53.low,
            high: LongMaxS53.high,
            unsigned: LongMaxS53.unsigned
          }
        ],
        false,
        [9007199254740991]
      ],
      [
        't',
        [
          {
            low: LongMaxU64.low,
            high: LongMaxU64.high,
            unsigned: LongMaxU64.unsigned
          }
        ],
        false,
        [LongMaxU64],
        { ReturnLongjs: true }
      ],
      [
        't',
        [
          {
            low: LongMaxU53.low,
            high: LongMaxU53.high,
            unsigned: LongMaxU53.unsigned
          }
        ],
        false,
        [9007199254740991]
      ],
      ['x', [new String(9007199254740991)], false, [9007199254740991]], // quick check String instance conversion
      ['t', [new String('9007199254740991')], false, [9007199254740991]],
      ['x', [new Number(9007199254740991)], false, [9007199254740991]], // quick check Number instance conversion
      ['t', [new Number('9007199254740991')], false, [9007199254740991]]
    ],
    'simple structs': [
      ['(yyy)y', [[1, 2, 3], 4]],
      ['y(yyy)y', [5, [1, 2, 3], 4]],
      ['yy(yyy)y', [5, 6, [1, 2, 3], 4]],
      ['yyy(yyy)y', [5, 6, 7, [1, 2, 3], 4]],
      ['yyyy(yyy)y', [5, 6, 7, 8, [1, 2, 3], 4]],
      ['yyyyy(yyy)y', [5, 6, 7, 8, 9, [1, 2, 3], 4]]
    ],
    'arrays of simple types': [
      ['ai', [[1, 2, 3, 4, 5, 6, 7]]],
      ['aai', [[[300, 400, 500], [1, 2, 3, 4, 5, 6, 7]]]],
      ['aiai', [[1, 2, 3], [300, 400, 500]]]
    ],
    'compound types': [
      ['iyai', [10, 100, [1, 2, 3, 4, 5, 6]]],
      // TODO: fix 'array of structs offset problem
      ['a(iyai)', [[[10, 100, [1, 2, 3, 4, 5, 6]], [11, 200, [15, 4, 5, 6]]]]],
      [
        'sa(iyai)',
        [
          'test test test test',
          [[10, 100, [1, 2, 3, 4, 5, 6]], [11, 200, [15, 4, 5, 6]]]
        ]
      ],
      ['a(iyai)', [[[10, 100, [1, 2, 3, 4, 5, 6]], [11, 200, [15, 4, 5, 6]]]]],
      ['a(yai)', [[[100, [1, 2, 3, 4, 5, 6]], [200, [15, 4, 5, 6]]]]],
      [
        'a(yyai)',
        [[[100, 101, [1, 2, 3, 4, 5, 6]], [200, 201, [15, 4, 5, 6]]]]
      ],
      [
        'a(yyyai)',
        [[[100, 101, 102, [1, 2, 3, 4, 5, 6]], [200, 201, 202, [15, 4, 5, 6]]]]
      ],
      ['ai', [[1, 2, 3, 4, 5, 6]]],
      ['aii', [[1, 2, 3, 4, 5, 6], 10]],
      ['a(ai)', [[[[1, 2, 3, 4, 5, 6]], [[15, 4, 5, 6]]]]],
      ['aai', [[[1, 2, 3, 4, 5, 6], [15, 4, 5, 6]]]]
    ],
    buffers: [
      ['ayay', [Buffer.from([0, 1, 2, 3, 4, 5, 6, 0xff]), Buffer.from([])]]
    ]
  };

  var testName, testData, testNum;
  for (testName in tests) {
    for (testNum = 0; testNum < tests[testName].length; ++testNum) {
      testData = tests[testName][testNum];
      var testDesc = `${testName} ${testNum} ${testData[0]}<-${JSON.stringify(
        testData[1]
      )}`;
      if (testData[2] === false) {
        // should fail
        (function(testData) {
          it(testDesc, function() {
            test(testData[0], testData[1], testData[3], testData[4]);
          });
        })(testData);
      } else {
        (function(testData) {
          it(testDesc, function() {
            test(testData[0], testData[1], testData[3], testData[4]);
          });
        })(testData);
      }
    }
  }
});

// issue-128: marshall/unmarshall of "n"
var data = [10, 1000];
var s = 'nn';
var buf = marshall(s, data);
assert.equal(buf.toString('hex'), '0a00e803');
assert.deepStrictEqual(unmarshall(buf, s), data);

//test('a(yai)', [[[100,[1,2,3,4,5,6]],[200,[15,4,5,6]]]], console.log);
//test('a(yv)', [[[6,["s","final"]],[8,["g","uuu"]]]], console.log)

// 7 a(ai)<-[[[[1,2,3,4,5,6]],[[15,4,5,6]]]]

/*
test('a(ai)', [
 [
   [[1,2,3,4,5,6]],
   [[7, 7, 4,5,6,7,8,9]]
 ]
], console.log);
*/

/*
test('aai', [
   [
      [1,2,3,4,5,6],
      [7, 7, 4,5,6,7,8,9]
   ]
], console.log);
*/
/*

intTypes = ['y', 'n', 'q', 'i', 'u']; //, 'x', 't'];
for (var t1 = 0; t1 < intTypes.length; ++t1)
  for (var t2 = 0; t2 < intTypes.length; ++t2)
  {
      test(intTypes[t1] + intTypes[t2], [1, 2]);
  }

// arrays

test('ai', [[]]);
test('aai', [[[]]]);



// TODO: epsilon-test floats
// test('bdsai', [0, 3.141590118408203, 'test string', [1, 2, 3, 0, 0, 0, 4, 5, 6, 7]]);

*/
