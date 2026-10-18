// Builds Code Robot as one self-contained page: dist/code-robot.html (shared code, the interpreter src/engine.js and
// the worlds and levels from content/ filled in), plus dist/preview.html (the same page in a full HTML skeleton for
// local testing). The website (docs/ at the repository root) is assembled by the root build.js.
// Usage: node games/robot/build.js
const fs = require('fs'), path = require('path');
const inlineShared = require('../../shared/inline.js');
const dist = (f) => path.join(__dirname, 'dist', f);
// a file of src/ without its header comment and its line for Node (module.exports)
const part = (name) => fs.readFileSync(path.join(__dirname, 'src', name + '.js'), 'utf8')
  .replace(/^\/\* games\/robot\/[\s\S]*?\*\/\r?\n/, '').replace(/\r?\nif \(typeof module[^\n]*\r?\n?$/, '').replace(/\r?\n$/, '');
// the worlds in playing order and every level, as data for the page
function levels() {
  const { ROBOT_WORLDS, ROBOT_LEVELS } = require('./src/levels.js').load();   // a broken file stops the build
  const js = (v) => JSON.stringify(v).replace(/<\//g, '<\\/');
  return 'const ROBOT_WORLDS = ' + js(ROBOT_WORLDS) + ';\nconst ROBOT_LEVELS = ' + js(ROBOT_LEVELS) + ';';
}

function build() {
  const out = inlineShared(fs.readFileSync(path.join(__dirname, 'src', 'robot.html'), 'utf8'))
    .replace('/*__ROBOT:engine__*/', () => part('engine')).replace('/*__ROBOT:levels__*/', () => levels());
  if (out.indexOf('__ROBOT:') >= 0) throw new Error('a ROBOT marker was not filled');
  fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
  fs.writeFileSync(dist('code-robot.html'), out);
  const scripts = [...out.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  scripts.forEach((s) => { new Function(s); });
  fs.writeFileSync(dist('preview.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>' + out + '</body></html>');
  console.log('built games/robot/dist/code-robot.html', out.length, 'bytes,', scripts.length, 'scripts parse ok');
  return out;
}

module.exports = build;
if (require.main === module) build();
