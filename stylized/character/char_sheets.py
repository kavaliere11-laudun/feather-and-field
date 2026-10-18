"""Lays out the two character design sheets for Feather & Field from the Blender renders in out/.
1. out/sheet_expressions.png : ten hen expressions, each with when it shows up in the game (EN + FR)
2. out/sheet_character.png   : hen and rooster turnarounds (front, three-quarter, side, back) plus their colours"""
import os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out')
FONT = os.path.join(HERE, 'fonts', 'Nunito.ttf')
INK = (59, 33, 22); MUTED = (126, 104, 92); PAPER = (242, 244, 236)


def font(size, weight='Regular'):
    f = ImageFont.truetype(FONT, size); f.set_variation_by_name(weight); return f


def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rounded(size, r, fill):
    m = Image.new('L', size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), r, fill=255)
    tile = Image.new('RGBA', size, fill + (255,)); tile.putalpha(m); return tile, m


def wrap(draw, text, f, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=f) <= width: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines


def shadow(img, box, r, blur=18, alpha=40, off=8):
    sh = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(sh)
    d.rounded_rectangle((box[0], box[1] + off, box[2], box[3] + off), r, fill=(70, 50, 30, alpha))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))


EXPR = [  # key, EN, FR, card colour, accent, when EN, when FR
    ('happy', 'Happy', 'Heureuse', '#DDF0D8', '#3E7B3A', 'Fed, comfy and safe', 'Nourrie, au chaud, en sécurité'),
    ('joyful', 'Joyful', 'Ravie', '#FFEFB8', '#8F6200', 'Just laid an egg or won a rosette', 'Vient de pondre ou de gagner un prix'),
    ('hungry', 'Hungry', 'Affamée', '#FFDFCB', '#B5531F', 'The feeder is empty', 'La mangeoire est vide'),
    ('sleepy', 'Sleepy', 'Endormie', '#E3E0F7', '#5A52A3', 'Night time, or after a long day', 'La nuit, ou après une longue journée'),
    ('surprised', 'Surprised', 'Surprise', '#D6EAF9', '#2C6E9E', 'A rare chick hatches', 'Un poussin rare éclot'),
    ('sad', 'Sad', 'Triste', '#E0E5EC', '#4E5E70', 'Left hungry or alone for too long', 'Laissée trop longtemps sans soins'),
    ('grumpy', 'Grumpy', 'Grognon', '#F8D8D2', '#A8352B', 'A crowded coop or a bossy rooster', 'Poulailler trop plein ou coq trop autoritaire'),
    ('love', 'In love', 'Amoureuse', '#FCDCE8', '#B42A5C', 'Paired with a rooster to breed', 'En couple avec un coq'),
    ('mischief', 'Mischievous', 'Espiègle', '#D5F0EA', '#1F7A6C', 'A rebel planning her next escape', 'Une rebelle qui prépare sa prochaine évasion'),
    ('proud', 'Proud', 'Fière', '#EAF0C6', '#5E7A12', 'A good mum with her chicks', 'Une mère poule avec ses poussins'),
]


