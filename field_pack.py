"""Pack the wheat field's growing stages (wheat_stages.py renders) into game2/img/field/, with soft edges so they melt into the map."""
import os, json
import numpy as np
from PIL import Image
R = '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad'


def pack(data=None):
    src, out = f'{R}/r/wheat', f'{R}/game2/img/field'; os.makedirs(out, exist_ok=True)
    meta = json.load(open(f'{src}/meta.json')); n = 0
    for st in ('soil', 'sprouts', 'growing', 'ripe'):
        im = Image.open(f'{src}/wheat_{st}.png').convert('RGBA'); a = np.array(im).astype(np.float32); h, w = a.shape[:2]
        F = 18.0                                   # 9 map pixels of fade at each edge (the patch has 26 of grass margin)
        fx = np.clip(np.minimum(np.arange(w), w - 1 - np.arange(w)) / F, 0, 1); fy = np.clip(np.minimum(np.arange(h), h - 1 - np.arange(h)) / F, 0, 1)
        a[:, :, 3] = 255 * np.minimum(fy[:, None], fx[None, :])
        Image.fromarray(a.round().astype(np.uint8), 'RGBA').save(f'{out}/wheat_{st}.webp', 'WEBP', quality=84, method=6); n += 1
    return n, meta


if __name__ == '__main__': print(pack())
