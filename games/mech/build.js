// Builds Mech Blaster as one self-contained page: dist/mech-blaster.html (shared code, the rules in src/engine.js, the
// pictures in src/art.js and src/art2.js, the 2.5D drawing in src/render.js, the sounds in src/audio.js, the levels from
// content/levels.json and the missing-word sentences from content/words-*.json filled in), plus dist/preview.html for
// local testing. A sentence file that is missing or broken is left out (the gates then ask numbers).
// The website (docs/ at the repository root) is assembled by the root build.js.
// Usage: node games/mech/build.js
const fs = require('fs'), path = require('path');
const inlineShared = require('../../shared/inline.js');
const dist = (f) => path.join(__dirname, 'dist', f);

function build() {
  const src = (f) => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
  const content = (f) => { const p = path.join(__dirname, 'content', f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
  const levels = content('levels.json');
  if (!levels || !Array.isArray(levels.levels) || levels.levels.length !== 50) throw new Error('content/levels.json needs 50 levels: run node games/mech/tools/genlevels.js');
  const words = [0, 1, 2].map((t) => {
    try { const d = content('words-' + t + '.json'); return d && Array.isArray(d.items) ? d.items : []; } catch (e) { console.warn('words-' + t + '.json left out: ' + e.message); return []; }
  });
  const json = (o) => JSON.stringify(o).replace(/<\//g, '<\\/');
  const out = inlineShared(src('mech.html'))
    .replace('/*__AUDIO__*/', () => src('audio.js'))
    .replace('/*__ENGINE__*/', () => src('engine.js'))
    .replace('/*__ART__*/', () => ['art.js', 'art2.js', 'render.js'].map(src).join('\n'))
    .replace('/*__LEVELS__*/null', () => json(levels))
    .replace('/*__WORDS__*/null', () => json(words));
  fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
  fs.writeFileSync(dist('mech-blaster.html'), out);
  const scripts = [...out.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  scripts.forEach((s) => { new Function(s); });
  fs.writeFileSync(dist('preview.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>' + out + '</body></html>');
  console.log('built games/mech/dist/mech-blaster.html', out.length, 'bytes,', levels.levels.length, 'levels,', words.map((w) => w.length).join('/'), 'sentences,', scripts.length, 'scripts parse ok');
  return out;
}

module.exports = build;
if (require.main === module) build();
