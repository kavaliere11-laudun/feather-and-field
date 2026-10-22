import sys
from PIL import Image
names = sys.argv[2:]; out = sys.argv[1]
ims = [Image.open('out/face_%s.png' % n).convert('RGBA') for n in names]
w, h = ims[0].size; cols = 4; rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w + (cols + 1) * 8, rows * h + (rows + 1) * 8), (255, 255, 255))
for i, im in enumerate(ims):
    bg = Image.new('RGBA', im.size, (240, 232, 214, 255)); bg.alpha_composite(im)
    sheet.paste(bg.convert('RGB'), (8 + (i % cols) * (w + 8), 8 + (i // cols) * (h + 8)))
sheet.save(out, quality=90)
