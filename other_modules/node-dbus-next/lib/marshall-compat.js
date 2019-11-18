const {parseSignature, collapseSignature} = require('./signature');
const {Variant} = require('./variant');
const message = require('./message');

function valueIsMarshallVariant(value) {
  // used for the marshaller variant type
  return Array.isArray(value) && value.length === 2 && Array.isArray(value[0]) && value[0].length > 0 && value[0][0].type;
}

function marshallVariantToJs(variant) {
  // XXX The marshaller uses a different body format than what the connection
  // is expected to emit. These two formats should be unified.
  // parses a single complete variant in marshall format
  let type = variant[0][0];
  let value = variant[1][0];

  if (!type.child.length) {
    if (valueIsMarshallVariant(value)) {
      return new Variant(collapseSignature(value[0][0]), marshallVariantToJs(value));
    } else {
      return value;
    }
  }

  if (type.type === 'a') {
    if (type.child[0].type === '{') {
      // this is an array of dictionary entries
      let result = {};
      for (let i = 0; i < value.length; ++i) {
        // dictionary keys must have basic types
        result[value[i][0]] = marshallVariantToJs([[type.child[0].child[1]], [value[i][1]]]);
      }
      return result;
    } else {
      // other arrays only have one type
      let result = [];
      for (let i = 0; i < value.length; ++i) {
        result[i] = marshallVariantToJs([[type.child[0]], [value[i]]]);
      }
      return result;
    }
  } else if (type.type === '(') {
    // structs have types equal to the number of children
    let result = [];
    for (let i = 0; i < value.length; ++i) {
      result[i] = marshallVariantToJs([[type.child[i]], [value[i]]]);
    }
    return result;
  }
}

function messageToJsFmt(message) {
  // XXX The marshaller uses a different body format than what the connection
  // is expected to emit. These two formats should be unified.
  let {signature='', body=[]} = message;
  let bodyJs = [];
  let signatureTree = parseSignature(signature);
  for (let i = 0; i < signatureTree.length; ++i) {
    let tree = signatureTree[i];
    bodyJs.push(marshallVariantToJs([[tree], [body[i]]]));
  }

  message.body = bodyJs;
  message.signature = signature;
  return message;
}

function jsToMarshalFmt(signature, value) {
  // XXX The connection accepts a message body in plain js format and converts
  // it to the marshaller format for writing. These two formats should be
  // unified.
  if (value === undefined) {
    throw new Error(`expected value for signature: ${signature}`);
  }
  if (signature === undefined) {
    throw new Error(`expected signature for value: ${value}`);
  }

  let signatureStr = null;
  if (typeof signature === 'string') {
    signatureStr = signature;
    signature = parseSignature(signature)[0];
  } else {
    signatureStr = collapseSignature(signature);
  }

  if (signature.child.length === 0) {
    if (signature.type === 'v') {
      if (value.constructor !== Variant) {
        throw new Error(`expected a Variant for value (got ${typeof value})`);
      }
      return [ signature.type, jsToMarshalFmt(value.signature, value.value) ];
    } else {
      return [ signature.type, value ];
    }
  }

  if (signature.type === 'a') {
    let result = [];
    if (signature.child[0].type === '{') {
      // this is an array of dictionary elements
      if (value.constructor !== Object) {
        throw new Error(`expecting an object for signature '${signatureStr}' (got ${typeof value})`);
      }
      for (let k of Object.keys(value)) {
        let v = value[k];
        if (v.constructor === Variant) {
          result.push([k, jsToMarshalFmt(v.signature, v.value)]);
        } else {
          result.push([k, jsToMarshalFmt(signature.child[0].child[1], v)[1]]);
        }
      }
    } else {
      if (!Array.isArray(value)) {
        throw new Error(`expecting an array for signature '${signatureStr}' (got ${typeof value})`);
      }
      for (let v of value) {
        if (v.constructor === Variant) {
          result.push(jsToMarshalFmt(v.signature, v.value));
        } else {
          result.push(jsToMarshalFmt(signature.child[0], v)[1]);
        }
      }
    }
    return [ signatureStr, result ];
  } else if (signature.type === '(') {
    if (!Array.isArray(value)) {
      throw new Error(`expecting an array for signature '${signatureStr}' (got ${typeof value})`);
    }
    if (value.length !== signature.child.length) {
      throw new Error(`expecting struct to have ${signature.child.length} members (got ${value.length} members)`);
    }
    let result = [];
    for (let i = 0; i < value.length; ++i) {
      let v = value[i];
      if (signature.child[i] === 'v') {
        if (v.constructor !== Variant) {
          throw new Error(`expected a Variant for struct member ${i+1} (got ${v})`);
        }
        result.push(jsToMarshalFmt(v.signature, v.value));
      } else {
        result.push(jsToMarshalFmt(signature.child[i], v)[1]);;
      }
    }
    return [ signatureStr, result ];
  } else {
    throw new Error(`got unknown complex type: ${signature.type}`);
  }
}

function marshallMessage(msg) {
  // XXX The connection accepts a message body in plain js format and converts
  // it to the marshaller format for writing. These two formats should be
  // unified.
  let {signature='', body=[]} = msg;

  let signatureTree = parseSignature(signature);

  if (signatureTree.length !== body.length) {
    throw new Error(`Expected ${signatureTree.length} body elements for signature '${signature}' (got ${body.length})`);
  }

  let marshallerBody = [];
  for (let i = 0; i < body.length; ++i) {
    if (signatureTree[i].type === 'v') {
      if (body[i].constructor !== Variant) {
        throw new Error(`Expected a Variant() argument for position ${i+1} (value='${body[i]}')`);
      }
      marshallerBody.push(jsToMarshalFmt(body[i].signature, body[i].value));
    } else {
      marshallerBody.push(jsToMarshalFmt(signatureTree[i], body[i])[1]);
    }
  }

  msg.signature = signature;
  msg.body = marshallerBody;
  return message.marshall(msg);
}

module.exports = {
  messageToJsFmt: messageToJsFmt,
  marshallMessage: marshallMessage
};
