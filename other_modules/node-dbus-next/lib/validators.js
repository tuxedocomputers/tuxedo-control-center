/**
 * Utility functions to validate bus names, interface names, and object paths.
 *
 * @module validators
 */

const busNameRe = /^[A-Za-z_-][A-Za-z0-9_-]*$/
/**
 * Validate the string as a valid bus name.
 * @see {@link https://dbus.freedesktop.org/doc/dbus-specification.html#message-protocol-names-bus}
 *
 * @static
 * @param {string} name - The name to validate as a valid bus name.
 * @returns {boolean} - Whether the string is a valid bus name.
 */
function isBusNameValid(name) {
  if (typeof name !== 'string') {
    return false;
  }

  if (name.startsWith(':')) {
    // a unique bus name
    return true;
  }

  // a well-known bus name
  return !!(name.length > 0 &&
    name.length <= 255 &&
    name[0] !== '.' &&
    name.indexOf('.') !== -1 &&
    name.split('.').every((n) => n && busNameRe.test(n)));
}

/**
 * Throws an error if the given string is not a valid bus name.
 * @see {@link https://dbus.freedesktop.org/doc/dbus-specification.html#message-protocol-names-bus}
 *
 * @static
 * @param {string} name - The name to validate as a bus name.
 */
function assertBusNameValid(name) {
  if (!isBusNameValid(name)) {
    throw new Error(`Invalid bus name: ${name}`);
  }
}

const pathRe = /^[A-Za-z0-9_]+$/
/**
 * Validate the string as a valid object path.
 * @see {@link https://dbus.freedesktop.org/doc/dbus-specification.html#message-protocol-marshaling-object-path}
 *
 * @static
 * @param {string} path - The string to validate as an object path.
 * @returns {boolean} - Whether the string is a valid object path.
 */
function isObjectPathValid(path) {
  return !!(typeof path === 'string' &&
      path &&
      path[0] === '/' &&
      (path.length === 1 ||
        (path[path.length-1] !== '/' &&
         path.split('/').slice(1).every((p) => p && pathRe.test(p)))));
}

/**
 * Throws an error if the given string is not a valid object path.
 * @see {@link https://dbus.freedesktop.org/doc/dbus-specification.html#message-protocol-marshaling-object-path}
 *
 * @static
 * @param {string} path - The string to validate as an object path.
 * @returns {boolean} - Whether the string is a valid object path.
 */
function assertObjectPathValid(path) {
  if (!isObjectPathValid(path)) {
    throw new Error(`Invalid object path: ${path}`);
  }
}

const elementRe = /^[A-Za-z_][A-Za-z0-9_]*$/
/**
 * Validate the string as a valid interface name.
 * see {@link https://dbus.freedesktop.org/doc/dbus-specification.html#message-protocol-names-interface}
 *
 * @static
 * @param {string} name - The string to validate as an interface name.
 * @returns {boolean} - Whether the string is a valid interface name.
 */
function isInterfaceNameValid(name) {
  return !!(typeof name === 'string' &&
    name &&
    name.length > 0 &&
    name.length <= 255 &&
    name[0] !== '.' &&
    name.indexOf('.') !== -1 &&
    name.split('.').every((n) => n && elementRe.test(n)));
}

/**
 * Throws an error if the given string is not a valid interface name.
 * @see {@link https://dbus.freedesktop.org/doc/dbus-specification.html#message-protocol-names-interface}
 *
 * @static
 * @param {string} name - The string to validate as an interface name.
 * @returns {boolean} - Whether the string is a valid interface name.
 */
function assertInterfaceNameValid(name) {
  if (!isInterfaceNameValid(name)) {
    throw new Error(`Invalid interface name: ${name}`);
  }
}

/**
 * Validate the string is a valid member name
 * @see {@link https://dbus.freedesktop.org/doc/dbus-specification.html#message-protocol-names-interface}
 *
 * @static
 * @param {string} name - The string to validate as a member name.
 * @returns {boolean} - Whether the string is a valid member name.
 */
function isMemberNameValid(name) {
  return !!(typeof name === 'string' &&
    name &&
    name.length > 0 &&
    name.length <= 255 &&
    elementRe.test(name));
}

/**
 * Throws an error if the string is not a valid member name.
 * @see {@link https://dbus.freedesktop.org/doc/dbus-specification.html#message-protocol-names-interface}
 *
 * @static
 * @param {string} name - The string to validate as a member name.
 */
function assertMemberNameValid(name) {
  if (!assertMemberNameValid) {
    throw new Error(`Invalid member name: ${name}`);
  }
}

module.exports = {
  isBusNameValid: isBusNameValid,
  assertBusNameValid: assertBusNameValid,
  isObjectPathValid: isObjectPathValid,
  assertObjectPathValid: assertObjectPathValid,
  isInterfaceNameValid: isInterfaceNameValid,
  assertInterfaceNameValid: assertInterfaceNameValid,
  isMemberNameValid: isMemberNameValid,
  assertMemberNameValid: assertMemberNameValid
};
