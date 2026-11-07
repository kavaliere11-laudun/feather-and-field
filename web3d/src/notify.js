// The store app's reminders (Audrey, 1 Nov 2026: "we need to add the notification too"; her choices: eggs waiting, chicks
// hatched, the wheat and the honey ready, the show results, and "Yes, after 3 days (Recommended)": one gentle "your hens
// miss you" note). Sent by the phone itself (the app's local notifications: no server, nothing leaves the phone), only
// inside the app (app/make-www.mjs: window.__ffApp), only once the player says yes (a card once the first day's guide is
// done, then Settings: Reminders On / Off).
//
// What's coming is worked out from the game's own rules (plan): the farm copied and run on ahead (the lays, the broody
// hens, as the game itself would), the wheat's and the honey's times, the shows' judging, and the farm left alone for 3
// days. Never at night (21:00 to 8:00: moved to 8:00), two a day at most (the most important kept: chicks, the show, the
// farm missing you, the wheat, the honey, the eggs), only what's 5 minutes off or more. Planned again while playing (each
// minute and after a change) and when the game is put away, so what's waiting on the phone is always the latest.
// The player's choice is this phone's, not the farm's (a farm code taken to another phone doesn't carry it): kept apart
// from the farm, read back only as 'on' or 'off'.
import { Game, HONEY } from './game.js';

export const QUIET_FROM = 21, QUIET_TO = 8;            // nothing between these hours: moved to QUIET_TO
export const PER_DAY = 2;                              // at most a day
export const AHEAD = 4 * 86400e3;                      // how far ahead
export const MISS_AFTER = 3 * 86400e3, MISS_HOUR = 18; // the farm left alone this long: one note, at this hour
export const EGGS_AT = 6;                              // eggs waiting that are worth a note (a day at most, two days ahead)
const LEAD = 5 * 60e3, STEP = 15 * 60e3;
const KINDS = ['hatch', 'show', 'miss', 'wheat', 'garden', 'honey', 'eggs'];      // (most important first)
// the player's choice of which (Audrey, 1 Nov 21:01: "choose which ones you want, for example eggs only. The one after 3
// days inactivity shows if at least 1 notification is active"): four groups, all on at first; the "miss you" note comes
// with any of them
export const GROUPS = { eggs: ['eggs'], chicks: ['hatch'], crops: ['wheat', 'garden', 'honey'], shows: ['show'] };      // (the vegetable garden with the crops, 7 Nov 2026)
const ALL = Object.keys(GROUPS);
const PREF_KEY = 'ff3d.notes', KINDS_KEY = 'ff3d.notesKinds';

const local = (t, h, m = 0) => { const d = new Date(t); d.setHours(h, m, 0, 0); return d.getTime(); };
// out of the quiet hours: at night, to the next morning at QUIET_TO
export function notQuiet(t) {
  const h = new Date(t).getHours();
  if (h >= QUIET_FROM) return local(t + 86400e3, QUIET_TO);
  if (h < QUIET_TO) return local(t, QUIET_TO);
  return t;
}
const dayOf = t => { const d = new Date(t); return d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate(); };

// what to send, from now: [{ id, kind, at, title, body }], in time order; groups: the ones the player wants (none: nothing,
// not even the "miss you")
export function plan(game, now = Date.now(), groups = ALL) {
  const d = game.data; if (!d || !groups.length) return [];
  const wanted = new Set(['miss', ...groups.flatMap(k => GROUPS[k] || [])]);
  const out = [], add = (kind, at, title, body) => { if (wanted.has(kind) && Number.isFinite(at) && at > now) out.push({ kind, at, title, body }); };
  const name = id => { const b = game.bird(id); return b ? b.name : ''; };
  // the shows: judged at 7 the morning after
  for (const e of game.shows().in) add('show', game.showJudgedAt(e.id), game.t('nt_show_t'), game.t('nt_show', { name: name(e.bird), show: game.showName(e.id) }));
  // the wheat ripe; the hives full
  const w = game.wheat(); if (w.ripe) add('wheat', w.ripe, game.t('nt_wheat_t'), game.t('nt_wheat'));
  const gb = d.garden && game.gardenOpen() ? d.garden.beds.filter(b => b.crop && b.ripe > now).sort((a, b) => a.ripe - b.ripe) : [];      // (the vegetable garden: the next bed ripe)
  if (gb.length) add('garden', gb[0].ripe, game.t('nt_garden_t'), game.t('nt_garden', { crop: game.t('crop_l_' + gb[0].crop) }));
  const H = d.honey; if (H && H.n < HONEY.max) add('honey', H.at + (HONEY.max - H.n) * HONEY.every, game.t('nt_honey_t'), game.t('nt_honey', { n: HONEY.max }));
  // the farm run on ahead on a copy (nothing saved): the eggs laid (as the game lays them: fed, room in the nest, not
  // sitting), the broody hens and their chicks hatching
  const g = new Game(null); g.data = JSON.parse(JSON.stringify(d)); g.lang = game.lang;
  const eggs = () => g.data.coops.reduce((a, c) => a + (c.eggs || 0), 0), start = eggs();
  const eggDays = new Set();
  try {
    for (let t = now + STEP; t <= now + Math.min(AHEAD, 2 * 86400e3 + STEP); t += STEP) {
      for (const l of g.dueLays(t)) g.layEgg(l.hen, l.t, t);
      for (const n of g.broodTick(t)) if (n.type === 'hatch') add('hatch', n.t, game.t('nt_hatch_t'), game.t('hatched', { n: n.n, name: name(n.hen) || (g.bird(n.hen) || {}).name || '' }));
      const e = eggs(), day = dayOf(notQuiet(t));
      if (e >= EGGS_AT && e >= start + 2 && !eggDays.has(day) && eggDays.size < 2) { eggDays.add(day); add('eggs', t, game.t('nt_eggs_t'), game.t('nt_eggs', { n: e })); }
    }
  } catch (err) { /* (a farm the copy can't run on: the rest still planned) */ }
  // left alone for 3 days: their two best friends miss you
  const friends = d.birds.filter(b => b.sex !== 'c').sort((a, b) => (b.trust || 0) - (a.trust || 0)).slice(0, 2).map(b => b.name);
  if (friends.length) add('miss', local(now + MISS_AFTER, MISS_HOUR), game.t('nt_miss_t'), game.t('nt_miss', { names: game.andList(friends) }));
  // never at night, not too soon, two a day at most (the most important kept)
  const ok = out.map(n => ({ ...n, at: notQuiet(n.at) })).filter(n => n.at >= now + LEAD && n.at <= now + AHEAD)
    .sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || a.at - b.at);
  const perDay = new Map(), kept = [];
  for (const n of ok) { const k = dayOf(n.at), c = perDay.get(k) || 0; if (c >= PER_DAY) continue; perDay.set(k, c + 1); kept.push(n); }
  kept.sort((a, b) => a.at - b.at);
  for (let i = 1; i < kept.length; i++) if (kept[i].at < kept[i - 1].at + 60e3) kept[i].at = kept[i - 1].at + 2 * 60e3;      // (two due together: a couple of minutes apart)
  return kept.map((n, i) => ({ id: 1001 + i, ...n }));
}

