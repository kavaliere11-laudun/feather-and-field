// My account (release 7; Audrey, 29 Oct: "Next step should be my account"; "Firebase, by Google", "Google now, Apple
// later", "Optional, in Settings"): the farm saved online with a Google account, so it's never lost with a phone, and it
// plays on another one. Optional: Settings has it, and it's suggested once, a few days into a farm (main.js showNews).
//
// What's kept online is the farm exactly as the phone keeps it (the farm and its seal: what a farm code holds), one
// document a player (farms/<their account>), with a few numbers to tell two farms apart (level, coins, when it was
// started). The rules (firestore.rules) let only its owner read or write it; coming back, it goes through the same checks
// as any save or farm code (game.js checkFarm) before the game takes it.
//
// Keeping the two in step: each save online is numbered (n, one more each time: the rules hold to it), and the phone
// remembers the number it last had and the farm's seal then (SYNC_KEY). When the farm opens, comes back on screen, or the
// player signs in:
//   - nothing online yet: this phone's farm goes up;
//   - online unchanged since this phone last had it: this phone's farm goes up if it's changed;
//   - online newer (another phone played) and nothing new here since: the online farm is taken (the page opens it);
//   - no farm on this phone (the welcome; a new phone): the online farm is taken;
//   - both changed, or a first sign-in here with a different farm on each: the player chooses which farm to keep.
// While playing, a change goes up a little later (DEBOUNCE), and straight away when the game is put away.
//
// The online side (cloud.js, Firebase: Google sign-in, the Firestore document) is its own file, loaded only once it's
// needed (signed in, or Settings opened); ?account=fake on the game's page puts a pretend one in its place, for the tests.
import { SAVE_KEY, checkFarm, levelOf } from './game.js';
import { FIREBASE, ACCOUNT_LIVE } from './firebase-config.js';

export const DEBOUNCE = 45e3;             // a change goes up this long after (sooner when the game is put away)
const MAX = 800000;                        // the most a farm may weigh online (the rules allow a little more)
const params = new URLSearchParams(location.search);
const FAKE = params.get('account') === 'fake';
const EMU = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') && params.get('emu');      // (the Firebase emulators, only from a test page)
// Audrey trying it first (before it's on for everyone): ?account=1 on the game's address turns it on for that phone and
// browser (kept), ?account=0 off again
const BETA = (() => { try { const v = params.get('account'); if (v === '1') localStorage.setItem('ff3d.acctbeta', '1'); if (v === '0') localStorage.removeItem('ff3d.acctbeta'); return localStorage.getItem('ff3d.acctbeta') === '1'; } catch (e) { return false; } })();
const SYNC_KEY = FAKE ? 'ff3d.cloud.fake' : 'ff3d.cloud';      // { uid, n, s, fresh? }: the account, the save's number and the farm's seal then (the pretend account's kept apart)

function readSync() {
  try {
    const v = JSON.parse(localStorage.getItem(SYNC_KEY) || 'null');
    if (!v || typeof v.uid !== 'string' || !/^[\w-]{1,128}$/.test(v.uid)) return {};
    return { uid: v.uid, n: Number.isInteger(v.n) && v.n >= 0 ? v.n : 0, s: typeof v.s === 'string' && /^[0-9a-f]{8}$/.test(v.s) ? v.s : '', fresh: v.fresh === true };
  } catch (e) { return {}; }
}
function writeSync(v) { try { if (v) localStorage.setItem(SYNC_KEY, JSON.stringify(v)); else localStorage.removeItem(SYNC_KEY); } catch (e) { /* */ } }
// the farm as this phone keeps it: its text, its seal, and what tells it apart (or null)
function readLocal() {
  let text = null; try { text = localStorage.getItem(SAVE_KEY); } catch (e) { return null; }
  return text ? farmOf(text) : null;
}
// a farm's text (here or online) checked: { text, s, sum: { name, look, lv, coins, made, seen } } or null
function farmOf(text, now = Date.now()) {
  if (typeof text !== 'string' || text.length < 20 || text.length > MAX) return null;
  try {
    const raw = JSON.parse(text);
    if (!raw || typeof raw !== 'object' || !raw.d || typeof raw.d !== 'object' || typeof raw.s !== 'string') return null;
    const d = checkFarm(JSON.parse(JSON.stringify(raw.d)), now); if (!d) return null;
    return { text, s: raw.s, sum: { name: d.farmer.name, look: d.farmer.look, lv: levelOf(d.xp), coins: d.coins, made: d.made, seen: d.lastSeen } };
  } catch (e) { return null; }
}

