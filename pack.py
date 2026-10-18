"""Pack every render into the game's image files and one data file.
Birds of one kind (breed or Silkie colour) share one atlas image; trees share one; small props share one.
Usage: python3 pack.py"""
import os, sys, json, glob, math, shutil
import numpy as np
from PIL import Image
from crop import cam_params, origin_px

R = '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad'
OUT = f'{R}/game2'
for d in ('img', 'img/b', 'img/ov', 'img/atlas'): os.makedirs(f'{OUT}/{d}', exist_ok=True)
Q = 84
BS = float(os.environ.get('BIRDSCALE', '1.0'))
BS2 = 0.7          # v2 birds are rendered at 512 px: 0.7 keeps about the same detail per bird as v1
CHICK2_POSES = ['walk%d' % i for i in range(8)] + ['peck0', 'peck1', 'peck2', 'look1', 'look2', 'scratch0', 'scratch1', 'turn1', 'turn2', 'turn3']
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


def card_frames(paths, scale):
    """Close-up frames cropped to one shared box, so they line up when the card plays them one after another."""
    ims = [Image.open(p).convert('RGBA') for p in paths]; res = ims[0].size[0]; pad = 14
    boxes = []
    for im in ims:
        a = np.array(im)[:, :, 3]; ys, xs = np.where(a > 40); ys2, _ = np.where(a > 10)
        boxes.append((xs.min() - pad, ys.min() - pad, xs.max() + pad + 1, max(ys.max() + pad + 4, ys2.max() + 2)))
    x0, y0 = max(0, min(b[0] for b in boxes)), max(0, min(b[1] for b in boxes))
    x1, y1 = min(res, max(b[2] for b in boxes)), min(res, max(b[3] for b in boxes))
    out = []
    for im in ims:
        c = feather(im.crop((x0, y0, x1, y1))); w, h = c.size
        out.append(c.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS))
    return out


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
        faces = [f'{src}/face{i}_{k}_{sex}.png' for i in (1, 2, 3)]
        if os.path.exists(p) and all(os.path.exists(f) for f in faces):      # the close-up can come alive: looking round at you
            for i, im in enumerate(card_frames([p] + faces, 0.75)):
                n = f'card_{k}_{sex}' + (f'_f{i}' if i else ''); im.save(f'{OUT}/img/b/{n}.webp', 'WEBP', quality=86, method=6); CARDS[n] = 1
        elif os.path.exists(p):
            im, m = crop_bird(p, 'adult', sex, False, 0.75)
            im.save(f'{OUT}/img/b/card_{k}_{sex}.webp', 'WEBP', quality=86, method=6); CARDS[f'card_{k}_{sex}'] = 1
    v2c = os.path.exists(f'{R}/r/chick2/chick_{k}_turn3.png')        # v2 chick finished (its last turn picture is rendered last)
    csrc, cscale, cposes = (f'{R}/r/chick2', 1.0, [''] + ['_' + p for p in CHICK2_POSES]) if v2c else (f'{R}/r/spr', BS, ['', '_walk1', '_walk2'])
    for pose in cposes:
        p = f'{csrc}/chick_{k}{pose}.png'
        if not os.path.exists(p): continue
        im, m = crop_bird(p, 'chick', 'h', True, cscale)
        items.append((f'chick_{k}{pose}', im)); SPR[f'chick_{k}{pose}'] = m
        if not pose and v2c:          # chick close-up: stand, then turning round to face you
            for i, im in enumerate(card_frames([p, f'{csrc}/chick_{k}_turn2.png', f'{csrc}/chick_{k}_turn3.png'], 0.72)):
                n = f'card_chick_{k}' + (f'_f{i}' if i else ''); im.save(f'{OUT}/img/b/{n}.webp', 'WEBP', quality=86, method=6); CARDS[n] = 1
        elif not pose:
            big, _ = crop_bird(p, 'chick', 'h', True, 0.9)
            big.save(f'{OUT}/img/b/card_chick_{k}.webp', 'WEBP', quality=86, method=6); CARDS[f'card_chick_{k}'] = 1
    atlas, pos = shelf_pack(items)
    atlas.save(f'{OUT}/img/atlas/{k}.webp', 'WEBP', quality=Q, method=6)
    for name, (x, y, w, h) in pos.items(): SPR[name].update(a=k, x=x, y=y, w=w, h=h)
    print(k, atlas.size, len(items))

# chicken voices (made by synth_chickens.py, then: ffmpeg -i r/snd/sheet.wav -ac 1 -b:a 80k r/snd/chickens.mp3)
if os.path.exists(f'{R}/r/snd/chickens.mp3'):
    os.makedirs(f'{OUT}/img/snd', exist_ok=True)
    shutil.copy(f'{R}/r/snd/chickens.mp3', f'{OUT}/img/snd/chickens.mp3'); shutil.copy(f'{R}/r/snd/sheet.json', f'{OUT}/img/snd/chickens.json')
import farmer_pack; print('farmer', farmer_pack.pack(SPR))      # the farmer's sprites ride in the same sprite table
if os.environ.get('BIRDS_ONLY'):          # quick repack: only the birds changed; keep everything else from the last full pack
    data = json.load(open(f'{OUT}/data.json')); data['spr'] = SPR; data['cards'] = sorted(CARDS)
    json.dump(data, open(f'{OUT}/data.json', 'w'), separators=(',', ':'))
    print('packed birds', len(SPR), 'sprites', len(CARDS), 'cards'); sys.exit(0)

