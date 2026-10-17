/* shared/rounded-rect.js — rr(): rounded-rectangle path on any canvas context.
   Inlined at build time into every game that uses it (see build.js). */
function rr(g, x, y, w, h, r) {
  g.beginPath();
  r = Math.min(r, w / 2, h / 2);
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
