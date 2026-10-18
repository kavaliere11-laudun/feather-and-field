"""The two farmer design sheets, built from the renders in out/:
out/sheet_farmer.png (both looks from four sides, colours, size next to a hen) and out/sheet_farmer_moods.png (six moods and when they show)."""
import os, sys
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from char_sheets import font, hexrgb, rounded, wrap, shadow, clean_shadow, INK, MUTED, PAPER, OUT

MOODS = [  # key, EN, FR, art background, accent, when EN, when FR, dark art?
    ('happy', 'Happy', 'Bonne humeur', '#DDF0D8', '#3E7B3A', 'Most of the time: waves hello when you arrive', 'La plupart du temps : vous salue à votre arrivée', False),
    ('telloff', 'Telling off', 'Sermon', '#FFEFB8', '#8F6200', 'Daytime: brings a runaway back to the coop', 'En journée : ramène un fugueur au poulailler', False),
    ('worried', 'Worried', 'Inquiétude', '#FFD9C2', '#B5531F', 'Dusk: a hen is still out and night is coming', 'Au crépuscule : une poule est encore dehors et la nuit tombe', False),
    ('panic', 'Panic', 'Panique', '#2E3A63', '#2E3A63', 'Night: a runaway is out and the fox is about', 'La nuit : un fugueur est dehors et le renard rôde', True),
    ('cuddle', 'Cuddle', 'Câlin', '#FCDCE8', '#B42A5C', 'Cuddling a hen to make her happy', 'Câline une poule pour la rendre heureuse', False),
    ('feed', 'Feeding', 'Repas', '#EAF0C6', '#5E7A12', 'Filling the feeders and scattering corn', 'Remplit les mangeoires et lance du grain', False),
]


def header(d, W, M, title, sub):
    d.text((M, 58), title, font=font(72, 'ExtraBold'), fill=INK)
    d.text((M + 4, 146), sub, font=font(36, 'SemiBold'), fill=MUTED)
    rt = 'Feather & Field'; f = font(34, 'ExtraBold'); d.text((W - M - d.textlength(rt, font=f), 70), rt, font=f, fill=INK)
    rt2 = 'Character design, stage 0'; f2 = font(26, 'SemiBold'); d.text((W - M - d.textlength(rt2, font=f2), 116), rt2, font=f2, fill=MUTED)


