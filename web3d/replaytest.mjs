// The morning replay of last night's fox visit (replay.js), as the player sees it: the "Last night" button (?replay=N),
// tapped; the film run through picture by picture (16 a second) to "The End"; then the farm put back as it was.
// node replaytest.mjs [cases]   cases: team, teamshut, dog, geese, none, noneshut (default: all); LANG=fr for French
// Checks for each: the button with its words; the title cards in the story's order for that farm (who guards it, the door
// open or shut); the visit itself (pecked or a shut door; Rusty seen off by whoever guards); the film under 75 s; no page
// errors; afterwards the hens, the farm's own animals, the light and the doors as before, the cast hidden, the button gone.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const CASES = {
  team: ['', ['open', 'plan', 'sneak', 'pecked', 'heard', 'run', 'heroes', 'end'], 'team'],
  teamshut: ['&shut', ['open', 'plan', 'sneak', 'shut', 'heard', 'run', 'heroes', 'end'], 'team'],      // (the scratch, the "?", then the card)
  dog: ['&nogeese', ['open', 'plan', 'sneak', 'pecked', 'heard', 'run', 'hero', 'end'], 'dog'],
  geese: ['&nodog', ['open', 'plan', 'sneak', 'pecked', 'heard', 'run', 'heroes', 'end'], 'geese'],
  none: ['&noguard', ['open', 'plan', 'sneak', 'pecked', 'feather', 'end'], 'pecked'],
  noneshut: ['&noguard&shut', ['open', 'plan', 'sneak', 'shut', 'empty', 'end'], 'shut'],
};
const list = (process.argv[2] || Object.keys(CASES).join(',')).split(',');
const coop = process.env.COOP || '3', fr = process.env.LANG === 'fr';
let all = true;
for (const name of list) {
  const [extra, cards, ending] = CASES[name];
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 402, height: 874 }, hasTouch: true, isMobile: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=3&replay=${coop}${extra}` + (fr ? '&lang=fr' : ''), { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
  await p.waitForFunction(() => !document.getElementById('replaybtn').hidden, null, { timeout: 30000 }).catch(() => {});
  const btn = await p.evaluate(() => { const e = document.getElementById('replaybtn'); return { shown: !e.hidden, text: e.textContent }; });
  const before = await p.evaluate(() => {
    const f = window.__farm; f.pause(true);
    return { birds: f.plots.flatMap(pl => pl.birds).filter(x => x.root.visible).length, override: f.day.override, doors: f.plots.filter(pl => pl.door).map(pl => pl.door.s).join(),
      geese: f.geese() ? f.geese().group.visible : null, dog: f.dog() ? f.dog().group.visible : null, foxes: f.foxes().group.visible };
  });
  await p.click('#replaybtn', { timeout: 10000 }).catch(e => errs.push('click: ' + e.message));
  const r = await p.evaluate(() => {
    const f = window.__farm, R = f.replay(), out = { on: R.on, steps: [], cards: [], texts: [], secs: 0, sepia: document.getElementById('farm').classList.contains('film'), hidden: null };
    if (!R.on) return out;
    const c = R.c, V = c.visit; let last = null;
    out.hidden = { birds: f.plots.flatMap(pl => pl.birds).filter(x => x.root.visible).length, override: f.day.override, ui: getComputedStyle(document.querySelector('.top')).display };
    for (let n = 0; n < 16 * 120 && R.on; n++) {
      const s = R.steps[R.i]; const k = s ? (s.kind === 'card' ? 'card:' + s.key : s.kind === 'scene' ? s.name : s.kind) : 'done';
      if (k !== last) { if (out.steps.length) out.steps[out.steps.length - 1] += ' ' + (out.secs - (out.at || 0)).toFixed(1); out.at = out.secs; out.steps.push(k); last = k; if (s && s.kind === 'card' && R.i >= 0) out.texts.push(document.getElementById('film-title').textContent); }
      f.replayTick(1 / 16, 1); out.secs += 1 / 16;
      if (V.pecks) out.pecks = V.pecks;
      if (V.ended) out.ended = V.ended;
      if (V.log.length) out.log = V.log.slice(-5);
    }
    out.cards = R.seen.slice(); out.texts = [...new Set(out.texts)]; out.secs = +out.secs.toFixed(1); out.stillOn = R.on;
    return out;
  });
  const after = await p.evaluate(() => {
    const f = window.__farm, R = f.replay(), c = R.c;
    return { birds: f.plots.flatMap(pl => pl.birds).filter(x => x.root.visible).length, override: f.day.override, doors: f.plots.filter(pl => pl.door).map(pl => pl.door.s).join(),
      geese: f.geese() ? f.geese().group.visible : null, dog: f.dog() ? f.dog().group.visible : null, foxes: f.foxes().group.visible,
      cast: [c.fam.group.visible, c.geese && c.geese.group.visible, c.dog && c.dog.group.visible], film: document.getElementById('film').hidden,
      sepia: document.getElementById('farm').classList.contains('film'), btn: document.getElementById('replaybtn').hidden, ui: getComputedStyle(document.querySelector('.top')).display };
  });
  const want = fr ? '🎞 La nuit dernière' : '🎞 Last night';
  const endOk = ending === 'pecked' ? r.ended === 'pecked' : ending === 'shut' ? r.ended === 'shut' : r.ended === ending;
  const checks = [
    ['no page errors', errs.length === 0, errs.slice(0, 3)],
    ['the button, with its words', btn.shown && btn.text === want, btn],
    ['the film starts: sepia, the farm\'s own hidden, the night\'s light, no buttons', r.on && r.sepia && r.hidden && r.hidden.birds === 0 && r.hidden.override !== undefined && r.hidden.ui === 'none', r.hidden],
    ['the cards in the story\'s order', JSON.stringify(r.cards) === JSON.stringify(cards), r.cards],
    ['the visit as it should go', endOk && (cards.includes('pecked') ? r.pecks > 0 : !r.pecks), [r.ended, r.pecks, r.log]],
    ['to "The End" in under 75 s', !r.stillOn && r.secs < 75, r.secs],
    ['the farm put back as it was', after.birds === before.birds && after.override === before.override && after.doors === before.doors && after.geese === before.geese && after.dog === before.dog && after.foxes === before.foxes, [before, after]],
    ['the film gone, the cast hidden, the button gone', after.film && !after.sepia && after.btn && !after.cast.some(Boolean) && after.ui !== 'none', after],
  ];
  console.log(`${name}${fr ? ' (fr)' : ''}:`, JSON.stringify({ steps: r.steps, texts: r.texts, secs: r.secs }));
  for (const [nm, ok, v] of checks) { all = all && ok; console.log(ok ? 'PASS' : 'FAIL', nm, '·', JSON.stringify(v).slice(0, 400)); }
  await b.close();
}
console.log(all ? 'ALL PASS' : 'SOME FAILED');
