assert = require('assert');
const variant = require('../lib/service/variant');
const Variant = variant.Variant;

// Test methodology:
// 1. Send a dbus command with the variant in the designated form such as this:
// gdbus call --session --dest org.test --object-path /org/test --method org.freedesktop.DBus.Properties.Set org.test.interface TestProp "<{'bat': <'baz'>}>"
// 2. Inspect the kind of object the marshaller turns it into
// 3. Parse the variant with variant.parse()
// 4. Make sure you get the desired JS object back

// <'foo'>
let simpleString = [[{ type: 's', child: [] }], ['foo']];
let simpleStringJS = 'foo';
assert.equal(variant.parse(simpleString), simpleStringJS);
let simpleStringSignature = 's';
let simpleStringMarshal = [ simpleStringSignature, 'foo'];
assert.deepEqual(variant.jsToMarshalFmt(simpleStringSignature, simpleStringJS), simpleStringMarshal);

// <['foo', 'bar']>
let listOfStrings = [
  [{ type: 'a', child: [{ type: 's', child: [] }] }],
  [['foo', 'bar']]
];
let listOfStringsJS = ['foo', 'bar'];
assert.deepEqual(variant.parse(listOfStrings), listOfStringsJS);
let listOfStringsSignature = 'as';
let listOfStringsMarshal = [ listOfStringsSignature, ['foo', 'bar'] ];
assert.deepEqual(variant.jsToMarshalFmt(listOfStringsSignature, listOfStringsJS), listOfStringsMarshal);

// <('foo', 'bar')>
let simpleStruct = [
  [{ type: '(', child: [{ type: 's', child: [] }, { type: 's', child: [] }] }],
  [['foo', 'bar']]
];
let simpleStructJS = ['foo', 'bar'];
assert.deepEqual(variant.parse(simpleStruct), simpleStructJS);
let simpleStructSignature = '(ss)';
let simpleStructMarshal = [ simpleStructSignature, ['foo', 'bar'] ];
assert.deepEqual(variant.jsToMarshalFmt(simpleStructSignature, simpleStructJS), simpleStructMarshal);

// <(<'foo'>, 53)>
let structWithVariant = [
  [{ type: '(', child: [{ type: 'v', child: [] }, { type: 'i', child: [] }] }],
  [[[[{ type: 's', child: [] }], ['foo']], 53]]
];
let structWithVariantJS = [new Variant('s', 'foo'), 53];
assert.deepEqual(variant.parse(structWithVariant), structWithVariantJS);
let structWithVariantSignature = '(vi)';
let structWithVariantMarshal = [ '(vi)', [ [ 's', 'foo' ], 53 ] ];
assert.deepEqual(variant.jsToMarshalFmt(structWithVariantSignature, structWithVariantJS), structWithVariantMarshal);

// <[('foo', 'bar'), ('bat', 'baz')]>
let listOfStructs = [
  [
    {
      type: 'a',
      child: [
        {
          type: '(',
          child: [{ type: 's', child: [] }, { type: 's', child: [] }]
        }
      ]
    }
  ],
  [[['foo', 'bar'], ['bat', 'baz']]]
];
let listOfStructsJS =  [
  ['foo', 'bar'],
  ['bat', 'baz']
];
assert.deepEqual(variant.parse(listOfStructs), listOfStructsJS);
let listOfStructsSignature = 'a(ss)';
let listOfStructsMarshal = [
  listOfStructsSignature,
  [
    ['foo', 'bar'],
    ['bat', 'baz']
  ]
];
assert.deepEqual(variant.jsToMarshalFmt(listOfStructsSignature, listOfStructsJS), listOfStructsMarshal);

