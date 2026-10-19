// Builds Castle Crew as one page: dist/castle-crew.html (the shared arcade code, the rules src/engine.js, the bot
// src/bot.js, the link between devices src/net.js, the 3D view src/view.js and the levels content/levels.json filled
// in), plus dist/preview.html (the same page in a full HTML skeleton for local testing). three.js and PeerJS load from
// the CDN at run time (the arcade's offline cache keeps them). The website is assembled by the root build.js.
// Usage: node games/castle/build.js
const fs = require('fs'), path = require('path');
const inlineShared = require('../../shared/inline.js');
const dist = (f) => path.join(__dirname, 'dist', f);
// a file of src/ without its header comment and its line for Node (module.exports)
const part = (name) => fs.readFileSync(path.join(__dirname, 'src', name + '.js'), 'utf8')
  .replace(/^\/\* games\/castle\/[\s\S]*?\*\/\r?\n/, '').replace(/\r?\nif \(typeof module[^\n]*\r?\n?$/, '').replace(/\r?\n$/, '');

function build() {
  const levels = JSON.parse(fs.readFileSync(path.join(__dirname, 'content', 'levels.json'), 'utf8')).levels;
  let out = inlineShared(fs.readFileSync(path.join(__dirname, 'src', 'castle.html'), 'utf8'));
  for (const name of ['engine', 'bot', 'net', 'view']) out = out.replace('/*__CASTLE:' + name + '__*/', () => part(name));
  out = out.replace('/*__CASTLE:levels__*/null', () => JSON.stringify(levels).replace(/<\//g, '<\\/'));
  if (out.indexOf('__CASTLE:') >= 0) throw new Error('a CASTLE marker was not filled');
  fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
  fs.writeFileSync(dist('castle-crew.html'), out);
  const scripts = [...out.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  scripts.forEach((s) => { new Function(s); });
  fs.writeFileSync(dist('preview.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>' + out + '</body></html>');
  console.log('built games/castle/dist/castle-crew.html', out.length, 'bytes,', levels.length, 'levels,', scripts.length, 'scripts parse ok');
  return out;
}

module.exports = build;
if (require.main === module) build();
