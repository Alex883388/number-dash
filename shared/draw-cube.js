/* shared/draw-cube.js — cubeFill() and drawCube(): the player cube with its colour and face. Needs rr(), CUBES, FACES.
   Inlined at build time into every game that uses it (see build.js). */
function cubeFill(g, c, s) {
  if (c.fill !== 'rainbow') return c.fill;
  const gr = g.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
  ['#ff9aa8', '#ffc77a', '#ffe68a', '#9fe3be', '#8ccfff', '#b9a3ff'].forEach((col, i) => gr.addColorStop(i / 5, col));
  return gr;
}
function drawCube(g, x, y, s, rot, ci, fi, sq, faceRot) {
  const c = CUBES[ci] || CUBES[0], face = (FACES[fi] || FACES[0]).id, k = sq || 0;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(1 + k * 0.12, 1 - k * 0.12);
  const h = s / 2;
  if (face === 'cat') {
    g.fillStyle = c.fill === 'rainbow' ? '#ff9aa8' : c.fill; g.strokeStyle = c.edge; g.lineWidth = s * 0.06; g.lineJoin = 'round';
    [-1, 1].forEach((d) => { g.beginPath(); g.moveTo(d * s * 0.38, -h + s * 0.12); g.lineTo(d * s * 0.3, -h - s * 0.16); g.lineTo(d * s * 0.1, -h + s * 0.06); g.closePath(); g.fill(); g.stroke(); });
  }
  if (face === 'robot') {
    g.strokeStyle = c.edge; g.lineWidth = s * 0.06; g.beginPath(); g.moveTo(0, -h + s * 0.05); g.lineTo(0, -h - s * 0.14); g.stroke();
    g.fillStyle = '#ff7b86'; g.beginPath(); g.arc(0, -h - s * 0.16, s * 0.07, 0, 6.283); g.fill();
  }
  rr(g, -h + s * 0.04, -h + s * 0.04, s * 0.92, s * 0.92, s * 0.22);
  g.fillStyle = cubeFill(g, c, s); g.fill();
  g.lineWidth = s * 0.065; g.strokeStyle = c.edge; g.stroke();
  rr(g, -h + s * 0.15, -h + s * 0.13, s * 0.32, s * 0.11, s * 0.055); g.fillStyle = 'rgba(255,255,255,.45)'; g.fill();
  if (faceRot !== undefined) g.rotate(faceRot - rot);
  const ink = '#2b3658';
  const eye = (ex, ey) => { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ex, ey, s * 0.12, 0, 6.283); g.fill(); g.fillStyle = ink; g.beginPath(); g.arc(ex + s * 0.02, ey + s * 0.015, s * 0.062, 0, 6.283); g.fill(); };
  const smile = (w) => { g.strokeStyle = ink; g.lineWidth = s * 0.06; g.lineCap = 'round'; g.beginPath(); g.arc(0, s * 0.08, s * w, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke(); g.lineCap = 'butt'; };
  const cheeks = () => { g.fillStyle = 'rgba(255,120,150,.35)'; g.beginPath(); g.arc(-s * 0.28, s * 0.13, s * 0.065, 0, 6.283); g.arc(s * 0.28, s * 0.13, s * 0.065, 0, 6.283); g.fill(); };
  if (face === 'happy') { eye(-s * 0.17, -s * 0.06); eye(s * 0.17, -s * 0.06); smile(0.17); cheeks(); }
  else if (face === 'wink') {
    eye(-s * 0.17, -s * 0.06);
    g.strokeStyle = ink; g.lineWidth = s * 0.055; g.lineCap = 'round'; g.beginPath(); g.arc(s * 0.17, -s * 0.03, s * 0.08, 1.1 * Math.PI, 1.9 * Math.PI); g.stroke(); g.lineCap = 'butt';
    smile(0.16); cheeks();
  } else if (face === 'cool') {
    g.fillStyle = ink; rr(g, -s * 0.34, -s * 0.15, s * 0.3, s * 0.17, s * 0.06); g.fill(); rr(g, s * 0.04, -s * 0.15, s * 0.3, s * 0.17, s * 0.06); g.fill();
    g.fillRect(-s * 0.06, -s * 0.11, s * 0.12, s * 0.04);
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-s * 0.3, -s * 0.12, s * 0.08, s * 0.035); g.fillRect(s * 0.08, -s * 0.12, s * 0.08, s * 0.035);
    smile(0.13);
  } else if (face === 'cat') {
    eye(-s * 0.17, -s * 0.06); eye(s * 0.17, -s * 0.06);
    g.strokeStyle = ink; g.lineWidth = s * 0.045; g.lineCap = 'round';
    g.beginPath(); g.arc(-s * 0.06, s * 0.1, s * 0.06, 0.1 * Math.PI, 0.9 * Math.PI); g.arc(s * 0.06, s * 0.1, s * 0.06, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
    g.beginPath(); g.moveTo(-s * 0.42, s * 0.06); g.lineTo(-s * 0.26, s * 0.09); g.moveTo(s * 0.42, s * 0.06); g.lineTo(s * 0.26, s * 0.09); g.stroke(); g.lineCap = 'butt';
  } else if (face === 'robot') {
    g.fillStyle = '#e9fbff'; rr(g, -s * 0.3, -s * 0.16, s * 0.22, s * 0.18, s * 0.04); g.fill(); rr(g, s * 0.08, -s * 0.16, s * 0.22, s * 0.18, s * 0.04); g.fill();
    g.fillStyle = '#3fb5d8'; g.fillRect(-s * 0.23, -s * 0.12, s * 0.08, s * 0.1); g.fillRect(s * 0.15, -s * 0.12, s * 0.08, s * 0.1);
    g.fillStyle = ink; rr(g, -s * 0.18, s * 0.12, s * 0.36, s * 0.1, s * 0.03); g.fill();
    g.fillStyle = '#e9fbff'; for (let i = 0; i < 3; i++) g.fillRect(-s * 0.13 + i * s * 0.1, s * 0.14, s * 0.05, s * 0.06);
  }
  g.restore();
}
