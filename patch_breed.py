"""Breeding you can plan (Audrey, 19 Oct): choose which rooster each hen breeds with (or 'eggs only'), bring a rooster from
another coop, see the chicks to expect before breeding, a family tree on every bird card, and a sell-or-keep choice for top birds."""
p = 'ff.html'; s = open(p).read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, ('count', s.count(old), old[:100]); s = s.replace(old, new)

# ---------- the normal curve, shared
rep("function gauss() {", "const normCdf = x => .5 * (1 + Math.tanh(.7978845608 * (x + .044715 * x * x * x)));      // the bell curve, closely enough\nfunction gauss() {")
rep("""  const phi = x => .5 * (1 + Math.tanh(.7978845608 * (x + .044715 * x * x * x)));            // the normal curve, closely enough
  let c = 0, wsum = 0;""", "  const phi = normCdf; let c = 0, wsum = 0;")

# ---------- pedigree: parents and grandparents travel with the egg and the bird
rep("function childSpec(sire, dam, nour = 0) {", """const pInfo = b => { const o = { name: b.name, q: quality(b), id: b.id }; if (b.champ) o.ch = b.champ; if (b.colour) o.col = b.colour; return o; };
const gpOf = (sire, dam) => [sire.sire, sire.dam, dam.sire, dam.dam].map(p => p ? { ...p } : null);
// who a hen breeds with: the rooster chosen for her, else the coop's breeding rooster, else its best adult rooster; null = eggs only or no rooster
function mateOf(hen, coop) {
  if (!coop || hen.nobreed || hen.sex !== 'h') return null;
  const roos = adultRoosters(coop); if (!roos.length) return null;
  return roos.find(r => r.id === hen.mate) || roos.find(r => r.id === coop.sire) || roos.slice().sort((a, b) => quality(b) - quality(a))[0];
}
// what to expect from a pairing, before breeding: the chicks' average quality and usual range, the chance one beats both parents,
// and what a chick is worth once grown (the same maths as childSpec, without the luck)
function chickOdds(sire, dam, coop) {
  const nour = coop ? FEEDS[coop.last].egg : 0, tr = {};
  for (const k of TRAITS) tr[k] = clamp((sire.traits[k] + dam.traits[k]) / 2 + nour + (dam.pers === 'mum' ? PR.mumTraits : 0) + MUTATION * 12, 1, 100);
  const q = .3 * tr.type + .3 * tr.plum + .2 * tr.size + .2 * tr.lay, sd = 6 * Math.sqrt(.26);
  const better = 1 - normCdf((Math.max(quality(sire), quality(dam)) + .5 - q) / sd);
  const line = Math.min(4, (sire.champ || 0) + (dam.champ || 0) + Math.floor(((sire.line || 0) + (dam.line || 0)) / 2));
  const fake = c => ({ breed: dam.breed, sex: 'h', traits: tr, champ: 0, line, pers: null, colour: c, born: state.gt - T.adult, home: 'x', boost: 0, trust: 0 });
  const cols = dam.breed === 'sil' && sire.geno && dam.geno ? colourOdds(sire.geno, dam.geno) : null;
  const hen = cols ? cols.reduce((a, [c, p]) => a + p * value(fake(c)), 0) : value(fake());
  return { q: Math.round(q), lo: Math.max(1, Math.round(q - 2 * sd)), hi: Math.min(100, Math.round(q + 2 * sd)), better, worth: Math.round(hen * (HEN_ODDS + (1 - HEN_ODDS) * .85)), cols };
}
// a top bird: what she sells for now, against what her chicks could be worth over the next week (she lays half as much once older)
function outlook(b) {
  const coop = coopById(b.home); if (!coop || !isGrown(b)) return null;
  const left = Math.max(0, b.born + T.older - state.gt), span = Math.max(0, Math.min(7 * DAY, b.born + T.retire - state.gt));
  const prime = Math.min(left, span), late = span - prime;
  const pairs = b.sex === 'h' ? (mateOf(b, coop) ? [[mateOf(b, coop), b]] : []) : birdsIn(coop).filter(x => x.sex === 'h' && isGrown(x) && mateOf(x, coop) === b).map(x => [b, x]);
  let n = 0, total = 0, k = 0, qs = 0;
  for (const [sire, dam] of pairs) {
    const gap = BREEDS[dam.breed].lay * MIN * (1.3 - .6 * dam.traits.lay / 100) * FEEDS[coop.last].lay;
    const e = (prime / gap + late / (2 * gap)) * (dam.pers === 'mum' ? PR.mumFert : FERTILITY), o = chickOdds(sire, dam, coop);
    n += e; total += e * o.worth; k += e * o.better; qs += e * o.q;
  }
  return { n: Math.round(n), total: Math.round(total), k: Math.round(k), q: n ? Math.round(qs / n) : 0, days: Math.max(1, Math.round(span / DAY)), hens: pairs.length,
    now: sellPrice(b), later: sellPrice({ ...b, born: Math.min(b.born, state.gt - T.older) }), left };
}
function childSpec(sire, dam, nour = 0) {""")
rep("    coop.nest.fertile.push({ id: state.nextId++, child: childSpec(sire, hen, FEEDS[coop.last].egg), sire: { name: sire.name, q: quality(sire) }, dam: { name: hen.name, q: quality(hen), id: hen.id }, laid: state.gt });",
    "    coop.nest.fertile.push({ id: state.nextId++, child: childSpec(sire, hen, FEEDS[coop.last].egg), sire: pInfo(sire), dam: pInfo(hen), gp: gpOf(sire, hen), laid: state.gt });")
