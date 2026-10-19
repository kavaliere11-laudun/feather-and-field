"""A clearer Shows screen (Audrey: 'I don't understand that show section very well'): how shows work in three lines, who can
enter each show and why not, each bird's judges' score and chance of a rosette, and a one-tap 'Enter <best bird>'."""
p = 'ff.html'; s = open(p).read()
def rep(old, new):
    global s
    assert s.count(old) == 1, ('count', s.count(old), old[:90]); s = s.replace(old, new)

# ---- the odds: each other entrant beats you with probability p; a rosette means at most two of them do
rep("function judge(s) {", """function showScore(b) { return showScoreBase(b) * (b.pers === 'diva' ? PR.divaShow : 1) * (b.clover ? PR.clover : 1); }
function rosetteChance(b, tier) {               // the chance of finishing in the top three (the judging adds a little luck on both sides)
  const T_ = TIERS[tier], z = (showScore(b) - T_.mean) / Math.sqrt(T_.sd * T_.sd + 16);
  const phi = x => .5 * (1 + Math.tanh(.7978845608 * (x + .044715 * x * x * x)));            // the normal curve, closely enough
  const p = 1 - phi(z), n = T_.n - 1; let c = 0, comb = 1;
  for (let k = 0; k <= 2; k++) { c += comb * p ** k * (1 - p) ** (n - k); comb = comb * (n - k) / (k + 1); }
  return Math.max(0, Math.min(1, c));
}
const chanceWord = c => t(c < .15 ? 'ch_slim' : c < .4 ? 'ch_fair' : c < .7 ? 'ch_good' : 'ch_great');
function whyNot(s) {                            // why nobody can enter a show
  if (TIER_LVL[s.tier] > state.level) return t('locked_long', { n: TIER_LVL[s.tier] });
  const pool = state.birds.filter(b => b.home !== 'pasture' && (s.cls === 'any' || b.breed === s.cls));
  if (!pool.length) return t(s.cls === 'any' ? 'why_none' : 'why_breed', { breed: t('br_' + s.cls) });
  if (!pool.some(isGrown)) return t('why_young');
  if (s.cls === 'sil' && !pool.some(b => isGrown(b) && SIL[b.colour].show)) return t('why_colour');
  return t('why_busy');
}
function judge(s) {""")
rep("  const mine = showScoreBase(b) * (b.pers === 'diva' ? PR.divaShow : 1) * (b.clover ? PR.clover : 1) + gauss() * 4; b.clover = false;",
    "  const mine = showScore(b) + gauss() * 4; b.clover = false;")