// the phone's notifications: the app's plugin (Capacitor's LocalNotifications, app/package.json), called through the
// app's own bridge (window.Capacitor.nativePromise: the game doesn't carry Capacitor's code; a Date goes over as a date),
// or a test's stand-in (window.__fakeNotes)
function plugin() {
  if (typeof window === 'undefined') return null;
  if (window.__fakeNotes) return window.__fakeNotes;
  const C = window.Capacitor;
  if (window.__ffApp !== true || !C || !C.isNativePlatform || !C.isNativePlatform() || !C.nativePromise) return null;
  const call = m => o => C.nativePromise('LocalNotifications', m, o || {});
  return { checkPermissions: call('checkPermissions'), requestPermissions: call('requestPermissions'), getPending: call('getPending'), cancel: call('cancel'), schedule: call('schedule') };
}

export class Notes {
  // o: { busy() (a card or a show in the way: wait) }
  constructor(game, o = {}) {
    this.g = game; this.o = o; this.LN = plugin(); this.on = !!this.LN; this.timer = 0; this.last = ''; this.syncing = false;
    if (!this.on) return;
    document.addEventListener('visibilitychange', () => this.sync());
    addEventListener('pagehide', () => this.sync());
    game.onChange(() => { clearTimeout(this.timer); this.timer = setTimeout(() => this.sync(), 4000); });
    setInterval(() => { if (!document.hidden) this.sync(); }, 60e3);
    setTimeout(() => this.sync(), 3000);
  }
  planNow(now = Date.now()) { return plan(this.g, now, this.kinds()); }      // (tests)
  // which ones (this phone's choice, read back only as known groups; never chosen: all)
  kinds() { try { const v = localStorage.getItem(KINDS_KEY); if (v === null) return ALL.slice(); return v.split(',').filter((k, i, a) => ALL.includes(k) && a.indexOf(k) === i); } catch (e) { return ALL.slice(); } }
  setKinds(list) { try { localStorage.setItem(KINDS_KEY, ALL.filter(k => list.includes(k)).join(',')); } catch (e) { /* */ } this.last = ''; this.sync(); }
  pref() { try { const v = localStorage.getItem(PREF_KEY); return v === 'on' || v === 'off' ? v : ''; } catch (e) { return ''; } }
  setPref(v) { try { localStorage.setItem(PREF_KEY, v === 'on' ? 'on' : 'off'); } catch (e) { /* */ } this.last = ''; this.sync(); }
  // asked once: once the first day's guide is done (the player has seen eggs, the wheat and the shop)
  askDue() { const d = this.g.data; return this.on && !this.pref() && !!d && !!d.guide && !!d.guide.done; }
  // yes: the phone asks the player; their answer kept (no: off, Settings can turn it on again)
  async ask() {
    let ok = false;
    try { const r = await this.LN.requestPermissions(); ok = !!r && r.display === 'granted'; } catch (e) { ok = false; }
    this.setPref(ok ? 'on' : 'off');
    return ok;
  }
  async allowed() { try { const r = await this.LN.checkPermissions(); return !!r && r.display === 'granted'; } catch (e) { return false; } }
  // what's waiting on the phone made the latest: everything of ours taken off, the plan put on (only if it changed)
  async sync(now = Date.now()) {
    if (!this.on) return;
    if (this.syncing) { this.again = true; return; }      // (asked again meanwhile: once this one's done)
    this.syncing = true;
    try {
      const want = this.pref() === 'on' && this.g.data ? plan(this.g, now, this.kinds()) : [];
      const key = JSON.stringify(want.map(n => [n.id, n.at, n.body]));
      if (key === this.last) return;
      const p = await this.LN.getPending().catch(() => ({ notifications: [] }));
      const ours = (p && p.notifications || []).filter(n => n.id >= 1001 && n.id < 2000).map(n => ({ id: n.id }));
      if (ours.length) await this.LN.cancel({ notifications: ours });
      if (want.length && await this.allowed()) await this.LN.schedule({ notifications: want.map(n => ({ id: n.id, title: n.title, body: n.body, schedule: { at: new Date(n.at), allowWhileIdle: true } })) });
      this.last = key;
    } catch (e) { this.last = ''; }
    finally { this.syncing = false; if (this.again) { this.again = false; this.sync(); } }
  }
}