rep("""  const roos = adultRoosters(coop);
  if (roos.length && Math.random() < (hen.pers === 'mum' ? PR.mumFert : FERTILITY)) {
    const sire = roos.find(r => r.id === coop.sire) || pick(roos);""", """  const sire = mateOf(hen, coop);
  if (sire && Math.random() < (hen.pers === 'mum' ? PR.mumFert : FERTILITY)) {""")
rep("sire: it.egg.sire, dam: it.egg.dam, born:", "sire: it.egg.sire, dam: it.egg.dam, gp: it.egg.gp, born:")
rep("    traits: o.traits, gen: o.gen || 1, sire: o.sire || null, dam: o.dam || null, line: o.line || 0,",
    "    traits: o.traits, gen: o.gen || 1, sire: o.sire || null, dam: o.dam || null, gp: o.gp || null, line: o.line || 0,")
# ---------- saves: every new field checked
rep("function okParent(p) { if (!p || typeof p !== 'object') return null; const o = { name: cleanName(p.name, '?'), q: int(p.q, 1, 100, 40) }; if (Number.isInteger(p.id)) o.id = int(p.id, 1, 1e9, 1); return o; }",
    """function okParent(p) { if (!p || typeof p !== 'object') return null; const o = { name: cleanName(p.name, '?'), q: int(p.q, 1, 100, 40) }; if (Number.isInteger(p.id)) o.id = int(p.id, 1, 1e9, 1);
  if (p.ch) o.ch = int(p.ch, 0, 99, 0); if (typeof p.col === 'string' && SIL[p.col] && Object.hasOwn(SIL, p.col)) o.col = p.col; return o; }
const okGp = g => Array.isArray(g) && g.length === 4 ? g.map(okParent) : null;""")
rep("sire: okParent(e.sire) || { name: '?', q: 40 }, dam: okParent(e.dam) || { name: '?', q: 40 }, laid:", "sire: okParent(e.sire) || { name: '?', q: 40 }, dam: okParent(e.dam) || { name: '?', q: 40 }, gp: okGp(e.gp), laid:")
rep("traits: okTraits(b.traits), gen: int(b.gen, 1, 999, 1), sire: okParent(b.sire), dam: okParent(b.dam), line: int(b.line, 0, 4, 0),",
    "traits: okTraits(b.traits), gen: int(b.gen, 1, 999, 1), sire: okParent(b.sire), dam: okParent(b.dam), gp: okGp(b.gp), line: int(b.line, 0, 4, 0),\n      nobreed: b.sex !== 'r' && b.nobreed === true, mate: b.sex !== 'r' && Number.isInteger(b.mate) ? int(b.mate, 1, 1e9, 1) : null, keep: b.keep === true,")

