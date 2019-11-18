#!/usr/bin/env node
let dbus = require('../');
let program = require('commander');

const MPRIS_IFACE = 'org.mpris.MediaPlayer2.Player';
const MPRIS_PATH = '/org/mpris/MediaPlayer2';
const PROPERTIES_IFACE = 'org.freedesktop.DBus.Properties';

async function listAll() {
  let result = [];
  let bus = dbus.sessionBus();
  let obj = await bus.getProxyObject('org.freedesktop.DBus', '/org/freedesktop/DBus');
  let iface = obj.getInterface('org.freedesktop.DBus');
  let names = await iface.ListNames();
  for (let n of names) {
    if (n.startsWith('org.mpris.MediaPlayer2.')) {
      result.push(n);
    }
  }
  return result;
}

function printEpilogue() {
  console.log('');
  console.log('Commands:');
  console.log('  play, pause, stop, metadata, now-playing');
}

program
  .version('0.0.1')
  .arguments('<command>')
  .option('-p, --player <player>', 'The player to control')
  .option('-l, --list-all', 'List all players and exit');

program.on('--help', printEpilogue);
program.parse(process.argv)

if (!program.listAll && !program.args.length) {
  program.outputHelp();
  printEpilogue();
  process.exit(0);
}

async function printNames() {
  let names = await listAll();
  for (let n of names) {
    console.log(n);
  }
}

function printMetadata(metadata) {
  for (k of Object.keys(metadata.value)) {
    let value = metadata.value[k].value;
    console.log(k.padEnd(23) + value);
  }
}

let lastNowPlaying = '';

function printNowPlaying(metadata) {
  let artistVariant = metadata.value['xesam:artist'];
  let titleVariant = metadata.value['xesam:title'];
  let artist = artistVariant ? artistVariant.value : 'unknown';
  let title = titleVariant ? titleVariant.value : 'unknown';
  let nowPlaying = `${artist} - ${title}`;

  if (lastNowPlaying !== nowPlaying) {
    console.log(nowPlaying);
    lastNowPlaying = nowPlaying;
  }
}

async function nowPlaying(obj) {
  return new Promise(resolve => {
    let props = obj.getInterface(PROPERTIES_IFACE);
    props.on('PropertiesChanged', (iface, changed, invalidated) => {
      if (changed.hasOwnProperty('Metadata')) {
        printNowPlaying(changed['Metadata']);
      }
    });
  });
}

async function main() {
  if (program.listAll) {
    await printNames();
    return 0;
  }

  let command = program.args[0];
  if (['play', 'pause', 'stop', 'metadata', 'now-playing'].indexOf(command) === -1) {
    program.outputHelp();
    printEpilogue();
    return 1;
  }

  let playerName = program.player;
  if (!playerName) {
    let names = await listAll();
    if (!names.length) {
      console.error('no players found');
      return 1;
    }
    playerName = names[0];
  }
  if (!playerName.startsWith('org.mpris.MediaPlayer2')) {
    playerName = `org.mpris.MediaPlayer2.${program.player}`;
  }

  let bus = dbus.sessionBus();
  let obj = await bus.getProxyObject(playerName, MPRIS_PATH);
  let player = obj.getInterface(MPRIS_IFACE);
  let props = obj.getInterface(PROPERTIES_IFACE);

  switch (command) {
    case 'play':
      await player.Play();
      break;
    case 'pause':
      await player.Pause();
      break;
    case 'stop':
      await player.Stop();
      break;
    case 'metadata': {
      let metadata = await props.Get(MPRIS_IFACE, 'Metadata');
      printMetadata(metadata);
      break;
    }
    case 'now-playing': {
      let metadata = await props.Get(MPRIS_IFACE, 'Metadata');
      printNowPlaying(metadata);
      await nowPlaying(obj);
      // doesnt return
      break;
    }
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
