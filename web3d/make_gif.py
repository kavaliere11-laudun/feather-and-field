"""Stitch clip frames (clip.mjs output) into an animated GIF, optionally cropped and labelled.
Usage: python3 make_gif.py PREFIX out.gif fps [x0 y0 x1 y1] [label]"""
import sys, glob
from PIL import Image, ImageDraw, ImageFont

prefix, out, fps = sys.argv[1], sys.argv[2], float(sys.argv[3])
box = tuple(int(v) for v in sys.argv[4:8]) if len(sys.argv) >= 8 else None
label = sys.argv[8] if len(sys.argv) > 8 else ''
files = sorted(glob.glob(prefix + '_*.png'))
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
frames = []
for f in files:
    im = Image.open(f).convert('RGB')
    if box: im = im.crop(box)
    if label:
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, im.width, 34], fill='#f4f6ef'); d.text((10, 5), label, fill='#24402a', font=font)
    frames.append(im.quantize(colors=200, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE))
frames[0].save(out, save_all=True, append_images=frames[1:], duration=int(1000 / fps), loop=0, optimize=True)
print('WROTE', out, len(frames), 'frames')