# ---------- actions
rep("function actSire(b) {", """function actMate(hen, choice) {                 // choice: a rooster's id, or 'eggs' for eggs only
  if (!birdById(hen.id) || hen.sex !== 'h' || hen.home === 'pasture') return;
  if (choice === 'eggs') { hen.nobreed = true; hen.mate = null; }
  else { const r = birdById(choice); if (!r || r.sex !== 'r' || r.home !== hen.home) return; hen.nobreed = false; hen.mate = r.id; }
  changed();
}
function actBringRooster(coop, roo) {          // a rooster from another coop of the breed becomes this coop's breeding rooster; if the coop is full, its rooster swaps places with him
  const from = coopById(roo && roo.home);
  if (!coop || !from || !birdById(roo.id) || roo.sex !== 'r' || !isGrown(roo) || from.id === coop.id || coop.breed !== roo.breed) return false;
  const full = birdsIn(coop).length >= COOP_CAP, mine = birdsIn(coop).filter(b => b.sex === 'r');
  const back = full ? (mine.find(r => r.id === coop.sire) || mine.sort((a, b) => quality(a) - quality(b))[0]) : null;
  if (full && !back) { toast(t('plan_full')); return false; }
  for (const b of [roo, back]) if (b) { b.out = 0; b.outNight = false; b.hide = 0; }
  if (from.sire === roo.id) from.sire = null;
  roo.home = coop.id; resetAgent(roo); settleIn(coop, roo); coop.sire = roo.id;
  if (back) { back.home = from.id; resetAgent(back); settleIn(from, back); if (!from.sire) from.sire = back.id; }
  toast(t('moved', { name: roo.name, coop: coopLabel(coop) }) + (back ? ' · ' + t('plan_swap', { name: back.name, coop: coopLabel(from) }) : ''));
  changed(); return true;
}
function actKeep(b, on) { if (!birdById(b.id) || b.home === 'pasture') return; b.keep = !!on; if (on && b.sex === 'h') b.nobreed = false; if (on && b.sex === 'r') { const c = coopById(b.home); if (c && isGrown(b)) c.sire = b.id; } changed(); }
function actSire(b) {""")

