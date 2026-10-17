/* shared/arcade-days.js — markPlayed(): notes today's date in localStorage arcade-days.v1 (a small day map
   the arcade home page reads for the daily streak). Every game calls it when it saves. Needs nothing. */
function markPlayed() {
  try {
    const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const days = JSON.parse(localStorage.getItem('arcade-days.v1') || '{}') || {};
    if (days[k]) return;
    days[k] = 1;
    const keys = Object.keys(days).sort();
    while (keys.length > 400) delete days[keys.shift()];
    localStorage.setItem('arcade-days.v1', JSON.stringify(days));
  } catch (e) { /* storage blocked */ }
}
