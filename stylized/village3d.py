"""The village's buildings rebuilt with the coops' detail (1 Nov 2026, the play-through; Audrey: "All, one at a time
(Recommended)" for the decorations and the farmhouse, which looked plain next to the coops: flat colours, no boards,
tiles or trims). Built from boards, stones, tiles and trims as the coops are (stylized/coops.py's helpers), drawn in
flat colours in the browser (each piece its own shade). Exported by stylized/extras/export_village3d.py and spliced into
the village's or the decorations' glb (the others kept byte for byte).
Blender axes: x across, y back (the front faces -y), z up."""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from coop import plank
from coops import C, prism_gable, finish


def tile_slope(objs, x0, x1, y_eave, z_eave, y_ridge, z_ridge, ms, row_gap=0.08, tile_w=0.118, lift=0.03, name='tile'):
    """One slope of clay tiles from the eave (y_eave, z_eave) up to the ridge (y_ridge, z_ridge), x0..x1 wide: each tile
    resting on the row below it, its lower edge standing proud (so each row's edge shows, as on a real roof), every other
    row offset by half a tile."""
    e = Vector((0, y_eave, z_eave)); r = Vector((0, y_ridge, z_ridge)); up = (r - e); L = up.length; u = up.normalized()
    nrm = Vector((0, -u.z if y_eave < y_ridge else u.z, u.y if y_eave < y_ridge else -u.y)).normalized()
    if nrm.z < 0: nrm = -nrm
    rows = max(2, int(L / row_gap)); seg = L / rows
    for rr in range(rows):
        base = e + up * (rr / rows) + nrm * lift
        n = max(2, int((x1 - x0) / tile_w)); w = (x1 - x0) / n; off = w / 2 if rr % 2 else 0
        for i in range(n + (1 if rr % 2 else 0)):
            x = x0 + off + i * w - (w / 2 if rr % 2 else 0) + w / 2
            if x < x0 + w * 0.25 or x > x1 - w * 0.25: continue
            a = base + Vector((x, 0, 0)) - u * 0.012 + nrm * 0.024; b = base + Vector((x, 0, 0)) + u * (seg + 0.035)
            objs.append(plank(name, a, b, w * 0.93, 0.02, nrm, random.choice(ms), jitter=0.4, bevel=0.0))
    return nrm


def stone_row(objs, a, b, z0, h, ms, out, depth=0.06, lens=(0.16, 0.3), name='stone'):
    """A course of stones along the wall from a to b (x, y), z0 up, h high, standing `out` proud of the wall (outwards n)."""
    a, b = Vector((a[0], a[1], 0)), Vector((b[0], b[1], 0)); d = (b - a); L = d.length; t = d.normalized(); n = Vector((t.y, -t.x, 0))
    if n.dot(Vector((a.x + b.x, a.y + b.y, 0))) < 0: n = -n
    s = 0.0
    while s < L - 0.02:
        w = min(L - s, random.uniform(*lens)); c = a + t * (s + w / 2) + n * out
        o = box(name, (w - 0.012, depth, h - 0.012), (c.x, c.y, z0 + h / 2), (0, 0, math.atan2(t.y, t.x)), m=random.choice(ms), bevel=0.012, segs=1, jitter=0.003)
        objs.append(o); s += w


def sash(objs, x, y, z, w, h, frame, glass, sill, shutter=None, flowers=None, normal=(0, -1)):
    """A white sash window on a wall facing normal (front -y, back +y, sides +-x): glass, frame, glazing bars (six panes),
    a stone sill, shutters either side and a flower box if asked."""
    nx, ny = normal
    def at(uu, vv, dd):
        if ny: return (x + uu, y + ny * dd, z + vv)
        return (x + nx * dd, y + uu, z + vv)
    nv = (nx, ny, 0)
    size = (w, 0.02, h) if ny else (0.02, w, h)
    objs.append(box('glass', size, at(0, 0, 0.0), m=glass, bevel=0.0))
    t = 0.045
    for (u0, v0, u1, v1) in [(-w / 2 - t / 2, -h / 2, w / 2 + t / 2, -h / 2), (-w / 2 - t / 2, h / 2, w / 2 + t / 2, h / 2), (-w / 2, -h / 2, -w / 2, h / 2), (w / 2, -h / 2, w / 2, h / 2)]:
        objs.append(plank('wframe', at(u0, v0, 0.02), at(u1, v1, 0.02), t, 0.03, nv, frame, jitter=0.1, bevel=0.004))
    objs.append(plank('wmeet', at(-w / 2, 0.02, 0.026), at(w / 2, 0.02, 0.026), 0.03, 0.02, nv, frame, jitter=0.1, bevel=0.003))      # the sashes' meeting rail
    for k in (-1, 1):
        objs.append(plank('wbar', at(k * w / 6, -h / 2, 0.024), at(k * w / 6, h / 2, 0.024), 0.016, 0.014, nv, frame, jitter=0.1, bevel=0.0))
    objs.append(plank('sill', at(-w / 2 - 0.05, -h / 2 - 0.035, 0.04), at(w / 2 + 0.05, -h / 2 - 0.035, 0.04), 0.05, 0.08, (0, 0, 1), sill, jitter=0.1, bevel=0.008))
    if shutter:
        for sd in (-1, 1):
            u0 = sd * (w / 2 + 0.03 + w * 0.27)
            objs.append(box('shutter', (w * 0.5, 0.025, h + 0.02) if ny else (0.025, w * 0.5, h + 0.02), at(u0, 0, 0.012), m=shutter, bevel=0.006, segs=1))
            for kk in range(7):                       # its louvres
                vv = -h / 2 + 0.06 + kk * (h - 0.1) / 6
                objs.append(plank('louvre', at(u0 - w * 0.2, vv, 0.03), at(u0 + w * 0.2, vv, 0.03), 0.02, 0.012, nv, shutter, jitter=0.4, bevel=0.0))
    if flowers:
        bw = w + 0.08
        objs.append(box('flowerbox', (bw, 0.11, 0.09) if ny else (0.11, bw, 0.09), at(0, -h / 2 - 0.1, 0.07), m=flowers[0], bevel=0.008, segs=1))
        for k in range(9):
            uu = -bw / 2 + 0.035 + k * (bw - 0.07) / 8
            objs.append(sphere('leafp', 0.04, at(uu, -h / 2 - 0.04, 0.08), (1, 1, 0.8), m=C('fleaf', '#4f8a3a', rough=0.8), ico=1, disp=0.25, seed=k))
            objs.append(sphere('flower', 0.026, at(uu + 0.012, -h / 2 - 0.01, 0.1 + 0.01 * (k % 2)), m=flowers[1 + k % (len(flowers) - 1)], ico=1))


def farmhouse(seed=21, name='farmhouse'):
    """The farmhouse: a cream-rendered cottage on a stone plinth, stone quoins at its corners, a clay-tiled roof with a
    ridge and white bargeboards, a brick chimney with two pots, white sash windows with green shutters and flower boxes,
    a green plank door under a little tiled porch, a lantern by it, a climbing rose, guttering, a water butt, and the
    log pile under its lean-to on the left. (Its footprint and height as before: the village's layout, the farmer's door
    and the Breed Book's tap on it unchanged.)"""
    random.seed(seed); objs = []
    X, Y, EAVE, RIDGE, OVER, GOVER = 1.15, 0.8, 1.2, 1.98, 0.2, 0.16
    render = C('render', '#efe5cf', rough=0.9, var=0.03)
    stones = [C('fs%d' % i, h, rough=0.88, var=0.08) for i, h in enumerate(('#a59b88', '#928a7b', '#b3a891', '#877f72', '#9c8f7a'))]
    quoin = [C('fq%d' % i, h, rough=0.85, var=0.05) for i, h in enumerate(('#cfc5af', '#c2b8a1', '#d8cfba'))]
    tiles = [C('ct%d' % i, h, rough=0.75, var=0.05, hue_var=0.006) for i, h in enumerate(('#a95b42', '#a0533b', '#ae6146'))]      # (the village's colours are made a little richer in the browser: these a touch quieter)
    ridge_m = C('ctridge', '#8e4430', rough=0.7)
    white = C('fwhite', '#f3efe6', rough=0.55, var=0.02)
    green = C('fgreen', '#2f5d43', rough=0.55, var=0.05, grain=0.15, grain_scale=(1.5, 26, 26))
    glass = C('glass', '#2f4b63', rough=0.08, spec=0.9, coat=1.0)
    sill = C('fsill', '#bdb3a0', rough=0.85, var=0.04)
    bricks = [C('fb%d' % i, h, rough=0.85, var=0.08) for i, h in enumerate(('#9a4f3a', '#8a4433', '#a65a40', '#7f3f30'))]
    terra = C('fpot', '#b4603b', rough=0.8)
    iron = C('firon', '#2d2f33', rough=0.5)
    wood = C('fwood', '#8a5d3b', rough=0.75, var=0.12, grain=0.35, grain_scale=(1.5, 26, 26))
    logs = [C('flog%d' % i, h, rough=0.85, var=0.1) for i, h in enumerate(('#8a6342', '#7a5537', '#94704d'))]
    logend = C('flogend', '#d9b98a', rough=0.85)
    brass = C('fbrass', '#c99a3c', rough=0.35)
    flowers = [C('fbox', '#6a4a30', rough=0.8, var=0.06), C('ffl1', '#c9283a', rough=0.6), C('ffl2', '#e48aa6', rough=0.6), C('ffl3', '#f4f0e6', rough=0.6)]
    # ---- walls: the render core, the plinth's stones, stone quoins up the corners
    objs.append(box('walls', (2 * X, 2 * Y, EAVE), (0, 0, EAVE / 2), m=render, bevel=0.01, segs=1))
    for sx in (-1, 1): objs.append(prism_gable(sx * X, EAVE - 0.005, RIDGE - 0.05, Y, 0.04, render))
    corners = [(-X, -Y), (X, -Y), (X, Y), (-X, Y)]
    for k in range(4):
        a, b = corners[k], corners[(k + 1) % 4]
        for z0, h in ((0.0, 0.11), (0.11, 0.1)):
            stone_row(objs, a, b, z0, h, stones, 0.025)
    for (cx, cy) in corners:
        for i in range(int((EAVE - 0.22) / 0.13)):
            z = 0.22 + i * 0.13; long_x = i % 2 == 0
            sx, sy = (1 if cx > 0 else -1), (1 if cy > 0 else -1)
            objs.append(box('quoin', (0.22 if long_x else 0.13, 0.13 if long_x else 0.22, 0.115), (cx - sx * (0.11 if long_x else 0.065) + sx * 0.012, cy - sy * (0.065 if long_x else 0.11) + sy * 0.012, z + 0.06), m=random.choice(quoin), bevel=0.01, segs=1, jitter=0.002))
    # ---- the roof: tiles both slopes, the ridge, white bargeboards and fascias, guttering and downpipes
    for sy in (-1, 1):
        tile_slope(objs, -X - GOVER, X + GOVER, sy * (Y + OVER), EAVE - OVER * 0.85, 0.0, RIDGE, tiles)
        objs.append(plank('fascia', (-X - GOVER, sy * (Y + OVER - 0.01), EAVE - OVER * 0.85 - 0.02), (X + GOVER, sy * (Y + OVER - 0.01), EAVE - OVER * 0.85 - 0.02), 0.07, 0.03, (0, sy, 0), white, jitter=0.1))
        objs.append(cyl('gutter', 0.035, 2 * X + 2 * GOVER, (0, sy * (Y + OVER + 0.02), EAVE - OVER * 0.85 - 0.05), (0, math.radians(90), 0), m=iron, verts=10, bevel=0.0))
    for sx in (-1, 1):
        for sy in (-1, 1):
            objs.append(plank('barge', (sx * (X + GOVER + 0.01), 0, RIDGE + 0.07), (sx * (X + GOVER + 0.01), sy * (Y + OVER + 0.02), EAVE - OVER * 0.85 + 0.01), 0.1, 0.035, (sx, 0, 0), white, jitter=0.1))
        GZ = EAVE - OVER * 0.85 - 0.05
        DX = sx * (X - 0.3)      # (down the front wall beside the corner's quoins, its top bent out to the gutter)
        objs.append(cyl('downpipe', 0.025, GZ - 0.04, (DX, -(Y + 0.035), (GZ - 0.04) / 2), m=iron, verts=8, bevel=0.0))
        objs.append(cyl('downpipe', 0.025, OVER, (DX, -(Y + 0.035 + OVER / 2), GZ - 0.03), (math.radians(90), 0, 0), m=iron, verts=8, bevel=0.0))
    for i in range(int((2 * X + 2 * GOVER) / 0.22)):
        x = -X - GOVER + 0.11 + i * 0.22
        objs.append(cyl('ridgetile', 0.06, 0.24, (x, 0, RIDGE + 0.05), (0, math.radians(90), 0), m=ridge_m, verts=10, bevel=0.0))
    # ---- the chimney (bricks, a stone cap, two pots) on the ridge at the right
    CX, CY = 0.72, 0.05
    zc0 = RIDGE - 0.35; CW = 0.3
    for i in range(int((RIDGE + 0.62 - zc0) / 0.075)):
        z = zc0 + i * 0.075 + 0.036; off = 0.075 if i % 2 else 0.0
        for (nx, ny) in ((0, -1), (0, 1), (-1, 0), (1, 0)):
            for k in range(-1, 3):
                u0 = -CW / 2 - 0.015 + off + k * 0.15 - 0.075; u1 = u0 + 0.145
                u0, u1 = max(u0, -CW / 2 - 0.015), min(u1, CW / 2 + 0.015)
                if u1 - u0 < 0.03: continue
                um = (u0 + u1) / 2
                if ny: loc, size = (CX + um, CY + ny * (CW / 2 + 0.008), z), (u1 - u0 - 0.008, 0.03, 0.066)
                else: loc, size = (CX + nx * (CW / 2 + 0.008), CY + um, z), (0.03, u1 - u0 - 0.008, 0.066)
                objs.append(box('brick', size, loc, m=random.choice(bricks), bevel=0.004, segs=1))
    objs.append(box('chimcore', (0.3, 0.3, RIDGE + 0.62 - zc0), (CX, CY, (RIDGE + 0.62 + zc0) / 2), m=bricks[1], bevel=0.0))
    objs.append(box('chimcap', (0.44, 0.44, 0.07), (CX, CY, RIDGE + 0.66), m=sill, bevel=0.012, segs=1))
    for dx in (-0.08, 0.08): objs.append(cyl('chimpot', 0.055, 0.16, (CX + dx, CY, RIDGE + 0.77), m=terra, verts=12, r2=0.045, bevel=0.004))
    # ---- the front: the door under its porch, two sash windows with shutters and flower boxes, a lantern
    DW, DH = 0.46, 0.92
    for i in range(5):
        u = -DW / 2 + (i + 0.5) * DW / 5
        objs.append(plank('door', (u, -Y - 0.012, 0.16), (u, -Y - 0.012, 0.16 + DH), DW / 5 * 0.96, 0.035, (0, -1, 0), green, jitter=0.2))
    for z in (0.32, 0.86): objs.append(plank('ledge', (-DW / 2, -Y - 0.035, z), (DW / 2, -Y - 0.035, z), 0.07, 0.02, (0, -1, 0), green, jitter=0.2))
    for sx in (-1, 1): objs.append(plank('dframe', (sx * (DW / 2 + 0.03), -Y - 0.03, 0.16), (sx * (DW / 2 + 0.03), -Y - 0.03, 0.16 + DH + 0.05), 0.06, 0.03, (0, -1, 0), white, jitter=0.1))
    objs.append(plank('dhead', (-DW / 2 - 0.06, -Y - 0.03, 0.16 + DH + 0.05), (DW / 2 + 0.06, -Y - 0.03, 0.16 + DH + 0.05), 0.07, 0.035, (0, -1, 0), white, jitter=0.1))
    objs.append(sphere('knob', 0.022, (DW / 2 - 0.08, -Y - 0.06, 0.62), m=brass, seg=10, rings=6))
    objs.append(box('letterbox', (0.14, 0.02, 0.035), (0, -Y - 0.05, 0.7), m=brass, bevel=0.004, segs=1))
    for k in range(2): objs.append(box('step', (0.7 - 0.12 * k, 0.32 - 0.1 * k, 0.08), (0, -Y - 0.16 + 0.05 * k, 0.04 + 0.08 * k), m=random.choice(stones), bevel=0.012, segs=1))
    PY = -Y - 0.42                                   # the porch: two white posts, brackets, a little tiled gable roof
    for sx in (-1, 1):
        objs.append(box('ppost', (0.07, 0.07, 1.2), (sx * 0.36, PY + 0.04, 0.6), m=white, bevel=0.01, segs=1))
        objs.append(plank('pbracket', (sx * 0.36, PY + 0.04, 1.02), (sx * 0.36, -Y - 0.02, 1.14), 0.05, 0.04, (sx, 0, 0), white, jitter=0.1))
        objs.append(plank('pbeam', (sx * 0.4, PY, 1.2), (sx * 0.4, -Y, 1.2), 0.07, 0.06, (sx, 0, 0), white, jitter=0.1))
    objs.append(plank('pbeamf', (-0.42, PY, 1.21), (0.42, PY, 1.21), 0.08, 0.06, (0, -1, 0), white, jitter=0.1))
    # (the porch roof's two slopes run down to its sides: tiles laid along y on each)
    for sx in (-1, 1):
        a0, a1 = PY - 0.06, -Y + 0.02
        for rr in range(5):
            xs = sx * (0.5 - rr * 0.1); zs = 1.24 + rr * 0.06
            n = 7
            for i in range(n):
                y0 = a0 + (a1 - a0) * i / n; y1 = a0 + (a1 - a0) * (i + 1) / n
                nrm = Vector((sx * 0.06, 0, 0.1)).normalized()
                objs.append(plank('ptile', (xs, (y0 + y1) / 2, zs), (xs - sx * 0.12, (y0 + y1) / 2, zs + 0.075), (a1 - a0) / n * 0.92, 0.02, nrm, random.choice(tiles), jitter=1.0, bevel=0.0))
    pg = prism_gable(0, 1.2, 1.52, 0.46, 0.03, white, name='pgable'); pg.rotation_euler = (0, 0, math.radians(90)); pg.location = (0, PY - 0.05, 0); objs.append(pg)
    objs.append(cyl('pridge', 0.035, -PY - Y + 0.1, (0, (PY - 0.06 - Y) / 2, 1.55), (math.radians(90), 0, 0), m=ridge_m, verts=8, bevel=0.0))
    # the lantern by the door (it glows at night)
    objs.append(box('lbracket', (0.03, 0.12, 0.03), (0.34, -Y - 0.06, 1.0), m=iron, bevel=0.0))
    objs.append(box('lamp', (0.09, 0.09, 0.13), (0.34, -Y - 0.13, 0.92), m=C('lamp', '#ffd98a', rough=0.4), bevel=0.01, segs=1))
    objs.append(cyl('lroof', 0.075, 0.05, (0.34, -Y - 0.13, 1.0), m=iron, verts=4, r2=0.0, bevel=0.0))
    for wx in (-0.74, 0.74):
        sash(objs, wx, -Y - 0.012, 0.66, 0.44, 0.5, white, glass, sill, shutter=green, flowers=flowers, normal=(0, -1))
    # ---- the sides and back: windows, a little window in each gable
    for sx in (-1, 1):
        sash(objs, sx * (X + 0.012), -0.2, 0.68, 0.36, 0.44, white, glass, sill, normal=(sx, 0))
        objs.append(cyl('gwin', 0.11, 0.02, (sx * (X + 0.025), 0, EAVE + 0.32), (0, math.radians(90), 0), m=glass, verts=20, bevel=0.0))
        bpy.ops.mesh.primitive_torus_add(major_radius=0.12, minor_radius=0.022, major_segments=24, minor_segments=6, location=(sx * (X + 0.035), 0, EAVE + 0.32), rotation=(0, math.radians(90), 0))
        tr = bpy.context.object; setmat(tr, white); objs.append(tr)
    for wx in (-0.6, 0.6): sash(objs, wx, Y + 0.012, 0.68, 0.4, 0.46, white, glass, sill, shutter=green, normal=(0, 1))
    # ---- a climbing rose up the front left corner and over the door's side
    leaf = [C('rleafa', '#3f7a35', rough=0.8), C('rleafb', '#5a9442', rough=0.8)]
    roses = [C('rosep', '#e47fa0', rough=0.6), C('roser', '#c9283a', rough=0.6)]
    for k in range(34):
        z = random.uniform(0.15, 1.15); x = -X + 0.04 + random.uniform(-0.03, 0.18) * (1.3 - z)
        objs.append(sphere('rleaf', random.uniform(0.04, 0.065), (x, -Y - 0.05, z), (1, 0.55, 1), m=random.choice(leaf), ico=1, disp=0.25, seed=k))
        if k % 3 == 0: objs.append(sphere('rose', 0.03, (x + 0.02, -Y - 0.09, z + 0.02), m=random.choice(roses), ico=1))
    # ---- a water butt at the back right corner, under the downpipe
    objs.append(cyl('butt', 0.2, 0.5, (X - 0.15, Y + 0.32, 0.25), m=C('buttgreen', '#3d5a40', rough=0.6, var=0.03), verts=18, bevel=0.01))
    for z in (0.08, 0.42): objs.append(cyl('hoop', 0.205, 0.03, (X - 0.15, Y + 0.32, z), m=iron, verts=18, bevel=0.0))
    GZ = EAVE - OVER * 0.85 - 0.05
    objs.append(cyl('downpipe', 0.025, GZ - 0.5, (X - 0.15, Y + 0.32, 0.5 + (GZ - 0.5) / 2), m=iron, verts=8, bevel=0.0))
    objs.append(cyl('downpipe', 0.025, 0.24, (X - 0.15, Y + 0.22, GZ - 0.02), (math.radians(90), 0, 0), m=iron, verts=8, bevel=0.0))      # (its bend back to the gutter)
    # ---- the log pile under its lean-to on the left
    for row in range(4):
        for i in range(6 - (row % 2)):
            y = -0.55 + i * 0.2 + (0.1 if row % 2 else 0); z = 0.07 + row * 0.12
            lg = cyl('log', random.uniform(0.055, 0.065), 0.42, (-X - 0.28, y, z), (0, math.radians(90), 0), m=random.choice(logs), verts=9, bevel=0.0); objs.append(lg)
            objs.append(cyl('logend', 0.05, 0.01, (-X - 0.49, y, z), (0, math.radians(90), 0), m=logend, verts=9, bevel=0.0))
    for y in (-0.7, 0.62):
        objs.append(box('lpost', (0.06, 0.06, 0.66), (-X - 0.5, y, 0.33), m=wood, bevel=0.006, segs=1))
    for k in range(6):
        y = -0.72 + k * 0.27
        objs.append(plank('lroof', (-X - 0.02, y, 0.86), (-X - 0.56, y, 0.68), 0.25, 0.025, (-0.3, 0, 1), wood, jitter=0.8))
    return finish(objs, name)


# ------------------------------------------------------------------ the windmill (the decorations' biggest: a white smock mill)
from coops import octa, ring_mesh, _face_frame, window


