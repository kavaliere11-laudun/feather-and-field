"""Pack every render into the game's image files and one data file.
Birds of one kind (breed or Silkie colour) share one atlas image; trees share one; small props share one.
Usage: python3 pack.py"""
import os, sys, json, glob, math
import numpy as np
from PIL import Image
from crop import cam_params, origin_px

R = '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad'
OUT = f'{R}/game2'
for d in ('img', 'img/b', 'img/ov', 'img/atlas'): os.makedirs(f'{OUT}/{d}', exist_ok=True)
Q = 84
BS = float(os.environ.get('BIRDSCALE', '1.0'))
BS2 = 0.7          # v2 birds are rendered at 512 px: 0.7 keeps about the same detail per bird as v1
V2_POSES = ['walk%d' % i for i in range(8)] + ['peck0', 'peck1', 'peck2', 'look1', 'look2', 'scratch0', 'scratch1', 'sit', 'crow', 'turn1', 'turn2', 'turn3']      # bird sprites: 1.0 keeps the full render detail, sharp when zoomed in
MAPDIR = os.environ.get('MAPDIR', f'{R}/r/map2'); OVDIR = os.environ.get('OVDIR', f'{R}/r/ov2'); PROPDIR = os.environ.get('PROPDIR', f'{R}/r/props')


def feather(im, F=10.0):
    arr = np.array(im).astype(np.float32); h, w = arr.shape[:2]
    fx = np.clip(np.minimum(np.arange(w), w - 1 - np.arange(w)) / F, 0, 1)
    fy = np.clip(np.minimum(np.arange(h), h - 1 - np.arange(h)) / F, 0, 1)
    arr[:, :, 3] *= np.minimum(fy[:, None], fx[None, :])
    return Image.fromarray(arr.round().astype(np.uint8), 'RGBA')


def crop_bird(path, kind, sex, farm, scale):
    im = Image.open(path).convert('RGBA'); res = im.size[0]
    a = np.array(im)[:, :, 3]
    ys, xs = np.where(a > 40); pad = 14
    x0, x1 = max(0, xs.min() - pad), min(res, xs.max() + pad + 1)
    y0, y1 = max(0, ys.min() - pad), min(res, ys.max() + pad + 4)
    ys2, _ = np.where(a > 10); y1 = min(res, max(y1, ys2.max() + 2))
    ox, oy, ppu = origin_px(res, *cam_params(kind, sex, farm))
    c = feather(im.crop((x0, y0, x1, y1)))
    w, h = c.size
    c = c.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    return c, {'ax': round((ox - x0) * scale, 1), 'ay': round((oy - y0) * scale, 1), 'ppu': round(ppu * scale, 2)}


def shelf_pack(items, max_w=2048, gap=2):
    """items: list of (name, image). Returns atlas image and {name: (x, y, w, h)}."""
    items = sorted(items, key=lambda it: -it[1].size[1])
    x = y = row_h = 0; pos = {}; W = 0
    for name, im in items:
        w, h = im.size
        if x + w > max_w: x = 0; y += row_h + gap; row_h = 0
        pos[name] = (x, y, w, h); x += w + gap; row_h = max(row_h, h); W = max(W, x)
    H = y + row_h
    atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for name, im in items: atlas.paste(im, pos[name][:2])
    return atlas, pos


