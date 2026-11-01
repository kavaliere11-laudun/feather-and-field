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
