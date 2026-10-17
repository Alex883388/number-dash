// Headless Edge playtest driver (CDP over Node's WebSocket).
// Opens dist/preview.html directly (or ND_URL, e.g. http://localhost:5517/ from serve.js).
// ND_SERVE=docs serves that folder on http://localhost:5599/ from this process (needed for the offline worker).
// Usage: node playtest/shoot.js playtest/scenarios/<name>.js   — the scenario exports an array of steps:
//   { viewport: [w, h, mobile?, dark?, scale?] } | { eval: 'js' } | { waitFor: 'js expr', timeout } | { sleep: ms } | { shot: 'name' } | { log: 'js expr' }
//   { touch: [x, y, holdMs] } (a finger press in CSS pixels) | { touchEl: 'css selector' } (a finger tap on that element's middle) | { ipad: true } (iPad Safari identity + touch screen) | { offline: bool } | { reload: true }
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const { pathToFileURL } = require('url');
let URL0 = process.env.ND_URL || pathToFileURL(path.join(__dirname, '..', 'dist', 'preview.html')).href;
const PORT = 9341;
if (process.env.ND_SERVE) {
  const root = path.resolve(__dirname, '..', process.env.ND_SERVE);
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
  http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    const f = path.join(root, u.endsWith('/') ? u + 'index.html' : u);
    if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(buf);
    });
  }).listen(5599, '127.0.0.1');
  URL0 = 'http://localhost:5599/' + (process.env.ND_PATH || '');
}
const dir = __dirname, shots = path.join(dir, 'shots');
fs.mkdirSync(shots, { recursive: true });
const steps = require(path.resolve(process.argv[2]));
// ND_READY: expression that is true once the game has loaded; ND_BOT=none skips the Number Dash autopilot
const READY = process.env.ND_READY || '!!(window.ND && window.__nd)';
const BOT = process.env.ND_BOT === 'none' ? '' : fs.readFileSync(path.join(dir, 'bot.js'), 'utf8');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const prof = path.join(dir, 'edge-profile');
  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + prof, '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
  let ws, id = 0;
  const pending = new Map();
  try {
    let tgt = null;
    for (let i = 0; i < 50 && !tgt; i++) {
      try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${URL0}`, { method: 'PUT' }); tgt = await r.json(); } catch (e) { await sleep(200); }
    }
    ws = new WebSocket(tgt.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener('open', r));
    ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } });
    const send = (method, params) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
    const evaluate = async (expr) => {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.result && r.result.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 400));
      return r.result && r.result.result ? r.result.result.value : undefined;
    };
    await send('Page.enable'); await send('Runtime.enable');
    let vp = [1280, 720, false, false];
    const applyVp = async () => {
      await send('Emulation.setDeviceMetricsOverride', { width: vp[0], height: vp[1], deviceScaleFactor: vp[4] || 1, mobile: !!vp[2] });
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: vp[3] ? 'dark' : 'light' }] });
    };
    await applyVp();
    const load = async () => {
      await send('Page.navigate', { url: URL0 });
      for (let i = 0; i < 100; i++) { if (await evaluate(READY)) break; await sleep(150); }
      if (!(await evaluate(READY))) throw new Error('game did not load at ' + URL0 + ' (' + (await evaluate('location.href')) + ')');
      await sleep(400);
      if (BOT) await evaluate(BOT);
      else await evaluate("window.__errs = window.__errs || []; window.addEventListener('error', (e) => window.__errs.push(String(e.message))); window.addEventListener('blur', (e) => e.stopImmediatePropagation(), true); window.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true); 'ok'");
    };
    await load();
    for (const s of steps) {
      if (s.viewport) { vp = s.viewport; await applyVp(); await sleep(300); }
      else if (s.reload) await load();
      else if (s.ipad) {
        await send('Network.enable');
        await send('Network.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', platform: 'iPad' });
        await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
        await send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
      } else if (s.touch || s.touchEl) {
        let [x, y, hold] = s.touch || [0, 0, 60];
        if (s.touchEl) {
          const c = await evaluate('(() => { const e = document.querySelector(' + JSON.stringify(s.touchEl) + '); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()');
          if (!c) throw new Error('touchEl not found: ' + s.touchEl);
          [x, y] = c;
          console.log('  finger on ' + s.touchEl + ' at ' + c.map(Math.round).join(','));
        }
        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
        await sleep(hold || 60);
        await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else if (s.offline !== undefined) {
        await send('Network.enable');
        await send('Network.emulateNetworkConditions', { offline: !!s.offline, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      }
      else if (s.eval) { const v = await evaluate(s.eval); if (v !== undefined) console.log('  eval ->', JSON.stringify(v)); }
      else if (s.log) console.log('  ' + s.log + ' =', JSON.stringify(await evaluate(s.log)));
      else if (s.sleep) await sleep(s.sleep);
      else if (s.waitFor) {
        const t0 = Date.now(); let ok = false;
        while (Date.now() - t0 < (s.timeout || 60000)) { if (await evaluate(s.waitFor)) { ok = true; break; } await sleep(100); }
        console.log((ok ? '  ok   ' : '  TIMEOUT ') + s.waitFor + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
      } else if (s.shot) {
        const r = await send('Page.captureScreenshot', { format: 'png' });
        const f = path.join(shots, s.shot + '.png');
        fs.writeFileSync(f, Buffer.from(r.result.data, 'base64'));
        console.log('  shot ' + f);
      }
    }
    const errs = await evaluate('JSON.stringify(window.__errs || [])');
    console.log('page errors:', errs);
    await send('Browser.close').catch(() => {});
  } catch (e) {
    console.error('FAILED', e);
  } finally {
    try { ws && ws.close(); } catch (e) { /* ignore */ }
    setTimeout(() => { try { edge.kill(); } catch (e) { /* ignore */ } process.exit(0); }, 500);
  }
})();
