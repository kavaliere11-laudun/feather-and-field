// The shop for real money (14 Nov 2026, Audrey: 1.99 a winter building, 9.99 the nine; "Coins or money": the coin price
// stays, money is the way to have one at once). Only in the store app: Apple's own purchases (StoreKit 2), through the
// app's plugin FFStore (app/ios/App/App/FFStorePlugin.swift), called over the app's bridge like the reminders
// (notify.js), or a test's stand-in (window.__fakeStore). Outside the app: no shop, nothing bought with money counts.
// Security: what is owned always comes from Apple's signed record (the plugin reads Transaction.currentEntitlements,
// verified on the phone), asked when the farm opens, when the app comes back to the front, and after every purchase or
// restore; the save only keeps a note of the last answer (game.setPaid), and a note Apple doesn't confirm is dropped.
// No keys, no account details and no card details ever pass through the game.
import { THEMES, BAGS, TRIO_LINES, SHELF_IDS } from './game.js';

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
// the rest (14 Nov, her grid): the bags of coins (…coins.purse; bought again and again), the rare Silkie trios
// (…silkie.paint, and …silkie.all for the four), the Pantry's bigger shelves (…pantry.shelves)
export const bagOf = bag => PRE + 'coins.' + bag;
export const trioOf = line => PRE + 'silkie.' + line.replace('sil_', '');
export const TRIO_ALL = PRE + 'silkie.all', SHELVES = PRE + 'pantry.shelves';
// (21 Nov 2026) the collector's shelf's breeds, a trio each: …shelf.buff, …shelf.partridge
export const shelfOf = b => PRE + 'shelf.' + b.replace('sil_', '');
const breedsOf = ids => { const a = Array.isArray(ids) ? ids : []; return SHELF_IDS.filter(b => a.includes(shelfOf(b))); };
const triosOf = ids => { const a = Array.isArray(ids) ? ids : []; return TRIO_LINES.filter(l => a.includes(TRIO_ALL) || a.includes(trioOf(l))); };
const bagFrom = id => Object.keys(BAGS).find(b => bagOf(b) === id) || null;
function plugin() {
  if (typeof window === 'undefined') return null;
  if (window.__fakeStore) return window.__fakeStore;
  const C = window.Capacitor;
  if (window.__ffApp !== true || !C || !C.isNativePlatform || !C.isNativePlatform() || !C.nativePromise) return null;
  const call = m => o => C.nativePromise('FFStore', m, o || {});
  return { products: call('products'), owned: call('owned'), buy: call('buy'), restore: call('restore'), pending: call('pending'), finish: call('finish') };
}

