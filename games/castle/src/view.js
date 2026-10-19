/* games/castle/src/view.js — Castle Crew's 3D world, drawn with three.js in the blocky voxel style of Unrailed!:
   everything is made of coloured cubes (the island's tiles, trees, rocks, the castle, the crew, the zombies, towers,
   shots and every puff of smoke), drawn as a few instanced meshes so hundreds of cubes cost a handful of draw calls.
   The page gives it THREE (loaded from the CDN) and a world to draw each frame:
     world = { local: id, players: [...], zombies: [...], towers: [...], selected: a tower's id or null }
   Positions are in tiles (x east, z south); the view centres the map on the origin. Each map has a theme (meadow,
   autumn, snow, desert, haunted, lava, dusk) that colours its ground, road, water, trees, rocks, sky and sea. */
const CCView = (function () {
  let THREE = null, R = null, scene = null, camera = null, sun = null, hemi = null, canvas = null, overlay = null, octx = null;
  let statics = null, water = null, dyn = null, glow = null, ghostMesh = null, sea = null;
  let map = null, W = 0, H = 0, ox = 0, oz = 0;
  let quality = 'high', time = 0, lastWorld = null;
  const camState = { x: 0, z: 0, zoom: 1, shake: 0 };
  // reusable maths
  let M = null, P = null, P2 = null, Q = null, Tm = null, C = null, V = null;
  const parts = [];          // particles: { x, y, z, vx, vy, vz, life, max, s, c, g, glow }
  const flights = [];        // shots in flight, drawn from events: { kind, x, z, y, vx, vz, t, life, lob, tx, tz, c }
  const zaps = [];           // lightning: { pts, life, y0 }
  const rays = [];           // straight rays (sniper shots, sunbeams): { x, z, y, tx, tz, ty, w, c, core, life, max }
  const rings = [];          // rings spreading out (frost pulses, thunder domes, wards): { x, z, y, r, c, life, max }
  const popups = [];         // floating words: { x, z, y, text, life, color }
  let sparks = [];           // the island's own lights (lava bubbles, will-o'-wisps, fireflies): [x, z, kind, phase]
  const chopKind = new Map(); // tile -> 'tree' | 'rock', from the last chop (for the bits when it goes)

  /* ---- colours that every map shares ---- */
  const COL = {
    stone: 0xc4c9d1, stoneDark: 0x9ea5af, roof: 0xd9534f, roofDark: 0xb33f3b, wood: 0xa36a3a, woodDark: 0x7a4b25, ironDark: 0x37474f,
    flag: 0xffc94d, bridge: 0xb07a45, gate: 0x4a3b6b, gateGlow: 0x9cff6b, gold: 0xffc107, goldDark: 0xe0a000, blue: 0x42a5f5, bone: 0xf1ece0
  };
  /* ---- map themes: ground (grass tops, earth sides), road, sand, water, sea, trees, rocks, flowers, sky (and fog)
     and light. tree: leafy, snowy (white-capped pines), cactus, bare or charred; cap: snow on top of things; lava: the
     water is lava; pumpkins, graves, skulls, flies: each theme's own little things ---- */
  const THEMES = {
    meadow: { grass: [0x7cc84a, 0x6dbb43, 0x86d052], side: 0x8a5a33, dirt: 0xc9a06a, dirtDark: 0xb78a55, sand: 0xf1d79a, sandDark: 0xe4c27e,
      water: [0x45b7f0, 0x4cbcf3], sea: 0x2f9be3, trunk: 0x8b5a2b, leaves: [0x3f9b3a, 0x4caf50, 0x2e8b3a, 0x5cbf4a], pine: [0x2f7d4a, 0x3a8f55], tree: 'leafy',
      rock: [0x9aa1a8, 0x8a9198, 0xa9b0b6], ore: 0x5f6870, flower: [0xff6f91, 0xffd54f, 0xffffff, 0x9575cd], stem: 0x3d8b3d, tuft: 0x5aa83a, bridge: COL.bridge,
      sky: 0x9fdcff, light: [0xdff3ff, 0x6a8a4a, 1.05], sun: [0xfff1d6, 1.9] },
    autumn: { grass: [0xb2bf55, 0xa3b34c, 0xbcc860], side: 0x7d5232, dirt: 0xc4925c, dirtDark: 0xab7c4a, sand: 0xead092, sandDark: 0xddbe7b,
      water: [0x3f9fd8, 0x48a8de], sea: 0x3a90cc, trunk: 0x6d4428, leaves: [0xe8862a, 0xd9542c, 0xf2b631, 0xc0392b], pine: [0x3f6b3a, 0x4d7a3e], tree: 'leafy',
      rock: [0x9a948a, 0x8b857c, 0xa8a297], ore: 0x5f5a52, flower: [0xff8f1f, 0xd84315, 0xffc23d, 0x8d5a2b], stem: 0x6b7a2a, tuft: 0x8a9a3a, bridge: COL.bridge, pumpkins: 1,
      sky: 0xffd9a8, light: [0xffe9cc, 0x7a6a3a, 1.12], sun: [0xffd9a0, 1.85] },
    snow: { grass: [0xf4f8fc, 0xe8f0f7, 0xdde8f2], side: 0x8a7a6e, dirt: 0xa89a8c, dirtDark: 0x968878, sand: 0xcfe0ec, sandDark: 0xbfd3e2,
      water: [0x9fd8f0, 0xb3e3f5], sea: 0x7fb6d6, trunk: 0x6d4c35, leaves: [0x2f6d4a, 0x3a7d55, 0x2a6343, 0x357a50], pine: [0x2a6343, 0x357552], tree: 'snowy',
      rock: [0x8e9aa6, 0x7f8b97, 0x9ba7b3], ore: 0x55606c, flower: [0xffffff, 0xe1f5fe, 0xb3e5fc, 0xffffff], stem: 0x9fb3c0, tuft: 0xc5d6e2, bridge: COL.bridge, cap: 0xffffff,
      sky: 0xdcecf7, light: [0xeef6ff, 0x8a9db0, 1.15], sun: [0xf3f8ff, 1.7] },
    desert: { grass: [0xf0d08a, 0xe8c47a, 0xf5d996], side: 0xc98f4f, dirt: 0xc98c55, dirtDark: 0xb77a45, sand: 0xf7e2b0, sandDark: 0xeed39a,
      water: [0x3cc4d8, 0x48cde0], sea: 0x2aa2c4, trunk: 0x8b6b3a, leaves: [0x5a9e3c, 0x4f9236, 0x67a845, 0x5a9e3c], pine: [0x4f9236, 0x5a9e3c], tree: 'cactus',
      rock: [0xc27a4a, 0xb06a3e, 0xd08c5a], ore: 0x8a4a28, flower: [0xff6f91, 0xffd54f, 0x9e8a4a, 0xb59a52], stem: 0x8a7a3a, tuft: 0xb59a52, bridge: COL.bridge, skulls: 1,
      sky: 0xffe6b0, light: [0xfff3d6, 0xb08a50, 1.1], sun: [0xfff0c8, 2] },
    haunted: { grass: [0x5c6b52, 0x53614a, 0x65745a], side: 0x3b2f2c, dirt: 0x86766a, dirtDark: 0x76675b, sand: 0x7d7468, sandDark: 0x6f665b,
      water: [0x5e4a8e, 0x6a5598], sea: 0x3a2f62, trunk: 0x3a3040, leaves: [0x6a4a8a, 0x5b3f7a, 0x7a58a0, 0x4a3366], pine: [0x2f3a33, 0x36423a], tree: 'bare',
      rock: [0x6e6a78, 0x625e6c, 0x7a7684], ore: 0x3a3644, flower: [0xb388ff, 0x9cff6b, 0xea80fc, 0xb388ff], stem: 0x3a4a34, tuft: 0x43503b, bridge: 0x6d5a4a, graves: 1,
      sky: 0x2b2340, light: [0xd0c4ff, 0x3a3050, 1.3], sun: [0xd8d8ff, 1.45] },
    lava: { grass: [0x3d3634, 0x463e3b, 0x35302e], side: 0x2a2220, dirt: 0x806a5f, dirtDark: 0x705c52, sand: 0x4a2c26, sandDark: 0x5a332b,
      water: [0xff5a1f, 0xff7a1a], sea: 0x5a140c, trunk: 0x1e1a1a, leaves: [0x2a2525, 0x332d2c, 0x241f1f, 0x2e2828], pine: [0x2a2525, 0x332d2c], tree: 'charred',
      rock: [0x4a4442, 0x3e3836, 0x55504d], ore: 0xff6d00, flower: [0xff7043, 0xffab40, 0x5d5552, 0xff7043], stem: 0x2a2422, tuft: 0x4e4440, bridge: 0x4e342e, lava: 1,
      sky: 0x3a1a14, light: [0xffb08a, 0x4a1a10, 1.0], sun: [0xffc08a, 1.6] },
    dusk: { grass: [0x6aa84a, 0x5f9c44, 0x73b052], side: 0x7a4e30, dirt: 0xbd9364, dirtDark: 0xa87d50, sand: 0xe8c890, sandDark: 0xd9b67a,
      water: [0x8aa4ff, 0x98b0ff], sea: 0x5058a8, trunk: 0x7a4e28, leaves: [0x3a8a3c, 0x45994a, 0x2e7a38, 0x52a84a], pine: [0x2a6a44, 0x337a4e], tree: 'leafy',
      rock: [0x948e9e, 0x857f90, 0xa29cac], ore: 0x5a5466, flower: [0xff8fb1, 0xffd54f, 0xfff3e0, 0xb39ddb], stem: 0x3d7a3d, tuft: 0x4f9a3a, bridge: COL.bridge, flies: 1,
      sky: 0xf2a68a, light: [0xffcfb0, 0x4a3a6a, 1.05], sun: [0xffa66a, 1.65] }
  };
  let TH = THEMES.meadow;
  const CREW = [{ shirt: 0xe9524a, hat: 0xb83a33, name: 'red' }, { shirt: 0x4a90e2, hat: 0x2f6db5, name: 'blue' }, { shirt: 0xf5c518, hat: 0xd39e00, name: 'yellow' }, { shirt: 0x4caf50, hat: 0x2e7d32, name: 'green' }];
  const SKIN = 0xffcf9e;
  // two colours mixed: k = 0 is a, 1 is b
  const mix = (a, b, k) => { const ch = (s) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k) << s; return ch(16) | ch(8) | ch(0); };

  /* ================= set up ================= */
  function init(three, cv, ov, q) {
    THREE = three; canvas = cv; overlay = ov; octx = ov.getContext('2d');
    quality = q || 'high';
    R = new THREE.WebGLRenderer({ canvas: cv, antialias: quality !== 'low', powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'low' ? 1 : quality === 'medium' ? 1.5 : 2));
    R.shadowMap.enabled = quality !== 'low';
    R.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fdcff);
    scene.fog = new THREE.Fog(0x9fdcff, 28, 60);
    camera = new THREE.PerspectiveCamera(38, 1, 0.5, 200);
    hemi = new THREE.HemisphereLight(0xdff3ff, 0x6a8a4a, 1.05);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff1d6, 1.9);
    sun.castShadow = quality !== 'low';
    const sm = quality === 'high' ? 2048 : 1024;
    sun.shadow.mapSize.set(sm, sm);
    sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
    scene.add(sun); scene.add(sun.target);
    M = new THREE.Matrix4(); P = new THREE.Matrix4(); P2 = new THREE.Matrix4(); Q = new THREE.Matrix4(); Tm = new THREE.Matrix4(); C = new THREE.Color(); V = new THREE.Vector3();
    const box = new THREE.BoxGeometry(1, 1, 1);
    const lit = new THREE.MeshLambertMaterial({ color: 0xffffff });
    statics = new THREE.InstancedMesh(box, lit, 9000); statics.castShadow = true; statics.receiveShadow = true; statics.count = 0;
    water = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 }), 2500); water.receiveShadow = true; water.count = 0;
    dyn = new THREE.InstancedMesh(box, lit, 16000); dyn.castShadow = true; dyn.receiveShadow = true; dyn.count = 0; dyn.frustumCulled = false;
    glow = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }), 6000); glow.count = 0; glow.frustumCulled = false;
    ghostMesh = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }), 4000); ghostMesh.count = 0; ghostMesh.frustumCulled = false;
    [statics, water, dyn, glow, ghostMesh].forEach((m) => { m.setColorAt(0, C.setHex(0xffffff)); scene.add(m); });
    ghostMesh.renderOrder = 1; glow.renderOrder = 2;   // see-through things first, then the glow over them (eyes, sparks)
    sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: THEMES.meadow.sea }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -0.55; sea.receiveShadow = true;
    scene.add(sea);
    resize();
  }
  function resize() {
    if (!R) return;
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    R.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    overlay.width = Math.round(w * dpr); overlay.height = Math.round(h * dpr);
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ================= cubes ================= */
  // put one cube into a batch: centre (x, y, z), size (w, h, d), turned by the batch's current parent matrix P
  let batch = null, bi = 0;
  function begin(mesh) { batch = mesh; bi = 0; }
  function end() { batch.count = bi; batch.instanceMatrix.needsUpdate = true; if (batch.instanceColor) batch.instanceColor.needsUpdate = true; }
  function put(x, y, z, w, h, d, col) {
    if (bi >= batch.instanceMatrix.count) return;
    Q.makeScale(w, h, d); Q.setPosition(x, y, z);
    M.multiplyMatrices(P, Q);
    batch.setMatrixAt(bi, M);
    batch.setColorAt(bi, typeof col === 'number' ? C.setHex(col) : col);
    bi++;
  }
  // a cube turned about the x axis around a pivot (arms and legs swinging): pivot (px, py, pz), angle a
  function putSwing(px, py, pz, a, x, y, z, w, h, d, col) {
    if (bi >= batch.instanceMatrix.count) return;
    Tm.makeRotationX(a); Tm.setPosition(px, py, pz);
    Q.makeScale(w, h, d); Q.setPosition(x - px, y - py, z - pz);
    M.multiplyMatrices(P, Tm).multiply(Q);
    batch.setMatrixAt(bi, M);
    batch.setColorAt(bi, typeof col === 'number' ? C.setHex(col) : col);
    bi++;
  }
  // a cube turned about the z axis (the way a thing faces) around a pivot: wings flapping
  function putRoll(px, py, pz, a, x, y, z, w, h, d, col) {
    if (bi >= batch.instanceMatrix.count) return;
    Tm.makeRotationZ(a); Tm.setPosition(px, py, pz);
    Q.makeScale(w, h, d); Q.setPosition(x - px, y - py, z - pz);
    M.multiplyMatrices(P, Tm).multiply(Q);
    batch.setMatrixAt(bi, M);
    batch.setColorAt(bi, typeof col === 'number' ? C.setHex(col) : col);
    bi++;
  }
  // the parent transform: where an object stands, which way it faces, how big it is
  function place(x, y, z, rot, s) {
    P.makeRotationY(rot || 0);
    if (s && s !== 1) P.multiply(Tm.makeScale(s, s, s));
    P.setPosition(x - ox, y, z - oz);
  }
  const wx = (x) => x - ox, wz = (z) => z - oz;
  // cubes kept for a later batch, placed now like put(): shine() glows (unlit, drawn with the sparks), glass() is
  // see-through (drawn with the ghosts). Lets a tower or a zombie have glowing or glassy bits without a second walk.
  function lane(n) { return { m: new Float32Array(n * 16), c: new Int32Array(n), n: 0 }; }
  const shineL = lane(3000), glassL = lane(1500);
  function later(L, x, y, z, w, h, d, col) {
    if (L.n >= L.c.length) return;
    Q.makeScale(w, h, d); Q.setPosition(x, y, z);
    M.multiplyMatrices(P, Q); M.toArray(L.m, L.n * 16); L.c[L.n++] = col;
  }
  const shine = (x, y, z, w, h, d, col) => later(shineL, x, y, z, w, h, d, col);
  const glass = (x, y, z, w, h, d, col) => later(glassL, x, y, z, w, h, d, col);
  function flush(L) {
    for (let k = 0; k < L.n && bi < batch.instanceMatrix.count; k++) { M.fromArray(L.m, k * 16); batch.setMatrixAt(bi, M); batch.setColorAt(bi, C.setHex(L.c[k])); bi++; }
    L.n = 0;
  }
  const CORNERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  // four posts at the corners of a square: half-width s, from y0 up h tall, w thick
  function posts(s, y0, h, w, col) { for (const [a, b] of CORNERS) put(a * s, y0 + h / 2, b * s, w, h, w, col); }

  /* ================= the island ================= */
  const hash = (x, y, k) => { let h = (x * 374761393 + y * 668265263 + (k || 0) * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function setMap(m) {
    map = m; W = m.w; H = m.h; ox = W / 2; oz = H / 2;
    TH = THEMES[m.theme] || THEMES.meadow;
    chopKind.clear();
    const r = Math.max(W, H);
    sun.position.set(-r * 0.35, r * 0.9, r * 0.45); sun.target.position.set(0, 0, 0);
    const sc = sun.shadow.camera; sc.left = -r * 0.75; sc.right = r * 0.75; sc.top = r * 0.75; sc.bottom = -r * 0.75; sc.near = 1; sc.far = r * 3; sc.updateProjectionMatrix();
    scene.fog.near = r * 1.1; scene.fog.far = r * 2.6;
    // the theme's sky and fog, light, sea and water (lava glows and cannot be seen through)
    scene.background.setHex(TH.sky); scene.fog.color.setHex(TH.sky);
    hemi.color.setHex(TH.light[0]); hemi.groundColor.setHex(TH.light[1]); hemi.intensity = TH.light[2];
    sun.color.setHex(TH.sun[0]); sun.intensity = TH.sun[1];
    sea.material.color.setHex(TH.sea); sea.material.emissive.setHex(TH.lava ? 0x3a0800 : 0);
    const wm = water.material;
    wm.emissive.setHex(TH.lava ? 0x8a2400 : 0); wm.opacity = TH.lava ? 1 : 0.82; wm.transparent = !TH.lava; wm.needsUpdate = true;
    rebuild();
  }
  // the whole still world, rebuilt when a tree falls, a rock breaks or the map changes
  function rebuild() {
    const T = CC.T, m = map;
    P.identity();
    sparks = [];
    begin(statics);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, t = m.tiles[i], hx = x + 0.5 - ox, hz = y + 0.5 - oz, n = hash(x, y);
      if (t === T.WATER) { if (TH.lava && n > 0.7) sparks.push([x + 0.2 + hash(x, y, 31) * 0.6, y + 0.2 + hash(x, y, 32) * 0.6, 0, n * 9]); continue; }
      const top = 0.1 + (t === T.GRASS || t === T.TREE || t === T.ROCK ? m.hgt[i] : 0);
      let col;
      if (t === T.DIRT || t === T.SPAWN) col = n < 0.5 ? TH.dirt : TH.dirtDark;
      else if (t === T.SAND) col = n < 0.6 ? TH.sand : TH.sandDark;
      else col = TH.grass[(x + y) % 2 === 0 ? 0 : n < 0.5 ? 1 : 2];
      if (t === T.BRIDGE) {
        // planks over the water with a rail on each side, along the road
        put(hx, -0.08, hz, 1, 0.14, 1, TH.bridge);
        if (roadTurn(x, y)) { put(hx, 0.06, hz - 0.42, 1, 0.16, 0.12, COL.woodDark); put(hx, 0.06, hz + 0.42, 1, 0.16, 0.12, COL.woodDark); }
        else { put(hx - 0.42, 0.06, hz, 0.12, 0.16, 1, COL.woodDark); put(hx + 0.42, 0.06, hz, 0.12, 0.16, 1, COL.woodDark); }
        continue;
      }
      // a column of earth with a coloured top
      put(hx, (top - 0.13 - 0.6) / 2, hz, 1, top + 0.47, 1, TH.side);
      put(hx, top - 0.065, hz, 1, 0.13, 1, col);
      if (t === T.DIRT && n > 0.7) put(hx + (n - 0.85) * 2, top + 0.02, hz + (hash(x, y, 2) - 0.5) * 0.6, 0.12, 0.05, 0.1, TH.dirtDark);
      if (t === T.GRASS) decor(hx, top, hz, x, y, n);
      if (t === T.TREE) tree(hx, top, hz, x, y, m.life[i]);
      if (t === T.ROCK) rock(hx, top, hz, x, y, m.life[i]);
      if (t === T.SPAWN) gate(hx, top, hz, x, y);
    }
    castle(m);
    end();
    // water tiles (or lava), a little lower than the land; the edge of the map melts into the sea
    begin(water);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (m.tiles[i] !== CC.T.WATER && m.tiles[i] !== CC.T.BRIDGE) continue;
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y) === 0;
      put(x + 0.5 - ox, -0.2, y + 0.5 - oz, 1.001, 0.5, 1.001, edge ? TH.sea : TH.water[hash(x, y, 9) < 0.5 ? 0 : 1]);
    }
    end();
  }
  // little things on the grass: flowers and tufts, and each theme's own (pumpkins, graves, skulls, wisps, fireflies)
  function decor(hx, top, hz, x, y, n) {
    const a = hx + (hash(x, y, 4) - 0.5) * 0.6, b = hz + (hash(x, y, 5) - 0.5) * 0.6, k = hash(x, y, 3);
    if (n > 0.86) {
      if (TH.pumpkins && k < 0.45) { put(a, top + 0.09, b, 0.26, 0.18, 0.2, 0xf57c00); put(a, top + 0.09, b, 0.16, 0.2, 0.24, 0xfb8c00); put(a, top + 0.22, b, 0.04, 0.08, 0.04, 0x558b2f); }
      else if (TH.graves && k < 0.55) { put(a, top + 0.17, b, 0.22, 0.34, 0.08, 0x8f8b99); put(a, top + 0.35, b, 0.14, 0.05, 0.08, 0x8f8b99); put(a, top + 0.22, b + 0.045, 0.04, 0.16, 0.01, 0x5a5664); put(a, top + 0.25, b + 0.045, 0.12, 0.04, 0.01, 0x5a5664); }
      else if (TH.skulls && k < 0.3) { put(a, top + 0.06, b, 0.14, 0.12, 0.14, 0xf5efe0); put(a - 0.035, top + 0.07, b + 0.071, 0.035, 0.035, 0.01, 0x3e2723); put(a + 0.035, top + 0.07, b + 0.071, 0.035, 0.035, 0.01, 0x3e2723); }
      else { put(a, top + 0.08, b, 0.1, 0.1, 0.1, TH.flower[Math.floor(k * 4)]); put(a, top + 0.02, b, 0.04, 0.08, 0.04, TH.stem); }
      if (TH.graves && hash(x, y, 33) < 0.4) sparks.push([a + ox, b + oz, 1, n * 7]);
      if (TH.lava && hash(x, y, 33) < 0.5) sparks.push([a + ox, b + oz, 3, n * 7]);
    } else if (n > 0.7) {
      const c = hx + (hash(x, y, 6) - 0.5) * 0.5, d = hz + (hash(x, y, 7) - 0.5) * 0.5;
      put(c, top + 0.05, d, 0.06, 0.12, 0.06, TH.tuft); put(c + 0.08, top + 0.04, d + 0.05, 0.06, 0.09, 0.06, TH.tuft);
    }
    if (TH.flies && hash(x, y, 34) < 0.05) sparks.push([x + 0.5, y + 0.5, 2, hash(x, y, 35) * 9]);
  }
  const PINE = [[0.55, 0.32, 0.8], [0.85, 0.3, 0.6], [1.12, 0.28, 0.38]];   // a pine's layers: height, thickness, width
  function tree(x, y, z, tx, ty, life) {
    const k = hash(tx, ty, 11), s = 0.85 + k * 0.3, lean = (hash(tx, ty, 12) - 0.5) * 0.12, shrink = life >= 3 ? 1 : life === 2 ? 0.92 : 0.82, kind = TH.tree;
    const ci = Math.floor(hash(tx, ty, 13) * 4);
    if (kind === 'cactus') {
      // a cactus: a ribbed green column with an arm or two (and now and then a flower)
      const c = TH.leaves[ci], hh = 0.95 * s * shrink, ay = y + hh * (0.35 + hash(tx, ty, 14) * 0.2);
      put(x, y + hh / 2, z, 0.26, hh, 0.26, c); put(x, y + hh / 2, z + 0.131, 0.05, hh * 0.9, 0.01, TH.leaves[(ci + 1) % 4]);
      put(x - 0.2, ay, z, 0.16, 0.12, 0.14, c); put(x - 0.25, ay + 0.15, z, 0.12, 0.3, 0.12, c);
      if (k > 0.4) { put(x + 0.2, ay + 0.12, z, 0.16, 0.12, 0.14, c); put(x + 0.25, ay + 0.25, z, 0.12, 0.26, 0.12, c); }
      if (k > 0.75) put(x, y + hh + 0.04, z, 0.1, 0.08, 0.1, 0xff6f91);
    } else if (kind === 'bare' || kind === 'charred') {
      // a dead tree: a crooked trunk and bare branches (a few purple leaves in haunted woods, embers in burnt ones)
      const tc = TH.trunk, hh = 1.05 * s * shrink;
      put(x, y + hh / 2, z, 0.2, hh, 0.2, tc);
      put(x - 0.17, y + hh * 0.68, z, 0.2, 0.07, 0.07, tc); put(x - 0.27, y + hh * 0.82, z, 0.07, 0.24, 0.07, tc);
      put(x + 0.15, y + hh * 0.84, z + 0.04, 0.18, 0.07, 0.07, tc); put(x + 0.24, y + hh * 0.97, z + 0.04, 0.07, 0.2, 0.07, tc);
      put(x + 0.02, y + hh * 0.58, z - 0.15, 0.07, 0.07, 0.2, tc); put(x + 0.02, y + hh * 0.7, z - 0.24, 0.07, 0.2, 0.07, tc);
      put(x + lean, y + hh + 0.06, z, 0.08, 0.14, 0.08, tc);
      if (kind === 'bare' && k > 0.35) { put(x - 0.27, y + hh * 0.96, z, 0.18, 0.12, 0.18, TH.leaves[ci]); put(x + 0.24, y + hh * 1.1, z + 0.04, 0.15, 0.11, 0.15, TH.leaves[(ci + 1) % 4]); }
      if (kind === 'charred' && k > 0.45) { put(x + 0.04, y + hh * 0.42, z + 0.101, 0.05, 0.12, 0.01, 0xff6d00); put(x - 0.101, y + hh * 0.62, z - 0.03, 0.01, 0.08, 0.05, 0xff9100); }
    } else if (k < 0.35 || kind === 'snowy') {
      // a pine: stacked layers getting smaller (with snow on each in the snow)
      put(x, y + 0.25 * s, z, 0.2, 0.5 * s, 0.2, TH.trunk);
      const c = TH.pine[k < 0.17 ? 0 : 1];
      for (const [ly, lh, lw] of PINE) {
        put(x + lean, y + ly * s, z, lw * s * shrink, lh * s, lw * s * shrink, c);
        if (TH.cap) put(x + lean, y + (ly + lh * 0.5) * s, z, lw * s * shrink * 0.8, 0.07 * s, lw * s * shrink * 0.8, TH.cap);
      }
      put(x + lean, y + 1.33 * s, z, 0.16 * s, 0.16 * s, 0.16 * s, TH.cap || c);
    } else {
      // a round tree: a trunk and a blocky crown
      put(x, y + 0.3 * s, z, 0.22, 0.6 * s, 0.22, TH.trunk);
      const c = TH.leaves[ci];
      put(x + lean, y + 0.85 * s, z, 0.78 * s * shrink, 0.55 * s, 0.78 * s * shrink, c);
      put(x + lean + 0.12, y + 1.18 * s, z - 0.08, 0.5 * s * shrink, 0.32 * s, 0.5 * s * shrink, c);
      if (hash(tx, ty, 14) > 0.6) put(x + lean - 0.22, y + 0.95 * s, z + 0.2, 0.3 * s, 0.3 * s, 0.3 * s, TH.leaves[(ci + 1) % 4]);
    }
  }
  function rock(x, y, z, tx, ty, life) {
    const k = hash(tx, ty, 21), c = TH.rock[Math.floor(k * 3)], s = life >= 4 ? 1 : life === 3 ? 0.9 : life === 2 ? 0.78 : 0.65;
    put(x, y + 0.24 * s, z, 0.72 * s, 0.5 * s, 0.68 * s, c);
    put(x + 0.18 * s, y + 0.5 * s, z - 0.1 * s, 0.42 * s, 0.32 * s, 0.4 * s, TH.rock[(Math.floor(k * 3) + 1) % 3]);
    put(x - 0.22 * s, y + 0.15 * s, z + 0.2 * s, 0.32 * s, 0.26 * s, 0.3 * s, c);
    if (k > 0.5) { put(x + 0.1, y + 0.36 * s, z + 0.35 * s, 0.12, 0.1, 0.02, TH.ore); put(x - 0.2, y + 0.3 * s, z + 0.35 * s, 0.08, 0.08, 0.02, TH.ore); }
    if (TH.cap) put(x + 0.18 * s, y + 0.68 * s, z - 0.1 * s, 0.36 * s, 0.05, 0.34 * s, TH.cap);
  }
  function gate(x, y, z) {
    // a zombie gate: a ring of dark stones, gravestones and a green glow
    for (const [dx, dz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) { put(x + dx, y + 0.35, z + dz, 0.2, 0.7, 0.2, 0x5a5f6b); put(x + dx, y + 0.75, z + dz, 0.26, 0.1, 0.26, 0x4a4f5b); }
    put(x, y + 0.03, z, 0.9, 0.06, 0.9, 0x3f6b2f);
    put(x - 0.7, y + 0.2, z + 0.1, 0.18, 0.4, 0.08, 0x9aa1a8); put(x + 0.7, y + 0.18, z - 0.15, 0.18, 0.36, 0.08, 0x9aa1a8);
  }
  function castle(m) {
    const x0 = m.cx - 2 - ox, z0 = m.cz - 2 - oz, y = 0.1, cap = TH.cap;
    // the yard: stone floor
    put(m.cx + 0.5 - ox, y + 0.05, m.cz + 0.5 - oz, 5, 0.1, 5, 0xb9bec7);
    // walls with crenellations
    for (let k = 0; k < 5; k++) for (const side of [0, 1, 2, 3]) {
      const px = side === 0 ? x0 + k + 0.5 : side === 1 ? x0 + k + 0.5 : side === 2 ? x0 + 0.5 : x0 + 4.5;
      const pz = side === 0 ? z0 + 0.5 : side === 1 ? z0 + 4.5 : z0 + k + 0.5;
      if (k === 2) continue;   // gates in the middle of each side
      put(px, y + 0.4, pz, 1, 0.8, 1, k % 2 ? COL.stone : 0xccd1d9);
      put(px - 0.25, y + 0.9, pz - 0.25, 0.4, 0.2, 0.4, COL.stoneDark); put(px + 0.25, y + 0.9, pz + 0.25, 0.4, 0.2, 0.4, COL.stoneDark);
    }
    // gates: an arch with a wooden door
    for (const [gx, gz, along] of [[x0 + 2.5, z0 + 0.5, 1], [x0 + 2.5, z0 + 4.5, 1], [x0 + 0.5, z0 + 2.5, 0], [x0 + 4.5, z0 + 2.5, 0]]) {
      put(gx, y + 0.72, gz, 1, 0.22, 1, COL.stone);
      put(gx, y + 0.3, gz, along ? 0.7 : 0.25, 0.6, along ? 0.25 : 0.7, COL.woodDark);
    }
    // corner towers with roofs (snowy in the snow)
    for (const [tx, tz] of [[x0 + 0.5, z0 + 0.5], [x0 + 4.5, z0 + 0.5], [x0 + 0.5, z0 + 4.5], [x0 + 4.5, z0 + 4.5]]) {
      put(tx, y + 0.7, tz, 1.2, 1.4, 1.2, 0xd3d7de);
      put(tx, y + 1.46, tz, 1.34, 0.12, 1.34, COL.stoneDark);
      put(tx, y + 1.65, tz, 1.1, 0.26, 1.1, COL.roof); put(tx, y + 1.87, tz, 0.76, 0.2, 0.76, COL.roofDark); put(tx, y + 2.04, tz, 0.36, 0.16, 0.36, COL.roof);
      if (cap) { put(tx, y + 1.79, tz, 1.0, 0.03, 1.0, cap); put(tx, y + 1.98, tz, 0.66, 0.03, 0.66, cap); put(tx, y + 2.13, tz, 0.3, 0.03, 0.3, cap); }
      put(tx, y + 0.85, tz + 0.61, 0.18, 0.26, 0.02, 0x3a3f4a);
    }
    // the keep in the middle with the big roof and the flag
    const kx = m.cx + 0.5 - ox, kz = m.cz + 0.5 - oz;
    put(kx, y + 0.8, kz, 2.2, 1.6, 2.2, 0xe2e5ea);
    put(kx, y + 1.66, kz, 2.4, 0.14, 2.4, COL.stoneDark);
    put(kx, y + 1.9, kz, 2.1, 0.34, 2.1, COL.roof); put(kx, y + 2.18, kz, 1.5, 0.3, 1.5, COL.roofDark); put(kx, y + 2.44, kz, 0.9, 0.26, 0.9, COL.roof); put(kx, y + 2.64, kz, 0.4, 0.2, 0.4, COL.roofDark);
    if (cap) { put(kx, y + 2.08, kz, 1.95, 0.03, 1.95, cap); put(kx, y + 2.34, kz, 1.38, 0.03, 1.38, cap); put(kx, y + 2.58, kz, 0.8, 0.03, 0.8, cap); }
    put(kx, y + 3.15, kz, 0.06, 1, 0.06, 0x6b4a2b);
    put(kx, y + 0.5, kz + 1.11, 0.5, 0.6, 0.02, COL.woodDark); put(kx - 0.6, y + 1.1, kz + 1.11, 0.22, 0.28, 0.02, 0x3a3f4a); put(kx + 0.6, y + 1.1, kz + 1.11, 0.22, 0.28, 0.02, 0x3a3f4a);
  }

  /* ================= the crew ================= */
  // each weapon in the right hand: a, the swing (hammer); g, golden (the top tier); tc, the colour of its tier's glow
  const WEAPON_LOOK = {
    blaster: (a, g, tc) => { put(0.2, 0.52, 0.32, 0.1, 0.12, 0.3, g ? COL.gold : 0x5b6573); put(0.2, 0.55, 0.5, 0.06, 0.06, 0.16, tc || 0xffc94d); },
    hammer: (a, g, tc) => { putSwing(0.22, 0.55, 0.2, a, 0.22, 0.75, 0.2, 0.06, 0.5, 0.06, COL.wood); putSwing(0.22, 0.55, 0.2, a, 0.22, 1.0, 0.2, 0.28, 0.16, 0.16, g ? COL.gold : 0x7b8794); if (tc) putSwing(0.22, 0.55, 0.2, a, 0.22, 1.0, 0.2, 0.3, 0.05, 0.18, tc); },
    scatter: (a, g, tc) => { put(0.2, 0.52, 0.3, 0.16, 0.12, 0.32, g ? COL.gold : 0x8d5a2b); put(0.16, 0.56, 0.5, 0.05, 0.05, 0.16, tc || 0x444b55); put(0.24, 0.56, 0.5, 0.05, 0.05, 0.16, tc || 0x444b55); },
    flamer: (a, g, tc) => { put(0, 0.55, -0.22, 0.2, 0.3, 0.12, g ? COL.gold : 0xd84315); put(0.2, 0.5, 0.32, 0.1, 0.1, 0.34, 0x5b6573); put(0.2, 0.5, 0.52, 0.08, 0.08, 0.06, tc || 0xff9800); },
    crossbow: (a, g, tc) => { put(0.2, 0.52, 0.32, 0.08, 0.08, 0.36, g ? COL.gold : COL.wood); put(0.2, 0.55, 0.46, 0.4, 0.05, 0.05, g ? COL.goldDark : COL.woodDark); if (tc) put(0.2, 0.57, 0.5, 0.04, 0.04, 0.14, tc); },
    frost: (a, g, tc) => { put(0.22, 0.55, 0.3, 0.05, 0.05, 0.4, g ? COL.gold : 0xb3e5fc); put(0.22, 0.58, 0.52, 0.12, 0.12, 0.12, tc || 0x81d4fa); },
    bomb: (a, g, tc) => { put(0.2, 0.55, 0.28, 0.16, 0.16, 0.42, g ? COL.gold : 0x4e5865); put(0.2, 0.55, 0.5, 0.18, 0.18, 0.04, tc || 0x2f3640); },
    lightning: (a, g, tc) => { put(0.22, 0.6, 0.25, 0.05, 0.75, 0.05, g ? COL.gold : 0x8d6e63); put(0.22, 1.0, 0.25, 0.14, 0.14, 0.14, tc || 0xffeb3b); }
  };
  const TIER_GLOW = [0, 0x80d8ff, 0x69f0ae, 0xea80fc, 0xffd740];
  const TIP = { blaster: [0.2, 0.55, 0.6], scatter: [0.2, 0.56, 0.6], flamer: [0.2, 0.5, 0.57], crossbow: [0.2, 0.57, 0.6], frost: [0.22, 0.58, 0.52], bomb: [0.2, 0.55, 0.54], lightning: [0.22, 1.0, 0.25] };
  function drawPlayer(p, t) {
    const look = CREW[p.slot % 4], moving = p.moving ? 1 : 0, ph = t * 11 + p.slot, sw = moving * Math.sin(ph) * 0.6;
    const bob = moving * Math.abs(Math.sin(ph)) * 0.04, act = p.act, tier = Math.max(0, Math.min(4, p.tier || 0));
    place(p.x, 0.1 + bob, p.z, p.rot, 1);
    if (p.down) { place(p.x, 0.1, p.z, p.rot, 1); P.multiply(Tm.makeRotationX(-1.4)); }
    // legs, body, head, cap
    putSwing(-0.1, 0.32, 0, sw, -0.1, 0.16, 0, 0.14, 0.32, 0.16, 0x37474f);
    putSwing(0.1, 0.32, 0, -sw, 0.1, 0.16, 0, 0.14, 0.32, 0.16, 0x37474f);
    put(0, 0.5, 0, 0.42, 0.36, 0.28, look.shirt);
    put(0, 0.36, 0, 0.44, 0.06, 0.3, 0x5d4037);
    put(0, 0.84, 0, 0.36, 0.32, 0.34, SKIN);
    put(-0.08, 0.86, 0.172, 0.06, 0.08, 0.02, 0x263238); put(0.08, 0.86, 0.172, 0.06, 0.08, 0.02, 0x263238);
    put(0, 1.02, -0.02, 0.4, 0.1, 0.38, look.hat); put(0, 1.0, 0.2, 0.3, 0.05, 0.12, look.hat);
    // from the third weapon tier a cape and a star on the chest; the top tier trims the cape with gold
    if (tier >= 3) {
      const ca = 0.12 + moving * 0.3 + Math.sin(ph * 0.5) * 0.05;
      putSwing(0, 0.68, -0.15, ca, 0, 0.45, -0.17, 0.38, 0.46, 0.04, look.hat);
      if (tier >= 4) putSwing(0, 0.68, -0.15, ca, 0, 0.23, -0.17, 0.38, 0.05, 0.045, COL.gold);
      put(0.1, 0.56, 0.145, 0.08, 0.08, 0.02, COL.gold);
    }
    // arms: forward when firing, swinging when walking
    const armA = act === 'fire' || p.fireHold ? -1.35 : act === 'chop' || act === 'mine' ? -1.7 + Math.sin(t * 30) * 0.8 : -sw * 0.8;
    putSwing(-0.27, 0.66, 0, armA, -0.27, 0.5, 0, 0.1, 0.3, 0.12, look.shirt);
    putSwing(0.27, 0.66, 0, act === 'fire' || p.fireHold ? -1.35 : sw * 0.8, 0.27, 0.5, 0, 0.1, 0.3, 0.12, look.shirt);
    if (act === 'chop' || act === 'mine') { putSwing(0.27, 0.66, 0, armA, 0.27, 0.4, 0.15, 0.05, 0.4, 0.05, COL.wood); putSwing(0.27, 0.66, 0, armA, 0.27, 0.25, 0.22, 0.25, 0.08, 0.08, 0x7b8794); }
    else {
      const L = WEAPON_LOOK[p.weapon];
      if (L) L(act === 'fire' ? -1.2 : 0, tier >= 4, TIER_GLOW[tier]);
      // a weapon of a higher tier glows at its tip
      const q = TIP[p.weapon];
      if (tier && q && !p.down) { const s = 0.07 + Math.sin(t * 8 + p.slot) * 0.02; shine(q[0], q[1], q[2], s, s, s, TIER_GLOW[tier]); }
    }
  }

  /* ================= zombies ================= */
  // zombie looks: skin, shirt, trousers and extra pieces. see: drawn see-through (ghosts and shadows)
  const ZLOOK = {
    walker: { skin: 0x8bc34a, shirt: 0x5c7a99, legs: 0x5d4037 },
    runner: { skin: 0x9ccc65, shirt: 0xff8a3d, legs: 0x455a64, thin: 0.82 },
    brute: { skin: 0x7cb342, shirt: 0x7e57c2, legs: 0x4e342e, wide: 1.25 },
    knight: { skin: 0x8bc34a, shirt: 0x9ea7b3, legs: 0x78909c, helm: 0xb0bec5 },
    spitter: { skin: 0xc0ca33, shirt: 0x6d8b3a, legs: 0x5d4037, mouth: 1 },
    bomber: { skin: 0x8bc34a, shirt: 0xc62828, legs: 0x37474f, tnt: 1 },
    shadow: { skin: 0x55307f, shirt: 0x3a2160, legs: 0x2a1748, eyes: 0xe040fb, glowEyes: 1, see: 1 },
    ghost: { skin: 0xe3f2fd, shirt: 0xe3f2fd, legs: 0xe3f2fd, ghost: 1, see: 1 },
    frosty: { skin: 0x9be7ff, shirt: 0x4fc3f7, legs: 0x0288d1, ice: 1 },
    blaze: { skin: 0xff7043, shirt: 0xbf360c, legs: 0x4e342e, fire: 1 },
    digger: { skin: 0x9ccc65, shirt: 0x8d6e63, legs: 0x5d4037, miner: 1 },
    blob: { skin: 0x66bb6a, blob: 1 },
    mini: { skin: 0x81c784, blob: 1 },
    shield: { skin: 0x8bc34a, shirt: 0x6d4c41, legs: 0x3e2723, shieldBoard: 1 },
    shaman: { skin: 0xaed581, shirt: 0x6a1b9a, legs: 0x4a148c, robe: 1, staff: 1 },
    bat: { skin: 0x4a3b5c, bat: 1 },
    mummy: { skin: 0xdccfa8, shirt: 0xd0c29a, legs: 0xc4b58d, wrap: 0xa8976b, eyes: 0xffb300 },
    skeleton: { skin: COL.bone, shirt: COL.bone, legs: COL.bone, bones: 1 },
    giant: { skin: 0x8a9a78, shirt: 0x6d5a40, legs: 0x4e4232, wide: 1.3, club: 1 },
    king: { skin: 0x7cb342, shirt: 0x8e24aa, legs: 0x4a148c, crown: 1, cape: 0xc62828, wide: 1.15 },
    witch: { skin: 0x9ccc65, shirt: 0x311b92, legs: 0x311b92, robe: 1, hat: 1 },
    colossus: { skin: 0x8d9a8f, shirt: 0x546e7a, legs: 0x37474f, wide: 1.2, eyes: 0xff5252 },
    dragon: { skin: 0xeee6d2, dragon: 1 },
    overlord: { skin: 0x56634c, shirt: 0x2f323d, legs: 0x23252e, wide: 1.25, eyes: 0xff1744, glowEyes: 1, armour: 1 }
  };
  const FLY = { ghost: 0.3, bat: 0.85, witch: 0.4, dragon: 0.9 };   // how high the fliers float
  // how high a zombie's head is (bars and stars go over it)
  function zTop(zb) { const Z = CC.ZOMBIES[zb.type] || {}; return 0.1 + (Z.fly ? FLY[zb.type] || 0.4 : 0) + 1.15 * (Z.size || 1); }
  // flags: 1 underground, 2 slowed, 4 burning, 8 attacking, 16 just hit, 32 frozen, 64 bones, 128 stunned, 256 acid
  function drawZombie(zb, t, lite) {
    const Z = CC.ZOMBIES[zb.type] || CC.ZOMBIES.walker, L = ZLOOK[zb.type] || ZLOOK.walker, size = Z.size || 1, f = zb.flags || 0, hit = f & 16;
    const still = f & 160, ph = t * (6 + Z.speed * 4) + zb.id * 1.7, moving = !(f & 8) && !still, sw = moving ? Math.sin(ph) * 0.55 : 0, lunge = f & 8 ? 0.25 : 0;
    if (f & 1) {
      // a digger underground: a moving mound of earth
      place(zb.x, 0.1, zb.z, zb.rot, 1);
      put(0, 0.08, 0, 0.6, 0.16, 0.6, TH.dirtDark); put(0.1, 0.18, -0.05, 0.3, 0.12, 0.3, TH.dirt);
      return;
    }
    if (f & 64) { bonePile(zb, t, size); return; }
    const y = 0.1 + (Z.fly ? (FLY[zb.type] || 0.4) + Math.sin(t * 3 + zb.id) * 0.08 : moving ? Math.abs(Math.sin(ph)) * 0.03 : 0);
    place(zb.x, y, zb.z, zb.rot, size);
    // white when hit, icy when frozen, green while acid eats it
    let skin = L.skin, shirt = L.shirt || L.skin, legs = L.legs || L.skin;
    if (f & 256) { skin = mix(skin, 0x9cff57, 0.5); shirt = mix(shirt, 0x9cff57, 0.25); }
    if (f & 32) { skin = mix(skin, 0xb3e5fc, 0.55); shirt = mix(shirt, 0xb3e5fc, 0.45); legs = mix(legs, 0xb3e5fc, 0.45); }
    if (hit) skin = shirt = 0xffffff;
    if (L.blob) {
      const sq = still ? 1 : 1 + Math.sin(ph * 1.3) * 0.08;
      put(0, 0.3 * sq, 0, 0.62, 0.6 * sq, 0.62, skin); put(0, 0.66 * sq, 0, 0.44, 0.14, 0.44, skin);
      put(-0.12, 0.42, 0.315, 0.1, 0.12, 0.02, 0x1b1b1b); put(0.12, 0.42, 0.315, 0.1, 0.12, 0.02, 0x1b1b1b);
    } else if (L.bat) bat(skin, t, zb);
    else if (L.dragon) dragon(skin, t, zb, lite);
    else {
      const wdt = L.wide || 1, thin = L.thin || 1, fz = lunge * 0.4;
      if (L.bones) {
        // a skeleton: thin leg bones, hips, a spine with ribs and a skull
        putSwing(-0.09, 0.32, 0, sw, -0.09, 0.16, 0, 0.07, 0.32, 0.07, skin); putSwing(0.09, 0.32, 0, -sw, 0.09, 0.16, 0, 0.07, 0.32, 0.07, skin);
        put(0, 0.35, 0, 0.26, 0.07, 0.14, skin); put(0, 0.52, -0.02, 0.06, 0.34, 0.06, 0xd8d2c4);
        for (const ry of [0.46, 0.55, 0.64]) put(0, ry, 0.02 + lunge * 0.3, 0.32, 0.045, 0.2, skin);
        put(0, 0.86, 0.04 + fz, 0.3, 0.28, 0.3, skin); put(0, 0.74, 0.14 + fz, 0.2, 0.05, 0.12, skin);
        put(-0.07, 0.88, 0.195 + fz, 0.08, 0.08, 0.02, 0x212121); put(0.07, 0.88, 0.195 + fz, 0.08, 0.08, 0.02, 0x212121);
      } else {
        if (!L.ghost && !L.robe) {
          putSwing(-0.1, 0.32, 0, sw, -0.1, 0.16, 0, 0.15, 0.32, 0.16, legs);
          putSwing(0.1, 0.32, 0, -sw, 0.1, 0.16, 0, 0.15, 0.32, 0.16, legs);
        } else if (L.robe) put(0, 0.22, 0, 0.4 * wdt, 0.44, 0.3, shirt);
        else put(0, 0.2, -0.05, 0.3, 0.3, 0.22, skin);
        put(0, 0.52, 0.02 + lunge * 0.3, 0.44 * wdt * thin, 0.38, 0.28, shirt);
        put(0, 0.86, 0.04 + fz, 0.36, 0.32, 0.34, skin);
        const eye = L.eyes || (L.ghost ? 0x37474f : 0xb71c1c);
        if (L.glowEyes) { shine(-0.08, 0.88, 0.222 + fz, 0.08, 0.07, 0.02, eye); shine(0.08, 0.88, 0.222 + fz, 0.08, 0.07, 0.02, eye); }
        else { put(-0.08, 0.88, 0.215 + fz, 0.07, 0.07, 0.02, eye); put(0.08, 0.88, 0.215 + fz, 0.07, 0.07, 0.02, eye); }
        if (L.mouth && !lite) put(0, 0.76, 0.215 + fz, 0.18, 0.08, 0.03, 0x33691e);
      }
      // arms straight out in front, swaying (a giant's hang down and swing its club)
      const armA = L.club ? -0.35 + sw * 0.4 - (f & 8 ? 0.8 + Math.sin(t * 12 + zb.id) * 0.6 : 0) : -1.5 + Math.sin(ph * 0.5) * 0.15 - lunge * 1.5, aw = L.bones ? 0.06 : 0.11;
      putSwing(-0.29 * wdt, 0.68, 0, L.club ? -0.35 - sw * 0.4 : armA, -0.29 * wdt, 0.52, 0, aw, 0.32, aw + 0.01, skin);
      putSwing(0.29 * wdt, 0.68, 0, armA + 0.12, 0.29 * wdt, 0.52, 0, aw, 0.32, aw + 0.01, skin);
      if (L.club) {
        // a giant's club: a handle and a big spiked head, held out in front (it smashes down when attacking)
        const cx = 0.29 * wdt, ca = armA + 0.12;
        putSwing(cx, 0.68, 0, ca, cx, 0.36, 0.24, 0.08, 0.08, 0.42, 0x8d6e63); putSwing(cx, 0.68, 0, ca, cx, 0.38, 0.55, 0.24, 0.26, 0.3, 0x5d4037);
        if (!lite) { putSwing(cx, 0.68, 0, ca, cx, 0.53, 0.55, 0.06, 0.06, 0.06, 0xbdbdbd); putSwing(cx, 0.68, 0, ca, cx + 0.14, 0.38, 0.55, 0.06, 0.06, 0.06, 0xbdbdbd); putSwing(cx, 0.68, 0, ca, cx - 0.14, 0.38, 0.6, 0.06, 0.06, 0.06, 0xbdbdbd); }
      }
      if (f & 256 && !lite && !L.blob) {
        // acid: green drips running down
        const u = (t * 0.9 + zb.id * 0.31) % 1, v = (t * 0.9 + zb.id * 0.31 + 0.5) % 1;
        put(-0.12, 0.66 - u * 0.36, 0.17, 0.05, 0.08, 0.02, 0x76ff03); put(0.1, 0.94 - v * 0.3, 0.22, 0.05, 0.07, 0.02, 0x76ff03);
      }
      if (L.wrap) {
        // a mummy's bandages, and a loose end flapping behind
        const wc = hit ? 0xffffff : L.wrap;
        put(0, 0.44, 0.02 + lunge * 0.3, 0.46 * wdt, 0.035, 0.3, wc); put(0, 0.6, 0.02 + lunge * 0.3, 0.46 * wdt, 0.035, 0.3, wc); put(0, 0.97, 0.04 + fz, 0.38, 0.035, 0.36, wc);
        if (!lite) { put(0, 0.79, 0.04 + fz, 0.38, 0.035, 0.36, wc); putSwing(0.12, 0.62, -0.14, 0.4 + Math.sin(ph) * 0.3, 0.12, 0.42, -0.15, 0.07, 0.36, 0.02, shirt); }
      }
      if (L.armour) {
        // the overlord: spiked shoulder plates, a breastplate with a red stone, horns, a spiked iron crown and a cape
        const pl = hit ? 0xffffff : 0x454a5a;
        for (const s of [-1, 1]) { put(s * 0.33 * wdt, 0.74, 0.02, 0.24, 0.16, 0.32, pl); put(s * 0.36 * wdt, 0.87, 0.02, 0.05, 0.13, 0.05, COL.bone); put(s * 0.16, 1.08, 0.02 + fz, 0.07, 0.16, 0.07, COL.bone); put(s * 0.22, 1.2, -0.02 + fz, 0.06, 0.12, 0.06, COL.bone); }
        put(0, 0.56, 0.17 + lunge * 0.3, 0.3, 0.22, 0.03, pl); shine(0, 0.6, 0.19 + lunge * 0.3, 0.07, 0.07, 0.02, 0xff1744);
        put(0, 1.05, 0.04 + fz, 0.38, 0.08, 0.36, 0x263238); for (const cx of [-0.11, 0, 0.11]) put(cx, 1.14, 0.2 + fz, 0.05, 0.12, 0.03, 0x37474f);
        putSwing(0, 0.72, -0.16, 0.08 + (moving ? 0.12 : 0), 0, 0.42, -0.2, 0.5 * wdt, 0.62, 0.04, 0x7f1010);
      }
      if (L.helm) { put(0, 1.04, 0.02, 0.4, 0.12, 0.38, L.helm); put(0, 0.9, 0.2, 0.3, 0.05, 0.02, 0x546e7a); put(0, 1.14, -0.05, 0.06, 0.12, 0.2, 0xe53935); put(0, 0.56, 0.15, 0.4 * wdt, 0.3, 0.04, L.helm); }
      if (L.tnt) { put(0, 0.56, -0.2, 0.34, 0.3, 0.14, 0xd32f2f); put(-0.08, 0.56, -0.28, 0.06, 0.3, 0.02, 0x212121); put(0.08, 0.76, -0.22, 0.03, 0.14, 0.03, 0x5d4037); if (Math.sin(t * 20) > 0) put(0.08, 0.85, -0.22, 0.06, 0.06, 0.06, 0xffeb3b); }
      if (L.ice) { put(-0.22, 0.74, 0, 0.12, 0.16, 0.12, 0xe1f5fe); put(0.22, 0.78, 0, 0.1, 0.2, 0.1, 0xe1f5fe); put(0, 1.06, 0, 0.12, 0.14, 0.12, 0xe1f5fe); }
      if (L.fire) { const fl = 0.8 + Math.sin(t * 18 + zb.id) * 0.2; put(0, 1.06, 0, 0.26 * fl, 0.18 * fl, 0.26 * fl, 0xffb300); put(0.05, 1.18, -0.04, 0.14 * fl, 0.14 * fl, 0.14 * fl, 0xffeb3b); }
      if (L.miner) { put(0, 1.04, 0.02, 0.4, 0.1, 0.38, 0xfbc02d); put(0, 1.0, 0.2, 0.1, 0.08, 0.04, 0xfff59d); putSwing(0.29, 0.68, 0, armA + 0.12, 0.29, 0.4, 0.25, 0.04, 0.44, 0.04, COL.wood); putSwing(0.29, 0.68, 0, armA + 0.12, 0.29, 0.22, 0.32, 0.3, 0.06, 0.06, 0x78909c); }
      if (L.shieldBoard) { put(0, 0.56, 0.3, 0.56, 0.6, 0.06, 0x8d6e63); put(0, 0.56, 0.335, 0.2, 0.2, 0.02, 0xbcaaa4); put(-0.22, 0.56, 0.335, 0.04, 0.56, 0.02, 0x5d4037); put(0.22, 0.56, 0.335, 0.04, 0.56, 0.02, 0x5d4037); }
      if (L.staff) { put(0.34, 0.6, 0.18, 0.05, 0.9, 0.05, COL.wood); put(0.34, 1.08, 0.18, 0.14, 0.14, 0.14, 0xf5f5f5); put(0.31, 1.1, 0.25, 0.03, 0.03, 0.02, 0x212121); put(0, 0.9, 0.2, 0.26, 0.2, 0.02, 0x8e24aa); }
      if (L.hat) { put(0, 1.06, 0, 0.5, 0.06, 0.5, 0x1a1a2e); put(0, 1.2, 0, 0.3, 0.22, 0.3, 0x1a1a2e); put(0.04, 1.38, -0.04, 0.16, 0.16, 0.16, 0x1a1a2e); }
      if (L.crown) { put(0, 1.06, 0.02, 0.38, 0.1, 0.36, 0xffc107); for (const cx of [-0.14, 0, 0.14]) put(cx, 1.15, 0.17, 0.06, 0.1, 0.02, 0xffc107); put(0, 0.66, -0.2, 0.5, 0.6, 0.04, L.cape); }
    }
    // frozen: a block of ice round it (see-through)
    if (f & 32) { const wd = L.wide || 1; glass(0, 0.55, 0.02, 0.8 * wd, 1.24, 0.64, 0xc8f0ff); if (!lite) glass(0.16 * wd, 1.24, -0.08, 0.14, 0.2, 0.14, 0xe1f5fe); }
  }
  // a bat: a furry body, big ears, yellow eyes and wings flapping fast
  function bat(skin, t, zb) {
    const fl = Math.sin(t * 22 + zb.id) * 0.75;
    put(0, 0.5, 0, 0.3, 0.32, 0.3, skin); put(0, 0.76, 0.04, 0.26, 0.22, 0.24, skin);
    put(-0.08, 0.92, 0.04, 0.06, 0.12, 0.05, skin); put(0.08, 0.92, 0.04, 0.06, 0.12, 0.05, skin);
    put(-0.06, 0.78, 0.165, 0.05, 0.05, 0.02, 0xffeb3b); put(0.06, 0.78, 0.165, 0.05, 0.05, 0.02, 0xffeb3b);
    for (const s of [-1, 1]) {
      putRoll(s * 0.15, 0.56, 0, s * fl, s * 0.36, 0.56, -0.02, 0.42, 0.04, 0.3, 0x2d2238);
      putRoll(s * 0.15, 0.56, 0, s * fl, s * 0.64, 0.53, -0.06, 0.2, 0.03, 0.2, 0x2d2238);
      putRoll(s * 0.15, 0.56, 0, s * fl, s * 0.4, 0.59, 0.1, 0.52, 0.04, 0.04, 0x5a4a6e);
    }
  }
  // the bone dragon: ribs round a dark body, a long neck to a horned skull with icy eyes, a swaying tail, bony wings
  function dragon(skin, t, zb, lite) {
    const fl = 0.25 + Math.sin(t * 2.6 + zb.id) * 0.45, sway = Math.sin(t * 1.6 + zb.id) * 0.05;
    put(0, 0.45, 0, 0.2, 0.17, 0.46, 0x4e4658);
    for (const rz of [-0.15, -0.05, 0.05, 0.15]) put(0, 0.45, rz, 0.3, 0.26, 0.05, skin);
    put(0, 0.6, 0, 0.06, 0.06, 0.6, skin);
    for (let k = 1; k <= 3; k++) put(sway * k, 0.52 + k * 0.08, 0.24 + k * 0.1, 0.1, 0.1, 0.1, skin);
    const hx = sway * 4, hy = 0.86, hz = 0.64;
    put(hx, hy, hz, 0.2, 0.15, 0.24, skin); put(hx, hy - 0.09, hz + 0.05, 0.15, 0.05, 0.2, skin);
    put(hx - 0.07, hy + 0.12, hz - 0.08, 0.04, 0.14, 0.04, skin); put(hx + 0.07, hy + 0.12, hz - 0.08, 0.04, 0.14, 0.04, skin);
    put(hx - 0.06, hy + 0.02, hz + 0.121, 0.06, 0.05, 0.01, 0x263238); put(hx + 0.06, hy + 0.02, hz + 0.121, 0.06, 0.05, 0.01, 0x263238);
    shine(hx - 0.06, hy + 0.02, hz + 0.13, 0.04, 0.04, 0.02, 0x80deea); shine(hx + 0.06, hy + 0.02, hz + 0.13, 0.04, 0.04, 0.02, 0x80deea);
    for (let k = 1; k <= 5; k++) { const s = 0.1 - k * 0.012; put(Math.sin(t * 2 + k * 0.7) * 0.03 * k, 0.45 - k * 0.03, -0.24 - k * 0.1, s, s, 0.1, skin); }
    if (!lite) for (const [lx, lz] of [[-0.11, 0.13], [0.11, 0.13], [-0.11, -0.13], [0.11, -0.13]]) put(lx, 0.27, lz, 0.06, 0.18, 0.06, skin);
    for (const s of [-1, 1]) {
      const a = s * fl;
      putRoll(s * 0.13, 0.56, 0.05, a, s * 0.37, 0.6, 0.08, 0.48, 0.05, 0.05, skin);
      for (const fx of [0.26, 0.42, 0.58]) putRoll(s * 0.13, 0.56, 0.05, a, s * fx, 0.6, -0.1, 0.035, 0.035, 0.34, skin);
      putRoll(s * 0.13, 0.56, 0.05, a, s * 0.42, 0.59, -0.08, 0.38, 0.015, 0.3, 0x5a4e6a);
    }
  }
  // a skeleton fallen apart: a heap of bones on the road that twitches (it will get up again)
  function bonePile(zb, t, size) {
    const tw = Math.sin(t * 25 + zb.id) * 0.012;
    place(zb.x, 0.1, zb.z, zb.rot, size);
    put(0.12, 0.12 + tw, 0.05, 0.26, 0.24, 0.26, COL.bone);
    put(0.06, 0.14 + tw, 0.185, 0.06, 0.06, 0.02, 0x212121); put(0.18, 0.14 + tw, 0.185, 0.06, 0.06, 0.02, 0x212121);
    put(-0.14, 0.03, 0, 0.36, 0.06, 0.06, COL.bone); put(-0.04, 0.03, -0.18, 0.06, 0.06, 0.36, COL.bone);
    put(-0.2, 0.07, 0.15, 0.28, 0.05, 0.05, COL.bone); put(0.2, 0.03, -0.2, 0.3, 0.05, 0.05, 0xd8d2c4);
    put(-0.02, 0.06, -0.02, 0.24, 0.06, 0.18, 0xd8d2c4);
  }

  /* ================= towers ================= */
  // each tower's base (it gives the height its turning top stands on) and its top, which turns to the target.
  // tu: { type, a, b (steps bought on each upgrade path, 0 to 3), rot, stun, hp, max, spikes }. A third step on a
  // path always shows: something new on the tower.
  const TOWER_LOOK = {
    arrow: (tu) => {
      posts(0.3, 0, 1, 0.1, COL.wood); put(0, 1.02, 0, 0.84, 0.1, 0.84, COL.woodDark); put(0, 0.35, 0, 0.7, 0.06, 0.7, COL.woodDark);
      if (tu.a + tu.b >= 2) for (const [a, b] of CORNERS) put(a * 0.37, 1.14, b * 0.37, 0.09, 0.14, 0.09, COL.wood);   // a railing
      return 1.1;
    },
    wall: (tu, t) => {
      // a barricade across the road, sinking as it is smashed: wood, stone from a2; spikes a1, iron bands a3; a patch
      // b1, sticky tar b2, glowing runes b3
      const f = tu.max ? Math.max(0.2, Math.min(1, tu.hp / tu.max)) : 1, hs = 0.55 + 0.45 * f, mat = tu.a >= 2 ? COL.stone : COL.wood, dk = tu.a >= 2 ? COL.stoneDark : COL.woodDark;
      if (tu.b >= 2) { put(0, 0.005, 0, 0.84, 0.02, 0.84, 0x3a2c22); put(0.3, 0.005, 0.38, 0.22, 0.02, 0.14, 0x3a2c22); put(-0.36, 0.005, -0.3, 0.16, 0.02, 0.2, 0x3a2c22); }
      put(0, 0.3 * hs, 0, 0.96, 0.6 * hs, 0.3, mat);
      for (const a of [-0.36, 0, 0.36]) if (a || f > 0.6) put(a, 0.6 * hs + 0.08, 0, 0.12, 0.2, 0.12, dk);
      put(0, 0.2 * hs, 0.16, 1, 0.08, 0.04, dk); put(0, 0.45 * hs, -0.16, 1, 0.08, 0.04, dk);
      if (tu.a >= 1) { const sl = tu.a >= 3 ? 0.26 : 0.16; for (const a of [-0.3, 0, 0.3]) { put(a, 0.32 * hs, 0.15 + sl / 2, 0.05, 0.05, sl, 0xcfd8dc); put(a, 0.32 * hs, -0.15 - sl / 2, 0.05, 0.05, sl, 0xcfd8dc); } }
      if (tu.a >= 3) { put(0, 0.1 * hs, 0, 0.98, 0.06, 0.32, COL.ironDark); put(0, 0.5 * hs, 0, 0.98, 0.06, 0.32, COL.ironDark); put(-0.43, 0.3 * hs, 0, 0.06, 0.6 * hs, 0.32, COL.ironDark); put(0.43, 0.3 * hs, 0, 0.06, 0.6 * hs, 0.32, COL.ironDark); }
      if (tu.b >= 1) put(0.2, 0.33 * hs, 0.155, 0.2, 0.15, 0.02, 0xd7a86e);
      if (tu.b >= 3) { const g = 0.75 + Math.sin(t * 4 + tu.id) * 0.25; for (const a of [-0.22, 0.22]) { shine(a, 0.33 * hs, 0.165, 0.1 * g, 0.14 * g, 0.02, 0xb388ff); shine(a, 0.33 * hs, -0.165, 0.1 * g, 0.14 * g, 0.02, 0xb388ff); } }
      return 0.6 * hs + 0.18;
    },
    cannon: () => { put(0, 0.25, 0, 0.8, 0.5, 0.8, COL.stone); put(0, 0.53, 0, 0.86, 0.08, 0.86, COL.stoneDark); return 0.6; },
    frost: (tu) => {
      put(0, 0.35, 0, 0.6, 0.7, 0.6, COL.stone); put(0, 0.72, 0, 0.7, 0.06, 0.7, COL.stoneDark);
      if (tu.b >= 2) for (const [a, b] of CORNERS) put(a * 0.31, 0.42, b * 0.31, 0.08, 0.26, 0.08, 0xb3e5fc);   // ice shards on the pillar
      if (tu.b >= 3) for (const [a, b] of CORNERS) put(a * 0.36, 0.1, b * 0.36, 0.22, 0.2, 0.22, 0x81d4fa);    // permafrost round its foot
      return 0.75;
    },
    tesla: (tu) => {
      const n = tu.a >= 3 ? 5 : 3, w = tu.a >= 3 ? 0.44 : 0.36;   // more and wider coils for the storm coil (a3)
      put(0, 0.2, 0, 0.7, 0.4, 0.7, 0x546e7a); put(0, 0.42, 0, 0.5, 0.04, 0.5, 0x455a64);
      put(0, 0.425 + n * 0.125, 0, 0.14, n * 0.25 + 0.05, 0.14, 0xb0bec5);
      for (let k = 0; k < n; k++) put(0, 0.52 + k * 0.25, 0, w - k * 0.03, 0.06, w - k * 0.03, k % 2 ? 0xd4894a : 0xbf7a3a);
      return 0.4 + n * 0.25;
    },
    flame: (tu) => { put(0, 0.3, 0, 0.7, 0.6, 0.7, 0x6d4c41); put(0, 0.62, 0, 0.8, 0.08, 0.8, 0x3e2723); if (tu.a >= 2) for (const [a, b] of CORNERS) put(a * 0.36, 0.3, b * 0.36, 0.06, 0.6, 0.06, 0xbf360c); return 0.66; },
    mortar: (tu) => {
      put(0, 0.2, 0, 0.86, 0.4, 0.86, COL.stoneDark); put(0, 0.43, 0, 0.9, 0.06, 0.9, COL.stone);
      if (tu.a >= 1) { put(0.33, 0.53, 0.33, 0.12, 0.14, 0.12, 0x37474f); put(0.33, 0.62, 0.33, 0.07, 0.05, 0.07, 0xffb300); }   // shells ready
      return 0.46;
    },
    shrine: (tu) => {
      put(0, 0.2, 0, 0.8, 0.4, 0.8, 0xf5f5f5); put(0, 0.45, 0, 0.6, 0.1, 0.6, 0xe0e0e0); posts(0.3, 0.45, 0.5, 0.08, 0xffffff);
      if (tu.a >= 3 || tu.b >= 3) {   // a roof: golden (a3) or pink (b3)
        const c = tu.a >= 3 ? COL.gold : 0xf8bbd0, d = tu.a >= 3 ? COL.goldDark : 0xf48fb1;
        put(0, 0.98, 0, 0.84, 0.08, 0.84, d); put(0, 1.07, 0, 0.62, 0.1, 0.62, c); put(0, 1.17, 0, 0.42, 0.1, 0.42, d); put(0, 1.26, 0, 0.2, 0.08, 0.2, c);
      }
      return 0.6;
    },
    sniper: (tu) => {
      // a tall wooden nest with sandbags round its edge (a camouflage roof for the elite, b3)
      posts(0.27, 0, 1.5, 0.08, COL.woodDark);
      put(0, 0.55, 0.27, 0.56, 0.05, 0.05, COL.wood); put(0, 0.55, -0.27, 0.56, 0.05, 0.05, COL.wood); put(0.27, 1.0, 0, 0.05, 0.05, 0.56, COL.wood); put(-0.27, 1.0, 0, 0.05, 0.05, 0.56, COL.wood);
      put(0, 1.52, 0, 0.74, 0.08, 0.74, COL.wood);
      put(0, 1.62, 0.33, 0.74, 0.12, 0.08, 0xc8b07a); put(0, 1.62, -0.33, 0.74, 0.12, 0.08, 0xc8b07a); put(0.33, 1.62, 0, 0.08, 0.12, 0.58, 0xb89f6a); put(-0.33, 1.62, 0, 0.08, 0.12, 0.58, 0xb89f6a);
      if (tu.b >= 3) {
        // the elite's nest: camouflage netting over the sandbags and a radio mast with a red light
        put(0, 1.7, 0.335, 0.66, 0.06, 0.1, 0x556b2f); put(-0.2, 1.7, -0.335, 0.3, 0.06, 0.1, 0x6b8e23); put(0.335, 1.7, -0.05, 0.1, 0.06, 0.4, 0x4e5d2a); put(-0.335, 1.7, 0.1, 0.1, 0.06, 0.3, 0x556b2f);
        put(-0.33, 1.95, -0.33, 0.04, 0.6, 0.04, 0x37474f); shine(-0.33, 2.27, -0.33, 0.07, 0.07, 0.07, 0xff1744);
      }
      return 1.62;
    },
    glue: (tu, t) => {
      // a green slime tank on a stand, bubbling (bigger at a3, dripping at b3)
      const w = tu.a >= 3 ? 0.62 : 0.48, h = tu.a >= 3 ? 0.64 : 0.5, sl = tu.a >= 2 ? 0x9ccc65 : 0x7cd64b, u = (t * 0.8 + tu.id * 0.37) % 1;
      put(0, 0.08, 0, 0.78, 0.16, 0.78, 0x607d8b);
      put(0, 0.16 + h / 2, 0, w, h, w, sl);
      put(0, 0.16 + h * 0.2, 0, w + 0.04, 0.05, w + 0.04, 0x78909c); put(0, 0.16 + h * 0.85, 0, w + 0.04, 0.05, w + 0.04, 0x78909c);
      put(0.1, 0.16 + h * (0.3 + u * 0.5), w / 2 + 0.006, 0.06, 0.06, 0.01, 0xccff90);
      if (tu.b >= 3) {
        for (let k = 0; k < 2; k++) { const d = (t * 0.6 + k * 0.5 + tu.id * 0.13) % 1; put(k ? -w / 2 - 0.02 : w / 2 + 0.02, 0.16 + h * (0.9 - d * 0.8), k ? -0.1 : 0.12, 0.06, 0.1, 0.06, 0x8bc34a); }
        put(0.26, 0.01, 0.34, 0.3, 0.02, 0.22, 0x8bc34a);
      }
      return 0.16 + h + 0.02;
    },
    ninja: () => {
      // a little dojo: red pillars, paper walls and a two-step pagoda roof with turned-up corners
      put(0, 0.04, 0, 0.86, 0.08, 0.86, 0x8d6e63);
      posts(0.31, 0.08, 0.5, 0.08, 0xb71c1c);
      put(0, 0.32, 0, 0.58, 0.46, 0.58, 0xf3ead6);
      put(0, 0.32, 0.292, 0.04, 0.46, 0.01, 0x5d4037); put(0, 0.4, 0.292, 0.58, 0.03, 0.01, 0x5d4037);
      put(0, 0.62, 0, 0.96, 0.07, 0.96, 0x37474f); for (const [a, b] of CORNERS) put(a * 0.46, 0.68, b * 0.46, 0.08, 0.07, 0.08, 0x37474f);
      put(0, 0.7, 0, 0.7, 0.08, 0.7, 0x455a64); put(0, 0.79, 0, 0.46, 0.1, 0.46, 0x37474f);
      return 0.84;
    },
    wizard: (tu) => {
      // a purple stone tower with a lit window and a wizard's pointed hat for a roof (starry at b3)
      put(0, 0.1, 0, 0.7, 0.2, 0.7, 0x553c80); put(0, 0.55, 0, 0.58, 0.7, 0.58, 0x6a4c9c); put(0, 0.94, 0, 0.72, 0.08, 0.72, 0x553c80);
      put(-0.14, 0.4, 0.291, 0.16, 0.07, 0.01, 0x5d4290); put(0.13, 0.72, 0.291, 0.18, 0.07, 0.01, 0x5d4290); put(0.1, 0.5, 0.291, 0.12, 0.18, 0.01, 0xffd54f);
      const hat = 0x4527a0;
      put(0, 1.01, 0, 0.82, 0.06, 0.82, hat); put(0, 1.14, 0, 0.56, 0.2, 0.56, hat); put(0, 1.32, 0, 0.4, 0.18, 0.4, hat);
      put(0.03, 1.48, -0.02, 0.27, 0.16, 0.27, hat); put(0.07, 1.62, -0.06, 0.15, 0.14, 0.15, hat); put(0.12, 1.72, -0.1, 0.08, 0.08, 0.08, hat);
      if (tu.b >= 3) for (const [sx, sy, sz] of [[-0.12, 1.17, 0.285], [0.15, 1.1, 0.285], [0.08, 1.34, 0.205], [-0.03, 1.5, 0.12], [-0.3, 1.05, 0.3], [0.31, 1.05, -0.22]]) shine(sx, sy, sz, 0.07, 0.07, sz > 0.25 && sy < 1.06 ? 0.07 : 0.02, 0xffe082);
      return 0.96;
    },
    mine: (tu, t) => {
      // a little hill (the colour of the land) with a mine in it, rails and a cart of gold; a pile of gold at a3, a
      // coin press at b3
      put(0, 0.1, -0.1, 0.92, 0.2, 0.72, TH.side); put(0, 0.21, -0.1, 0.9, 0.04, 0.7, TH.grass[1]);
      put(0, 0.32, -0.16, 0.7, 0.2, 0.56, TH.side); put(0, 0.43, -0.16, 0.68, 0.04, 0.54, TH.grass[0]); put(0, 0.5, -0.2, 0.44, 0.12, 0.36, TH.grass[2]);
      put(0.3, 0.3, -0.3, 0.2, 0.16, 0.18, TH.rock[0]); put(-0.32, 0.27, -0.34, 0.16, 0.12, 0.14, TH.rock[1]);
      put(0, 0.19, 0.265, 0.28, 0.3, 0.01, 0x1b1b1b); put(-0.17, 0.2, 0.27, 0.06, 0.38, 0.06, COL.wood); put(0.17, 0.2, 0.27, 0.06, 0.38, 0.06, COL.wood); put(0, 0.41, 0.27, 0.44, 0.06, 0.08, COL.woodDark);
      put(-0.08, 0.01, 0.38, 0.03, 0.02, 0.24, 0x5d4037); put(0.08, 0.01, 0.38, 0.03, 0.02, 0.24, 0x5d4037);
      put(0, 0.1, 0.38, 0.3, 0.14, 0.2, 0x6d4c41); put(0, 0.2, 0.38, 0.26, 0.06, 0.16, COL.gold); put(-0.05, 0.24, 0.36, 0.08, 0.06, 0.08, 0xffe082);
      if (tu.a >= 3) { put(-0.32, 0.06, 0.28, 0.26, 0.12, 0.22, COL.gold); put(-0.3, 0.15, 0.28, 0.14, 0.08, 0.12, 0xffe082); put(-0.38, 0.03, 0.42, 0.08, 0.04, 0.08, COL.gold); shine(-0.3, 0.2, 0.28, 0.04, 0.04, 0.04, 0xffffff); }
      if (tu.b >= 3) {
        const pr = Math.max(0, Math.sin(t * 4 + tu.id)) * 0.1;
        put(0.32, 0.04, 0.26, 0.24, 0.08, 0.22, 0x607d8b); put(0.23, 0.26, 0.26, 0.04, 0.36, 0.04, 0x455a64); put(0.41, 0.26, 0.26, 0.04, 0.36, 0.04, 0x455a64); put(0.32, 0.45, 0.26, 0.24, 0.05, 0.08, 0x455a64);
        put(0.32, 0.36 - pr, 0.26, 0.1, 0.08, 0.1, 0xc62828); put(0.32, 0.1, 0.26, 0.09, 0.04, 0.09, COL.gold);
      }
      return 0;
    },
    sun: () => {
      // a pale stone tower with golden bands
      put(0, 0.12, 0, 0.7, 0.24, 0.7, 0xf5deb3); put(0, 0.6, 0, 0.56, 0.8, 0.56, 0xfff3d6);
      put(0, 0.42, 0, 0.6, 0.06, 0.6, COL.gold); put(0, 0.78, 0, 0.6, 0.06, 0.6, COL.gold); put(0, 1.02, 0, 0.7, 0.08, 0.7, COL.gold);
      return 1.06;
    },
    spikes: (tu) => {
      // a metal plate on the road with spikes, fewer as they run out (longer at a3; green tips b2, red b3)
      const max = tu.max || 20, n = Math.ceil(16 * Math.max(0, Math.min(1, (tu.spikes != null ? tu.spikes : max) / max))), ln = tu.a >= 3 ? 0.3 : 0.16;
      const tip = tu.b >= 3 ? 0xe53935 : tu.b >= 2 ? 0x8bc34a : 0xeceff1, steel = tu.a >= 2 ? 0x90a4ae : 0xb0bec5;
      put(0, 0.03, 0, 0.88, 0.06, 0.88, tu.a >= 2 ? 0x546e7a : 0x78909c); put(0, 0.061, 0, 0.7, 0.004, 0.7, 0x607d8b);
      for (let k = 0; k < n; k++) { const j = SPIKE_ORDER[k], sx = (j % 4 - 1.5) * 0.19, sz = ((j >> 2) - 1.5) * 0.19; put(sx, 0.06 + ln / 2, sz, 0.05, ln, 0.05, steel); put(sx, 0.07 + ln, sz, 0.03, 0.04, 0.03, tip); }
      return 0;
    }
  };
  const SPIKE_ORDER = [5, 10, 0, 15, 6, 9, 3, 12, 1, 14, 4, 11, 2, 13, 7, 8];
  const TOWER_TOP = {
    arrow: (tu) => {
      // a crossbow; three of them for the arrow storm (a3), a big golden one for the master archer (b3); fire arrows (a2)
      const n = tu.a >= 3 ? 3 : 1, gold = tu.b >= 3, tip = tu.a >= 2 ? 0xff7043 : COL.flag, w = gold ? 0.86 : tu.b >= 1 ? 0.66 : 0.56;
      for (let k = 0; k < n; k++) {
        const dx = (k - (n - 1) / 2) * 0.27, ww = n > 1 ? 0.3 : w;
        put(dx, 0.12, 0, 0.1, 0.1, 0.5, 0xc8925a); put(dx, 0.12, 0.12, ww, 0.05, 0.05, gold ? COL.gold : COL.woodDark); put(dx, 0.17, 0.12, 0.04, 0.04, gold ? 0.5 : 0.34, tip);
        if (tu.a >= 2) shine(dx, 0.17, gold ? 0.38 : 0.3, 0.06, 0.06, 0.06, 0xffab40);
      }
      if (gold) { put(-0.43, 0.2, 0.08, 0.06, 0.18, 0.06, COL.gold); put(0.43, 0.2, 0.08, 0.06, 0.18, 0.06, COL.gold); put(0, 0.17, -0.12, 0.1, 0.06, 0.08, 0xe53935); }
    },
    cannon: (tu) => {
      // twin barrels at b3, a yellow band for stun shells (b2), a rack of cluster bombs behind at a3
      const twin = tu.b >= 3, wd = twin ? 0.24 : tu.a >= 1 ? 0.3 : 0.26, iron = tu.a >= 2 ? 0x263238 : 0x37474f, ww = twin ? 0.36 : 0.22;
      for (const dx of twin ? [-0.16, 0.16] : [0]) {
        put(dx, 0.14, 0.12, wd, wd, 0.62, iron); put(dx, 0.14, 0.44, wd + 0.04, wd + 0.04, 0.06, 0x1c2429);
        if (tu.b >= 2) put(dx, 0.14, 0.26, wd + 0.02, wd + 0.02, 0.05, 0xffc107);
      }
      put(-ww, 0.06, -0.05, 0.08, 0.2, 0.2, 0x5d4037); put(ww, 0.06, -0.05, 0.08, 0.2, 0.2, 0x5d4037);
      if (tu.a >= 3) { put(0, 0.08, -0.32, 0.46, 0.06, 0.18, COL.woodDark); for (const bx of [-0.15, 0, 0.15]) { put(bx, 0.18, -0.32, 0.12, 0.12, 0.12, 0x212121); put(bx, 0.27, -0.32, 0.03, 0.05, 0.03, 0xff7043); } }
    },
    frost: (tu, t) => {
      // an ice crystal turning slowly (a big crown of ice for the blizzard, a3) and a cold sparkle over it
      const c = tu.a >= 1 ? 0x4fc3f7 : 0x81d4fa, s = 0.08 + Math.sin(t * 3 + tu.id) * 0.02, big = tu.a >= 3;
      put(0, 0.3, 0, 0.32, 0.5, 0.32, c); put(0, 0.3, 0, 0.44, 0.22, 0.12, 0xb3e5fc); put(0, 0.3, 0, 0.12, 0.22, 0.44, 0xb3e5fc);
      if (big) { for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, hh = 0.36 + (k % 2) * 0.2; put(Math.sin(a) * 0.32, 0.1 + hh / 2, Math.cos(a) * 0.32, 0.1, hh, 0.1, 0xe1f5fe); } put(0, 0.68, 0, 0.18, 0.3, 0.18, 0xe1f5fe); }
      shine(0, (big ? 0.98 : 0.68) + Math.sin(t * 2 + tu.id) * 0.04, 0, s, s, s, 0xe1f5fe);
    },
    tesla: (tu, t) => {
      // a crackling ball of lightning (inside a glass dome for the thunder dome, b3)
      const s = 0.28 + Math.sin(t * 9 + tu.id) * 0.03;
      put(0, -0.02, 0, 0.2, 0.06, 0.2, 0x78909c);
      shine(0, 0.12, 0, s, s, s, 0x4dd0e1); shine(0, 0.12, 0, s * 0.55, s * 0.55, s * 0.55, 0xe0f7fa);
      for (let k = 0; k < 2; k++) { const a = t * 6 + k * Math.PI + tu.id; shine(Math.sin(a) * 0.26, 0.12 + Math.cos(a * 1.3) * 0.08, Math.cos(a) * 0.26, 0.05, 0.05, 0.05, 0xe0f7fa); }
      if (tu.b >= 3) { put(0, -0.04, 0, 0.62, 0.06, 0.62, 0x78909c); glass(0, 0.16, 0, 0.58, 0.36, 0.58, 0x80deea); glass(0, 0.39, 0, 0.38, 0.1, 0.38, 0x80deea); }
    },
    flame: (tu, t) => {
      // a nozzle with a pilot flame (a dragon's head at a3, a ring of nozzles at b3; blue fire from b2)
      const f = 0.85 + Math.sin(t * 14 + tu.id) * 0.15, blue = tu.b >= 2, c1 = blue ? 0x40c4ff : 0xff7043, c2 = blue ? 0xe1f5fe : 0xffb300, hot = tu.a >= 1 ? 1.15 : 1;
      if (tu.a >= 3) {
        put(0, 0.16, 0.04, 0.3, 0.24, 0.34, 0xc62828); put(0, 0.12, 0.28, 0.22, 0.14, 0.2, 0xd32f2f); put(0, 0.06, 0.3, 0.2, 0.03, 0.16, 0xfff3e0);
        put(-0.1, 0.33, -0.06, 0.05, 0.16, 0.05, 0xffe0b2); put(0.1, 0.33, -0.06, 0.05, 0.16, 0.05, 0xffe0b2);
        put(-0.1, 0.22, 0.2, 0.05, 0.05, 0.03, 0xffeb3b); put(0.1, 0.22, 0.2, 0.05, 0.05, 0.03, 0xffeb3b);
        shine(0, 0.1, 0.42, 0.14 * f, 0.1 * f, 0.1 * f, c2);
      } else {
        put(0, 0.12, 0.2, 0.14, 0.14, 0.36, 0x5b6573); put(0, 0.12, 0.38, 0.18, 0.18, 0.04, 0x37474f); shine(0, 0.12, 0.42, 0.08 * f, 0.08 * f, 0.06, c2);
        shine(0, 0.04 + 0.16 * hot, -0.12, 0.3 * f * hot, 0.2 * f * hot, 0.3 * f * hot, c1); shine(0, 0.04 + 0.32 * hot, -0.12, 0.17 * f, 0.16 * f, 0.17 * f, c2);
      }
      if (tu.b >= 3) for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.5; put(Math.sin(a) * 0.36, 0.06, Math.cos(a) * 0.36, 0.1, 0.1, 0.1, 0x5b6573); shine(Math.sin(a) * 0.44, 0.06, Math.cos(a) * 0.44, 0.08 * f, 0.08 * f, 0.08 * f, c1); }
    },
    mortar: (tu) => {
      // a fat tube leaning towards the target (three thinner ones for the battery, b3; gold bands for the earthquake, a3)
      const n = tu.b >= 3 ? 3 : 1, big = tu.a >= 3 ? 1.2 : 1;
      put(0, 0.05, 0, 0.5, 0.1, 0.5, 0x37474f);
      P.multiply(Tm.makeRotationX(0.4));
      for (let k = 0; k < n; k++) {
        const dx = (k - (n - 1) / 2) * 0.27, w = (n > 1 ? 0.19 : 0.36) * big, top = 0.5 * big;
        put(dx, 0.25 * big, 0, w, top, w, 0x546e7a); put(dx, top, 0, w + 0.06, 0.08, w + 0.06, 0x78909c); put(dx, top + 0.005, 0, w * 0.62, 0.08, w * 0.62, 0x101418);
        if (tu.a >= 2) put(dx, 0.3 * big, 0, w + 0.02, 0.05, w + 0.02, 0xe53935);
        if (tu.a >= 3) put(dx, 0.14, 0, w + 0.03, 0.06, w + 0.03, COL.gold);
      }
    },
    shrine: (tu, t) => {
      // a floating gem (golden at a3, a heart at b3) with a sparkle going round it
      const y = (tu.a >= 3 || tu.b >= 3 ? 0.16 : 0.35) + Math.sin(t * 2 + tu.id) * 0.05, a = t * 2 + tu.id;
      if (tu.b >= 3) { put(-0.08, y + 0.05, 0, 0.16, 0.16, 0.12, 0xff4f7a); put(0.08, y + 0.05, 0, 0.16, 0.16, 0.12, 0xff4f7a); put(0, y - 0.07, 0, 0.16, 0.14, 0.12, 0xff4f7a); }
      else { const c = tu.a >= 3 ? 0xffd54f : 0xff6f91; put(0, y, 0, 0.3, 0.3, 0.3, c); put(0, y, 0, 0.18, 0.42, 0.18, mix(c, 0xffffff, 0.3)); }
      shine(Math.sin(a) * 0.3, y + 0.1, Math.cos(a) * 0.3, 0.07, 0.07, 0.07, tu.a >= 3 ? 0xffe082 : 0xff8fab);
    },
    sniper: (tu) => {
      // a long rifle (a gold scope for deadly aim, a3; a green night-vision lens, b2; a red armour-piercing tip, a2)
      const gold = tu.a >= 3;
      put(0, 0.08, -0.12, 0.12, 0.12, 0.3, COL.woodDark); put(0, 0.1, 0.14, 0.08, 0.09, 0.26, 0x37474f); put(0, 0.1, 0.5, 0.05, 0.05, 0.5, 0x263238);
      put(0, 0.2, 0.12, gold ? 0.11 : 0.06, gold ? 0.11 : 0.06, gold ? 0.34 : 0.22, gold ? COL.gold : 0x212121);
      if (tu.b >= 2) shine(0, 0.2, gold ? 0.3 : 0.24, 0.05, 0.05, 0.02, 0x76ff03);
      if (tu.a >= 2) put(0, 0.1, 0.76, 0.065, 0.065, 0.04, 0xe53935);
      put(-0.06, 0.02, 0.42, 0.03, 0.12, 0.03, 0x263238); put(0.06, 0.02, 0.42, 0.03, 0.12, 0.03, 0x263238);
    },
    glue: (tu, t) => {
      // a nozzle with slime at its end (dripping off it at b3)
      const d = (t * 1.3 + tu.id * 0.29) % 1, drip = tu.b >= 3;
      put(0, 0.03, 0, 0.36, 0.06, 0.36, 0xb2ff59); put(0, 0.1, -0.02, 0.16, 0.1, 0.16, 0x78909c); put(0, 0.12, 0.16, 0.1, 0.1, 0.32, 0x607d8b); put(0, 0.12, 0.33, 0.15, 0.15, 0.05, 0x37474f);
      put(0, 0.07 - (drip ? d * 0.3 : 0), 0.35, 0.07, drip ? 0.12 : 0.08, 0.06, 0x9ccc65);
    },
    ninja: (tu, t) => {
      // a ninja on the roof (a gold headband for the grandmaster, a3; a shadow clone beside it, b3)
      const two = tu.b >= 3;
      ninjaMan(two ? -0.14 : 0, t + tu.id, tu.a >= 3 ? COL.gold : 0xe53935, put);
      if (two) ninjaMan(0.16, t + tu.id + 0.6, 0x7e57c2, glass);
    },
    wizard: (tu, t) => {
      // a glowing orb held out in front (fiery from a2, a fire orb with flames at a3, a blue crystal ball at b2)
      const s = 0.2 + Math.sin(t * 4 + tu.id) * 0.02, c = tu.a >= 3 ? 0xff6d00 : tu.a >= 2 ? 0xff9e40 : tu.b >= 2 ? 0x80d8ff : 0xb388ff, y = 0.22 + Math.sin(t * 2 + tu.id) * 0.04;
      put(0, 0.02, 0.4, 0.06, 0.06, 0.16, 0x553c80); put(0, 0.07, 0.5, 0.14, 0.04, 0.14, 0x553c80);
      shine(0, y, 0.5, s, s, s, c); shine(0, y, 0.5, s * 0.55, s * 0.55, s * 0.55, 0xffffff);
      if (tu.a >= 3) for (let k = 0; k < 3; k++) { const u = (t * 2 + k / 3 + tu.id * 0.1) % 1, q = 0.09 * (1 - u); shine(Math.sin(k * 2.1) * 0.06, y + 0.1 + u * 0.26, 0.5 + Math.cos(k * 2.1) * 0.06, q, q, q, u < 0.5 ? 0xffd54f : 0xff7043); }
    },
    sun: (tu, t) => {
      // a golden stand holding a big glowing mirror that faces the target (bigger and whiter at a3, two at b3, a dark
      // sunspot at b2), with sparks of light going round it
      const twin = tu.b >= 3, big = tu.a >= 3 ? 1.3 : 1 + tu.a * 0.05, s = (twin ? 0.4 : 0.56) * big, hot = tu.a >= 3 ? 0xfffde7 : 0xffeb3b, pul = 1 + Math.sin(t * 6 + tu.id) * 0.04;
      put(0, 0.1, -0.06, 0.12, 0.2, 0.12, COL.goldDark);
      for (const dx of twin ? [-0.24, 0.24] : [0]) {
        P2.copy(P); P.multiply(Tm.makeTranslation(dx, 0.24 + s / 2, 0)).multiply(Tm.makeRotationX(-0.35));
        put(0, 0, -0.04, s + 0.08, s + 0.08, 0.04, COL.gold);
        shine(0, 0, 0, s * pul, s * 0.66 * pul, 0.05, hot); shine(0, 0, 0, s * 0.66 * pul, s * pul, 0.05, hot);
        if (tu.b >= 2) shine(0, 0, 0.03, s * 0.28, s * 0.28, 0.02, 0xff6d00);
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + t * 0.8, r = s * 0.64 + Math.sin(t * 5 + k) * 0.02; shine(Math.sin(a) * r, Math.cos(a) * r, 0, 0.05, 0.05, 0.03, 0xffd54f); }
        P.copy(P2);
      }
    }
  };
  // a ninja in black, a throwing star in hand (drawn with put, or with glass for a shadow clone)
  function ninjaMan(x, t, band, p) {
    const c = p === glass ? 0x4a2a6a : 0x212121, th = Math.max(0, Math.sin(t * 5)) * 0.12;
    p(x - 0.06, 0.1, 0, 0.08, 0.2, 0.09, c); p(x + 0.06, 0.1, 0, 0.08, 0.2, 0.09, c);
    p(x, 0.3, 0, 0.24, 0.22, 0.16, c); p(x, 0.5, 0, 0.2, 0.2, 0.2, c);
    p(x, 0.51, 0.1, 0.15, 0.045, 0.01, SKIN);
    p(x, 0.57, 0, 0.21, 0.04, 0.21, band); p(x + 0.05, 0.55, -0.13, 0.03, 0.03, 0.08, band);
    p(x - 0.15, 0.32, 0.04, 0.06, 0.06, 0.16, c); p(x + 0.15, 0.36, 0.06 + th, 0.06, 0.06, 0.2, c);
    p(x + 0.15, 0.36, 0.2 + th, 0.12, 0.02, 0.12, 0xb0bec5);
  }
  const JAM_Y = { ninja: 0.72, tesla: 0.48, frost: 0.66, shrine: 0.62, sun: 0.95, glue: 0.3, sniper: 0.34, wizard: 0.5 };
  // upgrade studs on the front of a tower: gold for each step bought on path a, blue for each on path b
  function studs(tu, y, z) {
    const na = tu.a || 0, n = na + (tu.b || 0);
    for (let k = 0; k < n; k++) put((k - (n - 1) / 2) * 0.13, y, z, 0.09, 0.09, 0.05, k < na ? COL.gold : COL.blue);
  }
  // which way the road runs through a tile: barricades and traps lie across it
  function roadTurn(tx, tz) {
    const T = CC.T, rd = (x, z) => { const k = CC.tileAt(map, x + 0.5, z + 0.5); return k === T.DIRT || k === T.BRIDGE || k === T.SPAWN || k === T.CASTLE; };
    return (rd(tx - 1, tz) || rd(tx + 1, tz)) && !rd(tx, tz - 1) && !rd(tx, tz + 1) ? Math.PI / 2 : 0;
  }
  const topH = new Map();   // tower id -> the height of its top (for the selection and the jam)
  function drawTower(tu, t) {
    const look = TOWER_LOOK[tu.type], top = TOWER_TOP[tu.type];
    if (!look) return;
    const road = tu.type === 'wall' || tu.type === 'spikes', x = tu.tx + 0.5, z = tu.tz + 0.5;
    place(x, 0.1, z, road ? roadTurn(tu.tx, tu.tz) : 0, 1);
    const h = look(tu, t);
    if (tu.type === 'wall') studs(tu, h - 0.16, 0.1); else if (road) studs(tu, 0.08, 0.4); else studs(tu, 0.06, 0.47);
    topH.set(tu.id, h);
    if (top) { place(x, 0.1 + h, z, tu.rot || 0, 1); top(tu, t); }
    // jammed: a splat of slime on top and stars going round
    if (tu.stun) {
      const jy = JAM_Y[tu.type] || 0.36;
      place(x, 0.1 + h, z, t * 3 + tu.id, 1);
      put(0, jy, 0, 0.42, 0.1, 0.38, 0x8bc34a); put(0.14, jy - 0.07, 0.15, 0.09, 0.16, 0.07, 0x7cb342); put(-0.15, jy - 0.07, -0.12, 0.08, 0.13, 0.08, 0x7cb342);
      for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; shine(Math.sin(a) * 0.34, jy + 0.28, Math.cos(a) * 0.34, 0.1, 0.1, 0.1, 0xffeb3b); }
    }
  }

  /* ================= effects ================= */
  const rand = (a, b) => a + Math.random() * (b - a);
  function burst(x, y, z, n, col, speed, size, life, opts) {
    for (let k = 0; k < n && parts.length < 1500; k++) {
      const a = Math.random() * Math.PI * 2, up = rand(0.3, 1);
      parts.push({ x: x, y: y, z: z, vx: Math.cos(a) * speed * rand(0.3, 1), vy: up * speed * (opts && opts.up != null ? opts.up : 1.2), vz: Math.sin(a) * speed * rand(0.3, 1), life: life * rand(0.6, 1.1), max: life, s: size * rand(0.6, 1.2), c: Array.isArray(col) ? col[k % col.length] : col, g: opts && opts.g != null ? opts.g : 9, glow: opts && opts.glow });
    }
  }
  // words floating up from the world (the oldest go when there are too many)
  function say(x, z, y, text, life, color) { if (popups.length > 40) popups.shift(); popups.push({ x: x, z: z, y: y, text: text, life: life, color: color }); }
  // who fired: 't:arrow:12' (tower 12) or 'p:blaster:p0' (a player)
  const findTower = (id) => lastWorld && lastWorld.towers ? lastWorld.towers.find((q) => String(q.id) === String(id)) : null;
  const findPlayer = (id) => lastWorld && lastWorld.players ? lastWorld.players.find((q) => String(q.id) === String(id)) : null;
  const SHOT_COL = { blaster: 0xffd54f, scatter: 0xffe082, crossbow: 0x8d6e63, frost: 0x81d4fa, arrow: 0xa1887f, cannon: 0x263238, bomb: 0x263238, mortar: 0x263238, ninja: 0x455a64, glue: 0x8bc34a, wizard: 0xb388ff, fireball: 0xff9100 };
  const SHOT_Y = { arrow: 1.25, ninja: 1.3, glue: 0.8, wizard: 1.3, frost: 0.95 };   // tower shots start up on the tower
  const LOB_Y = { cannon: 0.8, mortar: 0.9, fireball: 1.3 };
  const FLAME = [0xff7043, 0xffb300, 0xffeb3b], BLUE_FLAME = [0x40c4ff, 0x80d8ff, 0xe1f5fe];
  function fx(e, local) {
    switch (e.e) {
      case 'shot': {
        const k = (e.k || '').split(':'), kind = k[1] || 'blaster', tower = k[0] === 't', n = e.n || 1, spread = (e.spread || 0) * Math.PI / 180;
        for (let j = 0; j < n; j++) {
          const a = e.a + (n > 1 ? ((j / (n - 1)) - 0.5) * spread : 0);
          flights.push({ kind: kind, tower: tower, x: e.x, z: e.y, y: tower ? SHOT_Y[kind] || 0.9 : 0.6, vx: Math.sin(a) * e.sp, vz: Math.cos(a) * e.sp, life: e.l / e.sp, t: 0, c: SHOT_COL[kind] || 0xffd54f });
        }
        if (!tower) burst(e.x + Math.sin(e.a) * 0.5, 0.65, e.y + Math.cos(e.a) * 0.5, 2, 0xfff59d, 1.5, 0.06, 0.12, { glow: 1, g: 0 });
        break;
      }
      case 'lob': { const kind = (e.k || '').split(':')[1] || 'cannon'; flights.push({ kind: kind, lob: true, x: e.x, z: e.y, tx: e.tx, tz: e.ty, y: LOB_Y[kind] || 0.6, t: 0, life: e.t, c: SHOT_COL[kind] || 0x263238 }); break; }
      case 'zap': {
        // lightning from a tesla coil's ball (higher with more coils) or a player's staff
        const k = (e.k || '').split(':'), t = k[0] === 't' ? findTower(k[2]) : null;
        zaps.push({ pts: e.pts, life: 0.18, y0: t ? 0.62 + (t.a >= 3 ? 5 : 3) * 0.25 : 0.75 });
        for (const p of e.pts.slice(1)) burst(p[0], 0.7, p[1], 3, [0xe1f5fe, 0x4dd0e1], 2, 0.07, 0.25, { glow: 1, g: 0 });
        break;
      }
      case 'flame': {
        // a cone of fire as wide as its arc (all the way round for an inferno ring); blue for blue flames
        const k = (e.k || '').split(':'), tower = k[0] === 't', who = tower ? findTower(k[2]) : findPlayer(k.slice(2).join(':'));
        const blue = tower ? who && who.b >= 2 : who && who.tier >= 3, cols = blue ? BLUE_FLAME : FLAME, arc = Math.min(360, e.arc || 60) * Math.PI / 180, n = arc > 3 ? 12 : 6, y0 = tower ? 0.85 : 0.55;
        for (let j = 0; j < n && parts.length < 1500; j++) { const a = e.a + rand(-arc / 2, arc / 2), d = rand(0.4, e.l); parts.push({ x: e.x + Math.sin(a) * 0.4, y: y0, z: e.y + Math.cos(a) * 0.4, vx: Math.sin(a) * d * 2.4, vy: rand(0, 0.8), vz: Math.cos(a) * d * 2.4, life: 0.4, max: 0.4, s: rand(0.12, 0.22), c: cols[j % 3], g: -1, glow: 1 }); }
        break;
      }
      case 'swing': burst(e.x + Math.sin(e.a) * 0.9, 0.5, e.y + Math.cos(e.a) * 0.9, 4, 0xeeeeee, 1.5, 0.06, 0.2, { glow: 1, g: 0 }); break;
      case 'hit': burst(e.x, 0.6, e.y, 4, e.t === 'frost' ? [0x81d4fa, 0xe1f5fe] : e.t === 'magic' ? [0xb388ff, 0xea80fc] : [0x8bc34a, 0xc5e1a5], 2, 0.08, 0.35); break;
      case 'pop': { const r = e.r || 1, c = e.t === 'frost' ? [0x81d4fa, 0xe1f5fe, 0xffffff] : e.t === 'slime' ? [0x8bc34a, 0xb2ff59, 0x689f38] : [0xffb300, 0xff7043]; burst(e.x, 0.5, e.y, Math.round(6 + r * 5), c, 1.6 + r * 1.2, 0.1, 0.45, e.t === 'frost' || e.t === 'slime' ? { glow: 1 } : null); break; }
      case 'boom': burst(e.x, 0.4, e.y, 18 + Math.round(e.r * 6), [0xff7043, 0xffb300, 0xffeb3b], 3.4 * Math.max(1, e.r * 0.6), 0.16, 0.5, { glow: 1, g: 3 }); burst(e.x, 0.4, e.y, 10, [0x616161, 0x9e9e9e, 0x424242], 1.6, 0.22, 1.1, { g: -1.2, up: 0.8 }); camState.shake = Math.max(camState.shake, Math.min(0.35, e.r * 0.12)); break;
      case 'die': {
        const Z = CC.ZOMBIES[e.z] || {}, L = ZLOOK[e.z] || ZLOOK.walker, big = Z.boss ? 3 : Z.size || 1;
        burst(e.x, 0.6 * big, e.y, Math.round(12 * big), [L.skin, L.shirt || L.skin, mix(L.skin, 0x000000, 0.25)], 2.6 * Math.sqrt(big), 0.12, 0.6); burst(e.x, 0.5, e.y, 5, 0xeeeeee, 1, 0.18, 0.7, { g: -1, up: 1 });
        if (Z.boss) camState.shake = Math.max(camState.shake, 0.35);
        if (e.g) say(e.x, e.y, 1.2, '+' + e.g + ' 🪙', 1.1, '#ffd54f');
        break;
      }
      case 'spawn': burst(e.x, 0.3, e.y, 6, [0x4a3b6b, 0x9cff6b], 1.6, 0.1, 0.5, { glow: 1 }); break;
      case 'chop': { const x = (e.i % W) + 0.5, z = ((e.i / W) | 0) + 0.5; chopKind.set(e.i, e.kind); burst(x, 0.7, z, 6, e.kind === 'tree' ? [TH.trunk, TH.leaves[1], 0x6d4c41] : [TH.rock[0], 0x757575, TH.rock[2]], 2.2, 0.1, 0.5); if (map) { map.life[e.i] = e.left; rebuild(); } break; }
      case 'tile': {
        const kind = chopKind.get(e.i) || (e.got > 12 ? 'rock' : 'tree');
        chopKind.delete(e.i);
        if (map) { map.tiles[e.i] = e.t; rebuild(); }
        burst(e.x, 0.6, e.y, 12, kind === 'tree' ? [TH.trunk, TH.leaves[0]] : [TH.rock[0], TH.rock[2]], 2.4, 0.14, 0.7);
        if (e.got) say(e.x, e.y, 1.3, '+' + e.got + ' 🪙', 1.2, '#ffd54f');
        break;
      }
      case 'built': burst(e.t.tx + 0.5, 0.2, e.t.tz + 0.5, 14, [0xd7ccc8, 0xbcaaa4, 0xefebe9], 2, 0.14, 0.6, { up: 0.6 }); break;
      case 'upgraded': {
        const t = e.t, U = CC.TOWERS[t.type], up = U && U[e.path] ? U[e.path][(t[e.path] || 1) - 1] : null, b = e.path === 'b';
        burst(t.tx + 0.5, 1, t.tz + 0.5, 16, b ? [0x90caf9, 0xe3f2fd] : [0xffd54f, 0xffecb3], 2.4, 0.1, 0.7, { glow: 1, g: 2 });
        say(t.tx + 0.5, t.tz + 0.5, 1.6, '⭐ ' + (up ? up.name : 'Upgraded!'), 1.3, b ? '#90caf9' : '#ffd54f');
        break;
      }
      case 'sold': burst(e.x, 0.5, e.y, 16, [0xd7ccc8, 0xbcaaa4, 0xffffff, 0xffd54f], 2.2, 0.16, 0.6, { up: 0.7 }); say(e.x, e.y, 1.4, '+' + e.v + ' 🪙', 1.3, '#ffd54f'); break;
      case 'income': if (e.n > 0) { burst(e.x, 0.5, e.y, 10, [0xffc107, 0xffe082, 0xfff8e1], 2, 0.08, 0.6, { glow: 1, g: 4 }); say(e.x, e.y, 1.2, '+' + e.n + ' 🪙', 1.6, '#ffd54f'); } break;
      case 'wreck': burst(e.x, 0.5, e.y, 18, [0x8b5a2b, 0x9e9e9e, 0x6d4c41], 3, 0.16, 0.8); camState.shake = Math.max(camState.shake, 0.15); break;
      case 'jam': burst(e.x, 1, e.y, 8, [0x8bc34a, 0xc5e1a5, 0x689f38], 1.8, 0.1, 0.45); break;
      case 'spit': flights.push({ kind: 'spit', lob: true, x: e.x, z: e.y, tx: e.tx, tz: e.ty, y: 0.6, t: 0, life: Math.hypot(e.tx - e.x, e.ty - e.y) / e.sp, c: 0x9ccc65 }); break;
      case 'splat': burst(e.x, 0.4, e.y, 8, [0x9ccc65, 0xc0ca33], 2, 0.1, 0.4); break;
      case 'block': burst(e.x, 0.7, e.y, 4, [0xffffff, 0xbcaaa4], 2.5, 0.07, 0.25, { glow: 1, g: 0 }); say(e.x, e.y, 1.3, 'Blocked!', 0.7, '#cfd8dc'); break;
      case 'immune': say(e.x, e.y, 1.3, 'No effect!', 0.7, '#ffab91'); break;
      case 'emerge': burst(e.x, 0.3, e.y, 14, [TH.dirt, TH.dirtDark, 0x6d4c41], 2.6, 0.14, 0.6); break;
      case 'heal': burst(e.x, 1, e.y, 2, [0xb388ff, 0xea80fc], 1, 0.08, 0.5, { glow: 1, g: -1 }); break;
      case 'summon': burst(e.x, 0.6, e.y, 16, [0x9c27b0, 0x4a3b6b, 0x9cff6b], 2.4, 0.14, 0.7, { glow: 1 }); break;
      case 'stomp': burst(e.x, 0.15, e.y, 24, [0xa1887f, 0x8d6e63, 0xd7ccc8], 4.5, 0.18, 0.6, { up: 0.3 }); rings.push({ x: e.x, z: e.y, y: 0.2, r: e.r || 2.4, c: [0xd7ccc8, 0xa1887f], life: 0.45, max: 0.45 }); camState.shake = Math.max(camState.shake, 0.4); break;
      case 'ouch': if (local && e.id === local) camState.shake = Math.max(camState.shake, 0.12); break;
      case 'down': burst(e.x, 0.5, e.y, 10, [0xffffff, 0xffeb3b], 2, 0.1, 0.6, { glow: 1 }); break;
      // a sniper's shot: a bright line for a blink, sparks where it hits
      case 'snipe': rays.push({ x: e.x, z: e.y, y: 1.84, tx: e.tx, tz: e.ty, ty: 0.65, w: 0.05, c: 0xfffde7, core: 0, life: 0.12, max: 0.12 }); burst(e.tx, 0.65, e.ty, 4, [0xfff59d, 0xffffff], 2.2, 0.06, 0.2, { glow: 1, g: 0 }); burst(e.x, 1.84, e.y, 3, 0xfff59d, 1.5, 0.08, 0.12, { glow: 1, g: 0 }); break;
      // the sun tower's ray: thick, yellow, a white-hot middle
      case 'beam': rays.push({ x: e.x, z: e.y, y: 1.6, tx: e.tx, tz: e.ty, ty: 0.6, w: 0.17, c: 0xffd740, core: 0xfffde7, life: 0.16, max: 0.16 }); if (Math.random() < 0.5) burst(e.tx, 0.6, e.ty, 2, [0xffeb3b, 0xffffff], 1.4, 0.08, 0.2, { glow: 1, g: -1 }); break;
      // a ring spreading out: icy for a freeze pulse, electric for a thunder dome, purple for a magic ward
      case 'pulse': { const c = e.k === 'frost' ? [0xe1f5fe, 0x81d4fa] : e.k === 'zap' ? [0xe0f7fa, 0x4dd0e1] : [0xea80fc, 0xb388ff]; rings.push({ x: e.x, z: e.y, y: e.k === 'zap' ? 0.7 : 0.3, r: e.r || 2, c: c, life: 0.5, max: 0.5 }); burst(e.x, 0.6, e.y, 10, c, 2.5, 0.08, 0.4, { glow: 1, g: 0 }); break; }
      // a meteor: a burning rock falls from the sky, then a big boom
      case 'meteor': flights.push({ kind: 'meteor', meteor: true, x: e.x - 2.2, z: e.y - 1.4, tx: e.x, tz: e.y, t: 0, life: 0.45, r: e.r || 2, c: 0xff6d00 }); break;
      case 'smoke': burst(e.x, 0.4, e.y, 18, [0x9e9e9e, 0xbdbdbd, 0x757575, 0xe0e0e0], 1.2 + (e.r || 1.5), 0.3, 1, { g: -0.6, up: 0.5 }); break;
      case 'leak': burst(e.x, 0.8, e.y, 14, [0xff5252, 0xff8a80, 0xd50000], 2.6, 0.12, 0.6, { glow: 1, g: 4 }); say(e.x, e.y, 1.6, '-' + e.n + ' ❤️', 1.3, '#ff6b6b'); camState.shake = Math.max(camState.shake, Math.min(0.3, 0.06 + e.n * 0.01)); break;
      case 'bones': burst(e.x, 0.5, e.y, 10, [COL.bone, 0xd8d2c4, 0xffffff], 2.2, 0.09, 0.5); break;
      case 'revive': burst(e.x, 0.4, e.y, 10, [0xffffff, 0xeceff1], 1.4, 0.16, 0.6, { g: -1, up: 0.8 }); break;
      case 'breath': {
        // the dragon breathes a cone of icy blue from its head
        const r = e.r || 4, hx = e.x + Math.sin(e.a) * 1.7, hz = e.y + Math.cos(e.a) * 1.7;
        for (let k = 0; k < 40 && parts.length < 1500; k++) { const a = e.a + rand(-0.45, 0.45), sp = rand(r * 1.2, r * 2.4); parts.push({ x: hx, y: 3, z: hz, vx: Math.sin(a) * sp, vy: rand(-3.4, -1.6), vz: Math.cos(a) * sp, life: rand(0.5, 0.8), max: 0.8, s: rand(0.14, 0.3), c: [0xb3e5fc, 0xe1f5fe, 0x81d4fa, 0xffffff][k % 4], g: 0, glow: 1 }); }
        camState.shake = Math.max(camState.shake, 0.15);
        break;
      }
      case 'spike': { const t = findTower(e.id); if (t) burst(t.tx + 0.5 + rand(-0.3, 0.3), 0.25, t.tz + 0.5 + rand(-0.3, 0.3), 3, [0xffffff, 0xcfd8dc, 0xffeb3b], 1.4, 0.05, 0.18, { glow: 1, g: 2 }); break; }
      case 'lvl': {
        // a weapon levels up: stars burst over the player, and its new tier's name at every fifth level
        const p = findPlayer(e.id);
        if (!p) break;
        for (let k = 0; k < 14 && parts.length < 1500; k++) { const a = k / 14 * Math.PI * 2; parts.push({ x: p.x, y: 1, z: p.z, vx: Math.sin(a) * 2, vy: rand(1.5, 3), vz: Math.cos(a) * 2, life: 0.9, max: 0.9, s: 0.1, c: [0xffd740, 0xfff59d, 0xffffff][k % 3], g: 3, glow: 1 }); }
        say(p.x, p.z, 1.7, e.tier > 0 && e.name ? '⭐ ' + e.name : 'Level ' + e.lvl + '!', 1.8, e.tier > 0 ? '#ffd740' : '#fff59d');
        break;
      }
    }
  }
  function stepFx(dt) {
    for (const p of parts) { p.life -= dt; p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.y < 0.12 && p.g > 0) { p.y = 0.12; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; } }
    for (let k = parts.length - 1; k >= 0; k--) if (parts[k].life <= 0) parts.splice(k, 1);
    for (const f of flights) {
      f.t += dt;
      if (!f.lob && !f.meteor) { f.x += f.vx * dt; f.z += f.vz * dt; if (f.tower) f.y += (0.7 - f.y) * Math.min(1, dt * 3); }
      f.life -= dt;
      // fireballs, wizard bolts and meteors leave a trail
      if ((f.kind === 'fireball' || f.meteor) && Math.random() < 0.8) { const q = flightAt(f); parts.push({ x: q[0], y: q[1], z: q[2], vx: rand(-0.3, 0.3), vy: rand(0.2, 0.8), vz: rand(-0.3, 0.3), life: 0.35, max: 0.35, s: f.meteor ? 0.3 : 0.16, c: FLAME[(Math.random() * 3) | 0], g: -1, glow: 1 }); }
      if (f.kind === 'wizard' && Math.random() < 0.5) parts.push({ x: f.x, y: f.y, z: f.z, vx: 0, vy: 0.3, vz: 0, life: 0.25, max: 0.25, s: 0.08, c: 0xea80fc, g: 0, glow: 1 });
      if (f.meteor && f.life <= 0) { fx({ e: 'boom', x: f.tx, y: f.tz, r: f.r }); burst(f.tx, 0.4, f.tz, 10, [0x5d4037, 0x3e2723, 0x795548], 3, 0.16, 0.8); rings.push({ x: f.tx, z: f.tz, y: 0.3, r: f.r * 1.3, c: [0xff7043, 0xffb300, 0xffeb3b], life: 0.4, max: 0.4 }); camState.shake = Math.max(camState.shake, 0.4); }
    }
    for (let k = flights.length - 1; k >= 0; k--) if (flights[k].life <= 0) flights.splice(k, 1);
    for (const z of zaps) z.life -= dt;
    for (let k = zaps.length - 1; k >= 0; k--) if (zaps[k].life <= 0) zaps.splice(k, 1);
    for (const r of rays) r.life -= dt;
    for (let k = rays.length - 1; k >= 0; k--) if (rays[k].life <= 0) rays.splice(k, 1);
    for (const r of rings) r.life -= dt;
    for (let k = rings.length - 1; k >= 0; k--) if (rings[k].life <= 0) rings.splice(k, 1);
    for (const p of popups) { p.life -= dt; p.y += dt * 0.8; }
    for (let k = popups.length - 1; k >= 0; k--) if (popups[k].life <= 0) popups.splice(k, 1);
  }
  // where a lobbed shell or a meteor is now: [x, y, z] in tiles
  function flightAt(f) {
    const k = Math.min(1, f.t / (f.t + Math.max(0, f.life)));
    if (f.meteor) return [f.x + (f.tx - f.x) * k, 9 - 8.7 * k, f.z + (f.tz - f.z) * k];
    if (f.lob) return [f.x + (f.tx - f.x) * k, f.y + (0.4 - f.y) * k + Math.sin(k * Math.PI) * (1 + Math.hypot(f.tx - f.x, f.tz - f.z) * 0.25), f.z + (f.tz - f.z) * k];
    return [f.x, f.y, f.z];
  }

  /* ================= one frame ================= */
  let buildGhost = null, sel = null;
  function setGhost(g) { buildGhost = g; }   // { type, tx, tz, ok, range } or null
  // the tower picked on the map: { id, tx, tz, range } (or just its id), or null
  function setSelected(s) { sel = s == null ? null : typeof s === 'object' ? s : { id: s }; }
  const isSee = (zb) => (ZLOOK[zb.type] || ZLOOK.walker).see && !(zb.flags & 1);
  function frame(world, dt) {
    if (!R || !map) return;
    time += dt;
    lastWorld = world;
    stepFx(dt);
    const towers = world.towers || [], zombies = world.zombies || [], players = world.players || [], lite = zombies.length > 120;
    // the towers, the crew and the zombies
    begin(dyn); P.identity(); topH.clear();
    for (const tu of towers) drawTower(tu, time);
    for (const p of players) drawPlayer(p, time);
    for (const zb of zombies) if (!isSee(zb)) drawZombie(zb, time, lite);
    // burning zombies smoke and glow, chilled ones steam, acid drips off melting ones
    if (Math.random() < 0.5) for (const zb of zombies) if (zb.flags & 4 && Math.random() < 0.25) burst(zb.x, 0.8, zb.z, 1, [0xff7043, 0xffb300], 0.6, 0.08, 0.4, { glow: 1, g: -2 });
    if (Math.random() < 0.3) for (const zb of zombies) if (zb.flags & 2 && Math.random() < 0.2) burst(zb.x, 0.9, zb.z, 1, [0xe1f5fe, 0x81d4fa], 0.4, 0.06, 0.5, { glow: 1, g: 0.5 });
    if (Math.random() < 0.4) for (const zb of zombies) if (zb.flags & 256 && Math.random() < 0.3) burst(zb.x + rand(-0.2, 0.2), 0.7, zb.z + rand(-0.2, 0.2), 1, [0x76ff03, 0xb2ff59], 0.3, 0.07, 0.5, { glow: 1, g: 5 });
    // particles
    P.identity();
    for (const p of parts) if (!p.glow) { const s = p.s * Math.min(1, p.life / p.max * 2); put(p.x - ox, p.y, p.z - oz, s, s, s, p.c); }
    end();
    // ghosts and shadows are see-through, and so is ice (and a tower's glass)
    begin(ghostMesh);
    for (const zb of zombies) if (isSee(zb)) drawZombie(zb, time, lite);
    flush(glassL);
    end();
    begin(glow); P.identity();
    for (const p of parts) if (p.glow) { const s = p.s * Math.min(1, p.life / p.max * 2); put(p.x - ox, p.y, p.z - oz, s, s, s, p.c); }
    for (const f of flights) {
      if (f.lob || f.meteor) {
        const q = flightAt(f), s = f.meteor ? 0.5 : f.kind === 'fireball' ? 0.3 : 0.2;
        put(q[0] - ox, q[1], q[2] - oz, s, s, s, f.c);
        if (f.kind === 'fireball' || f.meteor) put(q[0] - ox, q[1], q[2] - oz, s * 0.6, s * 0.6, s * 0.6, 0xffeb3b);
      } else {
        P.makeRotationY(f.kind === 'ninja' ? f.t * 25 : Math.atan2(f.vx, f.vz)); P.setPosition(f.x - ox, f.y, f.z - oz);
        if (f.kind === 'ninja') { put(0, 0, 0, 0.26, 0.03, 0.07, f.c); put(0, 0, 0, 0.07, 0.03, 0.26, f.c); put(0, 0.01, 0, 0.06, 0.03, 0.06, 0xcfd8dc); }
        else if (f.kind === 'glue') { put(0, 0, 0, 0.2, 0.16, 0.2, f.c); put(0, 0.02, 0, 0.12, 0.12, 0.12, 0xccff90); }
        else if (f.kind === 'wizard') { put(0, 0, 0, 0.18, 0.18, 0.18, f.c); put(0, 0, 0, 0.1, 0.1, 0.1, 0xffffff); }
        else {
          const long = f.kind === 'crossbow' || f.kind === 'arrow' || (f.kind === 'frost' && f.tower);
          put(0, 0, 0, long ? 0.05 : 0.1, long ? 0.05 : 0.1, long ? 0.42 : 0.24, f.c);
        }
        P.identity();
      }
    }
    for (const z of zaps) for (let k = 1; k < z.pts.length; k++) bolt(z.pts[k - 1], z.pts[k], k === 1 ? z.y0 : 0.75);
    for (const r of rays) ray(r);
    for (const r of rings) {
      const k = 1 - r.life / r.max, rr = 0.3 + (r.r - 0.3) * k, n = Math.max(16, Math.min(64, Math.round(rr * 12))), s = 0.16 * (1 - k * 0.5);
      for (let j = 0; j < n; j++) { const a = j / n * Math.PI * 2; put(r.x - ox + Math.sin(a) * rr, r.y + Math.sin(a * 3 + k * 9) * 0.05, r.z - oz + Math.cos(a) * rr, s, s, s, r.c[j % r.c.length]); }
    }
    flush(shineL);
    // stunned zombies see stars
    for (const zb of zombies) if (zb.flags & 128 && !(zb.flags & 97)) {
      const s = (CC.ZOMBIES[zb.type] || {}).size || 1, y = zTop(zb) + 0.12;
      for (let k = 0; k < 3; k++) { const a = time * 5 + k / 3 * Math.PI * 2 + zb.id; put(zb.x - ox + Math.sin(a) * 0.28 * s, y, zb.z - oz + Math.cos(a) * 0.28 * s, 0.09, 0.09, 0.09, 0xffeb3b); }
    }
    // the island's own lights: lava bubbling, will-o'-wisps over haunted graves, fireflies at dusk, embers
    for (const s of sparks) {
      const k = s[2], ph = s[3];
      if (k === 0) { const u = (time * 0.7 + ph) % 1, sz = 0.16 * (1 - u) + 0.04; put(s[0] - ox, -0.02 + u * 0.3, s[1] - oz, sz, sz, sz, u < 0.5 ? 0xffd54f : 0xffab40); }
      else if (k === 1) put(s[0] - ox + Math.sin(time * 0.7 + ph) * 0.2, 0.55 + Math.sin(time * 1.5 + ph) * 0.15, s[1] - oz + Math.cos(time * 0.9 + ph) * 0.2, 0.09, 0.09, 0.09, 0xb388ff);
      else if (k === 2) { if (Math.sin(time * 2.3 + ph * 3) > -0.2) put(s[0] - ox + Math.sin(time * 0.8 + ph) * 0.4, 0.5 + Math.sin(time * 1.7 + ph) * 0.2, s[1] - oz + Math.cos(time * 0.6 + ph) * 0.4, 0.06, 0.06, 0.06, 0xeeff41); }
      else { const g = 0.06 + Math.max(0, Math.sin(time * 3 + ph)) * 0.04; put(s[0] - ox, 0.2, s[1] - oz, g, g, g, 0xff9100); }
    }
    // the picked tower: corners round its tile, a marker bobbing over it and its range on the ground
    const sid = 'selected' in world ? world.selected : sel ? sel.id : null;
    if (sid != null) {
      const tu = towers.find((q) => q.id === sid) || (sel && sel.id === sid && sel.tx != null ? sel : null);
      if (tu) {
        const cx = tu.tx + 0.5 - ox, cz = tu.tz + 0.5 - oz, range = sel && sel.id === sid ? sel.range || 0 : 0, my = 0.45 + (topH.get(sid) || 0) + 0.6 + Math.sin(time * 4) * 0.08;
        for (const [a, b] of CORNERS) { put(cx + a * 0.47, 0.22, cz + b * 0.38, 0.07, 0.05, 0.24, 0xffffff); put(cx + a * 0.38, 0.22, cz + b * 0.47, 0.24, 0.05, 0.07, 0xffffff); }
        put(cx, my, cz, 0.16, 0.16, 0.16, 0xfff59d); put(cx, my - 0.15, cz, 0.08, 0.1, 0.08, 0xfff59d);
        if (range > 0 && range < 30) {
          const n = Math.max(24, Math.min(110, Math.round(range * 14)));
          for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + time * 0.25; put(cx + Math.sin(a) * range, 0.21, cz + Math.cos(a) * range, 0.13, 0.04, 0.13, k % 2 ? 0xffffff : 0xfff59d); }
        }
      }
    }
    // the castle flag
    const fx0 = map.cx + 0.5 - ox, fz0 = map.cz + 0.5 - oz;
    for (let k = 0; k < 5; k++) put(fx0 + 0.12 + k * 0.12, 3.5 + Math.sin(time * 4 + k) * 0.03 * k, fz0, 0.12, 0.35, 0.02, k % 2 ? 0xffc94d : 0xffb300);
    // zombie gates glow
    for (const sp of map.spawns) put(sp.x + 0.5 - ox, 0.3 + Math.sin(time * 2.5 + sp.x) * 0.06, sp.y + 0.5 - oz, 0.5, 0.06, 0.5, COL.gateGlow);
    // the build ghost
    if (buildGhost) {
      const g = buildGhost, c = g.ok ? 0x69f0ae : 0xff5252;
      put(g.tx + 0.5 - ox, 0.2, g.tz + 0.5 - oz, 0.98, 0.04, 0.98, c);
      for (const [a, b] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) put(g.tx + 0.5 - ox + a, 0.5, g.tz + 0.5 - oz + b, 0.08, 0.6, 0.08, c);
      if (g.range && g.range < 30) { const n = Math.max(40, Math.min(110, Math.round(g.range * 12))); for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; put(g.tx + 0.5 - ox + Math.sin(a) * g.range, 0.2, g.tz + 0.5 - oz + Math.cos(a) * g.range, 0.12, 0.03, 0.12, c); } }
    }
    end();
    // the camera follows the local player, a little towards the castle (more so when it is far out, to see it all)
    const me = players.find((p) => p.id === world.local), ccx = map.cx + 0.5, ccz = map.cz + 0.5;
    const fw = 0.78 - Math.max(0, Math.min(1, camState.zoom - 1.2)) * 0.58;
    const aimX = me ? me.x * fw + ccx * (1 - fw) : ccx, aimZ = me ? me.z * fw + ccz * (1 - fw) : ccz;
    camState.x += (aimX - camState.x) * Math.min(1, dt * 4); camState.z += (aimZ - camState.z) * Math.min(1, dt * 4);
    const portrait = (canvas.clientHeight || 1) > (canvas.clientWidth || 1);
    const dist = (portrait ? 24 : 18.5) * camState.zoom, sh = camState.shake; camState.shake = Math.max(0, sh - dt * 1.2);
    const jx = sh ? (Math.random() - 0.5) * sh : 0, jz = sh ? (Math.random() - 0.5) * sh : 0;
    camera.position.set(camState.x - ox + jx, dist * 0.86, camState.z - oz + dist * 0.52 + jz);
    camera.lookAt(camState.x - ox, 0, camState.z - oz - 0.4);
    // the fog starts past the far side of the island, however far out the camera is
    const r = Math.max(W, H);
    scene.fog.near = dist + r * 0.5; scene.fog.far = dist + r * 2;
    // the sea moves gently
    sea.position.y = -0.55 + Math.sin(time * 0.8) * 0.03;
    R.render(scene, camera);
    drawOverlay(world);
    adapt(dt);
  }
  // a lightning bolt: little glowing cubes along a zig-zag (from a tesla coil's top, y0, down to the zombies)
  function bolt(a, b, y0) {
    const n = Math.max(3, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 4));
    for (let k = 0; k <= n; k++) {
      const t = k / n, j = k && k < n ? (Math.random() - 0.5) * 0.3 : 0;
      put(a[0] + (b[0] - a[0]) * t - ox + j, y0 + (0.75 - y0) * t + (Math.random() - 0.5) * 0.25, a[1] + (b[1] - a[1]) * t - oz + j, 0.09, 0.09, 0.09, k % 2 ? 0xe0f7fa : 0x4dd0e1);
    }
  }
  // a straight ray: one long cube turned to point from (x, y, z) to (tx, ty, tz), thinning as it fades
  function ray(r) {
    const dx = r.tx - r.x, dz = r.tz - r.z, dy = r.ty - r.y, len = Math.hypot(dx, dy, dz), f = r.life / r.max;
    if (len < 0.01) return;
    P.makeRotationY(Math.atan2(dx, dz)).multiply(Tm.makeRotationX(-Math.atan2(dy, Math.hypot(dx, dz))));
    P.setPosition(r.x + dx / 2 - ox, r.y + dy / 2, r.z + dz / 2 - oz);
    put(0, 0, 0, r.w * (0.5 + f * 0.5), r.w * (0.5 + f * 0.5), len, r.c);
    if (r.core) put(0, 0, 0, r.w * 0.45, r.w * 0.45, len, r.core);
    P.identity();
  }

  /* ================= words and bars over the world (a 2D canvas on top) ================= */
  function toScreen(x, y, z) {
    V.set(x - ox, y, z - oz).project(camera);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    return [(V.x + 1) / 2 * w, (1 - V.y) / 2 * h, V.z < 1];
  }
  function bar(x, y, w, f, col, h) {
    h = h || 4;
    octx.fillStyle = 'rgba(20,25,40,.55)'; octx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
    octx.fillStyle = col; octx.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, f)), h);
  }
  function drawOverlay(world) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    octx.clearRect(0, 0, w, h);
    // zombies' health (bosses always show theirs: a wide purple bar)
    for (const zb of world.zombies || []) {
      const Z = CC.ZOMBIES[zb.type] || {};
      if ((zb.hpPct >= 100 && !Z.boss) || zb.flags & 65) continue;
      const [sx, sy, ok] = toScreen(zb.x, zTop(zb) + 0.1 + 0.25 * (Z.size || 1), zb.z);
      if (ok) { if (Z.boss) bar(sx, sy, 70, zb.hpPct / 100, '#e040fb', 6); else bar(sx, sy, 26 * Math.min(1.5, Z.size || 1), zb.hpPct / 100, '#ef5350'); }
    }
    // barricades' health, and the spikes left in each trap
    octx.textAlign = 'center';
    for (const tu of world.towers || []) {
      if (tu.type === 'wall' && tu.max > 0 && tu.hp < tu.max) { const [sx, sy, ok] = toScreen(tu.tx + 0.5, 1.05, tu.tz + 0.5); if (ok) bar(sx, sy, 26, tu.hp / tu.max, '#ffca28'); }
      if (tu.type === 'spikes' && tu.spikes != null) {
        const [sx, sy, ok] = toScreen(tu.tx + 0.5, 0.55, tu.tz + 0.5);
        if (!ok) continue;
        octx.font = '800 11px Nunito, system-ui, sans-serif'; octx.lineWidth = 3; octx.strokeStyle = 'rgba(20,25,40,.6)';
        octx.strokeText(String(tu.spikes), sx, sy); octx.fillStyle = tu.spikes > 0 ? '#eceff1' : '#ff8a80'; octx.fillText(String(tu.spikes), sx, sy);
      }
    }
    for (const p of world.players || []) {
      const [sx, sy, ok] = toScreen(p.x, 1.35, p.z);
      if (!ok) continue;
      if (p.hp < 100 && !p.down) bar(sx, sy + 8, 30, p.hp / 100, '#66bb6a');
      octx.font = '700 12px Nunito, system-ui, sans-serif';
      octx.lineWidth = 3; octx.strokeStyle = 'rgba(20,25,40,.6)';
      const label = p.down ? '💫 ' + Math.ceil(p.down) : p.name;
      octx.strokeText(label, sx, sy); octx.fillStyle = '#' + CREW[p.slot % 4].shirt.toString(16).padStart(6, '0'); octx.fillText(label, sx, sy);
    }
    octx.font = '800 15px Nunito, system-ui, sans-serif';
    for (const p of popups) {
      const [sx, sy, ok] = toScreen(p.x, p.y, p.z);
      if (!ok) continue;
      octx.globalAlpha = Math.min(1, p.life * 2);
      octx.lineWidth = 3; octx.strokeStyle = 'rgba(20,25,40,.55)'; octx.strokeText(p.text, sx, sy);
      octx.fillStyle = p.color; octx.fillText(p.text, sx, sy);
      octx.globalAlpha = 1;
    }
  }

  /* ================= what is under a finger ================= */
  function pick(clientX, clientY) {
    if (!camera) return null;
    const r = canvas.getBoundingClientRect(), nx = (clientX - r.left) / r.width * 2 - 1, ny = -((clientY - r.top) / r.height) * 2 + 1;
    V.set(nx, ny, 0.5).unproject(camera);
    const dir = V.sub(camera.position).normalize(), t = (0.15 - camera.position.y) / dir.y;
    if (t <= 0) return null;
    const x = camera.position.x + dir.x * t + ox, z = camera.position.z + dir.z * t + oz;
    return { x: x, z: z, tx: Math.floor(x), tz: Math.floor(z) };
  }
  // automatic quality: when frames come slower than about 40 a second for a couple of seconds, draw fewer pixels
  // (down to one per screen point), then drop the shadows
  const perf = { on: false, t: 0, n: 0, sum: 0, steps: 0 };
  function autoQuality(on) { perf.on = !!on; perf.t = 0; perf.n = 0; perf.sum = 0; }
  function adapt(dt) {
    if (!perf.on || !R || dt <= 0 || dt > 0.25) return;
    perf.t += dt; perf.n++; perf.sum += dt;
    if (perf.t < 2.5) return;
    const avg = perf.sum / perf.n;
    perf.t = 0; perf.n = 0; perf.sum = 0;
    if (avg < 1 / 40) return;
    const pr = R.getPixelRatio();
    if (pr > 1.01) { R.setPixelRatio(Math.max(1, pr - 0.5)); resize(); perf.steps++; return; }
    if (R.shadowMap.enabled) { R.shadowMap.enabled = false; sun.castShadow = false; scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); perf.steps++; return; }
    perf.on = false;   // nothing more to give
  }
  // far enough out to see a whole map, close enough to see the crew's faces
  function zoom(f) { camState.zoom = Math.max(0.6, Math.min(2.2, f)); return camState.zoom; }
  function snapCamera(x, z) { camState.x = x; camState.z = z; }
  function stats() { return { statics: statics ? statics.count : 0, dyn: dyn ? dyn.count : 0, glow: glow ? glow.count : 0, ghosts: ghostMesh ? ghostMesh.count : 0, parts: parts.length, calls: R ? R.info.render.calls : 0, tris: R ? R.info.render.triangles : 0 }; }
  function clearFx() { parts.length = 0; flights.length = 0; zaps.length = 0; rays.length = 0; rings.length = 0; popups.length = 0; chopKind.clear(); }

  return { init: init, autoQuality: autoQuality, quality: () => ({ ratio: R ? R.getPixelRatio() : 0, shadows: R ? R.shadowMap.enabled : false, steps: perf.steps }), resize: resize, setMap: setMap, rebuild: rebuild, frame: frame, fx: fx, pick: pick, zoom: zoom, setGhost: setGhost, setSelected: setSelected, snapCamera: snapCamera, stats: stats, clearFx: clearFx, CREW: CREW, THEMES: THEMES, get camZoom() { return camState.zoom; } };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CCView;