def windmill_dec(seed=31, name='windmill'):
    """A white smock windmill as the coops' Little Windmill, as big as a real one: an octagonal base of brick courses with
    a white band, an arched green door and a stone step; a skirt of slates up to the tower; the tower's white weatherboards
    on its eight faces with corner posts and little windows; a dark boat-shaped cap of shingles with a knob, the windshaft
    out to the sails' hub (where it was: (0, -1.32, 6.3)), the fantail at the back; sacks of flour and a millstone by the
    door. (Its footprint as before: wherever a player has put it, it still fits.)"""
    random.seed(seed); objs = []
    BASE, R_B, Z0, Z1, R0, R1, HUB, HUB_Y = 1.3, 1.36, 1.46, 6.02, 1.2, 0.72, 6.3, -1.32
    bricks = [C('wbrick%d' % i, h, rough=0.85, var=0.06) for i, h in enumerate(('#b0624a', '#a35a43', '#bd7056', '#97513e'))]
    mortar = C('wmortar', '#d6c8b0', rough=0.95)
    board = C('wboard', '#f2ede2', rough=0.7, var=0.03); post = C('wpost', '#dcd4c3', rough=0.7)
    slate = C('wslate', '#454c57', rough=0.65, var=0.1, hue_var=0.01); slated = C('wslated', '#353b45', rough=0.65)
    capm = C('wcap', '#454c57', rough=0.65, var=0.1, hue_var=0.01); capd = C('wcapd', '#353b45', rough=0.65)
    green = C('wdoor', '#2f6a4f', rough=0.55, var=0.05, grain=0.2, grain_scale=(1.5, 26, 26)); trim = C('wtrim', '#efe9dc', rough=0.6)
    glass = C('glass', '#34516b', rough=0.08, spec=0.9, coat=1.0); iron = C('wiron', '#26231f', rough=0.5)
    shaft = C('wshaft', '#5a3a26', rough=0.7, grain=0.3, grain_scale=(1.5, 26, 26))
    stone_m = [C('wst%d' % i, h, rough=0.88, var=0.06) for i, h in enumerate(('#a59b88', '#928a7b', '#b3a891'))]
    pts = octa(R_B)
    objs.append(ring_mesh('core', octa(R_B - 0.03), 0.0, octa(R_B - 0.03), BASE, mortar, cap_a=True, cap_b=True))
    DOOR_W, DOOR_H = 0.62, 1.05
    for i in range(8):                               # the brick courses, the front's round the door
        a, b = pts[i], pts[(i + 1) % 8]; d, L, n = _face_frame(a, b); front = n.y < -0.9
        z = 0.0; row = 0
        while z < BASE - 0.02:
            h = min(0.1, BASE - z); u = -0.06 if row % 2 else 0.0
            while u < L:
                w = random.uniform(0.2, 0.3); u1 = min(L, u + w); u0 = max(0.0, u)
                if u1 - u0 > 0.06:
                    um = (u0 + u1) / 2; p = Vector((a[0], a[1], 0)) + d * um
                    if not (front and abs(p.x) < DOOR_W / 2 + 0.06 and z + h / 2 < DOOR_H + 0.08):
                        objs.append(box('brick', (u1 - u0 - 0.014, 0.04, h - 0.014), (p.x + n.x * 0.014, p.y + n.y * 0.014, z + h / 2), (0, 0, math.atan2(d.y, d.x)), m=random.choice(bricks), bevel=0.008, segs=1, jitter=0.002))
                u = u1
            z += h; row += 1
        objs.append(plank('wband', (a[0] - d.x * 0.03 + n.x * 0.05, a[1] - d.y * 0.03 + n.y * 0.05, BASE - 0.04), (b[0] + d.x * 0.03 + n.x * 0.05, b[1] + d.y * 0.03 + n.y * 0.05, BASE - 0.04), 0.09, 0.04, n, trim, jitter=0.1))
    fy = -R_B * math.cos(math.radians(22.5))
    # the door: green planks under a round head, a white frame, a brass ring, a stone step
    for i in range(5):
        u = -DOOR_W / 2 + (i + 0.5) * DOOR_W / 5
        top = DOOR_H - DOOR_W / 2 + math.sqrt(max(0.0, (DOOR_W / 2) ** 2 - u ** 2)) - 0.01
        objs.append(plank('door', (u, fy - 0.02, 0.02), (u, fy - 0.02, top), DOOR_W / 5 * 0.95, 0.04, (0, -1, 0), green, jitter=0.3))
    for sx in (-1, 1): objs.append(plank('dframe', (sx * (DOOR_W / 2 + 0.04), fy - 0.04, 0.0), (sx * (DOOR_W / 2 + 0.04), fy - 0.04, DOOR_H - DOOR_W / 2), 0.07, 0.04, (0, -1, 0), trim, jitter=0.1))
    for k in range(12):
        a0, a1 = math.pi * k / 12, math.pi * (k + 1) / 12; r = DOOR_W / 2 + 0.04
        objs.append(plank('darch', (math.cos(a0) * r, fy - 0.04, DOOR_H - DOOR_W / 2 + math.sin(a0) * r), (math.cos(a1) * r, fy - 0.04, DOOR_H - DOOR_W / 2 + math.sin(a1) * r), 0.07, 0.04, (0, -1, 0), trim, jitter=0.1, bevel=0.004))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.045, minor_radius=0.01, major_segments=16, minor_segments=6, location=(DOOR_W / 2 - 0.1, fy - 0.07, 0.55), rotation=(math.radians(90), 0, 0))
    tr = bpy.context.object; setmat(tr, C('wbrass', '#c99a3c', rough=0.35)); objs.append(tr)
    objs.append(box('step', (DOOR_W + 0.3, 0.22, 0.1), (0, fy - 0.1, 0.05), m=random.choice(stone_m), bevel=0.015, segs=1))
    # the skirt of slates from the brick up to the tower
    outer = octa(R_B + 0.1); inner = octa(R0 + 0.04)
    objs.append(ring_mesh('skirt', outer, BASE - 0.02, inner, Z0 + 0.02, slated))
    for i in range(8):
        for t in (0.06, 0.24, 0.42, 0.6, 0.78, 0.94):
            a = Vector((*outer[i], BASE - 0.02)).lerp(Vector((*inner[i], Z0 + 0.02)), t)
            b = Vector((*outer[(i + 1) % 8], BASE - 0.02)).lerp(Vector((*inner[(i + 1) % 8], Z0 + 0.02)), t)
            ia = Vector((*inner[i], Z0)); oa = Vector((*outer[i], BASE))
            up = (ia - oa).normalized(); along = (b - a).normalized(); nrm = along.cross(up)
            if nrm.z < 0: nrm = -nrm
            objs.append(plank('sh', a + nrm * 0.015 - along * 0.02, b + nrm * 0.015 + along * 0.02, 0.07, 0.02, nrm, slate, jitter=0.6, bevel=0.0))
    # the tower: weatherboards on its eight faces, a post at each corner, windows
    objs.append(ring_mesh('tower', octa(R0 - 0.03), Z0 - 0.06, octa(R1 - 0.03), Z1, board, cap_b=True))
    rad = lambda z: R0 + (R1 - R0) * (z - Z0) / (Z1 - Z0)
    tilt = math.atan2((R0 - R1) * math.cos(math.radians(22.5)), Z1 - Z0)
    z = Z0; k = 0
    while z < Z1 - 0.01:                             # (each board a band right round, its lower edge standing out: clapboards)
        h = min(0.13, Z1 - z)
        objs.append(ring_mesh('mboard', octa(rad(z) + 0.03), z, octa(rad(z + h) + 0.004), z + h, board if k % 2 else C('wboard2', '#ece6da', rough=0.7), cap_a=True))
        z += h; k += 1
    for (x, y) in octa(1.0):
        objs.append(plank('mpost', (x * (R0 + 0.02), y * (R0 + 0.02), Z0 - 0.04), (x * (R1 + 0.02), y * (R1 + 0.02), Z1), 0.1, 0.06, (x, y, 0.15), post, jitter=0.1))
    for zw, ww, hh in ((2.75, 0.3, 0.4), (4.35, 0.26, 0.34)):
        window(objs, 0.0, -rad(zw) * math.cos(math.radians(22.5)) - 0.05, zw, ww, hh, trim, glass)
    for side in (1, -1):
        zw = 3.5; window(objs, side * (rad(zw) * math.cos(math.radians(22.5)) + 0.05), 0.0, zw, 0.24, 0.32, trim, glass, normal=(side, 0, 0))
    # the cap: a boat-shaped dome of shingles on its curb, a knob, the windshaft out to the hub, the fantail at the back
    objs.append(cyl('curb', R1 + 0.1, 0.1, (0, 0, Z1 + 0.04), m=shaft, verts=24, bevel=0.01))
    me = bpy.data.meshes.new('cap'); bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=14, radius=1.0)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=True)
    bm.to_mesh(me); bm.free()
    capo = link(bpy.data.objects.new('cap', me)); setmat(capo, capm); capo.location = (0, 0.06, Z1 + 0.08); capo.scale = (R1 + 0.12, R1 + 0.3, 0.78)
    for p_ in capo.data.polygons: p_.use_smooth = True
    objs.append(capo)
    for t in (0.15, 0.32, 0.49, 0.66, 0.82):
        bpy.ops.mesh.primitive_torus_add(major_radius=1.0, minor_radius=0.05, major_segments=28, minor_segments=4, location=(0, 0.06, Z1 + 0.08 + 0.78 * t))
        tr = bpy.context.object; tr.scale = ((R1 + 0.13) * math.sqrt(1 - t * t), (R1 + 0.31) * math.sqrt(1 - t * t), 0.6); setmat(tr, capd)
        for p_ in tr.data.polygons: p_.use_smooth = True
        objs.append(tr)
    objs.append(sphere('capknob', 0.11, (0, 0.06, Z1 + 0.9), m=C('wknob', '#c99a3c', rough=0.35), seg=14, rings=9))
    objs.append(cyl('windshaft', 0.13, 0.75, (0, HUB_Y + 0.33, HUB), (math.radians(90), 0, 0), m=shaft, verts=14, bevel=0.01))
    objs.append(plank('fanpost', (0, R1 + 0.2, Z1 + 0.15), (0, R1 + 0.75, Z1 + 0.75), 0.07, 0.07, (1, 0, 0), shaft, jitter=0.1))
    objs.append(plank('fanpost', (0, R1 + 0.25, Z1 - 0.05), (0, R1 + 0.75, Z1 + 0.75), 0.06, 0.06, (1, 0, 0), shaft, jitter=0.1))
    for i in range(8):
        aa = i / 8 * math.tau
        c = Vector((0, R1 + 0.8, Z1 + 0.75)); dvec = Vector((math.cos(aa), 0, math.sin(aa)))
        objs.append(plank('fan', c + dvec * 0.06, c + dvec * 0.42, 0.11, 0.015, (0, 1, 0), trim, jitter=4.0, bevel=0.0))
    objs.append(cyl('fanhub', 0.06, 0.08, (0, R1 + 0.8, Z1 + 0.75), (math.radians(90), 0, 0), m=shaft, verts=10, bevel=0.0))
    # by the door: sacks of flour and a millstone leaning on the brick
    sack = C('wsack', '#e9dfc9', rough=0.95, var=0.04)
    for k, (x, y) in enumerate(((0.78, -0.9), (0.95, -0.72), (0.86, -0.78))):
        zz = 0.16 if k < 2 else 0.4
        objs.append(sphere('sack', 0.16, (x, y, zz), (0.9, 0.8, 1.15), m=sack, ico=2, disp=0.12, seed=k))
        objs.append(cyl('sacktie', 0.05, 0.05, (x, y, zz + 0.19), m=sack, verts=8, r2=0.02, bevel=0.0))
    objs.append(cyl('millstone', 0.38, 0.14, (-0.92, -0.86, 0.4), (math.radians(72), 0, math.radians(-38)), m=C('wmill', '#a39d93', rough=0.9, var=0.05), verts=24, bevel=0.015))
    objs.append(cyl('millhole', 0.08, 0.15, (-0.92, -0.86, 0.4), (math.radians(72), 0, math.radians(-38)), m=C('wmillh', '#4d4740', rough=0.9), verts=12, bevel=0.0))
    return finish(objs, name)


def windmill_sails(name='sails', R=3.0, width=0.66):
    """Its four sails round the hub, at the origin facing -y (they turn about y): a stock for each, a lattice of laths and
    bars on its trailing side, canvas spread over three of them (the fourth's furled along its laths, as a miller does)."""
    random.seed(17); objs = []
    stock = C('sailstock', '#6b4029', rough=0.7, grain=0.3, grain_scale=(1.5, 26, 26)); lat = C('saillat', '#f2ede2', rough=0.7, var=0.03)
    cloth = C('sailcloth', '#ece0c4', rough=0.95, var=0.03)
    objs.append(cyl('hub', 0.22, 0.26, (0, 0.0, 0), (math.radians(90), 0, 0), m=stock, verts=16, bevel=0.02))
    objs.append(sphere('hubcap', 0.15, (0, -0.14, 0), (1, 0.6, 1), m=stock, seg=14, rings=8))
    for i in range(4):
        a = math.radians(i * 90 + 15)
        d = Vector((math.cos(a), 0, math.sin(a))); p = Vector((-math.sin(a), 0, math.cos(a)))
        objs.append(plank('stock', d * 0.08 + Vector((0, -0.08, 0)), d * (R + 0.08) + Vector((0, -0.08, 0)), 0.15, 0.12, (0, -1, 0), stock, jitter=0.2))
        r0, r1, w = 0.55, R, width
        for off in (0.07, w):
            objs.append(plank('lath', d * r0 + p * off + Vector((0, -0.15, 0)), d * r1 + p * off + Vector((0, -0.15, 0)), 0.06, 0.05, (0, -1, 0), lat, jitter=0.1, bevel=0.006))
        r = r0
        while r <= r1 + 1e-6:
            objs.append(plank('bar', d * r + Vector((0, -0.16, 0)), d * r + p * (w + 0.03) + Vector((0, -0.16, 0)), 0.045, 0.04, (0, -1, 0), lat, jitter=0.2, bevel=0.004))
            r += (r1 - r0) / 12
        if i != 3:
            c = d * ((r0 + r1) / 2) + p * ((0.07 + w) / 2) + Vector((0, -0.1, 0))
            objs.append(box('cloth', (r1 - r0 - 0.04, 0.015, w - 0.08), (c.x, c.y, c.z), (0, -a, 0), m=cloth, bevel=0.0))
        else:
            c = d * ((r0 + r1) / 2) + p * 0.1 + Vector((0, -0.12, 0))
            objs.append(cyl('furled', 0.06, r1 - r0 - 0.1, (c.x, c.y, c.z), (0, math.pi / 2 - a, 0), m=cloth, verts=8, bevel=0.0))
    return finish(objs, name)


# ------------------------------------------------------------------ the bandstand
def bandstand_dec(seed=41, name='bandstand'):
    """A Victorian bandstand: an octagonal base of white lattice panels between posts under a wooden coping, a boarded
    deck, white steps up the front with iron handrails, eight green iron columns with capitals and curly brackets, green
    railings with balusters (open at the steps), a cream beam with a scalloped valance, a red shingled roof on eight
    facets with cream ribs, a gold finial; a lantern hanging inside, two music stands, pots of red flowers by the steps.
    (Its footprint as before.)"""
    random.seed(seed); objs = []
    R, DECK, COLH, ROOF_Z, ROOF_TOP = 1.32, 0.56, 2.62, 2.78, 3.75
    white = C('bwhite', '#f2eee4', rough=0.6, var=0.02); green = C('bgreen', '#2e5a40', rough=0.5, var=0.03)
    dark = C('bdark', '#26372c', rough=0.8); wood = C('bwood', '#9a6a43', rough=0.7, var=0.12, grain=0.35, grain_scale=(1.5, 26, 26))
    cream = C('bcream', '#f3e7c9', rough=0.6); red = [C('broof%d' % i, h, rough=0.65, var=0.06) for i, h in enumerate(('#b2392f', '#a8332a', '#ba4136'))]
    gold = C('bgold', '#d4a640', rough=0.35); stone = C('bstep', '#e9e4d8', rough=0.8, var=0.03)
    P = octa(R + 0.08)
    objs.append(ring_mesh('base', octa(R + 0.02), 0.0, octa(R + 0.02), DECK - 0.06, dark, cap_a=True, cap_b=True))
    for i in range(8):
        a, b = P[i], P[(i + 1) % 8]; d, L, n = _face_frame(a, b); front = n.y < -0.9
        A = Vector((a[0], a[1], 0)); B = Vector((b[0], b[1], 0))
        objs.append(plank('bpost', A + Vector((0, 0, 0)), A + Vector((0, 0, DECK - 0.04)), 0.09, 0.09, (n.x, n.y, 0), white, jitter=0.1))
        if not front:                                # a lattice panel: laths crossing on the slant
            for k in range(-4, 9):
                u0 = k * 0.16; p0 = A + d * u0 + n * 0.02; p1 = p0 + d * 0.42 + Vector((0, 0, 0.42))
                q0 = A + d * (u0 + 0.42) + n * 0.03; q1 = q0 - d * 0.42 + Vector((0, 0, 0.42))
                for (s, t) in ((p0, p1), (q0, q1)):
                    # clipped to the panel
                    def clip(s, t):
                        us, ut = (s - A).dot(d), (t - A).dot(d); zs, zt = s.z + 0.04, t.z + 0.04
                        lo, hi = 0.06, L - 0.06
                        if max(us, ut) < lo or min(us, ut) > hi: return None
                        fa, fb = sorted(((lo - us) / (ut - us), (hi - us) / (ut - us)))
                        f0, f1 = max(0.0, fa), min(1.0, fb)
                        if f1 - f0 < 0.15: return None
                        return s.lerp(t, f0) + Vector((0, 0, 0.04)), s.lerp(t, f1) + Vector((0, 0, 0.04))
                    c_ = clip(s, t)
                    if c_: objs.append(plank('lattice', c_[0], c_[1], 0.035, 0.015, (n.x, n.y, 0), white, jitter=0.2, bevel=0.0))
        objs.append(plank('coping', A + n * 0.06 - d * 0.04 + Vector((0, 0, DECK - 0.03)), B + n * 0.06 + d * 0.04 + Vector((0, 0, DECK - 0.03)), 0.08, 0.06, (0, 0, 1), wood, jitter=0.1))
    for k in range(int(2 * R / 0.14)):               # the deck's boards
        x = -R + 0.07 + k * 0.14; hw = math.sqrt(max(0.0, R * R - x * x)) * 0.98
        objs.append(plank('deck', (x, -hw, DECK), (x, hw, DECK), 0.13, 0.03, (0, 0, 1), wood, jitter=0.1, bevel=0.0))
    fy = -(R + 0.08) * math.cos(math.radians(22.5))
    for k in range(3):                               # white steps up the front, iron handrails
        objs.append(box('step', (0.94, 0.26, DECK - 0.14 * k - 0.12), (0, fy - 0.13 - 0.24 * k, (DECK - 0.14 * k - 0.12) / 2), m=stone, bevel=0.012, segs=1))
    for sx in (-1, 1):
        objs.append(plank('hrail', (sx * 0.5, fy - 0.72, 0.62), (sx * 0.5, fy, DECK + 0.62), 0.04, 0.04, (sx, 0, 0), green, jitter=0.1))
        for t in (0.0, 0.5, 1.0):
            y = fy - 0.72 * (1 - t); z0 = DECK - 0.42 * (1 - t) + 0.02
            objs.append(cyl('hpost', 0.022, 0.62 - 0.02, (sx * 0.5, y, z0 + 0.3), m=green, verts=8, bevel=0.0))
        objs.append(cyl('pot', 0.16, 0.26, (sx * 0.72, fy - 0.68, 0.13), m=C('bpot', '#b4603b', rough=0.8), verts=14, r2=0.12, bevel=0.01))
        for kk in range(6):
            aa = kk / 6 * math.tau
            objs.append(sphere('pleaf', 0.07, (sx * 0.72 + math.cos(aa) * 0.07, fy - 0.68 + math.sin(aa) * 0.07, 0.3), (1, 1, 0.8), m=C('bleaf', '#4f8a3a', rough=0.8), ico=1, disp=0.2, seed=kk))
            objs.append(sphere('pflower', 0.04, (sx * 0.72 + math.cos(aa + 0.5) * 0.08, fy - 0.68 + math.sin(aa + 0.5) * 0.08, 0.36), m=C('bred', '#c9283a', rough=0.6), ico=1))
    # columns, capitals, brackets; railings between them (not at the front)
    CP = octa(R)
    for i in range(8):
        x, y = CP[i]
        objs.append(box('cbase', (0.14, 0.14, 0.1), (x, y, DECK + 0.05), m=green, bevel=0.01, segs=1))
        objs.append(cyl('col', 0.045, COLH - DECK, (x, y, (DECK + COLH) / 2), m=green, verts=12, bevel=0.0))
        objs.append(cyl('capital', 0.09, 0.1, (x, y, COLH - 0.03), m=green, verts=12, r2=0.05, bevel=0.0))
        ni = Vector((x, y, 0)).normalized()
        for sd in (-1, 1):                           # curly brackets to the beam either side
            t_ = Vector((-ni.y, ni.x, 0)) * sd
            for k in range(6):
                a0, a1 = math.pi / 2 * k / 6, math.pi / 2 * (k + 1) / 6; rr = 0.22
                p0 = Vector((x, y, COLH)) + t_ * (rr - rr * math.cos(a0)) + Vector((0, 0, -rr + rr * math.sin(a0)))
                p1 = Vector((x, y, COLH)) + t_ * (rr - rr * math.cos(a1)) + Vector((0, 0, -rr + rr * math.sin(a1)))
                objs.append(plank('bracket', p0, p1, 0.025, 0.02, ni, green, jitter=0.1, bevel=0.0))
        a, b = CP[i], CP[(i + 1) % 8]; d, L, n = _face_frame(a, b)
        if n.y < -0.9: continue
        A = Vector((a[0], a[1], 0)); B = Vector((b[0], b[1], 0))
        for z in (DECK + 0.12, DECK + 0.62): objs.append(plank('rail', A + Vector((0, 0, z)), B + Vector((0, 0, z)), 0.045, 0.035, (n.x, n.y, 0), green, jitter=0.1))
        for k in range(1, 9):
            p = A.lerp(B, k / 9); objs.append(cyl('baluster', 0.014, 0.5, (p.x, p.y, DECK + 0.37), m=green, verts=6, bevel=0.0))
    # the beam and its scalloped valance
    BP = octa(R + 0.05)
    for i in range(8):
        a, b = BP[i], BP[(i + 1) % 8]; d, L, n = _face_frame(a, b)
        A = Vector((a[0], a[1], COLH + 0.08)); B = Vector((b[0], b[1], COLH + 0.08))
        objs.append(plank('beam', A - d * 0.05, B + d * 0.05, 0.16, 0.08, (n.x, n.y, 0), cream, jitter=0.05))
        for k in range(7):                           # flat round tabs hanging below the beam's edge
            p = A.lerp(B, (k + 0.5) / 7) + n * 0.046 - Vector((0, 0, 0.08))
            objs.append(cyl('scallop', 0.065, 0.02, (p.x, p.y, p.z), (math.pi / 2, 0, math.atan2(d.y, d.x)), m=cream, verts=14, bevel=0.0))
    # the roof: eight facets of shingles from the eave up to the top, cream ribs along the hips, a gold finial
    EP = octa(R + 0.38); ze = COLH + 0.12
    objs.append(ring_mesh('roofcore', octa(R + 0.33), ze + 0.02, octa(0.06), ROOF_TOP - 0.02, red[1], cap_a=True))
    for i in range(8):
        a, b = EP[i], EP[(i + 1) % 8]
        A = Vector((a[0], a[1], ze)); B = Vector((b[0], b[1], ze)); T = Vector((0, 0, ROOF_TOP))
        rows = 9
        for r in range(rows):
            t0 = r / rows; t1 = (r + 1.25) / rows
            pa = A.lerp(T, t0); pb = B.lerp(T, t0)
            nrm = (B - A).cross(T - A).normalized()
            if nrm.z < 0: nrm = -nrm
            n_sh = max(2, int((pb - pa).length / 0.16))
            for k in range(n_sh):
                q0 = pa.lerp(pb, (k + 0.06 + (0.5 if r % 2 else 0) * 0) / n_sh); q1 = pa.lerp(pb, (k + 0.94) / n_sh)
                mid = (q0 + q1) / 2; up = (T - mid).normalized(); ln = ((T - A).length / rows) * 1.3
                objs.append(plank('rsh', mid + nrm * 0.03 + nrm * 0.004 * (r % 2), mid + up * ln + nrm * 0.02, (q1 - q0).length, 0.02, nrm, random.choice(red), jitter=0.3, bevel=0.0))
        objs.append(plank('rib', A + Vector((0, 0, 0.06)), T + Vector((0, 0, 0.03)), 0.06, 0.05, (a[0], a[1], 0.8), cream, jitter=0.05))
    objs.append(cyl('finbase', 0.1, 0.12, (0, 0, ROOF_TOP + 0.04), m=cream, verts=12, r2=0.07, bevel=0.0))
    objs.append(sphere('fin', 0.11, (0, 0, ROOF_TOP + 0.2), m=gold, seg=14, rings=9))
    objs.append(cyl('spike', 0.04, 0.42, (0, 0, ROOF_TOP + 0.48), m=gold, verts=10, r2=0.0, bevel=0.0))
    # inside: a lantern hanging from the roof, two music stands
    objs.append(cyl('chain', 0.008, 0.5, (0, 0, COLH - 0.05), m=dark, verts=6, bevel=0.0))
    objs.append(box('lamp', (0.14, 0.14, 0.18), (0, 0, COLH - 0.38), m=C('lamp', '#ffd98a', rough=0.4), bevel=0.01, segs=1))
    objs.append(cyl('lcap', 0.12, 0.06, (0, 0, COLH - 0.27), m=dark, verts=4, r2=0.02, bevel=0.0))
    for sx in (-0.35, 0.35):
        objs.append(cyl('stand', 0.012, 0.8, (sx, 0.25, DECK + 0.4), m=dark, verts=6, bevel=0.0))
        objs.append(box('desk', (0.32, 0.02, 0.22), (sx, 0.24, DECK + 0.86), (math.radians(-20), 0, 0), m=dark, bevel=0.0))
        objs.append(box('music', (0.26, 0.01, 0.18), (sx, 0.225, DECK + 0.87), (math.radians(-20), 0, 0), m=C('bpaper', '#f6f1e2', rough=0.9), bevel=0.0))
        for tr in range(3): objs.append(cyl('leg', 0.008, 0.2, (sx + 0.07 * math.cos(tr * 2.1), 0.25 + 0.07 * math.sin(tr * 2.1), DECK + 0.08), m=dark, verts=5, bevel=0.0))
    return finish(objs, name)


