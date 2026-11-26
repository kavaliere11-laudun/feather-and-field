// The player's age band (26 Nov 2026, the launch review; Audrey: "Fix all 4, then UK + US"): the US app store age laws
// (Texas since 4 June 2026, California from 1 January 2027), COPPA (players under 13) and the UK Children's code.
// What it decides: a player under 13 gets no sign-in (no name or email collected: My account says it's for 13 and over)
// and only child-directed videos (ads.js); everyone plays everything else the same.
// Where it comes from, in this order:
//   - in the app, where the law asks for it here (the US states' app store laws), Apple's age range
//     (app/ios/App/App/FFAgePlugin.swift), at each start (atStart): under 13 / 13-17 / adult from its bounds; not shared
//     there: under 13 (the safe side) until it is;
//   - else a neutral question (gameui.js ageAsk), asked only when it's first needed (before a sign-in or a video): the year
//     they were born, no year picked to begin with, nothing saying which answer opens what. A year that may make them 13:
//     under 13 (the safe side).
// Kept on this phone apart from the farm (AGE_KEY: a new farm doesn't ask again, so a child can't answer again to get
// round it), as the band only, never the year; checked when read. window.__fakeAge stands in for Apple's in the tests.
export const AGE_KEY = 'ff3d.age';
const BANDS = ['child', 'teen', 'adult'];
function read() {
  try {
    const v = JSON.parse(localStorage.getItem(AGE_KEY) || 'null');
    if (!v || !BANDS.includes(v.b) || !['apple', 'asked', 'law'].includes(v.by)) return null;
    return { b: v.b, by: v.by };
  } catch (e) { return null; }
}
function plugin() {
  if (typeof window === 'undefined') return null;
  if (window.__fakeAge) return window.__fakeAge;      // (the tests: { hello(), required(), range() })
  const C = window.Capacitor;
  if (window.__ffApp !== true || !C || !C.isNativePlatform || !C.isNativePlatform() || !C.nativePromise) return null;
  const call = m => o => C.nativePromise('FFAge', m, o || {});
  return { hello: call('hello'), required: call('required'), range: call('range') };
}
// an age from a birth year, on the safe side: born this year minus 13 may still be 12, so a child; minus 18 may be 17
export const bandOfYear = (y, now = new Date()) => { const a = now.getFullYear() - y; return a <= 13 ? 'child' : a <= 18 ? 'teen' : 'adult'; };
const bandOfRange = r => (r.lower == null || r.lower < 13 ? 'child' : r.lower >= 18 ? 'adult' : 'teen');

export class Age {
  constructor() { this.P = plugin(); this.st = read(); this.api = false; this.ready = this.P ? this.P.hello().then(r => { this.api = !!(r && r.api); }, () => {}) : Promise.resolve(); }
  band() { return this.st ? this.st.b : null; }
  child() { return this.band() === 'child'; }
  keep(b, by) { this.st = { b, by }; try { localStorage.setItem(AGE_KEY, JSON.stringify(this.st)); } catch (e) { /* */ } return b; }
  // at the app's start: where the law asks for it here, Apple's age range now (the system's own sheet); where it isn't
  // shared there, under 13 (the safe side, until Apple shares it)
  async atStart() {
    await this.ready;
    if (!this.P || !this.api) return;                   // (asked at every start there: Apple's answer may have changed; it keeps it, so no sheet each time)
    const r = await this.P.required().catch(() => null);
    if (!r || !r.required) return;
    const b = await this.fromApple();
    if (!b && !this.st) this.keep('child', 'law');
  }
  async fromApple() {
    if (!this.P || !this.api) return null;
    const r = await this.P.range().catch(() => null);
    return r && r.status === 'sharing' ? this.keep(bandOfRange(r), 'apple') : null;
  }
  fromYear(y) { return Number.isInteger(y) && y > 1900 && y <= new Date().getFullYear() ? this.keep(bandOfYear(y), 'asked') : null; }
}