# ---------- the coop's breeding plan (replaces the old 'Breeding rooster' and colour-odds cards)
rep("  coop({ id }) {", "  coop({ id, plan }) {")
i = s.index("    let odds = null;\n    if (coop.breed === 'sil') {"); j = s.index("    if (!isBuilt(coop)) return {", i)
s = s[:i] + """    const pct = x => x < .01 ? '<1%' : x > .99 ? '>99%' : Math.round(x * 100) + '%';
    const main = roos.find(r => r.id === coop.sire) || roos.slice().sort((a, b) => quality(b) - quality(a))[0];
    const away = state.birds.filter(r => r.sex === 'r' && r.breed === coop.breed && isGrown(r) && r.home !== coop.id && coopById(r.home));
    const breeders = birds.filter(x => x.sex === 'h' && isGrown(x) && !x.nobreed);
    const avg = r => breeders.length ? Math.round(breeders.reduce((a, x) => a + chickOdds(r, x, coop).q, 0) / breeders.length) : null;
    let planCard;
    if (plan === 'roo') {                        // choosing the breeding rooster: one of this coop's, or one brought in from another coop
      const full = birds.length >= COOP_CAP, mine = birds.filter(x => x.sex === 'r');
      const back = full ? (mine.find(r => r.id === coop.sire) || mine.slice().sort((a, b) => quality(a) - quality(b))[0]) : null;
      const row = (r, where, btn, note) => h('div', { class: 'card', style: 'gap:6px;padding:10px;background:var(--meringue)' }, birdRow(r),
        h('div', { class: 'row' }, h('span', { class: 'small grow' }, where ? h('span', { class: 'muted', text: where + ' · ' }) : null, avg(r) != null ? t('plan_avg', { q: avg(r) }) : ''), btn), note ? h('p', { class: 'tiny muted', text: note }) : null);
      const sortQ = list => list.sort((a, b) => (avg(b) || quality(b)) - (avg(a) || quality(a)));
      const here = sortQ(roos.filter(r => r !== main)).map(r => row(r, null, h('button', { class: 'btn sm', onclick: () => { actSire(r); current.args.plan = null; renderSheet(); } }, t('plan_use'))));
      const there = sortQ(away.slice()).map(r => row(r, coopLabel(coopById(r.home)),
        h('button', { class: 'btn sm', disabled: full && !back, onclick: () => { if (actBringRooster(coop, r)) { current.args.plan = null; renderSheet(); } } }, t('plan_bring')),
        full ? (back ? t('plan_swap', { name: back.name, coop: coopLabel(coopById(r.home)) }) : t('plan_full')) : null));
      planCard = h('div', { class: 'card' }, h('h3', { text: t('plan_pick_t') }), breeders.length ? h('p', { class: 'note', text: t('plan_pick_note') }) : null,
        main ? row(main, null, h('span', { class: 'tag blue', text: t('is_sire') })) : null,
        here.length ? [h('div', { class: 'small', style: 'font-weight:700', text: t('plan_here') }), here] : null,
        there.length ? [h('div', { class: 'small', style: 'font-weight:700', text: t('plan_other_coops') }), there] : null,
        !here.length && !there.length ? h('p', { class: 'small muted', text: t('plan_no_other', { breed: breedName(coop.breed) }) }) : null,
        h('button', { class: 'btn alt sm', onclick: () => { current.args.plan = null; renderSheet(); } }, t('plan_back')));
    } else {
      const hens = birds.filter(x => x.sex === 'h');
      planCard = h('div', { class: 'card' }, h('h3', { text: t('plan_t') }),
        main ? h('div', { class: 'row' }, h('span', { class: 'small grow' }, t('plan_roo', { name: main.name }), ' ', h('span', { class: 'grade', style: 'font-size:13px;padding:2px 6px;background:var(--meringue)', text: grade(quality(main)) })),
          roos.length > 1 || away.length ? h('button', { class: 'btn sm alt', onclick: () => { current.args.plan = 'roo'; renderSheet(); } }, t('plan_change')) : null)
          : [h('p', { class: 'small warn', text: t('no_rooster') }), away.length ? h('button', { class: 'btn sm', onclick: () => { current.args.plan = 'roo'; renderSheet(); } }, t('plan_bring_one')) : null],
        main && hens.length ? h('p', { class: 'note', text: t('plan_note') }) : null,
        hens.map(hen => {
          const top = h('div', { class: 'row' }, h('span', { class: 'grade', style: 'font-size:13px;padding:2px 6px;background:var(--meringue)', text: grade(quality(hen)) }), h('b', { class: 'grow', style: 'font-family:var(--display)', text: hen.name }));
          if (!isGrown(hen)) return h('div', { class: 'planrow' }, top, h('p', { class: 'small muted', text: t('plan_young') }));
          if (!roos.length) return null;
          const m = mateOf(hen, coop), o = m ? chickOdds(m, hen, coop) : null;
          const choices = roos.map(r => [r.id, roos.length > 1 ? t('plan_with', { name: r.name }) : t('plan_breed')]);
          return h('div', { class: 'planrow' }, top,
            h('div', { class: 'chips', role: 'group', 'aria-label': hen.name }, [...choices, ['eggs', t('plan_eggs')]].map(([v, l]) => h('button', { class: 'chip', 'aria-pressed': String(v === 'eggs' ? !m : !!m && m.id === v), onclick: () => { actMate(hen, v); renderSheet(); } }, l))),
            o ? [h('p', { class: 'small', text: t('plan_chicks', { q: o.q, lo: o.lo, hi: o.hi }) }),
              h('p', { class: 'small muted' }, t('plan_better', { p: pct(o.better) }), ' · ', t('plan_worth'), ' ', coinPrice(o.worth)),
              o.cols ? h('div', { class: 'row', style: 'flex-wrap:wrap;gap:6px' }, o.cols.map(([c, p]) => h('span', { class: 'tag' + (state.seen.includes('sil_' + c) ? '' : ' gold') }, `${t('col_' + c)} ${Math.round(p * 100)}%`))) : null]
              : h('p', { class: 'small muted', text: t('plan_eggs_note') }));
        }),
        coop.breed === 'sil' && main ? h('p', { class: 'tiny muted', text: t('odds_note') }) : null);
    }
""" + s[j:]
rep("""      h('div', { class: 'card' },
        h('h3', { text: t('sire') }),
        roos.length ? h('p', { class: 'small', text: sire ? `${sire.name} · ${t('quality')} ${quality(sire)}` : t('sire_auto') }) : h('p', { class: 'small warn', text: t('no_rooster') }),
        roos.length ? h('p', { class: 'note', text: t('sire_note') }) : null),
      odds,
""", "      planCard,\n")

