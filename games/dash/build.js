// Builds Number Dash as one self-contained page: dist/number-dash.html. It fills the shared
// code into src/template.html, inlines src/engine.js and the generated level packs, then writes
// dist/preview.html (the same page in a full HTML skeleton for local testing).
// The website (docs/ at the repository root) is assembled by the root build.js.
// Usage: node games/dash/build.js
const fs = require('fs'), path = require('path');
const inlineShared = require('../../shared/inline.js');
const src = (f) => path.join(__dirname, 'src', f), dist = (f) => path.join(__dirname, 'dist', f);

function build() {
  const packsFile = src('packs.js');
  // the engine, then the generated level packs (they add themselves to ND.LEVELS)
  const eng = fs.readFileSync(src('engine.js'), 'utf8') + (fs.existsSync(packsFile) ? '\n' + fs.readFileSync(packsFile, 'utf8') : '');
  const tpl = inlineShared(fs.readFileSync(src('template.html'), 'utf8'));
  if (eng.includes('</script')) throw new Error('engine contains a closing script tag');
  const out = tpl.replace('/*__ENGINE__*/', () => eng);
  fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
  fs.writeFileSync(dist('number-dash.html'), out);
  const scripts = [...out.matchAll(/<script(?: id="nd-engine")?>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  scripts.forEach((s) => { new Function(s); });
  fs.writeFileSync(dist('preview.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>' + out + '</body></html>');
  console.log('built games/dash/dist/number-dash.html', out.length, 'bytes,', scripts.length, 'scripts parse ok');
  return out;
}

module.exports = build;
if (require.main === module) build();
