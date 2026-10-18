// Code Robot's content files in one tidy layout: content/worlds.json (the worlds in playing order) and one
// content/world-<id>.json per world ({ "world": id, "levels": [...] }, format in content/FORMAT.md).
// Usage: node games/robot/tools/content.js format   rewrites every world file in the tidy layout (same data)
const fs = require('fs'), path = require('path');
const DIR = process.env.CODE_ROBOT_CONTENT || path.join(__dirname, '..', 'content');
const FIRST = ['id', 'name', 'mode', 'pal', 'max', 'par', 'n0'];   // on the level's first line
const LINES = ['sol', 'alt', 'start', 'fix', 'prog', 'map', 'hint']; // one line each, in this order

function levelText(L) {
  const q = (v) => JSON.stringify(v);
  const head = FIRST.filter((k) => L[k] !== undefined).map((k) => q(k) + ': ' + q(L[k])).join(', ');
  const rest = LINES.concat(Object.keys(L).filter((k) => FIRST.indexOf(k) < 0 && LINES.indexOf(k) < 0))
    .filter((k) => L[k] !== undefined).map((k) => '      ' + q(k) + ': ' + (k === 'map' ? '[' + L.map.map(q).join(', ') + ']' : q(L[k])));
  return '    {\n      ' + head + (rest.length ? ',\n' + rest.join(',\n') : '') + '\n    }';
}
function worldText(id, levels) {
  return '{\n  "world": ' + id + ',\n  "levels": [\n' + levels.map(levelText).join(',\n') + '\n  ]\n}\n';
}
const fileOf = (id) => path.join(DIR, 'world-' + id + '.json');
function readWorld(id) { return JSON.parse(fs.readFileSync(fileOf(id), 'utf8')); }
function writeWorld(id, levels) { fs.writeFileSync(fileOf(id), worldText(id, levels)); }

module.exports = { DIR: DIR, levelText: levelText, worldText: worldText, fileOf: fileOf, readWorld: readWorld, writeWorld: writeWorld };

if (require.main === module) {
  if (process.argv[2] !== 'format') { console.log('usage: node games/robot/tools/content.js format'); process.exit(1); }
  const files = fs.readdirSync(DIR).filter((f) => /^world-\d+\.json$/.test(f));
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    writeWorld(data.world, data.levels);
  }
  console.log('formatted ' + files.length + ' world files');
}
