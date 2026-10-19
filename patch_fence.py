"""Audrey's screenshot (19 Oct): a runaway hen 'standing on the fence', the farmer with a fence post through her face at the
gate, and the blurred band under the iPhone status bar. Fixes:
- runaways hop over the fence (a little flight) to a clear patch of grass away from every fence, and hop back when caught;
- things standing outside the pens (the farmer, runaways, decorations) are drawn in front of any pen's near fence behind them;
- the game loop keeps running even if one frame goes wrong; sound values are checked;
- the home-screen app gets a solid status bar (iOS 26.1+ draws a dark blur over a see-through one), and a farm code to move
  the farm to the reinstalled app (or another phone)."""
p = 'ff.html'; s = open(p).read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, ('count', s.count(old), old[:100]); s = s.replace(old, new)

# ---------------------------------------------------------------- fences: who is in front of which fence
rep("function screenDx(p, dx, dy) {", """const FENCE = { hw: 2.05, front: -1.72, back: 2.1 };     // each pen's fence, in its own metres
function outsideBy(lx, ly) {                             // how far outside a pen's fence a point is (negative: inside)
  const dx = Math.abs(lx) - FENCE.hw, dy = Math.max(FENCE.front - ly, ly - FENCE.back);
  return dx > 0 && dy > 0 ? Math.hypot(dx, dy) : Math.max(dx, dy);
}
function fenceBottom(p, x) {                             // the lowest point on screen of a pen's fence at this x (its near side)
  const c = [[-FENCE.hw, FENCE.front], [FENCE.hw, FENCE.front], [FENCE.hw, FENCE.back], [-FENCE.hw, FENCE.back]].map(([u, v]) => toMap(p.f, u, v));
  let y = null;
  for (let i = 0; i < 4; i++) {
    const [a, b] = [c[i], c[(i + 1) % 4]]; if (a[0] === b[0] || x < Math.min(a[0], b[0]) || x > Math.max(a[0], b[0])) continue;
    const yy = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); if (y == null || yy > y) y = yy;
  }
  return y;
}
// Something standing outside the pens (the farmer, a runaway, a decoration) must be drawn after the near fence of any pen
// that is behind it on screen; the near fence is drawn as one picture, so its single sort place is not enough on its own.
function standKey(x, y) {
  let k = y;
  if (!DATA.fence) return k;
  for (const p of plots) {
    if (p.kind !== 'coop') continue;
    const [lx, ly] = toLocal(p.f, x, y); if (outsideBy(lx, ly) < 0) continue;     // inside this pen: its fence is in front
    const fb = fenceBottom(p, x); if (fb != null && y >= fb - 6) k = Math.max(k, p.f.c[1] + 201);
  }
  return k;
}
// A runaway's patch of grass: outside her pen, clear of every fence, coop, tree, house and decoration (in her pen's metres)
function runawayReg(p) {
  const B = navBlock(), C = NAV.C, w = Math.ceil(GEOM.size[0] / C), [W, H] = GEOM.size;
  const free = (lx, ly) => {
    const [mx, my] = toMap(p.f, lx, ly);
    if (mx < 90 || mx > W - 90 || my < 180 || my > H - 80) return false;
    if (B[Math.floor(my / C) * w + Math.floor(mx / C)]) return false;
    for (const q of plots) if ((q.kind === 'coop' || q.kind === 'build') && outsideBy(...toLocal(q.f, mx, my)) < .45) return false;
    return Math.hypot(mx - GEOM.pasture.c[0], my - GEOM.pasture.c[1]) > 330;
  };
  for (let i = 0; i < 80; i++) {
    const lx = (Math.random() * 2 - 1) * 3.4, ly = -3.6 + Math.random() * (i < 50 ? 3.2 : 6.6);     // the front of the pen first: easier to see
    const o = outsideBy(lx, ly); if (o < .7 || o > 1.6) continue;
    const r = { x0: lx - .3, x1: lx + .3, y0: ly - .22, y1: ly + .22 };
    if ([[r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1], [lx, ly]].every(([u, v]) => free(u, v))) return r;
  }
  return OUTSIDE;
}
const lastSpot = new Map();                              // where a bird was just before she changed sides of the fence
function screenDx(p, dx, dy) {""")
rep("function resetAgent(b) { agents.delete(b.id); }",
    "function resetAgent(b) { const a = agents.get(b.id); if (a && a.plot) lastSpot.set(b.id, { x: a.x, y: a.y, plot: a.plot, out: a.key.endsWith('out') }); agents.delete(b.id); }")
