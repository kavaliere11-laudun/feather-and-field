"""Wider fields (16 Nov 2026, Audrey: "I think there is not enough room between the paths as they were created
initially"; shown a map, tools/lanesim.py: "Carry on"). python3 widen.py, then python3 fields.py

Four short side lanes and their links to the ring round the pond are taken out of models/village.json 'paths' (two by
the farmhouse, two past the pond) and kept under 'pathsGone' (fields.py still shares the fields out with them, so every
field is the same piece of land as before; their ground is then given to the fields beside them). Run once: a file that
has 'pathsGone' already is left alone. village.json made again by stylized/village_layout.py would lose it (and the East
Meadow: meadow.py first, then this, then fields.py).
"""
import json
P = 'models/village.json'
V = json.load(open(P))
if 'pathsGone' in V: print('already done:', len(V['pathsGone']), 'lanes gone'); raise SystemExit
GONE = [1, 11, 2, 12, 7, 19, 8, 20]
assert all(len(V['paths'][i]) > 3 for i in GONE)
V['pathsGone'] = [V['paths'][i] for i in GONE]
V['paths'] = [p for i, p in enumerate(V['paths']) if i not in GONE]
json.dump(V, open(P, 'w'), separators=(',', ':'))
print('lanes gone', len(V['pathsGone']), 'left', len([p for p in V['paths'] if len(p) > 3]))