# ---------- the bird card: breeding line, family tree, sell or keep
rep("""      (b.champ || b.line) ? h('p', { class: 'note', text: t('champ_line') }) : null,
      ribbons,
      h('div', { class: 'small muted' }, `${t('parents')}: `, (b.sire || b.dam) ? `${b.sire ? b.sire.name + ' (' + b.sire.q + ')' : '?'} × ${b.dam ? b.dam.name + ' (' + b.dam.q + ')' : '?'}` : t('unknown'), ` · ${t('gen')} ${b.gen}`),""",
"""      (b.champ || b.line) ? h('p', { class: 'note', text: t('champ_line') }) : null,
      ribbons,
      sellOrKeep(b),
      breedingCard(b),
      familyTree(b),""")
rep("        b.champ ? h('span', { class: 'tag red', text: (b.champ > 1 ? b.champ + '× ' : '') + t('champion') }) : null,",
    "        b.champ ? h('span', { class: 'tag red', text: (b.champ > 1 ? b.champ + '× ' : '') + t('champion') }) : null,\n        b.keep && b.home !== 'pasture' ? h('span', { class: 'tag good', text: '♥ ' + t('keeper') }) : null,")
rep("function confirmBtn(key, label, fn, cls = 'btn') {", """function familyTree(b) {                        // the bird, its parents and grandparents; a relative still on the farm opens its card
  const node = (p, me, row, col) => {
    const pos = `grid-column:${col};grid-row:${row}`;
    if (!p) return h('div', { class: 'tnode unk', style: pos }, h('b', { text: '?' }));
    const live = !me && p.id && birdById(p.id) && birdById(p.id).name === p.name ? birdById(p.id) : null;
    return h(live ? 'button' : 'div', { class: 'tnode' + (me ? ' me' : ''), style: pos, onclick: live ? () => openSheet('bird', { id: live.id }) : null, 'aria-label': live ? p.name : null },
      h('b', { text: (p.ch ? '🏅 ' : '') + p.name }), h('span', { text: `${grade(p.q)} · ${p.q}` + (p.col ? ' · ' + t('col_' + p.col) : '') }));
  };
  if (!b.sire && !b.dam) return h('div', { class: 'card' }, h('h3', { text: t('tree_t') }), h('p', { class: 'small muted', text: t('tree_unknown') }));
  const g = b.gp || [null, null, null, null], me = pInfo(b);
  return h('div', { class: 'card' }, h('div', { class: 'row' }, h('h3', { class: 'grow', text: t('tree_t') }), h('span', { class: 'small muted', text: `${t('gen')} ${b.gen}` })),
    h('div', { class: 'tree' }, node(me, true, '1/5', 1), h('div', { class: 'tbr', style: 'grid-column:2;grid-row:1/5' }),
      node(b.sire, false, '1/3', 3), node(b.dam, false, '3/5', 3), h('div', { class: 'tbr', style: 'grid-column:4;grid-row:1/3' }), h('div', { class: 'tbr', style: 'grid-column:4;grid-row:3/5' }),
      g.map((p, i) => node(p, false, String(i + 1), 5))),
    h('div', { class: 'tiny muted', text: t('tree_note') }));
}
function breedingCard(b) {                       // who this bird breeds with, and the chicks to expect
  const coop = coopById(b.home); if (!coop || !isGrown(b)) return null;
  let line;
  if (b.sex === 'h') { const m = mateOf(b, coop); line = m ? t('breeds_with', { name: m.name, q: chickOdds(m, b, coop).q }) : t(b.nobreed ? 'breeds_eggs' : 'breeds_noroo'); }
  else { const hens = birdsIn(coop).filter(x => x.sex === 'h' && isGrown(x) && mateOf(x, coop) === b);
    line = hens.length ? t('breeds_roo', { n: hens.length, q: Math.round(hens.reduce((a, x) => a + chickOdds(b, x, coop).q, 0) / hens.length) }) : t('breeds_none_r'); }
  return h('div', { class: 'card' }, h('h3', { text: t('plan_t') }), h('p', { class: 'small', text: line }),
    h('button', { class: 'btn alt sm', onclick: () => openSheet('coop', { id: coop.id }) }, t('breeds_open')));
}
function sellOrKeep(b) {                         // top birds: sell now, or keep her and breed?
  if (stage(b) === 'chick' || b.home === 'pasture' || !(quality(b) >= 75 || b.champ || b.keep)) return null;
  const o = outlook(b); if (!o) return null;
  const r = b.sex === 'r' ? '_r' : '';
  const older = o.left > 0 ? h('p', { class: 'small', text: t('sk_older' + r, { v: fmtN(o.now), t: fmtDur(realLeft(o.left)), v2: fmtN(o.later) }) }) : null;
  if (b.keep) return h('div', { class: 'card' }, h('h3', { text: t('sk_t') }), h('p', { class: 'small', style: 'font-weight:700', text: t('sk_kept' + r, { name: b.name }) }),
    o.n ? h('p', { class: 'small', text: t('sk_detail' + r, { n: o.n, d: o.days, q: o.q, k: o.k }) }) : null, older,
    h('button', { class: 'textbtn', onclick: () => actKeep(b, false) }, t('sk_undo')));
  return h('div', { class: 'card' }, h('h3', { text: t('sk_t') }),
    h('div', { class: 'skgrid' },
      h('div', { class: 'skopt' }, h('div', { class: 'small muted', text: t('sk_now') }), h('div', { class: 'big' }, coinPrice(o.now)),
        confirmBtn('sell' + b.id, t('sell'), () => actSell(b), 'btn sm alt')),
      h('div', { class: 'skopt' }, h('div', { class: 'small muted', text: t('sk_keep', { d: o.days }) }), h('div', { class: 'big' }, o.total ? coinPrice(o.total) : '–'),
        h('button', { class: 'btn sm good', onclick: () => actKeep(b, true) }, t('sk_keep_btn' + r)))),
    o.n ? h('p', { class: 'small', text: t('sk_detail' + r, { n: o.n, d: o.days, q: o.q, k: o.k }) + ' ' + t('sk_if') })
      : h('p', { class: 'small warn', text: t(b.sex === 'h' ? (b.nobreed ? 'breeds_eggs' : 'breeds_noroo') : 'breeds_none_r') }),
    older);
}
function confirmBtn(key, label, fn, cls = 'btn') {""")

