import * as process from 'process';
import * as readline from 'readline';
import { SIGINT, SIGTERM } from 'constants';

const dataList: string[] = [];

process.stdin.on('data', (dataChunk: Buffer) => {
    dataList.push(dataChunk.toString());
});

process.on('SIGINT', () => {
    const data = dataList.join('');
    const lines: string[] = data.split('\n');
    let pairs = lines.map(line => line.split(RegExp('[ \t]+')));
    pairs = pairs.filter(pair => pair.length === 2);
    const stringEntries = pairs.map(pair => ({ temp: pair[0].trim(), speed: pair[1].trim() }));
    for (const entry of stringEntries) {
        if (entry.speed === '') { entry.speed = '0'; }
        process.stdout.write('{ temp: ' + entry.temp + ', speed: ' + entry.speed + ' },\n');
    }
    process.exit(SIGINT);
});