// ---- the pretend account (?account=fake): signed in at a tap, the "online" farm kept by the test (window.__fakeCloud,
// shared by its phones) or else in this phone's own storage
function fakeCloud() {
  const KEY = 'ff3d.fakecloud', UKEY = 'ff3d.fakeuser';
  const io = window.__fakeCloud ? (op, a) => window.__fakeCloud(op, a) : async (op, a) => {
    if (window.__fakeOffline) throw Object.assign(new Error('offline'), { code: 'unavailable' });
    const all = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (op === 'get') return all[a.uid] || null;
    if (op === 'put') { const cur = all[a.uid]; if ((cur ? cur.n : 0) !== a.base) return { conflict: true }; all[a.uid] = { ...a.doc, n: a.base + 1, at: Date.now() }; localStorage.setItem(KEY, JSON.stringify(all)); return { n: a.base + 1, at: all[a.uid].at }; }
    if (op === 'del') { delete all[a.uid]; localStorage.setItem(KEY, JSON.stringify(all)); return true; }
  };
  let user = null; try { user = JSON.parse(localStorage.getItem(UKEY) || 'null'); } catch (e) { /* */ }
  const subs = [], tell = () => subs.forEach(f => f(user));
  return {
    onUser(f) { subs.push(f); setTimeout(() => f(user), 0); },
    async signIn() { if (window.__fakeSignIn === 'closed') throw Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' }); user = { uid: window.__fakeUid || 'fake-farmer-1', name: 'Sam Field', email: 'sam@example.com' }; localStorage.setItem(UKEY, JSON.stringify(user)); tell(); return user; },
    async signOut() { user = null; localStorage.removeItem(UKEY); tell(); },
    get: () => io('get', { uid: user.uid }),
    put: (doc, base) => io('put', { uid: user.uid, doc, base }),
    async drop() { await io('del', { uid: user.uid }); await this.signOut(); },
  };
}
// the Firebase one: cloud.js (built by build.sh from src/cloud.js), loaded once
let cloudP = null;
function firebaseCloud(bust) {
  if (!cloudP) cloudP = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'cloud.js' + (bust || ''); s.async = true;
    s.onload = () => (window.FFCloud ? res(window.FFCloud.make(FIREBASE, EMU)) : rej(new Error('cloud.js')));
    s.onerror = () => { cloudP = null; rej(Object.assign(new Error('cloud.js'), { code: 'unavailable' })); };
    document.head.append(s);
  });
  return cloudP;
}

