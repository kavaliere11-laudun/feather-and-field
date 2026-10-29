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

const smooth = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export const MUSIC = ['champ-de-tournesol', 'happy-whistling-ukulele'];
export const MUSIC_TIMES = {
  first: [3, 6],              // after the first tap, seconds before the first track starts
  gap: [150, 300],             // after a track, seconds of just the farm before the next (2½ to 5 minutes)
  level: 0.42,                 // the music's own volume (the farm's sounds will sit above it)
  fade: 2.5,                   // seconds to fade in
};
// how loud the music is by the hour (0: none, and no new track): full by day, softer at dawn and of an evening, none at night
export function musicLevel(h) {
  if (h >= 21.5 || h < 6) return 0;
  if (h < 7) return 0.55 * smooth((h - 6) / 0.5);
  if (h < 19) return 1;
  return 0.6 - 0.25 * smooth((h - 20.5) / 1);            // (19:00-21:30: softer, and softer still towards night)
}

export const HENS = {
  files: 7,                    // audio/hens/hen1.mp3 ... hen7.mp3
  level: 1.8,                  // close to a coop (her recordings are quiet: -30 to -34 LUFS; the music sits a little under)
  first: [1.5, 4],             // after the first tap, seconds before the hens are heard
  gap: [1.5, 6],               // seconds between one moment and the next
};

