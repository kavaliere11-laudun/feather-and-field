"""Shared farm camera, light and projection. Orthographic, so a coop image fits any spot on the map."""
import math

PITCH, YAW = 42.0, 45.0
PPU = 80.0                       # map pixels per metre: the map and every overlay use this
R2 = 0.7071067811865476


def uv_to_world(u, v):
    """u runs across the screen to the right, v runs up the screen along the ground."""
    return (u * R2 - v * R2, u * R2 + v * R2)


def basis():
    p, y = math.radians(PITCH), math.radians(YAW)
    d = (math.sin(y) * math.cos(p), -math.cos(y) * math.cos(p), math.sin(p))      # from target towards camera
    f = tuple(-c for c in d)
    zf = f[2]
    up = (-zf * f[0], -zf * f[1], 1 - zf * f[2]); n = math.sqrt(sum(c * c for c in up)); up = tuple(c / n for c in up)
    right = (f[1] * up[2] - f[2] * up[1], f[2] * up[0] - f[0] * up[2], f[0] * up[1] - f[1] * up[0])
    return d, right, up


def project(p, target, width, height):
    """World point -> image pixel for a render of width x height centred on target."""
    _, right, up = basis()
    q = (p[0] - target[0], p[1] - target[1], (p[2] if len(p) > 2 else 0.0) - (target[2] if len(target) > 2 else 0.0))
    x = width / 2 + sum(a * b for a, b in zip(q, right)) * PPU
    y = height / 2 - sum(a * b for a, b in zip(q, up)) * PPU
    return x, y


def setup(scn, target, width, height, samples=28, transparent=False):
    import bpy
    from mathutils import Vector
    d, _, _ = basis()
    t = Vector((target[0], target[1], target[2] if len(target) > 2 else 0.0))
    bpy.ops.object.camera_add(location=t + Vector(d) * 80)
    cam = bpy.context.object; cam.rotation_euler = (-Vector(d)).to_track_quat('-Z', 'Y').to_euler()
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = max(width, height) / PPU; cam.data.clip_end = 300; scn.camera = cam
    bpy.ops.object.light_add(type='SUN')
    sun = bpy.context.object; sd = Vector((-0.55, 0.45, 0.7)).normalized()
    sun.rotation_euler = (-sd).to_track_quat('-Z', 'Y').to_euler()
    sun.data.energy = 4.2; sun.data.angle = math.radians(3); sun.data.color = (1.0, 0.93, 0.82)
    w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.7, 0.95, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.85
    scn.render.engine = 'CYCLES'; scn.cycles.device = 'CPU'; scn.cycles.samples = samples
    scn.cycles.use_denoising = True; scn.cycles.max_bounces = 4
    scn.render.threads_mode = 'FIXED'; scn.render.threads = 2
    scn.render.resolution_x = width; scn.render.resolution_y = height
    scn.render.film_transparent = transparent
    scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Medium High Contrast'
    import os
    if os.environ.get('STYLE') == 'fv':      # brighter, warmer, softer shadows: closer to FarmVille 3
        sun.data.angle = math.radians(9); sun.data.energy = 3.7; sun.data.color = (1.0, 0.94, 0.84)
        w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.62, 0.76, 1.0, 1)
        w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.2
        scn.view_settings.look = 'AgX - Punchy'; scn.view_settings.exposure = 0.12
