#!/usr/bin/env node

const fs = require('fs');
const xml2js = require('xml2js');
const Handlebars = require('handlebars');
let parser = new xml2js.Parser();

var program = require('commander');

program
  .version('0.0.1')
  .description('Generate a dbus-next JavaScript interface from an xml DBus interface description.')
  .arguments('<interface_xml..>')
  .option('-o, --output [path]', 'The output file path for JavaScript classes (default: stdout)')
  .parse(process.argv);

const templateData = `
let dbus = require('dbus-next');
let Variant = dbus.Variant;

let {
  Interface, property, method, signal, DBusError,
  ACCESS_READ, ACCESS_WRITE, ACCESS_READWRITE
} = dbus.interface;

{{#each interfaces}}
module.exports.{{className $.name}} = class {{className $.name}} extends Interface {
  constructor() {
    super('{{$.name}}');
  }

  {{#each property}}
  @property({ name: '{{$.name}}', signature: '{{$.type}}', access: {{accessConst $.access}} })
  get {{$.name}}() {
    // TODO implement property getter for {{$.name}}
  }

  set {{$.name}}(value) {
    // TODO implement property setter for {{$.name}}
  }

  {{/each}}

  {{#each method}}
  @method({ name: '{{$.name}}', inSignature: '{{inSignature arg}}', outSignature: '{{outSignature arg}}' })
  {{$.name}}() {
    // TODO implement the {{$.name}} method
  }

  {{/each}}
  {{#each signal}}
  @signal({ name: '{{$.name}}', signature: '{{signature arg}}' })
  {{$.name}}() {
    // TODO implement the {{$.name}} signal
  }

  {{/each}}
}

{{/each}}
`;

function collapseSignature(args, dir) {
  signature = '';
  args = args || [];
  for (arg of args) {
    if (!dir || arg['$'].direction === dir) {
      signature += arg['$'].type;
    }
  }
  return signature;
}

const helpers = {
  className(ifaceName) {
    let name = ifaceName.split('');
    name[0] = name[0].toUpperCase();
    let dots = 0;
    for (let i = 0; i < name.length - dots; ++i) {
      if (name[i+dots] === '.') {
        name[i] = name[i+dots+1].toUpperCase();
        ++dots;
      } else {
        name[i] = name[i+dots];
      }
    }

    return name.slice(0, -1 * dots).join('');
  },
  accessConst(access) {
    if (access === 'read') {
      return 'ACCESS_READ';
    } else if (access === 'write') {
      return 'ACCESS_WRITE';
    } else if (access === 'readwrite') {
      return 'ACCESS_READWRITE';
    } else {
      throw new Error(`got unknown access: ${access}`);
    }
  },
  inSignature(args) {
    return collapseSignature(args, 'in');
  },
  outSignature(args) {
    return collapseSignature(args, 'out');
  },
  signature(args) {
    return collapseSignature(args);
  },
  countArgs(args, dir) {
    let count = 0;
    for (arg of args) {
      if (!dir || arg['$'].direction === dir) {
        count++;
      }
    }
    return count;
  }
};

Handlebars.registerHelper(helpers);

async function parseXml(data) {
  return new Promise((resolve, reject) => {
    parser.parseString(data, (err, xml) => {
      if (err) {
        reject(err);
      }
      resolve(xml);
    })
  });
}

async function templateXmlFiles(template, files) {
  let result = '';

  let interfaces = [];
  for (let file of files) {
    let data = fs.readFileSync(file);

    let xml = await parseXml(data);
    if (!xml.node) {
      console.error('xml document did not contain a root node')
      process.exit(1);
    }
    if (!xml.node.interface) {
      console.error('xml document did not contain any interfaces');
      process.exit(1);
    }

    for (iface of xml.node.interface) {
      if (!iface['$'] || !iface['$'].name) {
        console.log('got an interface without a name')
        process.exit(1);
      }
    }

    for (iface of xml.node.interface) {
      if (iface['$'].name.startsWith('org.freedesktop.DBus.')) {
        // ignore standard interfaces
        continue;
      }
      interfaces.push(iface);
    }

    result += template({ interfaces: interfaces });
  }

  return result;
}

async function main() {
  if (program.args.length === 0) {
    program.outputHelp();
    process.exit(1);
  }

  let template = Handlebars.compile(templateData);
  let result = await templateXmlFiles(template, program.args);

  if (program.output) {
    fs.writeFileSync(program.output, result);
  } else {
    console.log(result);
  }
  return 0;
}

main()
  .then(status => {
    process.exit(status || 0);
  })
  .catch(error => {
    console.log(error);
    process.exit(1);
  });