# ---------- styles
rep(".card .tag.good{background:var(--meadow);color:#fff}", """.card .tag.good{background:var(--meadow);color:#fff}.tag.good{background:var(--meadow);color:#fff}
.card .chip{background:var(--meringue)}.card .chip[aria-pressed="true"]{background:var(--ink);color:var(--meringue)}
.planrow{display:flex;flex-direction:column;gap:6px;padding-top:10px;border-top:1.5px solid var(--line)}.planrow p{margin:0}
.tree{display:grid;grid-template-columns:minmax(0,1fr) 14px minmax(0,1fr) 14px minmax(0,1fr);grid-auto-rows:1fr;row-gap:6px;align-items:center}
.tnode{background:var(--meringue);border:0;border-radius:12px;padding:6px 8px;text-align:left;font:inherit;color:var(--ink);min-width:0;display:flex;flex-direction:column;gap:1px}
button.tnode{cursor:pointer;box-shadow:inset 0 0 0 2px var(--line)}
.tnode b{font:600 13px var(--display);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tnode span{font-size:11.5px;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tnode.me{background:var(--ink);color:var(--meringue)}.tnode.me span{color:#cbd6c3}.tnode.unk{color:var(--ink-2);opacity:.65}
.tbr{position:relative;align-self:stretch}.tbr::after{content:'';position:absolute;left:6px;right:0;top:25%;bottom:25%;border:2px solid var(--line);border-right:0;border-radius:6px 0 0 6px}.tbr::before{content:'';position:absolute;left:0;width:7px;top:calc(50% - 1px);border-top:2px solid var(--line)}
.skgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.skopt{background:var(--meringue);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:6px;justify-content:space-between}.skopt .big{font:700 20px var(--display)}.skopt .btn{width:100%}""")