SPR, CARDS = {}, {}
# ---------------------------------------------------------------- birds
kinds = ['rir', 'orp', 'leg', 'bra'] + ['sil_' + c for c in ['white', 'black', 'blue', 'buff', 'partridge', 'grey', 'splash', 'cuckoo', 'red', 'paint', 'lavender']]
for k in kinds:
    items = []
    for sex in ('h', 'r'):
        if os.path.exists(f'{R}/r/spr2/card_{k}_{sex}.png'):      # v2 (finished: its close-up card is rendered last): the full set of poses
            src, scale = f'{R}/r/spr2', BS2 * (512 / 384 if k.startswith('sil_') else 1)   # Silkies render at 384 px: same detail per bird as the big breeds
            poses = [('stand', 'farm')] + [(p, p) for p in V2_POSES]
        else:
            src, scale = f'{R}/r/spr', BS
            poses = [(p, p) for p in ('farm', 'peck', 'walk1', 'walk2')]
        for fn, pose in poses:
            p = f'{src}/{fn}_{k}_{sex}.png'
            if not os.path.exists(p): continue
            im, m = crop_bird(p, 'adult', sex, True, scale)
            items.append((f'{pose}_{k}_{sex}', im)); SPR[f'{pose}_{k}_{sex}'] = m
        p = f'{src}/card_{k}_{sex}.png'
        if os.path.exists(p):
            im, m = crop_bird(p, 'adult', sex, False, 0.75)
            im.save(f'{OUT}/img/b/card_{k}_{sex}.webp', 'WEBP', quality=86, method=6); CARDS[f'card_{k}_{sex}'] = 1
    for pose in ('', '_walk1', '_walk2'):
        p = f'{R}/r/spr/chick_{k}{pose}.png'
        if not os.path.exists(p): continue
        im, m = crop_bird(p, 'chick', 'h', True, BS)
        items.append((f'chick_{k}{pose}', im)); SPR[f'chick_{k}{pose}'] = m
        if not pose:
            big, _ = crop_bird(p, 'chick', 'h', True, 0.9)
            big.save(f'{OUT}/img/b/card_chick_{k}.webp', 'WEBP', quality=86, method=6); CARDS[f'card_chick_{k}'] = 1
    atlas, pos = shelf_pack(items)
    atlas.save(f'{OUT}/img/atlas/{k}.webp', 'WEBP', quality=Q, method=6)
    for name, (x, y, w, h) in pos.items(): SPR[name].update(a=k, x=x, y=y, w=w, h=h)
    print(k, atlas.size, len(items))

if os.environ.get('BIRDS_ONLY'):          # quick repack: only the birds changed; keep everything else from the last full pack
    data = json.load(open(f'{OUT}/data.json')); data['spr'] = SPR; data['cards'] = sorted(CARDS)
    json.dump(data, open(f'{OUT}/data.json', 'w'), separators=(',', ':'))
    print('packed birds', len(SPR), 'sprites', len(CARDS), 'cards'); sys.exit(0)

# ---------------------------------------------------------------- map, overlays
_g = json.load(open(f'{MAPDIR}/geom2.json'))
_im = Image.open(f'{MAPDIR}/farm_map.png').convert('RGB')
if list(_im.size) != list(_g['size']): _im = _im.resize(tuple(_g['size']), Image.LANCZOS)
_map = np.array(_im).astype(np.float32)
# the ground right under each (hidden) trunk gets no light at all: blend it into the grass around it
yy, xx = np.mgrid[-40:41, -40:41]
for t in _g['trees']:
    bx, by = int(round(t['base'][0])), int(round(t['base'][1])); r = 0.2 * t['h'] / 3 * 80 + 4
    d = np.sqrt((xx / r) ** 2 + (yy / (r * 0.72)) ** 2)
    x0, y0 = bx - 40, by - 40
    if x0 < 0 or y0 < 0 or x0 + 81 > _map.shape[1] or y0 + 81 > _map.shape[0]:
        ys_, xs_ = np.clip(yy + by, 0, _map.shape[0] - 1), np.clip(xx + bx, 0, _map.shape[1] - 1)
    else:
        ys_, xs_ = yy + by, xx + bx
    patch = _map[ys_, xs_]
    ring = (d > 1.3) & (d < 2.2)
    col = np.median(patch[ring], axis=0) if ring.any() else patch.mean(axis=(0, 1))
    w = np.clip((1.35 - d) / 0.45, 0, 1)[..., None]
    _map[ys_, xs_] = patch * (1 - w) + col * w
