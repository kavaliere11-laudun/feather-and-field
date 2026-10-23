// The morning replay of last night's fox visit, as an old silent film (Audrey, 23 Oct 2026: "Old silent film", started
// from a "Last night" button in the morning).
//
// The night is played again with a cast of its own (Rusty, the geese and Biscuit: main.js builds them once, like the
// farm's own, and puts them back to bed before each showing), while the farm's own animals and hens are hidden and paused
// and the light is the night's. A director films it: it cuts from moment to moment, speeds the travelling up (as old
// films did), slows the peck right down, and puts title cards between the scenes, skipping the dull bits behind them.
// The picture goes sepia and flickers, with grain, scratches and a little gate weave; an iris closes on the end, then
// "The End". Skip any time. The texts are in English and French; the hen's and the dog's names are only ever shown as
// text (textContent).
import * as THREE from 'three';

export const REPLAY_TEXT = {
  btn: ['Last night', 'La nuit dernière'],
  skip: ['Skip', 'Passer'],
  open: ['Last night, on the farm…', 'La nuit dernière, à la ferme…'],
  plan: ['{time}. Rusty had a plan.', '{time}. Rusty avait un plan.'],
  sneak: ['Nothing could possibly go wrong.', 'Rien ne pouvait mal tourner.'],
  pecked: ['He had not planned for {hen}.', 'Il n\'avait pas prévu {hen}.'],
  shut: ['The door was shut. He had not planned for that.', 'La porte était fermée. Ça, il ne l\'avait pas prévu.'],
  heard: ['But someone had heard everything…', 'Mais quelqu\'un avait tout entendu…'],
  run: ['Run, Rusty, run!', 'Cours, Rusty, cours !'],
  heroes: ['The heroes of the night.', 'Les héros de la nuit.'],
  hero: ['The hero of the night.', 'Le héros de la nuit.'],
  feather: ['Rusty went home… with a feather on his nose.', 'Rusty est rentré chez lui… avec une plume sur le nez.'],
  empty: ['Rusty went home empty-handed, and very puzzled.', 'Rusty est rentré bredouille, et très perplexe.'],
  end: ['The End', 'Fin'],
  safe: ['Everyone is safe and sound.', 'Tout le monde est sain et sauf.'],
};
const STEP = 1 / 30;                  // the farm's own step
const FPS = 16;                       // a silent film's pictures a second
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class Replay {
  // o: { cast(): { fam, visit, geese, dog } (built once; geese or dog null if the farm hasn't them),
  //      live(on, rec): hide and pause the farm's own (the night's light, the doors as they were) or put it all back,
  //      look(x, z, size): the view, project(v3): [x, y] on screen in px, lang, dogName(),
  //      els: { film, grain, flick, scratches: [el, el], iris, card, title, sub, skip, canvas } }
  constructor(o) {
    Object.assign(this, o);
    this.on = false; this.alarm = false; this.dogAlarm = false; this.seen = []; this.cam = null;
    this.grainFrames = null; this.filmT = 0;
    if (this.els.skip) { this.els.skip.textContent = this.T('skip'); this.els.skip.addEventListener('click', () => this.close()); }
  }
  T(k) {
    const t = REPLAY_TEXT[k]; let s = t ? t[this.lang === 'fr' ? 1 : 0] : k;
    const r = this.rec || {};
    return s.replace('{time}', clock(r.hour || 23.5, this.lang)).replace('{hen}', r.hen || 'the hens').replace('{dog}', this.dogName ? this.dogName() : 'Biscuit');
  }

  // ---- the showing
  start(rec) {
    if (this.on) return false;
    this.rec = rec; this.c = this.cast();
    const c = this.c;
    // the cast back to bed, the visit's coop as it was; a few steps so they're in place
    c.visit.reset(); if (c.geese) c.geese.reset(); if (c.dog) c.dog.reset();
    this.hour = rec.hour; this.alarm = false; this.dogAlarm = false; this.simT = 0; this.acc = 0; this.seen = []; this.cam = null;
    this.live(true, rec);
    for (let i = 0; i < 3; i++) this.sim(STEP);
    this.plot = c.visit.coops().find(p => p.index === rec.coop) || null;
    if (!this.plot) { this.live(false, rec); return false; }
    this.steps = this.plan(); this.i = 0; this.on = true;
    this.els.film.hidden = false; this.els.canvas.classList.add('film');
    this.els.card.classList.remove('on'); this.els.iris.style.background = 'none';
    return true;
  }
  close() {
    if (!this.on) return;
    this.on = false;
    this.els.film.hidden = true; this.els.canvas.classList.remove('film'); this.els.canvas.style.transform = '';
    this.els.card.classList.remove('on');
    const c = this.c; c.visit.reset(); if (c.geese) c.geese.reset(); if (c.dog) c.dog.reset();
    this.live(false, this.rec);
    if (this.onClose) this.onClose();
  }

  // ---- the farm, one step of the night
  sim(dt) {
    const c = this.c, h = this.hour;
    if (c.dog) c.dog.update(dt, h);
    if (c.geese) c.geese.update(dt, h);
    c.fam.update(dt, h);
    c.visit.update(dt, h, {});
    if (c.dog) c.dog.separate();
    this.simT += dt;
  }
  simFor(dt) { this.acc += dt; while (this.acc >= STEP) { this.acc -= STEP; this.sim(STEP); } }
  // on behind a card until `until` (up to `most` seconds of the night at a time)
  skipTo(until, most = 150) { for (let n = 0; n < most / STEP && !until(); n++) this.sim(STEP); }

  // ---- what we see: everyone in `pts` ([x, z] points) in the picture, at least `size` (half the height, in metres). The
  // game's view looks down 42 degrees from the +x +z side: across the screen is (x - z), up it is -(x + z) foreshortened;
  // a phone held upright is narrow, so the width is what counts most
  aim(pts, size, dt, snap) {
    if (!pts.length) return;
    const R = Math.SQRT1_2, SIN = Math.sin(42 * Math.PI / 180), aspect = Math.max(0.3, window.innerWidth / Math.max(1, window.innerHeight));
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (const [x, z] of pts) { const u = (x - z) * R, v = -(x + z) * R * SIN; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const uc = (u0 + u1) / 2, vc = (v0 + v1) / 2 + 0.18;            // (a little above: they stand up from the ground)
    const half = Math.max(size, (v1 - v0) / 2 + 0.75, ((u1 - u0) / 2 + 0.6) / aspect);
    const sum = -vc / (R * SIN), diff = uc / R;                      // x + z, x - z
    const want = [(sum + diff) / 2, (sum - diff) / 2, Math.min(5.5, half)];
    if (!this.cam || snap) this.cam = want.slice();
    else { const k = 1 - Math.exp(-dt * 3.2); for (let i = 0; i < 3; i++) this.cam[i] += (want[i] - this.cam[i]) * k; }
    this.look(this.cam[0], this.cam[1], this.cam[2]);
  }

  // ---- the film's story, from what the farm has: the steps in order
  plan() {
    const c = this.c, V = c.visit, fox = V.fox, rec = this.rec, p = this.plot;
    const dog = c.dog ? c.dog.dog : null, D = c.dog, F = c.geese, G = F ? F.geese[0] : null, guards = !!(F || D);
    const P = o => [o.pos.x, o.pos.z], dist = (o, x, z) => Math.hypot(o.pos.x - x, o.pos.z - z);
    const doorway = c.fam.doorway(fox), G0 = V.nestOf(p), door = V.W(p, G0.pop[0], 0, G0.pop[1] + 0.35);
    const task = () => { const t = fox.task; if (!t) return null; return t.cur ? t.cur() || t : t; };
    const tname = () => { const t = task(); return t ? t.name : ''; };
    const gst = () => F && F.guarding && G.task ? G.task.stage || '' : '';
    const dst = () => D && D.guard ? D.guard.stage : '';
    const near = (o, m) => fox.root.visible && dist(o, fox.pos.x, fox.pos.z) < m;
    const lead = () => dog || G;
    const S = [];
    const card = (key, secs = 2.2, ff = null, sub = null) => S.push({ kind: 'card', key, secs, ff, sub });
    const scene = (name, o) => S.push(Object.assign({ kind: 'scene', name, speed: () => 1, max: 5 }, o));

    card('open', 2.2);
    scene('den', { start: () => { if (!V.start(rec.coop)) this.close(); }, speed: () => 1.25, max: 3.4,
      cam: () => fox.root.visible && dist(fox, doorway[0], doorway[1]) > 0.6 ? [[[fox.pos.x, fox.pos.z], [doorway[0], doorway[1]]], 2.0] : [[[doorway[0], doorway[1]]], 2.0],
      until: () => fox.root.visible && dist(fox, doorway[0], doorway[1]) > 2.2 });
    card('plan', 2.2, () => (V.phase === 'jumpIn' && V.way && fox.root.visible && dist(fox, V.way.take.x, V.way.take.z) < 4.2) || /^(toRamp|climb|atDoor|recoil|again|shutDoor|leave|leaveFor)$/.test(V.phase || '') || !V.active());
    scene('approach', { speed: () => 1.2, max: 5.5, ffTo: true, cam: () => [[P(fox), [door.x, door.z]], 2.2], until: () => /^(poke|scratch)$/.test(tname()) || !V.active() });
    card('sneak', 2.0);
    if (rec.open) {
      // the peck: a sniff, then in slow motion the flurry, the peck on the nose and the leap back; the sneeze as it was
      scene('peck', { max: 14, cam: () => [[P(fox), [door.x, door.z]], 1.55],
        speed: () => { const t = task(), n = t ? t.name : ''; return n === 'poke' ? (t.t > 0.95 ? 0.32 : 1) : n === 'recoil' ? 0.32 : 1; },
        until(s) { const n = tname(); if (n === 'recoil') s.seen = true; return (s.seen && n !== 'recoil' && n !== 'sneeze' && n !== 'poke') || !V.active(); } });
      card('pecked', 2.2);
    } else {
      // (with someone to hear him, the scene ends as he sits back puzzled under his "?", and goes on after the card)
      scene('scratch', { max: 9, ffTo: true, cam: () => [[P(fox), [door.x, door.z]], 1.6],
        until: () => (guards && tname() === 'sit' && task().t > 1.1) || /^(jumpOut|jumpOutFor|trotHome|in)$/.test(V.phase || '') || !V.active() });
      card('shut', 2.4);
    }
    if (guards) {
      scene('puzzled', { max: 1.6, cam: () => [[P(fox)], 1.7] });
      card('heard', 2.0);
      if (F) scene('geese', { start: () => { this.alarm = true; }, max: 2.4, cam: () => [F.geese.map(P), 1.7] });
      if (D) scene('dog', { start: () => { this.dogAlarm = true; this.alarm = true; }, max: 4.2, cam: () => [[P(dog)], 1.8],
        until(s) { if (dst() === 'charge') s.go = (s.go || 0) + 1; return s.go > 12; } });
      scene('race', { speed: () => 1.7, max: 4.5, ffTo: true, cam: () => [[P(lead()), ...(near(lead(), 5) ? [P(fox)] : [])], 2.0], until: () => V.state === 'fleeing' || !V.active() });
      card('run', 1.6);
      scene('chase', { speed: () => 1.9, max: 5, ffTo: true,
        cam: () => [[P(lead()), ...(near(lead(), 6) ? [P(fox)] : []), ...(F ? F.geese.filter(g => dist(g, lead().pos.x, lead().pos.z) < 3.5).map(P) : [])], 2.0],
        until: () => D ? !/^(wake|out|charge|pursue)$/.test(dst()) : !/^(wake|charge|hiss|pursue)$/.test(gst()) });
      if (D) scene('stand', { max: 2.6, cam: () => [[P(dog), ...(near(dog, 6) ? [P(fox)] : [])], 1.9], until: () => dst() !== 'stand' });
      if (F) {
        card('heroes', 2.2, () => /^(victory|lap|tada|home|face)$/.test(gst()) || !F.guarding);
        scene('parade', { max: 8, speed: () => gst() === 'lap' ? 2.1 : 1.1, cam: () => [[...F.geese.map(P), ...(dog && dist(dog, G.pos.x, G.pos.z) < 6 ? [P(dog)] : [])], 1.8],
          until: () => !F.guarding || /^(home|face)$/.test(gst()) });
      } else {
        card('hero', 2.2);
        scene('proud', { max: 2.6, cam: () => [[P(dog)], 1.8] });
      }
    } else {
      if (rec.open) scene('again', { speed: () => 1.5, max: 9, ffTo: true, cam: () => [[P(fox), [door.x, door.z]], 1.8], until: () => /^(jumpOut|trotHome|in)$/.test(V.phase || '') || !V.active() });
      scene('home', { speed: () => 2.2, max: 3.2, cam: () => [[P(fox)], 2.0] });
      card(rec.open ? 'feather' : 'empty', 2.6, () => !V.active() || (fox.root.visible && dist(fox, doorway[0], doorway[1]) < 3.2));
      scene('den', { max: 6, ffTo: true, speed: () => 1.3, cam: () => [[[doorway[0], doorway[1]], ...(fox.root.visible ? [P(fox)] : [])], 1.9], until: () => !V.active() });
    }
    S.push({ kind: 'iris', secs: 1.4 });
    card('end', 2.8, null, 'safe');
    return S;
  }

  // ---- each picture
  update(dt) {
    if (!this.on) return;
    this.film(dt);
    const s = this.steps[this.i];
    if (!s) { this.close(); return; }
    if (!s.begun) {
      s.begun = true; s.t = 0;
      if (s.start) s.start();
      if (!this.on) return;
      if (s.kind === 'card') this.showCard(s.key, s.sub); else this.els.card.classList.remove('on');
      if (s.kind === 'scene') this.snap = true;
    }
    s.t += dt;
    if (s.kind === 'card') {
      // behind the card the night goes on to the next moment worth seeing (a little each picture, so it never stalls)
      let ready = !s.ff || s.ff();
      if (!ready) { s.ffd = (s.ffd || 0) + 8; this.skipTo(s.ff, 8); ready = s.ff() || s.ffd > 160; }
      if (s.t >= s.secs && ready) this.next();
    } else if (s.kind === 'scene') {
      this.simFor(dt * s.speed());
      const [pts, size] = s.cam(); this.aim(pts, size, dt, this.snap); this.snap = false;
      if (s.until && s.until(s)) this.next();
      else if (s.t >= s.max) { if (s.ffTo && s.until) this.skipTo(() => s.until(s)); this.next(); }
    } else if (s.kind === 'iris') {
      this.simFor(dt);
      const W = window.innerWidth, H = window.innerHeight, R = Math.hypot(W, H) * 0.6 * (1 - smooth(0, s.secs, s.t));
      const at = this.focus();
      this.els.iris.style.background = `radial-gradient(circle at ${at[0]}px ${at[1]}px, transparent ${R.toFixed(1)}px, #0b0805 ${(R + 1.5).toFixed(1)}px)`;
      if (s.t >= s.secs) this.next();
    }
  }
  next() { this.i++; }
  focus() {             // the iris closes on whoever the last scene was about (the middle of the picture)
    return [window.innerWidth / 2, window.innerHeight / 2];
  }
  showCard(key, sub) {
    this.seen.push(key);
    this.els.title.textContent = this.T(key);
    this.els.sub.textContent = sub ? this.T(sub) : ''; this.els.sub.hidden = !sub;
    this.els.card.classList.toggle('end', key === 'end');
    this.els.card.classList.add('on');
    if (key === 'end') this.els.iris.style.background = '#0b0805';
  }

  // ---- the old film: grain, flicker, scratches and a little gate weave, at a silent film's pictures a second
  film(dt) {
    this.filmT += dt; if (this.filmT < 1 / FPS - 0.004) return; this.filmT = 0;
    const E = this.els, r = Math.random;
    if (!this.grainFrames && E.grain) {
      const ctx = E.grain.getContext('2d'), w = E.grain.width, h = E.grain.height;
      this.grainFrames = [0, 1, 2, 3].map(() => {
        const im = ctx.createImageData(w, h), d = im.data;
        for (let i = 0; i < d.length; i += 4) {
          const speck = r(), v = speck < 0.5 ? 0 : 255;
          d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = speck < 0.012 || speck > 0.992 ? 150 : r() * 34;
        }
        return im;
      });
    }
    if (this.grainFrames) E.grain.getContext('2d').putImageData(this.grainFrames[Math.floor(r() * 4)], 0, 0);
    E.flick.style.opacity = (r() < 0.12 ? 0.1 : r() * 0.05).toFixed(3);
    E.flick.style.background = r() < 0.2 ? '#140c04' : '#fff4dc';
    for (const sc of E.scratches) {
      const show = r() < 0.32; sc.style.opacity = show ? (0.25 + r() * 0.4).toFixed(2) : '0';
      if (show) sc.style.left = (r() * 100).toFixed(1) + '%';
    }
    const wx = ((r() - 0.5) * 1.6).toFixed(2), wy = ((r() - 0.5) * 1.8).toFixed(2);
    E.canvas.style.transform = `translate(${wx}px, ${wy}px)`; E.card.style.transform = `translate(${wx}px, ${wy}px)`;
  }
}

// the time on the card: "11:41 pm" in English, "23 h 41" in French
function clock(h, lang) {
  const t = ((h % 24) + 24) % 24, hh = Math.floor(t), mm = Math.min(59, Math.floor((t - hh) * 60));
  if (lang === 'fr') return `${hh} h ${String(mm).padStart(2, '0')}`;
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`;
}
export { clock };
