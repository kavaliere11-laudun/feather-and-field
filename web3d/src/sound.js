// The game's sound (release 7; Audrey, 28 Oct: real recordings only, no made-up sounds; the music "Now and then"; her two
// tracks, 2 and 4 of the preview: Komiku's "Champ de tournesol" and Rafael Krux's "Happy Whistling Ukulele", both CC0,
// audio/CREDITS.txt). The music comes now and then: a track, then a few quiet minutes of just the farm, then the other one;
// softer of an evening, none at night (a track still playing when night falls fades away). A phone only lets a page make
// sound after a tap, so it all waits for the first one (any tap on the farm); a phone on silent keeps the game silent too, as
// other games do (the page's audio session is "ambient": it also plays alongside the phone's own music or a podcast instead
// of stopping it). Put away (another app, the phone locked), it stops, and picks up again on coming back.
// The music streams from its file through one <audio> element (a whole track decoded would take ~45 MB of the phone's
// memory), fed into Web Audio for its volume (a phone ignores an <audio>'s own volume).
// The hens chatting (Audrey, 29 Oct, on her own hen with her voice taken out: "The version 2 is good. The background noises
// are natural"): her hens' real moments from her three videos (audio/hens/hen1-7.mp3, 1 to 14 s each: her clucks with the
// garden's own air, birds and insects), one after another with little pauses, from the coop nearest the middle of the view
// while its birds are up: louder as the view comes close, softer zoomed out, from its side of the screen (left or right).
// The farm's own sounds (Audrey, 29 Oct, on twelve real recordings from BigSoundBank, CC0: "All good, put them in";
// audio/farm/, farm.json, cut by the source's audio/farm_clips.py): a hen's egg song as she sings it, the rooster's crow,
// the henhouse in a flurry when the fox looks in, a mummy hen talking to her chicks and the chicks peeping (among the
// hens' chatting, at a coop with a brood), the ducks' quacks, Biscuit's woof, each from where it happens (play: as loud
// as the view is near, from its side of the screen); and under it all the time of day (dawn's birds, the day's crickets
// and birds, the evening's last birds, the night's insects, crossfading by the hour) and the pond's frogs near the pond.
// The beds are decoded at 22 kHz (half the memory: about 4 MB each). The geese honk and a bee buzzes past the hives: the US
// National Park Service's recordings (public domain), once Audrey allowed www.nps.gov (29 Oct).

const smooth = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export const MUSIC = ['champ-de-tournesol', 'happy-whistling-ukulele'];
export const MUSIC_TIMES = {
  first: [3, 6],              // after the first tap, seconds before the first track starts
  gap: [150, 300],             // after a track, seconds of just the farm before the next (2½ to 5 minutes)
  level: 0.42,                 // the music's own volume (the farm's sounds will sit above it)
  fade: 2.5,                   // seconds to fade in
};
// how loud the music is by the hour: full by day, softer of an evening, softest through the night
// (12 Nov 2026, Audrey: "at night the chickens and birds noise need to stop. Just the music should stay": the music goes
// on through the night, soft; it used to stop)
export function musicLevel(h) {
  if (h >= 21.5 || h < 6) return 0.35;
  if (h < 7) return 0.35 + 0.65 * smooth((h - 6) / 0.5);
  if (h < 19) return 1;
  return 0.6 - 0.25 * smooth((h - 20.5) / 1);            // (19:00-21:30: softer, and softer still towards night)
}

// the farm's birds by the hour (the hens' chatter, the birdsong under it all, crows, egg songs, ducks, the peacock): 1 by day,
// fading out from 19:30 to 20:00, none through the night, back from 6:00 to 6:30 (the pond's water and frogs stay; so do the
// sounds of Rusty's visit: the flurry in the coop, Biscuit's bark, the geese's honks)
export function birdsLevel(h) { return h >= 20 || h < 6 ? 0 : h >= 19.5 ? 1 - smooth((h - 19.5) / 0.5) : h < 6.5 ? smooth((h - 6) / 0.5) : 1; }
const NIGHT_KINDS = ['flurry', 'bark', 'honk'];
export const HENS = {
  files: 7,                    // audio/hens/hen1.mp3 ... hen7.mp3
  level: 1.8,                  // close to a coop (her recordings are quiet: -30 to -34 LUFS; the music sits a little under)
  first: [1.5, 4],             // after the first tap, seconds before the hens are heard
  gap: [1.5, 6],               // seconds between one moment and the next
};

