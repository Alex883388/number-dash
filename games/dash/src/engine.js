/* Number Dash engine: level parsing and deterministic physics. No DOM here,
   so the level checker (check.js) can run the exact same rules in Node. */
(function (root) {
  'use strict';

  var PHYS = {
    DT: 1 / 240,
    G: 78, JUMP_V: 18.75, MAX_FALL: 26,
    PAD_V: 26, ORB_V: 18.75, BLUE_V: 7,
    SHIP_ACC: 32, SHIP_MAX: 8, SHIP_H: 0.7,
    BALL_G: 70, BALL_MAX: 22, BALL_KICK: 6,
    UFO_V: 11, UFO_G: 45, UFO_MAX: 12, UFO_H: 0.8,
    WAVE_H: 0.5,
    MINI: 0.6, MINI_JUMP: 0.8,
    PINK: 0.72, RED: 1.3, GREEN_V: 15,
    SLOW: 0.75, FAST: 1.3,
    CUBE_SNAP: 0.3, SHIP_SNAP: 0.2,
    COYOTE: 0.07, BUFFER: 0.1, ORB_BUFFER: 0.1,
    BPB: 6,          // blocks travelled per music beat
    H: 24,           // level height in blocks
    RUNOUT: 40       // empty columns after the map
  };

  // ---------- stamps: little ASCII canvases the levels are built from ----------
  function Stamp(w, h) {
    this.w = w; this.h = h; this.c = [];
    for (var r = 0; r < h; r++) { var row = []; for (var x = 0; x < w; x++) row.push('.'); this.c.push(row); }
  }
  Stamp.prototype.set = function (x, y, ch) {
    if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.c[this.h - 1 - y][x] = ch;
    return this;
  };
  Stamp.prototype.fill = function (x0, y0, x1, y1, ch) {
    for (var x = x0; x <= x1; x++) for (var y = y0; y <= y1; y++) this.set(x, y, ch);
    return this;
  };
  Stamp.prototype.rows = function () { return this.c.map(function (r) { return r.join(''); }); };

  // Two-lane math fork for the cube: jump onto the shelf for the top answer,
  // stay low and slide through the tunnel for the bottom answer.
  function cubeGate(o) {
    o = o || {};
    var len = o.len || 11, w = len + 4, s = new Stamp(w, 6);
    s.fill(0, 1, len, 1, '#');
    s.set(0, 1, 'Y');
    s.set(2, 3, 'x');
    s.fill(len, 2, len, 5, '1');
    s.set(len, 0, '2');
    (o.top || []).forEach(function (c) { s.set(c, 2, '^'); });
    if (o.star) s.set(o.star[0], o.star[1], '*');
    return s;
  }

  // Flying corridor (floor = ground, ceiling at row 11), optional three-lane math fork.
  // `portal` picks the flyer: 'S' rocket (default), 'F' UFO, 'W' wave.
  function ship(o) {
    var w = o.len, s = new Stamp(w, 12);
    s.fill(0, 11, w - 1, 11, '#');
    s.set(1, 1, o.portal || 'S');
    (o.pillars || []).forEach(function (pl) {
      var c = pl[0], kind = pl[1], hgt = pl[2], wd = pl[3] || 1, sp = pl[4];
      if (kind === 'f') { s.fill(c, 0, c + wd - 1, hgt - 1, '#'); if (sp) s.fill(c, hgt, c + wd - 1, hgt, '^'); }
      else { s.fill(c, 11 - hgt, c + wd - 1, 10, '#'); if (sp) s.fill(c, 10 - hgt, c + wd - 1, 10 - hgt, 'v'); }
    });
    (o.spikes || []).forEach(function (sp) { s.set(sp[0], sp[1], sp[2] || '^'); });
    if (o.gate) {
      var g = o.gate, a = g.a, d = g.a + g.len;
      s.set(g.q, 9, '?');
      s.fill(a, 7, d, 7, '#'); s.fill(a, 3, d, 3, '#');
      s.fill(d, 8, d, 10, '1'); s.fill(d, 4, d, 6, '2'); s.fill(d, 0, d, 2, '3');
      s.set(a - 2, 9, 'x'); s.set(a - 2, 5, 'y'); s.set(a - 2, 1, 'z');
      (g.spikes || []).forEach(function (sp) { s.set(sp[0], sp[1], sp[2] || '^'); });
    }
    (o.extra || []).forEach(function (e) { s.set(e[0], e[1], e[2]); });
    (o.stars || []).forEach(function (st) { s.set(st[0], st[1], '*'); });
    if (o.exit !== false) s.set(w - 4, 1, 'C');
    return s;
  }

  // Ball corridor: floor = ground, ceiling at row 5, so the ball rolls at y 0 or y 4.
  // Optional two-lane fork: the ceiling lane is the top answer, the floor lane the bottom one.
  function ball(o) {
    var w = o.len, s = new Stamp(w, 6);
    s.fill(0, 5, w - 1, 5, '#');
    s.set(1, 1, 'B');
    (o.floor || []).forEach(function (c) { s.set(c, 0, '^'); });
    (o.roof || []).forEach(function (c) { s.set(c, 4, 'v'); });
    (o.blocks || []).forEach(function (b) { s.fill(b[0], b[1], b[0] + (b[2] || 1) - 1, b[1] + (b[3] || 1) - 1, '#'); });
    if (o.gate) {
      var g = o.gate, a = g.a, d = a + g.len;
      s.set(g.q, 3, '?');
      s.fill(a, 2, d, 2, '#');
      s.fill(d, 3, d, 4, '1'); s.fill(d, 0, d, 1, '2');
      s.set(a - 2, 4, 'x'); s.set(a - 2, 0, 'y');
      (g.floor || []).forEach(function (c) { s.set(c, 0, '^'); });
      (g.roof || []).forEach(function (c) { s.set(c, 4, 'v'); });
    }
    (o.extra || []).forEach(function (e) { s.set(e[0], e[1], e[2]); });
    if (o.star) s.set(o.star[0], o.star[1], '*');
    s.set(w - 6, 2, 'N'); s.set(w - 4, 2, 'C');
    return s;
  }

  // Upside-down run: a gravity portal flips the cube onto the ceiling,
  // a carpet of spikes waits below, a normal portal drops it back down.
  function grav(o) {
    var w = o.len, s = new Stamp(w, 8);
    s.fill(0, 7, w - 1, 7, '#');
    s.set(1, 1, 'G');
    s.fill(6, 0, w - 7, 0, '^');
    (o.hang || []).forEach(function (c) { s.set(c, 6, 'v'); });
    (o.blocks || []).forEach(function (b) { s.fill(b[0], 7 - b[1], b[0] + (b[2] || 1) - 1, 6, '#'); });
    (o.extra || []).forEach(function (e) { s.set(e[0], e[1], e[2]); });
    if (o.star) s.set(o.star[0], o.star[1], '*');
    s.set(w - 3, 5, 'N');
    return s;
  }

  // ---------- levels ----------
  var LEVELS = [
    {
      id: 'cloud', name: 'Cloud Hop', bpm: 80, diff: 'Easy',
      map: [
        '................',
        '......^.........^.........^^........',
        ['...........##........',
         '.....##....##........'],
        ['?.......................',
         '........................',
         '........................',
         '........................',
         '.........^..............'],
        cubeGate({ len: 11 }),
        '.......^^..........^.......',
        ['.........*......',
         '................',
         '................',
         '......###.......',
         '......###.......',
         '......###.......',
         '....p.###.......'],
        ['........o.........',
         '..................',
         '......^^^^^.......'],
        '.......^.......^^.......^.......',
        ['?.........................',
         '..........................',
         '..........................',
         '...............##.........',
         '......^........##.........'],
        cubeGate({ len: 11 }),
        '..........',
        ship({ len: 76, pillars: [[16, 'f', 4, 2], [30, 'c', 4, 2]], gate: { q: 4, a: 46, len: 10 }, stars: [[32, 1]] }),
        '..........',
        '.......^.........^^.........',
        ['.............###...........',
         '........###..###...........',
         '...^^...###..###....^^.....'],
        ['.........*......',
         '................',
         '................',
         '.......o........',
         '................',
         '......^^........'],
        '..............'
      ]
    },
    {
      id: 'lemon', name: 'Lemon Lane', bpm: 86, diff: 'Normal',
      map: [
        '..............',
        '......^.......^^........^.........^^......',
        ['........^..........^.....',
         '......#####......#####...'],
        ['?.........................',
         '..........................',
         '..........................',
         '..........................',
         '.....^^..........^........'],
        cubeGate({ len: 11 }),
        ['...............*..........',
         '..........................',
         '............#####........',
         '..........................',
         '..........................',
         '.......p.....^^^^.........'],
        ['........o...o..........',
         '.......................',
         '.....^^^^^^^^^^........'],
        '........',
        ship({ len: 90, pillars: [[12, 'f', 4, 2, true], [22, 'c', 4, 2, true], [32, 'f', 5, 2], [40, 'c', 5, 2]], gate: { q: 8, a: 58, len: 10 }, stars: [[36, 9]] }),
        '..........',
        ['?..............................',
         '...............................',
         '...............................',
         '..................##...........',
         '.......^^.........##.....^.....'],
        cubeGate({ len: 12, top: [6] }),
        ['.....########..........',
         '.....vvvvvvvv..........',
         '.......................',
         '.......................'],
        ['................###.......',
         '..........###...###.......',
         '....###...###...###.......',
         '....###^^^###^^^###^^.....'],
        ['?........................',
         '.........................',
         '.........................',
         '.........................',
         '.....^^.......^^.........'],
        cubeGate({ len: 11 }),
        ['............*..................',
         '...............................',
         '.......^^.......^.....^^.......'],
        '...............'
      ]
    },
    {
      id: 'moon', name: 'Moonlit Meadow', bpm: 92, diff: 'Hard',
      map: [
        '..............',
        '.....^^.......^^^........^.^........^^.....',
        ['.........^^...........',
         '.......######.........'],
        grav({ len: 46, hang: [12, 20, 21, 30], star: [25, 3] }),
        '..........',
        ['?..........................',
         '...........................',
         '...........................',
         '...........................',
         '.....^^^...........^^......'],
        cubeGate({ len: 12, top: [5] }),
        ['......o....o..........',
         '......................',
         '....^^^^^^^^^^^.......'],
        ['.............*.........',
         '.......................',
         '.........###...........',
         '.........###...........',
         '.....p...###...^^......'],
        '......',
        ship({ len: 96, pillars: [[12, 'f', 5, 2, true], [21, 'c', 5, 2, true], [30, 'f', 6, 2, true], [39, 'c', 5, 2, true]], gate: { q: 14, a: 62, len: 11, spikes: [[67, 4], [69, 10, 'v']] }, stars: [[25, 4]] }),
        '..........',
        ['?.............................',
         '..............................',
         '..............................',
         '...............###............',
         '.......^^^.....###...^^.......'],
        cubeGate({ len: 12, top: [4, 8] }),
        grav({ len: 40, hang: [11, 18, 19, 26], blocks: [[14, 1, 2]] }),
        '..........',
        ['?........................',
         '.........................',
         '.........................',
         '.........................',
         '.....^^^.......^^........'],
        cubeGate({ len: 11 }),
        '.......^^^.......^.^.......^^.......',
        '...............'
      ]
    },
    {
      id: 'star', name: 'Starlight Drift', bpm: 100, diff: 'Harder',
      map: [
        '..............',
        '.....^^^.......^.^.......^^........^^^.......',
        ['.........^............^^......',
         '........#######...########....'],
        ['?..........................',
         '...........................',
         '...........................',
         '...........................',
         '.....^^.........^^^........'],
        cubeGate({ len: 12, top: [5] }),
        ['........##############......',
         '............................',
         '...................u........',
         '............................',
         '........u...................',
         '............................',
         '........^^^^^^^^^^^^^.......'],
        grav({ len: 44, hang: [10, 17, 18, 25, 26], blocks: [[31, 1, 2]], star: [21, 3] }),
        '..........',
        ship({ len: 104, pillars: [[16, 'f', 5, 2, true], [24, 'c', 5, 2, true], [32, 'f', 6, 2, true], [40, 'c', 6, 2, true], [48, 'f', 5, 2, true]], gate: { q: 20, a: 70, len: 12, spikes: [[74, 0], [77, 4], [76, 10, 'v']] }, stars: [[38, 3]] }),
        '..........',
        ['?...............................',
         '................................',
         '................................',
         '...........o....................',
         '................................',
         '.........^^^^^.......^^^........'],
        cubeGate({ len: 12, top: [4, 8] }),
        ['......o....o....o........',
         '.........................',
         '....^^^^^^^^^^^^^^.......'],
        ['?.........................',
         '..........................',
         '..........................',
         '..........................',
         '.....^^^........^^........'],
        cubeGate({ len: 11, top: [5] }),
        grav({ len: 38, hang: [9, 10, 17, 24, 25] }),
        '..........',
        ['?........................',
         '.........................',
         '.........................',
         '.........................',
         '.....^^^........^^^......'],
        cubeGate({ len: 11 }),
        ['............*.......................',
         '....................................',
         '.......^^^.......^.^......^^^.......'],
        '...............'
      ]
    }
  ];

  // ---------- the six newer levels (each one brings a new move) ----------
  var MINI_TUNNEL = function (hang1, hang2, floorSp, star) {
    var s = new Stamp(51, 3);
    s.set(6, 2, 'm'); s.fill(12, 2, 37, 2, '#'); s.set(43, 2, 'M');
    s.fill(hang1, 1, hang1 + 1, 1, 'v'); s.fill(hang2, 1, hang2 + 1, 1, 'v');
    floorSp.forEach(function (c) { s.set(c, 0, '^'); });
    if (star) s.set(star, 1, '*');
    return s;
  };
  var GREEN_RUN = function (star) {
    var s = new Stamp(39, 7);
    s.fill(0, 6, 31, 6, '#');
    s.set(11, 5, 'v'); s.fill(20, 5, 21, 5, 'v'); s.set(27, 5, 'g');
    s.set(3, 1, 'G');
    s.fill(7, 0, 24, 0, '^');
    if (star) s.set(star, 3, '*');
    return s;
  };
  var lead = function (spikes, extraRows) {
    var rows = ['?' + new Array(spikes.length).join('.'), new Array(spikes.length + 1).join('.'), new Array(spikes.length + 1).join('.'), new Array(spikes.length + 1).join('.')];
    if (extraRows) rows = rows.concat(extraRows);
    return rows.concat([spikes]);
  };
  var MORE = [
    {
      id: 'bubble', name: 'Bubble Bay', bpm: 84, diff: 'Normal', fresh: 'Rolling ball',
      map: [
        '..............',
        '......^.........^^........^.........',
        ['............*.....',
         '..................',
         '..................',
         '........###.......',
         '......p.###.......'],
        lead('.......^.........^^......'),
        cubeGate({ len: 11 }),
        '.......',
        ball({ len: 66, floor: [12, 13, 30, 31, 46], roof: [21, 22, 38, 54] }),
        '..........',
        ['........o...o..........',
         '.......................',
         '.....^^^^^^^^^^........'],
        '.....',
        ball({ len: 72, gate: { q: 3, a: 42, len: 10 }, floor: [14, 15, 30], roof: [22, 36], star: [8, 2] }),
        '..........',
        ['?...........................',
         '............................',
         '............................',
         '................##..........',
         '.......^^.......##....^.....'],
        cubeGate({ len: 12, top: [6] }),
        ['............*..................',
         '...............................',
         '.......^^.......^.....^^.......'],
        '..............'
      ]
    },
    {
      id: 'candy', name: 'Candy Clouds', bpm: 90, diff: 'Hard', fresh: 'UFO and mini size',
      map: [
        '..............',
        '......^^........^.........^^.........^^........',
        MINI_TUNNEL(20, 34, [11, 29, 41], 25),
        lead('.......^^........^........'),
        cubeGate({ len: 12, top: [6] }),
        '........',
        ship({ portal: 'F', len: 96, pillars: [[14, 'f', 4, 2], [25, 'c', 4, 2], [36, 'f', 4, 2, true], [47, 'c', 4, 2, true]], gate: { q: 20, a: 64, len: 11 }, stars: [[30, 9]] }),
        '..........',
        ['......o...o...o.........',
         '........................',
         '....^^^^^^^^^^^^^.......'],
        lead('.....^^........^^.........'),
        cubeGate({ len: 11 }),
        MINI_TUNNEL(18, 30, [10, 22, 39]),
        lead('......^^........^.......'),
        cubeGate({ len: 11, top: [5] }),
        ['.............*..................',
         '................................',
         '.......^^^........^^.....^......'],
        '..............'
      ]
    },
    {
      id: 'garden', name: 'Rocket Garden', bpm: 94, diff: 'Hard', fresh: 'Speed portals, red pads, green rings',
      map: [
        '..............',
        '......^^.........^..........^^^.........',
        lead('.......^^.........^.......'),
        cubeGate({ len: 11 }),
        '......',
        '..<......^.....^.....^^....^.....^^.....=....',
        ['..............*......',
         '.....................',
         '.....................',
         '........#######......',
         '........#######......',
         '........#######......',
         '........#######......',
         '........#######......',
         '.....r..#######......'],
        '........',
        GREEN_RUN(16),
        '..>.........^.........^..........^^.........=......',
        ship({ len: 96, pillars: [[16, 'f', 5, 2, true], [26, 'c', 5, 2, true], [36, 'f', 6, 2], [46, 'c', 5, 2, true]], gate: { q: 20, a: 64, len: 11 }, stars: [[41, 2]] }),
        '..........',
        lead('......^^^........^^........'),
        cubeGate({ len: 12, top: [5] }),
        ['?...........................',
         '............................',
         '............................',
         '.........i..................',
         '............................',
         '........^^^.......^^........'],
        cubeGate({ len: 11, top: [4, 8] }),
        '.......^^^.......^.^......^^.......',
        '..............'
      ]
    },
    {
      id: 'reef', name: 'Zigzag Reef', bpm: 98, diff: 'Harder', fresh: 'Zig-zag wave',
      map: [
        '..............',
        '.....^^^........^^.......^.^........^^^.......',
        ship({ portal: 'W', len: 84, pillars: [[14, 'f', 6, 2], [26, 'c', 6, 2], [38, 'f', 6, 2], [50, 'c', 6, 2], [62, 'f', 5, 2, true]], stars: [[44, 8]] }),
        '..........',
        lead('.....^^^.........^^........'),
        cubeGate({ len: 12, top: [4, 8] }),
        '......',
        ball({ len: 74, gate: { q: 3, a: 44, len: 10, floor: [48], roof: [50] }, floor: [12, 13, 26, 27], roof: [19, 20, 34, 35], star: [8, 2] }),
        '..........',
        ship({ portal: 'W', len: 104, pillars: [[12, 'f', 7, 2, true], [22, 'c', 7, 2, true], [32, 'f', 7, 2, true], [42, 'c', 6, 2, true]], gate: { q: 14, a: 66, len: 12 } }),
        '..........',
        lead('.....^^^........^^^......'),
        cubeGate({ len: 11, top: [5] }),
        ['............*.......................',
         '....................................',
         '.......^^^.......^.^......^^^.......'],
        '..............'
      ]
    },
    {
      id: 'rapids', name: 'Rainbow Rapids', bpm: 104, diff: 'Expert', fresh: 'Everything, a bit faster',
      map: [
        '..............',
        '.....^^^.......^.^......^^........^^^......',
        '..>.....^.........^^.........^..........^^.........=...',
        lead('.....^^^........^^.........'),
        cubeGate({ len: 12, top: [4, 8] }),
        '........',
        ship({ portal: 'F', len: 92, pillars: [[12, 'f', 5, 2, true], [22, 'c', 5, 2, true], [32, 'f', 5, 2, true], [42, 'c', 5, 2, true], [52, 'f', 4, 2, true]], gate: { q: 22, a: 66, len: 11 }, stars: [[37, 3]] }),
        '..........',
        MINI_TUNNEL(19, 30, [10, 26, 36, 37]),
        lead('.....^^^........^^^.......'),
        cubeGate({ len: 11, top: [5] }),
        '......',
        ball({ len: 70, gate: { q: 3, a: 42, len: 10, floor: [46], roof: [49] }, floor: [11, 12, 24, 25, 36], roof: [17, 18, 30, 31], star: [21, 2] }),
        '..........',
        GREEN_RUN(),
        lead('.....^^^.......^^^.......'),
        cubeGate({ len: 11, top: [5] }),
        ['.............*.....................',
         '...................................',
         '.......^^^.......^.^......^^^......'],
        '..............'
      ]
    },
    {
      id: 'galaxy', name: 'Galaxy Finale', bpm: 108, diff: 'Master', fresh: 'All the moves together',
      map: [
        '..............',
        '.....^^^.......^^........^^^.......^.^.........',
        lead('.....^^^........^^^........'),
        cubeGate({ len: 12, top: [4, 8] }),
        '........',
        ship({ len: 96, pillars: [[12, 'f', 5, 2, true], [20, 'c', 5, 2, true], [28, 'f', 6, 2, true], [36, 'c', 6, 2, true], [44, 'f', 5, 2, true]], gate: { q: 22, a: 68, len: 12, spikes: [[72, 0], [75, 4], [74, 10, 'v']] }, stars: [[32, 5]] }),
        '..........',
        grav({ len: 44, hang: [10, 17, 18, 25, 26], blocks: [[31, 1, 2]] }),
        '..........',
        ['........##############......',
         '............................',
         '...................u........',
         '............................',
         '........u...................',
         '............................',
         '........^^^^^^^^^^^^^.......'],
        ['......o....o....o........',
         '.........................',
         '....^^^^^^^^^^^^^^.......'],
        '..........',
        ship({ portal: 'W', len: 100, pillars: [[12, 'f', 7, 2, true], [21, 'c', 7, 2, true], [30, 'f', 7, 2, true], [39, 'c', 7, 2, true]], gate: { q: 14, a: 64, len: 12 } }),
        '..........',
        ball({ len: 72, gate: { q: 3, a: 44, len: 10, floor: [47], roof: [50] }, floor: [10, 11, 22, 23, 34], roof: [16, 17, 28, 29], star: [25, 2] }),
        '..........',
        ship({ portal: 'F', len: 70, pillars: [[12, 'f', 5, 2, true], [22, 'c', 5, 2, true], [32, 'f', 5, 2, true], [42, 'c', 5, 2, true], [52, 'f', 5, 2, true]] }),
        '..........',
        MINI_TUNNEL(19, 30, [10, 26, 36, 37]),
        lead('.....^^^........^^^.......'),
        cubeGate({ len: 11, top: [5] }),
        ['.............*......................',
         '....................................',
         '.......^^^.......^.^......^^^.......'],
        '..............'
      ]
    }
  ];
  var ORDER = ['cloud', 'lemon', 'bubble', 'moon', 'candy', 'garden', 'star', 'reef', 'rapids', 'galaxy'];
  var FRESH = { cloud: 'Jumps, pads and the rocket', lemon: 'Ring chains', moon: 'Upside-down gravity', star: 'Blue flip rings' };
  var ALL = LEVELS.concat(MORE);
  ALL.forEach(function (d) { d.pack = 'main'; });
  LEVELS = ORDER.map(function (id) {
    var d = ALL.filter(function (x) { return x.id === id; })[0];
    if (!d.fresh) d.fresh = FRESH[id];
    return d;
  });

  // ---------- parsing ----------
  var CODE = { '#': 1, '^': 10, 'v': 11, ',': 12, '`': 13 };

  function rowsOf(st) {
    if (typeof st === 'string') return [st];
    if (st && st.rows) return st.rows();
    return st.slice();
  }

  function parseLevel(def) {
    var cols = [];
    def.map.forEach(function (st) {
      var rows = rowsOf(st), ground = null;
      if (rows.length > 1 && /^[=_]+$/.test(rows[rows.length - 1])) ground = rows.pop();
      var w = 0;
      rows.forEach(function (r) { if (r.length > w) w = r.length; });
      if (ground && ground.length > w) w = ground.length;
      for (var c = 0; c < w; c++) {
        var col = { pit: !!(ground && ground[c] === '_'), cells: [] };
        for (var r = 0; r < rows.length; r++) {
          var ch = rows[r][c];
          if (ch && ch !== '.' && ch !== ' ') col.cells.push([rows.length - 1 - r, ch]);
        }
        cols.push(col);
      }
    });
    var H = PHYS.H, mapW = cols.length, W = mapW + PHYS.RUNOUT;
    var L = {
      id: def.id, name: def.name, bpm: def.bpm, diff: def.diff,
      speed: PHYS.BPB * def.bpm / 60, W: W, H: H, mapW: mapW, finishX: mapW + 8,
      grid: new Uint8Array(W * H), pit: new Uint8Array(W),
      doorGate: new Int16Array(W * H).fill(-1), doorLane: new Uint8Array(W * H),
      objs: [], gates: [], starCount: 0, labels: []
    };
    var gi = -1;
    for (var x = 0; x < mapW; x++) {
      var col = cols[x];
      if (col.pit) L.pit[x] = 1;
      // the question marker of a column is handled before its doors
      col.cells.sort(function (a, b) { return (a[1] === '?' ? -1 : 0) - (b[1] === '?' ? -1 : 0); });
      for (var k = 0; k < col.cells.length; k++) {
        var y = col.cells[k][0], ch = col.cells[k][1], i = x * H + y;
        if (CODE[ch]) { L.grid[i] = CODE[ch]; continue; }
        switch (ch) {
          case '?':
            gi = L.gates.length;
            L.gates.push({ i: gi, x: x, y: y, doorX: -1, lanes: 0, correct: 1 });
            L.objs.push({ k: 'gate', x: x, y: y, g: gi });
            break;
          case '1': case '2': case '3':
            if (gi < 0) throw new Error(def.id + ': door before any question at x=' + x);
            L.grid[i] = 2; L.doorGate[i] = gi; L.doorLane[i] = +ch;
            var G = L.gates[gi];
            if (G.doorX < 0 || x < G.doorX) G.doorX = x;
            if (+ch > G.lanes) G.lanes = +ch;
            break;
          case 'x': case 'y': case 'z': case 'X': case 'Y': case 'Z':
            if (ch <= 'Z') L.grid[i] = 1;
            L.labels.push({ x: x, y: y, lane: 'xyz'.indexOf(ch.toLowerCase()) + 1, g: gi, solid: ch <= 'Z' });
            break;
          case 'o': L.objs.push({ k: 'orb', x: x, y: y }); break;
          case 'u': L.objs.push({ k: 'blue', x: x, y: y }); break;
          case 'i': L.objs.push({ k: 'pink', x: x, y: y }); break;
          case 'g': L.objs.push({ k: 'green', x: x, y: y }); break;
          case 'p': L.objs.push({ k: 'pad', x: x, y: y }); break;
          case 'q': L.objs.push({ k: 'padc', x: x, y: y }); break;
          case 'r': L.objs.push({ k: 'red', x: x, y: y }); break;
          case 'S': L.objs.push({ k: 'portal', to: 'ship', x: x, y: y }); break;
          case 'C': L.objs.push({ k: 'portal', to: 'cube', x: x, y: y }); break;
          case 'B': L.objs.push({ k: 'portal', to: 'ball', x: x, y: y }); break;
          case 'F': L.objs.push({ k: 'portal', to: 'ufo', x: x, y: y }); break;
          case 'W': L.objs.push({ k: 'portal', to: 'wave', x: x, y: y }); break;
          case 'G': L.objs.push({ k: 'portal', to: 'flip', x: x, y: y }); break;
          case 'N': L.objs.push({ k: 'portal', to: 'norm', x: x, y: y }); break;
          case 'm': L.objs.push({ k: 'portal', to: 'mini', x: x, y: y }); break;
          case 'M': L.objs.push({ k: 'portal', to: 'big', x: x, y: y }); break;
          case '<': L.objs.push({ k: 'portal', to: 'slow', x: x, y: y }); break;
          case '>': L.objs.push({ k: 'portal', to: 'fast', x: x, y: y }); break;
          case '=': L.objs.push({ k: 'portal', to: 'norm-speed', x: x, y: y }); break;
          case '*': L.objs.push({ k: 'star', x: x, y: y }); break;
          default: throw new Error(def.id + ': unknown tile "' + ch + '" at x=' + x);
        }
      }
    }
    L.objs.sort(function (a, b) { return a.x - b.x || a.y - b.y; });
    var si = 0;
    L.objs.forEach(function (o, j) { o.id = j; if (o.k === 'star') o.si = si++; });
    L.starCount = si;
    L.gates.forEach(function (g) {
      if (g.doorX < 0) throw new Error(def.id + ': question at x=' + g.x + ' has no doors');
    });
    return L;
  }

  function solidAt(L, cx, cy) {
    if (cx < 0 || cx >= L.W) return cy < 0;
    if (cy < 0) return !L.pit[cx];
    if (cy >= L.H) return false;
    var i = cx * L.H + cy, t = L.grid[i];
    if (t === 1) return true;
    if (t === 2) return L.gates[L.doorGate[i]].correct !== L.doorLane[i];
    return false;
  }

  // ---------- player ----------
  // modes: 0 cube, 1 rocket, 2 ball, 3 UFO, 4 wave. `mini` shrinks the player, `spd` scales its speed.
  var MODE_H = [1, PHYS.SHIP_H, 1, PHYS.UFO_H, PHYS.WAVE_H];
  var MODE_SNAP = [PHYS.CUBE_SNAP, PHYS.SHIP_SNAP, PHYS.CUBE_SNAP, 0.25, 0.15];
  function size(p) { var s = p.mini ? PHYS.MINI : 1; return [s, MODE_H[p.mode] * s]; }

  function newPlayer() {
    return {
      x: 0, y: 0, vy: 0, mode: 0, grav: 1, mini: false, spd: 1, ground: true, coyote: 0, buf: 0, obuf: 0, held: false,
      lastOrb: -1, lastPad: -1, stars: 0, oi: 0, gi: 0, dead: false, done: false,
      cause: '', causeGate: -1, t: 0, n: 0, ev: null
    };
  }
  function clone(p) {
    return {
      x: p.x, y: p.y, vy: p.vy, mode: p.mode, grav: p.grav, mini: p.mini, spd: p.spd, ground: p.ground, coyote: p.coyote,
      buf: p.buf, obuf: p.obuf, held: p.held, lastOrb: p.lastOrb, lastPad: p.lastPad, stars: p.stars,
      oi: p.oi, gi: p.gi, dead: p.dead, done: p.done, cause: p.cause, causeGate: p.causeGate, t: p.t, n: p.n, ev: null
    };
  }

  function die(p, cause, gate) {
    p.dead = true; p.cause = cause; p.causeGate = gate === undefined ? -1 : gate;
    if (p.ev) p.ev.push(['die', cause, p.causeGate]);
  }

  function circleBox(cx, cy, r, x, y, w, h) {
    var nx = cx < x ? x : (cx > x + w ? x + w : cx);
    var ny = cy < y ? y : (cy > y + h ? y + h : cy);
    var dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  var RINGS = { orb: 1, blue: 1, pink: 1, green: 1 };
  function ringHere(L, p, w, h) {
    var objs = L.objs;
    for (var j = p.oi; j < objs.length; j++) {
      var o = objs[j];
      if (o.x > p.x + 2) break;
      if (RINGS[o.k] && j > p.lastOrb && circleBox(o.x + 0.5, o.y + 0.5, 0.62, p.x, p.y, w, h)) return true;
    }
    return false;
  }

  // One fixed physics substep (1/240 s). `held` is the button state.
  function step(L, p, held) {
    if (p.dead || p.done) return;
    var P = PHYS, dt = P.DT;
    var pressed = held && !p.held;
    p.held = held;
    p.t += dt;
    if (pressed) { p.buf = P.BUFFER; p.obuf = P.ORB_BUFFER; }
    else { if (p.buf > 0) p.buf -= dt; if (p.obuf > 0) p.obuf -= dt; }
    var g = p.grav, mode = p.mode, sz = p.mini ? P.MINI : 1, hspd = L.speed * p.spd;
    if (mode === 0 || mode === 2) {
      // cube jumps; ball flips gravity. Holding repeats on every landing.
      // A fresh tap while touching a ring belongs to the ring, not to a jump.
      if ((held || p.buf > 0) && (p.ground || p.coyote > 0) && !(p.obuf > 0 && ringHere(L, p, sz, MODE_H[mode] * sz))) {
        if (mode === 0) { p.vy = P.JUMP_V * (p.mini ? P.MINI_JUMP : 1) * g; if (p.ev) p.ev.push(['jump']); }
        else { p.grav = g = -g; p.vy = -P.BALL_KICK * g; if (p.ev) p.ev.push(['flip']); }
        p.ground = false; p.coyote = 0; p.buf = 0; p.obuf = 0; p.n++;
      }
      var grv = mode === 0 ? P.G : P.BALL_G, maxFall = mode === 0 ? P.MAX_FALL : P.BALL_MAX;
      p.vy -= grv * g * dt;
      if (p.vy * g < -maxFall) p.vy = -maxFall * g;
    } else if (mode === 1) {
      p.vy += (held ? P.SHIP_ACC : -P.SHIP_ACC) * g * dt;
      if (p.vy > P.SHIP_MAX) p.vy = P.SHIP_MAX; else if (p.vy < -P.SHIP_MAX) p.vy = -P.SHIP_MAX;
    } else if (mode === 3) {
      // UFO: every tap is a little flap
      if (pressed) { p.vy = P.UFO_V * (p.mini ? 0.85 : 1) * g; p.ground = false; p.n++; if (p.ev) p.ev.push(['flap']); }
      p.vy -= P.UFO_G * g * dt;
      if (p.vy * g < -P.UFO_MAX) p.vy = -P.UFO_MAX * g;
    } else {
      // wave: hold to zig up, let go to zag down, always at 45 degrees
      p.vy = (held ? 1 : -1) * g * hspd;
    }
    var ox = p.x;
    p.x += hspd * dt;
    p.y += p.vy * dt;

    // solids: snap onto surfaces we only grazed, die if the core hits a wall
    var w = sz, h = MODE_H[mode] * sz, snap = MODE_SNAP[mode] * sz;
    var wasGround = p.ground;
    p.ground = false;
    var cx, cy;
    var x0 = Math.floor(p.x + 1e-7), x1 = Math.floor(p.x + w - 1e-7);
    var y0 = Math.floor(p.y + 1e-7), y1 = Math.floor(p.y + h - 1e-7);
    var fTop = -1e9, cBot = 1e9;
    for (cx = x0; cx <= x1; cx++) for (cy = y0; cy <= y1; cy++) {
      if (!solidAt(L, cx, cy)) continue;
      var dTop = cy + 1 - p.y, dBot = p.y + h - cy;
      if (dTop > 0 && dTop <= snap && cy + 1 > fTop) fTop = cy + 1;
      if (dBot > 0 && dBot <= snap && cy < cBot) cBot = cy;
    }
    if (g > 0) {
      if (fTop > -1e9 && p.vy <= 0) { p.y = fTop; p.vy = 0; p.ground = true; }
      else if (cBot < 1e9 && p.vy > 0) { p.y = cBot - h; p.vy = 0; }
    } else {
      if (cBot < 1e9 && p.vy >= 0) { p.y = cBot - h; p.vy = 0; p.ground = true; }
      else if (fTop > -1e9 && p.vy < 0) { p.y = fTop; p.vy = 0; }
    }
    var ix0 = p.x + 0.1 * w, ix1 = p.x + 0.9 * w, iy0 = p.y + snap, iy1 = p.y + h - snap;
    for (cx = Math.floor(ix0); cx <= Math.floor(ix1 - 1e-7); cx++) {
      for (cy = Math.floor(iy0); cy <= Math.floor(iy1 - 1e-7); cy++) {
        if (solidAt(L, cx, cy)) {
          var di = cx * L.H + cy;
          if (cx >= 0 && cx < L.W && cy >= 0 && cy < L.H && L.grid[di] === 2) die(p, 'door', L.doorGate[di]);
          else die(p, 'wall');
          return;
        }
      }
    }
    if (mode === 0 || mode === 2) {
      if (p.ground) p.coyote = P.COYOTE; else if (p.coyote > 0) p.coyote -= dt;
    }
    if (p.ev && p.ground && !wasGround) p.ev.push(['land']);

    // spikes (hitboxes are smaller than the drawings, on purpose)
    var tapper = mode === 0 || mode === 2;
    var hm = (mode === 4 ? 0.25 : tapper ? 0.15 : 0.12) * w, hv = (tapper ? 0.15 : 0.1) * h;
    var hx0 = p.x + hm, hx1 = p.x + w - hm, hy0 = p.y + hv, hy1 = p.y + h - hv;
    for (cx = Math.floor(hx0); cx <= Math.floor(hx1); cx++) {
      if (cx < 0 || cx >= L.W) continue;
      for (cy = Math.max(0, Math.floor(hy0)); cy <= Math.min(L.H - 1, Math.floor(hy1)); cy++) {
        var t = L.grid[cx * L.H + cy];
        if (t < 10) continue;
        var bx0, bx1, by0, by1;
        if (t === 10) { bx0 = cx + 0.36; bx1 = cx + 0.64; by0 = cy; by1 = cy + 0.52; }
        else if (t === 11) { bx0 = cx + 0.36; bx1 = cx + 0.64; by0 = cy + 0.48; by1 = cy + 1; }
        else if (t === 12) { bx0 = cx + 0.38; bx1 = cx + 0.62; by0 = cy; by1 = cy + 0.3; }
        else { bx0 = cx + 0.38; bx1 = cx + 0.62; by0 = cy + 0.7; by1 = cy + 1; }
        if (hx1 > bx0 && hx0 < bx1 && hy1 > by0 && hy0 < by1) { die(p, 'spike'); return; }
      }
    }

    // orbs, pads, portals, stars, question markers
    var objs = L.objs, mid = w / 2;
    while (p.oi < objs.length && objs[p.oi].x < p.x - 3) p.oi++;
    for (var j = p.oi; j < objs.length; j++) {
      var o = objs[j];
      if (o.x > p.x + 2) break;
      switch (o.k) {
        case 'portal':
          if (ox + mid < o.x + 0.5 && p.x + mid >= o.x + 0.5) {
            var to = o.to;
            if (to === 'ship' || to === 'ufo') { if (p.mode !== (to === 'ship' ? 1 : 3)) { p.mode = to === 'ship' ? 1 : 3; p.vy *= 0.5; p.ground = false; } }
            else if (to === 'cube') p.mode = 0;
            else if (to === 'ball') { p.mode = 2; p.ground = false; }
            else if (to === 'wave') p.mode = 4;
            else if (to === 'flip') { if (p.grav !== -1) { p.grav = -1; p.vy *= 0.5; p.ground = false; p.coyote = 0; } }
            else if (to === 'norm') { if (p.grav !== 1) { p.grav = 1; p.vy *= 0.5; p.ground = false; p.coyote = 0; } }
            else if (to === 'mini') p.mini = true;
            else if (to === 'big') p.mini = false;
            else if (to === 'slow') p.spd = P.SLOW;
            else if (to === 'fast') p.spd = P.FAST;
            else if (to === 'norm-speed') p.spd = 1;
            if (p.ev) p.ev.push(['portal', to]);
          }
          break;
        case 'gate':
          if (ox + mid < o.x + 0.5 && p.x + mid >= o.x + 0.5 && p.ev) p.ev.push(['gate', o.g]);
          break;
        case 'orb': case 'blue': case 'pink': case 'green':
          if (mode !== 4 && j > p.lastOrb && p.obuf > 0 && circleBox(o.x + 0.5, o.y + 0.5, 0.62, p.x, p.y, w, h)) {
            if (o.k === 'blue') { p.grav = -p.grav; p.vy = -P.BLUE_V * p.grav; }
            else if (o.k === 'green') { p.grav = -p.grav; p.vy = -P.GREEN_V * p.grav; }
            else p.vy = P.ORB_V * (o.k === 'pink' ? P.PINK : 1) * p.grav;
            p.ground = false; p.coyote = 0; p.buf = 0; p.obuf = 0; p.lastOrb = j; p.n++;
            if (p.ev) p.ev.push(['orb', j]);
          }
          break;
        case 'pad': case 'padc': case 'red':
          if (mode !== 4 && j !== p.lastPad) {
            var py0 = o.k === 'padc' ? o.y + 0.7 : o.y;
            if (p.x + w > o.x + 0.05 && p.x < o.x + 0.95 && p.y + h > py0 && p.y < py0 + 0.3) {
              p.vy = P.PAD_V * (o.k === 'red' ? P.RED : 1) * p.grav; p.ground = false; p.coyote = 0; p.lastPad = j;
              if (p.ev) p.ev.push(['pad', j]);
            }
          }
          break;
        case 'star':
          if (!(p.stars & (1 << o.si)) && circleBox(o.x + 0.5, o.y + 0.5, 0.6, p.x, p.y, w, h)) {
            p.stars |= 1 << o.si;
            if (p.ev) p.ev.push(['star', o.si]);
          }
          break;
      }
    }

    while (p.gi < L.gates.length && p.x > L.gates[p.gi].doorX + 1) {
      if (p.ev) p.ev.push(['pass', p.gi]);
      p.gi++;
    }
    if (p.y < -3 || p.y > 16) { die(p, 'fall'); return; }
    if (p.x >= L.finishX) { p.done = true; if (p.ev) p.ev.push(['done']); }
  }

  var ND = {
    PHYS: PHYS, LEVELS: LEVELS, Stamp: Stamp, B: { cubeGate: cubeGate, ship: ship, grav: grav, ball: ball, miniTunnel: MINI_TUNNEL, greenRun: GREEN_RUN, lead: lead },
    parseLevel: parseLevel, solidAt: solidAt, newPlayer: newPlayer, clone: clone, step: step, size: size
  };
  root.ND = ND;
  if (typeof module !== 'undefined' && module.exports) module.exports = ND;
})(typeof window !== 'undefined' ? window : globalThis);