export class Account {
  // o: { bust, say(text), loaded() (the page opens the farm just put on the phone), ask(here, online) -> Promise<'here'|'online'> }
  constructor(game, o = {}) {
    this.g = game; this.o = o;
    this.on = FAKE || (!!FIREBASE && (ACCOUNT_LIVE || BETA || !!EMU));          // (no project yet: nothing of the account anywhere)
    this.cloud = null; this.user = null; this.status = 'out'; this.savedAt = 0; this.timer = 0;
    this.busy = false; this.again = false; this.asking = false; this.taking = false; this.subs = [];
    this.st = readSync();
    this.info = { syncs: 0, ups: 0, takes: 0, asks: 0, last: '' };
  }
  // the online side, loaded (once)
  prepare() {
    if (!this.on) return Promise.resolve(null);
    if (!this.readyP) {
      this.readyP = (FAKE ? Promise.resolve(fakeCloud()) : firebaseCloud(this.o.bust)).then(c => {
        this.cloud = c;
        c.onUser(u => {
          const was = this.user; this.user = u;
          if (u && (!was || was.uid !== u.uid)) this.sync('user');
          if (!u) this.set('out');
        });
        return c;
      }, e => { this.readyP = null; throw e; });
    }
    return this.readyP;
  }
  // at the start: signed in on this phone before, the online side straight away (else only once Settings is opened)
  start() {
    if (!this.on) return;
    this.g.onChange(() => this.changed());
    document.addEventListener('visibilitychange', () => {
      if (!this.user) return;
      if (document.hidden) { if (this.timer) this.upNow(); }
      else this.sync('back');
    });
    if (this.st.uid) this.prepare().catch(() => this.set('offline'));
  }
  watch(f) { this.subs.push(f); return () => { this.subs = this.subs.filter(x => x !== f); }; }
  set(status) { this.status = status; for (const f of this.subs) f(status); }
  name() { return this.user ? this.user.name || this.user.email || '' : ''; }
  // ---- signing in (from a tap: Google's window opens at once, so the online side must be there already: prepare())
  async signIn() {
    if (!this.cloud) { try { await this.prepare(); } catch (e) { if (this.o.say) this.o.say(this.g.t('acct_failed')); return false; } }
    try { await this.cloud.signIn(); return true; }        // (signed in: onUser, then sync)
    catch (e) {
      const c = e && e.code || ''; this.info.err = c || String(e && e.message || e).slice(0, 160);      // (for the tests)
      if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request' || c === 'auth/user-cancelled') return false;
      if (this.o.say) this.o.say(this.g.t(c === 'auth/popup-blocked' ? 'acct_popup' : 'acct_failed'));
      return false;
    }
  }
  async signOut() {
    if (!this.cloud || !this.user) return;
    if (this.timer) await this.upNow();
    await this.cloud.signOut().catch(() => {});
    this.st = {}; writeSync(null); this.user = null; this.set('out');
    if (this.o.say) this.o.say(this.g.t('acct_out_done'));
  }
  // delete the account: Google asks who it is again (from the tap), then the farm online and the account go; the farm
  // stays on this phone
  async drop() {
    if (!this.cloud || !this.user) return false;
    clearTimeout(this.timer); this.timer = 0;
    try { await this.cloud.drop(); }
    catch (e) {
      const c = e && e.code || '';
      if (!/popup-closed|cancelled/.test(c) && this.o.say) this.o.say(this.g.t('acct_failed'));
      return false;
    }
    this.st = {}; writeSync(null); this.user = null; this.set('out');
    if (this.o.say) this.o.say(this.g.t('acct_deleted'));
    return true;
  }
  // "Start a new farm" while signed in: the new farm replaces the one online (rather than the online one coming back)
  freshFarm() { if (this.user) { this.st = { ...this.st, fresh: true }; writeSync(this.st); } }
  // ---- keeping the two in step
  changed() {
    if (!this.user || this.asking || this.taking || this.status === 'ask') return;
    clearTimeout(this.timer); this.timer = setTimeout(() => this.upNow(), DEBOUNCE);
  }
  upNow() { clearTimeout(this.timer); this.timer = 0; return this.sync('save'); }
  async sync(why) {
    if (!this.cloud || !this.user || this.asking || this.taking) return;
    if (this.busy) { this.again = true; return; }
    this.busy = true; this.info.syncs++; this.info.last = why;
    try { await this.step(why); }
    catch (e) { this.set('offline'); if (this.user && !this.timer) this.timer = setTimeout(() => this.upNow(), /permission/.test(e && e.code || '') ? 5e3 : DEBOUNCE); }      // (no connection, or too soon after the last save: again a little later)
    finally { this.busy = false; if (this.again) { this.again = false; setTimeout(() => this.sync('again'), 50); } }
  }
  async step(why) {
    const uid = this.user.uid, st = this.st.uid === uid ? this.st : { uid }, here = readLocal();
    this.set('syncing');
    const doc = await this.cloud.get();
    const online = doc && farmOf(doc.farm);
    const n = doc ? doc.n : 0;
    if (!online) {                                                       // nothing online (or nothing usable): this phone's goes up
      if (here) return this.up(here, n);
      this.st = { uid, n, s: '', ...(st.fresh ? { fresh: true } : {}) }; writeSync(this.st); return this.set('empty');
    }
    if (st.fresh) { if (here) return this.up(here, n); this.set('empty'); return; }      // (a new farm started here: it goes up once it's made)
    if (st.n === n && st.s) {                                            // online as this phone left it
      if (here && here.s !== st.s) return this.up(here, n);
      this.savedAt = doc.at || this.savedAt; return this.set('saved');
    }
    if (!here) return this.take(doc, online, n);                         // a new phone: the farm online comes here
    if (here.s === online.s) { this.st = { uid, n, s: here.s }; writeSync(this.st); this.savedAt = doc.at || 0; return this.set('saved'); }
    if (st.n !== undefined && st.s && here.s === st.s) return this.take(doc, online, n);      // (nothing new here since: the other phone's is newer)
    // a farm on each, both changed: the player chooses
    this.asking = true; this.info.asks++; this.set('ask');
    let pick = null;
    try { pick = this.o.ask ? await this.o.ask(here.sum, { ...online.sum, at: doc.at }) : null; } finally { this.asking = false; }
    if (pick === 'here') return this.up(readLocal() || here, n);
    if (pick === 'online') return this.take(doc, online, n);
    this.set('ask');                                                     // (not chosen yet: asked again when the game comes back)
  }
  async up(here, base) {
    const r = await this.cloud.put({ farm: here.text, lv: here.sum.lv, coins: here.sum.coins, made: here.sum.made }, base);
    if (r && r.conflict) { this.again = true; return; }               // (another phone saved meanwhile: look again)
    this.info.ups++;
    this.st = { uid: this.user.uid, n: r.n, s: here.s }; writeSync(this.st);
    this.savedAt = r.at || Date.now(); this.set('saved');
  }
  // the farm online put on this phone, and the page opens it (checked, as every save is)
  take(doc, online, n) {
    this.taking = true; this.info.takes++;
    try { localStorage.setItem(SAVE_KEY, online.text); } catch (e) { this.taking = false; return this.set('error'); }
    this.st = { uid: this.user.uid, n, s: online.s }; writeSync(this.st);
    this.set('taken');
    if (this.o.loaded) this.o.loaded();
  }
  // the once-only suggestion (a few days into a farm, signed out, never asked: main.js showNews)
  nudgeDue(now = Date.now()) {
    const d = this.g.data;
    return this.on && !this.user && !this.st.uid && !!d && !d.acctAsk && d.guide && d.guide.done && now - d.made >= 3 * 86400e3;
  }
  nudged() { if (this.g.data) { this.g.data.acctAsk = 1; this.g.save(); } }
}
