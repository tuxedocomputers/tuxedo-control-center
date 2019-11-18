const addrx11 = require('../../lib/address-x11');

process.env.DISPLAY = ':0';
addrx11(function(err, address) {
  console.log(address);
  process.exit(0);
});
