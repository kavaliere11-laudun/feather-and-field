"""Assemble game/index.html: the v1 game rules + UI, with the drawn-in-code scene swapped for the Blender art."""
import json, re, os
D = '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad'
src = open(f'{D}/feather-and-field.html').read().split('\n')
scene = open(f'{D}/scene_new.js').read()
geom = open(f'{D}/game/geom.json').read()
spr = open(f'{D}/game/sprites.json').read()
scene = scene.replace('/*GEOM*/null', geom).replace('/*SPRITES*/null', spr)

# lines are 1-based in the editor: 712..1401 is the old art + scene section
start = next(i for i, l in enumerate(src) if '7. ART: CHICKENS' in l) - 1
end = next(i for i, l in enumerate(src) if l.strip() == '10. INTERFACE') - 1
out = src[:start] + scene.split('\n') + [''] + src[end:]
s = '\n'.join(out)


def sub(old, new, count=1):
    global s
    assert s.count(old) >= 1, old[:80]
    s = s.replace(old, new) if count == 0 else s.replace(old, new, count)


sub("const MAX_PLOTS = 12, MAX_BIRDS = 600;", "const MAX_PLOTS = 8, MAX_BIRDS = 600;")
sub("const list = [0, 0, 300, 800, 2000, 4500, 9000, 16000, 26000, 40000, 60000, 90000];", "const list = [0, 0, 400, 1200, 3000, 7000, 14000, 25000];")
sub("const SAVE_KEY = 'feather-field-save-v1'", "const SAVE_KEY = 'feather-field-save-v1'")
sub("<title>Feather & Field</title>", '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>Feather & Field</title>')
# portraits: the Blender card renders
s = re.sub(r"function portrait\(b, big\) \{.*?\n\}\n", """function portrait(b, big) {
  const n = cardName(b);
  return h('img', { class: 'portrait' + (big ? ' big' : '') + (stage(b) === 'chick' ? ' chick' : ''), src: SPR[n] ? sprSrc(n) : '', alt: '', draggable: 'false' });
}
""", s, count=1, flags=re.S)
# coop pictures in the build list
sub("""const thumb = h('canvas', { class: 'thumb', width: 680, height: 300, 'aria-hidden': 'true' });
          const g = thumb.getContext('2d'); g.drawImage(getPlotCanvas({ kind: 'coop', breed: id }, 2), 0, 0, PW * 2, 150 * 2, 0, 0, 680, 300);""",
    """const thumb = h('img', { class: 'thumb', src: ovSrc(id, 0), alt: '', draggable: 'false' });""")
sub("if (inertia && !ptr.down) { view.camY += inertia * dt * 60 / 16; inertia *= .92; if (Math.abs(inertia) < .05) inertia = 0; clampCam(); }", "stepInertia(dt);")
sub("const view = { vw: 0", "const plotCache = new Map(), spriteCache = new Map();\nconst view = { vw: 0")
# preload what the first screen needs
sub("  applyLang(); layout(); updateHud();", "  applyLang(); layout(); updateHud();\n  img('img/farm_map.webp'); for (const c of state.coops) img(ovSrc(c.breed, GEOM.slots[c.plot].deg));")
# CSS: pictures instead of canvases
sub(".portrait{width:56px;height:56px;border-radius:12px;background:linear-gradient(#cfe3b0,#9cc06f);flex:none}",
    ".portrait{width:56px;height:56px;border-radius:12px;background:radial-gradient(ellipse at 50% 85%,#b9d48e,#e7efd2 70%);flex:none;object-fit:contain;padding:3px;box-sizing:border-box;-webkit-user-drag:none;user-select:none}\n.portrait.chick{padding:9px}")
sub(".thumb{width:100%;max-width:100%;aspect-ratio:340/150;border-radius:12px;display:block;background:#6d9a4a}",
    ".thumb{width:100%;max-width:100%;aspect-ratio:340/170;border-radius:12px;display:block;background:#7da352;object-fit:cover;object-position:50% 45%}")
sub("#stage{position:relative;overflow:hidden;background:#5d8a3f;min-height:0}", "#stage{position:relative;overflow:hidden;background:#4f7a35;min-height:0}")
# the market sheet calls h() with an img; nothing else in the UI still draws chickens itself
for gone in ['getPlotCanvas', 'getSprite(', 'drawLegs(', 'PW * 2']:
    assert gone not in s, gone
os.makedirs(f'{D}/game', exist_ok=True)
open(f'{D}/game/index.html', 'w').write(s)
print('ok', len(s))

if os.environ.get('TEST'):
    dbg = """
window.__ffDebug = {
  rich() {
    state.coins = 99999; state.plots = 7;
    const breeds = ['rir', 'sil', 'orp', 'leg', 'bra', 'sil'];
    state.coops = state.coops.slice(0, 1);
    for (let i = 1; i < breeds.length; i++) state.coops.push({ id: state.nextId++, breed: breeds[i], plot: i, cap: 12, nest: { plain: i % 2 ? 4 : 0, fertile: [] }, sire: null });
    const cols = Object.keys(SIL);
    for (const c of state.coops.slice(1)) {
      for (let k = 0; k < 7; k++) {
        const sex = k === 0 ? 'r' : 'h';
        const born = k === 6 ? state.gt - 60e3 : k === 5 ? state.gt - T.young - 3600e3 : state.gt - T.adult - DAY;
        const o = { breed: c.breed, sex, traits: shopTraits(), born, home: c.id };
        if (c.breed === 'sil') o.geno = silTemplate(cols[(k + c.plot * 3) % cols.length]);
        state.birds.push(makeBird(o));
      }
    }
    for (let k = 0; k < 4; k++) { const b = makeBird({ breed: breeds[k + 1], sex: k % 2 ? 'r' : 'h', traits: shopTraits(), born: state.gt - T.retire - DAY, home: 'pasture', geno: silTemplate('lavender') }); state.birds.push(b); }
    changed();
  },
  points() {
    const sc = (x, y) => [(x - view.x) * view.s, (y - view.y) * view.s + document.querySelector('#farm').getBoundingClientRect().top];
    const c = GEOM.slots[0], m = toMap(c, 0.9, 0.6);
    const a = [...agents.values()].find(a => a.plot && a.plot.kind === 'coop' && a.sx != null && a.sy > view.y + 60 && a.sy < view.y + view.vh / view.s - 60);
    return { coop0: sc(m[0], m[1]), bird: a ? sc(a.sx, a.sy - 20) : [0, 0] };
  },
  view() { return { s: view.s, x: view.x, y: view.y }; },
  scroll(f) { view.y = (GEOM.size[1] - view.vh / view.s) * f; clampCam(); },
};
"""
    s = s.replace("window.claude?.hot?.snapshot", dbg + "window.claude?.hot?.snapshot", 1)
    open(f'{D}/game/index.html', 'w').write(s)
    print('test hooks added')
