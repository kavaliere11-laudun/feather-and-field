# Stylized "cosy farm" look (exploration, October 2026)

Audrey's reference: a bright, chunky, cosy 3D look (hand-made planks, soft light, saturated colours).
These Blender scripts build a Red Barn coop with its pen, a Rhode Island Red hen (and rooster) and an apple tree in that style,
and render close-ups plus a farm scene through the game's own camera (orthographic, 42 degrees down, 45 degrees round).

- `common.py`: materials (per-object colour variation, wood grain, feather scallops), bevelled parts, metaballs, light, camera, render.
- `hen.py`, `coop.py`, `tree.py`, `grass.py`: the assets; each runs on its own for a close-up (`RES=1200 python hen.py 96`).
- `scene.py`: the farm scene at the game camera. `run_final.sh` renders all four (resumable).
- `out/`: the renders, including `compare_before_after.jpg` against today's game art.

Rendered with Cycles (CPU) through the `bl` Blender-as-a-module venv (see DEVELOPING.md). Next step under discussion: a Unity 6 version of the game, where these models would be exported (FBX/glTF) and rendered in real time.
