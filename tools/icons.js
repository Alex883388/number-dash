// Draws the app icon (the smiling cube on a sky with a spike) in headless Edge and saves
// the PNG sizes the site needs. Usage: node tools/icons.js
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9352, OUT = path.join(__dirname, '..', 'web');
fs.mkdirSync(OUT, { recursive: true });

const DRAW = `(() => {
  function icon(n) {
    const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), u = n / 100;
    const sky = g.createLinearGradient(0, 0, 0, n); sky.addColorStop(0, '#8fd1fb'); sky.addColorStop(1, '#e4f5ff');
    g.fillStyle = sky; g.fillRect(0, 0, n, n);
    g.fillStyle = '#fff1b8'; g.beginPath(); g.arc(78 * u, 22 * u, 11 * u, 0, 6.283); g.fill();
    g.fillStyle = '#ffffff'; [[20, 24, 9], [29, 21, 11], [38, 25, 8]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x * u, y * u, r * u, 0, 6.283); g.fill(); });
    g.fillStyle = '#7cc6a5'; g.fillRect(0, 78 * u, n, 22 * u); g.fillStyle = '#abe6c9'; g.fillRect(0, 78 * u, n, 4 * u);
    g.fillStyle = '#ff7b86'; g.strokeStyle = '#d9566a'; g.lineWidth = 1.6 * u; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(68 * u, 78 * u); g.lineTo(77 * u, 59 * u); g.lineTo(86 * u, 78 * u); g.closePath(); g.fill(); g.stroke();
    const x = 18 * u, y = 40 * u, s = 38 * u, rr = 9 * u;
    g.beginPath(); g.moveTo(x + rr, y); g.arcTo(x + s, y, x + s, y + s, rr); g.arcTo(x + s, y + s, x, y + s, rr); g.arcTo(x, y + s, x, y, rr); g.arcTo(x, y, x + s, y, rr); g.closePath();
    g.fillStyle = '#5cb8ff'; g.fill(); g.lineWidth = 2.6 * u; g.strokeStyle = '#3a8fd6'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x + 6 * u, y + 5 * u, 12 * u, 4 * u);
    const ink = '#2b3658';
    [[x + 12 * u], [x + 26 * u]].forEach(([ex]) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, y + 17 * u, 4.6 * u, 0, 6.283); g.fill(); g.fillStyle = ink; g.beginPath(); g.arc(ex + 0.8 * u, y + 17.6 * u, 2.4 * u, 0, 6.283); g.fill(); });
    g.strokeStyle = ink; g.lineWidth = 2.4 * u; g.lineCap = 'round'; g.beginPath(); g.arc(x + 19 * u, y + 22 * u, 7 * u, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke();
    g.fillStyle = 'rgba(255,120,150,.35)'; g.beginPath(); g.arc(x + 8 * u, y + 25 * u, 2.6 * u, 0, 6.283); g.arc(x + 30 * u, y + 25 * u, 2.6 * u, 0, 6.283); g.fill();
    g.fillStyle = '#fff3d6'; g.strokeStyle = '#f0b544'; g.lineWidth = 2 * u;
    g.beginPath(); g.moveTo(62 * u, 36 * u); g.arcTo(70 * u, 36 * u, 70 * u, 50 * u, 4 * u); g.arcTo(70 * u, 50 * u, 54 * u, 50 * u, 4 * u); g.arcTo(54 * u, 50 * u, 54 * u, 36 * u, 4 * u); g.arcTo(54 * u, 36 * u, 70 * u, 36 * u, 4 * u); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#3a3f6b'; g.font = '700 ' + 11 * u + 'px Arial Rounded MT Bold, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('\\u00d7', 62 * u, 43.5 * u);
    return c.toDataURL('image/png');
  }
  return { a180: icon(180), a192: icon(192), a512: icon(512) };
})()`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT, '--user-data-dir=' + path.join(__dirname, '..', 'playtest', 'edge-profile-icons'), 'about:blank'], { stdio: 'ignore' });
  try {
    let tgt = null;
    for (let i = 0; i < 50 && !tgt; i++) { try { tgt = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json(); } catch (e) { await sleep(200); } }
    const ws = new WebSocket(tgt.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener('open', r));
    const res = await new Promise((r) => { ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id === 1) r(d); }); ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: DRAW, returnByValue: true } })); });
    const v = res.result.result.value;
    for (const [k, file] of [['a180', 'icon-180.png'], ['a192', 'icon-192.png'], ['a512', 'icon-512.png']]) {
      fs.writeFileSync(path.join(OUT, file), Buffer.from(v[k].split(',')[1], 'base64'));
      console.log('wrote web/' + file);
    }
    ws.close();
  } finally { edge.kill(); }
})();
