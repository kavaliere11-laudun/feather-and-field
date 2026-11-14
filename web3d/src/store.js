// The shop for real money (14 Nov 2026, Audrey: 1.99 a winter building, 9.99 the nine; "Coins or money": the coin price
// stays, money is the way to have one at once). Only in the store app: Apple's own purchases (StoreKit 2), through the
// app's plugin FFStore (app/ios/App/App/FFStorePlugin.swift), called over the app's bridge like the reminders
// (notify.js), or a test's stand-in (window.__fakeStore). Outside the app: no shop, nothing bought with money counts.
// Security: what is owned always comes from Apple's signed record (the plugin reads Transaction.currentEntitlements,
// verified on the phone), asked when the farm opens, when the app comes back to the front, and after every purchase or
// restore; the save only keeps a note of the last answer (game.setPaid), and a note Apple doesn't confirm is dropped.
// No keys, no account details and no card details ever pass through the game.
import { THEMES } from './game.js';

const PRE = 'com.featherandfield.game.';
// the products, as made in App Store Connect: one a building (…winter.rir), one for the nine (…winter.all)
export const productOf = key => PRE + key.replace('_', '.');
export const setOf = t => PRE + t + '.all';
const keysOf = ids => {                              // (what a list of Apple's product ids gives: the buildings' keys)
  const out = new Set();
  for (const id of Array.isArray(ids) ? ids : []) {
    if (typeof id !== 'string' || !id.startsWith(PRE)) continue;
    const [t, b] = id.slice(PRE.length).split('.'), D = THEMES[t]; if (!D) continue;
    if (b === 'all') for (const x of D.breeds) out.add(t + '_' + x);
    else if (D.breeds.includes(b)) out.add(t + '_' + b);
  }
  return [...out];
};
function plugin() {
  if (typeof window === 'undefined') return null;
  if (window.__fakeStore) return window.__fakeStore;
  const C = window.Capacitor;
  if (window.__ffApp !== true || !C || !C.isNativePlatform || !C.isNativePlatform() || !C.nativePromise) return null;
  const call = m => o => C.nativePromise('FFStore', m, o || {});
  return { products: call('products'), owned: call('owned'), buy: call('buy'), restore: call('restore') };
}

export class Store {
  // o: { onBack(coopIds) (coops put back to their own look: redraw them), onChange() (prices or what's owned changed) }
  constructor(game, o = {}) {
    this.g = game; this.o = o; this.S = plugin(); this.on = !!this.S; this.prices = {}; this.busy = false;
    if (!this.on) { this.apply([]); return; }       // (outside the app nothing bought with money counts)
    this.refresh(); this.load();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { this.refresh(); if (!Object.keys(this.prices).length) this.load(); } });
  }
  ids() { const a = []; for (const t of Object.keys(THEMES)) { for (const b of THEMES[t].breeds) a.push(productOf(t + '_' + b)); a.push(setOf(t)); } return a; }
  apply(ids) { const back = this.g.setPaid(keysOf(ids)); if (back.length && this.o.onBack) this.o.onBack(back); if (this.o.onChange) this.o.onChange(); }
  async load() {                                     // (the prices as Apple gives them, in the player's own money)
    try { const r = await this.S.products({ ids: this.ids() }), known = new Set(this.ids());
      for (const p of (r && Array.isArray(r.products) ? r.products : [])) if (p && known.has(p.id) && typeof p.price === 'string' && p.price.length < 24) this.prices[p.id] = p.price;
    } catch (e) { /* (no prices: no money buttons) */ }
    if (this.o.onChange) this.o.onChange();
  }
  async refresh() { try { const r = await this.S.owned(); if (r && Array.isArray(r.ids)) this.apply(r.ids); } catch (e) { /* (Apple not heard: the last answer stands) */ } }
  price(key) { return this.on ? this.prices[productOf(key)] || null : null; }
  priceAll(t) { return this.on ? this.prices[setOf(t)] || null : null; }
  // a purchase: 'bought' (owned now, by Apple's record), 'pending' (waiting for a parent's yes), 'cancelled', 'failed'
  async buy(id) {
    if (!this.on || this.busy || !this.prices[id]) return 'failed';
    this.busy = true;
    try { const r = await this.S.buy({ id }); if (r && Array.isArray(r.ids)) this.apply(r.ids);
      const st = r && r.state; if (st === 'bought') return keysOf(r.ids).length && keysOf([id]).every(k => (this.g.data.paid || []).includes(k)) ? 'bought' : 'failed';
      return st === 'pending' || st === 'cancelled' ? st : 'failed';
    } catch (e) { return 'failed'; } finally { this.busy = false; }
  }
  async restore() {                                  // (how many buildings Apple says are owned; -1: Apple not heard)
    if (!this.on || this.busy) return -1;
    this.busy = true;
    try { const r = await this.S.restore(); if (!r || !Array.isArray(r.ids)) return -1; this.apply(r.ids); return keysOf(r.ids).length; } catch (e) { return -1; } finally { this.busy = false; }
  }
}
