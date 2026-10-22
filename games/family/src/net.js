/* games/family/src/net.js — Family Fighters' link between devices (the same as Castle Crew's, with its own room names). One device hosts (it runs the game); the others join
   with the host's four-letter room code. Over the internet the devices talk directly (WebRTC data channels), using
   PeerJS and its free public server only to find each other; PeerJS is loaded from the CDN when a crew game starts.
   'local' links the tabs of one browser instead (BroadcastChannel): for testing two players on one computer.
   host(opts, on) / join(code, opts, on): on = { join(id, hello), leave(id), msg(id, data) } for the host,
   { msg(data), lost(why) } for a client. send(data) goes to the host; sendTo(id, data) and broadcast(data) to clients. */
const FFNet = (function () {
  const PEER_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
  const PREFIX = 'familyfighters-v1-';
  const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let mode = '', role = '', code = '', peer = null, bc = null, toHost = null, on = {};
  const links = new Map();   // the host's clients: id -> { send, close }
  const newCode = () => { let c = ''; for (let k = 0; k < 4; k++) c += LETTERS[Math.floor(Math.random() * LETTERS.length)]; return c; };
  const rid = () => Math.random().toString(36).slice(2, 8);
  function loadPeer() {
    if (window.Peer) return Promise.resolve();
    return new Promise((ok, bad) => {
      const s = document.createElement('script');
      s.src = PEER_URL; s.async = true;
      s.onload = () => (window.Peer ? ok() : bad(new Error('peer')));
      s.onerror = () => bad(new Error('offline'));
      document.head.appendChild(s);
    });
  }
  const peerOpts = () => ({ debug: 0, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] } });

  /* ---- hosting ---- */
  async function host(opts, handlers) {
    close();
    on = handlers || {}; role = 'host'; mode = opts && opts.local ? 'local' : 'peer';
    if (mode === 'local') {
      code = (opts && opts.code) || newCode();
      bc = new BroadcastChannel(PREFIX + code);
      bc.onmessage = (e) => {
        const m = e.data;
        if (!m || m.to !== 'host') return;
        if (m.kind === 'hello') {
          const id = m.from;
          links.set(id, { send: (d) => bc && bc.postMessage({ to: id, from: 'host', kind: 'data', data: d }), close: () => bc && bc.postMessage({ to: id, from: 'host', kind: 'bye' }) });
          bc.postMessage({ to: id, from: 'host', kind: 'hi' });
          on.join && on.join(id, m.data || {});
        } else if (m.kind === 'bye') { if (links.delete(m.from)) on.leave && on.leave(m.from); }
        else if (m.kind === 'data' && links.has(m.from)) on.msg && on.msg(m.from, m.data);
      };
      return { code: code };
    }
    await loadPeer();
    for (let tries = 0; tries < 4; tries++) {
      code = (opts && opts.code && tries === 0) ? opts.code : newCode();
      try { peer = await openPeer(PREFIX + code.toLowerCase()); break; } catch (e) { if (e.type !== 'unavailable-id' || tries === 3) throw e; }
    }
    peer.on('connection', (conn) => {
      conn.on('open', () => {
        const id = conn.peer;
        links.set(id, { send: (d) => { try { conn.send(d); } catch (e) { /* closing */ } }, close: () => conn.close() });
      });
      conn.on('data', (d) => {
        const id = conn.peer;
        if (d && d.t === 'hello' && !conn.__hello) { conn.__hello = true; on.join && on.join(id, d); return; }
        on.msg && on.msg(id, d);
      });
      const gone = () => { if (links.delete(conn.peer)) on.leave && on.leave(conn.peer); };
      conn.on('close', gone); conn.on('error', gone);
    });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* gone */ } });
    return { code: code };
  }
  function openPeer(id) {
    return new Promise((ok, bad) => {
      const p = id ? new window.Peer(id, peerOpts()) : new window.Peer(peerOpts());
      const t = setTimeout(() => bad(Object.assign(new Error('timeout'), { type: 'timeout' })), 12000);
      p.on('open', () => { clearTimeout(t); ok(p); });
      p.on('error', (e) => { clearTimeout(t); try { p.destroy(); } catch (x) { /* already */ } bad(e); });
    });
  }

  /* ---- joining ---- */
  async function join(c, opts, handlers) {
    close();
    on = handlers || {}; role = 'client'; mode = opts && opts.local ? 'local' : 'peer'; code = String(c || '').toUpperCase();
    const me = 'c' + rid();
    if (mode === 'local') {
      bc = new BroadcastChannel(PREFIX + code);
      await new Promise((ok, bad) => {
        const t = setTimeout(() => bad(Object.assign(new Error('nohost'), { type: 'nohost' })), 2500);
        bc.onmessage = (e) => {
          const m = e.data;
          if (!m || m.to !== me) return;
          if (m.kind === 'hi') { clearTimeout(t); ok(); }
          else if (m.kind === 'data') on.msg && on.msg(m.data);
          else if (m.kind === 'bye') on.lost && on.lost('host');
        };
        bc.postMessage({ to: 'host', from: me, kind: 'hello', data: opts && opts.hello });
      });
      toHost = { send: (d) => bc && bc.postMessage({ to: 'host', from: me, kind: 'data', data: d }), close: () => bc && bc.postMessage({ to: 'host', from: me, kind: 'bye' }) };
      return { id: me };
    }
    await loadPeer();
    peer = await openPeer(PREFIX + code.toLowerCase() + '-' + rid());
    const conn = peer.connect(PREFIX + code.toLowerCase(), { reliable: true, serialization: 'json' });
    await new Promise((ok, bad) => {
      const t = setTimeout(() => bad(Object.assign(new Error('nohost'), { type: 'nohost' })), 10000);
      conn.on('open', () => { clearTimeout(t); ok(); });
      conn.on('error', (e) => { clearTimeout(t); bad(e); });
      peer.on('error', (e) => { clearTimeout(t); bad(e.type === 'peer-unavailable' ? Object.assign(new Error('nohost'), { type: 'nohost' }) : e); });
    });
    conn.on('data', (d) => on.msg && on.msg(d));
    conn.on('close', () => on.lost && on.lost('host'));
    toHost = { send: (d) => { try { conn.send(d); } catch (e) { /* closing */ } }, close: () => conn.close() };
    toHost.send(Object.assign({ t: 'hello' }, opts && opts.hello));
    return { id: peer.id };
  }

  function send(d) { if (toHost) toHost.send(d); }
  function sendTo(id, d) { const l = links.get(id); if (l) l.send(d); }
  function broadcast(d) { for (const l of links.values()) l.send(d); }
  function drop(id) { const l = links.get(id); if (l) { l.close(); links.delete(id); } }
  function close() {
    try { if (role === 'host') for (const l of links.values()) l.close(); if (toHost) toHost.close(); } catch (e) { /* closing anyway */ }
    links.clear(); toHost = null;
    if (bc) { try { bc.close(); } catch (e) { /* closed */ } bc = null; }
    if (peer) { try { peer.destroy(); } catch (e) { /* closed */ } peer = null; }
    role = ''; mode = ''; code = '';
  }
  return {
    host: host, join: join, send: send, sendTo: sendTo, broadcast: broadcast, drop: drop, close: close, loadPeer: loadPeer,
    get role() { return role; }, get mode() { return mode; }, get code() { return code; }, get count() { return links.size; }, PEER_URL: PEER_URL
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = FFNet;
