# The Polish hen's beak in the welcome pictures, painted again (28 Nov 2026, Audrey on her iPad: "the bec of the polish
# chicken looks funny": a thin dark wedge hanging under her crest). python3 retouch_polish.py IN.jpg OUT.jpg wide|tall
# The old wedge is filled in from the ground round it (OpenCV inpaint), then a short horn-coloured beak pointing forward
# and two small red wattles are drawn, at 8x and brought down, softened to the painting's own softness.
import sys, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter
SRC, DST, WHICH = sys.argv[1], sys.argv[2], sys.argv[3]
# each picture: the old wedge to fill (polygon), the new beak's base top/bottom, its tip, and the wattles (centre, radii)
SPOTS = {
  'wide': dict(old=[(1989, 1466), (2001, 1473), (2001, 1489), (1986, 1507), (1974, 1505)], base=((2001, 1473), (2001, 1488)), tip=(1983, 1486),
               watt=[((2000.5, 1494.5), (3.6, 5.2))]),
}
S = SPOTS[WHICH]
im = cv2.imread(SRC)
mask = np.zeros(im.shape[:2], np.uint8)
cv2.fillPoly(mask, [np.array(S['old'], np.int32)], 255)
im = cv2.inpaint(im, mask, 6, cv2.INPAINT_TELEA)
pil = Image.fromarray(cv2.cvtColor(im, cv2.COLOR_BGR2RGB))
K = 8
xs = [p[0] for p in S['old']] + [S['tip'][0]]; ys = [p[1] for p in S['old']]
x0, y0 = min(xs) - 16, min(ys) - 16; x1, y1 = max(xs) + 24, max(ys) + 24
L = Image.new('RGBA', ((x1 - x0) * K, (y1 - y0) * K), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
P = lambda p: ((p[0] - x0) * K, (p[1] - y0) * K)
(bt, bb), tip = S['base'], S['tip']
# the wattles first (under the beak): red lobes, lighter on top
for (c, r) in S['watt']:      # (a small teardrop of a wattle tucked under the beak, mostly in her shadow)
    tear = [(c[0] + r[0] * __import__('math').sin(a) * (0.55 + 0.45 * __import__('math').cos(a)), c[1] - r[1] * __import__('math').cos(a)) for a in [i / 40 * 6.2832 for i in range(41)]]
    d.polygon([P(q) for q in tear], fill=(122, 30, 28, 255))
    d.ellipse([P((c[0] - r[0] * 0.55, c[1] - r[1] * 0.2)), P((c[0] + r[0] * 0.25, c[1] + r[1] * 0.75))], fill=(168, 46, 38, 230))
    d.ellipse([P((c[0] - r[0] * 0.4, c[1] + r[1] * 0.05)), P((c[0] - r[0] * 0.05, c[1] + r[1] * 0.45))], fill=(214, 94, 76, 150))
# the beak: upper and lower halves, horn coloured, darker by the face, a pale ridge, a dark line between
def curve(a, b, bulge, n=16):
    out = []
    for i in range(n + 1):
        t = i / n; x = a[0] + (b[0] - a[0]) * t; y = a[1] + (b[1] - a[1]) * t - bulge * 4 * t * (1 - t)
        out.append((x, y))
    return out
mid = (bt[0], (bt[1] + bb[1]) / 2 + 2)
upper = curve(bt, tip, 2.2) + list(reversed(curve(mid, tip, 0.6)))
lower = curve(mid, (tip[0] + 3, tip[1] + 0.5), 0.3) + list(reversed(curve(bb, (tip[0] + 3, tip[1] + 0.5), -1.0)))
d.polygon([P(p) for p in lower], fill=(70, 60, 52, 255))
d.polygon([P(p) for p in upper], fill=(96, 84, 72, 255))
# shading: lighter towards the tip, a pale ridge along the top
for i in range(12):
    t = i / 11; c = (int(96 + 92 * t), int(84 + 82 * t), int(72 + 70 * t), 120)
    px = bt[0] + (tip[0] - bt[0]) * t; py = bt[1] + (tip[1] - bt[1]) * t
    d.ellipse([P((px - 1.6, py + 1.2)), P((px + 1.6, py + 3.2))], fill=c)
d.line([P(p) for p in curve((bt[0] - 1, bt[1] + 1.5), (tip[0] + 2, tip[1] - 0.6), 2.0)], fill=(214, 196, 170, 170), width=int(K * 0.9))
d.line([P(p) for p in curve(mid, tip, 0.6)], fill=(46, 40, 36, 255), width=int(K * 0.8))
d.line([P(p) for p in upper[:17]], fill=(58, 52, 48, 200), width=int(K * 0.6))
L = L.resize((x1 - x0, y1 - y0), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.45))
pil.alpha_composite if False else None
base = pil.convert('RGBA'); base.alpha_composite(L, (x0, y0))
base.convert('RGB').save(DST, quality=92)
print('written', DST)
