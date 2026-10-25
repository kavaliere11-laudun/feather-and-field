// The game's own screens over the 3D farm (game.js holds the farm): the top bar (level, coins, settings), the welcome
// (language, your farmer), a bird's card, the level, the coins and the settings, as sheets that slide up from the bottom,
// in the 2D game's look. Every text goes through game.t() (English and French); names are set as text, never as HTML.
import { PERS_INFO, MAX_STARS, TRUST_AT, xpFor, TOP_LEVEL, cleanName } from './game.js';

// the welcome picture (main.js ?poster, posterpic.mjs): its size, and the part of it that must always show, as fractions
// of it (left, top, right, bottom): from the farmer to the Legbar, from the Silkie on his hat to the hens' feet. It's wide
// with grass to spare on every side, so it can be fitted to any screen, upright or sideways.
const SIDEWAYS = '(orientation: landscape) and (min-aspect-ratio: 5/4)';      // (as index.html: the welcome as a card on the right)
export const HERO = { w: 3300, h: 1500, key: [0.262, 0.285, 0.642, 0.79] };

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

export class GameUI {
  constructor(game, o = {}) {
    this.g = game; this.o = o;                         // o: { onClose(), version, reload() }
    this.bar = el('header', 'gbar');
    this.lvl = el('button', 'gpill glvl'); this.lvl.type = 'button';
    this.ring = el('span', 'gring'); this.lvlNum = el('span', 'gnum');
    this.lvl.append(this.ring, this.lvlNum);
    this.coins = el('button', 'gpill'); this.coins.type = 'button';
    this.coinNum = el('span', 'gnum'); this.coins.append(el('span', 'gcoin'), this.coinNum);
    this.gear = el('button', 'gicon'); this.gear.type = 'button';
    this.gear.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>';
    this.brand = el('div', 'gbrand');
    this.bar.append(this.brand, this.lvl, this.coins, this.gear);
    this.bar.hidden = true;
    document.body.append(this.bar);
    // the sheet
    this.sheet = el('section', 'gsheet'); this.sheet.hidden = true; this.sheet.setAttribute('role', 'dialog');
    const head = el('div', 'gsheet-head');
    this.title = el('h2'); this.x = el('button', 'gicon gx'); this.x.type = 'button';
    this.x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    head.append(this.title, this.x);
    this.body = el('div', 'gsheet-body');
    this.sheet.append(head, this.body);
    this.dim = el('div', 'gdim'); this.dim.hidden = true;
    document.body.append(this.dim, this.sheet);
    this.x.addEventListener('click', () => this.close());
    this.lvl.addEventListener('click', () => this.levelSheet());
    this.coins.addEventListener('click', () => this.coinSheet());
    this.gear.addEventListener('click', () => this.settings());
    this.kind = null;
    // opened from the Home Screen: the page runs under the clock (the picture's top only lightly shaded there)
    if (navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)) document.documentElement.classList.add('standalone');
    const refit = () => this.fitHero();
    addEventListener('resize', refit); addEventListener('orientationchange', () => setTimeout(refit, 250));
    if (window.visualViewport) visualViewport.addEventListener('resize', refit);
    if (window.ResizeObserver) new ResizeObserver(refit).observe(this.sheet);
  }
  t(k, v, f) { return this.g.t(k, v, f); }
  // ---- the top bar
  refresh() {
    const d = this.g.data; if (!d) return;
    const L = this.g.level, lo = xpFor(L), hi = xpFor(L + 1);
    this.brand.textContent = this.t('brand');
    this.lvlNum.textContent = L; this.lvl.setAttribute('aria-label', this.t('level') + ' ' + L);
    this.ring.style.setProperty('--p', L >= TOP_LEVEL ? 100 : Math.round(100 * (d.xp - lo) / Math.max(1, hi - lo)));
    this.coinNum.textContent = d.coins.toLocaleString(this.g.lang === 'fr' ? 'fr-FR' : 'en-GB');
    this.coins.setAttribute('aria-label', this.t('coins') + ' ' + d.coins);
    this.gear.setAttribute('aria-label', this.t('settings')); this.x.setAttribute('aria-label', this.t('close'));
  }
  showBar() { this.refresh(); this.bar.hidden = false; }
  // ---- sheets
  open(kind, title, modal = false) {
    this.kind = kind; this.title.textContent = title; this.body.replaceChildren();
    this.x.hidden = modal; this.dim.hidden = !modal; this.sheet.hidden = false; document.body.classList.add('gopen');
    this.sheet.classList.toggle('modal', modal); this.sheet.classList.toggle('gcongrats', kind === 'congrats'); document.body.classList.toggle('gcong', kind === 'congrats'); this.sheet.classList.remove('in'); void this.sheet.offsetWidth; this.sheet.classList.add('in');
    return this.body;
  }
  close() {
    if (this.sheet.hidden) return;
    if (this.kind === 'congrats' && this.news) { this.g.seenNews(this.news); this.news = null; this.refresh(); this.bumpCoins(); }      // (seen: it won't show again)
    if (this.kind === 'levelup' && this.levelShown) { this.g.seenLevel(); this.levelShown = 0; }
    this.sheet.hidden = true; document.body.classList.remove('gcong'); this.dim.hidden = true; document.body.classList.remove('gopen'); const k = this.kind; this.kind = null; this.bird = null; if (this.o.onClose) this.o.onClose(k); }
  get isOpen() { return !this.sheet.hidden; }
  // ---- the welcome: language, your farmer (him or her, a name), start
  // the welcome picture over the top of the screen (the farmer, hens of every breed, the geese and the dog: main.js ?poster),
  // with the game's name; the welcome sheet below it
  hero(on) {
    if (!this.heroEl) {
      this.heroEl = el('div', 'ghero');
      const img = this.heroImg = el('img'); img.alt = ''; img.decoding = 'async';
      img.addEventListener('load', () => { this.fitHero(); img.classList.add('on'); }); img.src = 'welcome.jpg' + (this.o.bust || '');      // (fading in once it's there)
      this.heroLogo = el('div', 'glogo'); this.heroTag = el('div', 'gtag');
      this.heroEl.append(img, this.heroLogo); this.heroLogo.after(this.heroTag);
      document.body.append(this.heroEl);
    }
    this.heroLogo.textContent = this.t('brand'); this.heroTag.textContent = this.t('tagline');
    this.heroEl.hidden = !on;
    document.documentElement.classList.toggle('gwelcoming', on);      // (the page's colour then the picture's top: Safari paints its bars in it)
    if (on) this.fitHero();
  }
  // the picture as big as it can be with all of its main part (HERO.key) in the open space: under the game's name and above
  // the welcome sheet (upright), or beside the card (sideways); centred there, and always covering the screen behind
  fitHero() {
    const H = this.heroEl, img = this.heroImg;
    if (!H || H.hidden || !img) return;
    const W = H.clientWidth, Ht = H.clientHeight; if (!W || !Ht) return;
    const S = this.sheet, side = !S.hidden && !!window.matchMedia && matchMedia(SIDEWAYS).matches;     // (the card on the right)
    const top = this.heroTag.offsetTop + this.heroTag.offsetHeight + 6, left = parseFloat(getComputedStyle(H).paddingLeft) || 0;     // (clear of a notch, sideways)
    const bottom = side || S.hidden ? Ht - 8 : S.offsetTop - 8, right = side ? S.offsetLeft - 8 : W;
    // how far down the picture must reach: under the sheet's round corners, or to the bottom when the sheet doesn't fill the width
    const cover = side || S.hidden || S.offsetWidth < W - 2 ? Ht : Math.min(Ht, S.offsetTop + 32);
    const [x0, y0, x1, y1] = HERO.key, kw = (x1 - x0) * HERO.w, kh = (y1 - y0) * HERO.h;
    let k = Math.min((right - left) / kw, Math.max(60, bottom - top) / kh, 1);    // (never bigger than it was drawn)
    k = Math.max(k, W / HERO.w, cover / HERO.h);
    const iw = HERO.w * k, ih = HERO.h * k;
    let x = (left + right) / 2 - (x0 + x1) / 2 * iw, y = (top + bottom) / 2 - (y0 + y1) / 2 * ih;
    // (sideways the picture need only reach under the card's edge: past it the card covers it, round it the grass colour)
    const reach = side ? Math.min(W, S.offsetLeft + 40) : W;
    x = Math.min(0, Math.max(reach - iw, x)); y = Math.min(0, Math.max(cover - ih, y));
    Object.assign(img.style, { width: iw + 'px', height: ih + 'px', left: x + 'px', top: y + 'px' });
    this.heroFit = { k: +k.toFixed(4), x: Math.round(x), y: Math.round(y), side, open: [0, Math.round(top), Math.round(right), Math.round(bottom)] };
  }
  welcome() {
    return new Promise(resolve => {
      let look = 'm', typed = '';
      const draw = () => {
        this.hero(true);
        const b = this.open('welcome', this.t('welcome_title'), true);
        this.dim.hidden = true; this.sheet.classList.add('gwelcome');
        b.append(el('p', 'gtext', this.t('welcome_body')));
        const langRow = el('div', 'grow');
        langRow.append(el('span', 'glabel', this.t('lang')));
        const chips = el('div', 'gchips');
        for (const [l, name] of [['en', 'English'], ['fr', 'Français']]) {
          const c = el('button', 'gchip' + (this.g.lang === l ? ' on' : ''), name); c.type = 'button';
          c.addEventListener('click', () => { if (this.g.lang !== l) { this.g.lang = l; draw(); } });
          chips.append(c);
        }
        langRow.append(chips); b.append(langRow);
        b.append(el('div', 'glabel gsec', this.t('your_farmer')));
        const who = el('div', 'gchips gwho');
        const lookBtns = [['m', '👨‍🌾', this.t('him')], ['f', '👩‍🌾', this.t('her')]].map(([k, icon, word]) => {
          const c = el('button', 'gchip gbig' + (look === k ? ' on' : '')); c.type = 'button';
          c.append(el('span', 'gemoji', icon), el('span', null, word));
          c.addEventListener('click', () => { look = k; lookBtns.forEach(x => x.classList.toggle('on', x === c)); input.placeholder = this.g.defaultFarmer(look); });
          who.append(c); return c;
        });
        b.append(who);
        const lab = el('label', 'glabel', this.t('name')); lab.htmlFor = 'gname';
        const input = el('input', 'ginput'); input.id = 'gname'; input.type = 'text'; input.maxLength = 20; input.autocomplete = 'off';
        input.setAttribute('autocapitalize', 'words'); input.spellcheck = false; input.placeholder = this.g.defaultFarmer(look); input.enterKeyHint = 'done'; input.value = typed;
        input.addEventListener('input', () => { typed = input.value; });
        b.append(lab, input);
        const go = el('button', 'gbtn', this.t('start')); go.type = 'button';
        go.addEventListener('click', () => { const name = cleanName(input.value); this.sheet.classList.remove('gwelcome'); this.hero(false); this.close(); resolve({ lang: this.g.lang, look, name }); });
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
        b.append(go);
        this.fitHero();
      };
      draw();
    });
  }
  // ---- a bird's card: who she is, her personality, experience and trust, where she lives
  birdCard(b) {
    const g = this.g, f = b.sex === 'h', coop = g.coop(b.coop);
    const body = this.open('bird', b.name);
    this.bird = b.id;
    body.append(el('p', 'gsub', g.breedName(b.breed) + ' · ' + this.t(f ? 'hen' : 'rooster')));
    const forever = el('p', 'gforever'); forever.append(el('span', 'gheart', '♥'), document.createTextNode(' ' + this.t(f ? 'forever_h' : 'forever_r'))); body.append(forever);
    // personality
    const pc = el('div', 'gcard');
    const ph = el('div', 'gcard-h'); ph.append(el('span', 'gemoji', PERS_INFO[b.pers].icon), el('span', 'gcard-t', g.persName(b.pers, b.sex)));
    pc.append(el('div', 'glabel', this.t('personality')), ph, el('p', 'gtext', g.persLine(b.pers, b.sex)));
    body.append(pc);
    // experience
    const ec = el('div', 'gcard'), s = g.stars(b);
    const st = el('div', 'gstars'); st.setAttribute('aria-label', s + ' / ' + MAX_STARS);
    for (let i = 0; i < MAX_STARS; i++) st.append(el('span', i < s ? 'on' : '', i < s ? '★' : '☆'));
    ec.append(el('div', 'glabel', this.t('experience')), st);
    if (!s) ec.append(el('p', 'gtext', this.t('exp_none', {}, f)));
    body.append(ec);
    // trust
    const tc = el('div', 'gcard'), lv = g.trustLevel(b);
    const th = el('div', 'gcard-h');
    const hearts = el('span', 'ghearts'); for (let i = 1; i <= 3; i++) hearts.append(el('span', i <= lv ? 'on' : '', i <= lv ? '♥' : '♡'));
    th.append(hearts, el('span', 'gcard-t', this.t('trust_lv' + lv)));
    tc.append(el('div', 'glabel', this.t('trust')), th, el('p', 'gtext', this.t('trust_body')));
    body.append(tc);
    // her eggs, or her brood
    if (f && coop) {
      const kc = el('div', 'gcard'), br = coop.brood && coop.brood.hen === b.id ? coop.brood : null, now = Date.now();
      kc.append(el('div', 'glabel', this.t('eggs')));
      if (br && !br.hatched) { const ms = g.hatchAt(coop) - now; kc.append(el('p', 'gtext', ms < 1800e3 ? this.t('hatch_soon', { n: br.n }) : this.t('sitting', { n: br.n, when: g.howLong(ms) }))); }
      else if (br && now < g.youngAt(coop)) kc.append(el('p', 'gtext', this.t('raising', { n: br.n, when: g.howLong(Math.max(60e3, g.youngAt(coop) - now)) })));
      else if (br) { const ms = g.grownAt(coop) - now; kc.append(el('p', 'gtext', ms < 1800e3 ? this.t('grow_soon', { n: br.n }) : this.t('raising_y', { n: br.n, when: g.howLong(ms) }))); }
      kc.append(el('p', br ? 'gnote' : 'gtext', br ? this.t('no_lay_brood') : this.t('lays', { p: g.eggPrice(coop) })));
      body.append(kc);
    }
    // where and since when
    const where = coop ? (coop.tier === 0 && !coop.name ? this.t('coop_rustic', { coop: g.coopName(coop) }) : g.coopName(coop)) : '';
    body.append(el('p', 'gnote', this.t('lives_in', { coop: where })));
    const date = new Date(b.since).toLocaleDateString(g.lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    body.append(el('p', 'gnote', this.t('since', { date })));
  }
  // ---- a chick: whose she is, when she's grown and off to a new farm
  chickCard(name, coop, mum, ms) {
    const g = this.g, body = this.open('chick', name);
    this.bird = null;
    body.append(el('p', 'gsub', this.t('chick_of', { breed: g.breedName(coop.breed), name: mum ? mum.name : '' })));
    const cc = el('div', 'gcard');
    cc.append(el('div', 'glabel', this.t('chick')), el('p', 'gtext', ms > 1800e3 ? this.t('chick_grows', { when: g.howLong(ms) }) : this.t('chick_soon')));
    body.append(cc);
  }
  // ---- a young hen or rooster (a day after hatching): whose, when off to a new farm (the rating then: congratsCard)
  youngCard(name, sex, coop, mum, ms) {
    const g = this.g, body = this.open('chick', name), f = sex === 'h';
    this.bird = null;
    body.append(el('p', 'gsub', this.t('young_of', { breed: g.breedName(coop.breed), name: mum ? mum.name : '', kid: this.t(f ? 'daughter' : 'son') })));
    const cc = el('div', 'gcard'), ch = el('div', 'gcard-h');
    ch.append(el('span', 'gemoji', f ? '🐔' : '🐓'), el('span', 'gcard-t', this.t(f ? 'young_h' : 'young_r')));
    cc.append(ch, el('p', 'gtext', ms > 1800e3 ? this.t(f ? 'young_leaves' : 'young_leaves_r', { when: g.howLong(ms) }) : this.t('young_soon')));
    body.append(cc);
  }
  // ---- congratulations: a brood grown up and gone to a new farm (game.js news): each young hen and rooster with its rating
  // and coins, the total, and the parents' experience (better chicks next time). Seen when it's closed
  congratsCard(n, away) {
    const g = this.g, mum = g.bird(n.hen), dad = n.dad ? g.bird(n.dad) : null, body = this.open('congrats', '🎉 ' + this.t('congrats'));
    this.bird = null; this.news = n;
    body.append(el('p', 'gsub', this.t(away ? 'congrats_away' : 'congrats_sub', { name: mum ? mum.name : '' })));
    const list = el('div', 'gcard gkids');
    for (const k of n.kids) {
      const row = el('div', 'gkid'), st = el('span', 'gstars gsmall');
      st.setAttribute('aria-label', k.stars + ' / ' + MAX_STARS);
      for (let i = 0; i < MAX_STARS; i++) st.append(el('span', i < k.stars ? 'on' : '', i < k.stars ? '★' : '☆'));
      const c = el('span', 'gkid-c'); c.append(el('span', 'gcoin gcoin-s'), document.createTextNode('+' + k.coins));
      row.append(el('span', 'gemoji', k.sex === 'h' ? '🐔' : '🐓'), el('span', 'gkid-t', this.t(k.sex === 'h' ? 'young_h' : 'young_r')), st, c);
      list.append(row);
    }
    body.append(list, el('p', 'gtotal', this.t('congrats_total', { c: n.coins, xp: n.xp })));
    if (mum) body.append(el('p', 'gnote', dad ? this.t('congrats_exp', { mum: mum.name, dad: dad.name }) : this.t('congrats_exp1', { mum: mum.name })));
    const ok = el('button', 'gbtn', this.t('congrats_ok')); ok.type = 'button';
    ok.addEventListener('click', () => this.close());
    body.append(ok);
  }
  // ---- a coop's feeder: how full, how long it lasts, fill it (main.js sends the farmer)
  feederSheet(coop, onFill) {
    const g = this.g, q = g.fillQuote(coop), left = g.feedLeft(coop), h = g.feedHours(coop);
    const b = this.open('feeder', this.t('feeder_title', { coop: g.coopName(coop) }));
    this.feederCoop = coop.id;
    const pct = Math.round(left * 100);
    const bar = el('div', 'gbar-xp gfeedbar' + (left < 0.25 ? ' low' : '')); const fill = el('div', 'gbar-fill'); fill.style.width = Math.max(0, Math.min(100, pct)) + '%'; bar.append(fill);
    b.append(el('p', 'gtext gfeedpct', pct >= 99 ? this.t('feed_full') : pct <= 0 ? this.t('feed_empty') : this.t('feed_pct', { p: pct })), bar);
    b.append(el('p', 'gtext', left <= 0 ? this.t('feed_empty_line') : h >= 47 ? this.t('feed_days') : h < 1.5 ? this.t('feed_hour') : this.t('feed_hours', { h: Math.round(h) })));
    b.append(el('p', 'gnote', this.t('feed_how')));
    const go = el('button', 'gbtn', q.full ? this.t('fill_full') : q.broke ? this.t('fill_broke') : q.scraps ? this.t('fill_scraps') : this.t(q.partial ? 'fill_part' : 'fill_btn', { c: q.cost }));
    go.type = 'button'; go.disabled = !!(q.full || q.broke); if (go.disabled) go.classList.add('galt');
    go.addEventListener('click', () => { if (!go.disabled) onFill(); });
    b.append(go);
  }
  // ---- eggs flying from the nest to the coins, then the coins counted up
  flyEggs(from, n, colour, done) {
    const to = this.coins.getBoundingClientRect(), tx = to.left + 18, ty = to.top + to.height / 2;
    const k = Math.max(1, Math.min(6, n)); let left = k;
    for (let i = 0; i < k; i++) {
      const e = el('div', 'gegg'); e.style.background = colour; e.style.left = (from.x - 9) + 'px'; e.style.top = (from.y - 11) + 'px'; document.body.append(e);
      const dx = tx - from.x, dy = ty - from.y, lift = -40 - 20 * (i % 3);
      const a = e.animate ? e.animate([
        { transform: 'translate(0,0) scale(0.6) rotate(0deg)', opacity: 0 },
        { transform: `translate(${dx * 0.35}px,${dy * 0.35 + lift}px) scale(1.15) rotate(${i % 2 ? 40 : -40}deg)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${dx}px,${dy}px) scale(0.55) rotate(${i % 2 ? 120 : -120}deg)`, opacity: 0.9 }],
        { duration: 720, delay: i * 90, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'both' }) : null;
      const end = () => { e.remove(); if (--left === 0) { this.refresh(); this.bumpCoins(); if (done) done(); } };
      if (a) a.onfinish = end; else setTimeout(end, 720 + i * 90);
    }
  }
  bumpCoins() { this.coins.classList.remove('gbump'); void this.coins.offsetWidth; this.coins.classList.add('gbump'); }
  levelSheet() {
    const g = this.g, L = g.level, d = g.data;
    const b = this.open('level', this.t('level_title', { n: L }));
    if (L >= TOP_LEVEL) { b.append(el('p', 'gtext', this.t('level_top'))); return; }
    const lo = xpFor(L), hi = xpFor(L + 1);
    const bar = el('div', 'gbar-xp'); const fill = el('div', 'gbar-fill'); fill.style.width = Math.round(100 * (d.xp - lo) / Math.max(1, hi - lo)) + '%'; bar.append(fill);
    b.append(bar, el('p', 'gtext', this.t('level_xp', { xp: d.xp - lo, need: hi - lo, next: L + 1 })), el('p', 'gnote', this.t('level_how')));
    // the land: how much, and what the next level brings
    const n = g.landNext(), lc = el('div', 'gcard'), lh = el('div', 'gcard-h');
    lh.append(el('span', 'gemoji', '🌱'), el('span', 'gcard-t', d.land.length === 1 ? this.t('land_count1') : this.t('land_count', { n: d.land.length })));
    lc.append(lh, el('p', 'gtext', !n ? this.t('land_all') : g.level >= n.level ? this.t('land_new', { c: n.price }) : this.t('level_next_land', { n: n.level })));
    b.append(lc);
  }
  // ---- a new level: what it brings (the next patch of land for sale; onShow: the view to it, the player's tap)
  levelUpCard(L, sale, onShow) {
    const body = this.open('levelup', '🎉 ' + this.t('level_up', { n: L }));
    this.bird = null; this.levelShown = L;
    body.append(el('p', 'gsub', this.t('level_up_sub')));
    const ring = el('div', 'glevelbig'); ring.append(el('span', null, String(L))); body.append(ring);
    if (sale) {
      const c = el('div', 'gcard'), h = el('div', 'gcard-h');
      h.append(el('span', 'gemoji', '🌱'), el('span', 'gcard-t', this.t('level_new')));
      c.append(h, el('p', 'gtext', this.t('land_new', { c: sale.price })));
      body.append(c);
      const go = el('button', 'gbtn', this.t('land_show')); go.type = 'button';
      go.addEventListener('click', () => { this.close(); if (onShow) onShow(); });
      body.append(go);
    } else {
      const ok = el('button', 'gbtn', this.t('congrats_ok')); ok.type = 'button'; ok.addEventListener('click', () => this.close()); body.append(ok);
    }
  }
  // ---- a patch of land for sale: buy it (onBuy), or not enough coins yet; or one of your own, bare and ready
  landCard(n, onBuy) {
    const g = this.g, body = this.open('land', this.t('land_title'));
    this.bird = null;
    body.append(el('p', 'gtext', this.t('land_body')));
    const broke = g.data.coins < n.price, go = el('button', 'gbtn' + (broke ? ' galt' : ''), broke ? this.t('land_broke', { c: n.price }) : this.t('land_buy', { c: n.price }));
    go.type = 'button'; go.disabled = broke;
    go.addEventListener('click', () => { if (!go.disabled) onBuy(); });
    body.append(go);
  }
  ownLandCard() {
    const body = this.open('land', this.t('land_mine'));
    this.bird = null;
    body.append(el('p', 'gtext', this.t('land_mine_body')));
  }
  coinSheet() {
    const b = this.open('coins', this.t('coins') + ' · ' + this.g.data.coins.toLocaleString(this.g.lang === 'fr' ? 'fr-FR' : 'en-GB'));
    b.append(el('p', 'gtext', this.t('coins_body')));
  }
  settings() {
    const g = this.g, b = this.open('settings', this.t('settings'));
    const langRow = el('div', 'grow'); langRow.append(el('span', 'glabel', this.t('settings_lang')));
    const chips = el('div', 'gchips');
    for (const [l, name] of [['en', 'English'], ['fr', 'Français']]) {
      const c = el('button', 'gchip' + (g.lang === l ? ' on' : ''), name); c.type = 'button';
      c.addEventListener('click', () => { if (g.lang !== l) { g.setLang(l); if (this.o.reload) this.o.reload(); } });
      chips.append(c);
    }
    langRow.append(chips); b.append(langRow);
    b.append(el('p', 'gnote', this.t('saved_here')));
    if (g.edited) b.append(el('p', 'gnote gwarn', this.t('settings_edited')));
    let sure = false;
    const fresh = el('button', 'gbtn galt', this.t('settings_new')); fresh.type = 'button';
    fresh.addEventListener('click', () => {
      if (!sure) { sure = true; fresh.textContent = this.t('settings_new_sure'); fresh.classList.add('gdanger'); setTimeout(() => { sure = false; fresh.textContent = this.t('settings_new'); fresh.classList.remove('gdanger'); }, 4000); return; }
      g.wipe(); if (this.o.reload) this.o.reload();
    });
    b.append(fresh);
    if (this.o.version) b.append(el('p', 'gnote gver', this.t('settings_version', { v: this.o.version })));
  }
}