def expression_sheet():
    W, H = 2500, 1640; M, G, COLS = 70, 30, 5
    img = Image.new('RGBA', (W, H), PAPER + (255,)); d = ImageDraw.Draw(img)
    d.text((M, 58), 'Hen expressions', font=font(72, 'ExtraBold'), fill=INK)
    d.text((M + 4, 146), 'Les expressions de la poule', font=font(36, 'SemiBold'), fill=MUTED)
    rt = 'Feather & Field'; f = font(34, 'ExtraBold'); d.text((W - M - d.textlength(rt, font=f), 70), rt, font=f, fill=INK)
    rt2 = 'Character design, stage 0'; f2 = font(26, 'SemiBold'); d.text((W - M - d.textlength(rt2, font=f2), 116), rt2, font=f2, fill=MUTED)
    cw = (W - 2 * M - (COLS - 1) * G) // COLS; ch = 655; top = 230
    for i, (k, en, fr, col, acc, wen, wfr) in enumerate(EXPR):
        x = M + (i % COLS) * (cw + G); y = top + (i // COLS) * (ch + G)
        shadow(img, (x, y, x + cw, y + ch), 34, alpha=34)
        card, mask = rounded((cw, ch), 34, hexrgb(col))
        art = Image.open(os.path.join(OUT, 'face_%s.png' % k)).convert('RGBA')
        art = art.crop((0, 0, art.width, art.height)).resize((cw, cw), Image.LANCZOS)
        card.alpha_composite(art, (0, 0))
        # a soft white panel for the words
        cd = ImageDraw.Draw(card)
        cd.rectangle((0, cw - 6, cw, ch), fill=(255, 255, 255, 235))
        cd.text((26, cw + 16), en, font=font(40, 'ExtraBold'), fill=hexrgb(acc))
        cd.text((26 + cd.textlength(en, font=font(40, 'ExtraBold')) + 14, cw + 28), fr, font=font(28, 'SemiBold'), fill=MUTED)
        yy = cw + 76
        for ln in wrap(cd, wen, font(24, 'Bold'), cw - 52): cd.text((26, yy), ln, font=font(24, 'Bold'), fill=INK); yy += 31
        yy += 2
        for ln in wrap(cd, wfr, font(22, 'Medium'), cw - 52): cd.text((26, yy), ln, font=font(22, 'Medium'), fill=MUTED); yy += 28
        card.putalpha(Image.composite(card.split()[3], Image.new('L', card.size, 0), mask))
        img.alpha_composite(card, (x, y))
    img.convert('RGB').save(os.path.join(OUT, 'sheet_expressions.png'))
    print('expressions sheet', img.size)


SW = {
    'rir_h': [('Feathers', 'Plumes', '#7a2d16'), ('Highlights', 'Reflets', '#b65a2a'), ('Collar', 'Camail', '#c06a32'), ('Wing', 'Aile', '#73301a'),
              ('Tail', 'Queue', '#30170f'), ('Comb', 'Crête', '#dd3a2e'), ('Beak', 'Bec', '#f0b84e'), ('Eyes', 'Yeux', '#e9922a'), ('Cheeks', 'Joues', '#ff8f9e')],
    'rir_r': [('Feathers', 'Plumes', '#6a220f'), ('Highlights', 'Reflets', '#d0702a'), ('Collar', 'Camail', '#de8a34'), ('Wing', 'Aile', '#86301a'),
              ('Tail', 'Queue', '#16110e'), ('Comb', 'Crête', '#e43a2c'), ('Beak', 'Bec', '#f0b84e'), ('Legs', 'Pattes', '#f2c23f')],
}


def clean_shadow(im):
    """Keep the hen's cast shadow but drop the faint grey haze the shadow catcher leaves over the whole ground,
    and fade the shadow out before the picture's edges so no hard border shows."""
    import numpy as np
    a = np.array(im.convert('RGBA')).astype(np.float32)
    alpha = a[..., 3]; dark = a[..., :3].max(-1) < 14
    shadow = dark & (alpha < 252)
    h, w = alpha.shape
    xs = np.arange(w); fx = np.clip(np.minimum(xs, w - 1 - xs) / (w * 0.14), 0, 1)
    ys = np.arange(h); fy = np.clip((h - 1 - ys) / (h * 0.08), 0, 1)
    fade = fy[:, None] * fx[None, :]
    a[..., 3] = np.where(shadow, np.clip((alpha - 10) * 1.6, 0, 255) * fade, alpha)
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def trim_alpha(im, pad=0):
    bb = im.split()[3].point(lambda a: 255 if a > 8 else 0).getbbox(); return bb


def character_sheet():
    W, H = 2500, 1800; M = 70
    img = Image.new('RGBA', (W, H), PAPER + (255,)); d = ImageDraw.Draw(img)
    d.text((M, 58), 'Meet the hen and the rooster', font=font(72, 'ExtraBold'), fill=INK)
    d.text((M + 4, 146), 'La poule et le coq : Rhode Island Red', font=font(36, 'SemiBold'), fill=MUTED)
    rt = 'Feather & Field'; f = font(34, 'ExtraBold'); d.text((W - M - d.textlength(rt, font=f), 70), rt, font=f, fill=INK)
    rt2 = 'Character design, stage 0'; f2 = font(26, 'SemiBold'); d.text((W - M - d.textlength(rt2, font=f2), 116), rt2, font=f2, fill=MUTED)
    views = [('front', 'Front', 'Face'), ('34', 'Three-quarter', 'Trois-quarts'), ('side', 'Side', 'Profil'), ('back', 'Back', 'Dos')]
    labw = 330; vw = (W - 2 * M - labw) // 4; rowh = 560; top = 230
    for r, (key, en, fr, note) in enumerate((('rir_h', 'Hen', 'Poule', 'The star of the farm. Lays eggs, wins rosettes, raises chicks.'),
                                             ('rir_r', 'Rooster', 'Coq', 'A little bigger, with a tall comb, a golden collar and sickle tail feathers.'))):
        y = top + r * (rowh + 40)
        shadow(img, (M, y, W - M, y + rowh), 40, alpha=30)
        band, mask = rounded((W - 2 * M, rowh), 40, (255, 255, 255)); img.alpha_composite(band, (M, y))
        d.text((M + 40, y + 50), en, font=font(56, 'ExtraBold'), fill=INK)
        d.text((M + 42, y + 120), fr, font=font(34, 'SemiBold'), fill=MUTED)
        yy = y + 190
        for ln in wrap(d, note, font(25, 'Medium'), labw - 70): d.text((M + 42, yy), ln, font=font(25, 'Medium'), fill=MUTED); yy += 34
        for c, (v, ven, vfr) in enumerate(views):
            p = os.path.join(OUT, 'turn_%s_%s.png' % (key, v))
            if not os.path.exists(p): continue
            raw = Image.open(p); w0 = raw.width
            raw = raw.crop((int(w0 * 0.1), int(w0 * 0.12), int(w0 * 0.9), int(w0 * 0.92)))      # same crop for every view keeps hen and rooster to scale
            art = clean_shadow(raw); s = (rowh - 70) / art.height
            art = art.resize((int(art.width * s), int(art.height * s)), Image.LANCZOS)
            cx = M + labw + c * vw + vw // 2
            img.alpha_composite(art, (cx - art.width // 2, y + 6))
            lab = ven + ' / ' + vfr; fl = font(24, 'Bold')
            d.text((cx - d.textlength(lab, font=fl) / 2, y + rowh - 52), lab, font=fl, fill=MUTED)
    # colours
    y = top + 2 * (rowh + 40) + 10
    d.text((M, y), 'Colours', font=font(44, 'ExtraBold'), fill=INK)
    d.text((M + d.textlength('Colours', font=font(44, 'ExtraBold')) + 18, y + 14), 'Couleurs', font=font(30, 'SemiBold'), fill=MUTED)
    y += 80
    half = (W - 2 * M - 40) // 2
    for gi, (key, name) in enumerate((('rir_h', 'Hen / Poule'), ('rir_r', 'Rooster / Coq'))):
        x0 = M + gi * (half + 40)
        d.text((x0, y), name, font=font(28, 'Bold'), fill=INK)
        sw = SW[key]; step = half // len(sw)
        for i, (en, fr, hx) in enumerate(sw):
            cx = x0 + i * step + 44; cy = y + 100
            d.ellipse((cx - 40, cy - 40, cx + 40, cy + 40), fill=hexrgb(hx), outline=(255, 255, 255), width=5)
            for t, fnt, colr, dy in ((en, font(21, 'Bold'), INK, 54), (fr, font(19, 'Medium'), MUTED, 80), (hx.upper(), font(17, 'Medium'), MUTED, 104)):
                d.text((cx - d.textlength(t, font=fnt) / 2, cy + dy), t, font=fnt, fill=colr)
    img.convert('RGB').save(os.path.join(OUT, 'sheet_character.png'))
    print('character sheet', img.size)


if __name__ == '__main__':
    which = sys.argv[1:] or ['expr', 'char']
    if 'expr' in which: expression_sheet()
    if 'char' in which: character_sheet()
