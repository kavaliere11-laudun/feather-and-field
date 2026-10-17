"""Bridge positions (map pixels) for the village map, so the game can keep the stream shimmer off them."""
import sys, json, math
src = open(sys.argv[1]).read().split("print('STEP bridges'")[0]
sys.argv = ['x', '--', '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad/r/_tmpb']
g = {}; exec(src, g)
ffcam = g['ffcam']; MT = g['MAP_TARGET']
out = []
for (u, v, ang) in g['BRIDGES']:
    x, y = g['uv_to_world'](u, v)
    out.append([round(c, 1) for c in ffcam.project((x, y, 0), (*MT, 0), g['W_PX'], g['H_PX'])])
print(json.dumps(out))
