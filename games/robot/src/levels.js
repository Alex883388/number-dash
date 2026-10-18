/* games/robot/src/levels.js — loads Code Robot's worlds (content/worlds.json, in playing order) and their levels
   (content/world-<id>.json, format in content/FORMAT.md) for Node: the checker, the tools and the build, which writes
   them into the page as ROBOT_WORLDS and ROBOT_LEVELS. A world without its file yet is left out.
   CODE_ROBOT_CONTENT=<folder> loads from another folder. load(dir, { lenient: true }) also leaves out a world whose file
   does not read (its error goes to .errors) instead of stopping. */
const fs = require('fs'), path = require('path');
function load(dir, opts) {
  dir = dir || process.env.CODE_ROBOT_CONTENT || path.join(__dirname, '..', 'content');
  opts = opts || {};
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'worlds.json'), 'utf8'));
  const worlds = [], levels = [], errors = [];
  for (const id of meta.order) {
    const W = meta.worlds.find((x) => x.id === id), f = path.join(dir, 'world-' + id + '.json');
    if (!W) throw new Error('worlds.json: world ' + id + ' is in the order but not in the list');
    if (!fs.existsSync(f)) continue;
    let data;
    try {
      data = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (data.world !== id) throw new Error('"world" says ' + data.world);
      if (!Array.isArray(data.levels)) throw new Error('no "levels" list');
    } catch (e) {
      if (!opts.lenient) throw new Error('world-' + id + '.json: ' + e.message);
      errors.push({ world: id, message: 'world-' + id + '.json: ' + e.message });
      continue;
    }
    worlds.push(W);
    data.levels.forEach((L) => levels.push(L));
  }
  return { ROBOT_WORLDS: worlds, ROBOT_LEVELS: levels, errors: errors };
}
module.exports = { load: load };
