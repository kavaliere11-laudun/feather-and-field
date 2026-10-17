"""Write the map geometry the game needs: for each plot, an affine map from local ground metres to map pixels."""
import sys, json, math
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import ffcam
from ffcam import uv_to_world

M = json.load(open(sys.argv[1]))
W, H = M['size']
SLOTS = [(-3.3, 12.5, 90), (3.3, 12.5, 0), (-3.3, 6.0, 90), (3.3, 6.0, 0), (-3.3, -0.5, 90), (3.3, -0.5, 0), (-3.3, -7.0, 90), (3.3, -7.0, 0)]
PASTURE_UV = (3.3, -14.0)
TGT = (*uv_to_world(0, 2.0), 0)
P = lambda p: ffcam.project(p, TGT, W, H)
r = lambda v: round(v, 2)


def rot2(x, y, deg):
    a = math.radians(deg); return x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)


def frame(u, v, deg):
    cx, cy = uv_to_world(u, v)
    c = P((cx, cy, 0))
    ax = rot2(1, 0, deg); ay = rot2(0, 1, deg)
    ex = P((cx + ax[0], cy + ax[1], 0)); ey = P((cx + ay[0], cy + ay[1], 0))
    return {'c': [r(c[0]), r(c[1])], 'ex': [r(ex[0] - c[0]), r(ex[1] - c[1])], 'ey': [r(ey[0] - c[0]), r(ey[1] - c[1])], 'deg': deg}


o = P((0, 0, 0)); z = P((0, 0, 1))
ov = ffcam.project((0, 0, 0), (0, 0, 0.6), 600, 600)
out = {
    'size': [W, H],
    'ez': [r(z[0] - o[0]), r(z[1] - o[1])],
    'ov': [r(ov[0]), r(ov[1])],
    'slots': [frame(*s) for s in SLOTS],
    'pasture': frame(*PASTURE_UV, 0),
    'house': M['house'], 'stall': M['stall'],
}
for s, m in zip(out['slots'], M['slots']):
    assert abs(s['c'][0] - m['center'][0]) < 1 and abs(s['c'][1] - m['center'][1]) < 1, (s, m)
json.dump(out, open(sys.argv[2], 'w'), separators=(',', ':'))
print(json.dumps(out)[:400])
