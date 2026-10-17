import sys
from PIL import Image
out_path, names = sys.argv[1], sys.argv[2:]
S = 384
out = Image.new('RGB', (S * len(names), S), (143, 184, 98))
for i, n in enumerate(names):
    im = Image.open(n).convert('RGBA'); im = im.resize((S, S))
    bg = Image.new('RGBA', im.size, (143, 184, 98, 255)); bg.alpha_composite(im); out.paste(bg.convert('RGB'), (i * S, 0))
out.save(out_path)
