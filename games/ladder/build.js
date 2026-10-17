// Builds Number Ladder as one self-contained page: dist/number-ladder.html (shared code filled
// in), plus dist/preview.html (the same page in a full HTML skeleton for local testing).
// The website (docs/ at the repository root) is assembled by the root build.js.
// Usage: node games/ladder/build.js
const fs = require('fs'), path = require('path');
const inlineShared = require('../../shared/inline.js');
const dist = (f) => path.join(__dirname, 'dist', f);

function build() {
  const out = inlineShared(fs.readFileSync(path.join(__dirname, 'src', 'ladder.html'), 'utf8'));
  fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
  fs.writeFileSync(dist('number-ladder.html'), out);
  const scripts = [...out.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  scripts.forEach((s) => { new Function(s); });
  fs.writeFileSync(dist('preview.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>' + out + '</body></html>');
  console.log('built games/ladder/dist/number-ladder.html', out.length, 'bytes,', scripts.length, 'scripts parse ok');
  return out;
}

module.exports = build;
if (require.main === module) build();
