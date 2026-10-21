"""Paint a seamless tile of Silkie hair for the browser (silkie_hair.jpg). The tile is drawn at the size the hair is seen in the
game, so its shapes survive on a phone screen: long soft locks (about 1 cm wide, 4-8 cm long), each a bunch of wavy strands that
gather towards a curling tip, laid in three layers over a dark undercoat. Everything wraps round the tile's edges, so it repeats
without seams. Strands flow towards the top of the image.
Two channels: red is how light the hair is (darker roots, bright tips, dark partings between locks; white, the browser tints
it), green is how far the hair stands out from the body (top locks highest, their middles higher than their edges): the
browser's fluff layers keep a spot only where the hair reaches that far out, so the locks stand up in 3D.
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

shade = Image.new('L', (W, W), 40)          # dark undercoat between the locks
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


LAYERS = [(0.30, 150, 46), (0.55, 190, 46), (0.80, 232, 40)]     # (how far out, brightness, locks): under-layers lower, darker
for base, bright, count in LAYERS:
    for _ in range(count):
        rx, ry = rnd.uniform(0, W), rnd.uniform(0, W)                  # where the lock grows from
        lean = rnd.gauss(0, 0.22)                                      # radians off straight up
        L = rnd.uniform(45, 85) * PX                                   # lock length
        half = rnd.uniform(3.5, 6) * PX                                  # half the lock's width at its root
        clump = rnd.uniform(0.55, 0.8)                                 # how much the strands gather towards the tip
        curl = rnd.uniform(-0.6, 0.6)                                  # the tip curls over to one side
        wave_a, wave_f, wave_p = rnd.uniform(1.5, 4.0) * PX, rnd.uniform(0.7, 1.4), rnd.uniform(0, math.tau)
        lb = bright * rnd.uniform(0.78, 1.1)                          # each lock a little lighter or darker
        n = rnd.randint(7, 11)
        for s in range(n):
            off = max(-1.0, min(1.0, rnd.gauss(0, 0.45)))              # across the lock: -1 one edge, 1 the other
            ln = L * rnd.uniform(0.7, 1.0) * (1 - 0.25 * abs(off))      # edge strands a little shorter: a pointed lock
            sw = rnd.uniform(2.4, 3.4) * PX                            # strand width (mm, at its root)
            ph = rnd.uniform(-0.5, 0.5)
            sb = lb * rnd.uniform(0.88, 1.08)
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
                    widths.append(sw * min(1.0, 0.35 + 0.65 * (t - t0) / 0.2) * (1 - 0.7 * t ** 2))     # a fine root and a fine tip
                    shades.append(min(255, sb * (0.3 + 0.75 * t ** 0.6)))         # dark at the root (fading into the undercoat), bright tips
                    hgt = base + 0.16 * (1 - abs(off)) + rnd.uniform(-0.03, 0.03)  # a lock's middle stands out further
                    heights.append(255 * max(0.0, min(1.0, hgt * (1 - 0.25 * t ** 3) * (0.55 + 0.5 * t ** 0.5))))
            wrap_strand(pts, widths, shades, heights)

sh = shade.resize((SIZE, SIZE), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.4))
ht = height.resize((SIZE, SIZE), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))
a = np.asarray(sh).astype(np.float32)
rgb = np.stack([np.clip(a, 0, 255), np.asarray(ht).astype(np.float32), np.zeros_like(a)], 2).astype(np.uint8)
Image.fromarray(rgb, 'RGB').save(OUT, quality=92, subsampling=0)
print('WROTE', OUT, 'shade mean', round(float(a.mean()), 1), 'height mean', round(float(np.asarray(ht).mean()), 1))
