/* =====================================================================
   10b. SOUND
   Everything is synthesised in the browser with Web Audio: no sound files to download or license.
   Farm sounds come from what is on screen (louder when zoomed in, panned left/right);
   a gentle generative tune plays underneath. Both can be switched off in Settings.
   ===================================================================== */
const SND = (() => {
  let ac = null, master, fxBus, ambBus, musBus, verb, noiseBuf, windG, rustleG, waterG, waterF;
  const prefs = { fx: true, music: true };
  try { const p = JSON.parse(localStorage.getItem('ff_audio') || '{}'); prefs.fx = p.fx !== false; prefs.music = p.music !== false; } catch (_) {}
  const savePrefs = () => { try { localStorage.setItem('ff_audio', JSON.stringify(prefs)); } catch (_) {} };
  const R = (a, b) => a + Math.random() * (b - a);
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  /* ---------- plumbing ---------- */
  function build(ctx) {
    ac = ctx;
    master = ac.createGain(); master.gain.value = .85;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = .004; comp.release.value = .2;
    master.connect(comp); comp.connect(ac.destination);
    // a soft, airy room shared by everything
    const len = Math.round(ac.sampleRate * 2.4), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    verb = ac.createConvolver(); verb.buffer = ir;
    const verbOut = ac.createGain(); verbOut.gain.value = .32; verb.connect(verbOut); verbOut.connect(master);
    const bus = (v, send) => { const g = ac.createGain(); g.gain.value = v; g.connect(master); const s = ac.createGain(); s.gain.value = send; g.connect(s); s.connect(verb); return g; };
    fxBus = bus(prefs.fx ? 1 : 0, .16); ambBus = bus(prefs.fx ? 1 : 0, .22); musBus = bus(prefs.music ? .5 : 0, .45);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }
  function init() {
    if (ac) { if (ac.state === 'suspended' && !document.hidden) ac.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { build(new AC()); } catch (_) { ac = null; return; }
    beds();
    if (prefs.music) music.start();
  }
  let onOverride = false;
  const on = () => !!ac && (onOverride || ac.state === 'running');
  function gainNode(v) { const g = ac.createGain(); g.gain.value = v; return g; }
  /* output for one sound: pan + volume into a bus; returns the node to connect into */
  function out(pan, vol, bus) {
    const g = gainNode(vol);
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan || 0)); g.connect(p); p.connect(bus || fxBus); }
    else g.connect(bus || fxBus);
    return g;
  }
  function env(param, t, a, peak, d, sustain = 0) {
    param.setValueAtTime(.0001, t); param.exponentialRampToValueAtTime(peak, t + a);
    if (sustain) param.setValueAtTime(peak, t + a + sustain);
    param.exponentialRampToValueAtTime(.0001, t + a + sustain + d);
  }
  function filt(type, f, q) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || .7; return b; }
  function noise(t, dur, dest, rate = 1) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = rate; s.loop = true;
    s.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur + .05); return s;
  }
  function tone(type, f, t, dur, dest) { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(dest); o.start(t); o.stop(t + dur + .05); return o; }

  /* where a map point sits relative to the screen: pan and loudness, or null when it is well off screen */
  function spot(x, y) {
    if (x == null || !view.vw) return null;
    const nx = ((x - view.x) * view.s - view.vw / 2) / (view.vw / 2), ny = ((y - view.y) * view.s - view.vh / 2) / (view.vh / 2);
    const d = Math.hypot(nx, ny * .8), v = Math.max(0, Math.min(1, 1.25 - .5 * d));
    if (v <= .02) return null;
    const zoom = Math.max(.55, Math.min(1.25, .45 + view.s * .75));
    return { pan: Math.max(-.85, Math.min(.85, nx * .7)), vol: v * zoom };
  }

  /* ---------- chickens ---------- */
  // one "buk": a buzzy voice through two throat formants, with a little beak click at the start
  function buk(t, f0, dur, dest, loud, shape) {
    const o = ac.createOscillator(); o.type = 'sawtooth';
    if (shape === 'gawk') {           // the long rising "ba-GAWK" at the end of a cackle
      o.frequency.setValueAtTime(f0 * 1.1, t); o.frequency.exponentialRampToValueAtTime(f0 * 1.75, t + dur * .35); o.frequency.exponentialRampToValueAtTime(f0 * 1.2, t + dur);
    } else {
      o.frequency.setValueAtTime(f0 * 1.3, t); o.frequency.exponentialRampToValueAtTime(f0, t + dur * .3); o.frequency.exponentialRampToValueAtTime(f0 * .78, t + dur);
    }
    const g = ac.createGain(); env(g.gain, t, .008, loud, dur);
    const f1 = filt('bandpass', shape === 'gawk' ? 1150 : 950, 3.5), f2 = filt('bandpass', 2500, 5), g2 = gainNode(.55), lp = filt('lowpass', 4200, .5);
    o.connect(f1); o.connect(f2); f2.connect(g2); f1.connect(g); g2.connect(g); g.connect(lp); lp.connect(dest);
    o.start(t); o.stop(t + dur + .05);
    const c = ac.createGain(); env(c.gain, t, .002, loud * .35, .025); const hp = filt('highpass', 2600, .7);
    noise(t, .04, hp); hp.connect(c); c.connect(dest);
  }
  function hen(x, y, rooster) {
    const s = spot(x, y); if (!s || !on() || !prefs.fx) return;
    const dest = out(s.pan, s.vol * .5), t = ac.currentTime + .02;
    const f0 = rooster ? R(250, 300) : R(360, 450), n = Math.floor(R(2, 5)); let tt = t;
    for (let i = 0; i < n; i++) { buk(tt, f0 * R(.95, 1.06), R(.06, .09), dest, R(.5, .8)); tt += R(.12, .2); }
    if (!rooster && Math.random() < .22) buk(tt + .04, f0, R(.3, .42), dest, .85, 'gawk');
  }
  function peep(x, y) {
    const s = spot(x, y); if (!s || !on() || !prefs.fx) return;
    const dest = out(s.pan, s.vol * .22), n = Math.floor(R(2, 4)); let t = ac.currentTime + .02;
    for (let i = 0; i < n; i++) {
      const f = R(3400, 4100), o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(f * .9, t); o.frequency.exponentialRampToValueAtTime(f * 1.12, t + .03); o.frequency.exponentialRampToValueAtTime(f * .86, t + .1);
      env(g.gain, t, .01, .8, .1); o.connect(g); g.connect(dest); o.start(t); o.stop(t + .15); t += R(.14, .24);
    }
  }
  // cock-a-doodle-doo: one voice gliding through five syllables, raspy, with a wobble on the long last note
  function crow(x, y) {
    const s = spot(x, y); if (!s || !on() || !prefs.fx) return;
    const dest = out(s.pan, s.vol * .42), t = ac.currentTime + .03, k = R(.92, 1.08);
    const syl = [[.1, 470, 560, .04], [.08, 560, 620, .03], [.14, 650, 760, .04], [.6, 800, 560, 0]];
    const o = ac.createOscillator(); o.type = 'sawtooth';
    const o2 = ac.createOscillator(); o2.type = 'square';
    const g = ac.createGain(); g.gain.setValueAtTime(.0001, t);
    let tt = t;
    for (const [d, a, b, gap] of syl) {
      for (const os of [o, o2]) { os.frequency.setValueAtTime(a * k, tt); os.frequency.exponentialRampToValueAtTime(b * k, tt + d * (gap ? 1 : .9)); }
      g.gain.exponentialRampToValueAtTime(.9, tt + .02); g.gain.setValueAtTime(.9, tt + d - .03);
      g.gain.exponentialRampToValueAtTime(gap ? .05 : .0001, tt + d + (gap ? 0 : .12)); tt += d + gap;
    }
    const lfo = ac.createOscillator(), lg = gainNode(14 * k); lfo.frequency.value = 9; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    const mix2 = gainNode(.3); o2.connect(mix2);
    const f1 = filt('bandpass', 1050, 2.5), f2 = filt('bandpass', 2600, 4), g2 = gainNode(.6);
    o.connect(f1); o.connect(f2); mix2.connect(f1); f2.connect(g2); f1.connect(g); g2.connect(g);
    const rasp = ac.createGain(); rasp.gain.value = .25; const rb = filt('bandpass', 2200, 1.2); noise(t, tt - t + .15, rb); rb.connect(rasp); rasp.connect(g);
    g.connect(dest);
    for (const os of [o, o2, lfo]) { os.start(t); os.stop(tt + .2); }
  }

  /* ---------- pond life ---------- */
  function frog(x, y) {
    const s = spot(x, y); if (!s || !on() || !prefs.fx) return;
    const dest = out(s.pan, s.vol * .5); let t = ac.currentTime + .02;
    for (let i = 0; i < 2; i++) {          // "rib-bit": two buzzy pulses
      const d = i ? .12 : .08, o = ac.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(i ? 150 : 130, t); o.frequency.linearRampToValueAtTime(i ? 175 : 140, t + d);
      const am = ac.createGain(); am.gain.value = 0; const lfo = ac.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 38;
      const ld = gainNode(.5); lfo.connect(ld); ld.connect(am.gain); const base = ac.createConstantSource ? ac.createConstantSource() : null;
      if (base) { base.offset.value = .5; base.connect(am.gain); base.start(t); base.stop(t + d + .05); }
      const g = ac.createGain(); env(g.gain, t, .01, .9, d);
      const bp = filt('bandpass', 700, 2), lp = filt('lowpass', 1400, .7);
      o.connect(am); am.connect(bp); bp.connect(lp); lp.connect(g); g.connect(dest);
      o.start(t); o.stop(t + d + .05); lfo.start(t); lfo.stop(t + d + .05); t += d + .05;
    }
  }
  function quack(x, y) {
    const s = spot(x, y); if (!s || !on() || !prefs.fx) return;
    const dest = out(s.pan, s.vol * .38), n = Math.floor(R(1, 4)); let t = ac.currentTime + .02;
    for (let i = 0; i < n; i++) {
      const d = R(.13, .2), o = ac.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(R(280, 320), t); o.frequency.exponentialRampToValueAtTime(R(200, 230), t + d);
      const g = ac.createGain(); env(g.gain, t, .015, .9, d);
      const f1 = filt('bandpass', 1300, 3), f2 = filt('bandpass', 2900, 5), g2 = gainNode(.5);
      o.connect(f1); o.connect(f2); f2.connect(g2); f1.connect(g); g2.connect(g); g.connect(dest);
      const r = filt('bandpass', 1600, 1.5), rg = ac.createGain(); env(rg.gain, t, .015, .25, d); noise(t, d, r); r.connect(rg); rg.connect(dest);
      o.start(t); o.stop(t + d + .05); t += d + R(.06, .14);
    }
  }
  function plop(x, y, big) {
    const s = spot(x, y); if (!s || !on() || !prefs.fx) return;
    const dest = out(s.pan, s.vol * (big ? .5 : .3)), t = ac.currentTime + .01;
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(big ? 380 : 600, t); o.frequency.exponentialRampToValueAtTime(big ? 1100 : 1500, t + .07);
    env(g.gain, t, .004, .8, .08); o.connect(g); g.connect(dest); o.start(t); o.stop(t + .12);
    if (big) { const lp = filt('bandpass', 1300, .8), ng = ac.createGain(); env(ng.gain, t, .005, .5, .35); noise(t, .4, lp); lp.connect(ng); ng.connect(dest); }
  }
  function birdsong() {
    if (!on() || !prefs.fx) return;
    const dest = out(R(-.8, .8), R(.07, .13), ambBus); let t = ac.currentTime + .02;
    const base = R(2600, 4200), n = Math.floor(R(3, 8)), trill = Math.random() < .35;
    for (let i = 0; i < n; i++) {
      const d = R(.05, .14), f = base * R(.8, 1.3), o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < .5 ? R(1.2, 1.5) : R(.65, .85)), t + d);
      if (trill && i === n - 1) { const l = ac.createOscillator(), lg = gainNode(f * .12); l.frequency.value = 28; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + .5); env(g.gain, t, .01, .9, .4); t += .45; }
      else env(g.gain, t, .008, .9, d);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + .6); t += d + R(.03, .12);
    }
  }

  /* ---------- wind and water beds ---------- */
  function beds() {
    const loop = () => { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(); return s; };
    windG = gainNode(0); const wl = filt('lowpass', 420, .4); loop().connect(wl); wl.connect(windG); windG.connect(ambBus);
    rustleG = gainNode(0); const rb = filt('bandpass', 4200, .6); loop().connect(rb); rb.connect(rustleG); rustleG.connect(ambBus);
    waterG = gainNode(0); waterF = filt('bandpass', 950, .9); const wl2 = filt('lowpass', 2600, .6); loop().connect(waterF); waterF.connect(wl2); wl2.connect(waterG); waterG.connect(ambBus);
  }
  let bedT = 0, henT = 2, birdT = 4, duckT = 6;
  function water() {          // closeness of the pond or a stream to the middle of the screen
    let best = 0; const s = spot(GEOM.pond.c[0], GEOM.pond.c[1]); if (s) best = s.vol;
    for (const S of GEOM.streams || []) for (let i = 0; i < S.length; i += 3) { const q = spot(S[i][0], S[i][1]); if (q) best = Math.max(best, q.vol * .8); }
    return best;
  }
  function tick(dt) {
    if (!on()) return;
    bedT -= dt;
    if (bedT <= 0) {
      bedT = .25; const w = wind(clock), now = ac.currentTime;
      windG.gain.setTargetAtTime(.05 + .07 * w, now, .4);
      rustleG.gain.setTargetAtTime(.004 + .014 * w * w, now, .4);
      waterG.gain.setTargetAtTime(.075 * water() * (.75 + .25 * Math.sin(clock * 1.7) * Math.sin(clock * .63)), now, .3);
      waterF.frequency.setTargetAtTime(850 + 250 * Math.sin(clock * 2.3), now, .2);
    }
    if (!prefs.fx) return;
    henT -= dt; birdT -= dt; duckT -= dt;
    if (henT <= 0) {
      const vis = [];
      for (const a of agents.values()) if (a.b && a.sx != null) { const s = spot(a.sx, a.sy); if (s && s.vol > .35) vis.push(a); }
      henT = R(1.6, 4.2) / Math.sqrt(Math.max(1, vis.length / 5));
      if (vis.length) { const a = vis[Math.floor(Math.random() * vis.length)]; if (stage(a.b) === 'chick') peep(a.sx, a.sy); else hen(a.sx, a.sy, a.b.sex === 'r'); }
    }
    if (birdT <= 0) { birdT = R(4, 11); birdsong(); }
    if (duckT <= 0) { duckT = R(6, 16); if (ducks.length) { const d = ducks[Math.floor(Math.random() * ducks.length)]; if (d.st === 'swim') quack(d.x, d.y); } }
  }

  /* ---------- game moments ---------- */
  function ui(fn) { if (!on() || !prefs.fx) return; fn(ac.currentTime + .01); }
  function bell(t, f, d, v, dest) {        // a soft bell: a few inharmonic partials
    for (const [r, a] of [[1, 1], [2.76, .35], [5.4, .12]]) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f * r; env(g.gain, t, .004, v * a, d / r ** .5); o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + .1); }
  }
  function pluck(t, f, d, v, dest) {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), lp = filt('lowpass', Math.min(9000, f * 6), .6);
    o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 2.003;
    const g2 = gainNode(.3); o2.connect(g2); g2.connect(lp); o.connect(lp); lp.connect(g); env(g.gain, t, .006, v, d); g.connect(dest);
    for (const x of [o, o2]) { x.start(t); x.stop(t + d + .1); }
  }
  const eggs = n => ui(t => { const d = out(0, .5); for (let i = 0; i < Math.min(n, 6); i++) { const tt = t + i * .075, f = 520 * Math.pow(1.122, i), o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f, tt); o.frequency.exponentialRampToValueAtTime(f * 1.7, tt + .05); env(g.gain, tt, .004, .7, .1); o.connect(g); g.connect(d); o.start(tt); o.stop(tt + .15); } });
  const coin = () => ui(t => { const d = out(0, .32); bell(t, 1568, .5, .6, d); bell(t + .075, 2093, .7, .7, d); });
  const buy = () => ui(t => { const d = out(0, .26); bell(t, 1319, .35, .6, d); bell(t + .06, 1760, .45, .5, d); });
  const nope = () => ui(t => { const d = out(0, .3); pluck(t, 330, .18, .6, d); pluck(t + .11, 247, .3, .6, d); });
  const tap = () => ui(t => { const d = out(0, .14), o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(1100, t); o.frequency.exponentialRampToValueAtTime(700, t + .03); env(g.gain, t, .002, .6, .04); o.connect(g); g.connect(d); o.start(t); o.stop(t + .08); });
  const feed = () => ui(t => { const d = out(0, .35), bp = filt('bandpass', 3200, .8), g = ac.createGain(); g.gain.setValueAtTime(.0001, t); for (let i = 0; i < 14; i++) { const tt = t + i * .035 + Math.random() * .02; g.gain.setValueAtTime(R(.2, .7), tt); g.gain.setTargetAtTime(.02, tt + .005, .012); } g.gain.setTargetAtTime(.0001, t + .55, .05); noise(t, .7, bp); bp.connect(g); g.connect(d); });
  const levelup = () => ui(t => { const d = out(0, .38); [67, 71, 74, 79].forEach((m, i) => pluck(t + i * .09, mtof(m), .9, .7, d)); [79, 83, 86].forEach((m, i) => bell(t + .4 + i * .05, mtof(m + 12), 1.1, .25, d)); });
  const sparkle = () => ui(t => { const d = out(0, .26); [84, 88, 91, 96].forEach((m, i) => bell(t + i * .07, mtof(m), .8, .4, d)); });
  const hatch = () => { sparkle(); ui(t => { const d = out(.1, .2); for (let i = 0; i < 3; i++) { const tt = t + .25 + i * .17, o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(3600, tt); o.frequency.exponentialRampToValueAtTime(4300, tt + .03); o.frequency.exponentialRampToValueAtTime(3300, tt + .1); env(g.gain, tt, .01, .8, .1); o.connect(g); g.connect(d); o.start(tt); o.stop(tt + .15); } }); };

  /* ---------- music: an unhurried country tune in G that never quite repeats ---------- */
  const CH = { G: [55, 59, 62], Em: [52, 55, 59], C: [48, 52, 55], D: [50, 54, 57], Am: [57, 60, 64], Bm: [50, 54, 59] };
  const PROG = [['G', 'Em', 'C', 'D'], ['G', 'C', 'G', 'D'], ['C', 'G', 'Am', 'D'], ['Em', 'C', 'G', 'D'], ['G', 'Bm', 'C', 'D']];
  const PENTA = [67, 69, 71, 74, 76, 79, 81];
  const ARP = [[0, 1, 2, 1, 3, 2, 1, 2], [0, 2, 1, 2, 3, 2, 1, 0], [0, 1, 2, 3, 2, 1, 2, 1]];
  const music = {
    timer: 0, next: 0, step: 0, prog: PROG[0], arp: ARP[0], mel: false, last: 74,
    start() {
      if (!ac || this.timer) return;
      this.next = ac.currentTime + .15; this.step = 0;
      this.timer = setInterval(() => this.pump(), 110);
    },
    stop() { clearInterval(this.timer); this.timer = 0; },
    pump() {
      if (!on()) return;
      const E = 60 / 78 / 2;                    // an eighth note at 78 beats a minute
      while (this.next < ac.currentTime + .45) { this.play(this.step, this.next, E); this.step++; this.next += E; }
    },
    play(st, t, E) {
      const bar = Math.floor(st / 8), e = st % 8;
      if (bar % 4 === 0 && e === 0) {           // a new phrase: pick the chords, the picking pattern and whether the whistle joins in
        this.prog = PROG[Math.floor(Math.random() * PROG.length)]; this.arp = ARP[Math.floor(Math.random() * ARP.length)]; this.mel = Math.random() < .55;
      }
      const ch = CH[this.prog[bar % 4]], tones = [ch[0], ch[1], ch[2], ch[0] + 12];
      if (e === 0) {
        const b = ac.createOscillator(), bg = ac.createGain(); b.type = 'sine'; b.frequency.value = mtof(ch[0] - 12 - (ch[0] > 53 ? 12 : 0));
        env(bg.gain, t, .02, .55, E * 6); b.connect(bg); bg.connect(musBus); b.start(t); b.stop(t + E * 7);
        for (const m of ch) {                    // a warm pad underneath
          for (const det of [-6, 6]) { const o = ac.createOscillator(), g = ac.createGain(), lp = filt('lowpass', 900, .5); o.type = 'triangle'; o.frequency.value = mtof(m); o.detune.value = det; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.022, t + E * 2); g.gain.linearRampToValueAtTime(.0001, t + E * 8.5); o.connect(lp); lp.connect(g); g.connect(musBus); o.start(t); o.stop(t + E * 9); }
        }
      }
      if (e === 4) { const b = ac.createOscillator(), bg = ac.createGain(); b.type = 'sine'; b.frequency.value = mtof(ch[2] - 24); env(bg.gain, t, .02, .3, E * 3); b.connect(bg); bg.connect(musBus); b.start(t); b.stop(t + E * 4); }
      if (Math.random() > .12) pluck(t + (e % 2 ? E * .06 : 0), mtof(tones[this.arp[e]] + 12), E * 4, e === 0 ? .2 : .13, musBus);
      if (e % 2 === 1) { const hp = filt('highpass', 6500, .7), g = ac.createGain(); env(g.gain, t, .003, e === 3 || e === 7 ? .05 : .025, .05); noise(t, .08, hp); hp.connect(g); g.connect(musBus); }
      if (this.mel && e % 2 === 0 && Math.random() < .42) {     // a soft whistled tune
        let i = PENTA.indexOf(this.last); if (i < 0) i = 3; i = Math.max(0, Math.min(PENTA.length - 1, i + Math.round(R(-2.4, 2.4))));
        const m = PENTA[i]; this.last = m; const d = E * (Math.random() < .5 ? 2 : 3.5);
        const o = ac.createOscillator(), g = ac.createGain(), v = ac.createOscillator(), vg = gainNode(mtof(m) * .012);
        o.type = 'sine'; o.frequency.value = mtof(m); v.frequency.value = 5.2; v.connect(vg); vg.connect(o.frequency);
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.07, t + .06); g.gain.setValueAtTime(.07, t + d * .6); g.gain.exponentialRampToValueAtTime(.0001, t + d);
        o.connect(g); g.connect(musBus); o.start(t); v.start(t); o.stop(t + d + .05); v.stop(t + d + .05);
      }
    },
  };

  function set(k, v) {
    prefs[k] = !!v; savePrefs(); init(); if (!ac) return;
    const now = ac.currentTime;
    if (k === 'fx') { fxBus.gain.setTargetAtTime(v ? 1 : 0, now, .05); ambBus.gain.setTargetAtTime(v ? 1 : 0, now, .05); }
    if (k === 'music') { musBus.gain.setTargetAtTime(v ? .5 : 0, now, .2); if (v) music.start(); else setTimeout(() => { if (!prefs.music) music.stop(); }, 600); }
  }
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend().catch(() => {}); else ac.resume().catch(() => {}); });
  for (const ev of ['pointerdown', 'keydown', 'touchend']) document.addEventListener(ev, init, { passive: true });
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('button')) tap(); }, true);

  // test only: render a sound into an offline buffer (lets the build check every sound is audible and does not clip)
  async function offline(name, secs) {
    const keep = { ac, master, fxBus, ambBus, musBus, verb, noiseBuf };
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const oc = new OAC(2, Math.round(44100 * secs), 44100); build(oc);
    const vSave = { ...view }; Object.assign(view, { vw: 400, vh: 800, s: 1, x: 0, y: 0 });
    const runOn = { hen: () => hen(200, 400), rooster: () => hen(200, 400, true), peep: () => peep(200, 400), crow: () => crow(200, 400), frog: () => frog(200, 400), quack: () => quack(200, 400), plop: () => plop(200, 400, true), bird: birdsong, eggs: () => eggs(4), coin, buy, nope, tap, feed, levelup, hatch, music: () => { for (let i = 0; i < Math.round(secs / (60 / 78 / 2)); i++) music.play(i, i * 60 / 78 / 2 + .05, 60 / 78 / 2); } };
    const realOn = prefs.fx; prefs.fx = true;
    fxBus.gain.value = 1; ambBus.gain.value = 1; musBus.gain.value = .5;
    try { onOverride = true; runOn[name](); } finally { onOverride = false; prefs.fx = realOn; }
    const buf = await oc.startRendering();
    Object.assign(view, vSave); ({ ac, master, fxBus, ambBus, musBus, verb, noiseBuf } = keep);
    return [buf.getChannelData(0), buf.getChannelData(1)];
  }
  return { init, tick, set, prefs, hen, peep, crow, frog, quack, plop, birdsong, eggs, coin, buy, nope, tap, feed, levelup, sparkle, hatch, offline, get ready() { return !!ac; }, get running() { return on(); } };
})();