Image.fromarray(_map.clip(0, 255).astype(np.uint8)).save(f'{OUT}/img/farm_map.webp', 'WEBP', quality=82, method=6)
FENCE = False
for p in sorted(glob.glob(f'{OVDIR}/fence_*.png')):
    Image.open(p).save(f'{OUT}/img/ov/' + os.path.basename(p)[:-4] + '.webp', 'WEBP', quality=88, method=6); FENCE = True
for p in sorted(glob.glob(f'{OVDIR}/ov_*_*.png')):
    Image.open(p).save(f'{OUT}/img/ov/' + os.path.basename(p)[:-4] + '.webp', 'WEBP', quality=85, method=6)

g = json.load(open(f'{MAPDIR}/geom2.json'))
# ---------------------------------------------------------------- trees: crop, shrink a little, pack
TS = 0.8
items, tmeta = [], []
for i, t in enumerate(g['trees']):
    im = Image.open(f'{MAPDIR}/' + t['file']).convert('RGBA')
    a = np.array(im)[:, :, 3]; ys, xs = np.where(a > 8)
    x0, x1, y0, y1 = max(0, xs.min() - 2), min(im.size[0], xs.max() + 3), max(0, ys.min() - 2), min(im.size[1], ys.max() + 3)
    c = im.crop((x0, y0, x1, y1)); c = c.resize((round(c.size[0] * TS), round(c.size[1] * TS)), Image.LANCZOS)
    items.append((str(i), c))
    tmeta.append({'base': t['base'], 'ax': round((t['anchor'][0] - x0) * TS, 1), 'ay': round((t['anchor'][1] - y0) * TS, 1), 'k': 1 / TS, 'h': t['h']})
atlas, pos = shelf_pack(items, max_w=4000) if items else (Image.new('RGBA', (1, 1)), {})
atlas.save(f'{OUT}/img/atlas/trees.webp', 'WEBP', quality=80, method=6)
for i, m in enumerate(tmeta): m.update(zip(('x', 'y', 'w', 'h'), pos[str(i)]))
print('trees', atlas.size)

# ---------------------------------------------------------------- props (frogs, grass tufts), drawn at half size
pm = json.load(open(f'{PROPDIR}/props.json')) if os.path.exists(f'{PROPDIR}/props.json') else {}
items, pmeta = [], {}
for name, m in pm.items():
    im = Image.open(f'{PROPDIR}/{name}.png').convert('RGBA')
    a = np.array(im)[:, :, 3]; ys, xs = np.where(a > 8)
    x0, x1, y0, y1 = max(0, xs.min() - 2), min(im.size[0], xs.max() + 3), max(0, ys.min() - 2), min(im.size[1], ys.max() + 3)
    items.append((name, im.crop((x0, y0, x1, y1))))
    pmeta[name] = {'ax': m['anchor'][0] - x0, 'ay': m['anchor'][1] - y0, 'k': 1 / m['k']}
atlas, pos = shelf_pack(items, max_w=1024) if items else (Image.new('RGBA', (1, 1)), {})
atlas.save(f'{OUT}/img/atlas/props.webp', 'WEBP', quality=86, method=6)
for n, m in pmeta.items(): m.update(zip(('x', 'y', 'w', 'h'), pos[n]))

ov = [300.0, 335.67]
data = {'geom': {k: g[k] for k in ('size', 'ez', 'slots', 'pasture', 'pond', 'house', 'stall', 'tufts', 'frogSpots', 'stream', 'streams') if k in g}, 'ov': ov,
        'spr': SPR, 'cards': sorted(CARDS), 'trees': tmeta, 'props': pmeta, 'fence': FENCE}
if os.environ.get('BRIDGES'): data['geom']['bridges'] = json.load(open(os.environ['BRIDGES']))
json.dump(data, open(f'{OUT}/data.json', 'w'), separators=(',', ':'))
print('packed', len(SPR), 'sprites', len(CARDS), 'cards', os.path.getsize(f'{OUT}/data.json'), 'bytes of data')
