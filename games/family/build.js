// Builds Family Fighters as one page: dist/family-fighters.html (the shared arcade code, the sounds src/audio.js, the
// rules src/engine.js, the drawings src/art.js, the scenery and frame src/scene.js, the link between devices
// src/net.js, the ten places content/levels.json, the world questions content/world-*.json and the missing-word
// sentences shared with Mech Blaster filled in), plus dist/preview.html (the same page in a full HTML skeleton for local
// testing). PeerJS loads from the CDN when a crew game starts (the arcade's offline cache keeps it). A question file
// that is missing or broken is left out (those questions are then maths). The website is assembled by the root build.js.
// Usage: node games/family/build.js
const fs = require('fs'), path = require('path');
const inlineShared = require('../../shared/inline.js');
const dist = (f) => path.join(__dirname, 'dist', f);
// a file of src/ without its header comment and its line for Node (module.exports)
const part = (name) => fs.readFileSync(path.join(__dirname, 'src', name + '.js'), 'utf8')
  .replace(/^\/\* games\/family\/[\s\S]*?\*\/\r?\n/, '').replace(/\r?\nif \(typeof module[^\n]*\r?\n?$/, '').replace(/\r?\n$/, '');
const json = (v) => JSON.stringify(v).replace(/<\//g, '<\\/');
function bank(file) {
  try {
    const p = path.join(__dirname, file);
    if (!fs.existsSync(p)) return [];
    const d = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(d.items) ? d.items : [];
  } catch (e) { console.warn(file + ' left out: ' + e.message); return []; }
}

function build() {
  const levels = JSON.parse(fs.readFileSync(path.join(__dirname, 'content', 'levels.json'), 'utf8')).levels;
  if (!Array.isArray(levels) || levels.length !== 10) throw new Error('content/levels.json needs 10 places: run node games/family/tools/genlevels.js');
  const world = [0, 1, 2].map((t) => bank('content/world-' + t + '.json'));
  const words = [0, 1, 2].map((t) => bank('../mech/content/words-' + t + '.json'));
  let out = inlineShared(fs.readFileSync(path.join(__dirname, 'src', 'family.html'), 'utf8'));
  for (const name of ['audio', 'engine', 'art', 'scene', 'net']) out = out.replace('/*__FF:' + name + '__*/', () => part(name));
  out = out.replace('/*__FF:levels__*/null', () => json(levels)).replace('/*__FF:world__*/null', () => json(world)).replace('/*__FF:words__*/null', () => json(words));
  if (out.indexOf('__FF:') >= 0) throw new Error('an FF marker was not filled');
  fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
  fs.writeFileSync(dist('family-fighters.html'), out);
  const scripts = [...out.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  scripts.forEach((s) => { new Function(s); });
  fs.writeFileSync(dist('preview.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>' + out + '</body></html>');
  console.log('built games/family/dist/family-fighters.html', out.length, 'bytes,', levels.length, 'places,', world.map((w) => w.length).join('/'), 'world questions,', words.map((w) => w.length).join('/'), 'sentences,', scripts.length, 'scripts parse ok');
  return out;
}

module.exports = build;
if (require.main === module) build();
