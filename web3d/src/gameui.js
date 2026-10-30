// The game's own screens over the 3D farm (game.js holds the farm): the top bar (level, coins, settings), the welcome
// (language, your farmer), a bird's card, the level, the coins and the settings, as sheets that slide up from the bottom,
// in the 2D game's look. Every text goes through game.t() (English and French); names are set as text, never as HTML.
import { READY, LANG_NAME } from './lang.js';
import { PERS_INFO, MAX_STARS, TRUST_AT, xpFor, TOP_LEVEL, cleanName, SHOWS, SHOW_TIERS, DECOR, decorXp, ANIMALS, animalXp, OUTFITS, outfitXp, WHEAT, HONEY, rarePrice, RARE, FOX, UPGRADES, DRESSES, dressXp, inSeason, FISHING, FISH_IDS, FISH_RULES, fishPrice } from './game.js';

// the welcome picture (main.js ?poster, posterpic.mjs): its size, and the part of it that must always show, as fractions
// of it (left, top, right, bottom): from the farmer to the Legbar, from the Silkie on his hat to the hens' feet. It's wide
// with grass to spare on every side, so it can be fitted to any screen, upright or sideways.
// the first Feather & Field's save on this phone (since the switch, 26 Oct 2026, the first game lives in the site's classic/
// folder and the 3D game at the usual address): only whether it's there, to offer the way to it; never read or changed here
const FIRST_SAVE = 'feather-field-save-v1';
function firstGameKept() { try { return !!localStorage.getItem(FIRST_SAVE); } catch (e) { return false; } }
const SIDEWAYS = '(orientation: landscape) and (min-aspect-ratio: 5/4)';      // (as index.html: the welcome as a card on the right)
export const HERO = { w: 3300, h: 1500, key: [0.262, 0.285, 0.642, 0.79] };
// the little barn (as on Your coops' button): the Breed Book's coop lines
const BARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5L12 4l9 7.5"/><path d="M5.5 9.8V20h13V9.8"/><path d="M9.5 20v-5.5h5V20"/><path d="M9.5 14.5l5 5.5M14.5 14.5l-5 5.5"/></svg>';

// a rosette (the shows): its colour by place (1st red, 2nd blue, 3rd yellow; a champion's red, white and blue), a fixed
// drawing (nothing of the save goes in it)
const ROS_COL = ['#d63c3c', '#2f6fd0', '#e7b521'];
function rosette(place, champ = false) {
  const c = ROS_COL[place - 1] || '#9aa59a', mid = champ ? '<circle cx="12" cy="10" r="5.6" fill="#fff"/><circle cx="12" cy="10" r="3.6" fill="#2f6fd0"/>' : '<circle cx="12" cy="10" r="4.2" fill="#fff8e6"/><circle cx="12" cy="10" r="4.2" fill="none" stroke="' + c + '" stroke-width="0.9"/>';
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.3 13.5L5.6 23l3.3-1.6 1.9 2.4 1.6-9.6z" fill="' + (champ ? '#2f6fd0' : c) + '"/><path d="M15.7 13.5l2.7 9.5-3.3-1.6-1.9 2.4-1.6-9.6z" fill="' + c + '"/>' +
    '<circle cx="12" cy="10" r="8.2" fill="' + c + '"/><circle cx="12" cy="10" r="7.4" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="1.5" stroke-dasharray="1.9 1.5"/>' + mid + '</svg>';
}
const JOB_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4.5" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5"/><path d="M8.5 10.5l1.6 1.6 3-3M8.5 16.5l1.6 1.6 3-3M15 11h1.5M15 17h1.5"/></svg>';
const ROS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><circle cx="12" cy="9" r="2.4"/><path d="M8.9 14.1L7.4 21.5l2.9-1.4 1.7 2M15.1 14.1l1.5 7.4-2.9-1.4-1.7 2"/></svg>';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

// the language picker (the welcome, Settings): the languages as chips while there are few, a list once there are more (a
// phone shows its own picker: six chips wouldn't fit a welcome held sideways)
function langPicker(cur, pick) {
  if (READY.length <= 3) {
    const chips = el('div', 'gchips');
    for (const l of READY) {
      const c = el('button', 'gchip' + (cur === l ? ' on' : ''), LANG_NAME[l]); c.type = 'button'; c.lang = l;
      c.addEventListener('click', () => { if (cur !== l) pick(l); });
      chips.append(c);
    }
    return chips;
  }
  const sel = el('select', 'gchip gselect'); sel.setAttribute('aria-label', 'Language');
  for (const l of READY) { const o = el('option', '', LANG_NAME[l]); o.value = l; o.lang = l; if (l === cur) o.selected = true; sel.append(o); }
  sel.addEventListener('change', () => { if (sel.value !== cur) pick(sel.value); });
  return sel;
}
// the third onboarding picture has words in it (the sale sign): its own picture in each language (intropics.mjs)
const INTRO_PIC = ['fr', 'de', 'es', 'pt', 'it'];

