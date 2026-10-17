"""Crop raw bird renders into game sprites and write a manifest.
Each sprite records its foot anchor (where world origin lands) and pixels per Blender unit,
so the game can draw every bird at one consistent scale.
Usage: python3 crop.py MANIFEST_OUT  (reads JOBS below)"""
import sys, os, json, math, glob
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
OUTDIR = os.path.join(ROOT, 'game', 'img', 'b')
os.makedirs(OUTDIR, exist_ok=True)


def rot(ax, a):
    c, s = math.cos(a), math.sin(a)
    if ax == 'x': return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def cam_params(kind, sex, farm):
    """Mirror ffbird.stage + the per-script settings."""
    if kind == 'chick':
        ortho, cz, ch, cx = 0.9, 0.22, 0.72, 0.03
    else:
        R = sex == 'r'
        ortho, cz, ch, cx = (2.4 if R else 2.05), (0.86 if R else 0.8), (1.6 if R else 1.55), (-0.12 if R else 0.08)
    if farm:
        ch = cz + 4.0; ortho *= 1.05
    return ortho, cz, ch, cx


def origin_px(res, ortho, cz, ch, cx, angle=22):
    A = math.radians(angle)
    L = np.array([cx + 6 * math.sin(A), -6 * math.cos(A), ch])
    X = math.radians(90 - math.degrees(math.atan2(ch - cz, 6)))
    R = rot('z', A) @ rot('x', X)
    right, up = R[:, 0], R[:, 1]
    q = -L
    k = res / ortho
    return res / 2 + q.dot(right) * k, res / 2 - q.dot(up) * k, k


def process(src, name, kind, sex, farm, scale):
    im = Image.open(src).convert('RGBA'); res = im.size[0]
    a = np.array(im)[:, :, 3]
    ys, xs = np.where(a > 40)                 # ignore the faint shadow fringe when finding the box
    pad = 14
    x0, x1 = max(0, xs.min() - pad), min(res, xs.max() + pad + 1)
    y0, y1 = max(0, ys.min() - pad), min(res, ys.max() + pad + 4)
    # keep the soft shadow under the feet too
    ys2, xs2 = np.where(a > 10)
    y1 = min(res, max(y1, ys2.max() + 2))
    ortho, cz, ch, cx = cam_params(kind, sex, farm)
    ox, oy, ppu = origin_px(res, ortho, cz, ch, cx)
    crop = im.crop((x0, y0, x1, y1))
    w, h = crop.size
    # feather the edges so the cut-off shadow fades instead of ending in a hard line
    arr = np.array(crop).astype(np.float32)
    F = 10.0
    fx = np.clip(np.minimum(np.arange(w), w - 1 - np.arange(w)) / F, 0, 1)
    fy = np.clip(np.minimum(np.arange(h), h - 1 - np.arange(h)) / F, 0, 1)
    arr[:, :, 3] *= np.minimum(fy[:, None], fx[None, :])
    crop = Image.fromarray(arr.round().astype(np.uint8), 'RGBA')
    if scale != 1:
        crop = crop.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    crop.save(os.path.join(OUTDIR, name + '.webp'), 'WEBP', quality=86, method=6)
    return {'w': crop.size[0], 'h': crop.size[1], 'ax': round((ox - x0) * scale, 1), 'ay': round((oy - y0) * scale, 1), 'ppu': round(ppu * scale, 2)}


if __name__ == '__main__':
    man = {}
    jobs = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'r', 'spr', '*.png'))):
        n = os.path.basename(f)[:-4]          # e.g. farm_rir_h, peck_sil_white_r, card_sil_blue_h, chick_leg
        parts = n.split('_')
        role = parts[0]
        if role == 'chick':
            kind, sex = 'chick', 'h'
        else:
            kind, sex = 'adult', parts[-1]
        farm = role in ('farm', 'peck', 'chick', 'walk1', 'walk2')
        scale = 0.75 if role == 'card' else 0.62
        man[n] = process(f, n, kind, sex, farm, scale)
    json.dump(man, open(sys.argv[1], 'w'), separators=(',', ':'))
    print(len(man), 'sprites')