rep("""  const y = out ? OUTSIDE : yardOf(p), face = Math.random() < .5 ? 1 : -1;
  a = { key, reg: y, plot: p,""", """  const y = out ? runawayReg(p) : yardOf(p), face = Math.random() < .5 ? 1 : -1;
  a = { key, reg: y, plot: p,""")
rep("""  agents.set(b.id, a);
  return a;
}""", """  const prev = lastSpot.get(b.id); lastSpot.delete(b.id);
  if (prev && prev.plot === p && prev.out !== out && p.kind === 'coop') {        // over the fence with a flap: out to her patch of grass, or back home
    const H = { x0: prev.x, y0: prev.y, x1: a.x, y1: a.y, t: 0 };
    a.x = H.x0; a.y = H.y0; a.st = 'hop'; a.hop = H; a.t = 9;
    a.face = a.fx = a.faceShown = screenDx(p, H.x1 - H.x0, H.y1 - H.y0) > 0 ? 1 : -1;
  }
  agents.set(b.id, a);
  return a;
}""")
rep("""      let pose = 'farm';
      if (a.st === 'walk' || a.st === 'follow') {""", """      let pose = 'farm';
      if (a.st === 'hop') {                                   // a little flight over the fence
        const H = a.hop; H.t += dt / .9; const k = Math.min(1, H.t), e = k < .5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k);
        a.x = lerp(H.x0, H.x1, e); a.y = lerp(H.y0, H.y1, e); a.lift = Math.sin(Math.PI * k) * 34;
        pose = isV2(b) ? 'walk' + (Math.floor(k * 24) % 8) : (Math.floor(k * 12) % 2 ? 'walk1' : 'walk2');
        if (k >= 1) { a.st = 'idle'; a.t = .8; a.lift = 0; a.hop = null; if (b.out) { a.say = 1.5; a.sayText = t('rebel_say'); } }
      } else if (a.st === 'walk' || a.st === 'follow') {""")
rep("""      const bound = a.task ? PEN : y;
      a.x = clamp(a.x, bound.x0, bound.x1); a.y = clamp(a.y, bound.y0, bound.y1);""", """      const bound = a.task ? PEN : y;
      if (a.st !== 'hop') { a.x = clamp(a.x, bound.x0, bound.x1); a.y = clamp(a.y, bound.y0, bound.y1); }""")
rep("  drawSprite(name, a.sx, a.sy + dy, sx, sy);", "  drawSprite(name, a.sx, a.sy + dy - (a.lift || 0), sx, sy);")
rep("    if (vis(a.sx, a.sy, 80)) { items.push([a.sy, 4, a]); birds.push(a); }",
    "    if (vis(a.sx, a.sy, 80)) { items.push([a.st === 'hop' ? Math.max(a.sy, a.plot.f.c[1] + 202) : a.b.out ? standKey(a.sx, a.sy) : a.sy, 4, a]); birds.push(a); }")
rep("  if (farmerReady() && vis(FARM.x, FARM.y, 120)) items.push([FARM.y, 9, FARM]);", "  if (farmerReady() && vis(FARM.x, FARM.y, 120)) items.push([standKey(FARM.x, FARM.y), 9, FARM]);")
rep("items.push([ay + (moving && moving.id === id ? 2000 : 0), 10, id]); }", "items.push([standKey(ax, ay) + (moving && moving.id === id ? 2000 : 0), 10, id]); }")

