// parse signature from string to tree

let match = {
  '{': '}',
  '(': ')'
};

let knownTypes = {};
'(){}ybnqiuxtdsogarvehm*?@&^'.split('').forEach(function(c) {
  knownTypes[c] = true;
});

function parseSignature(signature) {
  let index = 0;
  function next() {
    if (index < signature.length) {
      let c = signature[index];
      ++index;
      return c;
    }
    return null;
  }

  function parseOne(c) {
    function checkNotEnd(c) {
      if (!c) {
        throw new Error('Bad signature: unexpected end');
      }
      return c;
    }

    if (!knownTypes[c])
      throw new Error(`Unknown type: "${c}" in signature "${signature}"`);

    let ele;
    let res = { type: c, child: [] };
    switch (c) {
      case 'a': // array
        ele = next();
        checkNotEnd(ele);
        res.child.push(parseOne(ele));
        return res;
      case '{': // dict entry
      case '(': // struct
        while ((ele = next()) !== null && ele !== match[c])
          res.child.push(parseOne(ele));
        checkNotEnd(ele);
        return res;
    }
    return res;
  }

  let ret = [];
  let c;
  while ((c = next()) !== null) {
    ret.push(parseOne(c));
  }
  return ret;
};

function collapseSignature(value) {
  if (value.child.length === 0) {
    return value.type;
  }

  let type = value.type;
  for (let i = 0; i < value.child.length; ++i) {
    type += collapseSignature(value.child[i]);
  }
  if (type[0] === '{') {
    type += '}';
  } else if (type[0] === '(') {
    type += ')';
  }
  return type;
}

module.exports = {
  parseSignature: parseSignature,
  collapseSignature: collapseSignature
};