export class Sound {
  // o.base: where the files are (e.g. 'audio/'); o.hour(): the farm's hour; o.music(), o.sounds(): whether the player wants
  // the music, the farm's sounds; o.hens(): the coop to hear the hens from ({near: 0-1, pan: -1 left to 1 right}, or null);
  // o.off: never (the tests, unless they ask)
  constructor(o) {
    this.o = o; this.ctx = null; this.state = 'idle'; this.track = Math.random() < 0.5 ? 0 : 1; this.nextAt = Infinity;
    this.hen = { bufs: [], loading: false, src: null, g: null, pan: null, nextAt: Infinity, last: [], played: 0, near: 0 };
    this.el = null; this.gain = null; this.blocked = false; this.hidden = false; this.log = [];
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
        try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) { /* (older phones: their own way) */ }
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
        this.gain = this.ctx.createGain(); this.gain.gain.value = 0; this.gain.connect(this.master);
        this.el = new Audio(); this.el.preload = 'auto'; this.el.setAttribute('playsinline', '');
        this.ctx.createMediaElementSource(this.el).connect(this.gain);
        this.el.addEventListener('ended', () => this.ended());
        this.el.src = this.src(this.track);
        this.fx = this.ctx.createGain(); this.fx.connect(this.master);            // (the farm's own sounds)
        this.loadHens(); const hf = HENS.first; this.hen.nextAt = this.now() + hf[0] + Math.random() * (hf[1] - hf[0]);
        // a phone lets an <audio> play later only once it has played from a tap: so it plays now, silent, for a moment
        // (unless the music starts right away anyway)
        const p = this.el.play(); if (p && p.then) p.then(() => { if (this.state !== 'playing') this.el.pause(); }).catch(e => { if (e && e.name === 'NotAllowedError') this.blocked = true; });      // (an interrupted load is no matter)
        const a = MUSIC_TIMES.first; this.nextAt = this.now() + a[0] + Math.random() * (a[1] - a[0]);
        this.note('unlocked');
      }
      if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
      if (this.blocked && this.state === 'playing' && this.el.paused) this.playEl();
    } catch (e) { this.note('no sound: ' + e.message); }
  }
  src(i) { return (this.o.base || 'audio/') + MUSIC[i] + '.mp3'; }
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
  start() {
    this.el.src = this.src(this.track); this.gain.gain.value = 0;              // (from the start: loaded afresh rather than wound back)
    this.state = 'playing'; this.playEl(); this.target = this.level(); this.ramp(this.target, MUSIC_TIMES.fade);
    this.note('play ' + MUSIC[this.track]);
  }
  ended() {
    if (this.state !== 'playing') return;
    this.state = 'idle'; this.track = 1 - this.track; this.el.src = this.src(this.track);
    const g = MUSIC_TIMES.gap; this.nextAt = this.now() + g[0] + Math.random() * (g[1] - g[0]);
    this.note('ended; next in ' + Math.round(this.nextAt - this.now()) + ' s');
  }
  // stopped (the music switched off, or night): it fades, then rests; switched on again, a track comes soon
  stop(secs, why) {
    if (this.state !== 'playing') return;
    this.state = 'fading'; this.ramp(0, secs); this.note('fade: ' + why);
    clearTimeout(this.fadeT); this.fadeT = setTimeout(() => { if (this.state === 'fading') { this.el.pause(); this.state = 'idle'; this.track = 1 - this.track; this.el.src = this.src(this.track); } }, secs * 1000 + 100);
  }
  tick() {
    if (!this.ctx || this.hidden) return;
    this.tickHens();
    const lv = this.level(), on = !!this.o.music();
    if (this.state === 'playing') {
      if (!on) { this.stop(0.8, 'switched off'); return; }
      if (lv <= 0) { this.stop(8, 'night'); this.nextAt = this.now() + 60; return; }
      if (this.el.currentTime > MUSIC_TIMES.fade && Math.abs(lv - this.target) > 0.01) { this.target = lv; this.ramp(lv, 4); }      // (evening coming on: softer, slowly)
    } else if (this.state === 'idle' && on && this.now() >= this.nextAt) {
      if (lv > 0) this.start(); else this.nextAt = this.now() + 60;              // (night: looked at again in a minute)
    }
  }
  // ---- the hens chatting
  loadHens() {
    if (this.hen.loading) return; this.hen.loading = true;
    const decode = ab => new Promise((res, rej) => { const p = this.ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });      // (older Safari: callbacks only)
    for (let i = 0; i < HENS.files; i++) {
      fetch((this.o.base || 'audio/') + 'hens/hen' + (i + 1) + '.mp3').then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(decode).then(b => { this.hen.bufs[i] = b; }).catch(e => this.note('hen ' + (i + 1) + ': ' + (e && e.message)));
    }
  }
  tickHens() {
    const H = this.hen, t = this.ctx.currentTime, on = !this.o.sounds || !!this.o.sounds();
    const src = on && this.o.hens ? this.o.hens() : null; H.near = src ? src.near : 0;
    if (H.src) {                                    // one playing: it follows the view (or fades, switched off or the birds gone in)
      H.g.gain.setTargetAtTime(on ? HENS.level * H.near : 0, t, on ? 0.35 : 0.08);
      if (H.pan && src) H.pan.pan.setTargetAtTime(src.pan, t, 0.35);
      if (!on && !H.stopping) { H.stopping = true; try { H.src.stop(t + 0.4); } catch (e) { /* */ } }
      return;
    }
    if (!on || this.now() < H.nextAt) return;
    if (!src || src.near < 0.04) { H.nextAt = this.now() + 1.5; return; }       // (no coop near enough, or the birds in bed)
    const ready = H.bufs.map((b, i) => b ? i : -1).filter(i => i >= 0); if (!ready.length) { H.nextAt = this.now() + 1; return; }
    const fresh = ready.filter(i => !H.last.includes(i)), pick = (fresh.length ? fresh : ready)[Math.floor(Math.random() * (fresh.length || ready.length))];
    H.last.push(pick); if (H.last.length > Math.min(3, ready.length - 1)) H.last.shift();
    const s = this.ctx.createBufferSource(); s.buffer = H.bufs[pick];
    const g = this.ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(HENS.level * src.near, t, 0.12);
    let pan = null; if (this.ctx.createStereoPanner) { pan = this.ctx.createStereoPanner(); pan.pan.value = src.pan; }
    s.connect(g); if (pan) { g.connect(pan); pan.connect(this.fx); } else g.connect(this.fx);
    Object.assign(H, { src: s, g, pan, stopping: false, which: pick + 1 }); H.played++;
    s.onended = () => { if (H.src !== s) return; H.src = null; try { g.disconnect(); } catch (e) { /* */ } const gp = HENS.gap; H.nextAt = this.now() + gp[0] + Math.random() * (gp[1] - gp[0]); };
    s.start();
  }
  soundsChanged() { if (this.ctx) this.tickHens(); }
  // the music switch (gameui settings): off fades it now; on brings a track in a few seconds
  musicChanged() { if (!this.ctx) return; if (this.o.music()) { if (this.state !== 'playing') this.nextAt = this.now() + 1.5; } else this.stop(0.8, 'switched off'); }
  // put away (another app, the phone locked): quiet; back: the music picks up where it was (a phone may want a tap first)
  visible(on) {
    this.hidden = !on;
    if (!this.ctx) return;
    if (!on) { if (this.state === 'playing') { this.el.pause(); this.pausedPlaying = true; } this.ctx.suspend().catch(() => {}); return; }
    this.ctx.resume().catch(() => {});
    if (this.pausedPlaying) { this.pausedPlaying = false; if (this.state === 'playing') this.playEl(); }
  }
  info() {
    return { unlocked: !!this.ctx, ctx: this.ctx && this.ctx.state, state: this.state, track: MUSIC[this.track], gain: this.gain ? +this.gain.gain.value.toFixed(3) : 0,
      at: this.el ? +this.el.currentTime.toFixed(1) : 0, ready: this.el ? this.el.readyState : 0, err: this.el && this.el.error ? this.el.error.code : 0, paused: this.el ? this.el.paused : true, next: Number.isFinite(this.nextAt) ? Math.round(this.nextAt - this.now()) : null, blocked: this.blocked, log: this.log.slice(),
      hens: { loaded: this.hen.bufs.filter(Boolean).length, playing: !!this.hen.src, which: this.hen.src ? this.hen.which : 0, played: this.hen.played, near: +this.hen.near.toFixed(3), gain: this.hen.g ? +this.hen.g.gain.value.toFixed(3) : 0, pan: this.hen.pan ? +this.hen.pan.pan.value.toFixed(2) : 0 } };
  }
}
