// Prints English Quest lessons as plain text for a human read-through (run from the repo root):
//   node games/quest/build.js && ND_CDP=9402 ND_PROFILE=edge-profile-quest-audit ND_URL=file:///D:/Github/number-dash/games/quest/dist/preview.html ND_READY='!!window.__quest' ND_BOT=none QUEST_AUDIT=4 node games/dash/playtest/shoot.js games/quest/playtest/audit.js > audit.txt
// QUEST_AUDIT picks the stage (default: all). Each line: label | prompt | options (the right one marked *) | explanation.
const stages = process.env.QUEST_AUDIT ? process.env.QUEST_AUDIT.split(',').map(Number) : [1, 2, 3, 4, 5, 6, 7];
const dump = `((stages) => {
  const Q = window.__quest, out = [];
  for (const s of stages) {
    if (!Q.has(s)) { out.push('STAGE ' + s + ': no content'); continue; }
    for (let u = 0; u < 5; u++) {
      const un = Q.CONTENT[s - 1].units[u];
      out.push('', '=== stage ' + s + ' · ' + un.id + ' · ' + un.title);
      out.push('READING: ' + un.reading.title + ' :: ' + un.reading.text.replace(/\\n+/g, ' / '));
      Q.unitLesson(s, u).forEach((q, n) => {
        let line = (n + 1) + '. [' + q.label + '] ';
        if (q.kind === 'choice') line += (q.pic ? q.pic + ' ' : '') + (q.listen ? '(hears: ' + q.listen + ') ' : '') + (q.big || '') + ' ' + (q.text || '') + (q.gap || '') + ' || ' + q.opts.map((o, k) => (k === q.a ? '*' : '') + o).join(' | ') + (q.why ? ' || ' + q.why : '');
        else if (q.kind === 'order') line += (q.listen ? '(hears) ' : '') + q.sentence + '  <- tiles: ' + q.tiles.join(' / ');
        else line += '(hears: ' + q.word + ') ' + (q.pic || q.text) + ' <- tiles: ' + q.tiles.join('');
        out.push(line);
      });
    }
  }
  return out.join('\\n');
})(${JSON.stringify(stages)})`;
module.exports = [
  { sleep: 300 },
  { eval: `(() => { const t = ${dump}; console.log(t); window.__auditText = t; return t.length + ' characters'; })()` },
  { log: 'window.__auditText' }
];