# ---------- words
EN = """  plan_t:'Breeding plan', plan_roo:'Breeding rooster: {name}', plan_change:'Change', plan_bring_one:'Bring a rooster from another coop',
  plan_note:'Choose who each hen breeds with. “Eggs only” hens lay eating eggs to sell, and never fertile ones.',
  plan_breed:'Breed', plan_with:'With {name}', plan_eggs:'Eggs only', plan_eggs_note:'Lays eating eggs only.', plan_young:'Still growing: she can breed once grown up.',
  plan_chicks:'Chicks: quality about {q} (usually {lo}–{hi})', plan_better:'{p} beat both parents', plan_worth:'worth about', 
  plan_pick_t:'Choose the breeding rooster', plan_pick_note:'“Chicks about” is the average chick quality with the hens of this coop.', plan_avg:'Chicks about {q}',
  plan_here:'In this coop', plan_other_coops:'In other coops', plan_use:'Use him', plan_bring:'Bring him here', plan_swap:'{name} goes to {coop}',
  plan_full:'This coop is full and has no rooster to swap: move a hen out first.', plan_back:'Back', plan_no_other:'You have no other grown-up {breed} rooster.',
  tree_t:'Family tree', tree_unknown:'Bought at the market: parents unknown.', tree_note:'🏅 champion. Tap a relative still on your farm to see their card.',
  breeds_with:'Breeds with {name}: chicks about {q}.', breeds_eggs:'Eggs only: her eggs are not for hatching.', breeds_noroo:'No adult rooster in her coop, so her eggs can’t hatch.',
  breeds_roo:'Fathers the chicks of {n} hens: quality about {q}.', breeds_none_r:'No hen breeds with him at the moment.', breeds_open:'Open the breeding plan',
  sk_t:'Sell or keep?', sk_now:'Sell now', sk_keep:'Keep: her chicks, next {d} days', sk_keep_btn:'Keep her', sk_keep_btn_r:'Keep him', sell:'Sell',
  sk_detail:'About {n} fertile eggs in the next {d} days. Chicks about {q}, and about {k} of them could beat both parents.',
  sk_detail_r:'About {n} fertile eggs from his hens in the next {d} days. Chicks about {q}, and about {k} of them could beat both parents.',
  sk_if:'That’s if you hatch and raise them all.', sk_kept:'You’re keeping {name} for breeding.', sk_kept_r:'You’re keeping {name} for breeding.', sk_undo:'Change my mind', keeper:'Keeper',
  sk_older:'She sells for {v} until she gets older in {t}, then {v2}. Best of both: breed from her now and sell before then.',
  sk_older_r:'He sells for {v} until he gets older in {t}, then {v2}. Best of both: breed from him now and sell before then.',
"""
FR = """  plan_t:'Plan de reproduction', plan_roo:'Coq reproducteur : {name}', plan_change:'Changer', plan_bring_one:'Amener un coq d’un autre poulailler',
  plan_note:'Choisissez avec qui chaque poule se reproduit. Les poules « Œufs seulement » pondent des œufs à vendre, jamais fécondés.',
  plan_breed:'Reproduire', plan_with:'Avec {name}', plan_eggs:'Œufs seulement', plan_eggs_note:'Pond seulement des œufs à vendre.', plan_young:'Encore jeune : elle pourra se reproduire une fois adulte.',
  plan_chicks:'Poussins : qualité d’environ {q} (en général {lo}–{hi})', plan_better:'{p} meilleurs que les deux parents', plan_worth:'valent environ',
  plan_pick_t:'Choisir le coq reproducteur', plan_pick_note:'« Poussins : environ » est la qualité moyenne des poussins avec les poules de ce poulailler.', plan_avg:'Poussins : environ {q}',
  plan_here:'Dans ce poulailler', plan_other_coops:'Dans d’autres poulaillers', plan_use:'Le choisir', plan_bring:'L’amener ici', plan_swap:'{name} part dans {coop}',
  plan_full:'Ce poulailler est plein et n’a pas de coq à échanger : déplacez d’abord une poule.', plan_back:'Retour', plan_no_other:'Vous n’avez pas d’autre coq adulte ({breed}).',
  tree_t:'Arbre généalogique', tree_unknown:'Acheté(e) au marché : parents inconnus.', tree_note:'🏅 champion. Touchez un parent encore à la ferme pour voir sa fiche.',
  breeds_with:'Se reproduit avec {name} : poussins d’environ {q}.', breeds_eggs:'Œufs seulement : ses œufs ne sont pas faits pour éclore.', breeds_noroo:'Pas de coq adulte dans son poulailler : ses œufs ne peuvent pas éclore.',
  breeds_roo:'Père des poussins de {n} poules : qualité d’environ {q}.', breeds_none_r:'Aucune poule ne se reproduit avec lui pour le moment.', breeds_open:'Ouvrir le plan de reproduction',
  sk_t:'Vendre ou garder ?', sk_now:'Vendre maintenant', sk_keep:'Garder : ses poussins, {d} prochains jours', sk_keep_btn:'La garder', sk_keep_btn_r:'Le garder', sell:'Vendre',
  sk_detail:'Environ {n} œufs fécondés dans les {d} prochains jours. Poussins d’environ {q}, et environ {k} pourraient dépasser les deux parents.',
  sk_detail_r:'Environ {n} œufs fécondés de ses poules dans les {d} prochains jours. Poussins d’environ {q}, et environ {k} pourraient dépasser les deux parents.',
  sk_if:'À condition de tous les faire éclore et grandir.', sk_kept:'Vous gardez {name} pour la reproduction.', sk_kept_r:'Vous gardez {name} pour la reproduction.', sk_undo:'Changer d’avis', keeper:'À garder',
  sk_older:'Elle se vend {v} jusqu’à ce qu’elle vieillisse dans {t}, puis {v2}. Le meilleur des deux : faites-la reproduire maintenant et vendez-la avant.',
  sk_older_r:'Il se vend {v} jusqu’à ce qu’il vieillisse dans {t}, puis {v2}. Le meilleur des deux : faites-le reproduire maintenant et vendez-le avant.',
"""
rep("  enter_show:'Enter a show',", EN + "  enter_show:'Enter a show',")
rep("  enter_show:'Inscrire à un concours',", FR + "  enter_show:'Inscrire à un concours',")
open(p, 'w').write(s); print('patched')
