module.exports = {
  // signature, data, not expected to fail?, data after unmarshall (when expected to convert to canonic form and different from input)
  'simple types': [
    ['s', ['short string']],
    ['s', ['str30000chars']],
    ['o', ['/object/path']],
    ['o', ['invalid/object/path'], false],
    ['g', ['xxxtt(t)s{u}uuiibb']],
    ['g', ['signature'], false], // TODO: validate on input
    //['g', [str300chars], false],  // max 255 chars
    ['o', ['/']],
    ['b', [false]],
    ['b', [true]],
    //['b', [true], true, 1],
    //['b', [false], true, 0],
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
    ['u', [0]]
    //['u', [-1], false]  // TODO validate input, should fail
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
    ['a(yyai)', [[[100, 101, [1, 2, 3, 4, 5, 6]], [200, 201, [15, 4, 5, 6]]]]],
    [
      'a(yyyai)',
      [[[100, 101, 102, [1, 2, 3, 4, 5, 6]], [200, 201, 202, [15, 4, 5, 6]]]]
    ],
    ['ai', [[1, 2, 3, 4, 5, 6]]],
    ['aii', [[1, 2, 3, 4, 5, 6], 10]],
    ['a(ai)', [[[[1, 2, 3, 4, 5, 6]], [[15, 4, 5, 6]]]]],
    ['aai', [[[1, 2, 3, 4, 5, 6], [15, 4, 5, 6]]]]
  ]
};
