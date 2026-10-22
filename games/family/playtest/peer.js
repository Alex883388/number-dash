// Family Fighters over the internet link: two separate headless Edge browsers (two "devices") play together through
// PeerJS (its public server introduces them; the game then flows directly between them). Run from the repo root:
//   node games/family/build.js && node games/family/playtest/peer.js
// FF_URL=https://alex883388.github.io/number-dash/family/ runs the same against the live site (with its offline cache).
// Checks: the host gets a room code from the PeerJS server; the second browser joins with it; the game starts on
// both; the friend's walking reaches the host; with both autopilots on, the friend's punches beat zombies on the host
// and both see the same zombies; then the friend leaves.
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const DIST = path.join(__dirname, '..', 'dist'), HTTP = 5652, shots = path.join(__dirname, '..', '..', 'dash', 'playtest', 'shots');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const problems = [];
const check = (ok, tag) => { console.log((ok ? 'ok   ' : 'FAIL ') + tag); if (!ok) problems.push(tag); };

// the game's dist folder over http (WebRTC wants a proper origin)
http.createServer((req, res) => {
  const f = path.join(DIST, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/preview.html'));
  fs.readFile(f, (err, buf) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); res.end(buf); });
}).listen(HTTP, '127.0.0.1');

async function browser(port, name) {
  // a fresh profile each run, so nothing cached from an earlier run gets in the way
  const prof = path.join(__dirname, '..', '..', 'dash', 'playtest', 'edge-profile-ff-' + name + '-' + Date.now());
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--remote-debugging-port=' + port, '--user-data-dir=' + prof,
    '--disable-features=WebRtcHideLocalIpsWithMdns', '--window-size=1180,820', 'about:blank'], { stdio: 'ignore' });
  let list = null;
  for (let k = 0; k < 60 && !list; k++) { await sleep(250); try { list = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json(); } catch (e) { list = null; } }
  const page = list.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok) => ws.addEventListener('open', ok));
  let id = 0;
  const waiting = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } });
  const send = (method, params) => new Promise((ok) => { const k = ++id; waiting.set(k, ok); ws.send(JSON.stringify({ id: k, method: method, params: params || {} })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result && r.result.exceptionDetails) throw new Error(name + ': ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result && r.result.result ? r.result.result.value : undefined; };
  const until = async (expr, ms, what) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 30000)) { try { if (await ev(expr)) return true; } catch (e) { /* page loading */ } await sleep(250); } throw new Error(name + ': timeout waiting for ' + (what || expr)); };
  const shot = async (file) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(shots, file + '.png'), Buffer.from(r.result.data, 'base64')); };
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1180, height: 820, deviceScaleFactor: 1, mobile: false });
  return { proc: proc, prof: prof, ev: ev, until: until, shot: shot, send: send, go: (url) => send('Page.navigate', { url: url }) };
}

(async () => {
  const A = await browser(9563, 'peer-a'), B = await browser(9564, 'peer-b');
  const F = 'window.__family';
  try {
    for (const [X, name, hero] of [[A, 'Hosty', 'dad'], [B, 'Buddy', 'bo']]) {
      await X.go(process.env.FF_URL || 'http://localhost:' + HTTP + '/preview.html');
      await X.until('!!window.__family', 30000, 'the game');
      await X.ev("localStorage.setItem('family-fighters.v1', JSON.stringify({ v: 1, name: '" + name + "', hero: '" + hero + "', settings: { quality: 'low' } })); location.reload(); 'ok'");
      await sleep(800);
      await X.until('!!window.__family', 30000, 'the game again');
      await X.ev("window.__errs = []; window.addEventListener('error', (e) => window.__errs.push(String(e.message))); 'errs'");
    }
    const t0 = Date.now();
    await A.ev(F + '.hostCrew(false)');
    await A.until(F + ".G.role === 'host' && " + F + '.G.code.length === 4', 30000, 'a room code from the PeerJS server');
    const code = await A.ev(F + '.G.code');
    check(/^[A-Z]{4}$/.test(code), 'the host got room code ' + code + ' in ' + (Date.now() - t0) + ' ms');
    const t1 = Date.now();
    await B.ev(F + ".joinCrew('" + code + "', false)");
    await A.until(F + '.G.crew.length === 2', 30000, 'the friend to join');
    check(true, 'the friend joined over WebRTC in ' + (Date.now() - t1) + ' ms');
    await B.until("!document.getElementById('s-lobby').hidden", 10000, 'the friend lobby');
    check((await A.ev(F + '.G.crew[1].hero')) === 'bo', 'the friend came as Bơ');
    await A.ev("document.getElementById('lobbyStart').click(); 'start'");
    await A.until(F + ".G.mode === 'host'", 40000, 'the host place');
    await B.until(F + ".G.mode === 'client'", 40000, 'the friend place');
    check(true, 'the place started on both');
    await sleep(1500);
    const x0 = await A.ev(F + ".G.S.players.find((p) => p.id !== 'host').x");
    await B.ev(F + '.T.mx = 1; 1'); await sleep(1000); await B.ev(F + '.T.mx = 0; 0'); await sleep(600);
    const x1 = await A.ev(F + ".G.S.players.find((p) => p.id !== 'host').x");
    check(x1 > x0 + 100, 'the host saw the friend walk (' + x0.toFixed(0) + ' to ' + x1.toFixed(0) + ')');
    await A.ev(F + '.auto(); 1'); await B.ev(F + '.auto(); 1');
    await A.until(F + ".G.S.players.find((p) => p.id !== 'host').stats.kills >= 2", 90000, 'the friend to beat zombies on the host');
    check(true, 'the friend beat zombies on the host: ' + (await A.ev(F + ".G.S.players.find((p) => p.id !== 'host').stats.kills")));
    await sleep(800);
    const zs = [await A.ev(F + '.G.S.zs.length'), await B.ev(F + '.G.S.zs.length')];
    check(Math.abs(zs[0] - zs[1]) <= 2, 'both see the zombies: host ' + zs[0] + ', friend ' + zs[1]);
    await A.shot('ff-n01-peer-host'); await B.shot('ff-n02-peer-friend');
    const errs = [await A.ev('JSON.stringify(window.__errs || [])'), await B.ev('JSON.stringify(window.__errs || [])')];
    check(errs.every((e) => e === '[]' || e === undefined), 'no page errors ' + errs.join(' '));
    await B.ev("document.getElementById('pauseBtn').click(); document.getElementById('quitBtn').click(); 'left'");
    await A.until(F + '.G.crew.length === 1', 15000, 'the friend to leave');
    check(true, 'the friend left and the host crew is one again');
  } catch (e) {
    console.log('FAIL ' + e.message);
    problems.push(e.message);
  } finally {
    A.proc.kill(); B.proc.kill();
    setTimeout(() => { for (const X of [A, B]) { try { fs.rmSync(X.prof, { recursive: true, force: true }); } catch (e) { /* still locked */ } } }, 1500);
    console.log(problems.length ? 'FAIL: ' + problems.length + ' problems' : 'PASS: two browsers played together over the internet link');
    setTimeout(() => process.exit(problems.length ? 1 : 0), 2500);
  }
})();
