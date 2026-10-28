"""The fish cards' pictures (fish/<id>.webp, 360x240, see-through round the fish): from fishpics.mjs's shots on cream
(BACKDROP=1 W=360 H=220 ./withserver.sh node fishpics.mjs /tmp/fishcards), each cropped round its fish, the cream taken
out of its soft edges. Usage: python3 fishcards.py /tmp/fishcards"""
import sys, glob, os
import numpy as np
from PIL import Image
SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/fishcards'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fish')
os.makedirs(OUT, exist_ok=True)
for f in sorted(glob.glob(os.path.join(SRC, '[0-9][0-9]_*.png'))):
    fid = os.path.basename(f)[3:-4]
    a = np.asarray(Image.open(f).convert('RGB')).astype(np.float32)
    bg = a[2, 2]
    alpha = np.clip((np.sqrt(((a - bg) ** 2).sum(-1)) - 5) / 28, 0, 1)
    ys, xs = np.where(alpha > 0.5); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    W = max((x1 - x0) * 1.12, (y1 - y0) * 1.12 * 1.5); H = W / 1.5; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    k = alpha[..., None]
    rgb = np.where(k > 0.02, (a - bg * (1 - k)) / np.maximum(k, 0.02), a)          # (the cream un-mixed from the edges)
    img = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8), 'RGBA')
    img.crop((int(cx - W / 2), int(cy - H / 2), int(cx + W / 2), int(cy + H / 2))).resize((360, 240), Image.LANCZOS).save(os.path.join(OUT, fid + '.webp'), quality=88, method=6)
    print(fid)
