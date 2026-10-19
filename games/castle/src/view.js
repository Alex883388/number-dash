/* games/castle/src/view.js — Castle Crew's 3D world, drawn with three.js in the blocky voxel style of Unrailed!:
   everything is made of coloured cubes (the island's tiles, trees, rocks, the castle, the crew, the zombies, turrets,
   shots and every puff of smoke), drawn as a few instanced meshes so hundreds of cubes cost a handful of draw calls.
   The page gives it THREE (loaded from the CDN) and a world to draw each frame:
     world = { map, occ, castle: { hp, max }, players: [...], zombies: [...], turrets: [...], local: id }
   Positions are in tiles (x east, z south); the view centres the map on the origin. */
const CCView = (function () {
  let THREE = null, R = null, scene = null, camera = null, sun = null, canvas = null, overlay = null, octx = null;
  let statics = null, water = null, dyn = null, glow = null, ghostMesh = null, sea = null;
  let map = null, W = 0, H = 0, ox = 0, oz = 0;
  let quality = 'high', time = 0;
  const camState = { x: 0, z: 0, zoom: 1, shake: 0 };
  // reusable maths
  let M = null, P = null, Q = null, Tm = null, C = null, V = null;
  const parts = [];          // particles: { x, y, z, vx, vy, vz, life, max, s, c, g, glow }
  const flights = [];        // shots in flight, drawn from events: { kind, x, z, y, vx, vz, t, life, lob, tx, tz, c }
  const zaps = [];           // lightning: { pts, life }
  const popups = [];         // floating words: { x, z, y, text, life, color }

  /* ---- colours ---- */
  const COL = {
    grass: [0x7cc84a, 0x6dbb43, 0x86d052], grassSide: 0x8a5a33, dirt: 0xc9a06a, dirtDark: 0xb78a55, sand: 0xf1d79a, sandDark: 0xe4c27e,
    water: 0x45b7f0, waterDeep: 0x2b8fd6, foam: 0xd8f3ff, sea: 0x2f9be3, trunk: 0x8b5a2b, leaves: [0x3f9b3a, 0x4caf50, 0x2e8b3a, 0x5cbf4a], pine: [0x2f7d4a, 0x3a8f55],
    rock: [0x9aa1a8, 0x8a9198, 0xa9b0b6], ore: 0x5f6870, stone: 0xc4c9d1, stoneDark: 0x9ea5af, roof: 0xd9534f, roofDark: 0xb33f3b, wood: 0xa36a3a, woodDark: 0x7a4b25,
    flag: 0xffc94d, bridge: 0xb07a45, flower: [0xff6f91, 0xffd54f, 0xffffff, 0x9575cd], gate: 0x4a3b6b, gateGlow: 0x9cff6b
  };
  const CREW = [{ shirt: 0xe9524a, hat: 0xb83a33, name: 'red' }, { shirt: 0x4a90e2, hat: 0x2f6db5, name: 'blue' }, { shirt: 0xf5c518, hat: 0xd39e00, name: 'yellow' }, { shirt: 0x4caf50, hat: 0x2e7d32, name: 'green' }];
  const SKIN = 0xffcf9e;

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
    scene.add(new THREE.HemisphereLight(0xdff3ff, 0x6a8a4a, 1.05));
    sun = new THREE.DirectionalLight(0xfff1d6, 1.9);
    sun.castShadow = quality !== 'low';
    const sm = quality === 'high' ? 2048 : 1024;
    sun.shadow.mapSize.set(sm, sm);
    sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
    scene.add(sun); scene.add(sun.target);
    M = new THREE.Matrix4(); P = new THREE.Matrix4(); Q = new THREE.Matrix4(); Tm = new THREE.Matrix4(); C = new THREE.Color(); V = new THREE.Vector3();
    const box = new THREE.BoxGeometry(1, 1, 1);
    const lit = new THREE.MeshLambertMaterial({ color: 0xffffff });
    statics = new THREE.InstancedMesh(box, lit, 9000); statics.castShadow = true; statics.receiveShadow = true; statics.count = 0;
    water = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 }), 2500); water.receiveShadow = true; water.count = 0;
    dyn = new THREE.InstancedMesh(box, lit, 12000); dyn.castShadow = true; dyn.receiveShadow = true; dyn.count = 0; dyn.frustumCulled = false;
    glow = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }), 4000); glow.count = 0; glow.frustumCulled = false;
    ghostMesh = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }), 2000); ghostMesh.count = 0; ghostMesh.frustumCulled = false;
    [statics, water, dyn, glow, ghostMesh].forEach((m) => { m.setColorAt(0, C.setHex(0xffffff)); scene.add(m); });
    sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: COL.sea }));
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
  // the parent transform: where an object stands, which way it faces, how big it is
  function place(x, y, z, rot, s) {
    P.makeRotationY(rot || 0);
    if (s && s !== 1) P.multiply(Tm.makeScale(s, s, s));
    P.setPosition(x - ox, y, z - oz);
  }
  const wx = (x) => x - ox, wz = (z) => z - oz;

  /* ================= the island ================= */
  const hash = (x, y, k) => { let h = (x * 374761393 + y * 668265263 + (k || 0) * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function setMap(m) {
    map = m; W = m.w; H = m.h; ox = W / 2; oz = H / 2;
    const r = Math.max(W, H);
    sun.position.set(-r * 0.35, r * 0.9, r * 0.45); sun.target.position.set(0, 0, 0);
    const sc = sun.shadow.camera; sc.left = -r * 0.75; sc.right = r * 0.75; sc.top = r * 0.75; sc.bottom = -r * 0.75; sc.near = 1; sc.far = r * 3; sc.updateProjectionMatrix();
    scene.fog.near = r * 1.1; scene.fog.far = r * 2.6;
    rebuild();
  }
  // the whole still world, rebuilt when a tree falls, a rock breaks or the map changes
  function rebuild() {
    const T = CC.T, m = map;
    P.identity();
    begin(statics);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, t = m.tiles[i], hx = x + 0.5 - ox, hz = y + 0.5 - oz, n = hash(x, y);
      if (t === T.WATER) continue;
      const top = 0.1 + (t === T.GRASS || t === T.TREE || t === T.ROCK ? m.hgt[i] : 0);
      let col;
      if (t === T.DIRT || t === T.SPAWN) col = n < 0.5 ? COL.dirt : COL.dirtDark;
      else if (t === T.SAND) col = n < 0.6 ? COL.sand : COL.sandDark;
      else if (t === T.BRIDGE) col = COL.bridge;
      else col = COL.grass[(x + y) % 2 === 0 ? 0 : n < 0.5 ? 1 : 2];
      if (t === T.BRIDGE) {
        put(hx, -0.08, hz, 1, 0.14, 1, COL.bridge);
        put(hx - 0.42, 0.06, hz, 0.12, 0.16, 1, COL.woodDark); put(hx + 0.42, 0.06, hz, 0.12, 0.16, 1, COL.woodDark);
        continue;
      }
      // a column of earth with a coloured top
      put(hx, (top - 0.13 - 0.6) / 2, hz, 1, top + 0.47, 1, COL.grassSide);
      put(hx, top - 0.065, hz, 1, 0.13, 1, col);
      if (t === T.DIRT && n > 0.7) put(hx + (n - 0.85) * 2, top + 0.02, hz + (hash(x, y, 2) - 0.5) * 0.6, 0.12, 0.05, 0.1, COL.dirtDark);
      if (t === T.GRASS) {
        if (n > 0.86) { const fc = COL.flower[Math.floor(hash(x, y, 3) * 4)]; put(hx + (hash(x, y, 4) - 0.5) * 0.6, top + 0.08, hz + (hash(x, y, 5) - 0.5) * 0.6, 0.1, 0.1, 0.1, fc); put(hx + (hash(x, y, 4) - 0.5) * 0.6, top + 0.02, hz + (hash(x, y, 5) - 0.5) * 0.6, 0.04, 0.08, 0.04, 0x3d8b3d); }
        else if (n > 0.7) { put(hx + (hash(x, y, 6) - 0.5) * 0.5, top + 0.05, hz + (hash(x, y, 7) - 0.5) * 0.5, 0.06, 0.12, 0.06, 0x5aa83a); put(hx + (hash(x, y, 6) - 0.5) * 0.5 + 0.08, top + 0.04, hz + (hash(x, y, 7) - 0.5) * 0.5 + 0.05, 0.06, 0.09, 0.06, 0x5aa83a); }
      }
      if (t === T.TREE) tree(hx, top, hz, x, y, m.life[i]);
      if (t === T.ROCK) rock(hx, top, hz, x, y, m.life[i]);
      if (t === T.SPAWN) gate(hx, top, hz, x, y);
    }
    castle(m);
    end();
    // water tiles, a little lower than the land, with foam next to it
    begin(water);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (m.tiles[i] !== CC.T.WATER && m.tiles[i] !== CC.T.BRIDGE) continue;
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y) === 0;
      put(x + 0.5 - ox, -0.2, y + 0.5 - oz, 1.001, 0.5, 1.001, edge ? COL.sea : (hash(x, y, 9) < 0.5 ? COL.water : 0x4cbcf3));
    }
    end();
  }
  function tree(x, y, z, tx, ty, life) {
    const k = hash(tx, ty, 11), s = 0.85 + k * 0.3, lean = (hash(tx, ty, 12) - 0.5) * 0.12, shrink = life >= 3 ? 1 : life === 2 ? 0.92 : 0.82;
    if (k < 0.35) {
      // a pine: stacked layers getting smaller
      put(x, y + 0.25 * s, z, 0.2, 0.5 * s, 0.2, COL.trunk);
      const c = COL.pine[k < 0.17 ? 0 : 1];
      put(x + lean, y + 0.55 * s, z, 0.8 * s * shrink, 0.32 * s, 0.8 * s * shrink, c);
      put(x + lean, y + 0.85 * s, z, 0.6 * s * shrink, 0.3 * s, 0.6 * s * shrink, c);
      put(x + lean, y + 1.12 * s, z, 0.38 * s * shrink, 0.28 * s, 0.38 * s * shrink, c);
      put(x + lean, y + 1.33 * s, z, 0.16 * s, 0.16 * s, 0.16 * s, c);
    } else {
      // a round tree: a trunk and a blocky crown
      put(x, y + 0.3 * s, z, 0.22, 0.6 * s, 0.22, COL.trunk);
      const c = COL.leaves[Math.floor(hash(tx, ty, 13) * 4)];
      put(x + lean, y + 0.85 * s, z, 0.78 * s * shrink, 0.55 * s, 0.78 * s * shrink, c);
      put(x + lean + 0.12, y + 1.18 * s, z - 0.08, 0.5 * s * shrink, 0.32 * s, 0.5 * s * shrink, c);
      if (hash(tx, ty, 14) > 0.6) put(x + lean - 0.22, y + 0.95 * s, z + 0.2, 0.3 * s, 0.3 * s, 0.3 * s, COL.leaves[(Math.floor(hash(tx, ty, 13) * 4) + 1) % 4]);
    }
  }
  function rock(x, y, z, tx, ty, life) {
    const k = hash(tx, ty, 21), c = COL.rock[Math.floor(k * 3)], s = life >= 4 ? 1 : life === 3 ? 0.9 : life === 2 ? 0.78 : 0.65;
    put(x, y + 0.24 * s, z, 0.72 * s, 0.5 * s, 0.68 * s, c);
    put(x + 0.18 * s, y + 0.5 * s, z - 0.1 * s, 0.42 * s, 0.32 * s, 0.4 * s, COL.rock[(Math.floor(k * 3) + 1) % 3]);
    put(x - 0.22 * s, y + 0.15 * s, z + 0.2 * s, 0.32 * s, 0.26 * s, 0.3 * s, c);
    if (k > 0.5) { put(x + 0.1, y + 0.36 * s, z + 0.35 * s, 0.12, 0.1, 0.02, COL.ore); put(x - 0.2, y + 0.3 * s, z + 0.35 * s, 0.08, 0.08, 0.02, COL.ore); }
  }
  function gate(x, y, z) {
    // a zombie gate: a ring of dark stones, gravestones and a green glow
    for (const [dx, dz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) { put(x + dx, y + 0.35, z + dz, 0.2, 0.7, 0.2, 0x5a5f6b); put(x + dx, y + 0.75, z + dz, 0.26, 0.1, 0.26, 0x4a4f5b); }
    put(x, y + 0.03, z, 0.9, 0.06, 0.9, 0x3f6b2f);
    put(x - 0.7, y + 0.2, z + 0.1, 0.18, 0.4, 0.08, 0x9aa1a8); put(x + 0.7, y + 0.18, z - 0.15, 0.18, 0.36, 0.08, 0x9aa1a8);
  }
  function castle(m) {
    const c = m.c, x0 = c - 2 - ox, z0 = c - 2 - oz, y = 0.1;
    // the yard: stone floor
    put(c + 0.5 - ox, y + 0.05, c + 0.5 - oz, 5, 0.1, 5, 0xb9bec7);
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
    // corner towers with roofs
    for (const [tx, tz] of [[x0 + 0.5, z0 + 0.5], [x0 + 4.5, z0 + 0.5], [x0 + 0.5, z0 + 4.5], [x0 + 4.5, z0 + 4.5]]) {
      put(tx, y + 0.7, tz, 1.2, 1.4, 1.2, 0xd3d7de);
      put(tx, y + 1.46, tz, 1.34, 0.12, 1.34, COL.stoneDark);
      put(tx, y + 1.65, tz, 1.1, 0.26, 1.1, COL.roof); put(tx, y + 1.87, tz, 0.76, 0.2, 0.76, COL.roofDark); put(tx, y + 2.04, tz, 0.36, 0.16, 0.36, COL.roof);
      put(tx, y + 0.85, tz + 0.61, 0.18, 0.26, 0.02, 0x3a3f4a);
    }
    // the keep in the middle with the big roof and the flag
    const kx = c + 0.5 - ox, kz = c + 0.5 - oz;
    put(kx, y + 0.8, kz, 2.2, 1.6, 2.2, 0xe2e5ea);
    put(kx, y + 1.66, kz, 2.4, 0.14, 2.4, COL.stoneDark);
    put(kx, y + 1.9, kz, 2.1, 0.34, 2.1, COL.roof); put(kx, y + 2.18, kz, 1.5, 0.3, 1.5, COL.roofDark); put(kx, y + 2.44, kz, 0.9, 0.26, 0.9, COL.roof); put(kx, y + 2.64, kz, 0.4, 0.2, 0.4, COL.roofDark);
    put(kx, y + 3.15, kz, 0.06, 1, 0.06, 0x6b4a2b);
    put(kx, y + 0.5, kz + 1.11, 0.5, 0.6, 0.02, COL.woodDark); put(kx - 0.6, y + 1.1, kz + 1.11, 0.22, 0.28, 0.02, 0x3a3f4a); put(kx + 0.6, y + 1.1, kz + 1.11, 0.22, 0.28, 0.02, 0x3a3f4a);
  }

  /* ================= the crew, zombies, turrets ================= */
  const WEAPON_LOOK = {
    blaster: (s) => { put(0.2, 0.52, 0.32, 0.1, 0.12, 0.3, 0x5b6573); put(0.2, 0.55, 0.5, 0.06, 0.06, 0.16, 0xffc94d); },
    hammer: (s, a) => { putSwing(0.22, 0.55, 0.2, a, 0.22, 0.75, 0.2, 0.06, 0.5, 0.06, COL.wood); putSwing(0.22, 0.55, 0.2, a, 0.22, 1.0, 0.2, 0.28, 0.16, 0.16, 0x7b8794); },
    scatter: (s) => { put(0.2, 0.52, 0.3, 0.16, 0.12, 0.32, 0x8d5a2b); put(0.16, 0.56, 0.5, 0.05, 0.05, 0.16, 0x444b55); put(0.24, 0.56, 0.5, 0.05, 0.05, 0.16, 0x444b55); },
    flamer: (s) => { put(0, 0.55, -0.22, 0.2, 0.3, 0.12, 0xd84315); put(0.2, 0.5, 0.32, 0.1, 0.1, 0.34, 0x5b6573); put(0.2, 0.5, 0.52, 0.08, 0.08, 0.06, 0xff9800); },
    crossbow: (s) => { put(0.2, 0.52, 0.32, 0.08, 0.08, 0.36, COL.wood); put(0.2, 0.55, 0.46, 0.4, 0.05, 0.05, COL.woodDark); },
    frost: (s) => { put(0.22, 0.55, 0.3, 0.05, 0.05, 0.4, 0xb3e5fc); put(0.22, 0.58, 0.52, 0.12, 0.12, 0.12, 0x81d4fa); },
    bomb: (s) => { put(0.2, 0.55, 0.28, 0.16, 0.16, 0.42, 0x4e5865); put(0.2, 0.55, 0.5, 0.18, 0.18, 0.04, 0x2f3640); },
    lightning: (s) => { put(0.22, 0.6, 0.25, 0.05, 0.75, 0.05, 0x8d6e63); put(0.22, 1.0, 0.25, 0.14, 0.14, 0.14, 0xffeb3b); }
  };
  function drawPlayer(p, t) {
    const look = CREW[p.slot % 4], moving = p.moving ? 1 : 0, ph = t * 11 + p.slot, sw = moving * Math.sin(ph) * 0.6;
    const bob = moving * Math.abs(Math.sin(ph)) * 0.04, act = p.act;
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
    // arms: forward when firing, swinging when walking
    const armA = act === 'fire' || p.fireHold ? -1.35 : act === 'chop' || act === 'mine' ? -1.7 + Math.sin(t * 30) * 0.8 : -sw * 0.8;
    putSwing(-0.27, 0.66, 0, armA, -0.27, 0.5, 0, 0.1, 0.3, 0.12, look.shirt);
    putSwing(0.27, 0.66, 0, act === 'fire' || p.fireHold ? -1.35 : sw * 0.8, 0.27, 0.5, 0, 0.1, 0.3, 0.12, look.shirt);
    if (act === 'chop' || act === 'mine') { putSwing(0.27, 0.66, 0, armA, 0.27, 0.4, 0.15, 0.05, 0.4, 0.05, COL.wood); putSwing(0.27, 0.66, 0, armA, 0.27, 0.25, 0.22, 0.25, 0.08, 0.08, 0x7b8794); }
    else { const L = WEAPON_LOOK[p.weapon]; if (L) L(1, p.act === 'fire' ? -1.2 : 0); }
  }
  // zombie looks: skin, shirt, trousers and extra pieces
  const ZLOOK = {
    walker: { skin: 0x8bc34a, shirt: 0x5c7a99, legs: 0x5d4037 },
    runner: { skin: 0x9ccc65, shirt: 0xff8a3d, legs: 0x455a64, thin: 0.82 },
    brute: { skin: 0x7cb342, shirt: 0x7e57c2, legs: 0x4e342e, wide: 1.25 },
    knight: { skin: 0x8bc34a, shirt: 0x9ea7b3, legs: 0x78909c, helm: 0xb0bec5 },
    spitter: { skin: 0xc0ca33, shirt: 0x6d8b3a, legs: 0x5d4037, mouth: 1 },
    bomber: { skin: 0x8bc34a, shirt: 0xc62828, legs: 0x37474f, tnt: 1 },
    ghost: { skin: 0xe3f2fd, shirt: 0xe3f2fd, legs: 0xe3f2fd, ghost: 1 },
    frosty: { skin: 0x9be7ff, shirt: 0x4fc3f7, legs: 0x0288d1, ice: 1 },
    blaze: { skin: 0xff7043, shirt: 0xbf360c, legs: 0x4e342e, fire: 1 },
    digger: { skin: 0x9ccc65, shirt: 0x8d6e63, legs: 0x5d4037, miner: 1 },
    blob: { skin: 0x66bb6a, blob: 1 },
    mini: { skin: 0x81c784, blob: 1 },
    shield: { skin: 0x8bc34a, shirt: 0x6d4c41, legs: 0x3e2723, shieldBoard: 1 },
    shaman: { skin: 0xaed581, shirt: 0x6a1b9a, legs: 0x4a148c, robe: 1, staff: 1 },
    king: { skin: 0x7cb342, shirt: 0x8e24aa, legs: 0x4a148c, crown: 1, cape: 0xc62828, wide: 1.15 },
    witch: { skin: 0x9ccc65, shirt: 0x311b92, legs: 0x311b92, robe: 1, hat: 1, ghost: 0 },
    colossus: { skin: 0x8d9a8f, shirt: 0x546e7a, legs: 0x37474f, wide: 1.2, eyes: 0xff5252 }
  };
  function drawZombie(zb, t) {
    const Z = CC.ZOMBIES[zb.type], L = ZLOOK[zb.type], size = Z.size || 1, hit = zb.flags & 16, under = zb.flags & 1;
    const ph = t * (6 + Z.speed * 4) + zb.id * 1.7, moving = !(zb.flags & 8), sw = moving ? Math.sin(ph) * 0.55 : 0, lunge = zb.flags & 8 ? 0.25 : 0;
    if (under) {
      // a digger underground: a moving mound of earth
      place(zb.x, 0.1, zb.z, zb.rot, 1);
      put(0, 0.08, 0, 0.6, 0.16, 0.6, COL.dirtDark); put(0.1, 0.18, -0.05, 0.3, 0.12, 0.3, COL.dirt);
      return;
    }
    const floaty = L.ghost || zb.type === 'witch';
    const y = 0.1 + (floaty ? 0.3 + Math.sin(t * 3 + zb.id) * 0.08 : Math.abs(Math.sin(ph)) * 0.03);
    place(zb.x, y, zb.z, zb.rot, size);
    const skin = hit ? 0xffffff : L.skin;
    if (L.blob) {
      const sq = 1 + Math.sin(ph * 1.3) * 0.08;
      put(0, 0.3 * sq, 0, 0.62, 0.6 * sq, 0.62, skin); put(0, 0.66 * sq, 0, 0.44, 0.14, 0.44, skin);
      put(-0.12, 0.42, 0.315, 0.1, 0.12, 0.02, 0x1b1b1b); put(0.12, 0.42, 0.315, 0.1, 0.12, 0.02, 0x1b1b1b);
    } else {
      const wdt = L.wide || 1, thin = L.thin || 1;
      if (!L.ghost && !L.robe) {
        putSwing(-0.1, 0.32, 0, sw, -0.1, 0.16, 0, 0.15, 0.32, 0.16, L.legs);
        putSwing(0.1, 0.32, 0, -sw, 0.1, 0.16, 0, 0.15, 0.32, 0.16, L.legs);
      } else if (L.robe) put(0, 0.22, 0, 0.4 * wdt, 0.44, 0.3, L.shirt);
      else put(0, 0.2, -0.05, 0.3, 0.3, 0.22, skin);
      put(0, 0.52, 0.02 + lunge * 0.3, 0.44 * wdt * thin, 0.38, 0.28, hit ? 0xffffff : L.shirt);
      put(0, 0.86, 0.04 + lunge * 0.4, 0.36, 0.32, 0.34, skin);
      const eye = L.eyes || (L.ghost ? 0x37474f : 0xb71c1c);
      put(-0.08, 0.88, 0.215 + lunge * 0.4, 0.07, 0.07, 0.02, eye); put(0.08, 0.88, 0.215 + lunge * 0.4, 0.07, 0.07, 0.02, eye);
      if (L.mouth) put(0, 0.76, 0.215 + lunge * 0.4, 0.18, 0.08, 0.03, 0x33691e);
      // arms straight out in front, swaying
      const armA = -1.5 + Math.sin(ph * 0.5) * 0.15 - lunge * 1.5;
      putSwing(-0.29 * wdt, 0.68, 0, armA, -0.29 * wdt, 0.52, 0, 0.11, 0.32, 0.12, skin);
      putSwing(0.29 * wdt, 0.68, 0, armA + 0.12, 0.29 * wdt, 0.52, 0, 0.11, 0.32, 0.12, skin);
      if (L.helm) { put(0, 1.04, 0.02, 0.4, 0.12, 0.38, L.helm); put(0, 0.9, 0.2, 0.3, 0.05, 0.02, 0x546e7a); put(0, 1.14, -0.05, 0.06, 0.12, 0.2, 0xe53935); put(0, 0.56, 0.15, 0.4 * wdt, 0.3, 0.04, L.helm); }
      if (L.tnt) { put(0, 0.56, -0.2, 0.34, 0.3, 0.14, 0xd32f2f); put(-0.08, 0.56, -0.28, 0.06, 0.3, 0.02, 0x212121); put(0.08, 0.76, -0.22, 0.03, 0.14, 0.03, 0x5d4037); if (Math.sin(t * 20) > 0) put(0.08, 0.85, -0.22, 0.06, 0.06, 0.06, 0xffeb3b); }
      if (L.ice) { put(-0.22, 0.74, 0, 0.12, 0.16, 0.12, 0xe1f5fe); put(0.22, 0.78, 0, 0.1, 0.2, 0.1, 0xe1f5fe); put(0, 1.06, 0, 0.12, 0.14, 0.12, 0xe1f5fe); }
      if (L.fire) { const f = 0.8 + Math.sin(t * 18 + zb.id) * 0.2; put(0, 1.06, 0, 0.26 * f, 0.18 * f, 0.26 * f, 0xffb300); put(0.05, 1.18, -0.04, 0.14 * f, 0.14 * f, 0.14 * f, 0xffeb3b); }
      if (L.miner) { put(0, 1.04, 0.02, 0.4, 0.1, 0.38, 0xfbc02d); put(0, 1.0, 0.2, 0.1, 0.08, 0.04, 0xfff59d); putSwing(0.29, 0.68, 0, armA + 0.12, 0.29, 0.4, 0.25, 0.04, 0.44, 0.04, COL.wood); putSwing(0.29, 0.68, 0, armA + 0.12, 0.29, 0.22, 0.32, 0.3, 0.06, 0.06, 0x78909c); }
      if (L.shieldBoard) { put(0, 0.56, 0.3, 0.56, 0.6, 0.06, 0x8d6e63); put(0, 0.56, 0.335, 0.2, 0.2, 0.02, 0xbcaaa4); put(-0.22, 0.56, 0.335, 0.04, 0.56, 0.02, 0x5d4037); put(0.22, 0.56, 0.335, 0.04, 0.56, 0.02, 0x5d4037); }
      if (L.staff) { put(0.34, 0.6, 0.18, 0.05, 0.9, 0.05, COL.wood); put(0.34, 1.08, 0.18, 0.14, 0.14, 0.14, 0xf5f5f5); put(0.31, 1.1, 0.25, 0.03, 0.03, 0.02, 0x212121); put(0, 0.9, 0.2, 0.26, 0.2, 0.02, 0x8e24aa); }
      if (L.hat) { put(0, 1.06, 0, 0.5, 0.06, 0.5, 0x1a1a2e); put(0, 1.2, 0, 0.3, 0.22, 0.3, 0x1a1a2e); put(0.04, 1.38, -0.04, 0.16, 0.16, 0.16, 0x1a1a2e); }
      if (L.crown) { put(0, 1.06, 0.02, 0.38, 0.1, 0.36, 0xffc107); for (const cx of [-0.14, 0, 0.14]) put(cx, 1.15, 0.17, 0.06, 0.1, 0.02, 0xffc107); put(0, 0.66, -0.2, 0.5, 0.6, 0.04, L.cape); }
    }
  }
  const TURRET_LOOK = {
    arrow: (t, lv) => { for (const [a, b] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) put(a, 0.5, b, 0.1, 1, 0.1, COL.wood); put(0, 1.02, 0, 0.84, 0.1, 0.84, COL.woodDark); put(0, 0.35, 0, 0.7, 0.06, 0.7, COL.woodDark); return 1.1; },
    wall: () => { put(0, 0.3, 0, 0.96, 0.6, 0.3, COL.wood); for (const a of [-0.36, 0, 0.36]) put(a, 0.68, 0, 0.12, 0.2, 0.12, COL.woodDark); put(0, 0.2, 0.16, 1, 0.08, 0.04, COL.woodDark); put(0, 0.45, -0.16, 1, 0.08, 0.04, COL.woodDark); return 0; },
    cannon: () => { put(0, 0.25, 0, 0.8, 0.5, 0.8, COL.stone); put(0, 0.53, 0, 0.86, 0.08, 0.86, COL.stoneDark); return 0.6; },
    frost: () => { put(0, 0.35, 0, 0.6, 0.7, 0.6, COL.stone); put(0, 0.72, 0, 0.7, 0.06, 0.7, COL.stoneDark); return 0.75; },
    tesla: () => { put(0, 0.2, 0, 0.7, 0.4, 0.7, 0x546e7a); for (const y of [0.5, 0.75, 1.0]) put(0, y, 0, 0.42, 0.1, 0.42, 0xbf7a3a); put(0, 0.75, 0, 0.16, 0.7, 0.16, 0x78909c); return 1.15; },
    flame: () => { put(0, 0.3, 0, 0.7, 0.6, 0.7, 0x6d4c41); put(0, 0.62, 0, 0.8, 0.08, 0.8, 0x3e2723); return 0.66; },
    mortar: () => { put(0, 0.2, 0, 0.86, 0.4, 0.86, COL.stoneDark); put(0, 0.43, 0, 0.9, 0.06, 0.9, COL.stone); return 0.46; },
    shrine: () => { put(0, 0.2, 0, 0.8, 0.4, 0.8, 0xf5f5f5); put(0, 0.45, 0, 0.6, 0.1, 0.6, 0xe0e0e0); for (const [a, b] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) put(a, 0.7, b, 0.08, 0.5, 0.08, 0xffffff); return 0.6; }
  };
  const TURRET_TOP = {
    arrow: (lv, t) => { put(0, 0.12, 0, 0.12, 0.1, 0.5, COL.wood); put(0, 0.12, 0.12, 0.56, 0.05, 0.05, COL.woodDark); put(0, 0.17, 0.12, 0.04, 0.04, 0.34, 0xffc94d); },
    cannon: () => { put(0, 0.14, 0.12, 0.26, 0.26, 0.62, 0x37474f); put(0, 0.14, 0.44, 0.3, 0.3, 0.06, 0x263238); put(-0.2, 0.06, -0.05, 0.08, 0.2, 0.2, 0x5d4037); put(0.2, 0.06, -0.05, 0.08, 0.2, 0.2, 0x5d4037); },
    frost: (lv, t) => { put(0, 0.3, 0, 0.32, 0.5, 0.32, 0x81d4fa); put(0, 0.3, 0, 0.44, 0.22, 0.12, 0xb3e5fc); put(0, 0.3, 0, 0.12, 0.22, 0.44, 0xb3e5fc); },
    tesla: (lv, t) => { put(0, 0.12, 0, 0.3, 0.3, 0.3, 0x4dd0e1); },
    flame: (lv, t) => { const f = 0.85 + Math.sin(t * 14) * 0.15; put(0, 0.15, 0, 0.5 * f, 0.26 * f, 0.5 * f, 0xff7043); put(0, 0.32, 0, 0.3 * f, 0.22 * f, 0.3 * f, 0xffb300); },
    mortar: () => { P.multiply(Tm.makeRotationX(-0.6)); put(0, 0.2, 0, 0.42, 0.5, 0.42, 0x37474f); put(0, 0.46, 0, 0.48, 0.08, 0.48, 0x263238); },
    shrine: (lv, t) => { put(0, 0.35 + Math.sin(t * 2) * 0.05, 0, 0.3, 0.3, 0.3, 0xff6f91); put(0, 0.35 + Math.sin(t * 2) * 0.05, 0, 0.18, 0.42, 0.18, 0xff8fab); }
  };
  function drawTurret(tu, t) {
    const look = TURRET_LOOK[tu.type], top = TURRET_TOP[tu.type];
    place(tu.tx + 0.5, 0.1, tu.tz + 0.5, 0, 1);
    const h = look(tu, tu.lvl);
    // upgrade stars: gold studs on the base
    for (let k = 1; k < tu.lvl; k++) put(-0.42 + k * 0.12, 0.08, 0.46, 0.08, 0.08, 0.04, 0xffc107);
    if (top) { place(tu.tx + 0.5, 0.1 + h, tu.tz + 0.5, tu.type === 'frost' || tu.type === 'shrine' || tu.type === 'flame' ? (tu.rot || 0) : (tu.rot || 0), 1); top(tu.lvl, t); }
  }

  /* ================= effects ================= */
  const rand = (a, b) => a + Math.random() * (b - a);
  function burst(x, y, z, n, col, speed, size, life, opts) {
    for (let k = 0; k < n && parts.length < 1500; k++) {
      const a = Math.random() * Math.PI * 2, up = rand(0.3, 1);
      parts.push({ x: x, y: y, z: z, vx: Math.cos(a) * speed * rand(0.3, 1), vy: up * speed * (opts && opts.up != null ? opts.up : 1.2), vz: Math.sin(a) * speed * rand(0.3, 1), life: life * rand(0.6, 1.1), max: life, s: size * rand(0.6, 1.2), c: Array.isArray(col) ? col[k % col.length] : col, g: opts && opts.g != null ? opts.g : 9, glow: opts && opts.glow });
    }
  }
  const SHOT_COL = { blaster: 0xffd54f, scatter: 0xffe082, crossbow: 0x8d6e63, frost: 0x81d4fa, arrow: 0xa1887f, cannon: 0x263238, bomb: 0x263238, mortar: 0x263238 };
  function fx(e, local) {
    const T = CC.T;
    switch (e.e) {
      case 'shot': {
        const kind = (e.k || '').split(':')[1] || 'blaster', n = e.n || 1, spread = (e.spread || 0) * Math.PI / 180;
        for (let k = 0; k < n; k++) {
          const a = e.a + (n > 1 ? ((k / (n - 1)) - 0.5) * spread : 0);
          flights.push({ kind: kind, x: e.x, z: e.y, y: kind === 'arrow' ? 1.25 : 0.6, vx: Math.sin(a) * e.sp, vz: Math.cos(a) * e.sp, life: e.l / e.sp, c: SHOT_COL[kind] || 0xffd54f });
        }
        if (e.k && e.k[0] === 'p') burst(e.x + Math.sin(e.a) * 0.5, 0.65, e.y + Math.cos(e.a) * 0.5, 2, 0xfff59d, 1.5, 0.06, 0.12, { glow: 1, g: 0 });
        break;
      }
      case 'lob': flights.push({ kind: (e.k || '').split(':')[1], lob: true, x: e.x, z: e.y, tx: e.tx, tz: e.ty, t: 0, life: e.t, c: 0x263238 }); break;
      case 'zap': zaps.push({ pts: e.pts, life: 0.18 }); for (const p of e.pts.slice(1)) burst(p[0], 0.7, p[1], 3, [0xe1f5fe, 0x4dd0e1], 2, 0.07, 0.25, { glow: 1, g: 0 }); break;
      case 'flame': for (let k = 0; k < 6; k++) { const a = e.a + rand(-0.4, 0.4), d = rand(0.4, e.l); parts.push({ x: e.x + Math.sin(a) * 0.4, y: 0.55, z: e.y + Math.cos(a) * 0.4, vx: Math.sin(a) * d * 2.4, vy: rand(0, 0.8), vz: Math.cos(a) * d * 2.4, life: 0.4, max: 0.4, s: rand(0.12, 0.22), c: [0xff7043, 0xffb300, 0xffeb3b][k % 3], g: -1, glow: 1 }); } break;
      case 'swing': burst(e.x + Math.sin(e.a) * 0.9, 0.5, e.y + Math.cos(e.a) * 0.9, 4, 0xeeeeee, 1.5, 0.06, 0.2, { glow: 1, g: 0 }); break;
      case 'hit': burst(e.x, 0.6, e.y, 4, e.t === 'frost' ? [0x81d4fa, 0xe1f5fe] : [0x8bc34a, 0xc5e1a5], 2, 0.08, 0.35); break;
      case 'pop': burst(e.x, 0.6, e.y, 10, e.t === 'frost' ? [0x81d4fa, 0xe1f5fe, 0xffffff] : [0xffb300, 0xff7043], 2.5, 0.1, 0.45, e.t === 'frost' ? { glow: 1 } : null); break;
      case 'boom': burst(e.x, 0.4, e.y, 18 + Math.round(e.r * 6), [0xff7043, 0xffb300, 0xffeb3b], 3.4 * Math.max(1, e.r * 0.6), 0.16, 0.5, { glow: 1, g: 3 }); burst(e.x, 0.4, e.y, 10, [0x616161, 0x9e9e9e, 0x424242], 1.6, 0.22, 1.1, { g: -1.2, up: 0.8 }); camState.shake = Math.max(camState.shake, Math.min(0.35, e.r * 0.12)); break;
      case 'die': burst(e.x, 0.6, e.y, 12, [0x8bc34a, 0xaed581, 0x689f38], 2.6, 0.12, 0.6); burst(e.x, 0.5, e.y, 5, 0xeeeeee, 1, 0.18, 0.7, { g: -1, up: 1 }); if (e.g) popups.push({ x: e.x, z: e.y, y: 1.2, text: '+' + e.g + ' 🪙', life: 1.1, color: '#ffd54f' }); break;
      case 'spawn': burst(e.x, 0.3, e.y, 6, [0x4a3b6b, 0x9cff6b], 1.6, 0.1, 0.5, { glow: 1 }); break;
      case 'chop': { const x = (e.i % W) + 0.5, z = ((e.i / W) | 0) + 0.5; burst(x, 0.7, z, 6, e.kind === 'tree' ? [0x8b5a2b, 0x4caf50, 0x6d4c41] : [0x9aa1a8, 0x757575, 0xbdbdbd], 2.2, 0.1, 0.5); if (map) { map.life[e.i] = e.left; rebuild(); } break; }
      case 'tile': if (map) { map.tiles[e.i] = e.t; rebuild(); } burst(e.x, 0.6, e.y, 12, e.got === 'wood' ? [0x8b5a2b, 0x4caf50] : [0x9aa1a8, 0xbdbdbd], 2.4, 0.14, 0.7); popups.push({ x: e.x, z: e.y, y: 1.3, text: '+' + e.n + (e.got === 'wood' ? ' 🪵' : ' 🪨'), life: 1.2, color: '#fff' }); break;
      case 'built': burst(e.t.tx + 0.5, 0.2, e.t.tz + 0.5, 14, [0xd7ccc8, 0xbcaaa4, 0xefebe9], 2, 0.14, 0.6, { up: 0.6 }); break;
      case 'upgraded': burst(e.t.tx + 0.5, 1, e.t.tz + 0.5, 16, [0xffd54f, 0xffecb3], 2.4, 0.1, 0.7, { glow: 1, g: 2 }); popups.push({ x: e.t.tx + 0.5, z: e.t.tz + 0.5, y: 1.6, text: '⭐ Level ' + e.t.lvl, life: 1.3, color: '#ffd54f' }); break;
      case 'wreck': burst(e.x, 0.5, e.y, 18, [0x8b5a2b, 0x9e9e9e, 0x6d4c41], 3, 0.16, 0.8); camState.shake = Math.max(camState.shake, 0.15); break;
      case 'castle': if (Math.random() < 0.6) burst(map.c + 0.5 + rand(-2.4, 2.4), rand(0.4, 1.6), map.c + 0.5 + rand(-2.4, 2.4), 3, [0xbdbdbd, 0x9e9e9e], 1.4, 0.12, 0.5); break;
      case 'spit': flights.push({ kind: 'spit', lob: true, x: e.x, z: e.y, tx: e.tx, tz: e.ty, t: 0, life: Math.hypot(e.tx - e.x, e.ty - e.y) / e.sp, c: 0x9ccc65 }); break;
      case 'splat': burst(e.x, 0.4, e.y, 8, [0x9ccc65, 0xc0ca33], 2, 0.1, 0.4); break;
      case 'block': burst(e.x, 0.7, e.y, 4, [0xffffff, 0xbcaaa4], 2.5, 0.07, 0.25, { glow: 1, g: 0 }); popups.push({ x: e.x, z: e.y, y: 1.3, text: 'Blocked!', life: 0.7, color: '#cfd8dc' }); break;
      case 'immune': popups.push({ x: e.x, z: e.y, y: 1.3, text: 'No effect!', life: 0.7, color: '#ffab91' }); break;
      case 'emerge': burst(e.x, 0.3, e.y, 14, [COL.dirt, COL.dirtDark, 0x6d4c41], 2.6, 0.14, 0.6); break;
      case 'heal': burst(e.x, 1, e.y, 2, [0xb388ff, 0xea80fc], 1, 0.08, 0.5, { glow: 1, g: -1 }); break;
      case 'summon': burst(e.x, 0.6, e.y, 16, [0x9c27b0, 0x4a3b6b, 0x9cff6b], 2.4, 0.14, 0.7, { glow: 1 }); break;
      case 'stomp': burst(e.x, 0.15, e.y, 24, [0xa1887f, 0x8d6e63, 0xd7ccc8], 4.5, 0.18, 0.6, { up: 0.3 }); camState.shake = Math.max(camState.shake, 0.4); break;
      case 'ouch': if (local && e.id === local) camState.shake = Math.max(camState.shake, 0.12); break;
      case 'down': burst(e.x, 0.5, e.y, 10, [0xffffff, 0xffeb3b], 2, 0.1, 0.6, { glow: 1 }); break;
    }
  }
  function stepFx(dt) {
    for (const p of parts) { p.life -= dt; p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.y < 0.12 && p.g > 0) { p.y = 0.12; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; } }
    for (let k = parts.length - 1; k >= 0; k--) if (parts[k].life <= 0) parts.splice(k, 1);
    for (const f of flights) {
      if (f.lob) f.t += dt; else { f.x += f.vx * dt; f.z += f.vz * dt; }
      f.life -= dt;
      if (!f.lob && map) { const t = CC.tileAt(map, f.x, f.z); if (t === CC.T.TREE || t === CC.T.ROCK || t === CC.T.CASTLE) f.life = 0; }
    }
    for (let k = flights.length - 1; k >= 0; k--) if (flights[k].life <= 0) flights.splice(k, 1);
    for (const z of zaps) z.life -= dt;
    for (let k = zaps.length - 1; k >= 0; k--) if (zaps[k].life <= 0) zaps.splice(k, 1);
    for (const p of popups) { p.life -= dt; p.y += dt * 0.8; }
    for (let k = popups.length - 1; k >= 0; k--) if (popups[k].life <= 0) popups.splice(k, 1);
  }

  /* ================= one frame ================= */
  let buildGhost = null;
  function setGhost(g) { buildGhost = g; }   // { type, tx, tz, ok } or null
  function frame(world, dt) {
    if (!R || !map) return;
    time += dt;
    stepFx(dt);
    // the crew, the zombies and the turrets
    begin(dyn); P.identity();
    for (const tu of world.turrets) drawTurret(tu, time);
    for (const p of world.players) drawPlayer(p, time);
    for (const zb of world.zombies) if (!ZLOOK[zb.type].ghost || zb.flags & 1) drawZombie(zb, time);
    // burning zombies smoke and glow
    if (Math.random() < 0.5) for (const zb of world.zombies) if (zb.flags & 4 && Math.random() < 0.25) burst(zb.x, 0.8, zb.z, 1, [0xff7043, 0xffb300], 0.6, 0.08, 0.4, { glow: 1, g: -2 });
    if (Math.random() < 0.3) for (const zb of world.zombies) if (zb.flags & 2 && Math.random() < 0.2) burst(zb.x, 0.9, zb.z, 1, [0xe1f5fe, 0x81d4fa], 0.4, 0.06, 0.5, { glow: 1, g: 0.5 });
    // particles
    P.identity();
    for (const p of parts) if (!p.glow) { const s = p.s * Math.min(1, p.life / p.max * 2); put(p.x - ox, p.y, p.z - oz, s, s, s, p.c); }
    end();
    // ghosts are see-through
    begin(ghostMesh);
    for (const zb of world.zombies) if (ZLOOK[zb.type].ghost && !(zb.flags & 1)) drawZombie(zb, time);
    end();
    begin(glow); P.identity();
    for (const p of parts) if (p.glow) { const s = p.s * Math.min(1, p.life / p.max * 2); put(p.x - ox, p.y, p.z - oz, s, s, s, p.c); }
    for (const f of flights) {
      if (f.lob) {
        const k = Math.min(1, f.t / (f.t + f.life)), x = f.x + (f.tx - f.x) * k, z = f.z + (f.tz - f.z) * k, y = 0.6 + Math.sin(k * Math.PI) * (1 + Math.hypot(f.tx - f.x, f.tz - f.z) * 0.25);
        put(x - ox, y, z - oz, 0.2, 0.2, 0.2, f.c);
      } else {
        const a = Math.atan2(f.vx, f.vz);
        P.makeRotationY(a); P.setPosition(f.x - ox, f.y, f.z - oz);
        const long = f.kind === 'crossbow' || f.kind === 'arrow';
        put(0, 0, 0, long ? 0.05 : 0.1, long ? 0.05 : 0.1, long ? 0.42 : 0.24, f.c);
        P.identity();
      }
    }
    for (const z of zaps) for (let k = 1; k < z.pts.length; k++) bolt(z.pts[k - 1], z.pts[k]);
    // frost towers and the shrine glow softly
    for (const tu of world.turrets) if (tu.type === 'frost' || tu.type === 'shrine' || tu.type === 'tesla') { const c = tu.type === 'frost' ? 0xb3e5fc : tu.type === 'shrine' ? 0xff8fab : 0x80deea; const yy = tu.type === 'tesla' ? 1.4 : 1.05; put(tu.tx + 0.5 - ox, yy + Math.sin(time * 3 + tu.id) * 0.05, tu.tz + 0.5 - oz, 0.12, 0.12, 0.12, c); }
    // the castle flag
    const fx0 = map.c + 0.5 - ox, fz0 = map.c + 0.5 - oz;
    for (let k = 0; k < 5; k++) put(fx0 + 0.12 + k * 0.12, 3.5 + Math.sin(time * 4 + k) * 0.03 * k, fz0, 0.12, 0.35, 0.02, k % 2 ? 0xffc94d : 0xffb300);
    // zombie gates glow
    for (const sp of map.spawns) put(sp.x + 0.5 - ox, 0.3 + Math.sin(time * 2.5 + sp.x) * 0.06, sp.y + 0.5 - oz, 0.5, 0.06, 0.5, 0x9cff6b);
    // the build ghost
    if (buildGhost) {
      const g = buildGhost, c = g.ok ? 0x69f0ae : 0xff5252;
      put(g.tx + 0.5 - ox, 0.2, g.tz + 0.5 - oz, 0.98, 0.04, 0.98, c);
      for (const [a, b] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) put(g.tx + 0.5 - ox + a, 0.5, g.tz + 0.5 - oz + b, 0.08, 0.6, 0.08, c);
      if (g.range) for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; put(g.tx + 0.5 - ox + Math.sin(a) * g.range, 0.18, g.tz + 0.5 - oz + Math.cos(a) * g.range, 0.12, 0.03, 0.12, c); }
    }
    end();
    // the camera follows the local player, a little towards the castle
    const me = world.players.find((p) => p.id === world.local);
    const fx = me ? me.x * 0.78 + (map.c + 0.5) * 0.22 : map.c + 0.5, fz = me ? me.z * 0.78 + (map.c + 0.5) * 0.22 : map.c + 0.5;
    camState.x += (fx - camState.x) * Math.min(1, dt * 4); camState.z += (fz - camState.z) * Math.min(1, dt * 4);
    const portrait = (canvas.clientHeight || 1) > (canvas.clientWidth || 1);
    const dist = (portrait ? 24 : 18.5) * camState.zoom, sh = camState.shake; camState.shake = Math.max(0, sh - dt * 1.2);
    const jx = sh ? (Math.random() - 0.5) * sh : 0, jz = sh ? (Math.random() - 0.5) * sh : 0;
    camera.position.set(camState.x - ox + jx, dist * 0.86, camState.z - oz + dist * 0.52 + jz);
    camera.lookAt(camState.x - ox, 0, camState.z - oz - 0.4);
    // the sea moves gently
    sea.position.y = -0.55 + Math.sin(time * 0.8) * 0.03;
    R.render(scene, camera);
    drawOverlay(world);
    adapt(dt);
  }
  // a lightning bolt: little glowing cubes along a zig-zag
  function bolt(a, b) {
    const n = Math.max(3, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 4));
    for (let k = 0; k <= n; k++) {
      const t = k / n, j = k && k < n ? (Math.random() - 0.5) * 0.3 : 0;
      put(a[0] + (b[0] - a[0]) * t - ox + j, 0.75 + (Math.random() - 0.5) * 0.25, a[1] + (b[1] - a[1]) * t - oz + j, 0.09, 0.09, 0.09, k % 2 ? 0xe0f7fa : 0x4dd0e1);
    }
  }

  /* ================= words and bars over the world (a 2D canvas on top) ================= */
  function toScreen(x, y, z) {
    V.set(x - ox, y, z - oz).project(camera);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    return [(V.x + 1) / 2 * w, (1 - V.y) / 2 * h, V.z < 1];
  }
  function bar(x, y, w, f, col) {
    octx.fillStyle = 'rgba(20,25,40,.55)'; octx.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
    octx.fillStyle = col; octx.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, f)), 4);
  }
  function drawOverlay(world) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    octx.clearRect(0, 0, w, h);
    for (const zb of world.zombies) {
      if (zb.hpPct >= 100 || zb.flags & 1) continue;
      const Z = CC.ZOMBIES[zb.type], [sx, sy, ok] = toScreen(zb.x, 1.25 * (Z.size || 1) + (Z.fly ? 0.3 : 0), zb.z);
      if (ok) bar(sx, sy, Z.boss ? 56 : 26, zb.hpPct / 100, Z.boss ? '#e040fb' : '#ef5350');
    }
    for (const tu of world.turrets) {
      if (tu.hp >= tu.max) continue;
      const [sx, sy, ok] = toScreen(tu.tx + 0.5, 1.5, tu.tz + 0.5);
      if (ok) bar(sx, sy, 26, tu.hp / tu.max, '#ffca28');
    }
    octx.textAlign = 'center';
    for (const p of world.players) {
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
  function zoom(f) { camState.zoom = Math.max(0.65, Math.min(1.5, f)); return camState.zoom; }
  function snapCamera(x, z) { camState.x = x; camState.z = z; }
  function stats() { return { statics: statics ? statics.count : 0, dyn: dyn ? dyn.count : 0, glow: glow ? glow.count : 0, ghosts: ghostMesh ? ghostMesh.count : 0, parts: parts.length, calls: R ? R.info.render.calls : 0, tris: R ? R.info.render.triangles : 0 }; }
  function clearFx() { parts.length = 0; flights.length = 0; zaps.length = 0; popups.length = 0; }

  return { init: init, autoQuality: autoQuality, quality: () => ({ ratio: R ? R.getPixelRatio() : 0, shadows: R ? R.shadowMap.enabled : false, steps: perf.steps }), resize: resize, setMap: setMap, rebuild: rebuild, frame: frame, fx: fx, pick: pick, zoom: zoom, setGhost: setGhost, snapCamera: snapCamera, stats: stats, clearFx: clearFx, CREW: CREW, get camZoom() { return camState.zoom; } };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CCView;
