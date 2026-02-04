module.exports = {
  exec: (cmd, cb) => cb && cb(null, '', ''),
  execSync: (cmd) => '',
  spawn: () => ({
    stdout: { on: () => {} },
    stderr: { on: () => {} },
    on: () => {},
    kill: () => {}
  })
};

