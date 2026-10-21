// Bedtime and getting up in each coop, with the clock run fast: node bedtrace.mjs [minutes of clock per second of play]
// Prints, every few seconds, how many birds of each coop are out, on their way in or out, and in bed.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const rate = parseFloat(process.argv[2] || '1');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 300, height: 300 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=3&coops=5');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
const out = await p.evaluate((rate) => {
  const f = window.__farm, lines = [], plots = f.plots.filter(pl => pl.nest);
  f.pause(true);
  const run = (from, to) => {
    let h = from, s = 0;
    f.setHour(h); f.step(1 / 30, 30);
    while (h < to) {
      for (let k = 0; k < 30; k++) { h += rate / 60 / 30; f.day.hour = h; f.step(1 / 30, 1); }
      s++;
      if (s % 5 === 0 || h >= to) {
        const st = plots.map(pl => {
          const c = { out: 0, going: 0, bed: 0 };
          for (const bd of pl.birds) bd.asleep ? c.bed++ : bd.roost ? c.going++ : c.out++;
          return `${pl.breed} ${c.out}/${c.going}/${c.bed}`;
        });
        const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
        lines.push(`${hh}:${String(mm).padStart(2, '0')}  ` + st.join('  '));
      }
    }
  };
  run(19.8, 21.0);
  lines.push('--- morning (out/going/in bed)');
  run(6.1, 7.3);
  // nobody stuck on the way: every bird is either out and free, or in bed
  const stuck = plots.flatMap(pl => pl.birds.filter(bd => bd.roost));
  lines.push('still on their way after the morning: ' + stuck.length);
  return lines.join('\n');
}, rate);
console.log(out);
if (errs.length) console.log('ERRORS', errs.join(' | '));
await b.close();