# ---------------------------------------------------------------- the game loop never stops; sound values are checked
rep("""function frame(now) {
  if (state && !current) guideFocus();""", """function frame(now) {
  try { frameBody(now); } catch (e) { if (!frame.told) { frame.told = true; console.error('Feather & Field: a frame went wrong', e); } }
  requestAnimationFrame(frame);
}
function frameBody(now) {
  if (state && !current) guideFocus();""")
rep("""  if (dirty) { dirty = false; uiDirty = true; buildPlots(); updateHud(); }
  requestAnimationFrame(frame);
}""", """  if (dirty) { dirty = false; uiDirty = true; buildPlots(); updateHud(); }
}""")
rep("""      bedT = .25; const w = wind(clock), now = ac.currentTime;""", """      bedT = .25; const w = wind(clock), now = ac.currentTime, wv = water();
      if (!isFinite(w) || !isFinite(wv)) return;""")
rep("waterG.gain.setTargetAtTime(.075 * water() * (", "waterG.gain.setTargetAtTime(.075 * wv * (")
rep("""  function spot(x, y) {
    if (x == null || !view.vw) return null;""", """  function spot(x, y) {
    if (x == null || !view.vw || !isFinite(x) || !isFinite(y) || !isFinite(view.x) || !isFinite(view.y)) return null;""")
# the camera can never take a value that is not a number
rep("""function clampCam() {
  const [W, H] = GEOM.size;""", """function clampCam() {
  const [W, H] = GEOM.size;
  if (!isFinite(view.s) || view.s <= 0) view.s = 1;
  if (!isFinite(view.x)) view.x = 0;
  if (!isFinite(view.y)) view.y = 0;""")

# ---------------------------------------------------------------- the farm code: move a farm to another app or phone
rep("function load() {", """/* A farm code: the whole save, packed small, to copy into Notes and paste into the game on another phone or a reinstalled app.
   Loading one goes through every check a normal save does (unwrap → sanitize), and an edited one is flagged like any other. */
const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));
async function squeeze(bytes, how) {
  const cs = how === 'in' ? new CompressionStream('gzip') : new DecompressionStream('gzip');
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(cs)).arrayBuffer());
}
async function farmCode() {
  const data = JSON.stringify(state), w = JSON.stringify({ v: 1, data, sum: fnv(SALT + data), at: Date.now() }), raw = new TextEncoder().encode(w);
  if (typeof CompressionStream === 'function') return 'FF1-' + b64(await squeeze(raw, 'in'));
  return 'FF0-' + b64(raw);
}
async function readFarmCode(code) {
  code = String(code || '').replace(/\\s+/g, '');
  if (code.length < 20 || code.length > 4e6 || !/^FF[01]-[A-Za-z0-9+/=]+$/.test(code)) return null;
  try {
    let bytes = unb64(code.slice(4));
    if (code[2] === '1') { if (typeof DecompressionStream !== 'function') return null; bytes = await squeeze(bytes, 'out'); }
    const w = JSON.parse(new TextDecoder().decode(bytes));
    return unwrap(w);
  } catch (e) { return null; }
}
async function actCopyCode() {
  const code = await farmCode(); let copied = false;
  try { await navigator.clipboard.writeText(code); copied = true; } catch (e) {}
  codeShown = code; toast(t(copied ? 'code_copied' : 'code_select'), copied); renderSheet();
}
async function actLoadCode(code) {
  const s = await readFarmCode(code);
  if (!s) { toast(t('code_bad')); return; }
  agents.clear(); spriteCache.clear(); plotCache.clear(); lastSpot.clear();
  state = s; FARM.init = false; hudCache = ''; save(true); layout(); closeSheet(); updateHud(); toast(t('code_loaded', { n: state.level }), true);
}
let codeShown = '';
function load() {""")
rep("""      state.flags.edited ? h('p', { class: 'warn', text: t('edited') }) : null,""", """      state.flags.edited ? h('p', { class: 'warn', text: t('edited') }) : null,
      h('div', { class: 'card' }, h('h3', { text: t('code_t') }), h('p', { class: 'small', text: t('code_how') }),
        h('button', { class: 'btn sm', onclick: () => actCopyCode() }, t('code_copy')),
        codeShown ? h('textarea', { class: 'codebox', readonly: true, rows: 3, 'aria-label': t('code_t'), onfocus: e => e.target.select() }, codeShown) : null,
        h('textarea', { class: 'codebox', id: 'codeIn', rows: 3, placeholder: t('code_paste'), 'aria-label': t('code_paste'), autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' }),
        confirmBtn('loadcode', t('code_load'), () => actLoadCode(($('#codeIn') || {}).value), 'btn sm alt'),
        h('p', { class: 'tiny muted', text: t('code_note') })),""")
