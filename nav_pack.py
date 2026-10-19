"""A walking grid for the farmer, made from the farm map picture: which 16-pixel cells are path (preferred) and which are
water (never walked on; bridges count as path). Stored in data.json as 'nav'. Pens, buildings, decorations and trees are
added by the game itself, since they change as the farm grows."""
import os, json, base64
import numpy as np
from PIL import Image

R = os.path.dirname(os.path.abspath(__file__)); OUT = f'{R}/game2'
CELL = 16


def bits(mask):
    flat = np.packbits(mask.astype(np.uint8).ravel())
    return base64.b64encode(flat.tobytes()).decode()


def pack(data):
    im = np.asarray(Image.open(f'{OUT}/img/farm_map.webp').convert('RGB')).astype(int)
    H, W = im.shape[:2]; h, w = (H + CELL - 1) // CELL, (W + CELL - 1) // CELL
    pad = np.zeros((h * CELL, w * CELL, 3), int); pad[:H, :W] = im
    r, g, b = pad[..., 0], pad[..., 1], pad[..., 2]
    path = (r > g) & (g >= b) & (r - b >= 14) & (r - b <= 60) & (r > 110)
    water = (b > r + 18) & (b >= g - 6) & (g > r + 6)
    def cells(m): return m.reshape(h, CELL, w, CELL).mean(axis=(1, 3))
    pc, wc = cells(path), cells(water)
    data['nav'] = {'cell': CELL, 'w': w, 'h': h, 'path': bits(pc > 0.45), 'water': bits((wc > 0.5) & (pc < 0.3))}
    return int((pc > 0.45).sum()), int(((wc > 0.5) & (pc < 0.3)).sum())


if __name__ == '__main__':
    data = json.load(open(f'{OUT}/data.json'))
    print('nav cells (path, water):', pack(data), 'grid', data['nav']['w'], data['nav']['h'])
    json.dump(data, open(f'{OUT}/data.json', 'w'), separators=(',', ':'))
