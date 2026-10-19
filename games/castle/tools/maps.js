// Castle Crew's maps, checked and drawn as text (run from the repo root):
//   node games/castle/tools/maps.js            every map: checks, road lengths and a picture
//   node games/castle/tools/maps.js frozen     one map
// Checks: odd sizes; every road runs in straight lines from a gate on the map's edge to a castle door; no road
// through the castle or off the map; room to build beside each road. Exits 1 on a problem.
global.CC = require('../src/engine.js');
const { maps } = require('../content/maps.json');
const only = process.argv[2];
const T = CC.T, CH = { [T.GRASS]: '.', [T.DIRT]: '=', [T.SAND]: ',', [T.WATER]: '~', [T.TREE]: 'T', [T.ROCK]: 'R', [T.CASTLE]: 'C', [T.SPAWN]: 'G', [T.BRIDGE]: '#' };
let bad = 0;
const fail = (id, why) => { console.log('FAIL ' + id + ': ' + why); bad++; };
for (const def of maps) {
  if (only && def.id !== only) continue;
  const w = def.w, h = def.h, cx = (w - 1) / 2, cz = (h - 1) / 2;
  if (w % 2 === 0 || h % 2 === 0) fail(def.id, 'w and h must be odd');
  const doors = [[cx, cz - 3], [cx, cz + 3], [cx - 3, cz], [cx + 3, cz]].map((d) => d.join(','));
  def.paths.forEach((pts, k) => {
    const [x0, y0] = pts[0];
    if (!(x0 === 0 || y0 === 0 || x0 === w - 1 || y0 === h - 1)) fail(def.id, 'road ' + (k + 1) + ' does not start on the edge');
    if (doors.indexOf(pts[pts.length - 1].join(',')) < 0) fail(def.id, 'road ' + (k + 1) + ' does not end at a castle door (' + doors.join(' ') + ')');
    for (let j = 1; j < pts.length; j++) {
      const [ax, ay] = pts[j - 1], [bx, by] = pts[j];
      if (ax !== bx && ay !== by) fail(def.id, 'road ' + (k + 1) + ' bends between ' + pts[j - 1] + ' and ' + pts[j]);
      for (const [x, y] of [[ax, ay], [bx, by]]) if (x < 0 || y < 0 || x >= w || y >= h) fail(def.id, 'road ' + (k + 1) + ' leaves the map at ' + x + ',' + y);
      const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      for (let q = 0; q <= n; q++) { const x = ax + Math.sign(bx - ax) * q, y = ay + Math.sign(by - ay) * q; if (Math.abs(x - cx) <= 2 && Math.abs(y - cz) <= 2) fail(def.id, 'road ' + (k + 1) + ' runs into the castle at ' + x + ',' + y); }
    }
  });
  const m = CC.makeMap(def);
  // room to build: grass or sand next to each road
  let spots = 0;
  for (let i = 0; i < m.tiles.length; i++) {
    if (!CC.BUILD_OK[m.tiles[i]]) continue;
    const x = i % w, y = (i - x) / w;
    let byRoad = false;
    for (let dy = -2; dy <= 2 && !byRoad; dy++) for (let dx = -2; dx <= 2; dx++) { const t = m.tiles[(y + dy) * w + x + dx]; if (x + dx >= 0 && y + dy >= 0 && x + dx < w && y + dy < h && (t === T.DIRT || t === T.BRIDGE)) { byRoad = true; break; } }
    if (byRoad) spots++;
  }
  const lens = m.paths.map((P) => Math.round(P.road.len));
  console.log('\n' + def.id + ' "' + def.name + '" (' + def.tier + ', ' + def.theme + ') ' + w + 'x' + h + ': ' + m.paths.length + ' road' + (m.paths.length > 1 ? 's' : '') + ' of ' + lens.join(', ') + ' tiles (all ' + lens.reduce((a, b) => a + b, 0) + '), ' + spots + ' spots to build within 2 of a road');
  if (spots < 40) fail(def.id, 'little room to build (' + spots + ')');
  if (!only || only === def.id) {
    const rows = [];
    for (let y = 0; y < h; y++) { let r = ''; for (let x = 0; x < w; x++) r += CH[m.tiles[y * w + x]]; rows.push('  ' + r); }
    console.log(rows.join('\n'));
  }
}
console.log(bad ? '\n' + bad + ' problems' : '\nall maps fine');
process.exit(bad ? 1 : 0);
