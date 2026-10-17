// Builds dist/number-dash.html (the single-file game) by inlining src/engine.js into
// src/template.html, then writes dist/preview.html (same page in a full HTML skeleton
// for local testing). Usage: node build.js
const fs = require('fs'), path = require('path');
const src = (f) => path.join(__dirname, 'src', f), dist = (f) => path.join(__dirname, 'dist', f);
const packsFile = src('packs.js');
// the engine, then the generated level packs (they add themselves to ND.LEVELS)
const eng = fs.readFileSync(src('engine.js'), 'utf8') + (fs.existsSync(packsFile) ? '\n' + fs.readFileSync(packsFile, 'utf8') : '');
const tpl = fs.readFileSync(src('template.html'), 'utf8');
if (eng.includes('</script')) throw new Error('engine contains a closing script tag');
const out = tpl.replace('/*__ENGINE__*/', () => eng);
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(dist('number-dash.html'), out);
const scripts = [...out.matchAll(/<script(?: id="nd-engine")?>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
scripts.forEach((s) => { new Function(s); });
fs.writeFileSync(dist('preview.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>' + out + '</body></html>');
console.log('built dist/number-dash.html', out.length, 'bytes,', scripts.length, 'scripts parse ok');

// ---- the hostable website in docs/ (GitHub Pages serves this folder as-is) ----
// Same page, plus a real <head> for iPad home-screen use, an app manifest, icons and an
// offline cache. Nothing here is needed by the Claude artifact version.
const crypto = require('crypto');
const web = (f) => path.join(__dirname, 'web', f), docs = (f) => path.join(__dirname, 'docs', f);
fs.mkdirSync(path.join(__dirname, 'docs'), { recursive: true });
const cut = out.indexOf('<canvas id="game"');
if (cut < 0) throw new Error('page body not found');
const version = crypto.createHash('sha1').update(out).digest('hex').slice(0, 10);
const site = [
  '<!doctype html>',
  '<html lang="en">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">',
  '<meta name="theme-color" content="#8fd1fb">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="Number Dash">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<link rel="manifest" href="manifest.webmanifest">',
  '<link rel="apple-touch-icon" href="icon-180.png">',
  '<link rel="icon" type="image/png" href="icon-192.png">',
  '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>',
  out.slice(0, cut).trim(),
  '</head>',
  '<body>',
  out.slice(cut).trim(),
  "<script>if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(function () {});</script>",
  '</body>',
  '</html>',
  ''
].join('\n');
fs.writeFileSync(docs('index.html'), site);
fs.writeFileSync(docs('sw.js'), fs.readFileSync(web('sw.js'), 'utf8').replace('__VERSION__', version));
for (const f of ['manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png']) fs.copyFileSync(web(f), docs(f));
fs.writeFileSync(docs('.nojekyll'), '');
console.log('built docs/ (website, version ' + version + ')');
