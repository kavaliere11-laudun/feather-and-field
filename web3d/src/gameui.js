// The game's own screens over the 3D farm (game.js holds the farm): the top bar (level, coins, settings), the welcome
// (language, your farmer), a bird's card, the level, the coins and the settings, as sheets that slide up from the bottom,
// in the 2D game's look. Every text goes through game.t() (English and French); names are set as text, never as HTML.
import { PERS_INFO, MAX_STARS, TRUST_AT, xpFor, TOP_LEVEL, cleanName } from './game.js';

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
    this.x.hidden = modal; this.dim.hidden = !modal; this.sheet.hidden = false;
    this.sheet.classList.toggle('modal', modal); this.sheet.classList.remove('in'); void this.sheet.offsetWidth; this.sheet.classList.add('in');
    return this.body;
  }
  close() { if (this.sheet.hidden) return; this.sheet.hidden = true; this.dim.hidden = true; const k = this.kind; this.kind = null; this.bird = null; if (this.o.onClose) this.o.onClose(k); }
  get isOpen() { return !this.sheet.hidden; }
  // ---- the welcome: language, your farmer (him or her, a name), start
  // the welcome picture over the top of the screen (the farmer, hens of every breed, the geese and the dog: main.js ?poster),
  // with the game's name; the welcome sheet below it
  hero(on) {
    if (!this.heroEl) {
      this.heroEl = el('div', 'ghero');
      const img = el('img'); img.alt = ''; img.decoding = 'async'; img.addEventListener('load', () => img.classList.add('on')); img.src = 'welcome.jpg' + (this.o.bust || '');      // (fading in once it's there)
      this.heroLogo = el('div', 'glogo'); this.heroTag = el('div', 'gtag');
      this.heroEl.append(img, this.heroLogo); this.heroLogo.after(this.heroTag);
      document.body.append(this.heroEl);
    }
    this.heroLogo.textContent = this.t('brand'); this.heroTag.textContent = this.t('tagline');
    this.heroEl.hidden = !on;
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
    // where and since when
    const where = coop ? (coop.tier === 0 && !coop.name ? this.t('coop_rustic', { coop: g.coopName(coop) }) : g.coopName(coop)) : '';
    body.append(el('p', 'gnote', this.t('lives_in', { coop: where })));
    const date = new Date(b.since).toLocaleDateString(g.lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    body.append(el('p', 'gnote', this.t('since', { date })));
  }
  levelSheet() {
    const g = this.g, L = g.level, d = g.data;
    const b = this.open('level', this.t('level_title', { n: L }));
    if (L >= TOP_LEVEL) { b.append(el('p', 'gtext', this.t('level_top'))); return; }
    const lo = xpFor(L), hi = xpFor(L + 1);
    const bar = el('div', 'gbar-xp'); const fill = el('div', 'gbar-fill'); fill.style.width = Math.round(100 * (d.xp - lo) / Math.max(1, hi - lo)) + '%'; bar.append(fill);
    b.append(bar, el('p', 'gtext', this.t('level_xp', { xp: d.xp - lo, need: hi - lo, next: L + 1 })), el('p', 'gnote', this.t('level_how')));
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
