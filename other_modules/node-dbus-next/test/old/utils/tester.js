const fs = require('fs');
const binarystream = require('binary');
const EventEmitter = require('events').EventEmitter;
const message = require('../../lib/message');
const hexy = require('hexy').hexy;

const packets = fs.readFileSync('./packets.bin');

function nextPacketPos(b) {
  console.log(hexy(b, { prefix: 'SEARCHING : ' }));
  if (b.length < 10) {
    console.log('TOO SHORT');
    return -1;
  }
  for (var i = 1; i < b.length; ++i) {
    if (b.get(i) === 0x6c) {
      console.log(
        `possible match at ${i}`,
        b.get(i + 3),
        b.get(i + 1),
        b.get(i + 2),
        b.get(i + 8)
      );
      if (
        b.get(i + 3) === 1 &&
        b.get(i + 1) < 5 &&
        b.get(i + 2) < 4 &&
        b.get(i + 8) < 9
      )
        return i;
    }
  }
  return -1;
}

function readPacket(offset, data) {
  if (offset > data.length) return;
  console.log(' ======********====== START : ', offset, data.length);
  console.log(
    hexy(data.slice(offset, offset + 48 * 8), { prefix: 'BODY BODY: ' })
  );
  console.log(nextPacketPos(data.slice(offset, offset + 400)));
  process.exit(0);
  var len = data.readUInt32LE(offset);
  var packet;
  if (len > 100000) {
    packet = data.slice(offset, data.length);
    console.log(hexy(packet, { prefix: 'packet: ' }));
  } else {
    console.log('SLICING:', len, offset + 4, offset + len + 4);
    packet = data.slice(offset + 4, offset + len + 4);
    console.log(hexy(packet, { prefix: 'packet: ' }));
  }
  var dbus = new EventEmitter();
  var stream = binarystream.parse(packet);
  dbus.on('message', function(msg) {
    console.log(msg);
    console.log(
      '==================== ',
      data.length,
      offset,
      4 + packet.length
    );
    readPacket(offset + 4 + packet.length, data);
  });
  dbus.on('header', function(msg) {
    console.log('header: ', msg);
    if (msg.signature.length > 1) {
    }
  });
  message.read.call(stream, dbus);
}

readPacket(0x02e0 + 15 * 9 - 1, packets);
