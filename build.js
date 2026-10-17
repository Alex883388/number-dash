// Builds Number Arcade: every game's single-file page (games/*/dist/) and the website in docs/
// that GitHub Pages serves: the arcade home at the top, one folder per game, a shared app
// manifest and icon, and an offline cache that covers everything.
// Usage: node build.js
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = (...p) => path.join(__dirname, ...p);

const GAMES = ['dash', 'ladder', 'pair', 'pop', 'spell', 'quest'].map((dir) => ({ dir: dir, html: require('./games/' + dir + '/build.js')() }));
const hub = fs.readFileSync(root('web', 'hub.html'), 'utf8');

// one page of the site: a real <head> for iPad home-screen use around a game's own head and body
function sitePage(html, base) {
  let cut = html.indexOf('<!--BODY-->');
  if (cut < 0) cut = html.indexOf('<canvas id="game"');
  if (cut < 0) throw new Error('page body not found');
  const head = html.slice(0, cut).trim(), body = html.slice(cut).replace('<!--BODY-->', '').trim();
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">',
    '<meta name="theme-color" content="#8fd1fb">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-title" content="Number Arcade">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
    '<link rel="manifest" href="' + base + 'manifest.webmanifest">',
    '<link rel="apple-touch-icon" href="' + base + 'icon-180.png">',
    '<link rel="icon" type="image/png" href="' + base + 'icon-192.png">',
    '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>',
    base === './' ? '' : '<script>window.ARCADE_HOME = "' + base + '";</script>',
    head,
    '</head>',
    '<body>',
    body,
    "<script>if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('" + base + "sw.js').catch(function () {});</script>",
    '</body>',
    '</html>',
    ''
  ].filter((line) => line !== '').join('\n') + '\n';
}

const docs = root('docs');
fs.mkdirSync(docs, { recursive: true });
const pages = [['index.html', sitePage(hub, './')]];
for (const g of GAMES) { fs.mkdirSync(path.join(docs, g.dir), { recursive: true }); pages.push([g.dir + '/index.html', sitePage(g.html, '../')]); }
for (const [file, html] of pages) fs.writeFileSync(path.join(docs, file), html);
const version = crypto.createHash('sha1').update(pages.map((p) => p[1]).join('')).digest('hex').slice(0, 10);
fs.writeFileSync(path.join(docs, 'sw.js'), fs.readFileSync(root('web', 'sw.js'), 'utf8').replace('__VERSION__', version));
for (const f of ['manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png']) fs.copyFileSync(root('web', f), path.join(docs, f));
fs.writeFileSync(path.join(docs, '.nojekyll'), '');
console.log('built docs/: home + ' + GAMES.map((g) => g.dir).join(', ') + ' (version ' + version + ')');