// <('foo', 'bar', ('bat', 'baz'))>
let nestedStruct = [
  [
    {
      type: '(',
      child: [
        { type: 's', child: [] },
        { type: 's', child: [] },
        {
          type: '(',
          child: [
            { type: 's', child: [] },
            {
              type: '(',
              child: [{ type: 's', child: [] }, { type: 's', child: [] }]
            }
          ]
        }
      ]
    }
  ],
  [['foo', 'bar', ['bat', ['baz', 'bar']]]]
];
let nestedStructJS = [
  'foo',
  'bar',
  ['bat', ['baz', 'bar']]
];
assert.deepEqual(variant.parse(nestedStruct), nestedStructJS);
let nestedStructSignature = '(ss(ss))'
let nestedStructMarshal = [
  nestedStructSignature, [
    'foo',
    'bar',
    ['bat', ['baz', 'bar']]
  ]
];
assert.deepEqual(variant.jsToMarshalFmt(nestedStructSignature, nestedStructJS), nestedStructMarshal);

// <('foo', 'bar', ('bat', ('baz', <'bar'>)))>
let nestedStructWithVariant = [
  [
    {
      type: '(',
      child: [
        { type: 's', child: [] },
        { type: 's', child: [] },
        {
          type: '(',
          child: [
            { type: 's', child: [] },
            {
              type: '(',
              child: [{ type: 's', child: [] }, { type: 'v', child: [] }]
            }
          ]
        }
      ]
    }
  ],
  [['foo', 'bar', ['bat', ['baz', [[{ type: 's', child: [] }], ['bar']]]]]]
];
let nestedStructWithVariantJS = [
  'foo',
  'bar',
  ['bat', ['baz', new Variant('s', 'bar')]]
];
assert.deepEqual(variant.parse(nestedStructWithVariant), nestedStructWithVariantJS);
let nestedStructWithVariantSignature = '(ss(s(sv)))';
let nestedStructWithVariantMarshal = [
  nestedStructWithVariantSignature,
  [
    'foo',
    'bar',
    ['bat', ['baz', ['s', 'bar']]]
  ]
];

assert.deepEqual(variant.jsToMarshalFmt(nestedStructWithVariantSignature,
                                        nestedStructWithVariantJS),
                nestedStructWithVariantMarshal);

// <[<'foo'>, <('bar', ('bat', <[<'baz'>, <53>]>))>]>
let arrayWithinStruct = [
  [{ type: 'a', child: [{ type: 'v', child: [] }] }],
  [
    [
      [[{ type: 's', child: [] }], ['foo']],
      [
        [
          {
            type: '(',
            child: [
              { type: 's', child: [] },
              {
                type: '(',
                child: [{ type: 's', child: [] }, { type: 'v', child: [] }]
              }
            ]
          }
        ],
        [
          [
            'bar',
            [
              'bat',
              [
                [{ type: 'a', child: [{ type: 'v', child: [] }] }],
                [
                  [
                    [[{ type: 's', child: [] }], ['baz']],
                    [[{ type: 'i', child: [] }], [53]]
                  ]
                ]
              ]
            ]
          ]
        ]
      ]
    ]
  ]
];
assert.deepEqual(variant.parse(arrayWithinStruct), [
  new Variant('s', 'foo'),
  new Variant('(s(sv))', ['bar', ['bat', new Variant('av', [new Variant('s', 'baz'), new Variant('i', 53)])]])
]);

// <{'foo': 'bar', 'bat': 'baz'}>
let simpleDict = [
  [
    {
      type: 'a',
      child: [
        {
          type: '{',
          child: [{ type: 's', child: [] }, { type: 's', child: [] }]
        }
      ]
    }
  ],
  [[['foo', 'bar'], ['bat', 'baz']]]
];
let simpleDictJS = { foo: 'bar', bat: 'baz' };
let simpleDictSignature = 'a{ss}';
let simpleDictMarshal = [
  simpleDictSignature,
  [
    [ 'foo', 'bar' ],
    [ 'bat', 'baz' ]
  ]
];
assert.deepEqual(variant.parse(simpleDict), simpleDictJS);
assert.deepEqual(variant.jsToMarshalFmt('a{ss}', simpleDictJS), simpleDictMarshal);

