"""Pack the farmer's sprites (r/farmer, made by sty/farmer_sprites.py) into game2/img/atlas/farmer_<look>.webp and add them
to the sprite table as fm_<look>_<frame>; also the two portraits used when the player chooses a farmer (game2/img/farmer/card_<look>.webp).
pack.py calls pack(SPR); run on its own to add the farmer to the current game2/data.json."""
import os, json
import numpy as np
from PIL import Image

R = os.path.dirname(os.path.abspath(__file__))
OUT = f'{R}/game2'
SCALE = 0.55          # 512 px renders: the farmer stays sharp at the closest zoom


def _crop(path, m):
    im = Image.open(path).convert('RGBA'); res = im.size[0]
    a = np.array(im)[:, :, 3]
    ys, xs = np.where(a > 40); pad = 12
    x0, x1 = max(0, xs.min() - pad), min(res, xs.max() + pad + 1)
    y0, y1 = max(0, ys.min() - pad), min(res, ys.max() + pad + 4)
    ys2, xs2 = np.where(a > 12)                     # keep the soft shadow round the boots, not the whole long shadow
    near = (ys2 > ys.max() - 40)
    if near.any():
        y1 = min(res, max(y1, ys2[near].max() + 2)); x0 = max(0, min(x0, xs2[near].min() - 2)); x1 = min(res, max(x1, xs2[near].max() + 2))
    c = im.crop((x0, y0, x1, y1))
    arr = np.array(c).astype(np.float32); h, w = arr.shape[:2]; F = 10.0       # fade the cut edges
    fx = np.clip(np.minimum(np.arange(w), w - 1 - np.arange(w)) / F, 0, 1); fy = np.clip(np.minimum(np.arange(h), h - 1 - np.arange(h)) / F, 0, 1)
    arr[:, :, 3] *= np.minimum(fy[:, None], fx[None, :]); c = Image.fromarray(arr.round().astype(np.uint8), 'RGBA')
    c = c.resize((max(1, round(w * SCALE)), max(1, round(h * SCALE))), Image.LANCZOS)
    return c, {'ax': round((m['ox'] - x0) * SCALE, 1), 'ay': round((m['oy'] - y0) * SCALE, 1), 'ppu': round(m['ppu'] * SCALE, 2)}


def shelf_pack(items, max_w=2048, gap=2):
    items = sorted(items, key=lambda it: -it[1].size[1])
    x = y = row_h = 0; pos = {}; W = 0
    for name, im in items:
        w, h = im.size
        if x + w > max_w: x = 0; y += row_h + gap; row_h = 0
        pos[name] = (x, y, w, h); x += w + gap; row_h = max(row_h, h); W = max(W, x)
    atlas = Image.new('RGBA', (W, y + row_h), (0, 0, 0, 0))
    for name, im in items: atlas.paste(im, pos[name][:2])
    return atlas, pos


def pack(SPR):
    src = f'{R}/r/farmer'
    if not os.path.isdir(src): return 0
    os.makedirs(f'{OUT}/img/atlas', exist_ok=True); os.makedirs(f'{OUT}/img/farmer', exist_ok=True)
    n = 0
    import glob
    keys = sorted(os.path.basename(f)[5:-5] for f in glob.glob(f'{src}/meta_*.json'))      # m, f, and m_<outfit>, f_<outfit>
    for key in keys:
        mp = f'{src}/meta_{key}.json'
        meta = json.load(open(mp)); items = []
        for frame, m in meta.items():
            p = f'{src}/{key}_{frame}.png'
            if not os.path.exists(p): continue
            im, e = _crop(p, m); name = f'fm_{key}_{frame}'
            items.append((name, im)); SPR[name] = e; n += 1
        if not items: continue
        atlas, pos = shelf_pack(items, max_w=2048)
        atlas.save(f'{OUT}/img/atlas/farmer_{key}.webp', 'WEBP', quality=86, method=6)
        for name, (x, y, w, h) in pos.items(): SPR[name].update(a=f'farmer_{key}', x=x, y=y, w=w, h=h)
        card = f'{R}/sty/out/fm_{key}_turn_34.png'           # the portrait shown when choosing a farmer or an outfit
        if os.path.exists(card):
            im = Image.open(card).convert('RGBA'); a = np.array(im)[:, :, 3]; ys, xs = np.where(a > 60)
            c = im.crop((max(0, xs.min() - 10), max(0, ys.min() - 10), xs.max() + 10, ys.max() + 6))
            c = c.resize((round(c.size[0] * 420 / c.size[1]), 420), Image.LANCZOS)
            c.save(f'{OUT}/img/farmer/card_{key}.webp', 'WEBP', quality=86, method=6)
    return n


if __name__ == '__main__':
    import sys
    sys.path.insert(0, R)
    data = json.load(open(f'{OUT}/data.json'))
    n = pack(data['spr'])
    json.dump(data, open(f'{OUT}/data.json', 'w'), separators=(',', ':'))
    print('farmer sprites', n)
