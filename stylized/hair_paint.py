"""Paint a seamless tile of Silkie hair for the browser (silkie_hair.jpg). The tile is drawn at the size the hair is seen in the
game, so its shapes survive on a phone screen: fine silky strands (1.3-2 mm) lying one way in soft locks (about 1 cm wide,
3.5-7 cm long), in three layers over a darker undercoat, like the 2D game's Silkie. Everything wraps round the tile's edges, so
it repeats without seams. Strands flow towards the top of the image.
Two channels: red is how light the hair is (darker roots, bright tips; white, the browser tints it), green is how far the hair
stands out from the body (each strand its own length, the top layer longest): the browser's fluff layers keep a spot only
where the hair reaches that far out, and fade the outer layers, so the edge is a soft halo of hair.
Plain Python (Pillow + numpy). Usage: python3 hair_paint.py out.jpg [size] [tile_cm]"""
import sys, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else 'silkie_hair.jpg'
SIZE = int(sys.argv[2]) if len(sys.argv) > 2 else 512
TILE = float(sys.argv[3]) if len(sys.argv) > 3 else 12.0         # the tile's width in cm (the browser maps it at this size)
SS = 2                                                           # drawn twice as large, then shrunk: soft edges
W = SIZE * SS
PX = W / (TILE * 10)                                             # drawing pixels per millimetre
rnd = random.Random(11)

shade = Image.new('L', (W, W), 70)          # a darker undercoat between the locks
height = Image.new('L', (W, W), 0)
ds, dh = ImageDraw.Draw(shade), ImageDraw.Draw(height)


def wrap_strand(pts, widths, shades, heights):
    """Draw one strand on both channels, on the tile and its 8 neighbours (strands crossing an edge come back on the other
    side). Each strand is drawn twice: a wider, darker, lower edge and a bright, higher core, so it looks round."""
    for dx in (-W, 0, W):
        for dy in (-W, 0, W):
            q = [(x + dx, y + dy) for x, y in pts]
            if all(x < -80 or x > W + 80 for x, _ in q) or all(y < -80 or y > W + 80 for _, y in q): continue
            for k, f_s, f_h in ((1.0, 0.72, 0.86), (0.45, 1.0, 1.0)):
                for (a, b), w, s, h in zip(zip(q, q[1:]), widths, shades, heights):
                    r = max(0.5, w * k / 2)
                    for d_, v in ((ds, int(s * f_s)), (dh, int(h * f_h))):
                        d_.line([a, b], fill=v, width=max(1, round(2 * r)))
                        d_.ellipse([b[0] - r, b[1] - r, b[0] + r, b[1] + r], fill=v)       # round joints: no notches


# (how far out, brightness, locks): under-layers lower and darker; the last, sparse layer is stray strands reaching furthest
# out, which make the wisps round the edge
LAYERS = [(0.40, 165, 70), (0.60, 200, 70), (0.78, 235, 60), (1.0, 245, 26)]
for base, bright, count in LAYERS:
    stray = base >= 1.0
    for _ in range(count):
        rx, ry = rnd.uniform(0, W), rnd.uniform(0, W)                  # where the lock grows from
        lean = rnd.gauss(0, 0.16)                                      # radians off straight up: the hair lies one way
        L = rnd.uniform(35, 70) * PX                                   # lock length
        half = rnd.uniform(3.0, 5.5) * PX                              # half the lock's width at its root
        clump = rnd.uniform(0.25, 0.5)                                 # soft locks: the strands only loosely gather
        curl = rnd.uniform(-0.35, 0.35)                                # the tip turns a little to one side
        wave_a, wave_f, wave_p = rnd.uniform(0.8, 2.2) * PX, rnd.uniform(0.6, 1.2), rnd.uniform(0, math.tau)
        lb = bright * rnd.uniform(0.86, 1.08)                          # each lock a little lighter or darker
        n = rnd.randint(3, 6) if stray else rnd.randint(9, 14)
        for s in range(n):
            off = max(-1.0, min(1.0, rnd.gauss(0, 0.5)))               # across the lock: -1 one edge, 1 the other
            ln = L * rnd.uniform(0.65, 1.0) * (1 - 0.2 * abs(off))
            sw = rnd.uniform(1.3, 2.0) * PX * (0.8 if stray else 1)   # strand width (mm, at its root): fine, silky
            ph = rnd.uniform(-0.5, 0.5)
            sb = lb * rnd.uniform(0.85, 1.1)
            hs = base + rnd.uniform(-0.12, 0.12) * (0.5 if stray else 1)    # each strand reaches its own distance out
            segs = 22
            t0 = rnd.uniform(0, 0.3)                                  # roots staggered, so a lock has no straight bottom edge
            pts, widths, shades, heights = [], [], [], []
            for i in range(segs + 1):
                t = t0 + (1 - t0) * i / segs
                ang = lean + curl * t ** 2.5
                along = t * ln
                across = off * half * (1 - clump * t ** 1.3) + math.sin(t * wave_f * math.tau + wave_p + ph * t) * wave_a * t
                x = rx + math.sin(ang) * along + math.cos(ang) * across
                y = ry - math.cos(ang) * along + math.sin(ang) * across
                pts.append((x, y))
                if i:
                    widths.append(sw * min(1.0, 0.35 + 0.65 * (t - t0) / 0.2) * (1 - 0.6 * t ** 2))     # a fine root and a fine tip
                    shades.append(min(255, sb * (0.45 + 0.6 * t ** 0.6)))         # darker at the root, bright tips
                    heights.append(255 * max(0.0, min(1.0, hs * (0.7 + 0.35 * t ** 0.5))))
            wrap_strand(pts, widths, shades, heights)

sh = shade.resize((SIZE, SIZE), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.4))
ht = height.resize((SIZE, SIZE), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))
a = np.asarray(sh).astype(np.float32)
rgb = np.stack([np.clip(a, 0, 255), np.asarray(ht).astype(np.float32), np.zeros_like(a)], 2).astype(np.uint8)
Image.fromarray(rgb, 'RGB').save(OUT, quality=92, subsampling=0)
print('WROTE', OUT, 'shade mean', round(float(a.mean()), 1), 'height mean', round(float(np.asarray(ht).mean()), 1))
