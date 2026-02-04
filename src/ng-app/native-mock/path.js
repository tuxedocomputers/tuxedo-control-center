module.exports = {
  join: (...args) => args.join('/'),
  resolve: (...args) => args.join('/'),
  dirname: (p) => p.substring(0, p.lastIndexOf('/')),
  basename: (p) => p.substring(p.lastIndexOf('/') + 1),
  extname: (p) => p.substring(p.lastIndexOf('.')),
  sep: '/'
};
