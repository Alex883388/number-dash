// Builds Tycoon Town as one self-contained page: dist/tycoon-town.html (shared code, the rules in src/engine.js
// and the content from content/*.json filled in), plus dist/preview.html for local testing.
// A business without written content yet is simply not offered. TYCOON_CONTENT=<folder> builds from other files.
// The website (docs/ at the repository root) is assembled by the root build.js.
// Usage: node games/tycoon/build.js
const fs = require('fs'), path = require('path');
const inlineShared = require('../../shared/inline.js');
const dist = (f) => path.join(__dirname, 'dist', f);

function build() {
  const dir = process.env.TYCOON_CONTENT || path.join(__dirname, 'content');
  const read = (f) => {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) return null;
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { console.warn(f + ' left out: ' + e.message); return null; }
  };
  const roster = read('roster.json');
  if (!roster) throw new Error('content/roster.json is missing');
  const biz = [1, 2, 3, 4].map((t) => read('biz-' + t + '.json')).filter(Boolean);
  const offers = read('offers.json');
  const data = JSON.stringify({ roster: roster, biz: biz, offers: offers }).replace(/<\//g, '<\\/');
  const engine = fs.readFileSync(path.join(__dirname, 'src', 'engine.js'), 'utf8');
  const out = inlineShared(fs.readFileSync(path.join(__dirname, 'src', 'tycoon.html'), 'utf8'))
    .replace('/*__ENGINE__*/', () => engine)
    .replace('/*__TYCOON__*/null', () => data);
  fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
  fs.writeFileSync(dist('tycoon-town.html'), out);
  const scripts = [...out.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  scripts.forEach((s) => { new Function(s); });
  fs.writeFileSync(dist('preview.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>' + out + '</body></html>');
  const n = biz.reduce((t, f) => t + (f.businesses || []).length, 0);
  console.log('built games/tycoon/dist/tycoon-town.html', out.length, 'bytes,', n, 'of', roster.businesses.length, 'businesses,', offers ? (offers.offers || []).length + ' offers,' : 'no offers,', scripts.length, 'scripts parse ok');
  return out;
}

module.exports = build;
if (require.main === module) build();