# ------------------------------------------------------------------ the greenhouse
def greenhouse_dec(seed=51, name='greenhouse'):
    """A Victorian greenhouse: a dwarf wall of red bricks in courses under a stone coping, white glazing bars on walls and
    roof, a glass door in the middle of the front (wood below, panes above, a brass knob, a stone step), glass gables with
    white barge boards, an iron cresting along the ridge with a finial at each end, one roof light propped open, a gutter
    and a downpipe; inside a brick path, a slatted staging along the back with pots of geraniums and trays of seedlings,
    tomatoes up canes at each end, ferns and a watering can. The glass ('ghglass') is see-through in the browser."""
    random.seed(seed); objs = []
    X, Y, WALL, COP, EAVE, RIDGE = 1.46, 0.88, 0.46, 0.52, 1.38, 2.02
    bricks = [C('ghbrick%d' % i, h, rough=0.85, var=0.06) for i, h in enumerate(('#a9543a', '#9c4b33', '#b45f43', '#a24f37'))]
    mortar = C('ghmortar', '#cbbda4', rough=0.9); coping = C('ghcoping', '#ddd5c4', rough=0.8, var=0.04)
    white = C('ghwhite', '#f4f1e8', rough=0.5); glass = C('ghglass', '#d8ece6', rough=0.08)
    wood = C('ghwood', '#9a6a43', rough=0.75, var=0.12, grain=0.35, grain_scale=(1.5, 26, 26)); iron = C('ghiron', '#2d3a33', rough=0.5)
    gravel = C('ghgravel', '#c4b597', rough=0.95, var=0.06); terra = C('ghterra', '#b8653d', rough=0.8, var=0.05)
    leaf = [C('ghleaf%d' % i, h, rough=0.8, var=0.06) for i, h in enumerate(('#4a8a38', '#3f7a32', '#5a9a40'))]
    DOOR = 0.3
    # the dwarf wall: a mortar core, bricks proud of its outer face in staggered courses, plain brick inside; the coping
    runs = [((-X, -Y), (-DOOR - 0.05, -Y)), ((DOOR + 0.05, -Y), (X, -Y)), ((X, -Y), (X, Y)), ((X, Y), (-X, Y)), ((-X, Y), (-X, -Y))]
    for (a, b) in runs:
        A, B = Vector((a[0], a[1], 0)), Vector((b[0], b[1], 0)); t = (B - A).normalized(); L = (B - A).length; n = Vector((t.y, -t.x, 0))
        if n.dot((A + B) / 2) < 0: n = -n
        c = (A + B) / 2; rot = (0, 0, math.atan2(t.y, t.x))
        objs.append(box('ghcore', (L + 0.14, 0.12, WALL), (c.x, c.y, WALL / 2), rot, m=mortar, bevel=0.0))
        objs.append(box('ghinner', (L + 0.1, 0.01, WALL), (c.x - n.x * 0.062, c.y - n.y * 0.062, WALL / 2), rot, m=bricks[0], bevel=0.0))
        for row in range(int(WALL / 0.066)):
            z0 = row * 0.066; s = -0.07 - (0.1 if row % 2 else 0.0)
            while s < L + 0.07:
                s0, s1 = max(s, -0.07), min(s + 0.2, L + 0.07)
                if s1 - s0 > 0.04:
                    p = A + t * ((s0 + s1) / 2) + n * 0.064
                    objs.append(box('ghbrick', (s1 - s0 - 0.012, 0.012, 0.054), (p.x, p.y, z0 + 0.033), rot, m=random.choice(bricks), bevel=0.0, jitter=0.002))
                s += 0.2
        objs.append(box('ghcop', (L + 0.18, 0.18, 0.06), (c.x, c.y, WALL + 0.03), rot, m=coping, bevel=0.01, segs=1))
    # inside: gravel and a brick path from the door to the back
    objs.append(box('ghfloor', (2 * X - 0.12, 2 * Y - 0.12, 0.03), (0, 0, 0.015), m=gravel, bevel=0.0))
    for k in range(13):                               # (laid in stretcher bond, every other row half a brick along)
        for j in range(4):
            x0, x1 = max(-0.24, -0.27 + j * 0.18 - (0.09 if k % 2 else 0)), min(0.24, -0.27 + j * 0.18 + 0.17 - (0.09 if k % 2 else 0))
            if x1 - x0 > 0.04: objs.append(box('ghpath', (x1 - x0, 0.08, 0.02), ((x0 + x1) / 2, -Y + 0.1 + k * 0.09, 0.035), (0, 0, 0), m=random.choice(bricks), bevel=0.0))
    objs.append(box('ghstep', (0.8, 0.16, 0.08), (0, -Y - 0.07, 0.04), m=coping, bevel=0.01, segs=1))
    # the glass: walls, gables, two roof slopes
    gz = (COP + EAVE) / 2
    for sx in (-1, 1):
        objs.append(box('ghglass', (2 * X - 2 * DOOR - 0.1, 0.012, EAVE - COP) if False else (X - DOOR - 0.04, 0.012, EAVE - COP), (sx * (X + DOOR + 0.04) / 2, -Y, gz), m=glass, bevel=0.0))
    objs.append(box('ghglass', (2 * X, 0.012, EAVE - COP), (0, Y, gz), m=glass, bevel=0.0))
    for sx in (-1, 1):
        objs.append(box('ghglass', (0.012, 2 * Y, EAVE - COP), (sx * X, 0, gz), m=glass, bevel=0.0))
        objs.append(prism_gable(sx * X, EAVE, RIDGE, Y, 0.012, glass, name='ghglass'))
    ang = math.atan2(RIDGE - EAVE, Y); SL = math.hypot(RIDGE - EAVE, Y)
    for sy in (-1, 1):
        objs.append(box('ghglass', (2 * X + 0.04, SL + 0.02, 0.012), (0, sy * Y / 2, (EAVE + RIDGE) / 2), (-sy * ang, 0, 0), m=glass, bevel=0.0))
    # the white frame: posts and bars, sill and wall plates, the rafters, the ridge, barge boards
    nb = 8; xs = [-X + i * 2 * X / nb for i in range(nb + 1)]
    for sy in (-1, 1):
        for x in xs:
            if sy < 0 and abs(x) < DOOR + 0.06: continue
            w = 0.06 if abs(abs(x) - X) < 1e-6 else 0.035
            objs.append(box('ghpost', (w, 0.05, EAVE - COP), (x, sy * Y, gz), m=white, bevel=0.006, segs=1))
            objs.append(plank('ghraft', (x, sy * (Y + 0.03), EAVE + 0.03), (x, 0, RIDGE + 0.025), 0.04 if w < 0.05 else 0.06, 0.04, (0, sy * math.sin(ang), math.cos(ang)), white, jitter=0.05, bevel=0.004))
        objs.append(box('ghsill', (2 * X + 0.06, 0.07, 0.04), (0, sy * Y, COP + 0.02), m=white, bevel=0.006, segs=1) if sy > 0 else None)
        objs.append(box('ghplate', (2 * X + 0.08, 0.07, 0.06), (0, sy * Y, EAVE), m=white, bevel=0.006, segs=1))
        objs.append(box('ghgutter', (2 * X + 0.12, 0.07, 0.05), (0, sy * (Y + 0.06), EAVE - 0.02), m=C('ghgutter', '#e4e1d8', rough=0.5), bevel=0.01, segs=1))
    for sx in (-1, 1):
        objs.append(box('ghsill', (X - DOOR - 0.04, 0.07, 0.04), (sx * (X + DOOR + 0.04) / 2, -Y, COP + 0.02), m=white, bevel=0.006, segs=1))
        for y in [-Y + i * 2 * Y / 4 for i in range(1, 4)]:
            objs.append(box('ghpost', (0.05, 0.035, EAVE - COP), (sx * X, y, gz), m=white, bevel=0.006, segs=1))
            objs.append(box('ghgbar', (0.035, 0.03, (RIDGE - EAVE) * (1 - abs(y) / Y)), (sx * (X + 0.012), y, EAVE + (RIDGE - EAVE) * (1 - abs(y) / Y) / 2), m=white, bevel=0.0))
        objs.append(box('ghsill', (0.07, 2 * Y + 0.06, 0.04), (sx * X, 0, COP + 0.02), m=white, bevel=0.006, segs=1))
        objs.append(box('ghplate', (0.07, 2 * Y + 0.08, 0.06), (sx * X, 0, EAVE), m=white, bevel=0.006, segs=1))
        for sy in (-1, 1):
            objs.append(plank('ghbarge', (sx * (X + 0.03), sy * (Y + 0.08), EAVE - 0.04), (sx * (X + 0.03), 0, RIDGE + 0.05), 0.08, 0.03, (sx, 0, 0), white, jitter=0.05, bevel=0.004))
        objs.append(cyl('ghfinb', 0.035, 0.12, (sx * (X + 0.03), 0, RIDGE + 0.1), m=white, verts=10, bevel=0.0))
        objs.append(sphere('ghfin', 0.05, (sx * (X + 0.03), 0, RIDGE + 0.2), m=white, seg=12, rings=8))
        objs.append(cyl('ghspike', 0.02, 0.14, (sx * (X + 0.03), 0, RIDGE + 0.3), m=white, verts=8, r2=0.0, bevel=0.0))
    objs = [o for o in objs if o is not None]
    objs.append(box('ghridge', (2 * X + 0.1, 0.07, 0.07), (0, 0, RIDGE + 0.02), m=white, bevel=0.008, segs=1))
    for k in range(int(2 * X / 0.12)):                # the cresting: little iron spears and rings along the ridge
        x = -X + 0.1 + k * 0.12
        if x > X - 0.08: break
        objs.append(cyl('ghcrest', 0.008, 0.12, (x, 0, RIDGE + 0.11), m=iron, verts=5, bevel=0.0))
        objs.append(cyl('ghcrestt', 0.022, 0.05, (x, 0, RIDGE + 0.19), m=iron, verts=4, r2=0.0, bevel=0.0))
    objs.append(box('ghcrestr', (2 * X - 0.1, 0.012, 0.012), (0, 0, RIDGE + 0.13), m=iron, bevel=0.0))
    # a roof light on the front slope, propped open on its stay
    rx0, rx1 = xs[5], xs[6]; t0 = 0.45
    top = Vector((0, -Y * (1 - 0.95), EAVE + (RIDGE - EAVE) * 0.95)); bot = Vector((0, -Y * (1 - t0), EAVE + (RIDGE - EAVE) * t0))
    lift = Vector((0, 0, 0.16)); bot2 = bot + lift + Vector((0, 0.04, 0))
    for x in (rx0 + 0.03, rx1 - 0.03):
        objs.append(plank('ghlight', top + Vector((x, 0, 0.04)), bot2 + Vector((x, 0, 0.04)), 0.035, 0.035, (0, -0.4, 1), white, jitter=0.05, bevel=0.0))
    objs.append(plank('ghlight', bot2 + Vector((rx0 + 0.03, 0, 0.04)), bot2 + Vector((rx1 - 0.03, 0, 0.04)), 0.035, 0.035, (0, -0.4, 1), white, jitter=0.05, bevel=0.0))
    mid = (top + bot2) / 2 + Vector(((rx0 + rx1) / 2, 0, 0.04)); ln = (top - bot2).length
    objs.append(plank('ghglass', mid - (top - bot2).normalized() * ln / 2, mid + (top - bot2).normalized() * ln / 2, rx1 - rx0 - 0.06, 0.01, (0, -0.4, 1), glass, jitter=0.0, bevel=0.0))
    objs.append(plank('ghstay', bot + Vector(((rx0 + rx1) / 2, 0, 0.02)), bot2 + Vector(((rx0 + rx1) / 2, 0, 0.03)), 0.012, 0.012, (0, -1, 0), iron, jitter=0.0, bevel=0.0))
    # the downpipe at the front left corner, into a shoe on a little drain
    objs.append(cyl('ghpipe', 0.025, EAVE - 0.08, (-X - 0.02, -Y - 0.08, (EAVE - 0.05) / 2 + 0.05), m=C('ghgutter', '#e4e1d8', rough=0.5), verts=10, bevel=0.0))
    objs.append(box('ghdrain', (0.14, 0.14, 0.03), (-X - 0.02, -Y - 0.08, 0.015), m=coping, bevel=0.005, segs=1))
    # the door: frame, a wooden lower panel, panes above with bars, a brass knob
    for sx in (-1, 1):
        objs.append(box('ghdoorpost', (0.06, 0.06, EAVE - 0.02), (sx * (DOOR + 0.03), -Y, (EAVE + 0.02) / 2), m=white, bevel=0.006, segs=1))
    objs.append(box('ghdoorlow', (2 * DOOR - 0.02, 0.04, 0.46), (0, -Y, 0.27), m=white, bevel=0.006, segs=1))
    for k in range(2):
        objs.append(box('ghdoorpan', (DOOR - 0.12, 0.012, 0.32), (-DOOR / 2 + k * DOOR + 0.0 * k, -Y - 0.024, 0.27), m=C('ghwhite2', '#e9e4d6', rough=0.5), bevel=0.004, segs=1))
    objs.append(box('ghglass', (2 * DOOR - 0.04, 0.012, EAVE - 0.56), (0, -Y, (EAVE + 0.5) / 2), m=glass, bevel=0.0))
    objs.append(box('ghdoorrail', (2 * DOOR, 0.05, 0.05), (0, -Y, 0.5), m=white, bevel=0.005, segs=1))
    objs.append(box('ghdoorbar', (0.03, 0.04, EAVE - 0.56), (0, -Y, (EAVE + 0.5) / 2), m=white, bevel=0.0))
    objs.append(box('ghdoorbar', (2 * DOOR, 0.04, 0.03), (0, -Y, 0.95), m=white, bevel=0.0))
    objs.append(sphere('ghknob', 0.022, (DOOR - 0.08, -Y - 0.04, 0.62), m=C('ghbrass', '#c99a3c', rough=0.3), seg=10, rings=6))
    # the staging along the back: legs, rails, slats; pots of geraniums and trays of seedlings on it
    SY, SZ, SD = Y - 0.27, 0.72, 0.36
    for x in (-X + 0.15, -0.45, 0.45, X - 0.15):
        for y in (SY - SD / 2 + 0.03, SY + SD / 2 - 0.03):
            objs.append(box('ghleg', (0.04, 0.04, SZ), (x, y, SZ / 2), m=wood, bevel=0.004, segs=1))
    for k in range(5):
        y = SY - SD / 2 + 0.036 + k * (SD - 0.072) / 4
        objs.append(plank('ghslat', (-X + 0.1, y, SZ), (X - 0.1, y, SZ), 0.06, 0.02, (0, 0, 1), wood, jitter=0.1, bevel=0.0))
    objs.append(plank('ghshelf', (-X + 0.1, SY, 0.24), (X - 0.1, SY, 0.24), SD - 0.04, 0.02, (0, 0, 1), wood, jitter=0.1, bevel=0.0))
    gcol = [C('ghgera%d' % i, h, rough=0.6) for i, h in enumerate(('#d63a3f', '#e9668c', '#c42c3a', '#f2f0ea'))]
    for k in range(9):
        x = -X + 0.28 + k * (2 * X - 0.56) / 8; y = SY + (0.06 if k % 2 else -0.06)
        if k in (3, 5):                                 # trays of seedlings
            objs.append(box('ghtray', (0.3, 0.2, 0.05), (x, SY, SZ + 0.035), m=C('ghtrayc', '#4b4038', rough=0.8), bevel=0.004, segs=1))
            for i in range(5):
                for j in range(3):
                    objs.append(sphere('ghseed', 0.022, (x - 0.12 + i * 0.06, SY - 0.06 + j * 0.06, SZ + 0.075), (1, 1, 0.7), m=leaf[2], ico=1))
            continue
        objs.append(cyl('ghpot', 0.07, 0.11, (x, y, SZ + 0.065), m=terra, verts=12, r2=0.055, bevel=0.004))
        for i in range(4):
            a = i / 4 * math.tau + k
            objs.append(sphere('ghgleaf', 0.055, (x + math.cos(a) * 0.05, y + math.sin(a) * 0.05, SZ + 0.16), (1, 1, 0.75), m=random.choice(leaf), ico=1, disp=0.2, seed=k * 4 + i))
        cc = random.choice(gcol)
        for i in range(3):
            a = i / 3 * math.tau + k * 0.7
            objs.append(sphere('ghflower', 0.034, (x + math.cos(a) * 0.035, y + math.sin(a) * 0.035, SZ + 0.23 + 0.02 * (i % 2)), m=cc, ico=1, disp=0.15, seed=i))
    for k in range(5):                                  # spare pots stacked on the shelf beneath
        x = -X + 0.3 + k * 0.55
        for j in range(3): objs.append(cyl('ghspare', 0.065, 0.1, (x, SY, 0.3 + j * 0.035), m=terra, verts=12, r2=0.05, bevel=0.0))
    # tomatoes up canes at each end, in big pots
    for sx in (-1, 1):
        for j, y in enumerate((-0.42, 0.02)):
            x = sx * (X - 0.24)
            objs.append(cyl('ghbigpot', 0.12, 0.2, (x, y, 0.1), m=terra, verts=14, r2=0.1, bevel=0.005))
            objs.append(cyl('ghcane', 0.008, 1.2, (x, y, 0.75), m=C('ghcanec', '#c9b07a', rough=0.8), verts=5, bevel=0.0))
            for i in range(7):
                z = 0.32 + i * 0.13; a = i * 2.3 + j
                objs.append(sphere('ghtleaf', 0.09 - i * 0.004, (x + math.cos(a) * 0.05, y + math.sin(a) * 0.05, z), (1, 1, 0.8), m=random.choice(leaf), ico=1, disp=0.3, seed=i + j * 7 + (sx > 0) * 20))
                if i in (1, 2, 4):
                    for q in range(2 if i != 4 else 1):
                        objs.append(sphere('ghtom', 0.035, (x + math.cos(a + 2.5 + q) * 0.09, y + math.sin(a + 2.5 + q) * 0.09, z - 0.05), m=C('ghtomato', '#d9382c', rough=0.35), seg=10, rings=7))
    # ferns either side of the path at the front, a watering can on the gravel
    for sx in (-1, 1):
        x, y = sx * 0.62, -Y + 0.3
        objs.append(cyl('ghfpot', 0.1, 0.16, (x, y, 0.08), m=terra, verts=14, r2=0.08, bevel=0.004))
        for i in range(8):
            a = i / 8 * math.tau
            objs.append(plank('ghfrond', (x, y, 0.17), (x + math.cos(a) * 0.2, y + math.sin(a) * 0.2, 0.26 + 0.04 * (i % 2)), 0.06, 0.01, (0, 0, 1), leaf[1], jitter=3.0, bevel=0.0))
    cx, cy = 0.36, 0.05
    can = C('ghcan', '#4f7f5b', rough=0.45)
    objs.append(cyl('ghcan', 0.07, 0.15, (cx, cy, 0.105), m=can, verts=14, bevel=0.004))
    objs.append(plank('ghspout', (cx - 0.05, cy, 0.08), (cx - 0.2, cy, 0.2), 0.02, 0.02, (0, -1, 0), can, jitter=0.0, bevel=0.0))
    objs.append(cyl('ghrose', 0.025, 0.02, (cx - 0.205, cy, 0.205), (0, math.radians(-50), 0), m=can, verts=10, bevel=0.0))
    for k in range(6):
        a0, a1 = math.pi * k / 6, math.pi * (k + 1) / 6
        objs.append(plank('ghhandle', (cx + 0.06 * math.cos(a0), cy, 0.18 + 0.07 * math.sin(a0)), (cx + 0.06 * math.cos(a1), cy, 0.18 + 0.07 * math.sin(a1)), 0.018, 0.012, (0, -1, 0), can, jitter=0.0, bevel=0.0))
    # pots by the gable ends outside
    for sx in (-1, 1):
        objs.append(cyl('ghopot', 0.07, 0.12, (sx * (X + 0.1), 0.35, 0.06), m=terra, verts=12, r2=0.055, bevel=0.004))
        for i in range(4):
            a = i / 4 * math.tau
            objs.append(sphere('ghoplant', 0.05, (sx * (X + 0.1) + math.cos(a) * 0.03, 0.35 + math.sin(a) * 0.03, 0.16), m=leaf[0], ico=1, disp=0.25, seed=i + 40))
        objs.append(sphere('ghoflower', 0.03, (sx * (X + 0.1), 0.35, 0.21), m=C('ghyellow', '#f2c43c', rough=0.6), ico=1))
    return finish(objs, name)


