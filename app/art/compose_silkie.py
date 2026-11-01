"""The app icon, round 2 (1 Nov 2026; Audrey: "I like the silky, needs to be high quality. Maybe profile, and maybe with
something else in the background that gives an idea of the game. Maybe a baby chick with her too. Come with ideas"):
the white Silkie hen side on with her chick looking up at her (web3d/iconpics.mjs silfam), in front of the game itself.
    python3 compose_silkie.py CUTOUTS OUT    (icon_s1..s4.png, 1024 x 1024, opaque)
1 pagoda  the Silkies' own Cosy Pagoda and its cherry tree behind, softened, a blue morning sky
2 farm    the Red Barn's pen, the sunflowers and the scarecrow behind, softened, a blue sky
3 golden  the same farm at golden hour: a warm sky, the light low and warm
4 hearts  on the game's green with a soft light behind them and a little heart between them
"""
import math, os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

S = 1024
SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)


def hexc(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def vgrad(top, bottom, w=S, h=S):
    im = Image.new('RGB', (1, h)); a, b = hexc(top), hexc(bottom)
    for y in range(h):
        t = y / (h - 1); im.putpixel((0, y), tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3)))
    return im.resize((w, h))


def radial(inner, outer, cx=0.5, cy=0.5, r=0.75):
    im = Image.new('RGB', (S, S)); px = im.load(); a, b = hexc(inner), hexc(outer)
    for y in range(S):
        for x in range(S):
            t = min(1, math.hypot(x / S - cx, y / S - cy) / r); t = t * t * (3 - 2 * t)
            px[x, y] = tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
    return im


def scene(name, sky_top, sky_bottom, blur, crop=None, warm=None):
    """a game background (see-through sky) over a sky of our own, softened like a photo's background"""
    bg = Image.open(os.path.join(SRC, f'bg_{name}.png')).convert('RGBA')
    if crop: bg = bg.crop(crop)
    bg = bg.resize((S, S), Image.LANCZOS)
    sky = vgrad(sky_top, sky_bottom).convert('RGBA'); sky.alpha_composite(bg)
    im = sky.convert('RGB')
    if warm:
        im = Image.blend(im, Image.new('RGB', (S, S), hexc(warm[0])), warm[1])
        im = ImageEnhance.Brightness(im).enhance(warm[2])
    return im.filter(ImageFilter.GaussianBlur(blur))


def pair():
    h = Image.open(os.path.join(SRC, 'silfam_0.png')).convert('RGBA'); c = Image.open(os.path.join(SRC, 'silfam_1.png')).convert('RGBA')
    t = Image.new('RGBA', h.size, (0, 0, 0, 0)); t.alpha_composite(h); t.alpha_composite(c)
    box = t.getchannel('A').point(lambda a: 255 if a > 30 else 0).getbbox()
    return t.crop(box)


def place(im, cut, width, cx, base_y):
    k = width / cut.width; c = cut.resize((round(cut.width * k), round(cut.height * k)), Image.LANCZOS)
    out = im.convert('RGBA'); out.alpha_composite(c, (round(cx - c.width / 2), round(base_y - c.height))); return out


def vignette(im, strength=0.22):
    m = radial('#ffffff', '#000000', 0.5, 0.48, 0.95).convert('L')
    dark = ImageEnhance.Brightness(im.convert('RGB')).enhance(1 - strength)
    return Image.composite(im.convert('RGB'), dark, m)


def heart(im, cx, cy, r, colour):
    """a small heart (two circles and a point), softly edged"""
    big = 4; L = Image.new('L', (S * big // 4, S * big // 4), 0)
    g = Image.new('RGBA', (S, S), hexc(colour) + (0,)); m = Image.new('L', (S, S), 0); d = ImageDraw.Draw(m)
    d.ellipse((cx - r, cy - r * 0.6, cx, cy + r * 0.4), fill=255); d.ellipse((cx, cy - r * 0.6, cx + r, cy + r * 0.4), fill=255)
    d.polygon([(cx - r * 0.97, cy + r * 0.0), (cx + r * 0.97, cy + r * 0.0), (cx, cy + r * 1.15)], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(1.5)); g.putalpha(m)
    out = im.convert('RGBA'); out.alpha_composite(g); return out


cut = pair()
made = {}
made['s1_pagoda'] = place(vignette(scene('pagoda', '#9fd6f7', '#e3f5fd', 7)), cut, 790, 512, 935)
made['s2_farm'] = place(vignette(scene('farm', '#8fcff6', '#e6f6fd', 7)), cut, 790, 512, 935)
made['s3_golden'] = place(vignette(scene('farm', '#ffb867', '#ffe4a6', 7, warm=('#ffb35c', 0.18, 1.0)), 0.28), cut, 790, 512, 935)
base = radial('#c9ec8e', '#4f7d2a', 0.5, 0.42, 0.85)
made['s4_hearts'] = place(heart(base, 300, 395, 46, '#ff7a8a'), cut, 790, 512, 915)
for n, im in made.items():
    im.convert('RGB').save(os.path.join(OUT, f'icon_{n}.png'), optimize=True); print(n)