# ---- the screen
i = s.index("  shows({ pickFor } = {}) {"); j = s.index("  awards() {", i)
new = """  shows({ pickFor } = {}) {
    const chanceTag = (b, tier) => { const c = rosetteChance(b, tier); return h('span', { class: 'tag ' + (c >= .4 ? 'good' : ''), title: t('chance_title') }, `${chanceWord(c)} · ${Math.round(c * 100)}%`); };
    const prizes = T_ => h('div', { class: 'row small', style: 'flex-wrap:wrap;gap:10px' }, [1, 2, 3].map(p => h('span', { class: 'row', style: 'gap:5px' }, h('span', { class: 'rosette p' + p, style: 'width:22px;height:22px' }), coinPrice(T_.prize[p - 1]))),
      h('span', { class: 'muted' }, t('fee_n'), ' ', coinPrice(T_.fee)));
    const list = state.shows.list.map(s => {
      const T_ = TIERS[s.tier], entry = s.entry ? birdById(s.entry) : null;
      const eligible = state.birds.filter(b => canEnter(b, s)).sort((a, b) => showScore(b) - showScore(a)), best = eligible[0];
      const who = s.cls === 'any' ? t('who_any') : t(s.cls === 'sil' ? 'who_sil' : 'who_breed', { breed: t('br_' + s.cls) });
      let body;
      if (entry) body = h('div', { class: 'row' }, h('span', { class: 'grow small', style: 'font-weight:700', text: t('entered_bird', { name: entry.name }) }), chanceTag(entry, s.tier));
      else if (pickFor === s.id) body = [h('p', { class: 'small', text: t('choose_bird') }),
        h('div', { class: 'list' }, eligible.map(b => h('div', { class: 'card', style: 'gap:6px;padding:10px' }, birdRow(b),
          h('div', { class: 'row' }, h('span', { class: 'small muted grow', text: t('judge_score', { n: Math.round(showScore(b)) }) }), chanceTag(b, s.tier),
            h('button', { class: 'btn sm', disabled: state.coins < T_.fee, onclick: () => { actEnter(b, s); current.args.pickFor = null; renderSheet(); } }, t('enter_go'))))))];
      else if (best) body = [h('div', { class: 'row' }, h('span', { class: 'small grow', text: t('your_best', { name: best.name, n: Math.round(showScore(best)) }) }), chanceTag(best, s.tier)),
        h('div', { class: 'btns', style: 'display:grid;grid-template-columns:1.3fr 1fr;gap:8px' },
          h('button', { class: 'btn sm', disabled: state.coins < T_.fee, onclick: () => actEnter(best, s) }, t('enter_name', { name: best.name })),
          eligible.length > 1 ? h('button', { class: 'btn sm alt', onclick: () => { current.args.pickFor = s.id; renderSheet(); } }, t('choose_other')) : null)];
      else body = h('p', { class: 'small muted', text: whyNot(s) });
      return h('div', { class: 'card' },
        h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { style: 'font-weight:700;font-family:var(--display)', text: showName(s) }), h('div', { class: 'small muted', text: `${t('t_' + s.tier)} · ${who}` })), h('span', { class: 'tag' }, timer(s.closes, 'closes_in'))),
        prizes(T_), body);
    });
    const hist = state.shows.history.slice(0, 10).map(r => h('div', { class: 'item', style: 'cursor:default' }, h('span', { class: 'rosette p' + (r.place <= 3 ? r.place : 0) }), h('div', { class: 'grow' }, h('div', { style: 'font-weight:700', text: `${r.bird} · ${r.place <= 3 ? placeLabel(r.place) : t('not_placed')}` }), h('div', { class: 'small muted', text: t('show_name_' + r.tier, { town: r.town, county: r.county }) + (r.prize ? ' · +' + fmtN(r.prize) : '') }))));
    const lockedTier = Object.keys(TIER_LVL).find(k => TIER_LVL[k] > state.level);
    return { title: t('tab_shows'), node: [
      h('div', { class: 'card', style: 'gap:6px' }, h('h3', { text: t('shows_how_t') }),
        h('p', { class: 'small', text: t('shows_how1') }), h('p', { class: 'small', text: t('shows_how2') }), h('p', { class: 'small', text: t('shows_how3') }),
        h('p', { class: 'small muted' }, timer(state.shows.next, 'next_show'))),
      h('h3', { text: t('shows_open') }), list.length ? list : h('p', { class: 'muted', text: t('no_shows_now') }),
      lockedTier ? h('div', { class: 'card locked' }, h('div', { class: 'row' }, h('div', { class: 'grow', style: 'font-weight:700', text: t('t_' + lockedTier) }), h('span', { class: 'tag lock', text: '🔒 ' + t('locked_lvl', { n: TIER_LVL[lockedTier] }) })), prizes(TIERS[lockedTier])) : null,
      h('h3', { text: t('results') }), hist.length ? h('div', { class: 'list' }, hist) : h('p', { class: 'small muted', text: t('no_results') }),
    ] };
  },
"""
s = s[:i] + new + s[j:]
EN = """  shows_how_t:'How shows work', shows_how1:'Enter one bird in each show. The judges look at Type, Plumage and Size, not laying.',
  shows_how2:'At judging time your bird is scored against the other entries. 1st, 2nd and 3rd win a rosette, coins and XP.',
  shows_how3:'Winning a County or National show makes your bird a champion: she is worth more, and so are her chicks.',
  who_any:'any breed can enter', who_breed:'{breed}s only', who_sil:'Silkies in a show colour only', fee_n:'Entry', no_shows_now:'No show at the moment.',
  your_best:'Your best bird: {name} (judges’ score {n})', judge_score:'Judges’ score {n}', enter_name:'Enter {name}', choose_other:'Choose another',
  ch_slim:'Slim chance', ch_fair:'Fair chance', ch_good:'Good chance', ch_great:'Great chance', chance_title:'Chance of a rosette (1st, 2nd or 3rd)',
  why_none:'You have no birds that can enter yet.', why_breed:'You need an adult {breed} to enter.', why_young:'Your birds are too young: they can enter once they are grown up.',
  why_colour:'Only Silkies in a show colour can enter (white, black, blue, buff, partridge or grey).', why_busy:'Your birds are already entered in other shows.',
"""
FR = """  shows_how_t:'Comment ça marche', shows_how1:'Inscrivez une volaille par concours. Les juges regardent le type, le plumage et la taille, pas la ponte.',
  shows_how2:'Au moment du jugement, votre volaille est notée face aux autres. Les 1er, 2e et 3e gagnent une cocarde, des pièces et de l’XP.',
  shows_how3:'Gagner un concours régional ou national fait de votre volaille un champion : elle vaut plus cher, et ses poussins aussi.',
  who_any:'toutes races', who_breed:'{breed} uniquement', who_sil:'poules soie de couleur standard uniquement', fee_n:'Inscription', no_shows_now:'Aucun concours pour le moment.',
  your_best:'Votre meilleure volaille : {name} (note des juges {n})', judge_score:'Note des juges {n}', enter_name:'Inscrire {name}', choose_other:'En choisir une autre',
  ch_slim:'Peu de chances', ch_fair:'Des chances', ch_good:'Bonnes chances', ch_great:'Très bonnes chances', chance_title:'Chances de cocarde (1er, 2e ou 3e)',
  why_none:'Vous n’avez pas encore de volaille qui peut concourir.', why_breed:'Il vous faut une volaille adulte ({breed}) pour concourir.', why_young:'Vos volailles sont trop jeunes : elles pourront concourir une fois adultes.',
  why_colour:'Seules les poules soie de couleur standard peuvent concourir (blanc, noir, bleu, fauve, perdrix ou gris).', why_busy:'Vos volailles sont déjà inscrites à d’autres concours.',
"""
rep("  enter_show:'Enter a show',", EN + "  enter_show:'Enter a show',")
rep("  enter_show:'Inscrire à un concours',", FR + "  enter_show:'Inscrire à un concours',")
rep("closes_in:'Judging in {t}'", "closes_in:'Results in {t}'")
rep("closes_in:'Jugement dans {t}'", "closes_in:'Résultats dans {t}'")
open(p, 'w').write(s); print('patched')