export const FARM = {
  // each one-shot's volume close up (the files: -17 to -24 LUFS); a bed's volume (the files: -22 LUFS)
  level: { egg: 0.6, crow: 0.55, flurry: 0.7, mum: 0.75, chicks: 0.8, quack: 0.5, bark: 0.5, honk: 0.5, buzz: 0.5, peacall: 0.5 },
  spotGap: { buzz: [2.5, 7] },     // seconds between one and the next, at a place (o.spots)
  beds: ['dawn', 'day', 'evening', 'night'], bedLevel: 0.28, pondLevel: 0.6,
};
// the time of day's bed by the hour: night, dawn from 5 (full 6 to 8:30), day from 8:30 (full 9:30 to 18), evening from 18
// (full 19 to 21), night from 21 (full from 22)
export function bedMix(h) {
  const m = { dawn: 0, day: 0, evening: 0, night: 0 }, x = (a, b) => smooth((h - a) / (b - a));
  if (h < 5 || h >= 22) m.night = 1;
  else if (h < 6) { m.dawn = x(5, 6); m.night = 1 - m.dawn; }
  else if (h < 8.5) m.dawn = 1;
  else if (h < 9.5) { m.day = x(8.5, 9.5); m.dawn = 1 - m.day; }
  else if (h < 18) m.day = 1;
  else if (h < 19) { m.evening = x(18, 19); m.day = 1 - m.evening; }
  else if (h < 21) m.evening = 1;
  else { m.night = x(21, 22); m.evening = 1 - m.night; }
  return m;
}
const groupOf = n => n.replace(/\d+$/, '');
// a sound file's bytes. Inside the phone app a file of the app's own can answer with status 0 though it's all there
// (12 Nov 2026, Audrey's sound test: "farm 0/41 · hens 0/7 · peacall3: 0": every recording refused for its status,
// the music heard only because the phone's own player fetched it), and some answer fetch with nothing: so a status of 0
// is taken, and with no bytes from fetch the file is asked for the older way
let PENDING = 0;      // (sound files being fetched and unpacked now: Sound.decoding)
function bytes(url) { PENDING++; setTimeout(() => { PENDING = Math.max(0, PENDING - 1); }, 6000); return bytes0(url); }
function bytes0(url) {
  const xhr = () => new Promise((res, rej) => { const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = 'arraybuffer'; x.onload = () => (x.response && x.response.byteLength ? res(x.response) : rej(new Error('empty ' + x.status))); x.onerror = () => rej(new Error('xhr ' + x.status)); x.send(); });
  return fetch(url).then(r => { if (!r.ok && r.status !== 0) throw new Error('status ' + r.status); return r.arrayBuffer(); }).then(ab => { if (!ab || !ab.byteLength) throw new Error('no bytes'); return ab; }).catch(() => xhr());
}

