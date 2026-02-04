module.exports = {
  existsSync: () => true,
  readFileSync: (p) => {
    if (typeof p === 'string') {
      if (p.includes('/possible') || p.includes('/present') || p.includes('/online')) return '0-7';
      if (p.includes('scaling_driver')) return 'intel_pstate';
      if (p.includes('cpuinfo_min_freq')) return '800000';
      if (p.includes('cpuinfo_max_freq')) return '4000000';
      if (p.includes('scaling_cur_freq')) return '2000000';
      if (p.includes('scaling_governor')) return 'powersave';
    }
    return '';
  },
  writeFileSync: () => {},
  readFile: (path, cb) => cb && cb(null, ''),
  writeFile: (path, data, cb) => cb && cb(null),
  readdirSync: () => [],
  statSync: () => ({ isDirectory: () => false }),
  promises: {
    readFile: () => Promise.resolve(''),
    writeFile: () => Promise.resolve(),
    readdir: () => Promise.resolve([]),
    stat: () => Promise.resolve({ isDirectory: () => false })
  }
};