export class Store {
  // o: { onBack(coopIds) (coops put back to their own look: redraw them), onChange() (prices or what's owned changed) }
  constructor(game, o = {}) {
    this.g = game; this.o = o; this.S = plugin(); this.on = !!this.S; this.prices = {}; this.busy = false;
    if (!this.on) { this.apply([]); return; }       // (outside the app nothing bought with money counts)
    this.refresh(); this.load(); setTimeout(() => this.pending(), 4000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { this.refresh(); this.pending(); if (!Object.keys(this.prices).length) this.load(); } });
  }
  ids() { const a = []; for (const t of Object.keys(THEMES)) { for (const b of THEMES[t].breeds) a.push(productOf(t + '_' + b)); a.push(setOf(t)); } for (const b of Object.keys(BAGS)) a.push(bagOf(b)); for (const l of TRIO_LINES) a.push(trioOf(l)); for (const b of SHELF_IDS) a.push(shelfOf(b)); a.push(TRIO_ALL, SHELVES); return a; }
  apply(ids) {
    const back = this.g.setPaid(keysOf(ids), { shelves: Array.isArray(ids) && ids.includes(SHELVES), trios: triosOf(ids), breeds: breedsOf(ids) });
    clearTimeout(this.again); if (!this.g.data) this.again = setTimeout(() => this.apply(ids), 2000);      // (no farm open yet: again once there is one, for a trio to move in)
    if (back.length && this.o.onBack) this.o.onBack(back);
    const A = this.g.adopted; if (A && A.length) { this.g.adopted = []; if (this.o.onAdopt) this.o.onAdopt(A); }
    if (this.o.onChange) this.o.onChange();
  }
  // bags of coins paid for and not yet handed over (the app closed in between; a parent's yes come later): each receipt
  // pays once (game.grantCoins keeps its number), then Apple is told it's done
  async settle(list) {
    let n = 0;
    for (const t of Array.isArray(list) ? list : []) { const bag = t && bagFrom(t.productId); if (!bag || typeof t.id !== 'string' || !this.g.data) continue;
      n += this.g.grantCoins(t.id, bag); try { await this.S.finish({ id: t.id }); } catch (e) { /* (asked again next time) */ } }
    if (n && this.o.onCoins) this.o.onCoins(n);
    return n;
  }
  async pending() { try { const r = await this.S.pending(); if (r && Array.isArray(r.list) && r.list.length) await this.settle(r.list); } catch (e) { /* */ } }
  async load() {                                     // (the prices as Apple gives them, in the player's own money)
    try { const r = await this.S.products({ ids: this.ids() }), known = new Set(this.ids());
      for (const p of (r && Array.isArray(r.products) ? r.products : [])) if (p && known.has(p.id) && typeof p.price === 'string' && p.price.length < 24) this.prices[p.id] = p.price;
    } catch (e) { /* (no prices: no money buttons) */ }
    if (this.o.onChange) this.o.onChange();
  }
  async refresh() { try { const r = await this.S.owned(); if (r && Array.isArray(r.ids)) this.apply(r.ids); } catch (e) { /* (Apple not heard: the last answer stands) */ } }
  price(key) { return this.on ? this.prices[productOf(key)] || null : null; }
  priceOf(id) { return this.on ? this.prices[id] || null : null; }      // (any product's: a bag's, a trio's, the shelves')
  priceAll(t) { return this.on ? this.prices[setOf(t)] || null : null; }
  // a purchase: 'bought' (owned now, by Apple's record), 'pending' (waiting for a parent's yes), 'cancelled', 'failed'
  async buy(id) {
    if (!this.on || this.busy || !this.prices[id]) return 'failed';
    this.busy = true;
    try { const r = await this.S.buy({ id }); const st = r && r.state;
      if (bagFrom(id)) {                             // (coins: handed over from Apple's receipt, once)
        if (st === 'bought' && r.tx) return (await this.settle([r.tx])) ? 'bought' : 'failed';
        return st === 'pending' || st === 'cancelled' ? st : 'failed';
      }
      if (r && Array.isArray(r.ids)) this.apply(r.ids);
      if (st === 'bought') { const P = this.g.paidNow || { keys: [], trios: [] };
        const ok = id === SHELVES ? P.shelves : SHELF_IDS.some(b => shelfOf(b) === id) ? (P.breeds || []).some(b => shelfOf(b) === id) : id === TRIO_ALL ? P.trios.length === TRIO_LINES.length : TRIO_LINES.some(l => trioOf(l) === id) ? P.trios.some(l => trioOf(l) === id) : keysOf([id]).length > 0 && keysOf([id]).every(k => P.keys.includes(k));
        return ok ? 'bought' : 'failed'; }
      return st === 'pending' || st === 'cancelled' ? st : 'failed';
    } catch (e) { return 'failed'; } finally { this.busy = false; }
  }
  async restore() {                                  // (how many buildings Apple says are owned; -1: Apple not heard)
    if (!this.on || this.busy) return -1;
    this.busy = true;
    try { const r = await this.S.restore(); if (!r || !Array.isArray(r.ids)) return -1; this.apply(r.ids); return keysOf(r.ids).length + triosOf(r.ids).length + breedsOf(r.ids).length + (r.ids.includes(SHELVES) ? 1 : 0); } catch (e) { return -1; } finally { this.busy = false; }
  }
}