export class Sound {
  // o.base: where the files are (e.g. 'audio/'); o.hour(): the farm's hour; o.music(), o.sounds(): whether the player wants
  // the music, the farm's sounds; o.hens(): the coop to hear the hens from ({near: 0-1, pan: -1 left to 1 right}, or null);
  // o.off: never (the tests, unless they ask)
  constructor(o) {
    this.o = o; this.ctx = null; this.state = 'idle'; this.track = Math.random() < 0.5 ? 0 : 1; this.nextAt = Infinity;
    this.hen = { bufs: [], loading: false, src: null, g: null, pan: null, nextAt: Infinity, last: [], played: 0, near: 0, lev: HENS.level, kind: '' };
    this.farm = { groups: {}, meta: null, loading: false, beds: {}, last: {}, played: {} };
    this.el = null; this.gain = null; this.blocked = false; this.hidden = false; this.log = [];
    this.mus = { bufs: [null, null], src: null, t0: 0, way: '' };      // (the music as decoded sound, 12 Nov 2026: see start)
    if (o.off) return;
    const tap = () => this.unlock();
    for (const ev of ['touchend', 'pointerup', 'click', 'keydown']) window.addEventListener(ev, tap, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => this.visible(!document.hidden));
    this.timer = setInterval(() => this.tick(), 500);
  }
  now() { return performance.now() / 1000; }
  // the first tap (and every tap after, in case the phone stopped the sound meanwhile): the sound wakes
  unlock() {
    if (this.o.off) return;
    try {
      if (!this.ctx) {
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* (older phones: their own way) */ }      // (heard with the ring switch on silent too, 11 Nov 2026: Audrey, her volume up, three times: "No sounds"; it was 'ambient')
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
        this.gain = this.ctx.createGain(); this.gain.gain.value = 0; this.gain.connect(this.master);
        try { if (navigator.mediaSession) { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; } } catch (e) { /* */ }
        this.fx = this.ctx.createGain(); this.fx.connect(this.master);            // (the farm's own sounds)
        this.loadHens(); this.loadFarm(); const hf = HENS.first; this.hen.nextAt = this.now() + hf[0] + Math.random() * (hf[1] - hf[0]);
        const a = MUSIC_TIMES.first; this.nextAt = this.now() + a[0] + Math.random() * (a[1] - a[0]);
        this.note('unlocked');
      }
      if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
      if (this.blocked && this.state === 'playing' && this.el && this.el.paused) this.playEl();
    } catch (e) { this.note('no sound: ' + e.message); }
  }
  src(i) { return (this.o.base || 'audio/') + MUSIC[i] + '.mp3'; }
  decoding() { return PENDING > 0 || this.state === 'loading'; }      // (busy unpacking recordings: the picture's slow frames meanwhile aren't the farm's fault, main.js)
  note(s) { this.log.push([Math.round(this.now()), s]); if (this.log.length > 30) this.log.shift(); }
  playEl() {
    const p = this.el.play(); this.blocked = false;
    if (p && p.catch) p.catch(e => { if (e && e.name === 'NotAllowedError') { this.blocked = true; this.note('waiting for a tap'); } });      // (the next tap tries again: unlock)
  }
  ramp(to, secs) {
    if (!this.gain) return;
    const g = this.gain.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(to, t + Math.max(0.05, secs));
  }
  level() { return MUSIC_TIMES.level * musicLevel(this.o.hour()); }
  // The music is played as decoded sound, like the farm's sounds, not by an <audio> player (12 Nov 2026, Audrey, a
  // "Feather & Field" player with a play button on her lock screen: "Not sure that's needed": a phone shows that card for
  // whatever an <audio> plays). The track is fetched and decoded when it's wanted (at 32 kHz: a third less memory), played,
  // then let go. Only if it can't be decoded is the <audio> player made after all (the music rather than none).
  loadMusic(i) {
    if (this.mus.bufs[i]) return Promise.resolve(this.mus.bufs[i]);
    let slow = null; try { if (window.OfflineAudioContext) slow = new OfflineAudioContext(2, 1, 32000); } catch (e) { /* (at the page's own rate) */ }
    const decode = (ab, c) => new Promise((res, rej) => { const p = c.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
    return bytes(this.src(i))
      .then(ab => slow ? decode(ab.slice(0), slow).catch(() => decode(ab, this.ctx)) : decode(ab, this.ctx))
      .then(b => { this.mus.bufs = [null, null]; this.mus.bufs[i] = b; return b; });      // (one track kept at a time)
  }
  ensureEl() {
    if (this.el) return;
    this.el = new Audio(); this.el.preload = 'auto'; this.el.setAttribute('playsinline', '');
    this.ctx.createMediaElementSource(this.el).connect(this.gain);
    this.el.addEventListener('ended', () => { if (this.mus.way === 'el') this.ended(); });
  }
  stopSrc() { const S = this.mus.src; this.mus.src = null; if (S) { S.onended = null; try { S.stop(); } catch (e) { /* */ } try { S.disconnect(); } catch (e) { /* */ } } }
  pos() { return this.mus.way === 'buf' ? (this.mus.src ? this.ctx.currentTime - this.mus.t0 : 0) : this.el ? this.el.currentTime : 0; }
  start() {
    const i = this.track; this.gain.gain.value = 0; this.state = 'loading'; this.stopSrc();
    this.loadMusic(i).then(buf => {
      if (this.state !== 'loading' || this.track !== i) return;
      const S = this.ctx.createBufferSource(); S.buffer = buf; S.connect(this.gain); S.onended = () => { if (this.mus.src === S) { this.mus.src = null; this.ended(); } };
      this.mus.src = S; this.mus.way = 'buf'; this.mus.t0 = this.ctx.currentTime; S.start();
      this.state = 'playing'; this.target = this.level(); this.ramp(this.target, MUSIC_TIMES.fade);
      this.note('play ' + MUSIC[i]);
    }).catch(e => {      // (not decoded: the <audio> player after all)
      if (this.state !== 'loading' || this.track !== i) return;
      this.note('music by player: ' + (e && e.message));
      this.ensureEl(); this.mus.way = 'el'; this.el.src = this.src(i);
      this.state = 'playing'; this.playEl(); this.target = this.level(); this.ramp(this.target, MUSIC_TIMES.fade);
    });
  }
  ended() {
    if (this.state !== 'playing') return;
    this.state = 'idle'; this.track = 1 - this.track;
    const g = MUSIC_TIMES.gap; this.nextAt = this.now() + g[0] + Math.random() * (g[1] - g[0]);
    this.note('ended; next in ' + Math.round(this.nextAt - this.now()) + ' s');
  }
  // stopped (the music switched off, or night): it fades, then rests; switched on again, a track comes soon
  stop(secs, why) {
    if (this.state === 'loading') { this.state = 'idle'; this.track = 1 - this.track; return; }
    if (this.state !== 'playing') return;
    this.state = 'fading'; this.ramp(0, secs); this.note('fade: ' + why);
    clearTimeout(this.fadeT); this.fadeT = setTimeout(() => { if (this.state === 'fading') { this.stopSrc(); if (this.el) this.el.pause(); this.state = 'idle'; this.track = 1 - this.track; } }, secs * 1000 + 100);
  }
  tick() {
    if (!this.ctx || this.hidden) return;
    this.tickHens(); this.tickBeds(); this.tickSpots();
    const lv = this.level(), on = !!this.o.music();
    if (this.state === 'playing') {
      if (!on) { this.stop(0.8, 'switched off'); return; }
      if (lv <= 0) { this.stop(8, 'night'); this.nextAt = this.now() + 60; return; }
      if (this.pos() > MUSIC_TIMES.fade && Math.abs(lv - this.target) > 0.01) { this.target = lv; this.ramp(lv, 4); }      // (evening coming on: softer, slowly)
    } else if (this.state === 'idle' && on && this.now() >= this.nextAt) {
      if (lv > 0) this.start(); else this.nextAt = this.now() + 60;              // (night: looked at again in a minute)
    }
  }
  // ---- the hens chatting
  loadHens() {
    if (this.hen.loading) return; this.hen.loading = true;
    const decode = ab => new Promise((res, rej) => { const p = this.ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });      // (older Safari: callbacks only)
    for (let i = 0; i < HENS.files; i++) {
      bytes((this.o.base || 'audio/') + 'hens/hen' + (i + 1) + '.mp3')
        .then(decode).then(b => { this.hen.bufs[i] = b; }).catch(e => this.note('hen ' + (i + 1) + ': ' + (e && e.message)));
    }
  }
  tickHens() {
    const H = this.hen, t = this.ctx.currentTime, q = birdsLevel(this.o.hour()), on = (!this.o.sounds || !!this.o.sounds()) && q > 0;
    const src0 = on && this.o.hens ? this.o.hens() : null, src = src0 ? { ...src0, near: src0.near * q } : null; H.near = src ? src.near : 0;
    if (H.src) {                                    // one playing: it follows the view (or fades, switched off or the birds gone in)
      H.g.gain.setTargetAtTime(on ? H.lev * H.near : 0, t, on ? 0.35 : 0.08);
      if (H.pan && src) H.pan.pan.setTargetAtTime(src.pan, t, 0.35);
      if (!on && !H.stopping) { H.stopping = true; try { H.src.stop(t + 0.4); } catch (e) { /* */ } }
      return;
    }
    if (!on || this.now() < H.nextAt) return;
    if (!src || src.near < 0.04) { H.nextAt = this.now() + 1.5; return; }       // (no coop near enough, or the birds in bed)
    // at a coop with a brood, a mummy hen talking to her chicks now and then, and the chicks peeping (once they're out)
    const r = Math.random(), F = this.farm.groups, kind = src.brood === 'chicks' ? (r < 0.3 && F.mum ? 'mum' : r < 0.65 && F.chicks ? 'chicks' : 'hen') : src.brood === 'sitting' && r < 0.4 && F.mum ? 'mum' : 'hen';
    let buf, lev;
    if (kind === 'hen') {
      const ready = H.bufs.map((b, i) => b ? i : -1).filter(i => i >= 0); if (!ready.length) { H.nextAt = this.now() + 1; return; }
      const fresh = ready.filter(i => !H.last.includes(i)), pick = (fresh.length ? fresh : ready)[Math.floor(Math.random() * (fresh.length || ready.length))];
      H.last.push(pick); if (H.last.length > Math.min(3, ready.length - 1)) H.last.shift();
      buf = H.bufs[pick]; lev = HENS.level; H.which = pick + 1;
    } else { buf = this.pick(kind); lev = FARM.level[kind]; H.which = kind; }
    if (!buf) { H.nextAt = this.now() + 1; return; }
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(lev * src.near, t, 0.12);
    let pan = null; if (this.ctx.createStereoPanner) { pan = this.ctx.createStereoPanner(); pan.pan.value = src.pan; }
    s.connect(g); if (pan) { g.connect(pan); pan.connect(this.fx); } else g.connect(this.fx);
    Object.assign(H, { src: s, g, pan, stopping: false, lev, kind }); H.played++;
    s.onended = () => { if (H.src !== s) return; H.src = null; try { g.disconnect(); } catch (e) { /* */ } const gp = HENS.gap; H.nextAt = this.now() + gp[0] + Math.random() * (gp[1] - gp[0]); };
    s.start();
  }
  soundsChanged() { if (this.ctx) { this.tickHens(); this.tickBeds(); } }
  // ---- the farm's sounds (audio/farm/farm.json): one-shots in groups (crow1, crow2 ... the 'crow' group), and the beds
  loadFarm() {
    const F = this.farm; if (F.loading) return; F.loading = true;
    const base = (this.o.base || 'audio/') + 'farm/';
    let slow = null; try { if (window.OfflineAudioContext) slow = new OfflineAudioContext(1, 1, 22050); } catch (e) { /* (decoded at the page's own rate) */ }
    const decode = (ab, c) => new Promise((res, rej) => { const p = c.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
    fetch(base + 'farm.json').then(r => r.json()).then(meta => {
      F.meta = meta;
      for (const [name, m] of Object.entries(meta)) {
        bytes(base + name + '.mp3')
          .then(ab => m.bed && slow ? decode(ab.slice(0), slow).catch(() => decode(ab, this.ctx)) : decode(ab, this.ctx))      // (a copy for the slower decoder: decoding empties the bytes it's given, and the fallback needs them)
          .then(b => { if (m.bed) F.beds[name] = { buf: b, src: null, g: null }; else (F.groups[groupOf(name)] = F.groups[groupOf(name)] || []).push(b); })
          .catch(e => this.note(name + ': ' + (e && e.message)));
      }
    }).catch(e => this.note('farm: ' + (e && e.message)));
  }
  pick(group) {
    const L = this.farm.groups[group]; if (!L || !L.length) return null;
    let i = Math.floor(Math.random() * L.length); if (L.length > 1 && i === this.farm.last[group]) i = (i + 1) % L.length;
    this.farm.last[group] = i; return L[i];
  }
  // a one-shot from where it happens (at: {near 0-1, pan -1 to 1}, from main.js heardAt); kind: a group ('crow', 'egg_diva')
  play(kind, at, level) {
    if (this.ctx && !this.hidden && this.ctx.state !== 'running') { try { this.ctx.resume().catch(() => {}); } catch (e) { /* */ } }      // (asleep, after a call or the app put away: woken for the next one)
    if (!this.ctx || this.hidden || this.ctx.state !== 'running' || (this.o.sounds && !this.o.sounds()) || !at || at.near < 0.02) return null;
    const q = NIGHT_KINDS.includes(groupOf(kind).replace(/_.*/, '')) ? 1 : birdsLevel(this.o.hour()); if (q < 0.05) return null;      // (the birds quiet at night)
    const buf = this.pick(kind); if (!buf) return null;
    const lev = (level ?? FARM.level[groupOf(kind).replace(/_.*/, '')] ?? 0.5) * at.near * q;
    const s = this.ctx.createBufferSource(); s.buffer = buf; const g = this.ctx.createGain(); g.gain.value = lev;
    let pan = null; if (this.ctx.createStereoPanner) { pan = this.ctx.createStereoPanner(); pan.pan.value = at.pan || 0; }
    s.connect(g); if (pan) { g.connect(pan); pan.connect(this.fx); } else g.connect(this.fx);
    s.onended = () => { try { g.disconnect(); } catch (e) { /* */ } };
    s.start(); this.farm.played[kind] = (this.farm.played[kind] || 0) + 1; this.farm.lastPlayed = { kind, gain: +lev.toFixed(3) };
    return s;
  }
  // places heard now and then (o.spots(): [{kind, near, pan}]): the nearest of each kind, every few seconds
  tickSpots() {
    if (!this.o.spots) return; const F = this.farm, now = this.now(); F.spotAt = F.spotAt || {};
    const best = {}; for (const s of this.o.spots() || []) if (!best[s.kind] || s.near > best[s.kind].near) best[s.kind] = s;
    for (const [kind, at] of Object.entries(best)) {
      if (now < (F.spotAt[kind] || 0) || at.near < 0.05) continue;
      if (this.play(kind, at)) { const g = FARM.spotGap[kind] || [4, 10]; F.spotAt[kind] = now + g[0] + Math.random() * (g[1] - g[0]); }
    }
  }
  // the beds: each loops from the start (silent until it's its hour), the time of day's crossfading, the pond's by how near
  tickBeds() {
    const F = this.farm, t = this.ctx.currentTime, on = !this.o.sounds || !!this.o.sounds(), mix = bedMix(this.o.hour()), q = birdsLevel(this.o.hour());
    const pond = on && this.o.pond ? this.o.pond() : null;
    for (const [name, B] of Object.entries(F.beds)) {
      if (!B.src) {
        B.src = this.ctx.createBufferSource(); B.src.buffer = B.buf; B.src.loop = true; B.g = this.ctx.createGain(); B.g.gain.value = 0;
        B.src.connect(B.g); B.g.connect(this.fx); B.src.start(0, Math.random() * B.buf.duration * 0.8);
      }
      const want = !on ? 0 : name === 'pond' ? FARM.pondLevel * (pond ? pond.near : 0) : FARM.bedLevel * (mix[name] || 0) * q;
      B.g.gain.setTargetAtTime(want, t, on ? 1.2 : 0.15); B.want = want;
    }
  }
  // the music switch (gameui settings): off fades it now; on brings a track in a few seconds
  musicChanged() { if (!this.ctx) return; if (this.o.music()) { if (this.state !== 'playing') this.nextAt = this.now() + 1.5; } else this.stop(0.8, 'switched off'); }
  // put away (another app, the phone locked): quiet; back: the music picks up where it was (a phone may want a tap first)
  visible(on) {
    this.hidden = !on;
    if (!this.ctx) return;
    if (!on) { if (this.state === 'playing' && this.mus.way === 'el' && this.el) { this.el.pause(); this.pausedPlaying = true; } this.ctx.suspend().catch(() => {}); return; }      // (decoded music stops and goes on with the engine)
    this.ctx.resume().catch(() => {});
    if (this.pausedPlaying) { this.pausedPlaying = false; if (this.state === 'playing') this.playEl(); }
  }
  // Settings' "Test the sound": two notes straight to the speaker (no recording needed), whatever the Music and Sounds
  // switches say; what state the sound is in ('running': they play; else it's still waking: tap again)
  test() {
    this.unlock(); if (!this.ctx) return 'none';
    try { this.ctx.resume().catch(() => {}); } catch (e) { /* */ }
    try {
      const t0 = this.ctx.currentTime + 0.05;
      [[660, 0], [880, 0.22]].forEach(([f, d]) => { const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.25, t0 + d + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.3); o.connect(g); g.connect(this.ctx.destination); o.start(t0 + d); o.stop(t0 + d + 0.32); });
      // (then one of the farm's own recordings, a crow or a cluck, and one of her hens' clips, straight to the speaker: 12 Nov
      // 2026, Audrey: "The sound works but I only have the music not chicken noise or anything")
      const one = (buf, at, lev) => { if (!buf) return; const sN = this.ctx.createBufferSource(), g = this.ctx.createGain(); sN.buffer = buf; g.gain.value = lev; sN.connect(g); g.connect(this.ctx.destination); sN.start(t0 + at, 0, Math.min(buf.duration, 3)); };
      const G = this.farm.groups, any = (G.crow && G.crow[0]) || (G.egg && G.egg[0]) || Object.values(G).map(L => L[0]).find(Boolean);
      one(any, 0.7, 0.8); one(this.hen.bufs.find(Boolean), 2.2, 0.9);
    } catch (e) { this.note('test: ' + e.message); return 'error'; }
    return this.ctx.state;
  }
  // a little rising chime (a bird's new star): three soft notes, made here (no recording); not with the sounds switched off
  chime() {
    if (!this.ctx || this.hidden || this.ctx.state !== 'running' || (this.o.sounds && !this.o.sounds())) return false;
    const t0 = this.ctx.currentTime + 0.03;
    [[784, 0], [988, 0.13], [1319, 0.26]].forEach(([f, d]) => { const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.16, t0 + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.55); o.connect(g); g.connect(this.fx); o.start(t0 + d); o.stop(t0 + d + 0.6); });
    return true;
  }
  // what the sound has to play with, in a line (Settings shows it under the test, for telling Claude)
  diag() {
    if (!this.ctx) return 'no engine';
    const F = this.farm, shots = Object.values(F.groups).reduce((a, L) => a + L.length, 0), beds = Object.keys(F.beds).length, all = F.meta ? Object.keys(F.meta).length : 0;
    return [this.ctx.state, Math.round(this.ctx.sampleRate / 1000) + 'k', 'farm ' + (shots + beds) + '/' + all, 'beds ' + beds, 'hens ' + this.hen.bufs.filter(Boolean).length + '/' + HENS.files, 'music ' + (this.mus.way || '-'), 'played ' + (this.hen.played || 0) + '+' + Object.values(F.played || {}).reduce((a, n) => a + n, 0), this.hidden ? 'hidden' : 'shown', this.log.slice(-3).join(' | ')].join(' · ');
  }
  info() {
    return { unlocked: !!this.ctx, ctx: this.ctx && this.ctx.state, state: this.state, track: MUSIC[this.track], gain: this.gain ? +this.gain.gain.value.toFixed(3) : 0,
      at: +this.pos().toFixed(1), way: this.mus.way, ready: this.mus.way === 'buf' ? 4 : this.el ? this.el.readyState : 0, err: this.el && this.el.error ? this.el.error.code : 0, paused: this.mus.way === 'buf' ? !this.mus.src || this.ctx.state !== 'running' : this.el ? this.el.paused : true, next: Number.isFinite(this.nextAt) ? Math.round(this.nextAt - this.now()) : null, blocked: this.blocked, log: this.log.slice(),
      farm: { groups: Object.fromEntries(Object.entries(this.farm.groups).map(([k, v]) => [k, v.length])), beds: Object.fromEntries(Object.entries(this.farm.beds).map(([k, B]) => [k, B.g ? +B.g.gain.value.toFixed(3) : 0])), played: { ...this.farm.played }, last: this.farm.lastPlayed || null },
      hens: { kind: this.hen.kind, loaded: this.hen.bufs.filter(Boolean).length, playing: !!this.hen.src, which: this.hen.src ? this.hen.which : 0, played: this.hen.played, near: +this.hen.near.toFixed(3), gain: this.hen.g ? +this.hen.g.gain.value.toFixed(3) : 0, pan: this.hen.pan ? +this.hen.pan.pan.value.toFixed(2) : 0 } };
  }
}
