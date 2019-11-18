const Buffer = require('safe-buffer').Buffer;
const net = require('net');
const abs = require('abstract-socket');
const hexy = require('hexy').hexy;
const buffs = require('buffers');
const fs = require('fs');

function nextPacketPos(b) {
  if (b.length < 10) return -1;
  for (var i = 1; i < b.length; ++i)
    if (
      b.get(i) === 0x6c &&
      b.get(i + 3) === 1 &&
      b.get(i + 1) < 5 &&
      b.get(i + 2) < 4 &&
      b.get(i + 10) < 9
    )
      return i;
  return -1;
}

var packetfile = fs.createWriteStream('./packets.bin');

net
  .createServer(function(s) {
    var buff = '';
    var b = buffs();
    var connected = false;
    var cli = abs.createConnection('\0/tmp/dbus-WDSwP4V64O');
    s.on('data', function(d) {
      if (connected) {
        cli.write(d);
      } else {
        buff += d.toString();
      }
    });
    s.on('end', function() {
      packetfile.end(b.toBuffer());
    });
    cli.on('end', function() {
      packetfile.end(b.toBuffer());
    });
    cli.on('data', function(d) {
      console.error(hexy(d, { prefix: 'from bus   ' }));
      b.push(d);
      function extractPacket() {
        var pos = nextPacketPos(b);
        console.log('NEXT PACKET POS:', pos);
        if (pos !== -1) {
          var packet = b.splice(0, pos).toBuffer();
          console.error(
            ' ====== PACKET START ====== ',
            pos,
            packet.length,
            packet[0]
          );
          console.error(hexy(packet, { prefix: 'packet: ' }));
          console.error(' ====== PACKET END ====== ');
          if (packet[0] === 0x6c) {
            var len = Buffer.alloc(4);
            len.writeUInt32LE(packet.length, 0);
            console.error(hexy(len, { prefix: 'packet header: ' }));
            packetfile.write(len);
            packetfile.write(packet);
          }
          extractPacket();
        }
      }
      extractPacket();
    });
    console.log('connected to 3000');
    connected = true;
    cli.write(buff);
    cli.pipe(s, { end: false });
  })
  .listen(7000, '0.0.0.0');