# ---------------------------------------------------------------- map, overlays
_g = json.load(open(f'{MAPDIR}/geom2.json'))
MAP2X = os.path.exists(f'{MAPDIR}/farm_map2x.png')       # the map rendered at twice the detail: cut into tiles for zooming in
_im = Image.open(f'{MAPDIR}/farm_map2x.png' if MAP2X else f'{MAPDIR}/farm_map.png').convert('RGB')
MSC = 2 if MAP2X else 1
if list(_im.size) != [s * MSC for s in _g['size']]: _im = _im.resize(tuple(s * MSC for s in _g['size']), Image.LANCZOS)
_map = np.array(_im).astype(np.float32); del _im
# the ground right under each (hidden) trunk gets no light at all: blend it into the grass around it
RR = 40 * MSC
yy, xx = np.mgrid[-RR:RR + 1, -RR:RR + 1]
for t in _g['trees']:
    bx, by = int(round(t['base'][0] * MSC)), int(round(t['base'][1] * MSC)); r = (0.2 * t['h'] / 3 * 80 + 4) * MSC
    d = np.sqrt((xx / r) ** 2 + (yy / (r * 0.72)) ** 2)
    x0, y0 = bx - RR, by - RR
    if x0 < 0 or y0 < 0 or x0 + 2 * RR + 1 > _map.shape[1] or y0 + 2 * RR + 1 > _map.shape[0]:
        ys_, xs_ = np.clip(yy + by, 0, _map.shape[0] - 1), np.clip(xx + bx, 0, _map.shape[1] - 1)
    else:
        ys_, xs_ = yy + by, xx + bx
    patch = _map[ys_, xs_]
    ring = (d > 1.3) & (d < 2.2)
    col = np.median(patch[ring], axis=0) if ring.any() else patch.mean(axis=(0, 1))
    w = np.clip((1.35 - d) / 0.45, 0, 1)[..., None]
    _map[ys_, xs_] = patch * (1 - w) + col * w
_full = Image.fromarray(_map.clip(0, 255).astype(np.uint8)); del _map
TILES = None
if MAP2X:
    TS_, BLEED = 1024, 2                 # 1024-pixel tiles of the sharp map, each with 2 pixels of its neighbours so no seams show
    W2, H2 = _full.size; cols, rows = -(-W2 // TS_), -(-H2 // TS_)
    shutil.rmtree(f'{OUT}/img/map2', ignore_errors=True); os.makedirs(f'{OUT}/img/map2')
    for r_ in range(rows):
        for c_ in range(cols):
            x0, y0 = c_ * TS_, r_ * TS_
            _full.crop((max(0, x0 - BLEED), max(0, y0 - BLEED), min(W2, x0 + TS_ + BLEED), min(H2, y0 + TS_ + BLEED))).save(f'{OUT}/img/map2/{c_}_{r_}.webp', 'WEBP', quality=80, method=6)
    TILES = {'size': TS_, 'bleed': BLEED, 'scale': 2, 'cols': cols, 'rows': rows, 'w': W2, 'h': H2}
    _full = _full.resize(tuple(_g['size']), Image.LANCZOS)
    print('map tiles', cols, rows)
_full.save(f'{OUT}/img/farm_map.webp', 'WEBP', quality=82, method=6)
FENCE = False
for p in sorted(glob.glob(f'{OVDIR}/fence_*.png')):
    Image.open(p).save(f'{OUT}/img/ov/' + os.path.basename(p)[:-4] + '.webp', 'WEBP', quality=88, method=6); FENCE = True
for p in sorted(glob.glob(f'{OVDIR}/ov_*_*.png')):
    Image.open(p).save(f'{OUT}/img/ov/' + os.path.basename(p)[:-4] + '.webp', 'WEBP', quality=85, method=6)

g = json.load(open(f'{MAPDIR}/geom2.json'))
# ---------------------------------------------------------------- trees: crop, shrink a little, pack
TREE2X = all(os.path.exists(f'{MAPDIR}/2x_' + t['file']) for t in g['trees'])
TSC = 2 if TREE2X else 1
TS = 0.75 if TREE2X else 0.8          # 2x renders kept at 1.5x the map's detail
items, tmeta = [], []
for i, t in enumerate(g['trees']):
    im = Image.open(f'{MAPDIR}/' + ('2x_' if TREE2X else '') + t['file']).convert('RGBA')
    a = np.array(im)[:, :, 3]; ys, xs = np.where(a > 8)
    x0, x1, y0, y1 = max(0, xs.min() - 2), min(im.size[0], xs.max() + 3), max(0, ys.min() - 2), min(im.size[1], ys.max() + 3)
    c = im.crop((x0, y0, x1, y1)); c = c.resize((round(c.size[0] * TS), round(c.size[1] * TS)), Image.LANCZOS)
    items.append((str(i), c))
    tmeta.append({'base': t['base'], 'ax': round((t['anchor'][0] * TSC - x0) * TS, 1), 'ay': round((t['anchor'][1] * TSC - y0) * TS, 1), 'k': round(1 / (TS * TSC), 4), 'h': t['h']})
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
        'spr': SPR, 'cards': sorted(CARDS), 'trees': tmeta, 'props': pmeta, 'fence': FENCE, 'tiles': TILES}
if os.environ.get('BRIDGES'): data['geom']['bridges'] = json.load(open(os.environ['BRIDGES']))
import decor_pack; print('decor', decor_pack.pack(data))      # decorations the player can buy
json.dump(data, open(f'{OUT}/data.json', 'w'), separators=(',', ':'))
print('packed', len(SPR), 'sprites', len(CARDS), 'cards', os.path.getsize(f'{OUT}/data.json'), 'bytes of data')
