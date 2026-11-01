"""The app icon from the studio's shots (web3d/iconstudio.mjs): a sky, the farm behind softened by its distance like a
photo's background (the further, the softer), the game's own Silkie and chick sharp in front.
    python3 compose_studio.py SHOTS OUT.png [SIZE]
SHOTS: iconstudio.mjs's folder (birds.png, bg.png, depth.png, meta.json). The square is filled to its edges (Apple rounds
the corners); opaque.
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

SRC, OUT = sys.argv[1], sys.argv[2]
SIZE = int(sys.argv[3]) if len(sys.argv) > 3 else 1024
M = json.load(open(os.path.join(SRC, 'meta.json')))
birds = Image.open(os.path.join(SRC, 'birds.png')).convert('RGBA')
bg = Image.open(os.path.join(SRC, 'bg.png')).convert('RGBA')
W, H = bg.size
d = np.asarray(Image.open(os.path.join(SRC, 'depth.png')).convert('RGB')).astype(np.float64)
depth = (d[..., 0] + d[..., 1] / 255.0) / 255.0 * M['far']
depth[depth <= 0.01] = M['far']


def hexc(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64)


# the sky: deep blue at the top to a pale haze at the horizon, a few soft clouds
top, low = hexc(os.environ.get('SKY_TOP', '#5fb2ee')), hexc(os.environ.get('SKY_LOW', '#d7f0fc'))
t = np.linspace(0, 1, H)[:, None, None] ** 0.9
sky = (top * (1 - t) + low * t) * np.ones((H, W, 3))
sky_im = Image.fromarray(sky.astype(np.uint8))
cl = Image.new('L', (W, H), 0)
from PIL import ImageDraw
dr = ImageDraw.Draw(cl)
for cx, cy, r in ((0.72, 0.1, 0.07), (0.79, 0.085, 0.055), (0.66, 0.115, 0.05), (0.2, 0.16, 0.045), (0.25, 0.15, 0.05)):
    dr.ellipse(((cx - r * 1.4) * W, (cy - r * 0.7) * H, (cx + r * 1.4) * W, (cy + r * 0.7) * H), fill=235)
cl = cl.filter(ImageFilter.GaussianBlur(W * 0.012))
sky_im = Image.composite(Image.new('RGB', (W, H), (255, 255, 255)), sky_im, cl)
scene = sky_im.convert('RGBA'); scene.alpha_composite(bg)
scene = scene.convert('RGB')

# softened by distance: the circle of confusion grows with how far from the focus (the birds) each pixel is
focus, k = M['focus'], float(os.environ.get('BLUR', '0.016'))
coc = np.abs(1.0 / focus - 1.0 / np.maximum(depth, 0.05)) * focus * k * W      # (pixels)
coc = np.minimum(coc, W * 0.03)
levels = [0, 1.5, 3, 5, 8, 12, 18, 26, 36]
levels = [l * W / 1024 for l in levels]
blurred = [np.asarray(scene if l == 0 else scene.filter(ImageFilter.GaussianBlur(l / 2))).astype(np.float64) for l in levels]
out = np.zeros_like(blurred[0])
idx = np.interp(coc, levels, np.arange(len(levels)))
lo = np.floor(idx).astype(int); hi = np.minimum(lo + 1, len(levels) - 1); fr = (idx - lo)[..., None]
stack = np.stack(blurred)
yy, xx = np.mgrid[0:H, 0:W]
out = stack[lo, yy, xx] * (1 - fr) + stack[hi, yy, xx] * fr
scene = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
# a touch of warm sunlight and depth: the background a little lighter and hazier than the birds
scene = ImageEnhance.Color(scene).enhance(float(os.environ.get('SAT', '1.12')))
img = scene.convert('RGBA')
b2 = ImageEnhance.Brightness(birds).enhance(float(os.environ.get('BIRD_BRIGHT', '1.06')))
img.alpha_composite(b2)
# a soft vignette
vy, vx = np.mgrid[0:H, 0:W]
r = np.hypot((vx / W - 0.5) / 0.75, (vy / H - 0.52) / 0.75)
v = 1 - float(os.environ.get('VIG', '0.16')) * np.clip(r, 0, 1) ** 2.2
arr = np.asarray(img.convert('RGB')).astype(np.float64) * v[..., None]
img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
img = img.resize((SIZE, SIZE), Image.LANCZOS)
img.save(OUT, optimize=True)
print('icon', OUT, img.size)
