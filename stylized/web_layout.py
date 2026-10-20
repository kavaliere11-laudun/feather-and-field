"""The farm's layout for the browser 3D farm, from farm_layout.NEW, in the browser's coordinates:
three.js (x, y, z) = Blender (x, z, -y). Usage: python web_layout.py out.json"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import farm_layout as F


def T(x, y, z=0.0): return [round(x, 4), round(z, 4), round(-y, 4)]


L = F.NEW
x0, x1, y0, y1 = L['pen']['box']
P = L['pen']
pts = F.path_points(L['gate'][1] + 0.05, y0)
out = {
    'pen': {'min': [round(x0 - 0.05, 4), 0, round(-y1 - 0.05, 4)], 'max': [round(x1 + 0.05, 4), 0, round(-y0 + 0.05, 4)]},
    'yard': {'min': [round(x0 + 0.2, 4), 0, 0.6], 'max': [round(x1 - 0.2, 4), 0, round(-(y0 + 0.15), 4)]},
    'obstacles': [T(*P['hay']) + [0.38], T(*P['feeder']) + [0.22], T(*P['dish']) + [0.22], T(-0.31, -0.75) + [0.18],
                  T(-0.31, -1.0) + [0.16], T(*P['sack']) + [0.2], T(*L['nest']) + [0.16]],
    'nest': T(*L['nest']), 'feeder': T(*P['feeder']),
    'gate': T(L['gate'][1] - 0.1, y0),
    'trees': [{'model': t['model'], 'pos': T(*t['pos']), 'scale': t['scale'], 'yaw': t['yaw']} for t in L['trees']],
    'apples': [T(a[0], a[1], a[2]) for a in L['apples']],
    'hens': [{'model': h['model'], 'pos': T(*h['pos']), 'yaw': h['yaw'], 'glutton': bool(h.get('glutton'))} for h in L['hens']],
    'path': [T(p[0], p[1]) for p in pts][::2],
    'camera': {'target': T(*L['target']), 'pitch': 42.0, 'yaw': 45.0, 'size': L['ortho']},
    'sun': {'dir': [0.55, -0.72, -0.62], 'color': '#fff1dc'},
}
json.dump(out, open(sys.argv[1] if len(sys.argv) > 1 else 'layout.json', 'w'), indent=1)
print('layout', {k: v for k, v in out.items() if k not in ('path', 'apples')})
