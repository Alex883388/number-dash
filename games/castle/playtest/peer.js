// Castle Crew over the internet link: two separate headless Edge browsers (two "devices") play together through
// PeerJS (its public server introduces them; the game then flows directly between them). Run from the repo root:
//   node games/castle/build.js && node games/castle/playtest/peer.js
// Checks: the host gets a room code from the PeerJS server; the second browser joins with it; the level starts on
// both; the friend's moves reach the host; both ready up and the friend sees the wave's zombies; then both leave.
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const DIST = path.join(__dirname, '..', 'dist'), HTTP = 5650, shots = path.join(__dirname, '..', '..', 'dash', 'playtest', 'shots');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const problems = [];
const check = (ok, tag) => { console.log((ok ? 'ok   ' : 'FAIL ') + tag); if (!ok) problems.push(tag); };

// the game's dist folder over http (WebRTC wants a proper origin)
http.createServer((req, res) => {
  const f = path.join(DIST, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/preview.html'));
  fs.readFile(f, (err, buf) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); res.end(buf); });
}).listen(HTTP, '127.0.0.1');

async function browser(port, name) {
  const prof = path.join(__dirname, '..', '..', 'dash', 'playtest', 'edge-profile-' + name);
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
  return { proc: proc, ev: ev, until: until, shot: shot, send: send, go: (url) => send('Page.navigate', { url: url }) };
}

(async () => {
  const A = await browser(9561, 'peer-a'), B = await browser(9562, 'peer-b');
  try {
    for (const [X, name] of [[A, 'Hosty'], [B, 'Buddy']]) {
      await X.go('http://localhost:' + HTTP + '/preview.html');
      await X.until('!!window.__castle', 30000, 'the game');
      await X.ev("localStorage.setItem('castle-crew.v1', JSON.stringify({ v: 1, levels: {}, name: '" + name + "', settings: { auto: true, quality: 'low' } })); location.reload(); 'ok'");
      await sleep(800);
      await X.until('!!window.__castle', 30000, 'the game again');
    }
    const t0 = Date.now();
    await A.ev('window.__castle.host(false)');
    await A.until("window.__castle.state().lobby === 'host' && window.__castle.state().code.length === 4", 30000, 'a room code from the PeerJS server');
    const code = await A.ev('window.__castle.state().code');
    check(/^[A-Z]{4}$/.test(code), 'the host got room code ' + code + ' in ' + (Date.now() - t0) + ' ms');
    const t1 = Date.now();
    await B.ev("window.__castle.join('" + code + "', false)");
    await A.until('window.__castle.state().crew === 2', 30000, 'the friend to join');
    check(true, 'the friend joined over WebRTC in ' + (Date.now() - t1) + ' ms');
    await B.until("window.__castle.state().lobby === 'client'", 10000, 'the friend lobby');
    await A.ev('window.__castle.startCrew()');
    await A.until("window.__castle.state().mode === 'host'", 40000, 'the host level');
    await B.until("window.__castle.state().mode === 'client'", 40000, 'the friend level');
    check(true, 'level 1 started on both');
    await sleep(1500);
    const x0 = await A.ev("window.__castle.G.s.players.find((p) => p.id !== 'host').x");
    await B.ev('window.__castle.move(-1, 0)'); await sleep(900); await B.ev('window.__castle.move(0, 0)'); await sleep(500);
    const x1 = await A.ev("window.__castle.G.s.players.find((p) => p.id !== 'host').x");
    check(x1 < x0 - 1.2, 'the host saw the friend walk west (' + x0.toFixed(1) + ' to ' + x1.toFixed(1) + ')');
    await A.ev('window.__castle.readyUp()'); await B.ev('window.__castle.readyUp()');
    await A.until("window.__castle.state().wave[1] === 'fight'", 10000, 'the wave');
    await A.until('window.__castle.state().zombies >= 2', 30000, 'zombies on the host');
    await B.until('window.__castle.state().zombies >= 2', 10000, 'zombies on the friend');
    check(true, 'the friend sees the zombies: ' + (await B.ev('window.__castle.state().zombies')) + ' (host ' + (await A.ev('window.__castle.state().zombies')) + ')');
    await A.shot('cc-n01-peer-host'); await B.shot('cc-n02-peer-friend');
    const errs = [await A.ev('JSON.stringify(window.__errs || [])'), await B.ev('JSON.stringify(window.__errs || [])')];
    check(errs.every((e) => e === '[]' || e === undefined), 'no page errors ' + errs.join(' '));
    await B.ev("document.getElementById('pauseBtn').click(); document.getElementById('quitBtn').click(); 'left'");
    await A.until('window.__castle.state().crew === 1', 15000, 'the friend to leave');
    check(true, 'the friend left and the host crew is one again');
  } catch (e) {
    console.log('FAIL ' + e.message);
    problems.push(e.message);
  } finally {
    A.proc.kill(); B.proc.kill();
    console.log(problems.length ? 'FAIL: ' + problems.length + ' problems' : 'PASS: two browsers played together over the internet link');
    process.exit(problems.length ? 1 : 0);
  }
})();
