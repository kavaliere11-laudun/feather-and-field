# The App Store's second set of pictures, every language (27 Nov 2026): python3 make2.py SCENES OUT [LANGS]
# SCENES: the scenes as rendered (hero.png ... from web3d/storescenes.mjs; mingle.png and show.png from web3d/intropics.mjs
# 7 and 4), all 2868 x 1320; the game's own screens (groom, shop, fish) in the language's own words from SCENES/<language>/
# when there, 1912 x 880). OUT/<language>/<nn>.png from compose2.mjs (the wooden farm sign), and OUT/<language>/<nn>.jpg
# at 2796 x 1290 (the size App Store Connect takes for the 6.7-inch iPhone, as before), quality 92.
# IPAD=1 (27 Nov 2026, the app on iPad): the same nine at 2752 x 2064 (Apple's 13-inch iPad, sideways), from scenes rendered
# for it (web3d's tools with W=1376 H=1032 DSF=2: the phone's framing kept, the extra height above it); the game's own screens
# are the iPad's own, framed 4:3 under the sign
import json, os, subprocess, sys
from PIL import Image
IPAD = os.environ.get('IPAD') == '1'
SIZE = (2752, 2064) if IPAD else (2796, 1290)
HERE = os.path.dirname(os.path.abspath(__file__))
SC, OUT = sys.argv[1], sys.argv[2]
C = json.load(open(os.path.join(HERE, 'captions2.json'), encoding='utf-8'))
LANGS = sys.argv[3].split(',') if len(sys.argv) > 3 else [k for k in C if not k.startswith('_') and k not in ('scenes', 'screens', 'sides')]
for L in LANGS:
    d = os.path.join(OUT, L); os.makedirs(d, exist_ok=True)
    plan = []
    for i, (scene, (title, sub)) in enumerate(zip(C['scenes'], C[L])):
        own = os.path.join(SC, L, scene + '.png')
        q = {'img': own if os.path.exists(own) else os.path.join(SC, scene + '.png'), 'title': title, 'sub': sub, 'name': '%02d' % (i + 1), 'screen': scene in C['screens'], 'side': C.get('sides', {}).get(scene, 'left'), 'size': 100}
        if IPAD: q.update({'ratio': 4 / 3, **C.get('ipad', {}).get(scene, {})})
        plan.append(q)
    pf = os.path.join(d, 'plan.json'); json.dump(plan, open(pf, 'w', encoding='utf-8'), ensure_ascii=False)
    subprocess.run(['node', os.path.join(HERE, 'compose2.mjs'), pf, d, 'sign'], check=True, env={**os.environ, **({'CW': '2752', 'CH': '2064'} if IPAD else {})})
    for q in plan:
        im = Image.open(os.path.join(d, q['name'] + '.png')).convert('RGB').resize(SIZE, Image.LANCZOS)
        im.save(os.path.join(d, q['name'] + '.jpg'), quality=92)
    os.remove(pf)
    print(L, 'done')