def moods_sheet():
    W, H = 2500, 2250; M, G, COLS = 70, 34, 3
    img = Image.new('RGBA', (W, H), PAPER + (255,)); d = ImageDraw.Draw(img)
    header(d, W, M, 'Farmer moods', 'Les humeurs du fermier et de la fermière')
    cw = (W - 2 * M - (COLS - 1) * G) // COLS; art = cw; ch = art + 190; top = 230
    for i, (k, en, fr, col, acc, wen, wfr, dark) in enumerate(MOODS):
        x = M + (i % COLS) * (cw + G); y = top + (i // COLS) * (ch + G)
        shadow(img, (x, y, x + cw, y + ch), 36, alpha=34)
        card, mask = rounded((cw, ch), 36, hexrgb(col))
        a = clean_shadow(Image.open(os.path.join(OUT, 'fm_mood_%s.png' % k)))
        if dark:                                   # night: a soft glow behind, the shadow lightened so it reads on dark blue
            a = a.copy(); px = a.load()
            for yy in range(a.height):
                for xx in range(a.width):
                    r, g, b, al = px[xx, yy]
                    if al and max(r, g, b) < 14: px[xx, yy] = (10, 14, 30, al)
        a = a.resize((art, art), Image.LANCZOS)
        card.alpha_composite(a, (0, 0))
        cd = ImageDraw.Draw(card)
        cd.rectangle((0, art - 6, cw, ch), fill=(255, 255, 255, 240))
        tf = font(46, 'ExtraBold'); cd.text((30, art + 20), en, font=tf, fill=hexrgb(acc))
        cd.text((30 + cd.textlength(en, font=tf) + 16, art + 34), fr, font=font(30, 'SemiBold'), fill=MUTED)
        yy = art + 86
        for ln in wrap(cd, wen, font(26, 'Bold'), cw - 60): cd.text((30, yy), ln, font=font(26, 'Bold'), fill=INK); yy += 34
        yy += 2
        for ln in wrap(cd, wfr, font(24, 'Medium'), cw - 60): cd.text((30, yy), ln, font=font(24, 'Medium'), fill=MUTED); yy += 31
        card.putalpha(Image.composite(card.split()[3], Image.new('L', card.size, 0), mask))
        img.alpha_composite(card, (x, y))
    img.convert('RGB').save(os.path.join(OUT, 'sheet_farmer_moods.png'))
    print('moods sheet', img.size)


SW = {
    'm': [('Skin', 'Peau', '#eab48c'), ('Hair', 'Cheveux', '#6b3b1f'), ('Eyes', 'Yeux', '#4f7d3a'), ('Shirt', 'Chemise', '#c8372d'), ('Dungarees', 'Salopette', '#3e6ea3'),
          ('Wellies', 'Bottes', '#3f6e3c'), ('Hat', 'Chapeau', '#e6c26c'), ('Band', 'Ruban', '#3d6aa8')],
    'f': [('Skin', 'Peau', '#a8714f'), ('Hair', 'Cheveux', '#2a1a12'), ('Eyes', 'Yeux', '#4a2c18'), ('Shirt', 'Chemise', '#e0566a'), ('Dungarees', 'Salopette', '#3e6ea3'),
          ('Wellies', 'Bottes', '#efbf3a'), ('Hat', 'Chapeau', '#e6c26c'), ('Ribbon', 'Ruban', '#d8343a')],
}


def farmer_sheet():
    W, H = 2500, 2140; M = 70
    img = Image.new('RGBA', (W, H), PAPER + (255,)); d = ImageDraw.Draw(img)
    header(d, W, M, 'Meet the farmer', 'Le fermier et la fermière : le joueur choisit')
    views = [('front', 'Front', 'Face'), ('34', 'Three-quarter', 'Trois-quarts'), ('side', 'Side', 'Profil'), ('back', 'Back', 'Dos')]
    labw = 330; vw = (W - 2 * M - labw) // 4; rowh = 600; top = 230
    rows = (('m', 'Him', 'Lui', 'Straw hat with a blue band, red checked shirt with rolled sleeves, short beard, green wellies.'),
            ('f', 'Her', 'Elle', 'Straw hat with a red ribbon and a daisy, pink checked shirt, long plait, yellow wellies.'))
    for r, (key, en, fr, note) in enumerate(rows):
        y = top + r * (rowh + 40)
        shadow(img, (M, y, W - M, y + rowh), 40, alpha=30)
        band, _ = rounded((W - 2 * M, rowh), 40, (255, 255, 255)); img.alpha_composite(band, (M, y))
        d.text((M + 40, y + 50), en, font=font(56, 'ExtraBold'), fill=INK)
        d.text((M + 42, y + 120), fr, font=font(34, 'SemiBold'), fill=MUTED)
        yy = y + 190
        for ln in wrap(d, note, font(25, 'Medium'), labw - 70): d.text((M + 42, yy), ln, font=font(25, 'Medium'), fill=MUTED); yy += 34
        for c, (v, ven, vfr) in enumerate(views):
            p = os.path.join(OUT, 'fm_%s_turn_%s.png' % (key, v))
            if not os.path.exists(p): continue
            raw = Image.open(p); w0 = raw.width
            raw = raw.crop((int(w0 * 0.12), int(w0 * 0.06), int(w0 * 0.88), int(w0 * 0.98)))
            art = clean_shadow(raw); s = (rowh - 70) / art.height
            art = art.resize((int(art.width * s), int(art.height * s)), Image.LANCZOS)
            cx = M + labw + c * vw + vw // 2
            img.alpha_composite(art, (cx - art.width // 2, y + 8))
            lab = ven + ' / ' + vfr; fl = font(24, 'Bold')
            d.text((cx - d.textlength(lab, font=fl) / 2, y + rowh - 52), lab, font=fl, fill=MUTED)
    # colours (left) and size next to a hen (right)
    y0 = top + 2 * (rowh + 40) + 10
    d.text((M, y0), 'Colours', font=font(44, 'ExtraBold'), fill=INK)
    d.text((M + d.textlength('Colours', font=font(44, 'ExtraBold')) + 18, y0 + 14), 'Couleurs', font=font(30, 'SemiBold'), fill=MUTED)
    colw = 1280
    for gi, (key, name) in enumerate((('m', 'Him / Lui'), ('f', 'Her / Elle'))):
        y = y0 + 80 + gi * 210
        d.text((M, y), name, font=font(28, 'Bold'), fill=INK)
        sw = SW[key]; step = colw // len(sw)
        for i, (en, fr, hx) in enumerate(sw):
            cx = M + i * step + 46; cy = y + 92
            d.ellipse((cx - 38, cy - 38, cx + 38, cy + 38), fill=hexrgb(hx), outline=(255, 255, 255), width=5)
            for t_, fnt, colr, dy in ((en, font(20, 'Bold'), INK, 50), (fr, font(18, 'Medium'), MUTED, 74), (hx.upper(), font(16, 'Medium'), MUTED, 96)):
                d.text((cx - d.textlength(t_, font=fnt) / 2, cy + dy), t_, font=fnt, fill=colr)
    lx = M + colw + 60; lw = W - M - lx
    d.text((lx, y0), 'Size next to a hen', font=font(44, 'ExtraBold'), fill=INK)
    d.text((lx, y0 + 58), 'Taille à côté d’une poule', font=font(30, 'SemiBold'), fill=MUTED)
    p = os.path.join(OUT, 'fm_lineup.png')
    if os.path.exists(p):
        art = clean_shadow(Image.open(p)); s = min(lw / art.width, (H - y0 - 130) / art.height)
        art = art.resize((int(art.width * s), int(art.height * s)), Image.LANCZOS)
        img.alpha_composite(art, (lx + (lw - art.width) // 2, y0 + 110))
    img.convert('RGB').save(os.path.join(OUT, 'sheet_farmer.png'))
    print('farmer sheet', img.size)


if __name__ == '__main__':
    which = sys.argv[1:] or ['moods', 'farmer']
    if 'moods' in which: moods_sheet()
    if 'farmer' in which: farmer_sheet()
