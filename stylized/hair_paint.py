"""Paint a seamless tile of Silkie fluff (or chick down) for the browser: hundreds of soft locks, each a bunch of fine wavy
strands that start darker at the root and end in bright curling tips, laid in layers over a dark undercoat. Everything wraps
round the tile's edges, so it repeats without seams. Strands flow towards the top of the image. White; the browser tints it.
Plain Python (Pillow + numpy). Usage: python3 hair_paint.py out.jpg [size] [kind]     kind: silkie (default) or down"""
import sys, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else 'silkie_hair.jpg'
SIZE = int(sys.argv[2]) if len(sys.argv) > 2 else 512
KIND = sys.argv[3] if len(sys.argv) > 3 else 'silkie'
SS = 3                                   # drawn three times larger, then shrunk: soft, anti-aliased strands
W = SIZE * SS
rnd = random.Random(5)
silk = KIND == 'silkie'

img = Image.new('L', (W, W), 46)        # dark undercoat between the locks
dr = ImageDraw.Draw(img)


def wrap_line(pts, width, shade):
    """Draw a polyline on the tile and its 8 neighbours, so strands crossing an edge come back in on the other side."""
    for dx in (-W, 0, W):
        for dy in (-W, 0, W):
            q = [(x + dx, y + dy) for x, y in pts]
            if all(x < -50 or x > W + 50 for x, _ in q) or all(y < -50 or y > W + 50 for _, y in q): continue
            for (a, b), s in zip(zip(q, q[1:]), shade):
                dr.line([a, b], fill=int(s), width=max(1, int(width)))


# a lock: a bunch of strands from roots close together, flowing up the image with a shared lean and a gentle wave
locks = 520 if silk else 900
L_lock = (0.30, 0.55) if silk else (0.16, 0.28)          # lock length, as a share of the tile
for layer in range(3):                                    # under-layers darker and shorter, the top layer brightest
    for k in range(locks // 3):
        cx, cy = rnd.uniform(0, W), rnd.uniform(0, W)
        lean = rnd.gauss(0, 0.28)                         # radians off straight up
        length = rnd.uniform(*L_lock) * W * (0.75 + 0.15 * layer)
        wave_a = rnd.uniform(0.01, 0.035) * W * (1 if silk else 0.5)
        wave_f = rnd.uniform(1.2, 2.4)
        curl = rnd.uniform(-1.2, 1.2)                     # how much the tip curls over
        spread = rnd.uniform(0.012, 0.03) * W
        n_str = rnd.randint(9, 18) if silk else rnd.randint(6, 12)
        bright = 150 + 35 * layer + rnd.uniform(-15, 15)
        for s in range(n_str):
            ox, oy = rnd.gauss(0, spread), rnd.gauss(0, spread * 0.6)
            ph = rnd.uniform(0, math.tau)
            ln = length * rnd.uniform(0.6, 1.05)
            segs = 18
            pts, shade = [], []
            x, y = cx + ox, cy + oy
            for i in range(segs + 1):
                t = i / segs
                ang = lean + curl * t ** 2.2 + 0.25 * math.sin(ph + t * 6)
                if i:
                    step = ln / segs
                    x += math.sin(ang) * step + math.cos(t * wave_f * math.tau + ph) * wave_a / segs * 6
                    y -= math.cos(ang) * step
                pts.append((x, y))
                if i: shade.append(min(255, bright * (0.55 + 0.6 * t ** 0.8) + rnd.uniform(-8, 8)))
            wrap_line(pts, (2.2 if silk else 1.8) * SS / 3 * (1.6 - 0.5 * layer / 2), shade)

im = img.resize((SIZE, SIZE), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.35))
a = np.asarray(im).astype(np.float32)
a = np.clip((a - a.mean()) * 1.05 + 150, 0, 255).astype(np.uint8)      # average mid-grey: tints colours without darkening them
Image.fromarray(a).save(OUT, quality=90)
print('WROTE', OUT, round(float(a.mean()), 1), round(float(a.std()), 1))
