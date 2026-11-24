// Free coins for a short video, in the store app (24 Nov 2026, Audrey: "Ads before launch"; her 2 Nov choices: "Free coins
// in the shop (Recommended)", "5 a day (Recommended)", "Contextual for everyone (Recommended)").
// The app's ads part (app/ios/App/App/FFAdsPlugin.swift: Google's AdMob) is reached only when the player taps Watch on the
// shop's Coins shelf: Google's consent message first where the law asks for it, then a video, contextual only (nothing about
// the player chooses it), rated for everyone. The coins (game.js ADS) only once Google says it played to the end. Nothing
// of it outside the app (window.__ffApp) or without the app's ads part; the tests stand in for it with window.__fakeAds.
import { ADS } from './game.js';

const PRIV_KEY = 'ff3d.adprivacy';                     // ('1': Google asks for its ad privacy choices to be offered here)
function plugin() {
  if (typeof window === 'undefined') return null;
  if (window.__fakeAds) return window.__fakeAds;      // (the tests: { hello(), watch({ next }), choices() })
  const C = window.Capacitor;
  if (window.__ffApp !== true || !C || !C.isNativePlatform || !C.isNativePlatform() || !C.nativePromise) return null;
  const call = m => o => C.nativePromise('FFAds', m, o || {});
  return { hello: call('hello'), watch: call('watch'), choices: call('choices') };
}
const within = (p, ms) => Promise.race([p, new Promise((res, rej) => setTimeout(() => rej(Object.assign(new Error('slow'), { code: 'slow' })), ms))]);

export class Ads {
  // o: { done(coins) (coins given: say it, refresh), say(text) }
  constructor(game, o = {}) {
    this.g = game; this.o = o; this.P = plugin(); this.on = false; this.busy = false;
    try { this.privacy = localStorage.getItem(PRIV_KEY) === '1'; } catch (e) { this.privacy = false; }
    if (this.P) this.P.hello().then(r => { this.on = true; if (r && r.privacy) this.keepPrivacy(true); }, () => { this.on = false; });
  }
  left() { return this.g.adsLeft(); }
  keepPrivacy(v) { this.privacy = !!v; try { if (v) localStorage.setItem(PRIV_KEY, '1'); else localStorage.removeItem(PRIV_KEY); } catch (e) { /* */ } }
  // a video, chosen by the player: 'earned' (its coins given), 'stopped' (closed before the end), 'none' (no video to be had),
  // 'busy', 'out' (none left today)
  async watch() {
    if (!this.on || this.busy) return 'busy';
    if (!this.left()) return 'out';
    this.busy = true;
    try {
      const r = await within(this.P.watch({ next: this.left() > 1 }), 300e3);      // (Google's consent message and the video itself are in this wait)
      if (r && typeof r.privacy === 'boolean') this.keepPrivacy(r.privacy);
      if (!r || r.earned !== true) return 'stopped';
      if (!this.g.adWatched()) return 'out';
      if (this.o.done) this.o.done(ADS.coins);
      return 'earned';
    } catch (e) {
      return e && e.code === 'busy' ? 'busy' : 'none';
    } finally { this.busy = false; }
  }
  // Google's form to change the ad privacy choices (Settings: only where Google asks for it)
  async choices() {
    if (!this.on) return false;
    try { const r = await this.P.choices(); if (r && typeof r.privacy === 'boolean') this.keepPrivacy(r.privacy); return !!(r && r.shown); }
    catch (e) { return false; }
  }
}