export class GameUI {
  constructor(game, o = {}) {
    this.g = game; this.o = o;                         // o: { onClose(), version, reload() }
    this.bar = el('header', 'gbar');
    this.lvl = el('button', 'gpill glvl'); this.lvl.type = 'button';
    this.ring = el('span', 'gring'); this.lvlNum = el('span', 'gnum');
    this.lvl.append(this.ring, this.lvlNum);
    this.coins = el('button', 'gpill'); this.coins.type = 'button';
    this.coinNum = el('span', 'gnum'); this.coins.append(el('span', 'gcoin'), this.coinNum);
    this.gear = el('button', 'gicon ggear'); this.gear.type = 'button';
    this.gear.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>';
    // Your coops: a little barn, with a red dot when a new breed's coop is waiting to be placed
    this.coopsBtn = el('button', 'gicon gcoops'); this.coopsBtn.type = 'button';
    this.coopsBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5L12 4l9 7.5"/><path d="M5.5 9.8V20h13V9.8"/><path d="M9.5 20v-5.5h5V20"/><path d="M9.5 14.5l5 5.5M14.5 14.5l-5 5.5"/></svg>';
    this.dot = el('span', 'gdot'); this.dot.hidden = true; this.coopsBtn.append(this.dot);
    // Shows: a rosette, with a red dot when a new show is open (and not looked at yet today) or results are waiting
    this.showsBtn = el('button', 'gicon gshows'); this.showsBtn.type = 'button'; this.showsBtn.innerHTML = ROS_ICON;
    this.sdot = el('span', 'gdot'); this.sdot.hidden = true; this.showsBtn.append(this.sdot);
    // Today's jobs: a clipboard, with the number of rewards to collect (or a dot: today's jobs not looked at yet)
    this.jobsBtn = el('button', 'gicon gjobs'); this.jobsBtn.type = 'button'; this.jobsBtn.innerHTML = JOB_ICON;
    this.jdot = el('span', 'gdot gcount'); this.jdot.hidden = true; this.jobsBtn.append(this.jdot);
    this.brand = el('div', 'gbrand');
    this.bar.append(this.brand, this.lvl, this.coins, this.jobsBtn, this.showsBtn, this.coopsBtn, this.gear);
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
    this.coins.addEventListener('click', () => { if (this.o.shop) this.o.shop(); else this.coinSheet(); });
    this.gear.addEventListener('click', () => this.settings());
    this.coopsBtn.addEventListener('click', () => { if (this.o.coops) this.o.coops(); });
    this.showsBtn.addEventListener('click', () => { if (this.o.shows) this.o.shows(); });
    this.jobsBtn.addEventListener('click', () => { if (this.o.jobs) this.o.jobs(); });
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
    this.coinNum.textContent = d.coins.toLocaleString(this.g.locale());
    this.coins.setAttribute('aria-label', this.t('coins') + ' ' + d.coins);
    this.gear.setAttribute('aria-label', this.t('settings')); this.x.setAttribute('aria-label', this.t('close'));
    const waiting = this.g.waitingCoops().length > 0 || this.g.rareWaiting().length > 0;      // (a new breed's coop, or a rare baby for your choice)
    this.dot.hidden = !waiting; this.coopsBtn.setAttribute('aria-label', this.t('coops_aria') + (waiting ? ' · ' + this.t('coops_waiting') : ''));
    const jr = this.g.jobsReady(), jn = !this.g.jobs().seen;
    this.jdot.hidden = !jr && !jn; this.jdot.textContent = jr ? String(jr) : ''; this.jdot.classList.toggle('gnum1', jr > 0);
    this.jobsBtn.setAttribute('aria-label', this.t('jobs_aria') + (jr ? ' · ' + this.t('jobs_ready', { n: jr }) : jn ? ' · ' + this.t('jobs_new') : ''));
    const sd = this.g.showsDot(); this.sdot.hidden = !sd; this.showsBtn.setAttribute('aria-label', this.t('shows_aria') + (sd ? ' · ' + this.t('shows_new') : ''));
  }
  showBar() { this.refresh(); this.bar.hidden = false; }
  // ---- sheets
  open(kind, title, modal = false) {
    if (this.twoResolve && kind !== 'twofarms') { const r = this.twoResolve; this.twoResolve = null; r(null); }      // (the two farms' choice not made: asked again later)
    this.kind = kind; this.title.textContent = title; this.body.replaceChildren();
    this.x.hidden = modal; this.dim.hidden = !modal; this.sheet.hidden = false; document.body.classList.add('gopen');
    this.sheet.classList.toggle('modal', modal); this.sheet.classList.toggle('gcongrats', kind === 'congrats' || kind === 'showres'); document.body.classList.toggle('gcong', kind === 'congrats' || kind === 'showres'); this.sheet.classList.remove('in'); void this.sheet.offsetWidth; this.sheet.classList.add('in');
    this.sheet.classList.toggle('gbook', kind === 'book');          // (the Breed Book: a taller sheet, upright)
    this.sheet.classList.toggle('gintro', kind === 'intro');
    return this.body;
  }
  close() {
    if (this.sheet.hidden) return;
    if (this.twoResolve) { const r = this.twoResolve; this.twoResolve = null; r(null); }
    if (this.kind === 'congrats' && this.news) { this.g.seenNews(this.news); this.news = null; this.refresh(); this.bumpCoins(); }      // (seen: it won't show again)
    if (this.kind === 'levelup' && this.levelShown) { this.g.seenLevel(); this.levelShown = 0; }
    if (this.kind === 'showres') { this.g.seenShows(); this.refresh(); this.bumpCoins(); }
    if (this.kind === 'fish' && this.fishThen) { const f = this.fishThen; this.fishThen = null; f(this.g.worms() > 0); }      // (closed: on fishing while there are worms)
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
    if (firstGameKept()) this.heroTag.append(el('span', 'gtag-first', this.t('welcome_first')));      // (under the tagline: the picture fits below it)
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
        try { document.documentElement.lang = this.g.lang; } catch (e) { /* */ }      // (the page's language from the start)
        this.dim.hidden = true; this.sheet.classList.add('gwelcome');
        b.append(el('p', 'gtext', this.t('welcome_body')));
        const langRow = el('div', 'grow');
        langRow.append(el('span', 'glabel', this.t('lang')));
        langRow.append(langPicker(this.g.lang, l => { this.g.lang = l; draw(); })); b.append(langRow);
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
        const A = this.o.account;
        // a farm saved online: "Sign in" there brings it to this phone (account.js). Google's sign-in is got ready only
        // once that's tapped (privacy: a new phone's welcome doesn't reach Google by itself), then "Sign in with Google"
        if (A && A.on) {
          const si = el('button', 'glink gwelcome-signin', this.t('welcome_signin')); si.type = 'button';
          si.addEventListener('click', () => {
            const box = el('div', 'gwelcome-acct'), go = el('button', 'gbtn galt gacct-in', this.t('acct_google')); go.type = 'button';
            go.disabled = !A.cloud; if (!A.cloud) A.prepare().then(() => { go.disabled = false; }, () => { go.disabled = false; });
            go.addEventListener('click', () => A.signIn());
            box.append(go, el('p', 'gnote gacct-privacy', this.t('acct_privacy')), this.privacyLink());
            si.replaceWith(box);
            const stop = A.watch(st => { if (!box.isConnected) { stop(); return; } if (st === 'empty') { stop(); box.replaceWith(el('p', 'gnote gwelcome-empty', this.t('acct_empty'))); } });
          });
          b.append(si);
        }
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
    const champ = g.champion(b);
    const duck = g.isDuck(b.breed);      // (a call duck: a duck or the drake)
    body.append(el('p', 'gsub', g.breedName(b.breed) + ' · ' + this.t(duck ? (f ? 'duck' : 'drake') : f ? 'hen' : 'rooster') + (champ ? ' · 🏆 ' + this.t('champ_' + champ, {}, f) : '')));
    const forever = el('p', 'gforever'); forever.append(el('span', 'gheart', '♥'), document.createTextNode(' ' + this.t(f ? 'forever_h' : 'forever_r'))); body.append(forever);
    // a cuddle (or how long she's happy after one; at night, in the morning)
    const left = g.happyLeft(b), state = this.o.cuddleState ? this.o.cuddleState(b) : 'ok';
    if (left > 0) body.append(el('p', 'gtext ghappy', '♥ ' + this.t('happy_left', { when: g.howLong(left) }, f)));
    else if (state === 'night') body.append(el('p', 'gnote', this.t('cuddle_night', { farmer: g.farmerName() })));
    else { const cb = el('button', 'gbtn gcuddle', this.t('cuddle_btn')); cb.type = 'button'; cb.addEventListener('click', () => { if (this.o.cuddle) this.o.cuddle(b.id); }); body.append(cb); }
    // worms (once fishing's open; Audrey's idea): what she finds for the farmer each day, by how much she loves him; "Ask
    // for worms": all of today's at once (given today: more tomorrow; shy: cuddles help; at night: in the morning)
    if (g.fishOpen('pond')) {
      const wn = g.wormsOf(b), farmer = g.farmerName();
      if (g.wormsGiven(b)) body.append(el('p', 'gtext gfound gwormsgot', this.t('worms_given', { name: b.name, farmer })));
      else if (!wn) body.append(el('p', 'gnote gwormsshy', this.t('worms_shy', { name: b.name, farmer })));
      else if (state === 'night') { if (left > 0) body.append(el('p', 'gnote', this.t('worms_night', { farmer }))); }
      else { const wb = el('button', 'gbtn galt gworms', this.t('worms_ask', { n: wn })); wb.type = 'button'; wb.dataset.worms = 'ask'; wb.addEventListener('click', () => { if (this.o.askWorms) this.o.askWorms(b.id); }); body.append(wb); }
    }
    // personality
    const pc = el('div', 'gcard');
    const ph = el('div', 'gcard-h'); ph.append(el('span', 'gemoji', PERS_INFO[b.pers].icon), el('span', 'gcard-t', g.persName(b.pers, b.sex)));
    pc.append(el('div', 'glabel', this.t('personality')), ph, el('p', 'gtext', g.persLine(b.pers, b.sex)));
    body.append(pc);
    // experience: the stars, the way to the next, how they come and what they do
    const ec = el('div', 'gcard'), s = g.stars(b), part = g.starPart(b);
    const st = el('div', 'gstars'); st.setAttribute('aria-label', s + ' / ' + MAX_STARS);
    for (let i = 0; i < MAX_STARS; i++) st.append(el('span', i < s ? 'on' : '', i < s ? '★' : '☆'));
    ec.append(el('div', 'glabel', this.t('experience')), st);
    if (s < MAX_STARS) { const bar = el('div', 'gbar-xp gstarbar'), fill = el('div', 'gbar-fill'); fill.style.width = Math.round(part * 100) + '%'; bar.append(fill); ec.append(bar); }
    ec.append(el('p', 'gtext', !s && part < 0.05 ? this.t('exp_none', {}, f) : s >= MAX_STARS ? this.t('exp_top') : this.t('exp_how')));
    ec.append(el('p', 'gnote', (f ? this.t('exp_eggs', { p: g.henEggPrice(b) }) + ' ' : '') + this.t(duck ? 'exp_ducklings' : 'exp_chicks', {}, f)));
    body.append(ec);
    // trust: the hearts, cuddles to the next level, what it does; a cuddle (or how long she's happy after one)
    const tc = el('div', 'gcard', ), lv = g.trustLevel(b), farmer = g.farmerName();
    const th = el('div', 'gcard-h');
    const hearts = el('span', 'ghearts'); for (let i = 1; i <= 3; i++) hearts.append(el('span', i <= lv ? 'on' : '', i <= lv ? '♥' : '♡'));
    th.append(hearts, el('span', 'gcard-t', this.t('trust_lv' + lv)));
    tc.append(el('div', 'glabel', this.t('trust')), th);
    if (lv < 3) { const need = TRUST_AT[lv + 1] - b.trust; tc.append(el('p', 'gtext', this.t(need === 1 ? 'trust_next1' : 'trust_next', { n: need, level: this.t('trust_lv' + (lv + 1)) }))); }
    if (lv >= 2) tc.append(el('p', 'gtext', this.t('trust_greets', { farmer })));
    tc.append(el('p', 'gnote', this.t('trust_body')));
    if (g.fishOpen('pond')) tc.append(el('p', 'gnote', this.t('worms_how')));
    body.append(tc);
    // shows: her rosettes (by show and place), a champion, the show she's entered in
    const sc = el('div', 'gcard'), ros = g.rosettesOf(b), ent = g.showOf(b.id);
    sc.append(el('div', 'glabel', this.t('rosettes')));
    if (ros.some(n => n > 0)) {
      SHOW_TIERS.forEach((tier, ti) => {
        if (!ros.slice(ti * 3, ti * 3 + 3).some(n => n > 0)) return;
        const row = el('div', 'grosrow'); row.append(el('span', 'grostier', this.t('tier_' + tier)));
        for (let p = 1; p <= 3; p++) { const n = ros[ti * 3 + p - 1]; if (!n) continue; const r = el('span', 'gros'), ic = el('span', 'gros-i'); ic.innerHTML = rosette(p, p === 1 && tier !== 'v'); r.append(ic, el('span', 'gros-n', '×' + n)); r.setAttribute('aria-label', g.place(p, f) + ' ×' + n); row.append(r); }
        sc.append(row);
      });
      if (champ) sc.append(el('p', 'gtext gchamp', '🏆 ' + this.t('champ_' + champ, {}, f)));
    }
    if (ent) sc.append(el('p', 'gtext gfound', this.t('show_card_in', { show: g.showName(ent.id), when: g.howLong(Math.max(60e3, g.showJudgedAt(ent.id) - Date.now())) })));
    else if (!ros.some(n => n > 0)) sc.append(el('p', 'gnote', this.t('ros_none', {}, f)));
    body.append(sc);
    // her eggs, or her brood
    if (f && coop) {
      const kc = el('div', 'gcard'), br = coop.brood && coop.brood.hen === b.id ? coop.brood : null, now = Date.now();
      kc.append(el('div', 'glabel', this.t('eggs')));
      if (br && !br.hatched) { const ms = g.hatchAt(coop) - now; kc.append(el('p', 'gtext', ms < 1800e3 ? this.t('hatch_soon', { n: br.n }) : this.t('sitting', { n: br.n, when: g.howLong(ms) }))); }
      else if (br && now < g.youngAt(coop)) kc.append(el('p', 'gtext', this.t('raising', { n: br.n, when: g.howLong(Math.max(60e3, g.youngAt(coop) - now)) })));
      else if (br) { const ms = g.grownAt(coop) - now; kc.append(el('p', 'gtext', ms < 1800e3 ? this.t('grow_soon', { n: br.n }) : this.t('raising_y', { n: br.n, when: g.howLong(ms) }))); }
      kc.append(el('p', br ? 'gnote' : 'gtext', br ? this.t('no_lay_brood') : this.t(g.baseOf(b.breed) === 'sil' ? 'lays_sil' : 'lays', { p: g.henEggPrice(b) })));
      body.append(kc);
    }
    // where and since when
    const where = coop ? (coop.tier === 0 && !coop.name ? this.t('coop_rustic', { coop: g.coopName(coop) }) : g.coopName(coop)) : '';
    body.append(el('p', 'gnote', this.t('lives_in', { coop: where })));
    const date = new Date(b.since).toLocaleDateString(g.locale(), { day: 'numeric', month: 'long', year: 'numeric' });
    body.append(el('p', 'gnote', this.t('since', { date })));
  }
  // ---- a chick: whose she is, when she's grown and off to a new farm
  chickCard(name, coop, mum, ms, rare) {
    const g = this.g, body = this.open('chick', name);
    this.bird = null;
    body.append(el('p', 'gsub', this.t('chick_of', { breed: g.breedName(coop.breed), name: mum ? mum.name : '' })));
    if (rare) body.append(el('p', 'gtext grare', this.t('rare_chick', { line: g.breedName(rare) })));
    const cc = el('div', 'gcard');
    cc.append(el('div', 'glabel', this.t('chick')), el('p', 'gtext', ms > 1800e3 ? this.t('chick_grows', { when: g.howLong(ms) }) : this.t('chick_soon')));
    body.append(cc);
  }
  // ---- a young hen or rooster (a day after hatching): whose, when off to a new farm (the rating then: congratsCard)
  youngCard(name, sex, coop, mum, ms, rare) {
    const g = this.g, body = this.open('chick', name), f = sex === 'h';
    this.bird = null;
    body.append(el('p', 'gsub', this.t('young_of', { breed: g.breedName(coop.breed), name: mum ? mum.name : '', kid: this.t(f ? 'daughter' : 'son') })));
    if (rare) body.append(el('p', 'gtext grare', this.t(f ? 'rare_young_h' : 'rare_young_r', { line: g.breedName(rare) })));
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
      const row = el('div', 'gkid' + (k.rare ? ' gkid-rare' : '')), st = el('span', 'gstars gsmall');
      st.setAttribute('aria-label', k.stars + ' / ' + MAX_STARS);
      for (let i = 0; i < MAX_STARS; i++) st.append(el('span', i < k.stars ? 'on' : '', i < k.stars ? '★' : '☆'));
      const c = el('span', 'gkid-c'); c.append(el('span', 'gcoin gcoin-s'), document.createTextNode('+' + k.coins));
      const what = k.rare ? '✨ ' + g.breedName(k.rare) : this.t(k.sex === 'h' ? 'young_h' : 'young_r');
      row.append(el('span', 'gemoji', k.sex === 'h' ? '🐔' : '🐓'), el('span', 'gkid-t', what), st, k.wait ? el('span', 'gkid-c') : c);
      list.append(row);
      // a rare one: kept or sold for you (its trio complete), or yours to choose now (still waiting)
      if (k.rare && k.full) list.append(el('p', 'gnote gkid-n', this.t('rare_full', { line: g.breedName(k.rare) })));
      const e = k.wait && g.rareWaiting().find(x => x.id === k.wait);
      if (e && this.o.rare) list.append(this.rareChoice(e, () => this.congratsCard(n, away)));
    }
    body.append(list, el('p', 'gtotal', this.t('congrats_total', { c: n.coins, xp: n.xp })));
    if (mum) body.append(el('p', 'gnote', dad ? this.t('congrats_exp', { mum: mum.name, dad: dad.name }) : this.t('congrats_exp1', { mum: mum.name })));
    const ok = el('button', 'gbtn', this.t('congrats_ok')); ok.type = 'button';
    ok.addEventListener('click', () => this.close());
    body.append(ok);
  }
  // ---- a rare baby, grown (release 2 step 2): keep (the basket by the farmhouse fire) or sell (main.js: this.o.rare)
  rareChoice(e, then) {
    const row = el('div', 'grow grare-row'), f = e.sex === 'h';
    const keep = el('button', 'gbtn gsmallbtn grare-keep', this.t(f ? 'rare_keep_h' : 'rare_keep_r')); keep.type = 'button';
    const sell = el('button', 'gbtn galt gsmallbtn grare-sell', this.t('rare_sell', { c: rarePrice(e.stars).toLocaleString(this.g.locale()) })); sell.type = 'button';
    keep.addEventListener('click', () => { this.o.rare.keep(e.id); if (then) then(); });
    sell.addEventListener('click', () => { this.o.rare.sell(e.id); if (then) then(); });
    row.append(keep, sell);
    return row;
  }
  rareCard(e) {
    const g = this.g, coop = g.coop(e.coop), body = this.open('rare', this.t('rare_card_t', { line: g.breedName(e.line) })), f = e.sex === 'h';
    this.bird = null;
    const st = el('p', 'gstars'); for (let i = 0; i < MAX_STARS; i++) st.append(el('span', i < e.stars ? 'on' : '', i < e.stars ? '★' : '☆'));
    body.append(el('p', 'gsub', this.t('rare_of', { line: g.breedName(e.line), kind: this.t(f ? 'young_h' : 'young_r') })), st,
      el('p', 'gtext', this.t(f ? 'rare_card_body' : 'rare_card_body_r', { coop: coop ? g.coopName(coop) : '' })));
    if (this.o.rare) body.append(this.rareChoice(e, () => this.close()));
  }
  // ---- a coop's feeder: how full, how long it lasts, fill it (main.js sends the farmer)
  feederSheet(coop, onFill) {
    const g = this.g, q = g.fillQuote(coop), left = g.feedLeft(coop), h = g.feedHours(coop);
    const b = this.open('feeder', this.t('feeder_title', { coop: g.coopName(coop) }));
    this.feederCoop = coop.id;
    const pct = Math.round(left * 100);
    const bar = el('div', 'gbar-xp gfeedbar' + (left < 0.25 ? ' low' : '')); const fill = el('div', 'gbar-fill'); fill.style.width = Math.max(0, Math.min(100, pct)) + '%'; bar.append(fill);
    b.append(el('p', 'gtext gfeedpct', pct >= 99 ? this.t('feed_full') : pct <= 0 ? this.t('feed_empty') : this.t('feed_pct', { p: pct })), bar);
    b.append(el('p', 'gtext', left <= 0 ? this.t(g.isDuck(coop.breed) ? 'feed_empty_line_duck' : 'feed_empty_line') : h >= 47 ? this.t('feed_days') : h < 1.5 ? this.t('feed_hour') : this.t('feed_hours', { h: Math.round(h) })));
    b.append(el('p', 'gnote', this.t(g.isDuck(coop.breed) ? 'feed_how_duck' : 'feed_how')));
    if (g.data.grain >= 0.5) b.append(el('p', 'gnote gfound', '🌾 ' + this.t('feed_grain', { n: Math.floor(g.data.grain) })));
    const grain = q.grain >= 0.01 && !q.full && !q.broke && !q.scraps;
    const go = el('button', 'gbtn', q.full ? this.t('fill_full') : q.broke ? this.t('fill_broke') : q.scraps ? this.t('fill_scraps') : grain && !q.cost ? this.t('fill_grain') : grain && !q.partial ? this.t('fill_grain_c', { c: q.cost }) : this.t(q.partial ? 'fill_part' : 'fill_btn', { c: q.cost }));
    go.type = 'button'; go.disabled = !!(q.full || q.broke); if (go.disabled) go.classList.add('galt');
    go.addEventListener('click', () => { if (!go.disabled) onFill(); });
    b.append(go);
  }
  // ---- eggs flying from the nest to the coins, then the coins counted up
  flyEggs(from, n, colour, done, cls = 'gegg') {
    const to = this.coins.getBoundingClientRect(), tx = to.left + 18, ty = to.top + to.height / 2;
    const k = Math.max(1, Math.min(6, n)); let left = k;
    for (let i = 0; i < k; i++) {
      const e = el('div', cls); if (colour) e.style.background = colour; e.style.left = (from.x - 9) + 'px'; e.style.top = (from.y - 11) + 'px'; document.body.append(e);
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
  levelUpCard(L, sale, onShow, trios = [], onPlace = null) {
    const body = this.open('levelup', '🎉 ' + this.t('level_up', { n: L }));
    this.bird = null; this.levelShown = L;
    body.append(el('p', 'gsub', this.t('level_up_sub')));
    const ring = el('div', 'glevelbig'); ring.append(el('span', null, String(L))); body.append(ring);
    const decs = Object.keys(DECOR).filter(id => DECOR[id].level === L);      // (a decoration to buy now: the shop, the coins at the top)
    if (decs.length) { const c = el('div', 'gcard gdecnew'), hd = el('div', 'gcard-h'), ic = el('img', 'gdec-i'); ic.alt = ''; ic.src = 'decor/' + decs[0] + '.webp' + (this.o.bust || ''); hd.append(ic, el('span', 'gcard-t', this.t('dec_new', { names: decs.map(id => this.g.decorName(id)).join(', ') }))); c.append(hd, el('p', 'gnote', this.t('dec_new_where'))); body.append(c); }
    for (const id of Object.keys(ANIMALS).filter(k => ANIMALS[k].level === L && !this.g.animalOwned(k))) {      // (an animal to buy now: the shop's Animals shelf)
      const c = el('div', 'gcard gdecnew'), hd = el('div', 'gcard-h'), ic = el('img', 'gdec-i'); c.dataset.animal = id; ic.alt = ''; ic.src = 'decor/' + id + '.webp' + (this.o.bust || '');
      hd.append(ic, el('span', 'gcard-t', this.t('dec_new', { names: this.g.animalName(id) }))); c.append(hd); body.append(c);
      if (!decs.length) c.append(el('p', 'gnote', this.t('dec_new_where')));
      else { const n = body.querySelector('.gdecnew .gnote'); if (n) { n.remove(); c.append(n); } }      // (where to buy them said once, under the last)
    }
    if (L === FOX.level) { const c = el('div', 'gcard gfoxnew'), hd = el('div', 'gcard-h'); hd.append(el('span', 'gemoji', '🦊'), el('span', 'gcard-t', this.t('fox_new'))); c.append(hd); body.append(c); }      // (Rusty's visits start)
    for (const w of ['pond', 'river']) if (FISHING[w] === L) {              // (fishing opens: the pond at 3, the river at 8; a look at it)
      const c = el('div', 'gcard gfishnew'), hd = el('div', 'gcard-h'); hd.append(el('span', 'gemoji', '🎣'), el('span', 'gcard-t', this.t(w === 'pond' ? 'fish_new' : 'fish_new_river'))); c.append(hd);
      if (w === 'pond') c.append(el('p', 'gnote', this.t('fish_hens', { farmer: this.g.farmerName() })));      // (where the worms come from)
      const show = w === 'pond' ? this.o.showPond : this.o.showRiver;
      if (show) { const b = el('button', 'gbtn galt gsmallbtn', this.t(w === 'pond' ? 'fish_show' : 'fish_show_river')); b.type = 'button'; b.dataset.fish = 'show'; b.addEventListener('click', () => { this.close(); show(); }); c.append(b); }
      body.append(c);
    }
    const outs = Object.keys(OUTFITS).filter(id => OUTFITS[id].level === L && L > 1);      // (a new outfit for the farmer: the shop too)
    if (outs.length) { const lk = this.g.data.farmer.look === 'f' ? 'f' : 'm', c = el('div', 'gcard gdecnew'), hd = el('div', 'gcard-h'), ic = el('img', 'gdec-i'); ic.alt = ''; ic.src = 'outfits/card_' + lk + '_' + outs[0] + '.webp' + (this.o.bust || ''); hd.append(ic, el('span', 'gcard-t', this.t('out_new', { farmer: this.g.farmerName(), names: outs.map(id => this.g.outfitName(id)).join(', ') }))); c.append(hd, el('p', 'gnote', this.t('dec_new_where'))); body.append(c); }
    for (const tier of ['c', 'n']) if (SHOWS[tier].level === L) { const c = el('div', 'gcard'), hd = el('div', 'gcard-h'), ic = el('span', 'gros-i'); ic.innerHTML = rosette(1, true); hd.append(ic, el('span', 'gcard-t', this.t('show_new_' + tier, { f: SHOWS[tier].fee, p: SHOWS[tier].prize[0].toLocaleString(this.g.locale()) }))); c.append(hd); body.append(c); }
    if (trios.length) {                                // a new breed: place its coop now, or later (Your coops)
      for (const b of trios) {
        const c = el('div', 'gcard gnewcoop'), h = el('div', 'gcard-h');
        h.append(el('span', 'gemoji', this.g.isDuck(b) ? '🦆' : '🐔'), el('span', 'gcard-t', this.g.trioTitle(b)));
        c.append(h, el('p', 'gtext', this.t(this.g.isDuck(b) ? 'trio_body_duck' : 'trio_body')));
        body.append(c);
      }
      if (sale) { const c = el('div', 'gcard'), h = el('div', 'gcard-h'); h.append(el('span', 'gemoji', '🌱'), el('span', 'gcard-t', this.t('land_new', { c: sale.price }))); c.append(h); body.append(c); }
      const go = el('button', 'gbtn', this.t('place_now')); go.type = 'button';
      go.addEventListener('click', () => { this.close(); if (onPlace) onPlace(trios[0]); });
      const later = el('button', 'gbtn galt', this.t('later')); later.type = 'button';
      later.addEventListener('click', () => this.close());
      const row = el('div', 'gstick'); row.append(go, later);            // (always in sight, the card scrolling under them)
      body.append(el('p', 'gnote gcenter', this.t('later_note')), row);
    } else if (sale) {
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
  // ---- a field for sale: buy it (onBuy), or not enough coins yet
  landCard(n, onBuy) {
    const g = this.g, body = this.open('land', this.t('land_title'));
    this.bird = null;
    body.append(el('p', 'gtext', this.t('land_body')));
    const broke = g.data.coins < n.price, go = el('button', 'gbtn' + (broke ? ' galt' : ''), broke ? this.t('land_broke', { c: n.price }) : this.t('land_buy', { c: n.price }));
    go.type = 'button'; go.disabled = broke;
    go.addEventListener('click', () => { if (!go.disabled) onBuy(); });
    body.append(go);
  }

  // a coop's look after its breed: its name (release 4: a coop with its five looks), else "rustic" while it's new
  lookTag(coop) { return UPGRADES.includes(this.g.baseOf(coop.breed)) ? ' · ' + this.g.lookName(coop) : coop.tier === 0 ? ' · ' + this.t('rustic') : ''; }
  // ---- a coop: who lives there; its next look (release 4: what it brings, its price; up.onUpgrade(): main.js tryUpgrade,
  // 'ok', or why not: 'room' (its bigger pen doesn't fit there: move it first), 'coins', 'busy'); move it (onMove:
  // main.js startMove)
  coopCard(coop, onMove, up) {
    const g = this.g, body = this.open('coop', g.coopName(coop)), fmt = n => n.toLocaleString(g.locale());
    this.bird = null;
    body.append(el('p', 'gsub', g.breedName(coop.breed) + this.lookTag(coop)));
    const names = g.birdsIn(coop.id).sort((a, b) => (b.sex === 'r') - (a.sex === 'r')).map(b => b.name);
    if (names.length) body.append(el('p', 'gtext', this.t('coop_lives', { names: this.g.andList(names) })));
    const n = up && g.coopNext(coop);
    if (n) {
      const c = el('div', 'gcard gup'), hd = el('div', 'gcard-h');
      hd.append(el('span', 'gemoji', '✨'), el('span', 'gcard-t', this.t('up_next', { look: this.t('look_' + n.look) })));
      c.append(hd, el('p', 'gtext', this.t('up_' + g.baseOf(coop.breed) + '_' + n.look)), el('p', 'gnote', this.t('upfx_' + n.look)));
      const broke = g.data.coins < n.price, b = el('button', 'gbtn' + (broke ? ' galt' : ''), broke ? this.t('up_broke', { c: fmt(n.price) }) : this.t('up_btn', { c: fmt(n.price) }));
      b.type = 'button'; b.disabled = broke;
      const why = el('p', 'gnote gup-why'); why.hidden = true;
      b.addEventListener('click', () => {
        if (b.disabled) return;
        const r = up.onUpgrade();
        if (r === 'room') { why.textContent = this.t('up_room'); why.hidden = false; }
      });
      c.append(b, why); body.append(c);
    } else if (up && UPGRADES.includes(g.baseOf(coop.breed))) body.append(el('p', 'gnote', this.t('up_top')));
    for (const id of (up && up.onDress ? g.data.dresses || [] : [])) {         // (a seasonal dress owned: put on, or taken off)
      const on = coop.dress === id, name = g.dressName(id);
      if (on) body.append(el('p', 'gnote', this.t('dress_card', { name })));
      const d = el('button', 'gbtn' + (on ? ' galt' : ''), this.t(on ? 'dress_off' : 'dress_on', { name })); d.type = 'button'; d.dataset.dress = id;
      d.addEventListener('click', () => up.onDress(on ? null : id));
      body.append(d);
    }
    body.append(el('p', 'gnote', this.t('move_body')));
    const go = el('button', 'gbtn', this.t('move_btn')); go.type = 'button';
    go.addEventListener('click', () => onMove());
    body.append(go);
  }
  // ---- moving a coop: what the spot's like, and Turn, Cancel, Put it here (h: { turn(), cancel(), place() })
  moveBar(on, h) {
    if (!this.mbar) {
      const b = this.mbar = el('section', 'gmove'); b.hidden = true;
      this.mtext = el('p', 'gmove-t');
      const row = el('div', 'gmove-row');
      this.mturn = el('button', 'gbtn galt gmove-b'); this.mcancel = el('button', 'gbtn galt gmove-b'); this.mplace = el('button', 'gbtn gmove-b gmove-go');
      for (const x of [this.mturn, this.mcancel, this.mplace]) { x.type = 'button'; row.append(x); }
      b.append(this.mtext, row); document.body.append(b);
      this.mturn.addEventListener('click', () => this.mh && this.mh.turn());
      this.mcancel.addEventListener('click', () => this.mh && this.mh.cancel());
      this.mplace.addEventListener('click', () => { if (this.mh && !this.mplace.disabled) this.mh.place(); });
    }
    this.mh = on ? h : null; this.mbar.hidden = !on; document.body.classList.toggle('gmoving', !!on);
    if (on) this.mturn.hidden = !h.turn;                 // (a decoration always faces you: no Turn)
    if (on) { this.mturn.textContent = '↻ ' + this.t('move_turn'); this.mcancel.textContent = this.t('move_cancel'); this.mplace.textContent = '✓ ' + this.t('move_place'); }
  }
  moveStatus(text, ok) { if (!this.mbar) return; this.mtext.textContent = text; this.mtext.classList.toggle('bad', !ok); this.mplace.disabled = !ok; }
  moveTop() { return this.mbar && !this.mbar.hidden ? this.mbar.offsetTop : innerHeight; }      // (where the bar starts: the farm above it)

  // ---- Your coops: a new breed's coop waiting to be placed (h.place(breed)), each coop on the farm (h.move(id)), the next breed
  coopsSheet(h) {
    const g = this.g, b = this.open('coops', this.t('coops_title'));
    this.bird = null;
    for (const breed of g.waitingCoops()) {
      const c = el('div', 'gcard gnewcoop'), hd = el('div', 'gcard-h');
      hd.append(el('span', 'gemoji', g.isDuck(breed) ? '🦆' : '🐔'), el('span', 'gcard-t', g.trioTitle(breed)), el('span', 'gbadge', this.t('coops_new')));
      c.append(hd, el('p', 'gtext', this.t(g.isDuck(breed) ? 'trio_body_duck' : 'trio_body')));
      const go = el('button', 'gbtn', this.t('place_btn')); go.type = 'button'; go.addEventListener('click', () => h.place(breed));
      c.append(go); b.append(c);
    }
    // rare babies waiting for your choice, and the basket by the fire (release 2 step 2)
    for (const e of g.rareWaiting()) {
      const c = el('div', 'gcard grarecard'), hd = el('div', 'gcard-h');
      hd.append(el('span', 'gemoji', '✨'), el('span', 'gcard-t', this.t('rare_card_t', { line: g.breedName(e.line) })), el('span', 'gbadge', this.t('coops_new')));
      c.append(hd, el('p', 'gnote', this.t('rare_waiting')));
      if (this.o.rare) c.append(this.rareChoice(e, () => this.coopsSheet(h)));
      b.append(c);
    }
    if (g.basket().length) {                            // (each rare colour's: its birds, and its own coop to build: release 2 step 3)
      const c = el('div', 'gcard gbasket'), hd = el('div', 'gcard-h'), price = RARE.coop.toLocaleString(g.locale());
      hd.append(el('span', 'gemoji', '🧺'), el('span', 'gcard-t', this.t('basket_t')));
      c.append(hd);
      for (const line of [...new Set(g.basket().map(x => x.breed))]) {
        for (const x of g.basket().filter(y => y.breed === line)) c.append(el('p', 'gtext', x.name + ' · ' + this.t('rare_of', { line: g.breedName(x.breed), kind: this.t(x.sex === 'h' ? 'hen' : 'rooster') })));
        if (g.rareCoops().includes(line) && h.place) {
          const can = g.data.coins >= RARE.coop, go = el('button', 'gbtn gsmallbtn grare-build', this.t(can ? 'rare_build' : 'rare_build_no', { c: price })); go.type = 'button'; go.disabled = !can; go.dataset.line = line;
          go.addEventListener('click', () => h.place(line)); c.append(go);
        }
      }
      c.append(el('p', 'gnote', this.t('basket_note', { c: price }))); b.append(c);
    }
    for (const coop of g.data.coops) {
      const row = el('div', 'gcard gcooprow'), info = el('div', 'gcoopinfo');
      info.append(el('span', 'gcard-t', g.coopName(coop)), el('span', 'gnote', g.breedName(coop.breed) + this.lookTag(coop)));
      const mv = el('button', 'gbtn galt gsmallbtn', this.t('move_short')); mv.type = 'button'; mv.addEventListener('click', () => h.move(coop.id));
      row.append(info, mv); b.append(row);
    }
    const nx = g.nextBreed();
    b.append(el('p', 'gnote', nx ? this.t('coops_next', { n: nx.level, breed: g.breedName(nx.breed) }) : this.t('coops_all')));
    if (h.book) { const bk = el('button', 'gbtn galt gbookbtn', this.t('book_btn')); bk.type = 'button'; bk.addEventListener('click', () => h.book()); b.append(bk); }
  }

  // ---- the Breed Book (release 1 step 8; on the farmhouse shelf): a page for each breed in level order, its picture (made
  // from the game's own birds: bookpics.mjs) beside its words. Found (its coop on the farm): who lives there; not yet: the
  // picture a dark silhouette, and the level it comes at (or, its level come, waiting in Your coops: h.place(breed)). Its
  // eggs (h.egg: their colours, main.js) and its coop. Names set as text, never as HTML
  bookSheet(h = {}) {
    const g = this.g, pages = g.bookPages(), found = pages.filter(x => x.found).length;
    const b = this.open('book', this.t('book_title'));
    this.bird = null; b.scrollTop = 0;
    // (once fishing's open: the breeds, or the fish: two tabs)
    if (g.fishOpen('pond')) {
      const tabs = el('div', 'gbooktabs'), tab = (k, label) => { const t = el('button', 'gbtn gsmallbtn' + ((this.bookTab || 'birds') === k ? ' gon' : ' galt'), label); t.type = 'button'; t.dataset.tab = k; t.addEventListener('click', () => { this.bookTab = k; this.bookSheet(h); }); return t; };
      tabs.append(tab('birds', '🐔 ' + this.t('book_tab_birds')), tab('fish', '🐟 ' + this.t('book_tab_fish'))); b.append(tabs);
      if (this.bookTab === 'fish') { this.fishPages(b); return; }
    }
    b.append(el('p', 'gsub', this.t(found === 1 ? 'book_found1' : 'book_found', { n: found, all: pages.length })));
    const list = names => this.g.andList(names);
    for (const pg of pages) {
      const card = el('div', 'gcard gpage' + (pg.found ? '' : ' gpage-no')); card.dataset.breed = pg.breed;
      const pic = el('div', 'gpic'), img = el('img');
      img.alt = ''; img.width = img.height = 320; img.decoding = 'async'; img.src = 'book/' + pg.breed + '.webp' + (this.o.bust || '');
      pic.append(img);
      const info = el('div', 'gpage-i');
      info.append(el('span', 'gcard-t', g.bookName(pg.breed)));
      info.append(el('p', 'gpage-s' + (pg.found ? ' gfound' : '') + (pg.rare ? ' grare' : ''), pg.found ? this.t('book_on_farm', { names: list(pg.names) }) : pg.rare ? this.t('book_rare', { from: pg.from.map(k => g.breedName(k)).join(this.t('book_or')) }) : pg.waiting ? this.t('book_waiting') : this.t('book_at_level', { n: pg.level })));
      const eggs = el('p', 'gnote gpage-l'), ei = el('span', 'gegg-i'), et = el('span');
      if (h.egg && h.egg[pg.base]) ei.style.setProperty('--egg', h.egg[pg.base]);
      et.append(el('span', 'gpage-k', this.t('egg_' + pg.base)), document.createTextNode(' · ' + this.t(g.isDuck(pg.breed) ? 'book_price_duck' : 'book_price', { p: pg.price })));
      eggs.append(ei, et);
      const coop = el('p', 'gnote gpage-l'), ci = el('span', 'gpage-c');
      ci.innerHTML = BARN;                              // (the little barn of Your coops: a fixed drawing, nothing of the save)
      coop.append(ci, el('span', null, this.t('book_coop', { coop: g.coopName({ breed: pg.breed, name: '' }) })));
      info.append(eggs, coop);
      if (pg.waiting && h.place) { const go = el('button', 'gbtn gsmallbtn gpage-go', this.t('place_btn')); go.type = 'button'; go.addEventListener('click', () => h.place(pg.breed)); info.append(go); }
      card.append(pic, info); b.append(card);
    }
    b.append(el('p', 'gnote gcenter', this.t('book_more')));
  }
  // ---- the Book's fish pages (release 5): the pond's seven and the river's, each its picture (dark till you've caught one),
  // its name, how rare it is, how many you've caught and your biggest (or where and from what level), its sizes, its price
  fishPages(b) {
    const g = this.g, got = FISH_IDS.filter(id => g.fishGot(id)).length;
    b.append(el('p', 'gsub', this.t('book_fish_found', { n: got, all: FISH_IDS.length })));
    for (const w of ['pond', 'river']) {
      b.append(el('div', 'glabel gbookwater', this.t(w === 'pond' ? 'book_fish_pond' : 'book_fish_river')));
      for (const id of FISH_IDS.filter(k => FISH_RULES[k].water === w)) {
        const R = FISH_RULES[id], c = g.fishGot(id), open = g.fishOpen(w);
        const card = el('div', 'gcard gpage gfishpage' + (c ? '' : ' gpage-no')); card.dataset.fish = id;
        const pic = el('div', 'gpic'), img = el('img'); img.alt = ''; img.decoding = 'async'; img.src = 'fish/' + id + '.webp' + (this.o.bust || ''); pic.append(img);
        const info = el('div', 'gpage-i');
        info.append(el('span', 'gcard-t', g.fishName(id)), el('p', 'gnote gpage-l gfishrare', this.t('fish_rare' + R.rare)));
        info.append(el('p', 'gpage-s' + (c ? ' gfound' : ''), c ? (c.n === 1 ? this.t('book_fish_caught1', { cm: c.best }) : this.t('book_fish_caught', { n: c.n, cm: c.best })) : open ? this.t('book_fish_not') : this.t('book_fish_level', { n: FISHING[w] })));
        info.append(el('p', 'gnote gpage-l', this.t('book_fish_size', { a: R.cm[0], b: R.cm[1] }) + ' · ' + (R.rare === 2 ? this.t('book_fish_photo', { c: R.price }) : this.t('book_fish_price', { c: fishPrice(id, Math.round((R.cm[0] + R.cm[1]) / 2)) }))));
        card.append(pic, info); b.append(card);
      }
    }
  }

  // ---- Shows (release 1 step 9): today's shows (the Village, then from level 4 the County and from 9 the National), who may
  // enter, when the results come, the prizes; your best bird for each with her chance of a rosette and "Enter Clover · 10"
  // (h.enter(id, bird)), or the others to choose from; a bird entered: when her results come; how shows work
  showsSheet(h = {}, more = null) {
    const g = this.g, now = Date.now(), b = this.open('shows', this.t('shows_title'));
    this.bird = null;
    const how = () => { const c = el('div', 'gcard ghow'); for (const k of ['shows_how1', 'shows_how2', 'shows_how3']) c.append(el('p', 'gnote', this.t(k))); return c; };
    for (const s of g.openShows(now)) {
      const T = SHOWS[s.tier], c = el('div', 'gcard gshow' + (s.locked ? ' gpage-no' : '')), hd = el('div', 'gcard-h'), ic = el('span', 'gros-i gros-big');
      ic.innerHTML = rosette(1, s.tier !== 'v'); c.dataset.show = s.id;
      hd.append(ic, el('span', 'gcard-t', g.showName(s.id)));
      c.append(hd);
      if (s.locked) { c.append(el('p', 'gnote', this.t('show_locked', { n: s.level }))); b.append(c); continue; }
      const when = g.howLong(Math.max(60e3, s.judged - now));
      c.append(el('p', 'gnote', (s.breed ? this.t('show_only', { breed: g.kindName(s.breed) }) : this.t('show_any')) + ' · ' + this.t('show_when', { when })));
      c.append(el('p', 'gnote', this.t('show_prizes', { a: T.prize[0], b: T.prize[1], c: T.prize[2] })));
      const ent = g.shows().in.find(e => e.id === s.id);
      if (ent) { const eb = g.bird(ent.bird); c.append(el('p', 'gtext gfound', this.t('show_in', { name: eb ? eb.name : '', when }, eb && eb.sex === 'h'))); b.append(c); continue; }
      const list = g.showBirds(s);
      if (!list.length) { c.append(el('p', 'gnote', s.breed && !g.data.birds.some(x => g.baseOf(x.breed) === s.breed) ? this.t('show_none_breed', { breed: g.kindName(s.breed) }) : this.t('show_none_busy'))); b.append(c); continue; }
      const broke = g.data.coins < T.fee;
      const line = x => el('p', 'gtext gchance', this.t('show_chance', { name: x.b.name, word: this.t('chance' + x.ch.word), p: Math.round(x.ch.rosette * 100) }));
      const enterBtn = (x, small) => {
        const go = el('button', 'gbtn' + (small ? ' gsmallbtn' : '') + (broke || x.ch.word === 0 ? ' galt' : ''), broke ? this.t('show_broke', { fee: T.fee }) : small ? this.t('show_pick') : this.t('show_enter', { name: x.b.name, fee: T.fee }));
        go.type = 'button'; go.disabled = broke; go.addEventListener('click', () => { if (!go.disabled && h.enter) h.enter(s.id, x.b.id); });
        return go;
      };
      c.append(line(list[0]), enterBtn(list[0], false));
      if (list.length > 1) {
        if (more === s.id) for (const x of list.slice(1)) { const row = el('div', 'gshowrow'); row.append(line(x)); if (!broke) row.append(enterBtn(x, true)); c.append(row); }
        else { const o = el('button', 'glink', this.t('show_other')); o.type = 'button'; o.addEventListener('click', () => this.showsSheet(h, s.id)); c.append(o); }
      }
      b.append(c);
    }
    b.append(how());                                   // (how shows work: under the shows, so the first one's button is in sight)
    if (more) { const card = b.querySelector('[data-show="' + more + '"]'); if (card) card.scrollIntoView({ block: 'nearest' }); }
  }
  // ---- Today's jobs (release 1 step 9c): each job, how far along it is, its reward; done: "Collect" (h.claim(i))
  jobsSheet(h = {}) {
    const g = this.g, J = g.jobs(), r = g.jobReward(), b = this.open('jobs', this.t('jobs_title'));
    this.bird = null;
    J.list.forEach((j, i) => {
      const c = el('div', 'gcard gjob' + (j.paid ? ' gjob-paid' : j.got >= j.n ? ' gjob-done' : '')), hd = el('div', 'gcard-h');
      hd.append(el('span', 'gemoji', { eggs: '🥚', cuddle: '♥', feed: '🌾', show: '🎀' }[j.k] || '✓'), el('span', 'gcard-t', g.jobText(j)));
      c.append(hd);
      const bar = el('div', 'gbar-xp'), fill = el('div', 'gbar-fill'); fill.style.width = Math.round(100 * Math.min(1, j.got / j.n)) + '%'; bar.append(fill);
      const row = el('div', 'gjobrow'); row.append(el('span', 'gnote', j.got + ' / ' + j.n + ' · ' + this.t('job_reward', { c: r.coins, xp: r.xp })));
      if (j.paid) row.append(el('span', 'gjob-ok', this.t('job_paid')));
      else if (j.got >= j.n) { const go = el('button', 'gbtn gsmallbtn', this.t('job_claim')); go.type = 'button'; go.addEventListener('click', () => h.claim && h.claim(i)); row.append(go); }
      c.append(bar, row); b.append(c);
    });
    b.append(el('p', 'gnote gcenter', this.t('jobs_note')));
  }
  // ---- show day: the results are in; watch the judging (onWatch: the scene) or just the results (onSkip)
  showDayCard(show, onWatch, onSkip) {
    const body = this.open('showday', '🎀 ' + this.t('showday_title'));
    this.bird = null;
    body.append(el('p', 'gtext', this.t('showday_body', { show })));
    const go = el('button', 'gbtn', this.t('showday_watch')); go.type = 'button';
    go.addEventListener('click', () => { this.close(); onWatch(); });
    const no = el('button', 'gbtn galt', this.t('showday_results')); no.type = 'button';
    no.addEventListener('click', () => { this.close(); onSkip(); });
    body.append(go, no);
  }
  // a Skip button over the farm (the show day)
  skipBtn(on, onSkip) {
    if (!this.skip) { this.skip = el('button', 'gskip'); this.skip.type = 'button'; this.skip.hidden = true; document.body.append(this.skip); this.skip.addEventListener('click', () => this.onSkip && this.onSkip()); }
    this.skip.textContent = this.t('skip') + ' ⏭'; this.skip.hidden = !on; this.onSkip = on ? onSkip : null;
  }
  // ---- the show results (after the show day): each bird's place, her rosette, the prizes; seen once closed
  showResults(list) {
    const g = this.g, body = this.open('showres', '🏆 ' + this.t('results_title'));
    this.bird = null;
    let coins = 0, xp = 0;
    for (const r of list) {
      const b = g.bird(r.bird), f = b && b.sex === 'h', name = b ? b.name : '', c = el('div', 'gcard gresult'), hd = el('div', 'gcard-h');
      const ic = el('span', 'gros-i gros-big'); ic.innerHTML = rosette(r.place <= 3 ? r.place : 9, r.place === 1 && r.id[0] !== 'v');
      hd.append(ic, el('span', 'gtext', r.place <= 3 ? this.t('res_place', { name, place: g.place(r.place, true), show: g.showName(r.id) }) : this.t('res_none', { name, show: g.showName(r.id), place: g.place(r.place, f), of: r.of }, f)));
      c.append(hd);
      const won1 = r.place === 1 && r.id[0] !== 'v' && b && g.rosettesOf(b)[SHOW_TIERS.indexOf(r.id[0]) * 3] === 1;      // (her first win there: a champion now)
      if (won1) c.append(el('p', 'gtext gchamp', '🏆 ' + this.t('res_champ', { name }, f)));
      if (r.dress) c.append(el('p', 'gtext gchamp', '🎄 ' + this.t('res_dress', { name: g.dressName(r.dress) })));
      body.append(c); coins += r.coins; xp += r.xp;
    }
    body.append(el('p', 'gtotal', this.t('congrats_total', { c: coins, xp })));
    const ok = el('button', 'gbtn', this.t('congrats_ok')); ok.type = 'button'; ok.addEventListener('click', () => this.close());
    body.append(ok);
  }

  // ---- the shop (the coins at the top: "Decorate your farm", the 2D game's eight decorations): each with its picture, what
  // it brings, and Buy and place (h.buy: placed on the farm, paid for once put down), or its level to come, or not enough
  // coins yet; one on the farm: Move (h.move). The duck house goes straight onto the pond
  shopSheet(h, tab = 'decor') {
    const g = this.g, b = this.open('shop', this.t('shop_title'));
    this.bird = null; b.scrollTop = 0; this.shopTab = tab;
    const fmt = n => n.toLocaleString(g.locale());
    const top = el('div', 'gshop-top'), pill = el('span', 'gshop-c'); pill.append(el('span', 'gcoin gcoin-s'), document.createTextNode(fmt(g.data.coins)));
    top.append(el('p', 'gnote', this.t('shop_coins')), pill); b.append(top);
    if (h.outfits) {                                    // (four shelves: the decorations, the animals, the farmer's outfits, the seasons' dresses)
      const tabs = el('div', 'gchips gshop-tabs');
      for (const [k, label] of [['decor', 'shop_decor'], ['animals', 'shop_animals'], ['outfits', 'shop_outfits'], ['seasons', 'shop_seasons']]) {
        const c = el('button', 'gchip' + (tab === k ? ' on' : ''), this.t(label)); c.type = 'button'; c.dataset.tab = k;
        c.addEventListener('click', () => { if (this.shopTab !== k) this.shopSheet(h, k); });
        tabs.append(c);
      }
      b.append(tabs);
    }
    if (tab === 'outfits') { this.outfitCards(b, h, fmt); return; }
    if (tab === 'seasons') { this.dressCards(b, h, fmt); return; }
    if (tab === 'animals') { this.animalCards(b, h, fmt); return; }
    for (const id of Object.keys(DECOR)) {
      const D = DECOR[id], own = g.decorOwned(id), lock = g.level < D.level, broke = !own && !lock && g.data.coins < D.price;
      const card = el('div', 'gcard gpage gdec' + (lock ? ' gpage-no' : '') + (own ? ' gdec-own' : '')); card.dataset.decor = id;
      const pic = el('div', 'gpic'), img = el('img'); img.alt = ''; img.decoding = 'async'; img.src = 'decor/' + id + '.webp' + (this.o.bust || ''); pic.append(img);
      const info = el('div', 'gpage-i');
      info.append(el('span', 'gcard-t', g.decorName(id)), el('p', 'gnote gdec-l', this.t('decl_' + id)));
      if (own) info.append(el('p', 'gpage-s gfound', '✓ ' + this.t('dec_owned')));
      else if (lock) info.append(el('p', 'gpage-s', this.t('dec_level', { n: D.level })));
      else {
        const pr = el('p', 'gpage-s gdec-p'); pr.append(el('span', 'gcoin gcoin-s'), document.createTextNode(fmt(D.price) + ' · ' + this.t('dec_xp', { xp: decorXp(id) }))); info.append(pr);
      }
      if (own && !D.pond) { const mv = el('button', 'gbtn galt gsmallbtn gpage-go', this.t('dec_move')); mv.type = 'button'; mv.addEventListener('click', () => h.move(id)); info.append(mv); }
      if (!own && !lock) {
        const go = el('button', 'gbtn gsmallbtn gpage-go' + (broke ? ' gdec-broke' : ''), broke ? this.t('dec_broke') : this.t(D.pond ? 'dec_buy_pond' : 'dec_buy', { c: fmt(D.price) })); go.type = 'button'; go.disabled = broke;
        go.addEventListener('click', () => { if (!go.disabled) h.buy(id); });
        info.append(go);
      }
      card.append(pic, info); b.append(card);
    }
  }
  // the animals (the shop's second shelf, release 3: the guardians): each with its picture, what it is, and Buy (h.buyAnimal:
  // the geese come at once; the dog's kennel is placed first, like a decoration), or its level to come, or not enough coins
  // yet; one on the farm: where it lives, See (h.see); the dog: Move his kennel (h.moveKennel), Rename (h.rename)
  animalCards(b, h, fmt) {
    const g = this.g;
    for (const id of Object.keys(ANIMALS)) {
      const A = ANIMALS[id], own = g.animalOwned(id), lock = !own && g.level < A.level, broke = !own && !lock && g.data.coins < A.price;
      const card = el('div', 'gcard gpage gdec gani' + (lock ? ' gpage-no' : '') + (own ? ' gdec-own' : '')); card.dataset.animal = id;
      const pic = el('div', 'gpic'), img = el('img'); img.alt = ''; img.decoding = 'async'; img.src = 'decor/' + id + '.webp' + (this.o.bust || ''); pic.append(img);
      const info = el('div', 'gpage-i');
      info.append(el('span', 'gcard-t', g.animalName(id)), el('p', 'gnote gdec-l', this.t('anil_' + id)));
      if (own) info.append(el('p', 'gpage-s gfound', '✓ ' + this.t(A.kennel ? 'ani_dog_owned' : 'ani_owned')));
      else if (lock) info.append(el('p', 'gpage-s', this.t('dec_level', { n: A.level })));
      else { const pr = el('p', 'gpage-s gdec-p'); pr.append(el('span', 'gcoin gcoin-s'), document.createTextNode(fmt(A.price) + ' · ' + this.t('dec_xp', { xp: animalXp(id) }))); info.append(pr); }
      if (own) {
        const row = el('div', 'gani-btns'), btn = (k, f) => { const b = el('button', 'gbtn galt gsmallbtn', this.t(k)); b.type = 'button'; b.addEventListener('click', f); row.append(b); };
        if (h.see) btn(A.kennel ? 'ani_see_dog' : 'ani_see', () => h.see(id));
        if (A.kennel && h.moveKennel) btn('ani_move_kennel', () => h.moveKennel());
        if (A.kennel && h.rename) btn('ani_rename', () => h.rename());
        info.append(row);
      }
      if (!own && !lock) {
        const go = el('button', 'gbtn gsmallbtn gpage-go' + (broke ? ' gdec-broke' : ''), broke ? this.t('dec_broke') : this.t(A.kennel ? 'dec_buy' : 'ani_buy', { c: fmt(A.price) })); go.type = 'button'; go.disabled = broke;
        go.addEventListener('click', () => { if (!go.disabled) h.buyAnimal(id); });
        info.append(go);
      }
      card.append(pic, info); b.append(card);
    }
  }
  // the farmer's outfits (the shop's third shelf): each with its picture (the 2D game's, for the farm's farmer), what it is,
  // and Buy and wear (h.buyOutfit), Wear (h.wear), "Wearing", or the level it comes at
  outfitCards(b, h, fmt) {
    const g = this.g, look = g.data.farmer.look === 'f' ? 'f' : 'm', who = g.farmerName();
    b.append(el('p', 'gnote', this.t('outfits_note', { farmer: who })));
    for (const id of Object.keys(OUTFITS)) {
      const O = OUTFITS[id], own = g.outfitOwned(id), on = g.outfitWorn() === id, lock = !own && g.level < O.level, broke = !own && !lock && g.data.coins < O.price;
      const card = el('div', 'gcard gpage gdec gout' + (lock ? ' gpage-no' : '') + (on ? ' gout-on' : '')); card.dataset.outfit = id;
      const pic = el('div', 'gpic'), img = el('img'); img.alt = ''; img.decoding = 'async'; img.src = 'outfits/card_' + look + (id === 'classic' ? '' : '_' + id) + '.webp' + (this.o.bust || ''); pic.append(img);
      const info = el('div', 'gpage-i');
      info.append(el('span', 'gcard-t', g.outfitName(id)), el('p', 'gnote gdec-l', this.t('ofd_' + id)));
      if (on) info.append(el('p', 'gpage-s gfound', '✓ ' + this.t('out_wearing')));
      else if (lock) info.append(el('p', 'gpage-s', this.t('dec_level', { n: O.level })));
      else if (!own) { const pr = el('p', 'gpage-s gdec-p'); pr.append(el('span', 'gcoin gcoin-s'), document.createTextNode(fmt(O.price) + ' · ' + this.t('dec_xp', { xp: outfitXp(id) }))); info.append(pr); }
      if (own && !on) { const w = el('button', 'gbtn galt gsmallbtn gpage-go', this.t('out_wear')); w.type = 'button'; w.addEventListener('click', () => h.wear(id)); info.append(w); }
      if (!own && !lock) {
        const go = el('button', 'gbtn gsmallbtn gpage-go' + (broke ? ' gdec-broke' : ''), broke ? this.t('dec_broke') : this.t('out_buy', { c: fmt(O.price) })); go.type = 'button'; go.disabled = broke;
        go.addEventListener('click', () => { if (!go.disabled) h.buyOutfit(id); });
        info.append(go);
      }
      card.append(pic, info); b.append(card);
    }
  }
  // the seasons' dresses for the coops (the shop's fourth shelf, release 4): each with its picture, what it is, and Buy
  // (h.buyDress) in its season, or when it's on sale; one owned: yours for good (dressed from a coop's card)
  dressCards(b, h, fmt) {
    const g = this.g, cap = x => x.charAt(0).toUpperCase() + x.slice(1);
    b.append(el('p', 'gnote', this.t('seasons_note')));
    for (const id of Object.keys(DRESSES)) {
      const D = DRESSES[id], own = g.dressOwned(id), on = inSeason(id), broke = !own && on && g.data.coins < D.price;
      const card = el('div', 'gcard gpage gdec gdress' + (!own && !on ? ' gpage-no' : '') + (own ? ' gdec-own' : '')); card.dataset.dress = id;
      const pic = el('div', 'gpic'), img = el('img'); img.alt = ''; img.decoding = 'async'; img.src = 'decor/' + id + '.webp' + (this.o.bust || ''); pic.append(img);
      const info = el('div', 'gpage-i');
      info.append(el('span', 'gcard-t', cap(g.dressName(id))), el('p', 'gnote gdec-l', this.t('dressl_' + id)));
      if (own) info.append(el('p', 'gpage-s gfound', '✓ ' + this.t('dress_owned')));
      else if (!on) info.append(el('p', 'gpage-s', this.t('dress_when_' + id)));
      else {
        const pr = el('p', 'gpage-s gdec-p'); pr.append(el('span', 'gcoin gcoin-s'), document.createTextNode(fmt(D.price) + ' · ' + this.t('dec_xp', { xp: dressXp(id) }))); info.append(pr);
        const go = el('button', 'gbtn gsmallbtn gpage-go' + (broke ? ' gdec-broke' : ''), broke ? this.t('dec_broke') : this.t('dress_buy', { c: fmt(D.price) })); go.type = 'button'; go.disabled = broke;
        go.addEventListener('click', () => { if (!go.disabled) h.buyDress(id); });
        info.append(go);
      }
      card.append(pic, info); b.append(card);
    }
  }
  // a time to wait, in hours and minutes ("3 h 59 min", "25 min")
  dur(ms) { const m = Math.max(1, Math.ceil(ms / 60e3)), h = Math.floor(m / 60), r = m % 60; return h ? this.t('h', { n: h }) + (r ? ' ' + this.t('min', { n: r }) : '') : this.t('min', { n: m }); }
  // ---- the pictures before the first day (release 1 step 10; Audrey: "Scenes from the 3D farm"): four, one at a time, a
  // picture made from the game's own farm (intro/1-4.webp), a title and a line or two; Next (a swipe too), Let's go! on the
  // last, Skip; then done()
  introCards(done) {
    const N = 4; let i = 0, x0 = null;
    const finish = () => { this.introDone = done; this.close(); };
    const draw = () => {
      const b = this.open('intro', this.t('intro_' + (i + 1)), true);
      this.bird = null; this.dim.hidden = true; this.sheet.classList.add('gintro');
      const pic = el('div', 'gintro-pic'), img = el('img'); img.alt = ''; img.decoding = 'async'; img.src = 'intro/' + (i + 1) + (i === 2 && INTRO_PIC.includes(this.g.lang) ? '-' + this.g.lang : '') + '.webp' + (this.o.bust || '');      // (the third has words on its sign: À VENDRE in French)
      img.addEventListener('error', () => pic.classList.add('none')); pic.append(img);
      pic.addEventListener('pointerdown', e => { x0 = e.clientX; });
      pic.addEventListener('pointerup', e => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (dx < -40 && i < N - 1) { i++; draw(); } else if (dx > 40 && i > 0) { i--; draw(); } });
      const dots = el('div', 'gdots'); for (let k = 0; k < N; k++) dots.append(el('span', k === i ? 'on' : ''));
      b.append(pic, el('p', 'gtext gintro-t', this.t('intro_' + (i + 1) + 'b')), dots);
      const row = el('div', 'gstick'), next = el('button', 'gbtn', this.t(i < N - 1 ? 'intro_next' : 'intro_go')); next.type = 'button';
      next.addEventListener('click', () => { if (i < N - 1) { i++; draw(); } else finish(); });
      const skip = el('button', 'gbtn galt', this.t('intro_skip')); skip.type = 'button'; skip.addEventListener('click', () => finish());
      row.append(next); if (i < N - 1) row.append(skip); b.append(row);
    };
    draw();
  }
  // a long time away ("2 days 3 h", "9 h 12 min")
  longDur(ms) { const d = Math.floor(ms / 86400e3); if (!d) return this.dur(ms); const h = Math.floor((ms - d * 86400e3) / 3600e3); return (d === 1 ? this.t('days1') : this.t('days', { n: d })) + (h ? ' ' + this.t('h', { n: h }) : ''); }
  // ---- the welcome-back summary (release 1 step 9f): how long you were away, then what's waiting, one line each with
  // its picture; "Collect all eggs (14)" (h.collectAll) when there are eggs; "Off to the farm"
  awayCard(sum, h) {
    const b = this.open('away', this.t('away_title'));
    this.bird = null;
    b.append(el('p', 'gsub', this.t('away_for', { t: this.longDur(sum.away) })));
    if (sum.paused) b.append(el('p', 'gnote', this.t('away_paused')));
    const IC = { eggs: '🥚', full: '🪺', hatched: '🐣', grown: '🎉', honey: '🍯', wheat: '🌾', wheat_grow: '🌱', feed: '🌾', feed_low: '🌾', show: '🎀', jobs: '📋', jobs_ready: '📋' };
    const list = el('div', 'gcard gaway');
    for (const it of sum.items) {
      const one = it.n === 1 && ['eggs', 'full', 'honey', 'jobs_ready'].includes(it.k), txt = this.t('away_' + it.k + (one ? '1' : ''), { n: it.n, name: it.name, coop: it.coop, t: it.ms ? this.dur(it.ms) : '' });
      const row = el('div', 'gaway-r' + (it.k === 'feed' || it.k === 'full' ? ' gwarn' : '')); row.dataset.k = it.k;
      row.append(el('span', 'gaway-i', IC[it.k] || '•'), el('span', 'gaway-t', txt)); list.append(row);
    }
    if (sum.items.length) b.append(list);
    const row = el('div', 'gstick gstick-wrap');      // (always in sight, the card scrolling under them)
    if (sum.eggs) { const c = el('button', 'gbtn', this.t('away_collect', { n: sum.eggs })); c.type = 'button'; c.addEventListener('click', () => h.collectAll()); row.append(c); }
    const ok = el('button', 'gbtn' + (sum.eggs ? ' galt' : ''), this.t('away_ok')); ok.type = 'button'; ok.addEventListener('click', () => this.close()); row.append(ok);
    b.append(row);
  }
  // ---- the wheat field (tapped, not ripe): how far it's grown and when it's ripe, what it gives, the grain in store; Sow
  // (h.sow) or, ripe, Harvest (h.harvest); Move the field (h.move)
  wheatSheet(h) {
    const g = this.g, st = g.wheatStage(), b = this.open('wheat', this.t('wheat_title'));
    this.bird = null;
    b.append(el('p', 'gtext gwheat-s', this.t('wheat_' + st)));
    if (st !== 'soil' && st !== 'ripe') {
      const left = g.wheatLeft(), u = 1 - left / WHEAT.grow, bar = el('div', 'gbar-xp gfeedbar'), fill = el('div', 'gbar-fill'); fill.style.width = Math.round(100 * Math.max(0.03, u)) + '%'; bar.append(fill);
      b.append(bar, el('p', 'gtext', this.t('wheat_left', { t: this.dur(left) })));
    }
    b.append(el('p', 'gnote', this.t('wheat_how', { c: WHEAT.sow, g: WHEAT.grain, xp: WHEAT.xp })));
    b.append(el('p', 'gnote gfound', '🌾 ' + this.t('wheat_store', { n: Math.floor(g.data.grain || 0), max: WHEAT.max })));
    if (st === 'soil') {
      const broke = g.data.coins < WHEAT.sow, go = el('button', 'gbtn' + (broke ? ' galt' : ''), broke ? this.t('wheat_broke') : this.t('wheat_sow', { c: WHEAT.sow })); go.type = 'button'; go.disabled = broke;
      go.addEventListener('click', () => { if (!go.disabled) h.sow(); }); b.append(go);
    } else if (st === 'ripe') { const go = el('button', 'gbtn', this.t('wheat_harvest')); go.type = 'button'; go.addEventListener('click', () => h.harvest()); b.append(go); }
    const mv = el('button', 'gbtn galt', this.t('wheat_move')); mv.type = 'button'; mv.addEventListener('click', () => h.move()); b.append(mv);
  }
  // ---- a decoration on the farm (tapped): what it is; Move (onMove; not the duck house, on the pond)
  decorCard(id, onMove) {
    const g = this.g, body = this.open('decor', g.decorName(id));
    this.bird = null;
    const card = el('div', 'gcard gpage gdec gdec-own'), pic = el('div', 'gpic'), img = el('img'); img.alt = ''; img.src = 'decor/' + id + '.webp' + (this.o.bust || ''); pic.append(img);
    const info = el('div', 'gpage-i'); info.append(el('p', 'gtext', this.t('decl_' + id)));
    if (id === 'beehives' && g.data.honey) { const n = g.honeyAt(); info.append(el('p', 'gpage-s gfound', '🍯 ' + (n ? (n === 1 ? this.t('honey_jar') : this.t('honey_jars', { n })) : this.t('honey_none', { t: this.dur(g.honeyNext()) })))); }
    if (!DECOR[id].pond) info.append(el('p', 'gnote', this.t('dec_card_body')));
    card.append(pic, info); body.append(card);
    if (onMove && !DECOR[id].pond) { const go = el('button', 'gbtn', this.t('dec_move')); go.type = 'button'; go.addEventListener('click', () => onMove()); body.append(go); }
  }
  // ---- fishing (release 5): the dock's card (tapped): the pond's fish (those caught in colour, the others dark), the worms
  // in the bag (and where they come from: the chickens who love the farmer), Go fishing; a tin of worms. o: { open, worms, state: 'ok'|'night'|'on' }; h: { go, buy }
  dockCard(o, h) {
    const g = this.g, w = o.water === 'river' ? 'river' : 'pond', body = this.open('dock', this.t(w === 'river' ? 'river_title' : 'dock_title')), farmer = g.farmerName();
    this.bird = null;
    const row = el('div', 'gfishrow'); row.dataset.water = w;
    for (const id of FISH_IDS.filter(k => FISH_RULES[k].water === w)) { const im = el('img', g.fishGot(id) ? 'got' : ''); im.alt = ''; im.src = 'fish/' + id + '.webp' + (this.o.bust || ''); row.append(im); }
    body.append(row, el('p', 'gtext', this.t(w === 'river' ? 'river_body' : 'dock_body')));
    if (!o.open) { body.append(el('p', 'gnote', this.t('fish_level', { n: FISHING[w] }))); return; }
    const n = o.worms;
    body.append(el('p', 'gtext gfound', '🪱 ' + (n === 1 ? this.t('fish_worms1') : n ? this.t('fish_worms', { n }) : this.t('fish_worms0'))), el('p', 'gnote', this.t('fish_hens', { farmer })));
    if (o.state === 'night') body.append(el('p', 'gnote', this.t('fish_night', { farmer })));
    else if (o.state === 'on') body.append(el('p', 'gnote', this.t('fish_busy', { farmer }, g.data.farmer.look === 'f')));
    else if (n) { const b = el('button', 'gbtn', '🎣 ' + this.t('fish_go')); b.type = 'button'; b.dataset.fish = 'go'; b.addEventListener('click', () => h.go()); body.append(b); }
    const T = FISHING.tin, tc = el('div', 'gcard'), th = el('div', 'gcard-h'), broke = g.data.coins < T.price;
    th.append(el('span', 'gemoji', '🥫'), el('span', 'gcard-t', this.t('fish_tin', { n: T.n })));
    const bb = el('button', 'gbtn' + (n ? ' galt' : '') + (broke ? ' galt' : ''), broke ? this.t('land_broke', { c: T.price }) : this.t('fish_tin_buy', { c: T.price })); bb.type = 'button'; bb.disabled = broke; bb.dataset.fish = 'tin';
    bb.addEventListener('click', () => { if (!bb.disabled) h.buy(); });
    tc.append(th, bb); body.append(tc);
  }
  // ---- a fish caught (fishing.js): its picture, its name and size, new to you or your biggest yet, sold live to the
  // village aquarium shop (or a legendary one's photo, and back into the water), the coins and XP; Keep fishing, or Stop.
  // then(keep): once it's closed
  fishCard(r, then) {
    const g = this.g, body = this.open('fish', g.fishName(r.id));
    this.bird = null; this.fishThen = then;
    const card = el('div', 'gcard gpage gdec gfishcard' + (r.legend ? ' glegend' : '')), pic = el('div', 'gpic'), img = el('img'); img.alt = ''; img.src = 'fish/' + r.id + '.webp' + (this.o.bust || ''); pic.append(img);
    const info = el('div', 'gpage-i');
    info.append(el('p', 'gfishsize', this.t('fish_size', { cm: r.cm })));
    if (r.first) info.append(el('p', 'gtext gfishnew', '✨ ' + this.t('fish_first')));
    else if (r.best) info.append(el('p', 'gtext gfishnew', '🏆 ' + this.t('fish_best')));
    info.append(el('p', 'gtext', r.legend ? this.t('fish_photo_' + r.id, { c: r.coins }) : this.t('fish_sold', { c: r.coins })), el('p', 'gnote gfound', this.t('fish_xp', { xp: r.xp }) + ' · ' + this.t(r.n === 1 ? 'fish_caught_1' : 'fish_caught_n', { n: r.n })));
    card.append(pic, info); body.append(card);
    const left = g.worms(), row = el('div', 'gstick gfishbtns');
    const done = keep => { const f = this.fishThen; this.fishThen = null; this.close(); if (f) f(keep); };
    if (left) { const k = el('button', 'gbtn', '🎣 ' + this.t('fish_keep') + ' · 🪱 ' + left); k.type = 'button'; k.dataset.fish = 'keep'; k.addEventListener('click', () => done(true)); row.append(k); }
    const s = el('button', 'gbtn' + (left ? ' galt' : ''), this.t(left ? 'fish_stop1' : 'fish_stop')); s.type = 'button'; s.dataset.fish = 'stop'; s.addEventListener('click', () => done(false)); row.append(s);
    body.append(row);
    this.refresh(); this.bumpCoins();
  }
  // ---- Gertrude and Hector (release 3): who they are, their trust (cross .. friends: hearts, what it means, days of visits to
  // the next), a visit (h.visit; friends: a cuddle, or how long they're happy after one; at night, in the morning)
  geeseCard(state, h) {
    const g = this.g, T = g.geeseTrust(), farmer = g.farmerName(), f = !!(g.data.farmer && g.data.farmer.look === 'f');
    if (!T) return;
    const body = this.open('geese', g.animalName('geese'));
    this.bird = null;
    body.append(el('p', 'gsub', this.t('geese_sub')));
    if (T.level === 3 && T.happy > 0) body.append(el('p', 'gtext ghappy', '♥ ' + this.t('geese_happy', { when: g.howLong(T.happy) })));
    else if (state === 'night') body.append(el('p', 'gnote', this.t(T.level === 3 ? 'cuddle_night' : 'geese_night', { farmer })));
    else { const b = el('button', 'gbtn gcuddle', this.t(T.level === 3 ? 'cuddle_btn' : 'geese_visit')); b.type = 'button'; b.addEventListener('click', () => h.visit()); body.append(b); }
    const tc = el('div', 'gcard'), th = el('div', 'gcard-h'), hearts = el('span', 'ghearts');
    for (let i = 1; i <= 3; i++) hearts.append(el('span', i <= T.level ? 'on' : '', i <= T.level ? '♥' : '♡'));
    th.append(hearts, el('span', 'gcard-t', this.t('geese_lv' + T.level)));
    tc.append(el('div', 'glabel', this.t('trust')), th, el('p', 'gtext', this.t('geese_b' + T.level, { farmer }, f)));
    if (T.level < 3) {
      tc.append(el('p', 'gtext', this.t(T.next === 1 ? 'geese_next1' : 'geese_next', { n: T.next, level: this.t('geese_lv' + (T.level + 1)) })));
      tc.append(el('p', 'gnote', this.t(T.today ? 'geese_today' : 'geese_how')));
    }
    body.append(tc);
  }
  // ---- last night's visit (release 3): what Rusty did, a tip when the eggs were taken, the film (h.watch)
  foxCard(l, h) {
    const body = this.open('fox', '🦊 ' + this.t('fox_title'));
    this.bird = null;
    body.append(el('p', 'gtext gfox-story', this.g.foxStory(l)));
    if (l.open && !l.by) body.append(el('p', 'gnote', this.t('fox_tip')));
    const row = el('div', 'gfox-row'), w = el('button', 'gbtn', this.t('fox_watch')), ok = el('button', 'gbtn galt', this.t('fox_ok'));
    w.type = ok.type = 'button';
    w.addEventListener('click', () => { this.close(); h.watch(); }); ok.addEventListener('click', () => this.close());
    row.append(w, ok); body.append(row);
  }
  coinSheet() {
    const b = this.open('coins', this.t('coins') + ' · ' + this.g.data.coins.toLocaleString(this.g.locale()));
    b.append(el('p', 'gtext', this.t('coins_body')));
  }
  // when, in words: today's time ("14:05"), or the day and time ("28 Oct, 14:05")
  when(ms) {
    if (!ms) return '–';
    const d = new Date(ms), L = this.g.locale(), time = d.toLocaleTimeString(L, { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === new Date().toDateString() ? time : d.toLocaleDateString(L, { day: 'numeric', month: 'short' }) + ', ' + time;
  }
  // ---- My account (release 7: account.js). Signed out: what it's for, Sign in with Google, where the farm's kept. Signed
  // in: whose account, the farm's last save online, Sign out, and Delete my account (two taps, then Google asks who it is)
  accountCard() {
    const A = this.o.account, card = el('div', 'gcard gacct');
    const draw = () => {
      card.replaceChildren();
      const hd = el('div', 'gcard-h'); hd.append(el('span', 'gemoji', '☁️'), el('span', 'gcard-t', this.t('acct_t'))); card.append(hd);
      if (!A.user) {
        card.append(el('p', 'gnote', this.t('acct_how')));
        const go = el('button', 'gbtn gsmallbtn gacct-in', this.t('acct_google')); go.type = 'button';
        go.disabled = !A.cloud; if (!A.cloud) A.prepare().then(() => { go.disabled = false; }, () => { go.disabled = false; });      // (ready before the tap: Google's window opens straight from it)
        go.addEventListener('click', () => A.signIn());
        card.append(go);
      } else {
        card.append(el('p', 'gtext gacct-who', this.t('acct_who', { name: A.name() })));
        const S = A.status, line = S === 'saved' ? this.t('acct_saved', { when: this.when(A.savedAt) }) : S === 'syncing' ? this.t('acct_saving') : S === 'offline' ? this.t('acct_offline') : S === 'empty' ? this.t('acct_empty') : '';
        if (line) card.append(el('p', 'gnote gacct-state', line));
        const row = el('div', 'gacct-row');
        const out = el('button', 'gbtn galt gsmallbtn gacct-out', this.t('acct_out')); out.type = 'button';
        out.addEventListener('click', () => A.signOut());
        const del = el('button', 'gbtn galt gsmallbtn gacct-del', this.t('acct_del')); del.type = 'button';
        let sure = false;
        del.addEventListener('click', () => {
          if (!sure) { sure = true; del.textContent = this.t('acct_del_sure'); del.classList.add('gdanger'); setTimeout(() => { sure = false; del.textContent = this.t('acct_del'); del.classList.remove('gdanger'); }, 4000); return; }
          A.drop();
        });
        row.append(out, del); card.append(row);
      }
      card.append(el('p', 'gnote gacct-privacy', this.t('acct_privacy')), this.privacyLink());
    };
    draw();
    const stop = A.watch(() => { if (!card.isConnected) { stop(); return; } draw(); });
    return card;
  }
  // a different farm on this phone and online, both changed since: which one to keep (it has to be chosen: no ✕; left
  // open when another card takes its place, it's asked again later). Resolves 'here', 'online' or null
  twoFarms(here, online) {
    return new Promise(resolve => {
      const b = this.open('twofarms', this.t('two_t'), true);
      this.twoResolve = resolve;
      b.append(el('p', 'gtext', this.t('two_how')));
      for (const [k, f] of [['here', here], ['online', online]]) {
        const c = el('div', 'gcard gtwo gtwo-' + k), hd = el('div', 'gcard-h');
        hd.append(el('span', 'gemoji', k === 'here' ? '📱' : '☁️'), el('span', 'gcard-t', this.t(k === 'here' ? 'two_here' : 'two_online'))); c.append(hd);
        c.append(el('p', 'gtext gtwo-name', this.t('two_farmer', { name: f.name || this.g.defaultFarmer(f.look) })));
        c.append(el('p', 'gnote', this.t('two_sum', { lv: f.lv, c: f.coins.toLocaleString(this.g.locale()) })));
        c.append(el('p', 'gnote', this.t('two_when', { when: this.when(k === 'online' && f.at ? f.at : f.seen) })));
        const keep = el('button', 'gbtn gsmallbtn gtwo-keep', this.t('two_keep')); keep.type = 'button';
        keep.addEventListener('click', () => { this.twoResolve = null; this.close(); resolve(k); });
        c.append(keep); b.append(c);
      }
    });
  }
  // the privacy page (privacy.mjs), in the game's language, opened beside the game
  privacyLink() { const a = el('a', 'glink gprivacy', this.t('privacy')); a.href = 'privacy.html?lang=' + this.g.lang; a.target = '_blank'; a.rel = 'noopener'; return a; }
  // the once-only suggestion, a few days into a farm (main.js showNews; account.js nudgeDue)
  accountNudge() {
    const A = this.o.account, b = this.open('acctask', '☁️ ' + this.t('nudge_t'));
    b.append(el('p', 'gtext', this.t('nudge_how')));
    const row = el('div', 'gfox-row'), go = el('button', 'gbtn gacct-in', this.t('acct_google')), later = el('button', 'gbtn galt', this.t('nudge_later'));
    go.type = later.type = 'button';
    go.disabled = !A.cloud; if (!A.cloud) A.prepare().then(() => { go.disabled = false; }, () => { go.disabled = false; });
    go.addEventListener('click', async () => { const ok = await A.signIn(); if (ok && this.kind === 'acctask') this.close(); });
    later.addEventListener('click', () => this.close());
    row.append(go, later); b.append(row, el('p', 'gnote', this.t('nudge_note')));
  }
  settings() {
    const g = this.g, b = this.open('settings', this.t('settings'));
    const langRow = el('div', 'grow'); langRow.append(el('span', 'glabel', this.t('settings_lang')));
    langRow.append(langPicker(g.lang, l => { g.setLang(l); if (this.o.reload) this.o.reload(); })); b.append(langRow);
    // the music and the farm's sounds (sound.js): each on or off, at once (Audrey, 28 Oct: the music "Now and then"; 29 Oct:
    // her own hens chatting)
    for (const [key, cls, isOn, set, tell] of [['settings_music', 'gmusic', () => g.musicOn(), on => g.setMusic(on), 'music'], ['settings_sounds', 'gsounds', () => g.soundsOn(), on => g.setSounds(on), 'sounds']]) {
      const row = el('div', 'grow ' + cls); row.append(el('span', 'glabel', this.t(key)));
      const ch = el('div', 'gchips');
      for (const on of [true, false]) {
        const c = el('button', 'gchip' + (isOn() === on ? ' on' : ''), this.t(on ? 'music_on' : 'music_off')); c.type = 'button';
        c.addEventListener('click', () => { if (isOn() === on) return; set(on); for (const x of ch.children) x.classList.toggle('on', x === c); if (this.o[tell]) this.o[tell](on); });
        ch.append(c);
      }
      row.append(ch); b.append(row);
    }
    b.append(el('p', 'gnote gsound-note', this.t('settings_music_note')));
    if (this.o.account && this.o.account.on) b.append(this.accountCard());
    b.append(el('p', 'gnote', this.t('saved_here')));
    // the farm code: copy it (iPhone only lets a page copy straight from the tap, so the clipboard is handed a promise of
    // the code rather than waiting for it); shown to select by hand if copying isn't allowed; paste one and load it (two
    // taps: it replaces this farm)
    const card = el('div', 'gcard gcode'), hd = el('div', 'gcard-h'); hd.append(el('span', 'gemoji', '🔑'), el('span', 'gcard-t', this.t('code_t'))); card.append(hd, el('p', 'gnote', this.t('code_how')));
    const copy = el('button', 'gbtn gsmallbtn gcode-copy', this.t('code_copy')); copy.type = 'button'; card.append(copy);
    const shown = el('textarea', 'gcodebox gcode-out'); shown.readOnly = true; shown.rows = 3; shown.hidden = !this.codeShown; shown.value = this.codeShown || ''; shown.setAttribute('aria-label', this.t('code_t'));
    shown.addEventListener('focus', () => shown.select()); card.append(shown);
    copy.addEventListener('click', async () => {
      let copied = false; const pc = g.farmCode();
      try {
        if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) await navigator.clipboard.write([new ClipboardItem({ 'text/plain': pc.then(c => new Blob([c], { type: 'text/plain' })) })]);
        else await navigator.clipboard.writeText(await pc);
        copied = true;
      } catch (e) { try { await navigator.clipboard.writeText(await pc); copied = true; } catch (e2) { /* (shown to copy by hand) */ } }
      this.codeShown = await pc; shown.value = this.codeShown; shown.hidden = false;
      if (this.o.say) this.o.say(this.t(copied ? 'code_copied' : 'code_select'));
    });
    const paste = el('textarea', 'gcodebox gcode-in'); paste.rows = 3; paste.placeholder = this.t('code_paste'); paste.setAttribute('aria-label', this.t('code_paste'));
    paste.autocomplete = 'off'; paste.setAttribute('autocapitalize', 'off'); paste.spellcheck = false; paste.value = this.codeDraft || '';
    paste.addEventListener('input', () => { this.codeDraft = paste.value; });
    let loadSure = false;
    const load = el('button', 'gbtn gsmallbtn gcode-load', this.t('code_load')); load.type = 'button';
    load.addEventListener('click', async () => {
      if (!paste.value.trim()) return;
      if (!loadSure) { loadSure = true; load.textContent = this.t('code_load_sure'); load.classList.add('gdanger'); setTimeout(() => { loadSure = false; load.textContent = this.t('code_load'); load.classList.remove('gdanger'); }, 4000); return; }
      const r = await g.loadCode(paste.value);
      if (!r) { if (this.o.say) this.o.say(this.t('code_bad')); return; }
      if (r.old) { if (this.o.say) this.o.say(this.t('code_old')); return; }
      this.codeDraft = ''; if (this.o.loaded) this.o.loaded();
    });
    card.append(paste, load, el('p', 'gnote', this.t('code_note'))); b.append(card);
    // the first game (only if its farm is on this phone): the way to it, in classic/ beside the 3D game's own folder
    if (firstGameKept()) {
      const fc = el('div', 'gcard gfirst'), fh = el('div', 'gcard-h'); fh.append(el('span', 'gemoji', '🐔'), el('span', 'gcard-t', this.t('first_t'))); fc.append(fh, el('p', 'gnote', this.t('first_how')));
      const open = el('button', 'gbtn gsmallbtn gfirst-open', this.t('first_open')); open.type = 'button';
      open.addEventListener('click', () => { location.href = new URL('../classic/', document.baseURI).href; });
      fc.append(open); b.append(fc);
    }
    if (g.edited) b.append(el('p', 'gnote gwarn', this.t('settings_edited')));
    let sure = false;
    const fresh = el('button', 'gbtn galt', this.t('settings_new')); fresh.type = 'button';
    fresh.addEventListener('click', () => {
      const A = this.o.account && this.o.account.user ? this.o.account : null;      // (signed in: the new farm replaces the one online too)
      if (!sure) { sure = true; fresh.textContent = this.t(A ? 'acct_new_sure' : 'settings_new_sure'); fresh.classList.add('gdanger'); setTimeout(() => { sure = false; fresh.textContent = this.t('settings_new'); fresh.classList.remove('gdanger'); }, 4000); return; }
      if (A) A.freshFarm();
      g.wipe(); if (this.o.reload) this.o.reload();
    });
    b.append(fresh);
    if (this.o.version) b.append(el('p', 'gnote gver', this.t('settings_version', { v: this.o.version })));
    b.append(this.privacyLink());
  }
}
