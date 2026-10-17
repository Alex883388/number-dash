// Builds English Quest as one self-contained page: dist/english-quest.html (shared code and the
// lesson content from content/stage-*.json filled in), plus dist/preview.html for local testing.
// A stage without a file yet shows as "coming soon". QUEST_CONTENT=<folder> builds from other files.
// The website (docs/ at the repository root) is assembled by the root build.js.
// Usage: node games/quest/build.js
const fs = require('fs'), path = require('path');
const inlineShared = require('../../shared/inline.js');
const dist = (f) => path.join(__dirname, 'dist', f);

function build() {
  const dir = process.env.QUEST_CONTENT || path.join(__dirname, 'content');
  const stages = [1, 2, 3, 4, 5, 6, 7].map((n) => {
    const f = path.join(dir, 'stage-' + n + '.json');
    if (!fs.existsSync(f)) return null;
    try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.warn('stage ' + n + ' left out: ' + e.message); return null; }
  });
  const json = JSON.stringify(stages).replace(/<\//g, '<\\/');
  // speaking cue cards (optional file): content/speaking.json
  const sf = path.join(dir, 'speaking.json');
  let speaking = null; try { if (fs.existsSync(sf)) speaking = JSON.parse(fs.readFileSync(sf, 'utf8')).cards; } catch (e) { console.warn('speaking cards left out: ' + e.message); }
  const out = inlineShared(fs.readFileSync(path.join(__dirname, 'src', 'quest.html'), 'utf8')).replace('/*__CONTENT__*/null', () => json)
    .replace('/*__SPEAKING__*/null', () => JSON.stringify(speaking).replace(/<\//g, '<\\/'));
  fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
  fs.writeFileSync(dist('english-quest.html'), out);
  const scripts = [...out.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  scripts.forEach((s) => { new Function(s); });
  fs.writeFileSync(dist('preview.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>' + out + '</body></html>');
  console.log('built games/quest/dist/english-quest.html', out.length, 'bytes,', stages.filter(Boolean).length, 'of 7 stages,', speaking ? speaking.length + ' speaking cards,' : 'no speaking cards,', scripts.length, 'scripts parse ok');
  return out;
}

module.exports = build;
if (require.main === module) build();