rep(".skgrid{", ".codebox{width:100%;border:1.5px solid var(--line);border-radius:12px;padding:8px 10px;font:500 12px/1.3 ui-monospace,Menlo,monospace;color:var(--ink);background:var(--meringue);resize:vertical;word-break:break-all}\n.skgrid{")
EN = """  code_t:'Move your farm', code_how:'Copy your farm code and keep it somewhere safe (Notes is fine). Paste it here on another phone, or after reinstalling the app, to carry on where you left off.',
  code_copy:'Copy my farm code', code_paste:'Paste a farm code here', code_load:'Load this farm', code_note:'Loading a farm replaces the one on this device.',
  code_copied:'Farm code copied. Paste it into Notes to keep it safe.', code_select:'Here is your farm code: select it all and copy it.', code_bad:'That farm code doesn’t work. Copy it again, all of it.',
  code_loaded:'Farm loaded: level {n}. Welcome back!',
"""
FR = """  code_t:'Déplacer votre ferme', code_how:'Copiez le code de votre ferme et gardez-le en lieu sûr (dans Notes par exemple). Collez-le ici sur un autre téléphone, ou après avoir réinstallé l’app, pour reprendre là où vous en étiez.',
  code_copy:'Copier le code de ma ferme', code_paste:'Collez un code de ferme ici', code_load:'Charger cette ferme', code_note:'Charger une ferme remplace celle de cet appareil.',
  code_copied:'Code copié. Collez-le dans Notes pour le garder.', code_select:'Voici le code de votre ferme : sélectionnez-le en entier et copiez-le.', code_bad:'Ce code ne fonctionne pas. Copiez-le à nouveau, en entier.',
  code_loaded:'Ferme chargée : niveau {n}. Bon retour !',
"""
rep("  enter_show:'Enter a show',", EN + "  enter_show:'Enter a show',")
rep("  enter_show:'Inscrire à un concours',", FR + "  enter_show:'Inscrire à un concours',")

# ---------------------------------------------------------------- iPhone home-screen app: no more see-through status bar hacks
rep("""/* installed on the home screen (iPhone draws the page under the status bar, and 100% then falls short of the bottom): fill the whole screen */
@media (display-mode: standalone){#app{position:fixed;inset:0 0 auto 0;height:100vh}}
.standalone #app{position:fixed;inset:0 0 auto 0;height:100vh}""", """/* installed on the home screen: the status bar is solid (iOS 26.1+ blurs a see-through one), and the page fills what is below it */
@media (display-mode: standalone){#app{position:fixed;inset:0}}
.standalone #app{position:fixed;inset:0}""")
i = s.index("#noblur{display:none}"); j = s.index(".standalone,.standalone body{min-height:calc(100% + env(safe-area-inset-top,0px))}")
s = s[:i] + s[j + len(".standalone,.standalone body{min-height:calc(100% + env(safe-area-inset-top,0px))}"):]
open(p, 'w').write(s); print('patched')