// <{'foo': <'bar'>, 'bat': <53>}>
let dictOfStringVariant = [
  [
    {
      type: 'a',
      child: [
        {
          type: '{',
          child: [{ type: 's', child: [] }, { type: 'v', child: [] }]
        }
      ]
    }
  ],
  [
    [
      ['foo', [[{ type: 's', child: [] }], ['bar']]],
      ['bat', [[{ type: 'i', child: [] }], [53]]]
    ]
  ]
];
let dictOfStringVariantJS = {
    foo: new Variant('s', 'bar'),
    bat: new Variant('i', 53)
  };
assert.deepEqual(variant.parse(dictOfStringVariant), dictOfStringVariantJS);
let dictOfStringVariantSignature = 'a{sv}';
let dictOfStringVariantMarshal = [
  dictOfStringVariantSignature, [
    [ 'foo', [ 's', 'bar' ] ],
    [ 'bat', [ 'i', 53 ] ]
  ]
];
assert.deepEqual(variant.jsToMarshalFmt(dictOfStringVariantSignature, dictOfStringVariantJS), dictOfStringVariantMarshal);

// <{'foo': [<'bar'>, <53>], 'bat': [<'baz'>, <21>]}>
let dictOfVariantLists = [
  [
    {
      type: 'a',
      child: [
        {
          type: '{',
          child: [
            { type: 's', child: [] },
            { type: 'a', child: [{ type: 'v', child: [] }] }
          ]
        }
      ]
    }
  ],
  [
    [
      [
        'foo',
        [
          [[{ type: 's', child: [] }], ['bar']],
          [[{ type: 'i', child: [] }], [53]]
        ]
      ],
      [
        'bat',
        [
          [[{ type: 's', child: [] }], ['baz']],
          [[{ type: 'i', child: [] }], [21]]
        ]
      ]
    ]
  ]
];
let dictOfVariantListsJS = {
  foo: [new Variant('s', 'bar'), new Variant('i', 53)],
  bat: [new Variant('s', 'baz'), new Variant('i', 21)]
};
assert.deepEqual(variant.parse(dictOfVariantLists), dictOfVariantListsJS);
let dictOfVariantListsSignature = 'a{sav}';
let dictOfVariantListsMarshal = [
  dictOfVariantListsSignature,
  [
    [ 'foo', [ [ 's', 'bar' ], [ 'i', 53 ] ] ],
    [ 'bat', [ [ 's', 'baz' ], [ 'i', 21 ] ] ]
  ]
];
assert.deepEqual(variant.jsToMarshalFmt(dictOfVariantListsSignature, dictOfVariantListsJS), dictOfVariantListsMarshal);

// <[<{'foo':'bar'}>, <{'bat':'baz'}>, <53>]>
let listOfVariantDicts = [
  [{ type: 'a', child: [{ type: 'v', child: [] }] }],
  [
    [
      [
        [
          {
            type: 'a',
            child: [
              {
                type: '{',
                child: [{ type: 's', child: [] }, { type: 's', child: [] }]
              }
            ]
          }
        ],
        [[['foo', 'bar']]]
      ],
      [
        [
          {
            type: 'a',
            child: [
              {
                type: '{',
                child: [{ type: 's', child: [] }, { type: 's', child: [] }]
              }
            ]
          }
        ],
        [[['bat', 'baz']]]
      ],
      [[{ type: 'i', child: [] }], [53]]
    ]
  ]
];
let listOfVariantDictsJS = [
  new Variant('a{ss}', { foo: 'bar' }),
  new Variant('a{ss}', { bat: 'baz' }),
  new Variant('i', 53)
];
assert.deepEqual(variant.parse(listOfVariantDicts), listOfVariantDictsJS);
let listOfVariantDictsSignature = 'av';
let listOfVariantDictsMarshal = [
  listOfVariantDictsSignature,
  [
    [ 'a{ss}', [ [ 'foo', 'bar' ] ] ],
    [ 'a{ss}', [ [ 'bat', 'baz' ] ] ],
    [ 'i', 53 ]
  ]
];
assert.deepEqual(variant.jsToMarshalFmt(listOfVariantDictsSignature, listOfVariantDictsJS), listOfVariantDictsMarshal);

// TODO variant within a variant
