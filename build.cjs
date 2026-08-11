const fs = require('fs');
const src = 'src';

const css   = fs.readFileSync(src + '/style.css',   'utf8');
const synth = fs.readFileSync(src + '/synth.js',    'utf8');
const pitch = fs.readFileSync(src + '/pitch.js',    'utf8');
const staff = fs.readFileSync(src + '/staff.js',    'utf8');
const teach = fs.readFileSync(src + '/teacher.js',  'utf8');
const app   = fs.readFileSync(src + '/app.js',      'utf8');
const html  = fs.readFileSync(src + '/index.html',  'utf8');

function strip(s) {
  return s
    .replace(/^export\s+(class|function|const|let|var)/gm, '$1')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, '')
    .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
    .replace(/^import\s+['"].*?['"];?\s*$/gm, '');
}

const sharedAC = `window.getSharedAudioContext = function() {
  if (!window._sAC) {
    const AC = window.AudioContext || window.webkitAudioContext;
    window._sAC = new AC();
  }
  return window._sAC;
};
`;

const scriptBlock = '<script>\n' + sharedAC + '\n' +
  strip(synth) + '\n' +
  strip(pitch) + '\n' +
  strip(staff) + '\n' +
  strip(teach) + '\n' +
  strip(app)   + '\n' +
  '</script>';

let out = html
  .replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>')
  .replace('<script type="module" src="app.js"></script>', scriptBlock);

fs.writeFileSync('index.html', out, 'utf8');
console.log('OK ' + Math.round(out.length / 1024) + ' KB written to index.html');
