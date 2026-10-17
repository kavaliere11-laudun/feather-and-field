"""Join the strips of a map render into farm_map.png. Usage: python3 stitch_map.py DIR"""
import sys, json, numpy as np
from PIL import Image
D = sys.argv[1]; TAG = sys.argv[2] if len(sys.argv) > 2 else ''; parts = json.load(open(f'{D}/strips{TAG}.json'))
ims = [np.array(Image.open(f'{D}/{n}').convert('RGBA')).astype(np.float32) for n, _, _ in parts]
W = ims[0].shape[1]; H = parts[-1][2]; OV = 32 * (W / 3440)
out = np.zeros((H, W, 4), np.float32); wsum = np.zeros((H, 1, 1), np.float32)
for (n, top, bot), im in zip(parts, ims):
    h = im.shape[0]
    if h != bot - top: print('height', n, h, bot - top)
    t = top if top == 0 else bot - h if bot == H else top
    w = np.ones((h, 1, 1), np.float32); r = np.arange(h, dtype=np.float32)
    if t > 0: w[:, 0, 0] = np.minimum(w[:, 0, 0], np.clip((r - OV / 2) / OV, 0, 1))      # fade in across the overlap
    if t + h < H: w[:, 0, 0] = np.minimum(w[:, 0, 0], np.clip((h - 1 - r - OV / 2) / OV, 0, 1))
    out[t:t + h] += im * w; wsum[t:t + h] += w
Image.fromarray((out / np.maximum(wsum, 1e-6)).clip(0, 255).astype(np.uint8)).save(f'{D}/farm_map{TAG}.png')
print('stitched', W, H)