# ------------------------------------------------------------------ the golden cockerel
def statue_dec(seed=61, name='statue'):
    """The golden cockerel: a gilded cockerel (the character sheets' Rhode Island Red cockerel, head up) on a stone
    pedestal: two steps, a moulded base, sunk panels, a cornice, a bronze plaque with a raised border and lines of
    lettering in front, laurel wreaths on the sides; round it a gravel square in a stone kerb, a clipped box hedge open at
    the front, and tulips between the hedge and the steps. (Its footprint as before.)"""
    random.seed(seed); objs = []
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'character'))
    stone = [C('ststone%d' % i, h, rough=0.85, var=0.05) for i, h in enumerate(('#cbc3b2', '#c2b9a6', '#d3ccbc'))]
    pale = C('stpale', '#ddd6c6', rough=0.8, var=0.03); bronze = C('stbronze', '#8a6a34', rough=0.35, metal=0.8)
    gold = C('stgold', '#f2c14e', rough=0.22, metal=1.0); gravel = C('stgravel', '#d6cbb2', rough=0.95, var=0.06)
    hedge = C('sthedge', '#3f7a35', rough=0.85, var=0.08); hedge2 = C('sthedge2', '#4a8a3c', rough=0.85, var=0.08)
    E = 0.97
    objs.append(box('stgravel', (2 * E - 0.1, 2 * E - 0.1, 0.03), (0, 0, 0.015), m=gravel, bevel=0.0))
    for (a, b) in (((-E, -E), (E, -E)), ((E, -E), (E, E)), ((E, E), (-E, E)), ((-E, E), (-E, -E))):
        stone_row(objs, a, b, 0.0, 0.07, stone, -0.03, depth=0.08, lens=(0.26, 0.4), name='stkerb')
    # the box hedge: rounded clipped lengths with leafy bumps along the top
    HX, HW, HH = 0.8, 0.2, 0.26
    runs = [((-HX, -HX), (-0.28, -HX)), ((0.28, -HX), (HX, -HX)), ((HX, -HX), (HX, HX)), ((HX, HX), (-HX, HX)), ((-HX, HX), (-HX, -HX))]
    for (a, b) in runs:
        A, B = Vector((a[0], a[1], 0)), Vector((b[0], b[1], 0)); t = (B - A).normalized(); L = (B - A).length; c = (A + B) / 2
        objs.append(box('sthedge', (L + HW, HW, HH), (c.x, c.y, HH / 2 + 0.02), (0, 0, math.atan2(t.y, t.x)), m=hedge, bevel=0.06, segs=3))
        n_ = max(2, int(L / 0.13))
        for k in range(n_ + 1):
            p = A + t * (L * k / n_)
            for side in (-1, 1):
                q = p + Vector((t.y, -t.x, 0)) * side * 0.06
                objs.append(sphere('stleafb', 0.055, (q.x, q.y, HH + 0.0), (1, 1, 0.7), m=random.choice((hedge, hedge2)), ico=1, disp=0.3, seed=k * 2 + (side > 0)))
    # tulips in the bed between the hedge and the steps
    tul = [C('sttulip%d' % i, h, rough=0.5) for i, h in enumerate(('#d8303a', '#f2c43c', '#e9668c', '#d8303a'))]
    stem = C('ststem', '#4f8a3a', rough=0.8)
    for k in range(44):
        side = k % 4; u = (k // 4) / 10.0 * 1.2 - 0.6
        x, y = [(u, -0.62), (0.62, u), (u, 0.62), (-0.62, u)][side]
        if side == 0 and abs(x) < 0.32: continue
        x += random.uniform(-0.03, 0.03); y += random.uniform(-0.03, 0.03); h = random.uniform(0.18, 0.24)
        objs.append(cyl('ststem', 0.008, h, (x, y, h / 2), m=stem, verts=5, bevel=0.0))
        objs.append(plank('stleaf', (x, y, 0.03), (x + random.uniform(-0.06, 0.06), y + random.uniform(-0.06, 0.06), 0.13), 0.035, 0.008, (random.uniform(-1, 1), random.uniform(-1, 1), 0.3), stem, jitter=5, bevel=0.0))
        objs.append(cyl('sttulip', 0.03, 0.06, (x, y, h + 0.025), m=tul[(k // 4 + side) % 4], verts=7, r2=0.036, bevel=0.0))
    # the steps, the moulded base, the die with sunk panels, the cornice
    objs.append(box('ststep', (1.08, 1.08, 0.12), (0, 0, 0.06), m=stone[0], bevel=0.015, segs=2))
    objs.append(box('ststep', (0.9, 0.9, 0.12), (0, 0, 0.18), m=stone[1], bevel=0.015, segs=2))
    objs.append(box('stbase', (0.78, 0.78, 0.1), (0, 0, 0.29), m=pale, bevel=0.02, segs=2))
    objs.append(box('stbase2', (0.7, 0.7, 0.05), (0, 0, 0.365), m=pale, bevel=0.015, segs=2))
    objs.append(box('stdie', (0.62, 0.62, 0.56), (0, 0, 0.67), m=stone[2], bevel=0.01, segs=1))
    for (nx, ny) in ((0, -1), (1, 0), (0, 1), (-1, 0)):         # each face: a sunk panel framed by a fillet
        for (u0, v0, u1, v1) in ((-0.22, 0.45, 0.22, 0.45), (-0.22, 0.89, 0.22, 0.89), (-0.22, 0.45, -0.22, 0.89), (0.22, 0.45, 0.22, 0.89)):
            def at(u, v, d=0.315): return (u if ny else nx * d, ny * d if ny else u, v)
            objs.append(plank('stfillet', at(u0 - 0.02 * (v0 == v1), v0), at(u1 + 0.02 * (v0 == v1), v1), 0.035, 0.02, (nx, ny, 0), pale, jitter=0.0, bevel=0.0))
    objs.append(box('stcorn', (0.7, 0.7, 0.05), (0, 0, 0.975), m=pale, bevel=0.012, segs=2))
    objs.append(box('stcorn2', (0.8, 0.8, 0.07), (0, 0, 1.035), m=stone[0], bevel=0.02, segs=2))
    objs.append(box('stcorn3', (0.66, 0.66, 0.04), (0, 0, 1.09), m=pale, bevel=0.012, segs=2))
    TOP = 1.11
    # the bronze plaque on the front: a raised border and lines of lettering
    objs.append(box('stplaque', (0.34, 0.02, 0.26), (0, -0.322, 0.67), m=bronze, bevel=0.006, segs=1))
    for (u0, v0, u1, v1) in ((-0.17, 0.545, 0.17, 0.545), (-0.17, 0.795, 0.17, 0.795), (-0.165, 0.545, -0.165, 0.795), (0.165, 0.545, 0.165, 0.795)):
        objs.append(plank('stpborder', (u0, -0.334, v0), (u1, -0.334, v1), 0.014, 0.008, (0, -1, 0), gold, jitter=0.0, bevel=0.0))
    for k, w in enumerate((0.2, 0.24, 0.16, 0.12)):
        v = 0.75 - k * 0.05
        objs.append(box('stletters', (w, 0.006, 0.018 if k else 0.026), (0, -0.334, v), m=gold, bevel=0.0))
    # laurel wreaths on the sides
    for sx in (-1, 1):
        cx, cz = sx * 0.322, 0.67
        for k in range(14):
            a = math.radians(-70 + k * 20) if k < 7 else math.radians(250 - (k - 7) * 20)
            if 6 <= k <= 7: continue
            y, z = math.cos(a) * 0.1, cz + math.sin(a) * 0.1
            objs.append(sphere('stlaurel', 0.03, (cx + sx * 0.008, y, z), (0.5, 0.6, 1.4), (a + math.pi / 2 * 0, 0, 0), m=bronze, seg=8, rings=5))
        objs.append(sphere('stribbon', 0.02, (cx + sx * 0.01, 0, cz - 0.1), (0.6, 1.4, 0.8), m=bronze, seg=8, rings=5))
    # the cockerel himself, gilded, head up, on the cornice
    import hen_char as HC
    HC._M.clear()
    before = set(bpy.data.objects)
    root, hd = HC.build('rir_r', (0.02, 0.03, TOP), math.radians(-62), dict(up=0.72, lo=-0.7, eye=0.82, brow_h=0.45, beak=0.0, head=(0, -18, 0), fluff=1.04))
    root.scale = (2.45, 2.45, 2.45)
    bpy.context.view_layer.update()
    for o in [o for o in bpy.data.objects if o not in before]:
        if o.type in ('CURVE', 'META', 'SURFACE', 'FONT'):
            bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
            try: bpy.ops.object.convert(target='MESH')
            except Exception as e: print('CONVERT', o.name, e)
    tris = 0
    for o in [o for o in bpy.data.objects if o not in before]:
        if o.type != 'MESH': continue
        o.data.materials.clear(); o.data.materials.append(gold)
        tris += sum(len(p.vertices) - 2 for p in o.data.polygons)
    for o in [o for o in bpy.data.objects if o not in before and o.name.split('.')[0] in ('pupil', 'shine')]:
        bpy.data.objects.remove(o)                                                        # (a statue's eyes: smooth, no pupils)
    parts = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']      # (the cockerel joined and thinned on
    for o in parts:                                                                       # his own: the stone stays crisp)
        for md in list(o.modifiers):
            bpy.context.view_layer.objects.active = o; bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
            try: bpy.ops.object.modifier_apply(modifier=md.name)
            except Exception: o.modifiers.remove(md)
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join(); bird = bpy.context.view_layer.objects.active
    t0 = sum(len(p.vertices) - 2 for p in bird.data.polygons)
    md = bird.modifiers.new('thin', 'DECIMATE'); md.ratio = min(1.0, 11000 / t0); md.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier='thin')
    bird.name = 'stbird'
    print('COCKEREL tris', tris, t0, '->', len(bird.data.polygons))
    objs.append(root)
    return finish(objs, name)


# ------------------------------------------------------------------ the beehives
def beehives_dec(seed=71, name='beehives'):
    """Three WBC hives (where the bees fly from: decorlife.js HIVES, each slot at x -0.85, 0, 0.85, 0.3 up, 0.32 out):
    each on a paving slab, on splayed legs with braces, a floor with a sloping landing board and the entrance slot under a
    little porch, white lifts flaring at the foot with a shadow line at each joint, a gabled roof (sage, slate blue, honey)
    with a ridge, barge boards and a vent in the gable; a row of lavender in front (where the bees go: x -1.2..1.15,
    0.5..0.74 out), a bee smoker and a jar of honey on a crate at the left end. (Its footprint as before.)"""
    random.seed(seed); objs = []
    white = C('bhwhite', '#f3f0e7', rough=0.6, var=0.03); seam = C('bhseam', '#bdb6a6', rough=0.8)
    wood = C('bhwood', '#8c5f3c', rough=0.75, var=0.12, grain=0.35, grain_scale=(1.5, 26, 26)); dark = C('bhdark', '#2a2420', rough=0.9)
    slab = C('bhslab', '#bfb8a8', rough=0.9, var=0.06)
    roofs = [C('bhroof%d' % i, h, rough=0.6, var=0.03) for i, h in enumerate(('#7f9c86', '#7b93a8', '#cf9f52'))]
    for i, x in enumerate((-0.85, 0.0, 0.85)):
        objs.append(box('bhslab', (0.66, 0.62, 0.04), (x, 0.0, 0.02), (0, 0, math.radians(random.uniform(-3, 3))), m=slab, bevel=0.01, segs=1))
        for lx in (-1, 1):
            for ly in (-1, 1):
                objs.append(plank('bhleg', (x + lx * 0.22, ly * 0.21, 0.04), (x + lx * 0.17, ly * 0.17, 0.24), 0.05, 0.05, (lx, 0, 0), wood, jitter=0.2))
            objs.append(plank('bhbrace', (x + lx * 0.2, -0.19, 0.12), (x + lx * 0.2, 0.19, 0.12), 0.035, 0.025, (lx, 0, 0), wood, jitter=0.2))
        objs.append(box('bhfloor', (0.5, 0.5, 0.05), (x, 0, 0.245), m=wood, bevel=0.006, segs=1))
        objs.append(box('bhland', (0.42, 0.16, 0.02), (x, -0.31, 0.25), (math.radians(-14), 0, 0), m=white, bevel=0.004, segs=1))
        objs.append(box('bhplinth', (0.46, 0.46, 0.09), (x, 0.0, 0.315), m=white, bevel=0.006, segs=1))
        objs.append(box('bhslot', (0.24, 0.02, 0.03), (x, -0.232, 0.29), m=dark, bevel=0.0))
        objs.append(box('bhporch', (0.32, 0.1, 0.018), (x, -0.27, 0.345), (math.radians(18), 0, 0), m=roofs[i], bevel=0.004, segs=1))
        for sx in (-1, 1):
            objs.append(box('bhporchs', (0.015, 0.06, 0.06), (x + sx * 0.15, -0.255, 0.32), m=white, bevel=0.0))
        z = 0.36
        for k in range(3 if i != 1 else 4):          # the lifts, each flaring out at its foot
            objs.append(cyl('bhlift', 0.43, 0.18, (x, 0, z + 0.09), (0, 0, math.radians(45)), m=white, verts=4, r2=0.335, bevel=0.004))
            objs.append(box('bhseam', (0.6, 0.6, 0.012), (x, 0, z + 0.004), m=seam, bevel=0.0))
            for sy in (-1, 1):                       # its hand-holds
                objs.append(box('bhhold', (0.12, 0.012, 0.025), (x, sy * 0.258, z + 0.12), (math.radians(sy * -20), 0, 0), m=seam, bevel=0.0))
            z += 0.17
        # the roof: an eave piece, two slopes, barge boards, a ridge, a vent in the front gable
        objs.append(box('bheave', (0.52, 0.52, 0.05), (x, 0, z + 0.03), m=white, bevel=0.006, segs=1))
        zr = z + 0.055; RH = 0.2; ang = math.atan2(RH, 0.3); SL = math.hypot(RH, 0.3)
        for sy in (-1, 1):
            objs.append(box('bhroof', (0.62, SL + 0.04, 0.03), (x, sy * 0.15, zr + RH / 2), (-sy * ang, 0, 0), m=roofs[i], bevel=0.006, segs=1))
        for sx in (-1, 1):
            objs.append(prism_gable(x + sx * 0.26, zr, zr + RH - 0.01, 0.29, 0.02, white, name='bhgable'))
            for sy in (-1, 1):
                objs.append(plank('bhbarge', (x + sx * 0.3, sy * 0.33, zr - 0.01), (x + sx * 0.3, 0, zr + RH + 0.02), 0.05, 0.015, (sx, 0, 0), roofs[i], jitter=0.1, bevel=0.0))
        objs.append(cyl('bhridge', 0.025, 0.64, (x, 0, zr + RH + 0.02), (0, math.radians(90), 0), m=roofs[i], verts=8, bevel=0.0))
        objs.append(box('bhvent', (0.012, 0.1, 0.05), (x - 0.272, 0, zr + 0.07), m=dark, bevel=0.0))
        objs.append(box('bhvent', (0.012, 0.1, 0.05), (x + 0.272, 0, zr + 0.07), m=dark, bevel=0.0))
    # lavender in front: grey-green mounds, purple spikes
    lavleaf = [C('bhlavleaf%d' % i, h, rough=0.8, var=0.05) for i, h in enumerate(('#7f9a74', '#8aa37f'))]
    lav = [C('bhlav%d' % i, h, rough=0.6) for i, h in enumerate(('#8f6fc4', '#7d5db6', '#a183d1'))]; stem = C('bhstem', '#6f8a62', rough=0.8)
    xs = [-1.18 + k * 0.215 for k in range(12)]
    for k, x0 in enumerate(xs):
        for row in (0, 1):
            x = x0 + (0.1 if row else 0) + random.uniform(-0.03, 0.03); y = -0.55 - row * 0.17 + random.uniform(-0.03, 0.03)
            if x > 1.12: continue
            objs.append(sphere('bhlavb', 0.07, (x, y, 0.05), (1.1, 1.0, 0.7), m=C('bhlavdark', '#5f7a58', rough=0.85), ico=1, disp=0.2, seed=k * 2 + row))
            for q in range(16):                          # its narrow grey-green leaves, in a tuft
                a = q / 16 * math.tau + random.uniform(-0.2, 0.2); rr = random.uniform(0.09, 0.13); h = random.uniform(0.09, 0.15)
                objs.append(plank('bhlavl', (x + math.cos(a) * 0.02, y + math.sin(a) * 0.02, 0.01), (x + math.cos(a) * rr, y + math.sin(a) * rr, h), 0.022, 0.006, (math.cos(a), math.sin(a), 0.6), random.choice(lavleaf), jitter=4.0, bevel=0.0))
            for q in range(7):
                a = q / 7 * math.tau + k; rr = random.uniform(0.03, 0.08); h = random.uniform(0.2, 0.28)
                b = (x + math.cos(a) * rr * 1.6, y + math.sin(a) * rr * 1.6, h)
                objs.append(plank('bhlavs', (x + math.cos(a) * rr * 0.5, y + math.sin(a) * rr * 0.5, 0.1), b, 0.008, 0.008, (0, 0, 1), stem, jitter=0.0, bevel=0.0))
                objs.append(cyl('bhlavh', 0.014, 0.07, (b[0], b[1], b[2] + 0.03), m=random.choice(lav), verts=5, r2=0.006, bevel=0.0))
    # a crate at the left end with the smoker and a jar of honey on it
    cx, cy = -1.22, -0.12
    objs.append(box('bhcrate', (0.16, 0.22, 0.16), (cx, cy, 0.08), m=wood, bevel=0.006, segs=1))
    for z in (0.04, 0.12): objs.append(box('bhcslat', (0.165, 0.225, 0.02), (cx, cy, z), m=C('bhwood2', '#a2724a', rough=0.75), bevel=0.0))
    tin = C('bhtin', '#b8b9b4', rough=0.35, metal=0.8)
    objs.append(cyl('bhsmoker', 0.04, 0.12, (cx, cy + 0.05, 0.22), m=tin, verts=12, bevel=0.003))
    objs.append(cyl('bhsmtop', 0.04, 0.04, (cx, cy + 0.05, 0.3), m=tin, verts=12, r2=0.015, bevel=0.0))
    objs.append(box('bhbellows', (0.02, 0.06, 0.1), (cx + 0.05, cy + 0.05, 0.22), m=C('bhleather', '#7a4b2c', rough=0.7), bevel=0.004, segs=1))
    objs.append(cyl('bhjar', 0.033, 0.07, (cx, cy - 0.06, 0.195), m=C('bhhoney', '#e3a12a', rough=0.2), verts=12, bevel=0.003))
    objs.append(cyl('bhlid', 0.036, 0.018, (cx, cy - 0.06, 0.238), m=C('bhcloth', '#d84c4c', rough=0.7), verts=12, bevel=0.0))
    return finish(objs, name)


import bmesh


def lathe(name, prof, m, verts=24, cap_top=False, cap_bottom=False):
    """A turned shape round the z axis from its profile [(r, z), ...] bottom to top (a baluster, a bowl)."""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); rings = []
    for (r, z) in prof:
        rings.append([bm.verts.new((r * math.cos(i / verts * math.tau), r * math.sin(i / verts * math.tau), z)) for i in range(verts)])
    for a, b in zip(rings, rings[1:]):
        for i in range(verts):
            j = (i + 1) % verts
            try: bm.faces.new((a[i], a[j], b[j], b[i]))
            except ValueError: pass
    if cap_bottom: bm.faces.new(rings[0][::-1])
    if cap_top: bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = link(bpy.data.objects.new(name, me)); setmat(o, m)
    return o


def tuft(objs, x, y, n, r, h, ms, z0=0.0, width=0.02, seed=0):
    """A tuft of narrow leaves from (x, y): n blades out to r, up to h."""
    for q in range(n):
        a = q / n * math.tau + random.uniform(-0.25, 0.25); rr = r * random.uniform(0.7, 1.1); hh = h * random.uniform(0.7, 1.1)
        objs.append(plank('leafb', (x + math.cos(a) * 0.012, y + math.sin(a) * 0.012, z0 + 0.005), (x + math.cos(a) * rr, y + math.sin(a) * rr, z0 + hh), width, 0.005, (math.cos(a), math.sin(a), 0.6), random.choice(ms), jitter=4.0, bevel=0.0))


# ------------------------------------------------------------------ the cottage flower bed
def flowers_dec(seed=81, name='flowers'):
    """A round cottage flower bed (the butterflies come down on its flowers, 0.33 to 0.38 up, within 0.6 of the middle): an
    edge of rounded stones, a mound of dark soil; in the middle a little willow obelisk with pink sweet peas up it, round it
    blue delphinium and pink foxglove spikes; then daisies, tulips, orange marigolds and lupins; white alyssum and blue
    lobelia spilling over the stones at the front. (Its footprint as before.)"""
    random.seed(seed); objs = []
    stones = [C('fbstone%d' % i, h, rough=0.85, var=0.08) for i, h in enumerate(('#bdb5a3', '#a8a091', '#cbc4b4'))]
    soil = C('fbsoil', '#5a3f2c', rough=0.95, var=0.08)
    leaf = [C('fbleaf%d' % i, h, rough=0.8, var=0.06) for i, h in enumerate(('#4a8a38', '#3f7a32', '#5a9a40'))]
    stem = C('fbstem', '#4f8a3a', rough=0.8)
    for i in range(26):
        a = i / 26 * math.tau + random.uniform(-0.03, 0.03)
        objs.append(sphere('fbedge', 0.1, (math.cos(a) * 0.82, math.sin(a) * 0.8, 0.05), (1.25, 0.95, 0.7), (0, 0, a + math.pi / 2), m=random.choice(stones), ico=2, disp=0.12, seed=i))
    objs.append(lathe('fbsoil', [(0.8, 0.0), (0.79, 0.06), (0.7, 0.1), (0.4, 0.13), (0.0, 0.14)], soil, verts=28))
    def bloom(x, y, z, r, m, kind='ball'):
        if kind == 'daisy':
            for k in range(7):
                a = k / 7 * math.tau
                objs.append(plank('fbpetal', (x, y, z), (x + math.cos(a) * r, y + math.sin(a) * r, z + 0.004), r * 0.45, 0.004, (0, 0, 1), m, jitter=3.0, bevel=0.0))
            objs.append(sphere('fbeye', r * 0.35, (x, y, z + 0.006), (1, 1, 0.6), m=C('fbyellow', '#f2c43c', rough=0.6), ico=1))
        elif kind == 'tulip':
            objs.append(cyl('fbtulip', r * 0.85, r * 1.7, (x, y, z), m=m, verts=7, r2=r, bevel=0.0))
        else:
            objs.append(sphere('fbbloom', r, (x, y, z), (1, 1, 0.8), m=m, ico=1, disp=0.25, seed=int(x * 100 + y * 37) % 50))
    def plant(x, y, h, m, kind='ball', r=0.035, leaves=6):
        tuft(objs, x, y, leaves, 0.07, 0.09, leaf, z0=0.1)
        objs.append(cyl('fbstem', 0.006, h - 0.1, (x, y, 0.1 + (h - 0.1) / 2), m=stem, verts=5, bevel=0.0))
        bloom(x, y, h, r, m, kind)
    def spike(x, y, h, m, n=8, r0=0.03):
        tuft(objs, x, y, 7, 0.08, 0.1, leaf, z0=0.12)
        objs.append(cyl('fbstem', 0.007, h - 0.12, (x, y, 0.12 + (h - 0.12) / 2), m=stem, verts=5, bevel=0.0))
        for k in range(n):
            z = h - 0.24 + k * 0.03; rr = r0 * (1 - k / (n + 2))
            objs.append(sphere('fbspike', rr, (x, y, z), (1, 1, 0.8), m=m, ico=1, seed=k))
    # the obelisk with sweet peas
    wil = C('fbwillow', '#8a6440', rough=0.8)
    for k in range(4):
        a = k / 4 * math.tau + math.pi / 4
        objs.append(plank('fbob', (math.cos(a) * 0.12, math.sin(a) * 0.12, 0.12), (0, 0, 0.72), 0.018, 0.018, (math.cos(a), math.sin(a), 0), wil, jitter=0.5, bevel=0.0))
    for z in (0.3, 0.5):
        rr = 0.12 * (0.72 - z) / 0.6
        for k in range(4):
            a0, a1 = k / 4 * math.tau + math.pi / 4, (k + 1) / 4 * math.tau + math.pi / 4
            objs.append(plank('fbobr', (math.cos(a0) * rr, math.sin(a0) * rr, z), (math.cos(a1) * rr, math.sin(a1) * rr, z), 0.014, 0.014, (0, 0, 1), wil, jitter=0.5, bevel=0.0))
    objs.append(sphere('fbobtop', 0.025, (0, 0, 0.74), m=wil, ico=1))
    pea = [C('fbpea%d' % i, h, rough=0.6) for i, h in enumerate(('#e98bb5', '#c96fd1', '#f4b6cf'))]
    for k in range(22):
        z = 0.16 + k * 0.025; rr = 0.12 * (0.72 - z) / 0.6 + 0.02; a = k * 1.3
        objs.append(sphere('fbpealeaf', 0.03, (math.cos(a) * rr, math.sin(a) * rr, z), (1, 1, 0.7), m=random.choice(leaf), ico=1, disp=0.2, seed=k))
        if k % 2: objs.append(sphere('fbpeaf', 0.022, (math.cos(a + 0.6) * (rr + 0.02), math.sin(a + 0.6) * (rr + 0.02), z + 0.02), (1, 0.6, 1), m=random.choice(pea), ico=1))
    # round it: delphiniums and foxgloves
    blue = C('fbdelph', '#4f6fd6', rough=0.5); fox = C('fbfox', '#d77bb5', rough=0.5)
    for k in range(6):
        a = k / 6 * math.tau + 0.3
        spike(math.cos(a) * 0.27, math.sin(a) * 0.27, random.uniform(0.5, 0.6), blue if k % 2 else fox)
    # the middle ring: daisies, tulips, marigolds, lupins
    cols = {'daisy': C('fbdaisy', '#fbf6ee', rough=0.5), 'tulip': [C('fbtul%d' % i, h, rough=0.5) for i, h in enumerate(('#e2453c', '#f4c430', '#f08bb0'))],
            'mari': C('fbmari', '#ff8c2a', rough=0.6), 'lup': [C('fblup%d' % i, h, rough=0.5) for i, h in enumerate(('#9b6bd1', '#f2e6a0'))]}
    for k in range(22):
        a = k / 22 * math.tau + random.uniform(-0.08, 0.08); d = 0.46 + random.uniform(-0.05, 0.05); x, y = math.cos(a) * d, math.sin(a) * d
        kind = ('daisy', 'tulip', 'mari', 'daisy', 'tulip', 'lup')[k % 6]
        if kind == 'daisy': plant(x, y, random.uniform(0.3, 0.36), cols['daisy'], 'daisy', r=0.04)
        elif kind == 'tulip': plant(x, y, random.uniform(0.3, 0.36), random.choice(cols['tulip']), 'tulip', r=0.03)
        elif kind == 'mari': plant(x, y, random.uniform(0.26, 0.32), cols['mari'], 'ball', r=0.04)
        else: spike(x, y, random.uniform(0.42, 0.5), random.choice(cols['lup']), n=7, r0=0.026)
    # leafy cover between them all, so no bare soil shows: low mounds of leaves, a few pale and dark
    for k in range(46):
        a = random.uniform(0, math.tau); d = 0.12 + math.sqrt(random.random()) * 0.5
        objs.append(sphere('fbcover', random.uniform(0.06, 0.09), (math.cos(a) * d, math.sin(a) * d, 0.13 - d * 0.04), (1.2, 1.1, 0.6), (0, 0, a), m=random.choice(leaf), ico=1, disp=0.35, seed=k + 100))
    # the edge: alyssum and lobelia spilling over the stones
    aly = C('fbaly', '#f6f3ea', rough=0.7); lob = C('fblob', '#5267d8', rough=0.6)
    for k in range(18):
        a = k / 18 * math.tau + 0.1; x, y = math.cos(a) * 0.68, math.sin(a) * 0.67
        objs.append(sphere('fbmat', 0.075, (x, y, 0.1), (1.2, 1.0, 0.55), m=random.choice(leaf), ico=1, disp=0.3, seed=k))
        c = aly if k % 2 else lob
        for q in range(5):
            b = random.uniform(0, math.tau); rr = random.uniform(0.0, 0.07)
            objs.append(sphere('fbtiny', 0.022, (x + math.cos(b) * rr, y + math.sin(b) * rr, 0.14), m=c, ico=1))
    return finish(objs, name)


# ------------------------------------------------------------------ the bird bath
def birdbath_dec(seed=91, name='birdbath'):
    """A stone bird bath (the visiting birds stand on its rim: decorlife.js BATH, rim 0.705 up, 0.47 out, the water at
    0.671): a square plinth on a slab, a turned baluster, a shallow bowl with a rolled lip and moss in places, the water;
    its own blue tit on the rim (0.36, 0.3 towards the player); ivy up the pedestal, pebbles, primroses and ferns round the
    foot. (Its footprint as before.)"""
    random.seed(seed); objs = []
    stone = C('bbstone', '#c9c2b2', rough=0.85, var=0.05); stone2 = C('bbstone2', '#b8b0a0', rough=0.85, var=0.06)
    moss = C('bbmoss', '#7c9a4a', rough=0.9, var=0.1); water = C('bbwater', '#7fb6d8', rough=0.08)
    leaf = [C('bbleaf%d' % i, h, rough=0.8, var=0.06) for i, h in enumerate(('#4a8a38', '#3f7a32', '#5a9a40'))]
    objs.append(box('bbslab', (0.62, 0.62, 0.05), (0, 0, 0.025), (0, 0, math.radians(4)), m=stone2, bevel=0.01, segs=2))
    objs.append(box('bbplinth', (0.36, 0.36, 0.1), (0, 0, 0.1), m=stone, bevel=0.012, segs=2))
    objs.append(box('bbplinth2', (0.3, 0.3, 0.03), (0, 0, 0.165), m=stone, bevel=0.008, segs=2))
    objs.append(lathe('bbbaluster', [(0.11, 0.18), (0.12, 0.2), (0.09, 0.23), (0.075, 0.27), (0.1, 0.33), (0.12, 0.38), (0.105, 0.44), (0.07, 0.5),
                                      (0.06, 0.54), (0.085, 0.565), (0.085, 0.585), (0.07, 0.6)], stone, verts=20))
    R = 0.5
    objs.append(lathe('bbbowl', [(0.07, 0.585), (0.2, 0.6), (0.36, 0.64), (R - 0.03, 0.68), (R, 0.695), (R + 0.025, 0.71), (R + 0.01, 0.725), (R - 0.02, 0.722),
                                  (R - 0.035, 0.705), (R - 0.04, 0.69), (0.3, 0.66), (0.0, 0.645)], stone, verts=40))
    objs.append(cyl('bbwater', R - 0.035, 0.008, (0, 0, 0.671), m=water, verts=36, bevel=0.0))
    for k in range(6):                                 # moss in patches on the lip
        a = random.uniform(0, math.tau)
        objs.append(sphere('bbmossp', 0.04, (math.cos(a) * (R + 0.01), math.sin(a) * (R + 0.01), 0.715), (1.6, 0.8, 0.35), (0, 0, a + math.pi / 2), m=moss, ico=1, disp=0.2, seed=k))
    # ivy up the pedestal
    ivy = C('bbivy', '#2f6b34', rough=0.7)
    for k in range(16):
        a = k * 0.9; z = 0.2 + k * 0.024; r = 0.11 if z < 0.45 else 0.08
        objs.append(sphere('bbivy', 0.028, (math.cos(a) * r, math.sin(a) * r, z), (1.2, 0.5, 1.0), (0, 0, a), m=ivy, ico=1, seed=k))
    # the blue tit on the rim
    tx, ty, tz = 0.36, -0.3, 0.725; yaw = math.atan2(-ty, -tx) + 0.6   # (looking in, a little to one side)
    def T(dx, dy, dz):
        c, s = math.cos(yaw), math.sin(yaw); return (tx + dx * c - dy * s, ty + dx * s + dy * c, tz + dz)
    blu = C('bbtitblue', '#3f7fd0', rough=0.5); yel = C('bbtityel', '#f2d23c', rough=0.5); wht = C('bbtitwh', '#f6f3ea', rough=0.5)
    grn = C('bbtitgrn', '#8aa84a', rough=0.5); blk = C('bbtitblk', '#1f2328', rough=0.5)
    deg = math.degrees(yaw)
    objs.append(sphere('bbtit', 0.05, T(0.0, 0, 0.045), (1.35, 0.95, 0.95), (0, math.radians(-12), yaw), m=yel, seg=14, rings=9))
    objs.append(sphere('bbtitback', 0.048, T(-0.01, 0, 0.058), (1.3, 0.9, 0.7), (0, math.radians(-12), yaw), m=grn, seg=14, rings=9))
    for sd in (-1, 1):
        objs.append(sphere('bbtitwing', 0.035, T(-0.02, sd * 0.038, 0.05), (1.5, 0.35, 0.8), (0, math.radians(-15), yaw), m=blu, seg=12, rings=8))
    objs.append(plank('bbtittail', T(-0.05, 0, 0.05), T(-0.11, 0, 0.065), 0.03, 0.008, (0, 0, 1), blu, jitter=0.0, bevel=0.0))
    objs.append(sphere('bbtithead', 0.034, T(0.06, 0, 0.1), m=wht, seg=14, rings=9))
    objs.append(sphere('bbtitcap', 0.034, T(0.058, 0, 0.108), (1.02, 1.02, 0.7), m=blu, seg=14, rings=9))
    for sd in (-1, 1):
        objs.append(plank('bbtitstripe', T(0.085, sd * 0.024, 0.104), T(0.035, sd * 0.03, 0.096), 0.01, 0.006, (0, sd, 0), blk, jitter=0.0, bevel=0.0))
        objs.append(sphere('bbtiteye', 0.007, T(0.08, sd * 0.027, 0.106), m=blk, seg=8, rings=5))
        objs.append(cyl('bbtitleg', 0.004, 0.03, T(0.0, sd * 0.015, 0.008), m=C('bbtitleg', '#5a6470', rough=0.6), verts=5, bevel=0.0))
    objs.append(cyl('bbtitbeak', 0.009, 0.02, T(0.1, 0, 0.098), (0, math.radians(90), yaw), m=blk, verts=6, r2=0.0, bevel=0.0))
    objs.append(plank('bbtitbib', T(0.055, 0, 0.078), T(0.04, 0, 0.04), 0.014, 0.006, (1, 0, 0), blk, jitter=0.0, bevel=0.0))
    # round the foot: pebbles, primroses, ferns
    for i in range(22):
        a = random.random() * math.tau; d = random.uniform(0.36, 0.56)
        objs.append(sphere('bbpeb', 0.035, (math.cos(a) * d, math.sin(a) * d, 0.012), (1.3, 1.0, 0.5), (0, 0, a), m=random.choice((stone, stone2)), ico=1, disp=0.1, seed=i))
    prim = C('bbprim', '#f6e27a', rough=0.5); eye = C('bbprimeye', '#e2a72a', rough=0.5)
    for i in range(7):
        a = i / 7 * math.tau + 0.2; x, y = math.cos(a) * 0.55, math.sin(a) * 0.55
        if i % 3 == 2:
            for k in range(7):
                b = k / 7 * math.tau + a
                objs.append(plank('bbfrond', (x, y, 0.02), (x + math.cos(b) * 0.15, y + math.sin(b) * 0.15, 0.14 + 0.03 * (k % 2)), 0.05, 0.008, (0, 0, 1), leaf[1], jitter=3.0, bevel=0.0))
            continue
        for k in range(6):
            b = k / 6 * math.tau
            objs.append(sphere('bbprleaf', 0.045, (x + math.cos(b) * 0.05, y + math.sin(b) * 0.05, 0.03), (1.4, 0.7, 0.35), (0, 0, b), m=random.choice(leaf), ico=1, seed=k))
        for k in range(4):
            b = k / 4 * math.tau + 0.4
            objs.append(sphere('bbprim', 0.025, (x + math.cos(b) * 0.035, y + math.sin(b) * 0.035, 0.065), (1, 1, 0.45), m=prim, ico=1))
            objs.append(sphere('bbprimeye', 0.008, (x + math.cos(b) * 0.035, y + math.sin(b) * 0.035, 0.074), m=eye, ico=1))
    return finish(objs, name)


# ------------------------------------------------------------------ the duck house
def duckhouse_dec(seed=101, name='duckhouse'):
    """The ducks' house on its raft (ducks.js walks them on it: the deck 0.075 up, 0.47 either side, 0.425 to the front and
    0.43 back; the ramp 0.14 either side from the deck's front edge down into the water 0.92 out; the door at the front):
    a deck of boards on two logs, a little clapboard house in duck-egg blue with white corner boards, an arched door, a
    round window in the gable and one each side, a shingled roof with white barge boards and a duck on the ridge for a
    weathervane; a ramp with cleats; a dish of grain, a coil of rope and a pot of marigolds on the deck. (Its footprint
    as before.)"""
    random.seed(seed); objs = []
    wood = [C('dhwood%d' % i, h, rough=0.75, var=0.12, grain=0.35, grain_scale=(1.5, 26, 26)) for i, h in enumerate(('#9a6a43', '#8c5f3c', '#a77650'))]
    log = C('dhlog', '#6b4a32', rough=0.85, var=0.1); blue = C('dhblue', '#7aa3b8', rough=0.7, var=0.04); white = C('dhwhite', '#f1ede2', rough=0.6)
    dark = C('dhdark', '#2a2420', rough=0.9); roof = [C('dhroof%d' % i, h, rough=0.65, var=0.06) for i, h in enumerate(('#b2392f', '#a8332a', '#ba4136'))]
    # the raft: two logs, two bearers, the deck boards
    for sx in (-1, 1):
        objs.append(cyl('dhlog', 0.075, 0.9, (sx * 0.3, 0.0, 0.0), (math.radians(90), 0, 0), m=log, verts=12, bevel=0.006))
        objs.append(cyl('dhlogend', 0.06, 0.012, (sx * 0.3, -0.452, 0.0), (math.radians(90), 0, 0), m=C('dhlogend', '#c9a476', rough=0.8), verts=12, bevel=0.0))
    n = 8; w = 0.855 / n
    for k in range(n):
        y = -0.425 + w * (k + 0.5)
        objs.append(box('dhdeck', (0.95, w - 0.012, 0.03), (random.uniform(-0.01, 0.01), y, 0.06), m=random.choice(wood), bevel=0.004, segs=1, jitter=0.002))
    # the house
    X, Y0, Y1, Z0, ZE, ZR = 0.25, -0.16, 0.32, 0.075, 0.47, 0.74
    objs.append(box('dhcore', (2 * X - 0.02, Y1 - Y0 - 0.02, ZE - Z0), (0, (Y0 + Y1) / 2, (Z0 + ZE) / 2), m=blue, bevel=0.0))
    for k in range(7):                                  # clapboards on the walls: each board a little proud at its foot
        z = Z0 + k * (ZE - Z0) / 7
        for (a, b, nn) in (((-X, Y0), (X, Y0), (0, -1)), ((X, Y0), (X, Y1), (1, 0)), ((X, Y1), (-X, Y1), (0, 1)), ((-X, Y1), (-X, Y0), (-1, 0))):
            A = Vector((a[0] + nn[0] * 0.006, a[1] + nn[1] * 0.006, z + 0.03)); B = Vector((b[0] + nn[0] * 0.006, b[1] + nn[1] * 0.006, z + 0.03))
            if nn == (0, -1) and z + 0.06 < Z0 + 0.25:              # (the front boards stop either side of the door)
                objs.append(plank('dhclap', A, Vector((-0.11, A.y, A.z)), 0.058, 0.012, (nn[0], nn[1], -0.15), blue, jitter=0.05, bevel=0.0))
                objs.append(plank('dhclap', Vector((0.11, A.y, A.z)), B, 0.058, 0.012, (nn[0], nn[1], -0.15), blue, jitter=0.05, bevel=0.0))
                continue
            objs.append(plank('dhclap', A, B, 0.058, 0.012, (nn[0], nn[1], -0.15), blue, jitter=0.05, bevel=0.0))
    for sx in (-1, 1):
        for y in (Y0, Y1):
            objs.append(box('dhcorner', (0.035, 0.035, ZE - Z0), (sx * X, y, (Z0 + ZE) / 2), m=white, bevel=0.004, segs=1))
    objs.append(prism_gable(0, 0, 0, 0, 0.01, blue) if False else None)
    # the front and back gables (ridge front to back)
    for y in (Y0, Y1):
        me = bpy.data.meshes.new('dhgable'); bm = bmesh.new()
        vs = [[bm.verts.new((x_, y + dy, z_)) for (x_, z_) in ((-X, ZE), (X, ZE), (0, ZR))] for dy in (-0.006, 0.006)]
        bm.faces.new(vs[0]); bm.faces.new(vs[1][::-1])
        for i in range(3): bm.faces.new((vs[0][i], vs[1][i], vs[1][(i + 1) % 3], vs[0][(i + 1) % 3]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
        o = link(bpy.data.objects.new('dhgable', me)); setmat(o, blue); objs.append(o)
    # the arched door, its white trim; a round window in the front gable and in each side
    objs.append(box('dhdoor', (0.2, 0.012, 0.16), (0, Y0 - 0.004, Z0 + 0.08), m=dark, bevel=0.0))
    objs.append(cyl('dhdoorarch', 0.1, 0.012, (0, Y0 - 0.004, Z0 + 0.16), (math.radians(90), 0, 0), m=dark, verts=20, bevel=0.0))
    for k in range(9):
        a0, a1 = math.pi * k / 9, math.pi * (k + 1) / 9
        objs.append(plank('dhtrim', (math.cos(a0) * 0.12, Y0 - 0.014, Z0 + 0.16 + math.sin(a0) * 0.12), (math.cos(a1) * 0.12, Y0 - 0.014, Z0 + 0.16 + math.sin(a1) * 0.12), 0.03, 0.012, (0, -1, 0), white, jitter=0.0, bevel=0.0))
    for sx in (-1, 1):
        objs.append(plank('dhtrim', (sx * 0.12, Y0 - 0.014, Z0), (sx * 0.12, Y0 - 0.014, Z0 + 0.16), 0.03, 0.012, (0, -1, 0), white, jitter=0.0, bevel=0.0))
    def round_window(c, axis, r=0.06):
        rot = (math.radians(90), 0, 0) if axis == 'y' else (0, math.radians(90), 0)
        sgn = 1 if (c[0] if axis == 'x' else c[1]) > 0 else -1; off = (0.006 * sgn, 0, 0) if axis == 'x' else (0, 0.006 * sgn, 0)
        objs.append(cyl('dhrim', r + 0.02, 0.02, c, rot, m=white, verts=20, bevel=0.002))
        objs.append(cyl('dhwin', r, 0.022, (c[0] + off[0], c[1] + off[1], c[2]), rot, m=C('dhglass', '#34516b', rough=0.08, spec=0.9, coat=1.0), verts=20, bevel=0.0))
        for ang in (0, math.pi / 2):                     # the window's cross bars
            d_ = Vector((math.cos(ang), 0, math.sin(ang))) if axis == 'y' else Vector((0, math.cos(ang), math.sin(ang)))
            p = Vector(c) + Vector(off) * 2.2
            objs.append(plank('dhbar', p - d_ * r, p + d_ * r, 0.012, 0.008, (sgn, 0, 0) if axis == 'x' else (0, sgn, 0), white, jitter=0.0, bevel=0.0))
    round_window((0, Y0 - 0.006, 0.57), 'y', 0.05)
    for sx in (-1, 1): round_window((sx * (X + 0.012), 0.08, 0.3), 'x')
    round_window((0, Y1 + 0.006, 0.3), 'y')
    # the roof: shingles on two slopes, barge boards, a ridge, the duck on top
    ang = math.atan2(ZR - ZE, X); SL = math.hypot(ZR - ZE, X) + 0.07
    objs.append(box('dhroofcore', (0.012, 0, 0), (0, 0, 0), m=roof[0], bevel=0.0) if False else None)
    for sx in (-1, 1):
        nrm = Vector((sx * math.sin(ang), 0, math.cos(ang)))
        down = Vector((sx * math.cos(ang), 0, -math.sin(ang)))
        top = Vector((0, 0, ZR + 0.02))
        objs.append(box('dhroofb', (SL, Y1 - Y0 + 0.14, 0.02), tuple(top + down * SL / 2 + nrm * 0.0), (0, sx * ang, 0), m=roof[1], bevel=0.0))
        rows = 5
        for r in range(rows):
            t0 = SL * (1 - (r + 1) / rows); a = top + down * (SL - r * SL / rows)
            for k in range(8):
                y = Y0 - 0.07 + (k + 0.5 + (0.5 if r % 2 else 0)) * (Y1 - Y0 + 0.14) / 8
                if y > Y1 + 0.07: continue
                p0 = a + Vector((0, y, 0)) + nrm * (0.014 + 0.004 * (r % 2)); p1 = p0 - down * (SL / rows + 0.03)
                objs.append(plank('dhsh', p0, p1, (Y1 - Y0 + 0.14) / 8 - 0.008, 0.014, tuple(nrm), random.choice(roof), jitter=0.4, bevel=0.0))
        for y in (Y0 - 0.075, Y1 + 0.075):
            objs.append(plank('dhbarge', top + Vector((0, y, 0.0)), top + down * SL + Vector((0, y, 0.0)), 0.05, 0.016, (0, -1 if y < 0 else 1, 0), white, jitter=0.05, bevel=0.0))
    objs.append(cyl('dhridge', 0.022, Y1 - Y0 + 0.16, (0, (Y0 + Y1) / 2, ZR + 0.035), (math.radians(90), 0, 0), m=roof[2], verts=8, bevel=0.0))
    # a little duck weathervane on the ridge
    iron = C('dhiron', '#2b2b2b', rough=0.5)
    objs.append(cyl('dhvpost', 0.007, 0.16, (0, 0.24, ZR + 0.11), m=iron, verts=6, bevel=0.0))
    objs.append(sphere('dhvduck', 0.035, (0, 0.24, ZR + 0.2), (1.5, 0.35, 0.8), m=iron, seg=10, rings=6))
    objs.append(sphere('dhvhead', 0.018, (0, 0.24 - 0.0, ZR + 0.235), (1, 0.6, 1), m=iron, seg=8, rings=5))
    objs[-1].location.x = 0.04
    objs.append(cyl('dhvbill', 0.008, 0.025, (0.065, 0.24, ZR + 0.232), (0, math.radians(90), 0), m=iron, verts=5, r2=0.003, bevel=0.0))
    # the ramp down into the water, with cleats
    a = Vector((0, -0.425, 0.06)); b = Vector((0, -0.84, -0.045)); d = (b - a)
    nr = Vector((0, -d.z, d.y)).normalized()
    if nr.z < 0: nr = -nr
    objs.append(plank('dhramp', a, b, 0.26, 0.025, tuple(nr), wood[0], jitter=0.1))
    for k in range(4):
        p = a.lerp(b, 0.15 + k * 0.22) + nr * 0.018
        objs.append(plank('dhcleat', p - Vector((0.11, 0, 0)), p + Vector((0.11, 0, 0)), 0.022, 0.018, tuple(nr), wood[1], jitter=0.2, bevel=0.0))
    # on the deck: a dish of grain, a coil of rope, a pot of marigolds
    objs.append(cyl('dhdish', 0.07, 0.03, (-0.36, 0.3, 0.09), m=C('dhdishc', '#c9c4b8', rough=0.5), verts=16, r2=0.055, bevel=0.003))
    objs.append(cyl('dhgrain', 0.062, 0.006, (-0.36, 0.3, 0.104), m=C('dhgrainc', '#e3c26a', rough=0.9), verts=16, bevel=0.0))
    rope = C('dhrope', '#c9b48a', rough=0.9)
    for k, (rr, zz) in enumerate(((0.06, 0.087), (0.042, 0.087), (0.05, 0.106))):      # (a coil lying flat, one turn on top)
        bpy.ops.mesh.primitive_torus_add(major_radius=rr, minor_radius=0.011, major_segments=16, minor_segments=6, location=(0.37, -0.33, zz))
        o = bpy.context.object; o.name = 'dhrope'; setmat(o, rope); objs.append(o)
    objs.append(cyl('dhpot', 0.05, 0.08, (0.37, 0.3, 0.115), m=C('dhterra', '#b8653d', rough=0.8), verts=12, r2=0.04, bevel=0.003))
    for k in range(5):
        a_ = k / 5 * math.tau
        objs.append(sphere('dhpleaf', 0.03, (0.37 + math.cos(a_) * 0.03, 0.3 + math.sin(a_) * 0.03, 0.17), m=C('dhleaf', '#4a8a38', rough=0.8), ico=1, disp=0.2, seed=k))
        objs.append(sphere('dhmari', 0.018, (0.37 + math.cos(a_ + 0.6) * 0.03, 0.3 + math.sin(a_ + 0.6) * 0.03, 0.2), m=C('dhmaric', '#ff8c2a', rough=0.6), ico=1))
    return finish([o for o in objs if o is not None], name)


# ================================================================== the village's small things (Audrey, 1 Nov: "Rebuild
# the small things (Recommended)"), each the size and shape of the old one where the game measures it (the footbridge's
# deck, the dock's deck, the lamp's head)
def arc_pts(c, r, a0, a1, n, plane='yz'):
    """Points round an arc (centre c, radius r, from angle a0 to a1) in the y-z plane (x fixed) or the x-z plane."""
    out = []
    for k in range(n + 1):
        a = a0 + (a1 - a0) * k / n
        out.append(Vector((c[0], c[1] + r * math.cos(a), c[2] + r * math.sin(a))) if plane == 'yz' else Vector((c[0] + r * math.cos(a), c[1], c[2] + r * math.sin(a))))
    return out


def polyline(objs, name, pts, w, t, normal, m):
    for a, b in zip(pts, pts[1:]):
        objs.append(plank(name, a, b, w, t, normal, m, jitter=0.0, bevel=0.0))


# ------------------------------------------------------------------ a park bench
def bench_v(seed=111, name='bench'):
    """A park bench: two cast-iron ends in green (a curved front leg, the back leg sweeping up into the back, an armrest
    ending in a scroll), five seat slats and three back slats of warm wood, little bolts."""
    random.seed(seed); objs = []
    iron = C('vbiron', '#2e4a3a', rough=0.45); wood = [C('vbwood%d' % i, h, rough=0.7, var=0.1, grain=0.35, grain_scale=(1.5, 26, 26)) for i, h in enumerate(('#a8743f', '#9c6a38', '#b07b45'))]
    for sx in (-0.49, 0.49):
        P = lambda y, z: Vector((sx, y, z))
        polyline(objs, 'vbleg', [P(-0.15, 0.0), P(-0.135, 0.15), P(-0.13, 0.3), P(-0.135, 0.4)], 0.045, 0.03, (1, 0, 0), iron)
        polyline(objs, 'vbleg', [P(0.16, 0.0), P(0.14, 0.2), P(0.12, 0.4), P(0.13, 0.55), P(0.16, 0.7), P(0.18, 0.8)], 0.045, 0.03, (1, 0, 0), iron)
        polyline(objs, 'vbrail', [P(-0.16, 0.405), P(0.14, 0.415)], 0.04, 0.03, (1, 0, 0), iron)
        polyline(objs, 'vbarm', [P(0.14, 0.6), P(0.0, 0.615), P(-0.12, 0.61), P(-0.17, 0.59)], 0.035, 0.035, (1, 0, 0), iron)
        sc = arc_pts((sx, -0.17, 0.55), 0.04, math.pi / 2, math.pi * 2.2, 8)          # (the armrest's scroll at the front)
        polyline(objs, 'vbscroll', sc, 0.025, 0.03, (1, 0, 0), iron)
        polyline(objs, 'vbstay', [P(-0.14, 0.42), P(-0.15, 0.51)], 0.02, 0.025, (1, 0, 0), iron)
        objs.append(cyl('vbfoot', 0.03, 0.02, (sx, -0.15, 0.01), m=iron, verts=8, bevel=0.0))
        objs.append(cyl('vbfoot', 0.03, 0.02, (sx, 0.16, 0.01), m=iron, verts=8, bevel=0.0))
    for k in range(5):                                   # the seat
        y = -0.14 + k * 0.064
        objs.append(box('vbseat', (1.1, 0.054, 0.028), (0, y, 0.43 + 0.002 * k), m=random.choice(wood), bevel=0.006, segs=1))
    for k in range(3):                                   # the back, leaning back
        z = 0.52 + k * 0.1; y = 0.13 + (z - 0.5) * 0.18
        objs.append(box('vbback', (1.1, 0.026, 0.075), (0, y + 0.02, z), (math.radians(-12), 0, 0), m=random.choice(wood), bevel=0.006, segs=1))
    return finish(objs, name)


# ------------------------------------------------------------------ a lamp post (its lamp where main.js puts its pool of
# light: 0.24 out along x)
def lamp_post_v(seed=112, name='lamp_post'):
    """A Victorian lamp post in black iron: a flared base with a collar, a slim fluted post, a scrolled bracket out to a
    four-sided lantern of glowing glass (lit at night) with a pointed cap and a finial."""
    random.seed(seed); objs = []
    iron = C('vliron', '#23272a', rough=0.45); lamp = C('lamp', '#ffe2a0', rough=0.3)
    objs.append(lathe('vlbase', [(0.085, 0.0), (0.085, 0.03), (0.07, 0.05), (0.06, 0.12), (0.045, 0.2), (0.05, 0.23), (0.04, 0.26)], iron, verts=8, cap_top=True))
    objs.append(cyl('vlpost', 0.026, 1.18, (0, 0, 0.26 + 0.59), m=iron, verts=10, bevel=0.0))
    for z in (0.62, 1.1, 1.44):
        objs.append(cyl('vlring', 0.036, 0.025, (0, 0, z), m=iron, verts=10, bevel=0.0))
    objs.append(sphere('vltop', 0.035, (0, 0, 1.47), m=iron, seg=10, rings=6))
    polyline(objs, 'vlarm', [Vector((0, 0, 1.43)), Vector((0.12, 0, 1.45)), Vector((0.24, 0, 1.44))], 0.022, 0.022, (0, -1, 0), iron)
    polyline(objs, 'vlscroll', arc_pts((0.07, 0, 1.36), 0.065, math.pi * 0.05, math.pi * 1.25, 8, plane='xz'), 0.016, 0.016, (0, -1, 0), iron)
    # the lantern: glass between black corner posts, a base, a cap, a finial
    objs.append(cyl('vlhook', 0.008, 0.06, (0.24, 0, 1.415), m=iron, verts=6, bevel=0.0))
    objs.append(cyl('lamp', 0.07, 0.17, (0.24, 0, 1.31), (0, 0, math.radians(45)), m=lamp, verts=4, r2=0.085, bevel=0.0))
    for k in range(4):
        a = math.radians(45) + k * math.pi / 2
        objs.append(plank('vlcorner', (0.24 + math.cos(a) * 0.072, math.sin(a) * 0.072, 1.225), (0.24 + math.cos(a) * 0.088, math.sin(a) * 0.088, 1.395), 0.012, 0.012, (math.cos(a), math.sin(a), 0), iron, jitter=0.0, bevel=0.0))
    objs.append(cyl('vlbottom', 0.075, 0.025, (0.24, 0, 1.215), (0, 0, math.radians(45)), m=iron, verts=4, r2=0.06, bevel=0.0))
    objs.append(cyl('vlcap', 0.11, 0.07, (0.24, 0, 1.43), (0, 0, math.radians(45)), m=iron, verts=4, r2=0.02, bevel=0.0))
    objs.append(sphere('vlfinial', 0.014, (0.24, 0, 1.48), m=iron, seg=8, rings=5))
    return finish(objs, name)


# ------------------------------------------------------------------ the well
def well_v(seed=113, name='well'):
    """A round stone well: courses of stones, a coping, dark water; two oak posts with knee braces, a winch with its crank
    and rope, a wooden bucket with iron hoops hanging over the water, a shingled roof; moss and a fern at its foot."""
    random.seed(seed); objs = []
    stones = [C('vwstone%d' % i, h, rough=0.85, var=0.08) for i, h in enumerate(('#a59d8e', '#968f80', '#b3ab9b', '#8c8577'))]
    oak = C('vwoak', '#7a5536', rough=0.75, var=0.1, grain=0.35, grain_scale=(1.5, 26, 26)); dark = C('vwdark', '#14232a', rough=0.15)
    roof = [C('vwroof%d' % i, h, rough=0.7, var=0.06) for i, h in enumerate(('#7b4a33', '#86513a', '#6f432e'))]
    iron = C('vwiron', '#3a3a38', rough=0.5); rope = C('vwrope', '#c9b48a', rough=0.9); moss = C('vwmoss', '#6f8f45', rough=0.9, var=0.1)
    R = 0.42
    objs.append(cyl('vwcore', R - 0.04, 0.38, (0, 0, 0.19), m=stones[1], verts=20, bevel=0.0))      # (below the water: it shows through the top)
    for row in range(4):
        n = 13; off = (0.5 if row % 2 else 0) * math.tau / n
        for k in range(n):
            a = k / n * math.tau + off; L = 2 * math.pi * R / n - 0.02
            objs.append(box('vwstone', (L * random.uniform(0.9, 1.0), 0.12, 0.105), (math.cos(a) * R, math.sin(a) * R, 0.06 + row * 0.115), (0, 0, a + math.pi / 2), m=random.choice(stones), bevel=0.015, segs=1, jitter=0.004))
    for k in range(10):                                  # the coping: flat stones round the top
        a = k / 10 * math.tau
        objs.append(box('vwcope', (0.3, 0.17, 0.05), (math.cos(a) * (R - 0.01), math.sin(a) * (R - 0.01), 0.505), (0, 0, a + math.pi / 2), m=stones[2], bevel=0.012, segs=1, jitter=0.003))
    objs.append(cyl('vwwater', R - 0.08, 0.01, (0, 0, 0.42), m=dark, verts=20, bevel=0.0))
    for sy in (-1, 1):                                   # the posts, braces, winch
        objs.append(box('vwpost', (0.08, 0.08, 0.92), (0, sy * 0.47, 0.42 + 0.46 * 0 + 0.46), m=oak, bevel=0.008, segs=1))
        objs.append(plank('vwbrace', (0, sy * 0.47, 1.05), (0, sy * 0.3, 1.25), 0.05, 0.04, (1, 0, 0), oak, jitter=0.2))
    objs.append(box('vwbeam', (0.08, 1.06, 0.08), (0, 0, 1.28), m=oak, bevel=0.008, segs=1))
    objs.append(cyl('vwroller', 0.05, 0.86, (0, 0, 0.95), (math.radians(90), 0, 0), m=oak, verts=12, bevel=0.0))
    for k in range(6): objs.append(cyl('vwrope', 0.054, 0.02, (0, -0.1 + k * 0.025, 0.95), (math.radians(90), 0, 0), m=rope, verts=12, bevel=0.0))
    objs.append(cyl('vwrope', 0.008, 0.12, (0, 0.0, 0.88), m=rope, verts=5, bevel=0.0))
    polyline(objs, 'vwcrank', [Vector((0, 0.51, 0.95)), Vector((0, 0.535, 0.95)), Vector((0, 0.535, 0.84)), Vector((0, 0.565, 0.84))], 0.02, 0.02, (1, 0, 0), iron)
    objs.append(lathe('vwbucket', [(0.07, 0.72), (0.08, 0.72), (0.095, 0.82), (0.088, 0.82), (0.064, 0.73)], oak, verts=12, cap_top=False))
    objs.append(cyl('vwbucketb', 0.07, 0.01, (0, 0, 0.725), m=oak, verts=12, bevel=0.0))
    for z in (0.745, 0.8): objs.append(cyl('vwhoop', 0.075 + (z - 0.72) * 0.17, 0.012, (0, 0, z), m=iron, verts=12, bevel=0.0))
    polyline(objs, 'vwhandle', arc_pts((0, 0, 0.82), 0.09, 0, math.pi, 6, plane='xz'), 0.008, 0.008, (0, 1, 0), iron)
    # the roof: two slopes of shingles along y, a ridge
    ang = math.atan2(0.26, 0.42); SL = math.hypot(0.26, 0.42) + 0.06
    for sx in (-1, 1):
        nrm = Vector((sx * math.sin(ang), 0, math.cos(ang))); down = Vector((sx * math.cos(ang), 0, -math.sin(ang))); top = Vector((0, 0, 1.53))
        objs.append(box('vwroofb', (SL, 1.12, 0.02), tuple(top + down * SL / 2 - nrm * 0.012), (0, sx * ang, 0), m=roof[0], bevel=0.0))
        for r in range(5):
            a = top + down * (SL - r * SL / 5)
            for k in range(8):
                y = -0.56 + (k + 0.5 + (0.5 if r % 2 else 0)) * 1.12 / 8
                if y > 0.56: continue
                p0 = a + Vector((0, y, 0)) + nrm * (0.01 + 0.004 * (r % 2)); p1 = p0 - down * (SL / 5 + 0.03)
                objs.append(plank('vwsh', p0, p1, 1.12 / 8 - 0.008, 0.014, tuple(nrm), random.choice(roof), jitter=0.5, bevel=0.0))
    objs.append(box('vwridge', (0.06, 1.16, 0.05), (0, 0, 1.54), m=roof[2], bevel=0.008, segs=1))
    # moss and a fern at its foot
    for k in range(5):
        a = random.uniform(0, math.tau)
        objs.append(sphere('vwmoss', 0.05, (math.cos(a) * (R + 0.02), math.sin(a) * (R + 0.02), 0.03), (1.6, 0.8, 0.5), (0, 0, a + math.pi / 2), m=moss, ico=1, disp=0.3, seed=k))
    tuft(objs, 0.36, -0.38, 9, 0.17, 0.2, [C('vwfern', '#4a8a38', rough=0.8)], width=0.045)
    return finish(objs, name)


def half_disc(name, r, c, m, n=10, t=0.012):
    """A half disc hanging down from c (its flat edge along x, facing -y): a scallop."""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); rings = []
    for dy in (-t / 2, t / 2):
        ring = [bm.verts.new((c[0] + r * math.cos(math.pi + math.pi * k / n), c[1] + dy, c[2] + r * math.sin(math.pi + math.pi * k / n))) for k in range(n + 1)]
        rings.append(ring)
    bm.faces.new(rings[0]); bm.faces.new(rings[1][::-1])
    for k in range(n):
        bm.faces.new((rings[0][k], rings[0][k + 1], rings[1][k + 1], rings[1][k]))
    bm.faces.new((rings[0][n], rings[0][0], rings[1][0], rings[1][n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m)
    return o


# ------------------------------------------------------------------ the egg stall
def egg_stall_v(seed=114, name='egg_stall'):
    """A roadside egg stall: four posts, a counter boarded in front with a painted panel, a striped awning (red and cream)
    with a scalloped edge on a sloping frame; on the counter three trays of eggs (brown, cream, blue-green), a wicker basket
    of eggs, an honesty box; a crate of straw beneath; a little chalkboard with an egg drawn on it by the front corner."""
    random.seed(seed); objs = []
    W, D = 0.9, 0.5
    wood = C('vswood', '#9a6a43', rough=0.75, var=0.12, grain=0.35, grain_scale=(1.5, 26, 26)); wood2 = C('vswood2', '#8a5d3a', rough=0.75, var=0.12)
    red = C('vsred', '#c8443a', rough=0.65); cream = C('vscream', '#f1e8d2', rough=0.65); green = C('vsgreen', '#5e8a5a', rough=0.6)
    tray = C('vstray', '#c9b896', rough=0.95); straw = C('vsstraw', '#e2c46a', rough=0.9, var=0.1)
    eggs = [C('vsegg%d' % i, h, rough=0.45) for i, h in enumerate(('#b0703f', '#efe6d2', '#9cc6bb'))]
    for sx in (-1, 1):
        objs.append(box('vspost', (0.06, 0.06, 1.2), (sx * W / 2, -D / 2 + 0.03, 0.6), m=wood, bevel=0.006, segs=1))
        objs.append(box('vspost', (0.06, 0.06, 1.48), (sx * W / 2, D / 2 - 0.03, 0.74), m=wood, bevel=0.006, segs=1))
        objs.append(plank('vsrail', (sx * W / 2, -D / 2 + 0.03, 1.19), (sx * W / 2, D / 2 - 0.03, 1.47), 0.05, 0.04, (sx, 0, 0), wood, jitter=0.1))
        objs.append(box('vsside', (0.02, D - 0.06, 0.4), (sx * W / 2, 0, 0.24), m=wood2, bevel=0.004, segs=1))
    objs.append(box('vscounter', (W + 0.1, D + 0.06, 0.05), (0, 0, 0.47), m=wood, bevel=0.008, segs=1))
    for k in range(9):                                   # the front: upright boards
        x = -W / 2 + 0.05 + k * (W - 0.1) / 8
        objs.append(box('vsboard', ((W - 0.1) / 8 - 0.008, 0.02, 0.42), (x, -D / 2 - 0.005, 0.235), m=random.choice((wood, wood2)), bevel=0.003, segs=1))
    objs.append(box('vspanel', (0.42, 0.012, 0.2), (0, -D / 2 - 0.02, 0.26), m=cream, bevel=0.004, segs=1))
    for k in range(3):                                   # three eggs painted on the panel
        objs.append(sphere('vspaint', 0.035, (-0.1 + k * 0.1, -D / 2 - 0.028, 0.26), (0.8, 0.25, 1.0), m=eggs[k], seg=10, rings=6))
    # the awning: a sloping frame, stripes, a scalloped edge
    ang = math.radians(16); front, back = Vector((0, -D / 2 - 0.2, 1.2)), Vector((0, D / 2 + 0.02, 1.49))
    n = 9
    for k in range(n):
        x0 = -W / 2 - 0.15 + k * (W + 0.3) / n; x1 = x0 + (W + 0.3) / n; xm = (x0 + x1) / 2
        objs.append(plank('vsstripe', front + Vector((xm, 0, 0)), back + Vector((xm, 0, 0)), x1 - x0 + 0.002, 0.012, (0, -math.sin(ang), math.cos(ang)), red if k % 2 == 0 else cream, jitter=0.0, bevel=0.0))
        objs.append(half_disc('vsscallop', (x1 - x0) / 2 - 0.002, (xm, front.y - 0.006, front.z + 0.004), red if k % 2 == 0 else cream))      # (a scallop hanging below each stripe)
    # on the counter: trays of eggs, a basket, the honesty box
    for k, ex in enumerate((-0.3, -0.04)):
        objs.append(box('vstray', (0.22, 0.28, 0.03), (ex, -0.03, 0.51), m=tray, bevel=0.004, segs=1))
        for i in range(3):
            for j in range(4):
                objs.append(sphere('vsegg', 0.026, (ex - 0.07 + i * 0.07, -0.135 + j * 0.07, 0.548), (1, 1, 1.3), m=eggs[(k + i + j) % 3 if k else k], seg=8, rings=6))
    bx, by = 0.25, -0.05                                 # the basket: woven rim, eggs heaped
    objs.append(lathe('vsbasket', [(0.07, 0.495), (0.1, 0.5), (0.115, 0.58), (0.105, 0.58), (0.088, 0.51), (0.0, 0.51)], straw, verts=14))
    objs[-1].location = (bx, by, 0)
    for k in range(7):
        a = k / 7 * math.tau
        objs.append(sphere('vsegg', 0.026, (bx + math.cos(a) * 0.055, by + math.sin(a) * 0.055, 0.575), (1, 1, 1.3), m=eggs[k % 3], seg=8, rings=6))
    objs.append(sphere('vsegg', 0.026, (bx, by, 0.6), (1, 1, 1.3), m=eggs[1], seg=10, rings=7))
    polyline(objs, 'vshandle', arc_pts((bx, by, 0.58), 0.1, 0, math.pi, 8, plane='xz'), 0.014, 0.01, (0, 1, 0), straw)
    objs.append(box('vshonesty', (0.1, 0.08, 0.09), (0.33, 0.14, 0.54), m=green, bevel=0.006, segs=1))
    objs.append(box('vsslot', (0.05, 0.012, 0.004), (0.33, 0.14, 0.586), m=C('vsdark', '#1d1a17', rough=0.9), bevel=0.0))
    # a crate of straw beneath, and the chalkboard by the front corner
    objs.append(box('vscrate', (0.3, 0.22, 0.16), (0.1, 0.05, 0.08), m=wood2, bevel=0.006, segs=1))
    for k in range(10):
        objs.append(plank('vsstraw', (0.1 + random.uniform(-0.12, 0.12), 0.05 + random.uniform(-0.08, 0.08), 0.15), (0.1 + random.uniform(-0.14, 0.14), 0.05 + random.uniform(-0.1, 0.1), 0.2), 0.012, 0.004, (0, 0, 1), straw, jitter=8.0, bevel=0.0))
    cx, cy = 0.62, -0.42
    for sd in (-1, 1):
        objs.append(plank('vsaframe', (cx + sd * 0.09, cy - 0.06, 0.0), (cx + sd * 0.08, cy, 0.42), 0.03, 0.02, (0, -1, 0.15), wood, jitter=0.1))
        objs.append(plank('vsaframe', (cx + sd * 0.09, cy + 0.08, 0.0), (cx + sd * 0.08, cy + 0.01, 0.42), 0.03, 0.02, (0, 1, 0.15), wood, jitter=0.1))
    objs.append(plank('vsboard', (cx, cy - 0.06, 0.06), (cx, cy - 0.005, 0.38), 0.16, 0.012, (0, -1, 0.17), C('vschalk', '#2b2f2c', rough=0.9), jitter=0.0, bevel=0.0))
    objs.append(sphere('vschalkegg', 0.045, (cx, cy - 0.04, 0.24), (0.75, 0.15, 1.0), (math.radians(-10), 0, 0), m=C('vswhite', '#f2f0ea', rough=0.9), seg=10, rings=6))
    return finish(objs, name)


# ------------------------------------------------------------------ a footbridge (its deck arched exactly as before:
# main.js measures it for walking over)
def bridge_v(seed=115, name='bridge', L=1.9, W=0.8, rise=0.22):
    """A rustic footbridge: two arched stringers under the deck, eleven planks across them (as before, each a little
    different), railings each side: posts with caps, a top rail and a lower rail following the arch, crossed braces between
    the posts; a newel post at each end."""
    random.seed(seed); objs = []
    planks_m = [C('vbrplank%d' % i, h, rough=0.75, var=0.1, grain=0.35, grain_scale=(1.5, 26, 26)) for i, h in enumerate(('#9a6a43', '#8f623d', '#a5744a'))]
    dark = C('vbrdark', '#5d4029', rough=0.8, var=0.08); cap = C('vbrcap', '#4c3422', rough=0.8)
    zf = lambda t: 0.06 + rise * math.sin(math.pi * t)
    n = 11
    for i in range(n):
        t = (i + 0.5) / n; x = -L / 2 + t * L; ang = math.atan(rise * math.pi / L * math.cos(math.pi * t))
        objs.append(box('vbrplank', (L / n - 0.015, W - random.uniform(0, 0.03), 0.04), (x, random.uniform(-0.01, 0.01), zf(t)), (0, -ang, 0), m=random.choice(planks_m), bevel=0.006, segs=1, jitter=0.002))
    for sy in (-1, 1):                                   # the stringers under the deck's edges
        pts = [Vector((-L / 2 + L * k / 10, sy * (W / 2 - 0.08), zf(k / 10) - 0.06)) for k in range(11)]
        polyline(objs, 'vbrstringer', pts, 0.08, 0.06, (0, sy, 0), dark)
    for sy in (-1, 1):
        y = sy * (W / 2 - 0.0)
        posts = [k / 4 for k in range(5)]
        for t in posts:
            x = -L / 2 + 0.03 + t * (L - 0.06); z0 = zf(min(max(t, 0.02), 0.98))
            h = 0.5 if t in (0, 1) else 0.44
            objs.append(box('vbrpost', (0.055, 0.055, h), (x, y, z0 + h / 2 - 0.02), m=dark, bevel=0.006, segs=1))
            objs.append(cyl('vbrcap', 0.042, 0.04, (x, y, z0 + h), m=cap, verts=8, r2=0.012, bevel=0.0))
        for (dz, w) in ((0.42, 0.05), (0.2, 0.035)):
            pts = [Vector((-L / 2 + 0.03 + (L - 0.06) * k / 12, y, zf(k / 12) + dz)) for k in range(13)]
            polyline(objs, 'vbrrail', pts, w, 0.035, (0, sy, 0), dark)
        for k in range(4):                               # crossed braces between the posts
            t0, t1 = k / 4, (k + 1) / 4
            x0, x1 = -L / 2 + 0.03 + t0 * (L - 0.06), -L / 2 + 0.03 + t1 * (L - 0.06)
            a0, a1 = Vector((x0 + 0.03, y, zf(t0) + 0.04)), Vector((x1 - 0.03, y, zf(t1) + 0.19))
            b0, b1 = Vector((x0 + 0.03, y, zf(t0) + 0.19)), Vector((x1 - 0.03, y, zf(t1) + 0.04))
            objs.append(plank('vbrbrace', a0, a1, 0.025, 0.02, (0, sy, 0), dark, jitter=0.2, bevel=0.0))
            objs.append(plank('vbrbrace', b0, b1, 0.025, 0.02, (0, sy, 0), dark, jitter=0.2, bevel=0.0))
    return finish(objs, name)


def barrel(objs, c, m_wood, m_hoop, h=0.5, r=0.19, lying=False, lid=None):
    """A barrel: bulging staves (a turned body with stave lines), three iron hoops, a lid of boards. Upright at c, or lying
    along x."""
    prof = [(r * 0.86, 0.0), (r * 0.95, h * 0.2), (r, h * 0.5), (r * 0.95, h * 0.8), (r * 0.86, h)]
    o = lathe('vbarrel', prof, m_wood, verts=16, cap_top=True, cap_bottom=True); objs.append(o)
    parts = [o]
    for k in range(16):                                   # the staves' joints
        a = k / 16 * math.tau
        pts = [Vector((math.cos(a) * (rr + 0.002), math.sin(a) * (rr + 0.002), z)) for rr, z in prof]
        for p0, p1 in zip(pts, pts[1:]):
            q = plank('vbstave', p0, p1, 0.006, 0.004, (math.cos(a), math.sin(a), 0), C('vbjoint', '#4a3020', rough=0.9), jitter=0.0, bevel=0.0); objs.append(q); parts.append(q)
    for z, rr in ((h * 0.12, r * 0.92), (h * 0.5 - 0.06, r * 1.0), (h * 0.88, r * 0.92)):
        q = cyl('vbhoop', rr + 0.008, 0.03, (0, 0, z), m=m_hoop, verts=16, bevel=0.0); objs.append(q); parts.append(q)
    for k in range(4):                                    # the lid's boards
        x = -r * 0.62 + k * r * 0.41
        q = box('vblid', (r * 0.39, 2 * math.sqrt(max(0.0, (r * 0.84) ** 2 - x * x)) - 0.01, 0.012), (x, 0, h + 0.004), m=lid or m_wood, bevel=0.0); objs.append(q); parts.append(q)
    M = Matrix.Translation(c) @ (Matrix.Rotation(math.radians(90), 4, 'Y') @ Matrix.Translation((0, 0, -h / 2)) if lying else Matrix.Identity(4))
    bpy.context.view_layer.update()                       # (each part's own place first)
    for q in parts: q.matrix_world = M @ q.matrix_world
    return parts


# ------------------------------------------------------------------ barrels
def barrels_v(seed=121, name='barrels'):
    """Two oak barrels standing and one lying chocked in front, iron hoops, lids of boards; a watering can on one."""
    random.seed(seed); objs = []
    oak = C('vboak', '#8a5a34', rough=0.75, var=0.1, grain=0.35, grain_scale=(1.5, 26, 26)); oak2 = C('vboak2', '#7a4f2e', rough=0.75, var=0.1)
    hoop = C('vbhoopc', '#3b3a36', rough=0.45)
    barrel(objs, Vector((-0.34, 0.33, 0)), oak, hoop, h=0.52, r=0.2)
    barrel(objs, Vector((0.08, 0.38, 0)), oak2, hoop, h=0.46, r=0.18)
    barrel(objs, Vector((0.33, -0.0, 0.17)), oak, hoop, h=0.46, r=0.17, lying=True)
    for sx in (-1, 1):
        objs.append(box('vbchock', (0.06, 0.08, 0.05), (0.33 + sx * 0.0, -0.0 + sx * 0.15, 0.025), (0, 0, 0), m=oak2, bevel=0.004, segs=1))
    can = C('vbcan', '#4f7f5b', rough=0.45); cx, cy, cz = -0.34, 0.33, 0.53
    objs.append(cyl('vbcan', 0.07, 0.15, (cx, cy, cz + 0.075), m=can, verts=14, bevel=0.004))
    objs.append(plank('vbspout', (cx + 0.05, cy, cz + 0.05), (cx + 0.2, cy, cz + 0.17), 0.02, 0.02, (0, -1, 0), can, jitter=0.0, bevel=0.0))
    polyline(objs, 'vbcanh', arc_pts((cx - 0.02, cy, cz + 0.15), 0.06, 0, math.pi, 6, plane='xz'), 0.018, 0.012, (0, -1, 0), can)
    return finish(objs, name)


# ------------------------------------------------------------------ the wheelbarrow
def wheelbarrow_v(seed=122, name='wheelbarrow'):
    """An old wooden wheelbarrow: a tray of boards splayed out, a spoked iron-rimmed wheel at the front, two long handles,
    two legs; a load of three pumpkins and a trowel."""
    random.seed(seed); objs = []
    wood = C('vwbwood', '#9a6a43', rough=0.75, var=0.12, grain=0.35, grain_scale=(1.5, 26, 26)); wood2 = C('vwbwood2', '#7f5534', rough=0.75, var=0.1)
    green = C('vwbgreen', '#4f7a55', rough=0.6); iron = C('vwbiron', '#3a3a38', rough=0.45)
    # the tray: bottom, splayed sides, back; boards painted green
    objs.append(box('vwbbottom', (0.62, 0.36, 0.025), (0.0, 0, 0.27), m=wood2, bevel=0.004, segs=1))
    for sy in (-1, 1):
        objs.append(box('vwbside', (0.7, 0.025, 0.2), (0.02, sy * 0.2, 0.36), (math.radians(sy * 22), 0, 0), m=green, bevel=0.004, segs=1))
        for k in range(2): objs.append(box('vwbline', (0.7, 0.03, 0.006), (0.02, sy * (0.205 + 0.0), 0.33 + k * 0.07), (math.radians(sy * 22), 0, 0), m=C('vwbline', '#3e6346', rough=0.7), bevel=0.0))
    objs.append(box('vwbback', (0.025, 0.46, 0.2), (-0.32, 0, 0.36), (0, math.radians(-25), 0), m=green, bevel=0.004, segs=1))
    objs.append(box('vwbfront', (0.025, 0.42, 0.16), (0.36, 0, 0.34), (0, math.radians(35), 0), m=green, bevel=0.004, segs=1))
    # the handles and legs
    for sy in (-1, 1):
        objs.append(plank('vwbhandle', (0.48, sy * 0.1, 0.19), (-0.84, sy * 0.22, 0.42), 0.045, 0.04, (0, 0, 1), wood, jitter=0.1))
        objs.append(cyl('vwbgrip', 0.022, 0.12, (-0.79, sy * 0.215, 0.41), (0, math.radians(80), 0), m=wood2, verts=8, bevel=0.0))
        objs.append(plank('vwbleg', (-0.3, sy * 0.16, 0.27), (-0.34, sy * 0.18, 0.0), 0.04, 0.04, (sy, 0, 0), wood, jitter=0.1))
    # the wheel
    wx, wz, R = 0.47, 0.17, 0.17
    objs.append(cyl('vwbtyre', R, 0.05, (wx, 0, wz), (math.radians(90), 0, 0), m=iron, verts=20, bevel=0.0))
    objs.append(cyl('vwbrim', R - 0.025, 0.056, (wx, 0, wz), (math.radians(90), 0, 0), m=wood, verts=20, bevel=0.0))
    objs.append(cyl('vwbhub', 0.035, 0.08, (wx, 0, wz), (math.radians(90), 0, 0), m=iron, verts=10, bevel=0.0))
    for k in range(8):
        a = k / 8 * math.pi
        d = Vector((math.cos(a), 0, math.sin(a)))
        objs.append(plank('vwbspoke', Vector((wx, -0.031, wz)) - d * (R - 0.03), Vector((wx, -0.031, wz)) + d * (R - 0.03), 0.018, 0.012, (0, -1, 0), wood2, jitter=0.0, bevel=0.0))
        objs.append(plank('vwbspoke', Vector((wx, 0.031, wz)) - d * (R - 0.03), Vector((wx, 0.031, wz)) + d * (R - 0.03), 0.018, 0.012, (0, 1, 0), wood2, jitter=0.0, bevel=0.0))
    # the load: pumpkins, a trowel
    pump = C('vwbpump', '#e0802e', rough=0.55); stalk = C('vwbstalk', '#6b5a2e', rough=0.8)
    for (x, y, r) in ((-0.12, -0.06, 0.11), (0.12, 0.07, 0.1), (0.0, 0.0, 0.085)):
        z = 0.3 + r * 0.8 + (0.08 if r < 0.09 else 0)
        for k in range(6):                               # ribbed: six lobes
            a = k / 6 * math.tau
            objs.append(sphere('vwbpump', r * 0.62, (x + math.cos(a) * r * 0.38, y + math.sin(a) * r * 0.38, z), (1, 1, 0.82), m=pump, seg=8, rings=6))
        objs.append(cyl('vwbstalk', 0.012, 0.05, (x, y, z + r * 0.75), m=stalk, verts=6, r2=0.008, bevel=0.0))
    objs.append(plank('vwbtrowel', (0.22, -0.12, 0.42), (0.36, -0.14, 0.48), 0.05, 0.006, (0, 0, 1), C('vwbsteel', '#a9aca8', rough=0.35, metal=0.8), jitter=0.0, bevel=0.0))
    objs.append(cyl('vwbtrowelh', 0.014, 0.1, (0.15, -0.11, 0.39), (0, math.radians(68), math.radians(-8)), m=wood, verts=8, bevel=0.0))
    return finish(objs, name)


# ------------------------------------------------------------------ the scarecrow (a friendly one)
def scarecrow_v(seed=123, name='scarecrow'):
    """A friendly scarecrow on his pole and cross-bar: a checked shirt with patches, blue dungarees, straw at his cuffs,
    neck and ankles, a sack-cloth head with button eyes, a stitched smile and rosy cheeks, a straw hat with a red band and a
    flower; a crow sitting on his arm (they're friends)."""
    random.seed(seed); objs = []
    pole = C('vscpole', '#7a5536', rough=0.8, var=0.1); straw = C('vscstraw', '#e2c46a', rough=0.9, var=0.12)
    shirt = C('vscshirt', '#c0453a', rough=0.8); check = C('vsccheck', '#8e2f2a', rough=0.8); denim = C('vscdenim', '#4b6a9a', rough=0.85)
    sack = C('vscsack', '#cfae7a', rough=0.95, var=0.06); dark = C('vscdark', '#2a2420', rough=0.6); cheek = C('vsccheek', '#e98a7a', rough=0.8)
    patch = C('vscpatch', '#e2c35a', rough=0.85); band = C('vscband', '#b8382e', rough=0.6)
    objs.append(box('vscpole', (0.06, 0.06, 1.42), (0, 0.04, 0.71), m=pole, bevel=0.006, segs=1))
    objs.append(box('vscbar', (0.88, 0.05, 0.05), (0, 0.04, 1.06), m=pole, bevel=0.006, segs=1))
    # the shirt: a body and two sleeves along the bar, checks, a patch; straw at the cuffs and neck
    objs.append(box('vscshirt', (0.32, 0.18, 0.36), (0, 0.0, 0.98), m=shirt, bevel=0.04, segs=2))
    for sx in (-1, 1):
        objs.append(cyl('vscsleeve', 0.075, 0.26, (sx * 0.29, 0.0, 1.06), (0, math.radians(90), 0), m=shirt, verts=10, r2=0.065, bevel=0.0))
        for k in range(7):
            objs.append(plank('vscstraw', (sx * 0.42, 0.0, 1.06), (sx * (0.46 + random.uniform(0, 0.04)), random.uniform(-0.06, 0.06), 1.06 + random.uniform(-0.07, 0.05)), 0.012, 0.004, (0, 0, 1), straw, jitter=6.0, bevel=0.0))
    for k in range(4):
        objs.append(box('vsccheck', (0.33, 0.185, 0.012), (0, 0.0, 0.86 + k * 0.08), m=check, bevel=0.0))
        objs.append(box('vsccheck', (0.012, 0.186, 0.37), (-0.12 + k * 0.08, 0.0, 0.98), m=check, bevel=0.0))
    objs.append(box('vscpatch', (0.09, 0.012, 0.08), (0.07, -0.095, 0.92), (0, math.radians(8), 0), m=patch, bevel=0.0))
    # dungarees: the bib and two legs hanging round the pole, straw at the ankles
    objs.append(box('vscbib', (0.2, 0.012, 0.14), (0, -0.095, 0.9), m=denim, bevel=0.0))
    for sx in (-1, 1):
        objs.append(plank('vscstrap', (sx * 0.08, -0.096, 0.96), (sx * 0.1, -0.096, 1.14), 0.03, 0.008, (0, -1, 0), denim, jitter=0.0, bevel=0.0))
        objs.append(cyl('vscleg', 0.07, 0.42, (sx * 0.08, 0.02, 0.56), (0, math.radians(sx * 3), 0), m=denim, verts=10, r2=0.06, bevel=0.0))
        for k in range(6):
            objs.append(plank('vscstraw', (sx * 0.08, 0.02, 0.36), (sx * 0.08 + random.uniform(-0.05, 0.05), 0.02 + random.uniform(-0.05, 0.05), 0.28), 0.012, 0.004, (0, 0, 1), straw, jitter=6.0, bevel=0.0))
    objs.append(box('vscbelt', (0.3, 0.17, 0.05), (0, 0.0, 0.8), m=denim, bevel=0.02, segs=1))
    # the head: a sack, button eyes, a stitched smile, cheeks; straw at the neck; the hat
    objs.append(sphere('vschead', 0.13, (0, 0.0, 1.32), (1, 0.95, 1.05), m=sack, seg=16, rings=10))
    for k in range(10): objs.append(plank('vscstraw', (0, 0.0, 1.2), (random.uniform(-0.1, 0.1), random.uniform(-0.1, 0.1), 1.15), 0.012, 0.004, (0, 0, 1), straw, jitter=8.0, bevel=0.0))
    for sx in (-1, 1):
        objs.append(cyl('vsceye', 0.022, 0.012, (sx * 0.045, -0.12, 1.35), (math.radians(90), 0, 0), m=dark, verts=10, bevel=0.0))
        objs.append(sphere('vsccheek', 0.025, (sx * 0.075, -0.112, 1.29), (1, 0.4, 0.8), m=cheek, seg=8, rings=5))
    sm = [Vector((0.06 * math.cos(a), -0.122 - 0.01 * math.sin(a), 1.285 - 0.03 * math.sin(a))) for a in [math.pi * (0.1 + 0.8 * k / 6) for k in range(7)]]
    polyline(objs, 'vscsmile', sm, 0.008, 0.006, (0, -1, 0), dark)
    objs.append(cyl('vscbrim', 0.22, 0.02, (0, 0.0, 1.43), m=straw, verts=20, bevel=0.0))
    objs.append(cyl('vschat', 0.11, 0.14, (0, 0.0, 1.51), m=straw, verts=16, r2=0.095, bevel=0.0))
    objs.append(cyl('vscband', 0.106, 0.03, (0, 0.0, 1.46), m=band, verts=16, bevel=0.0))
    objs.append(sphere('vscflower', 0.025, (0.08, -0.07, 1.47), m=C('vscflowerc', '#f2c43c', rough=0.6), ico=1))
    # the crow on his arm
    crow = C('vsccrow', '#24262b', rough=0.5); beak = C('vscbeak', '#d9a640', rough=0.5)
    bx, bz = -0.34, 1.12
    objs.append(sphere('vsccrow', 0.045, (bx, 0.04, bz + 0.04), (1.0, 1.4, 0.95), (0, 0, 0), m=crow, seg=12, rings=8))
    objs.append(sphere('vsccrowh', 0.03, (bx, -0.015, bz + 0.09), m=crow, seg=10, rings=7))
    objs.append(cyl('vsccrowb', 0.01, 0.035, (bx, -0.05, bz + 0.088), (math.radians(90), 0, 0), m=beak, verts=6, r2=0.0, bevel=0.0))
    objs.append(plank('vsccrowt', (bx, 0.09, bz + 0.03), (bx, 0.15, bz + 0.0), 0.04, 0.008, (0, 0, 1), crow, jitter=0.0, bevel=0.0))
    for sx in (-1, 1): objs.append(sphere('vsccroweye', 0.006, (bx + sx * 0.02, -0.03, bz + 0.1), m=C('vscwhite', '#f2f0ea', rough=0.4), seg=6, rings=4))
    return finish(objs, name)


# ------------------------------------------------------------------ the log pile
def log_pile_v(seed=124, name='log_pile'):
    """A stack of split and round logs between two stakes: bark, pale cut ends with rings; a few sticks of kindling."""
    random.seed(seed); objs = []
    bark = [C('vlpbark%d' % i, h, rough=0.9, var=0.12) for i, h in enumerate(('#5b3f2a', '#4f3624', '#6a4a31'))]
    end = C('vlpend', '#d9b789', rough=0.85, var=0.06); ring = C('vlpring', '#b48d5e', rough=0.85)
    rows = [(-0.21, 0.09), (-0.0, 0.09), (0.21, 0.09), (-0.105, 0.27), (0.105, 0.27), (0.0, 0.44)]
    for (y, z) in rows:
        r = random.uniform(0.085, 0.1); L = random.uniform(0.74, 0.82); x0 = random.uniform(-0.04, 0.04)
        objs.append(cyl('vlplog', r, L, (x0, y, z), (0, math.radians(90), 0), m=random.choice(bark), verts=10, bevel=0.0))
        for sx in (-1, 1):
            objs.append(cyl('vlpend', r * 0.9, 0.012, (x0 + sx * L / 2, y, z), (0, math.radians(90), 0), m=end, verts=10, bevel=0.0))
            objs.append(cyl('vlpring', r * 0.5, 0.014, (x0 + sx * L / 2, y, z), (0, math.radians(90), 0), m=ring, verts=8, bevel=0.0))
    for sy in (-1, 1):
        objs.append(box('vlpstake', (0.05, 0.05, 0.56), (0.0, sy * 0.3, 0.28), (math.radians(sy * -6), 0, 0), m=bark[1], bevel=0.006, segs=1))
    for k in range(5):
        objs.append(plank('vlpkindling', (0.2 + random.uniform(-0.05, 0.05), -0.27 + k * 0.012, 0.0), (0.42 + random.uniform(-0.02, 0.02), -0.25 + k * 0.01, 0.12), 0.03, 0.02, (0, -1, 0), random.choice(bark), jitter=4.0))
    return finish(objs, name)


# ------------------------------------------------------------------ the dock (its deck as before, 0.12 up: main.js stands
# the farmer and his rod on it)
def dock_v(seed=125, name='dock', L=1.8):
    """A little landing stage over the pond: boards across it (each its own shade, small gaps) on two bearers, four piles
    and two taller mooring posts at the end with rope round them, a coil of rope, a life ring on a post."""
    random.seed(seed); objs = []
    planks_m = [C('vdkplank%d' % i, h, rough=0.75, var=0.1, grain=0.35, grain_scale=(1.5, 26, 26)) for i, h in enumerate(('#9a6a43', '#8f623d', '#a5744a'))]
    dark = C('vdkdark', '#4f3624', rough=0.85, var=0.08); rope = C('vdkrope', '#c9b48a', rough=0.9)
    n = 12; w = L / 7 * 7 / n
    for i in range(n):
        x = -0.12 + (i + 0.5) * (1.78 / n)
        objs.append(box('vdkboard', (1.78 / n - 0.015, 0.8 - random.uniform(0, 0.02), 0.04), (x, random.uniform(-0.005, 0.005), 0.1), m=random.choice(planks_m), bevel=0.005, segs=1, jitter=0.002))
    for sy in (-1, 1):
        objs.append(box('vdkbearer', (1.8, 0.07, 0.07), (0.78, sy * 0.3, 0.045), m=dark, bevel=0.006, segs=1))
    for x in (0.1, 1.68):
        for sy in (-1, 1):
            objs.append(cyl('vdkpile', 0.05, 0.42 if x < 1 else 0.62, (x, sy * 0.35, -0.0 if x < 1 else 0.1), m=dark, verts=10, bevel=0.0))
    for sy in (-1, 1):                                    # the mooring posts' tops: caps and rope
        objs.append(cyl('vdkcap', 0.055, 0.03, (1.68, sy * 0.35, 0.42), m=dark, verts=10, r2=0.03, bevel=0.0))
        for k in range(3): objs.append(cyl('vdkropeband', 0.056, 0.016, (1.68, sy * 0.35, 0.26 + k * 0.022), m=rope, verts=10, bevel=0.0))
    for k, (rr, zz) in enumerate(((0.07, 0.135), (0.05, 0.135), (0.06, 0.155))):      # a coil of rope by the end, off the middle
        bpy.ops.mesh.primitive_torus_add(major_radius=rr, minor_radius=0.012, major_segments=16, minor_segments=6, location=(1.45, 0.26, zz))
        o = bpy.context.object; o.name = 'vdkrope'; setmat(o, rope); objs.append(o)
    # a life ring hung on the land-side pile
    bpy.ops.mesh.primitive_torus_add(major_radius=0.09, minor_radius=0.025, major_segments=20, minor_segments=8, location=(0.1, -0.41, 0.3), rotation=(math.radians(90), 0, 0))
    o = bpy.context.object; o.name = 'vdkring'; setmat(o, C('vdkringc', '#e8e2d4', rough=0.5)); objs.append(o)
    for k in range(4):
        a = k / 4 * math.tau + math.pi / 4
        objs.append(box('vdkringband', (0.03, 0.06, 0.06), (0.1 + math.cos(a) * 0.09, -0.41, 0.3 + math.sin(a) * 0.09), (0, -a, 0), m=C('vdkred', '#c8443a', rough=0.5), bevel=0.0))
    objs.append(cyl('vdkpile', 0.05, 0.32, (0.1, -0.35, 0.28), m=dark, verts=10, bevel=0.0))
    return finish(objs, name)


def bale(objs, c, size, yaw, ms, twine):
    """A square straw bale: rounded block, straw strands on its faces, two twines round it."""
    sx, sy, sz = size; R = Matrix.Rotation(yaw, 4, 'Z'); C0 = Vector(c)
    objs.append(box('vhbale', size, tuple(C0), (0, 0, yaw), m=ms[0], bevel=0.035, segs=2, jitter=0.006))
    for k in range(26):                                   # strands on the top and the long sides
        face = random.choice(('top', 'front', 'back'))
        u = random.uniform(-sx / 2 + 0.03, sx / 2 - 0.03)
        if face == 'top': a = Vector((u, random.uniform(-sy / 2 + 0.03, sy / 2 - 0.03), sz / 2 + 0.004)); d = Vector((random.uniform(0.05, 0.1), random.uniform(-0.03, 0.03), 0)); n = (0, 0, 1)
        else:
            sg = -1 if face == 'front' else 1; a = Vector((u, sg * (sy / 2 + 0.004), random.uniform(-sz / 2 + 0.04, sz / 2 - 0.04))); d = Vector((random.uniform(0.05, 0.1), 0, random.uniform(-0.02, 0.02))); n = (0, sg, 0)
        p0, p1 = C0 + R @ a, C0 + R @ (a + d)
        objs.append(plank('vhstrand', p0, p1, 0.008, 0.003, tuple(R @ Vector(n)), random.choice(ms[1:]), jitter=0.0, bevel=0.0))
    for t in (-sx / 4, sx / 4):                           # the twines
        pts = [Vector((t, -sy / 2 - 0.004, -sz / 2 + 0.02)), Vector((t, -sy / 2 - 0.004, sz / 2 + 0.002)), Vector((t, sy / 2 + 0.004, sz / 2 + 0.002)), Vector((t, sy / 2 + 0.004, -sz / 2 + 0.02))]
        for p0, p1 in zip(pts, pts[1:]):
            mid = (p0 + p1) / 2; nn = Vector((0, 0, 1)) if abs(p0.z - p1.z) < 1e-6 else Vector((0, -1 if p0.y < 0 else 1, 0))
            objs.append(plank('vhtwine', C0 + R @ p0, C0 + R @ p1, 0.012, 0.004, tuple(R @ nn), twine, jitter=0.0, bevel=0.0))


def straw_ms():
    return [C('vhstraw', '#e3c46c', rough=0.9, var=0.08), C('vhstraw2', '#cfae55', rough=0.9), C('vhstraw3', '#f0d88a', rough=0.9), C('vhstraw4', '#b89748', rough=0.9)]


# ------------------------------------------------------------------ the hay stack
def hay_stack_v(seed=131, name='hay_stack'):
    """Three straw bales (two below, one across the top), strands of straw on them, red twine, loose straw about."""
    random.seed(seed); objs = []
    ms = straw_ms(); twine = C('vhtwinec', '#b8382e', rough=0.7)
    bale(objs, (0, 0, 0.14), (0.62, 0.34, 0.28), 0.0, ms, twine)
    bale(objs, (0.05, 0.42, 0.14), (0.62, 0.34, 0.28), 0.12, ms, twine)
    bale(objs, (0.03, 0.2, 0.42), (0.62, 0.34, 0.28), -0.08, ms, twine)
    for k in range(18):
        x, y = random.uniform(-0.3, 0.36), random.uniform(-0.2, 0.62)
        objs.append(plank('vhloose', (x, y, 0.006), (x + random.uniform(-0.08, 0.08), y + random.uniform(-0.08, 0.08), 0.006), 0.008, 0.003, (0, 0, 1), random.choice(ms[1:]), jitter=0.0, bevel=0.0))
    return finish(objs, name)


# ------------------------------------------------------------------ the round bale
def round_bale_v(seed=132, name='round_bale'):
    """A round bale lying on its side: its ends rolled in rings, straw strands round it, a net-wrap of twine, a little
    loose straw at its foot."""
    random.seed(seed); objs = []
    ms = straw_ms(); R, L = 0.33, 0.6; yaw = 0.4
    Rm = Matrix.Rotation(yaw, 4, 'Z')
    o = cyl('vrbale', R, L, (0, 0, R), (math.pi / 2, 0, yaw), m=ms[0], verts=24, bevel=0.03); objs.append(o)
    ax = Rm @ Vector((0, 1, 0))
    for sd in (-1, 1):                                    # the rolled rings on each end
        for k, rr in enumerate((0.27, 0.2, 0.13, 0.06)):
            q = cyl('vrring', rr, 0.008, tuple(Vector((0, 0, R)) + ax * sd * (L / 2 + 0.002 + 0.001 * k)), (math.pi / 2, 0, yaw), m=ms[1 + k % 3], verts=20, bevel=0.0); objs.append(q)
    for k in range(40):                                   # strands round it
        a = random.uniform(0, math.tau); t = random.uniform(-L / 2 + 0.04, L / 2 - 0.04)
        n = Rm @ Vector((math.cos(a), 0, math.sin(a))); p0 = Vector((0, 0, R)) + ax * t + n * (R + 0.003)
        tang = Rm @ Vector((-math.sin(a), 0, math.cos(a)))
        objs.append(plank('vrstrand', p0, p0 + tang * random.uniform(0.05, 0.1) + ax * random.uniform(-0.02, 0.02), 0.008, 0.003, tuple(n), random.choice(ms[1:]), jitter=0.0, bevel=0.0))
    for t in (-0.18, 0.0, 0.18):                          # the wrap
        q = cyl('vrwrap', R + 0.004, 0.012, tuple(Vector((0, 0, R)) + ax * t), (math.pi / 2, 0, yaw), m=C('vrwrapc', '#e8e2d4', rough=0.7), verts=24, bevel=0.0); objs.append(q)
    for k in range(12):
        x, y = random.uniform(-0.4, 0.4), random.uniform(-0.4, 0.4)
        objs.append(plank('vrloose', (x, y, 0.006), (x + random.uniform(-0.08, 0.08), y + random.uniform(-0.08, 0.08), 0.006), 0.008, 0.003, (0, 0, 1), random.choice(ms[1:]), jitter=0.0, bevel=0.0))
    return finish(objs, name)


def pot_plant(objs, x, y, s, kind, leaf, cols):
    """A terracotta pot with a rim and its plant: a geranium, daisies, or a little herb."""
    terra = C('vpterra', '#b8653d', rough=0.8, var=0.05); rim = C('vpterra2', '#c47248', rough=0.8)
    objs.append(cyl('vppot', 0.12 * s, 0.22 * s, (x, y, 0.11 * s), m=terra, verts=16, r2=0.095 * s, bevel=0.004))
    objs.append(cyl('vprim', 0.135 * s, 0.045 * s, (x, y, 0.21 * s), m=rim, verts=16, bevel=0.004))
    objs.append(cyl('vpsoil', 0.115 * s, 0.01, (x, y, 0.23 * s), m=C('vpsoilc', '#5a3f2c', rough=0.95), verts=14, bevel=0.0))
    top = 0.24 * s
    if kind == 'herb':
        tuft(objs, x, y, 14, 0.1 * s, 0.16 * s, leaf, z0=top, width=0.018)
        return
    for k in range(7):
        a = k / 7 * math.tau
        objs.append(sphere('vpleaf', 0.05 * s, (x + math.cos(a) * 0.065 * s, y + math.sin(a) * 0.065 * s, top + 0.04 * s), (1.2, 1.2, 0.6), m=random.choice(leaf), ico=1, disp=0.2, seed=k))
    if kind == 'geranium':
        for k in range(4):
            a = k / 4 * math.tau + 0.3; cx, cy = x + math.cos(a) * 0.05 * s, y + math.sin(a) * 0.05 * s
            objs.append(cyl('vpstem', 0.005, 0.1 * s, (cx, cy, top + 0.08 * s), m=leaf[0], verts=5, bevel=0.0))
            for q in range(5):
                b = q / 5 * math.tau
                objs.append(sphere('vpgeran', 0.017 * s, (cx + math.cos(b) * 0.02 * s, cy + math.sin(b) * 0.02 * s, top + 0.14 * s), m=cols[k % len(cols)], ico=1))
    else:                                                 # daisies
        for k in range(6):
            a = k / 6 * math.tau + 0.2; cx, cy = x + math.cos(a) * 0.06 * s, y + math.sin(a) * 0.06 * s
            for q in range(6):
                b = q / 6 * math.tau
                objs.append(plank('vppetal', (cx, cy, top + 0.1 * s), (cx + math.cos(b) * 0.03 * s, cy + math.sin(b) * 0.03 * s, top + 0.1 * s), 0.014 * s, 0.003, (0, 0, 1), C('vpwhite', '#fbf6ee', rough=0.5), jitter=3.0, bevel=0.0))
            objs.append(sphere('vpeye', 0.01 * s, (cx, cy, top + 0.104 * s), (1, 1, 0.6), m=C('vpyellow', '#f2c43c', rough=0.6), ico=1))


# ------------------------------------------------------------------ flower pots
def flower_pots_v(seed=133, name='flower_pots'):
    """Three terracotta pots with rims: red geraniums, daisies, a little pot of herbs."""
    random.seed(seed); objs = []
    leaf = [C('vpleaf%d' % i, h, rough=0.8, var=0.06) for i, h in enumerate(('#4a8a38', '#3f7a32', '#5a9a40'))]
    reds = [C('vpred', '#d63a3f', rough=0.6), C('vppink', '#e9668c', rough=0.6)]
    pot_plant(objs, 0.0, 0.0, 1.0, 'geranium', leaf, reds)
    pot_plant(objs, 0.29, 0.1, 0.8, 'daisy', leaf, reds)
    pot_plant(objs, 0.12, 0.32, 0.88, 'herb', leaf, reds)
    return finish(objs, name)


# ------------------------------------------------------------------ the planter
def planter_v(seed=134, name='planter'):
    """A wooden trough planter of boards with corner posts, full of flowers: geraniums, lavender, white alyssum, ivy
    trailing over the front."""
    random.seed(seed); objs = []
    wood = C('vtwood', '#8a5d3a', rough=0.75, var=0.12, grain=0.35, grain_scale=(1.5, 26, 26)); wood2 = C('vtwood2', '#9a6a43', rough=0.75, var=0.1)
    leaf = [C('vtleaf%d' % i, h, rough=0.8, var=0.06) for i, h in enumerate(('#4a8a38', '#3f7a32', '#5a9a40'))]
    for sx in (-1, 1):
        for sy in (-1, 1):
            objs.append(box('vtpost', (0.06, 0.06, 0.34), (sx * 0.42, sy * 0.15, 0.17), m=wood, bevel=0.006, segs=1))
    for k in range(3):
        z = 0.06 + k * 0.1
        for sy in (-1, 1): objs.append(box('vtboard', (0.84, 0.025, 0.09), (0, sy * 0.16, z), m=random.choice((wood, wood2)), bevel=0.004, segs=1))
        for sx in (-1, 1): objs.append(box('vtboard', (0.025, 0.3, 0.09), (sx * 0.43, 0, z), m=random.choice((wood, wood2)), bevel=0.004, segs=1))
    objs.append(box('vtsoil', (0.82, 0.29, 0.02), (0, 0, 0.3), m=C('vtsoilc', '#5a3f2c', rough=0.95), bevel=0.0))
    red = C('vtred', '#d63a3f', rough=0.6); lav = C('vtlav', '#8f6fc4', rough=0.6); white = C('vtwhite', '#f6f3ea', rough=0.7)
    for k in range(7):                                    # a row of geraniums and lavender behind
        x = -0.34 + k * 0.113
        for q in range(4):
            a = q / 4 * math.tau
            objs.append(sphere('vtleaf', 0.045, (x + math.cos(a) * 0.035, 0.05 + math.sin(a) * 0.03, 0.35), (1.1, 1.1, 0.7), m=random.choice(leaf), ico=1, disp=0.2, seed=k * 4 + q))
        if k % 2 == 0:
            objs.append(cyl('vtstem', 0.005, 0.08, (x, 0.05, 0.39), m=leaf[1], verts=5, bevel=0.0))
            for q in range(5):
                b = q / 5 * math.tau
                objs.append(sphere('vtgeran', 0.018, (x + math.cos(b) * 0.022, 0.05 + math.sin(b) * 0.022, 0.43), m=red, ico=1))
        else:
            for q in range(4):
                b = q / 4 * math.tau; px, py = x + math.cos(b) * 0.025, 0.05 + math.sin(b) * 0.02
                objs.append(cyl('vtstem', 0.004, 0.07, (px, py, 0.385), m=leaf[1], verts=5, bevel=0.0))
                objs.append(cyl('vtlav', 0.011, 0.07, (px, py, 0.45), m=lav, verts=5, r2=0.005, bevel=0.0))
    ivy = C('vtivyc', '#2f6b34', rough=0.7)
    for k in range(8):                                    # alyssum along the front: little white clouds on green
        x = -0.36 + k * 0.103
        objs.append(sphere('vtalyl', 0.04, (x, -0.09, 0.32), (1.3, 1, 0.5), m=random.choice(leaf), ico=1, disp=0.3, seed=k + 40))
        for q in range(6):
            a = random.uniform(0, math.tau); rr = random.uniform(0, 0.04)
            objs.append(sphere('vtaly', 0.016, (x + math.cos(a) * rr, -0.09 + math.sin(a) * rr * 0.7, 0.345 + random.uniform(0, 0.015)), m=white, ico=1))
    for x in (-0.3, -0.05, 0.22):                         # ivy trailing over the front, leaf by leaf
        pts = [Vector((x, -0.15, 0.32)), Vector((x + 0.03, -0.185, 0.27)), Vector((x + 0.02, -0.19, 0.2)), Vector((x + 0.05, -0.19, 0.13)), Vector((x + 0.04, -0.19, 0.07))]
        polyline(objs, 'vtivystem', pts, 0.006, 0.005, (0, -1, 0), leaf[1])
        for j, p in enumerate(pts[1:]):
            sd = 1 if j % 2 else -1
            objs.append(sphere('vtivy', 0.022, tuple(p + Vector((sd * 0.018, -0.008, 0))), (1.1, 0.35, 1.0), (0, math.radians(sd * 25), 0), m=ivy, ico=1))
    return finish(objs, name)


# ------------------------------------------------------------------ the vegetable patch
def veg_patch_v(w=2.6, d=1.8, seed=135, name='veg_patch'):
    """A raised vegetable bed: board edges with corner pegs, soil in ridged rows; rows of cabbages (leaves in layers),
    carrots (feathery tops), and pumpkins on their vines with big leaves; a little trowel stuck in the soil."""
    random.seed(seed); objs = []
    wood = C('vvwood', '#8a5d3a', rough=0.75, var=0.12); soil = C('vvsoil', '#5a3f2c', rough=0.95, var=0.06); soil2 = C('vvsoil2', '#6b4c35', rough=0.95)
    leaf = [C('vvleaf%d' % i, h, rough=0.75, var=0.06) for i, h in enumerate(('#6fa34a', '#5b9440', '#86b85a'))]
    cab = [C('vvcab%d' % i, h, rough=0.7, var=0.05) for i, h in enumerate(('#8fbf6a', '#7aae58', '#a3cc7e'))]
    pump = C('vvpump', '#e0802e', rough=0.55); vine = C('vvvine', '#4a7a32', rough=0.8)
    objs.append(box('vvsoil', (w - 0.06, d - 0.06, 0.1), (0, 0, 0.05), m=soil, bevel=0.0))
    for sy in (-1, 1): objs.append(box('vvedge', (w, 0.04, 0.12), (0, sy * (d / 2 - 0.02), 0.06), m=wood, bevel=0.006, segs=1))
    for sx in (-1, 1): objs.append(box('vvedge', (0.04, d, 0.12), (sx * (w / 2 - 0.02), 0, 0.06), m=wood, bevel=0.006, segs=1))
    for sx in (-1, 1):
        for sy in (-1, 1): objs.append(box('vvpeg', (0.06, 0.06, 0.16), (sx * (w / 2 - 0.02), sy * (d / 2 - 0.02), 0.08), m=wood, bevel=0.006, segs=1))
    rows = int((d - 0.2) / 0.32)
    for r in range(rows):
        y = -d / 2 + 0.2 + r * 0.32
        objs.append(box('vvridge', (w - 0.16, 0.18, 0.04), (0, y, 0.11), m=soil2, bevel=0.02, segs=1))
        kind = ('cab', 'carrot', 'pump')[r % 3]
        n = int((w - 0.2) / (0.3 if kind != 'carrot' else 0.16))
        for i in range(n):
            x = -w / 2 + 0.18 + i * (w - 0.3) / max(1, n - 1) + random.uniform(-0.02, 0.02)
            if kind == 'cab':
                for q in range(5):                       # outer leaves splayed, a round heart
                    a = q / 5 * math.tau + random.uniform(0, 0.5)
                    objs.append(sphere('vvcabl', 0.07, (x + math.cos(a) * 0.06, y + math.sin(a) * 0.06, 0.15), (1.2, 0.8, 0.35), (0, math.radians(-20), a), m=random.choice(leaf), ico=1, seed=q))
                objs.append(sphere('vvcab', 0.075, (x, y, 0.19), (1, 1, 0.9), m=random.choice(cab), seg=10, rings=7))
            elif kind == 'carrot':
                objs.append(cyl('vvcarrot', 0.018, 0.02, (x, y, 0.13), m=C('vvorange', '#e8792a', rough=0.6), verts=8, bevel=0.0))
                tuft(objs, x, y, 6, 0.05, 0.12, leaf, z0=0.13, width=0.014)
            else:
                if i % 2 == 0:
                    for k in range(6):
                        a = k / 6 * math.tau
                        objs.append(sphere('vvpump', 0.065, (x + math.cos(a) * 0.04, y + math.sin(a) * 0.04, 0.19), (1, 1, 0.8), m=pump, seg=8, rings=6))
                    objs.append(cyl('vvstalk', 0.01, 0.04, (x, y, 0.27), m=vine, verts=6, bevel=0.0))
                else:
                    for k in range(3):
                        a = k / 3 * math.tau + i
                        objs.append(sphere('vvbigleaf', 0.09, (x + math.cos(a) * 0.08, y + math.sin(a) * 0.08, 0.16), (1.2, 1.0, 0.25), (0, 0, a), m=random.choice(leaf), ico=1, seed=k + i))
                polyline(objs, 'vvvine', [Vector((x - 0.1, y + 0.04, 0.135)), Vector((x, y - 0.03, 0.135)), Vector((x + 0.14, y + 0.03, 0.135))], 0.012, 0.008, (0, 0, 1), vine)
    objs.append(plank('vvtrowel', (w / 2 - 0.25, -d / 2 + 0.12, 0.12), (w / 2 - 0.23, -d / 2 + 0.12, 0.2), 0.04, 0.006, (0, -1, 0), C('vvsteel', '#a9aca8', rough=0.35, metal=0.8), jitter=0.0, bevel=0.0))
    objs.append(cyl('vvtrowelh', 0.013, 0.1, (w / 2 - 0.225, -d / 2 + 0.12, 0.25), m=wood, verts=8, bevel=0.0))
    return finish(objs, name)


# ================================================================== the graphics pass (Audrey, 1 Nov: "Another graphics
# pass (Recommended)"): bushes, rocks, the pasture and its shelter, the picket fences, the mushrooms, the sunflowers
def flat_leaf(name, base, q, L, w, m, shape='diamond', both=True, fold=0.0):
    """A flat leaf from base (a point) along its quaternion q's +y, its face along q's +z: 'diamond' (a pointed oval, 2
    triangles) or 'heart' (rounded at the base, pointed at the tip, 4 triangles); both: a back face too; fold: its edges
    bent back a little (a crease down the middle)."""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); B = Vector(base)
    pts = [(0, 0, 0), (w, L * 0.45, -fold), (0, L, 0), (-w, L * 0.45, -fold)] if shape == 'diamond' else \
          [(0, 0, 0), (w * 0.85, L * 0.12, -fold), (w, L * 0.42, -fold), (0, L, 0), (-w, L * 0.42, -fold), (-w * 0.85, L * 0.12, -fold)]
    vs = [bm.verts.new(B + q @ Vector(p_)) for p_ in pts]
    bm.faces.new(vs)
    if both:
        vb = [bm.verts.new(B + q @ (Vector(p_) - Vector((0, 0, 0.002)))) for p_ in pts]; bm.faces.new(vb[::-1])
    bmesh.ops.triangulate(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m)
    for pl in o.data.polygons: pl.use_smooth = False
    return o


def bush_v(seed=141, name='bush_a', flowers=False):
    """A leafy bush (110 of them round the village): a rounded mound of leafy clumps in four greens (darker low down and
    inside, sunlit on top), its outside covered in little pointed leaves standing out of it every which way, a few twigs at
    its foot; the second kind in flower (pink and white five-petalled blossoms). (6 Nov 2026, Audrey: "Details of the
    bushes ... need to be improved": it had been seven smooth blobs.) As big as before: about 0.8 m across, 0.55 high."""
    from mathutils import Quaternion
    random.seed(seed); objs = []
    leaf = [C('vbuleaf%d' % i, h, rough=0.8, var=0.07, hue_var=0.015) for i, h in enumerate(('#3d7a2b', '#4c8d33', '#5fa33c', '#79ba4a'))]
    twig = C('vbutwig', '#5a4330', rough=0.9, var=0.1)
    # the body: a core, a ring of clumps round its foot, a few on top
    clumps = [((0, 0), 0.25, 0.26, 1)]
    for k in range(7):
        a = k / 7 * math.tau + random.uniform(-0.25, 0.25); d = random.uniform(0.19, 0.25)
        clumps.append(((math.cos(a) * d, math.sin(a) * d), random.uniform(0.14, 0.17), random.uniform(0.15, 0.2), 0 if k % 2 else 1))
    for k in range(4):
        a = k / 4 * math.tau + random.uniform(0, 1.2); d = random.uniform(0.06, 0.13)
        clumps.append(((math.cos(a) * d, math.sin(a) * d), random.uniform(0.13, 0.16), random.uniform(0.34, 0.4), 2 + (k % 2)))
    for i, ((x, y), r, z, tone) in enumerate(clumps):
        objs.append(sphere('vbuclump', r, (x, y, z), (1.05, 1.0, 0.9), (0, 0, random.uniform(0, 3)), m=leaf[max(0, tone - 1)], ico=2, disp=0.3, disp_scale=4.0, seed=seed * 10 + i))      # (a shade darker: the leaves on it catch the light)
    # leaves all over the clumps: each a little pointed leaf (two triangles) lying on a clump's surface, its tip lifted a
    # little, turned any which way, lighter where the sun reaches
    for k in range(340):
        (cx, cy), r, cz, tone0 = random.choice(clumps)
        a = random.uniform(0, math.tau); el = math.asin(random.uniform(-0.2, 1.0))
        d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
        p = Vector((cx, cy, cz)) + Vector((d.x * r * 1.05, d.y * r, d.z * r * 0.9)) * random.uniform(1.06, 1.14)
        if p.z < 0.05 or (p - Vector((0, 0, 0.24))).length < 0.2: continue      # (not under the bush, nor deep inside it)
        q = d.to_track_quat('Z', 'Y') @ Quaternion((0, 0, 1), random.uniform(0, math.tau)) @ Quaternion((1, 0, 0), random.uniform(0.15, 0.45))      # (its tip lifted off the clump)
        tone = leaf[min(3, max(0, tone0 + (1 if el > 0.6 else 0) - (1 if el < 0.1 else 0)))]
        objs.append(flat_leaf('vbuleafy', tuple(p), q, random.uniform(0.06, 0.085), random.uniform(0.022, 0.03), tone, both=False, fold=0.006))
    for k in range(4):                                  # twigs at its foot
        a = k / 4 * math.tau + 0.5; objs.append(cyl('vbutwig', 0.012, 0.22, (math.cos(a) * 0.12, math.sin(a) * 0.12, 0.08), (math.cos(a + 1.57) * 0.6, math.sin(a + 1.57) * 0.6, 0), m=twig, verts=5, r2=0.006, bevel=0.0))
    if flowers:
        cols = [C('vbupink', '#f08bb0', rough=0.6), C('vbuwhite', '#fbf6ee', rough=0.6)]; eye = C('vbueye', '#f4c43a', rough=0.6)
        C0 = Vector((0, 0, 0.24)); RX, RY, RZ = 0.4, 0.38, 0.34      # (the mound's outside, the blossoms just on it)
        for k in range(18):
            a = random.uniform(0, math.tau); el = math.asin(random.uniform(0.1, 0.95))
            d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
            p = C0 + Vector((d.x * RX, d.y * RY, d.z * RZ)) * 1.05; n = Vector((d.x / RX, d.y / RY, d.z / RZ)).normalized()
            q = n.to_track_quat('Z', 'Y'); c = cols[k % 2]
            for j in range(5):                          # five petals round a yellow eye
                pa = j / 5 * math.tau; off = q @ Vector((math.cos(pa) * 0.018, math.sin(pa) * 0.018, 0))
                objs.append(sphere('vbupetal', 0.016, tuple(p + off), (1, 0.75, 0.3), (q @ Quaternion((0, 0, 1), pa)).to_euler(), m=c, ico=1))
            objs.append(sphere('vbueye', 0.009, tuple(p + n * 0.006), (1, 1, 0.6), q.to_euler(), m=eye, ico=1))
    return finish(objs, name)


def apple_tub_v(seed=149, name='apple_tub'):
    """The Glutton's apple tree (6 Nov 2026, Audrey: "Do we still have the apple trees for the gloutons chickens?"; "Yes, with
    the apple egg"): a little apple tree in a wooden half-barrel, planted in the yard of a coop where a Glutton hen lives.
    The tub (oak staves, two iron hoops, dark earth), a short crooked trunk splitting into four branches, a round crown of
    small oval leaves over dark leafy clumps, lighter on top; no apples (the browser hangs them, as many as have ripened,
    just under the crown's edge at about 0.53 m, where she can reach them with a hop). About 1.05 m high, the crown 0.56 m
    across and its foot at 0.62, the tub 0.34 across."""
    from mathutils import Quaternion
    random.seed(seed); objs = []
    wood = C('vatwood', '#9a6b42', rough=0.85, var=0.08); hoop = C('vathoop', '#4b4844', rough=0.5, metal=0.6)
    soil = C('vatsoil', '#4a3424', rough=1.0, var=0.1); bark = C('vatbark', '#6b4a32', rough=0.95, var=0.1)
    leaf = [C('vatleaf%d' % i, h, rough=0.8, var=0.06, hue_var=0.012) for i, h in enumerate(('#2f6324', '#3d7a2b', '#4c8d33', '#5d9f3b'))]
    core = C('vatcore', '#2c5a22', rough=0.9, var=0.05)
    # the tub: a half barrel, its staves bulging a little, its joints, two hoops, the earth just below its rim
    R, H = 0.17, 0.22
    prof = [(R * 0.86, 0.0), (R * 0.95, H * 0.45), (R, H)]
    objs.append(lathe('vattub', prof, wood, verts=18, cap_bottom=True))
    objs.append(lathe('vatin', [(R * 0.94, H), (R * 0.9, H * 0.6)], wood, verts=18))      # (the inside of its rim)
    for k in range(18):
        a = k / 18 * math.tau
        pts = [Vector((math.cos(a) * (rr + 0.002), math.sin(a) * (rr + 0.002), z)) for rr, z in prof]
        for p0, p1 in zip(pts, pts[1:]):
            objs.append(plank('vatstave', p0, p1, 0.006, 0.004, (math.cos(a), math.sin(a), 0), C('vatjoint', '#4a3020', rough=0.9), jitter=0.0, bevel=0.0))
    for z, rr in ((H * 0.2, R * 0.9), (H * 0.78, R * 0.985)):
        objs.append(cyl('vathoop', rr + 0.008, 0.028, (0, 0, z), m=hoop, verts=18, bevel=0.0))
    objs.append(cyl('vatsoil', R * 0.92, 0.02, (0, 0, H - 0.03), m=soil, verts=18, bevel=0.0))
    # the trunk: a little crooked, thicker at its foot, splitting at 0.56 m into four branches up and out into the crown
    T0, T1 = Vector((0, 0, H - 0.03)), Vector((0.012, -0.01, 0.56))
    objs.append(cyl('vattrunk', 0.03, (T1 - T0).length, tuple((T0 + T1) / 2), (T1 - T0).to_track_quat('Z', 'Y').to_euler(), m=bark, verts=8, r2=0.022, bevel=0.0))
    objs.append(sphere('vatknot', 0.024, tuple(T1), m=bark, ico=1))
    for k in range(4):
        a = k / 4 * math.tau + 0.4 + random.uniform(-0.2, 0.2)
        E = Vector((math.cos(a) * 0.15, math.sin(a) * 0.15, 0.74 + random.uniform(-0.02, 0.04)))
        objs.append(cyl('vatbranch', 0.015, (E - T1).length, tuple((T1 + E) / 2), (E - T1).to_track_quat('Z', 'Y').to_euler(), m=bark, verts=6, r2=0.009, bevel=0.0))
    # the crown: a dark core of clumps (its shade), leaves all over it standing a little off it, smaller and lighter on top
    C0, RX, RZ = Vector((0, 0, 0.84)), 0.25, 0.2
    objs.append(sphere('vatcore', 1.0, tuple(C0), (RX * 0.92, RX * 0.92, RZ * 0.92), m=core, ico=3, disp=0.12, disp_scale=3.0, seed=seed))
    for k in range(7):
        a = k / 7 * math.tau + random.uniform(-0.2, 0.2); el = random.uniform(-0.2, 0.6)
        d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
        objs.append(sphere('vatclump', random.uniform(0.1, 0.12), tuple(C0 + Vector((d.x * RX * 0.62, d.y * RX * 0.62, d.z * RZ * 0.6))), (1, 1, 0.85), m=core, ico=2, disp=0.25, disp_scale=4.0, seed=seed * 10 + k))
    for k in range(900):
        a = random.uniform(0, math.tau); el = math.asin(random.uniform(-0.75, 1.0))
        d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
        p = C0 + Vector((d.x * RX, d.y * RX, d.z * RZ)) * random.uniform(0.96, 1.08)
        n = Vector((d.x / RX, d.y / RX, d.z / RZ)).normalized()
        q = n.to_track_quat('Z', 'Y') @ Quaternion((0, 0, 1), random.uniform(0, math.tau)) @ Quaternion((1, 0, 0), random.uniform(0.25, 0.6))      # (its tip lifted off the crown)
        tone = leaf[min(3, max(0, int((el + 0.75) / 1.75 * 4 + random.uniform(-0.6, 0.6))))]
        objs.append(flat_leaf('vatleafy', tuple(p), q, random.uniform(0.042, 0.056), random.uniform(0.014, 0.019), tone, both=False, fold=0.004))
    return finish(objs, name)


def rock_v(seed=142, name='rock_a'):
    """A field stone: a lumpy grey boulder in two tones, a patch of moss on top, a pebble beside it."""
    random.seed(seed); objs = []
    grey = C('vrkgrey%d' % seed, ('#9a958a', '#8f8a80')[seed % 2], rough=0.85, var=0.1); moss = C('vrkmoss', '#7a9a4a', rough=0.9, var=0.1)
    objs.append(sphere('vrkrock', 0.15, (0, 0, 0.06), (1.2, 1.0, 0.68), (0, 0, random.uniform(0, 3)), m=grey, ico=2, disp=0.22, disp_scale=2.5, seed=seed))
    objs.append(sphere('vrkmoss', 0.06, (-0.03, 0.03, 0.125), (1.5, 1.1, 0.16), (0, math.radians(-12), 0), m=moss, ico=1, disp=0.2, seed=seed + 5))      # (a thin patch of moss, half sunk in its top)
    objs.append(sphere('vrkpebble', 0.035, (0.17, -0.06, 0.012), (1.3, 1.0, 0.6), m=grey, ico=1, disp=0.15, seed=seed + 9))
    return finish(objs, name)


# ------------------------------------------------------------------ the picket fence
def picket_fence_v(seed=143, name='picket_fence', L=2.0, h=0.5):
    """A white picket fence: pointed pickets (each a little different), two rails behind, a capped post at each end."""
    random.seed(seed); objs = []
    white = [C('vpfwhite%d' % i, h_, rough=0.6, var=0.03) for i, h_ in enumerate(('#f3f0e6', '#ebe7db'))]
    n = int(L / 0.14)
    for i in range(1, n):
        x = -L / 2 + i * L / n; hh = h - 0.04 + random.uniform(-0.01, 0.01)
        c = random.choice(white)
        objs.append(box('vpfpicket', (0.06, 0.022, hh - 0.05), (x, 0, (hh - 0.05) / 2), (0, random.uniform(-0.02, 0.02), 0), m=c, bevel=0.004, segs=1))
        me = bpy.data.meshes.new('vpftip'); bm = bmesh.new()
        vs = [[bm.verts.new((x + dx, dy, z)) for (dx, z) in ((-0.03, hh - 0.05), (0.03, hh - 0.05), (0, hh))] for dy in (-0.011, 0.011)]
        bm.faces.new(vs[0]); bm.faces.new(vs[1][::-1])
        for k in range(3): bm.faces.new((vs[0][k], vs[1][k], vs[1][(k + 1) % 3], vs[0][(k + 1) % 3]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
        o = link(bpy.data.objects.new('vpftip', me)); setmat(o, c); objs.append(o)
    for z in (0.14, 0.36):
        objs.append(box('vpfrail', (L, 0.025, 0.05), (0, 0.022, z), m=white[1], bevel=0.004, segs=1))
    for sx in (-1, 1):
        objs.append(box('vpfpost', (0.07, 0.07, h + 0.04), (sx * L / 2, 0.01, (h + 0.04) / 2), m=white[0], bevel=0.006, segs=1))
        objs.append(cyl('vpfcap', 0.03, 0.04, (sx * L / 2, 0.01, h + 0.06), m=white[0], verts=8, r2=0.01, bevel=0.0))
    return finish(objs, name)


# ------------------------------------------------------------------ toadstools
def mushrooms_v(seed=144, name='mushrooms'):
    """A ring of toadstools in the grass: red caps with white spots, pale gills beneath, cream stems with a little skirt;
    moss and a few blades of grass round them."""
    random.seed(seed); objs = []
    red = C('vmsred', '#c8322c', rough=0.45); white = C('vmswhite', '#f6f1e2', rough=0.6); gill = C('vmsgill', '#e8dcc0', rough=0.8)
    for (x, y, s) in ((0.0, 0.0, 1.0), (0.12, 0.05, 0.7), (-0.08, 0.1, 0.8), (0.06, -0.09, 0.55), (-0.13, -0.04, 0.45)):
        h = 0.085 * s
        objs.append(cyl('vmsstem', 0.018 * s, h, (x, y, h / 2), m=white, verts=8, r2=0.014 * s, bevel=0.0))
        objs.append(cyl('vmsskirt', 0.024 * s, 0.008, (x, y, h * 0.7), m=white, verts=8, r2=0.016 * s, bevel=0.0))
        objs.append(cyl('vmsgill', 0.055 * s, 0.006, (x, y, h + 0.002), m=gill, verts=12, bevel=0.0))
        objs.append(sphere('vmscap', 0.06 * s, (x, y, h + 0.004), (1, 1, 0.62), m=red, seg=12, rings=6))
        for k in range(6):                              # white spots on the cap
            a = k / 6 * math.tau + random.uniform(0, 0.5); el = random.uniform(0.35, 1.2)
            p = (x + math.cos(a) * 0.058 * s * math.cos(el), y + math.sin(a) * 0.058 * s * math.cos(el), h + 0.004 + 0.06 * s * 0.62 * math.sin(el))
            objs.append(sphere('vmsspot', 0.009 * s, p, (1, 1, 0.5), m=white, ico=1))
    for k in range(4):                                  # grass round them
        a = k / 4 * math.tau + 0.4
        tuft(objs, math.cos(a) * 0.17, math.sin(a) * 0.14, 7, 0.05, 0.1, [C('vmsgrass', '#5f9a3c', rough=0.8), C('vmsgrass2', '#4f8a33', rough=0.8)], width=0.016)
    return finish(objs, name)


# ------------------------------------------------------------------ the sunflowers
def star_disc(name, r_out, r_in, n, c, tilt, m, t=0.012, cup=0.0):
    """A ring of n pointed petals (a star) round c, tilted back by tilt about x; cup: the petals' tips brought forward (-y)
    by that much, so the flower is a shallow cup, not a flat disc."""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); R = Matrix.Rotation(tilt, 4, 'X'); C0 = Vector(c); rings = []
    for dz in (-t / 2, t / 2):
        ring = []
        for k in range(2 * n):
            a = k / (2 * n) * math.tau; rr = r_out if k % 2 == 0 else r_in; fw = cup * (rr / r_out) ** 2
            ring.append(bm.verts.new(C0 + R @ Vector((math.cos(a) * rr, dz - fw, math.sin(a) * rr))))
        rings.append(ring)
    bm.faces.new(rings[0]); bm.faces.new(rings[1][::-1])
    N = 2 * n
    for k in range(N): bm.faces.new((rings[0][k], rings[0][(k + 1) % N], rings[1][(k + 1) % N], rings[1][k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m)
    return o


def sunflowers_v(seed=145, name='sunflowers', w=3.6, d=1.8):
    """A bed of sunflowers: tall stems of different heights, each with three broad heart-shaped leaves; heads of golden
    pointed petals in two cupped rings (the inner turned half a petal), round a domed dark seed centre with a paler rim, all
    facing the sun and the player, tipped back a little more or less; a little edging of boards. (6 Nov 2026, Audrey:
    "Details of the ... sunflowers need to be improved": flat star discs, some nodding edge-on, small leaves.)"""
    from mathutils import Quaternion
    random.seed(seed); objs = []
    soil = C('vsfsoil', '#5a3f2c', rough=0.95, var=0.06); wood = C('vsfwood', '#8a5d3a', rough=0.75, var=0.1)
    stem = C('vsfstem', '#4f7f2e', rough=0.7); leaf = [C('vsfleaf%d' % i, h, rough=0.75, var=0.06) for i, h in enumerate(('#467f2f', '#55923a', '#64a443'))]
    petal = [C('vsfpetal%d' % i, h, rough=0.5) for i, h in enumerate(('#f2b51e', '#f7c531', '#eaa514', '#fbd04a'))]
    centre = C('vsfcentre', '#3f220e', rough=0.85); seeds = C('vsfseeds', '#5c3416', rough=0.85); rim = C('vsfrim', '#7a4a1e', rough=0.85)
    objs.append(box('vsfbed', (w, d, 0.06), (0, 0, 0.03), m=soil, bevel=0.0))
    for sy in (-1, 1): objs.append(box('vsfedge', (w + 0.04, 0.035, 0.09), (0, sy * d / 2, 0.045), m=wood, bevel=0.005, segs=1))
    for sx in (-1, 1): objs.append(box('vsfedge', (0.035, d, 0.09), (sx * w / 2, 0, 0.045), m=wood, bevel=0.005, segs=1))
    for r in range(int(d / 0.45)):
        for i in range(int(w / 0.42)):
            x = -w / 2 + 0.25 + i * 0.42 + random.uniform(-0.05, 0.05); y = -d / 2 + 0.25 + r * 0.45 + random.uniform(-0.04, 0.04)
            h = random.uniform(0.85, 1.2) + r * 0.05; sz = random.uniform(0.88, 1.12)
            objs.append(cyl('vsfstem', 0.022, h, (x, y, h / 2), m=stem, verts=7, r2=0.015, bevel=0.0))
            for k in range(3):                          # broad heart-shaped leaves, out to either side in turn, drooping
                sd = 1 if (k + i) % 2 else -1; z = h * (0.26 + 0.2 * k); L = 0.2 - 0.025 * k
                yaw = (0 if sd > 0 else math.pi) + random.uniform(-0.45, 0.45)
                q = Quaternion((0, 0, 1), yaw - math.pi / 2) @ Quaternion((1, 0, 0), math.radians(random.uniform(-32, -10))) @ Quaternion((0, 1, 0), random.uniform(-0.3, 0.3))      # (out from the stem, drooping, its face up)
                objs.append(flat_leaf('vsfleaf', (x, y, z), q, L, L * 0.38, random.choice(leaf), shape='heart', fold=0.012))
            tilt = math.radians(random.uniform(8, 30)); c = Vector((x, y - 0.03, h + 0.02)); Rt = Matrix.Rotation(tilt, 4, 'X')
            objs.append(star_disc('vsfpetals', 0.18 * sz, 0.1 * sz, 15, c, tilt, random.choice(petal[:3]), cup=0.05 * sz))
            q = star_disc('vsfpetals2', 0.15 * sz, 0.09 * sz, 15, Vector((0, 0, 0)), 0.0, random.choice((petal[2], petal[3])), cup=0.035 * sz)      # (the inner ring turned half a petal: no gaps)
            q.matrix_world = Matrix.Translation(c + Rt @ Vector((0, -0.008, 0))) @ Rt @ Matrix.Rotation(math.pi / 15, 4, 'Y'); objs.append(q)
            objs.append(cyl('vsfrim', 0.085 * sz, 0.02, tuple(c + Rt @ Vector((0, -0.01, 0))), (math.radians(90) + tilt, 0, 0), m=rim, verts=16, bevel=0.0))
            objs.append(sphere('vsfcentre', 0.072 * sz, tuple(c + Rt @ Vector((0, -0.016, 0))), (1, 0.42, 1), (tilt, 0, 0), m=centre, seg=14, rings=7))
            objs.append(sphere('vsfseeds', 0.04 * sz, tuple(c + Rt @ Vector((0, -0.038, 0))), (1, 0.4, 1), (tilt, 0, 0), m=seeds, seg=10, rings=5))
            objs.append(sphere('vsfback', 0.07 * sz, tuple(c + Rt @ Vector((0, 0.02, 0))), (1, 0.35, 1), (tilt, 0, 0), m=random.choice(leaf), seg=10, rings=5))      # (the green back of the head)
    return finish(objs, name)


# ------------------------------------------------------------------ the pasture and its shelter
def pasture_v(seed=146, name='pasture', W=6.0, D=4.6, gate=0.9):
    """The pasture's fence: split rails between weathered posts with rounded tops (the posts each a little different), and
    a five-bar farm gate with its diagonal brace in the front (where the old one's opening was), its latch post."""
    random.seed(seed); objs = []
    woods = [C('vpawood%d' % i, h, rough=0.85, var=0.1) for i, h in enumerate(('#7a5a3e', '#6f5137', '#857049'))]
    gx0, gx1 = -gate / 2 - 0.15, gate / 2 - 0.15
    def run(x0, y0, x1, y1, skip=None):
        L = math.hypot(x1 - x0, y1 - y0); n = max(1, round(L / 0.76)); ang = math.atan2(y1 - y0, x1 - x0)
        P = [(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n) for i in range(n + 1)]
        for (px, py) in P:
            if skip and skip[0] + 0.06 < px < skip[1] - 0.06 and abs(py - y0) < 0.01: continue
            hh = 0.4 + random.uniform(-0.03, 0.03)
            objs.append(box('vpapost', (0.065, 0.065, hh), (px, py, hh / 2), (random.uniform(-.04, .04), random.uniform(-.04, .04), ang), m=random.choice(woods), bevel=0.012, segs=1))
        for z in (0.13, 0.25, 0.36):
            segs_ = [(x0, skip[0]), (skip[1], x1)] if skip else [(None, None)]
            for (a, b_) in segs_:
                if a is None: A, B = Vector((x0, y0, z)), Vector((x1, y1, z))
                else: A, B = Vector((a, y0, z)), Vector((b_, y0, z))
                if (B - A).length < 0.1: continue
                k = max(1, round((B - A).length / 0.76))
                for j in range(k):                   # rails post to post, each with a little sag
                    p, q = A.lerp(B, j / k), A.lerp(B, (j + 1) / k)
                    m_ = (p + q) / 2 - Vector((0, 0, random.uniform(0.0, 0.012)))
                    objs.append(plank('vparail', p, m_, 0.05, 0.03, (-math.sin(ang), math.cos(ang), 0), random.choice(woods), jitter=0.3, bevel=0.004))
                    objs.append(plank('vparail', m_, q, 0.05, 0.03, (-math.sin(ang), math.cos(ang), 0), random.choice(woods), jitter=0.3, bevel=0.004))
    w, d = W / 2, D / 2
    run(-w, -d, w, -d, skip=(gx0, gx1)); run(-w, d, w, d); run(-w, -d, -w, d); run(w, -d, w, d)
    for gx in (gx0, gx1):                               # the gate posts, taller
        objs.append(box('vpagatepost', (0.085, 0.085, 0.48), (gx, -d, 0.24), m=woods[1], bevel=0.012, segs=1))
    gw = gx1 - gx0 - 0.1; g0 = gx0 + 0.05
    for k in range(5):                                  # the five bars, the brace, the uprights
        z = 0.08 + k * 0.07
        objs.append(box('vpagate', (gw, 0.03, 0.035), (g0 + gw / 2, -d, z), m=woods[2], bevel=0.004, segs=1))
    for x in (g0 + 0.02, g0 + gw / 2, g0 + gw - 0.02):
        objs.append(box('vpagateup', (0.04, 0.032, 0.32), (x, -d, 0.22), m=woods[2], bevel=0.004, segs=1))
    objs.append(plank('vpabrace', (g0 + 0.03, -d - 0.02, 0.08), (g0 + gw - 0.03, -d - 0.02, 0.36), 0.04, 0.025, (0, -1, 0), woods[2], jitter=0.0))
    objs.append(box('vpalatch', (0.06, 0.02, 0.02), (gx1 - 0.02, -d - 0.03, 0.3), m=C('vpairon', '#3a3a38', rough=0.5), bevel=0.0))
    return finish(objs, name)


def pasture_shelter_v(seed=147, name='pasture_shelter'):
    """A field shelter, open at the front: corner posts, walls of upright boards on three sides, a sloping roof of shingles
    with a barge board, straw on the floor, a hay rack on the back wall full of hay; a galvanised trough beside it with water."""
    random.seed(seed); objs = []
    W, D, hf, hb = 1.6, 0.9, 0.95, 0.65
    wood = [C('vpswood%d' % i, h, rough=0.8, var=0.1) for i, h in enumerate(('#7a5536', '#6b4a30', '#86603e'))]
    roof = [C('vpsroof%d' % i, h, rough=0.7, var=0.06) for i, h in enumerate(('#5d6a6e', '#525e62', '#67757a'))]
    ms = straw_ms(); galv = C('vpsgalv', '#9ea4a6', rough=0.35, metal=0.8); water = C('vpswater', '#5f8fa8', rough=0.1)
    for sx in (-1, 1):
        objs.append(box('vpspost', (0.08, 0.08, hf), (sx * W / 2, -D / 2, hf / 2), m=wood[1], bevel=0.008, segs=1))
        objs.append(box('vpspost', (0.08, 0.08, hb), (sx * W / 2, D / 2, hb / 2), m=wood[1], bevel=0.008, segs=1))
        n = 7
        for k in range(n):                              # the side walls: boards up to the roof's slope
            y = -D / 2 + 0.06 + k * (D - 0.12) / (n - 1); top = hf - (hf - hb) * (y + D / 2) / D - 0.02
            objs.append(box('vpsboard', (0.025, (D - 0.12) / n - 0.006, top - 0.04), (sx * W / 2, y, (top + 0.04) / 2), m=random.choice(wood), bevel=0.003, segs=1))
    for k in range(13):                                 # the back wall
        x = -W / 2 + 0.06 + k * (W - 0.12) / 12
        objs.append(box('vpsboard', ((W - 0.12) / 13 - 0.006, 0.025, hb - 0.06), (x, D / 2, (hb - 0.02) / 2), m=random.choice(wood), bevel=0.003, segs=1))
    objs.append(box('vpsplate', (W + 0.08, 0.07, 0.07), (0, -D / 2, hf - 0.02), m=wood[0], bevel=0.006, segs=1))
    # the roof: shingles in rows down the slope
    a = math.atan2(hf - hb, D); SL = math.hypot(D, hf - hb) + 0.24; up = Vector((0, -math.cos(a), math.sin(a))); nrm = Vector((0, math.sin(a), math.cos(a)))
    top = Vector((0, D / 2 + 0.1, hb + 0.04)); bot = top + up * SL
    objs.append(box('vpsroofb', (W + 0.24, SL, 0.025), tuple((top + bot) / 2), (-a, 0, 0), m=roof[1], bevel=0.0))
    rows = 7
    for r in range(rows):
        p0 = bot.lerp(top, r / rows)
        for k in range(9):
            x = -(W + 0.24) / 2 + (k + 0.5 + (0.5 if r % 2 else 0)) * (W + 0.24) / 9
            if x > (W + 0.24) / 2: continue
            q0 = p0 + Vector((x, 0, 0)) + nrm * (0.016 + 0.004 * (r % 2)); q1 = q0 - up * (SL / rows + 0.03)
            objs.append(plank('vpssh', q0, q1, (W + 0.24) / 9 - 0.008, 0.014, tuple(nrm), random.choice(roof), jitter=0.5, bevel=0.0))
    for sx in (-1, 1):
        objs.append(plank('vpsbarge', top + Vector((sx * (W / 2 + 0.12), 0, 0.02)), bot + Vector((sx * (W / 2 + 0.12), 0, 0.02)), 0.06, 0.02, (sx, 0, 0), wood[0], jitter=0.1, bevel=0.0))
    # straw on the floor, the hay rack and its hay
    objs.append(box('vpsstraw', (W - 0.1, D - 0.1, 0.04), (0, 0.02, 0.02), m=ms[0], bevel=0.01, segs=1))
    for k in range(30):
        x, y = random.uniform(-W / 2 + 0.1, W / 2 - 0.1), random.uniform(-D / 2 + 0.08, D / 2 - 0.1)
        objs.append(plank('vpsstrand', (x, y, 0.042), (x + random.uniform(-0.08, 0.08), y + random.uniform(-0.08, 0.08), 0.042), 0.01, 0.003, (0, 0, 1), random.choice(ms[1:]), jitter=0.0, bevel=0.0))
    rx = -0.3
    objs.append(box('vpsrack', (0.7, 0.03, 0.03), (rx, D / 2 - 0.05, 0.62), m=wood[0], bevel=0.004, segs=1))
    objs.append(box('vpsrack', (0.7, 0.03, 0.03), (rx, D / 2 - 0.22, 0.42), m=wood[0], bevel=0.004, segs=1))
    for k in range(8):
        x = rx - 0.33 + k * 0.094
        objs.append(plank('vpsrackbar', (x, D / 2 - 0.22, 0.42), (x, D / 2 - 0.05, 0.62), 0.015, 0.015, (0, -1, 0), wood[0], jitter=0.0, bevel=0.0))
    objs.append(sphere('vpshay', 0.18, (rx, D / 2 - 0.1, 0.56), (1.9, 0.6, 0.55), m=ms[0], ico=1, disp=0.3, seed=7))
    for k in range(12):
        x = rx + random.uniform(-0.3, 0.3)
        objs.append(plank('vpshaystrand', (x, D / 2 - 0.2, 0.55), (x + random.uniform(-0.05, 0.05), D / 2 - 0.26, 0.45), 0.01, 0.004, (0, -1, 0), random.choice(ms[1:]), jitter=6.0, bevel=0.0))
    # the trough beside it
    tx, ty = W / 2 + 0.55, -0.4
    objs.append(lathe('vpstrough', [(0.0, 0.02), (0.1, 0.02), (0.12, 0.2), (0.135, 0.22), (0.125, 0.235), (0.11, 0.22), (0.095, 0.05), (0.0, 0.05)], galv, verts=16))
    objs[-1].scale = (2.6, 1.0, 1.0); objs[-1].location = (tx, ty, 0)
    objs.append(cyl('vpswater', 0.11, 0.008, (tx, ty, 0.2), m=water, verts=16, bevel=0.0)); objs[-1].scale = (2.6, 1.0, 1.0)
    for sx in (-1, 1): objs.append(box('vpsfoot', (0.04, 0.24, 0.03), (tx + sx * 0.22, ty, 0.015), m=galv, bevel=0.0))
    return finish(objs, name)
