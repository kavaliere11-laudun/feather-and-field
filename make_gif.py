"""Preview animation of a bird's poses walking over a strip of the farm. Usage: python3 make_gif.py DIR KIND SEX OUT.gif"""
import sys
from PIL import Image
import numpy as np
D, K, S, OUT = sys.argv[1:5]
def clean(im):
    a = np.array(im).astype(np.float32); a[:, :, 3] = np.clip((a[:, :, 3] - 18) / 237 * 255, 0, 255); return Image.fromarray(a.astype(np.uint8))
g = 1.35; spr = {}
def get(n):
    if n not in spr:
        im = clean(Image.open(f'{D}/{n}_{K}_{S}.png').convert('RGBA')); spr[n] = im.resize((int(im.size[0] * g), int(im.size[1] * g)), Image.LANCZOS)
    return spr[n]
strip = Image.open('game2/img/farm_map.webp').convert('RGB').crop((2250, 2290, 3400, 2450)).resize((2300, 320), Image.LANCZOS)
W, H = 480, 320; step = 6.67 * g
walk = ['walk%d' % i for i in range(8)]
seq = [(n, 70) for n in walk * 3] + [('stand', 400), ('look1', 800), ('stand', 250), ('look2', 700), ('stand', 300),
       ('scratch0', 160), ('scratch1', 240), ('scratch0', 160), ('scratch1', 240), ('stand', 180),
       ('peck0', 110), ('peck1', 170), ('peck0', 100), ('peck1', 170), ('peck2', 450), ('stand', 500)] + [(n, 70) for n in walk * 2] + [('stand', 600)]
frames, durs = [], []; off = 0.0
for n, d in seq:
    if n.startswith('walk'): off += step
    bg = strip.crop((int(off), 0, int(off) + W, H)).convert('RGBA')
    im = get(n); bg.alpha_composite(im, ((W - im.size[0]) // 2, H - im.size[1] + 40))
    frames.append(bg.convert('P', palette=Image.ADAPTIVE, colors=220)); durs.append(d)
frames[0].save(OUT, save_all=True, append_images=frames[1:], duration=durs, loop=0, disposal=2)
