"""The app icon's candidates (1 Nov 2026; Audrey: "We need to work on the icon of the game too"): the game's own birds,
cut out by web3d/iconpics.mjs, set on simple bold backgrounds that read at a phone's icon size.
    python3 compose_icons.py CUTOUTS OUT      (CUTOUTS: iconpics.mjs's folder; OUT: icon_<name>.png, 1024 x 1024, opaque)
A  sunrise  the Rhode Island Red rooster crowing in front of a rising sun, on a green hill
B  silkie   the white Silkie hen on the game's green, a soft light behind her
C  trio     the rooster and his two hens on a green hill under a blue sky
D  portrait the rooster's head and shoulders, looking round at you, on warm yellow
Apple rounds the corners itself: the square is filled to its edges, the birds kept inside the middle 80%.
"""
import math, os, sys
from PIL import Image, ImageDraw, ImageFilter

S = 1024
SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)


def hexc(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def vgrad(top, bottom, stops=None):
    im = Image.new('RGB', (1, S))
    a, b = hexc(top), hexc(bottom)
    for y in range(S):
        t = y / (S - 1)
        im.putpixel((0, y), tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3)))
    return im.resize((S, S))


def radial(inner, outer, cx=0.5, cy=0.5, r=0.75):
    im = Image.new('RGB', (S, S)); px = im.load(); a, b = hexc(inner), hexc(outer)
    for y in range(S):
        for x in range(S):
            t = min(1, math.hypot(x / S - cx, y / S - cy) / r); t = t * t * (3 - 2 * t)
            px[x, y] = tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
    return im


def glow(im, cx, cy, r, colour, alpha):
    g = Image.new('RGBA', (S, S), hexc(colour) + (0,)); d = ImageDraw.Draw(g)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=hexc(colour) + (alpha,))
    g = g.filter(ImageFilter.GaussianBlur(r * 0.35))
    out = im.convert('RGBA'); out.alpha_composite(g); return out


def sun(im, cx, cy, r, colour, halo):
    """a round sun with a soft halo"""
    im = glow(im, cx, cy, r * 1.5, halo, 170)
    d = Image.new('RGBA', (S, S), hexc(colour) + (0,)); ImageDraw.Draw(d).ellipse((cx - r, cy - r, cx + r, cy + r), fill=hexc(colour) + (255,))      # (see-through round it in its own colour: no dark rim when softened)
    d = d.filter(ImageFilter.GaussianBlur(2)); im.alpha_composite(d); return im


def hill(im, top_y, colour, colour2, bulge=70):
    """a gentle green hill across the bottom, its top curving up in the middle"""
    m = Image.new('L', (S, S), 0); d = ImageDraw.Draw(m)
    pts = [(x, top_y - bulge * math.sin(math.pi * x / S)) for x in range(0, S + 1, 8)]
    d.polygon(pts + [(S, S), (0, S)], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(1.2))
    g = vgrad(colour, colour2).convert('RGBA'); out = im.convert('RGBA'); out.paste(g, (0, 0), m); return out


def bird(name, height, cx, base_y, shadow=True):
    """a cut-out scaled to its birds' height (the box round what's opaque), its feet at base_y"""
    c = Image.open(os.path.join(SRC, name + '.png')).convert('RGBA')
    box = c.getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox()
    c = c.crop(box); k = height / c.height
    c = c.resize((max(1, round(c.width * k)), round(height)), Image.LANCZOS)
    return c, (round(cx - c.width / 2), round(base_y - c.height))


def put(im, layer, at):
    im = im.convert('RGBA'); im.alpha_composite(layer, at); return im


def trio_cut():
    parts = [Image.open(os.path.join(SRC, f'trio_{i}.png')).convert('RGBA') for i in range(3)]
    t = Image.new('RGBA', parts[0].size, (0, 0, 0, 0))
    for p in parts: t.alpha_composite(p)
    t.save(os.path.join(SRC, 'trio.png'))


trio_cut()
made = {}

# A: sunrise
im = vgrad('#ffcf6a', '#ff9550')
im = sun(im, 600, 520, 250, '#fff1b8', '#fff8d8')
im = hill(im, 820, '#7fb24c', '#4f7d2a', bulge=60)
b, at = bird('roo', 820, 470, 915)
made['sunrise'] = put(im, b, at)

# B: the white Silkie
im = radial('#b9df7a', '#4f7d2a', 0.5, 0.42, 0.85)
im = glow(im, 512, 470, 300, '#f4ffd8', 150)
b, at = bird('sil', 700, 512, 900)
made['silkie'] = put(im, b, at)

# C: the trio
im = vgrad('#7fc8f2', '#d6f1fd')
im = sun(im, 800, 210, 85, '#fff6c4', '#ffffff')
im = hill(im, 800, '#86bb52', '#4f7d2a', bulge=70)
b, at = bird('trio', 660, 512, 905)
made['trio'] = put(im, b, at)

# D: the portrait
im = radial('#ffe27a', '#f4a63a', 0.45, 0.4, 0.95)
c = Image.open(os.path.join(SRC, 'roohead.png')).convert('RGBA')
box = c.getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox(); c = c.crop(box)
k = S * 1.02 / max(c.width, c.height); c = c.resize((round(c.width * k), round(c.height * k)), Image.LANCZOS)
made['portrait'] = put(im, c, (round(S / 2 - c.width / 2 + 40), S - c.height + 10))

for n, im in made.items():
    im.convert('RGB').save(os.path.join(OUT, f'icon_{n}.png'), optimize=True)
    print(n)
