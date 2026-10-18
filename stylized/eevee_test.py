import bpy, sys
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
print('engines', [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items])
bpy.ops.mesh.primitive_monkey_add()
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); cam.location=(0,-4,1); cam.rotation_euler=(1.4,0,0); sc.camera=cam
l = bpy.data.objects.new('sun', bpy.data.lights.new('sun','SUN')); sc.collection.objects.link(l)
sc.render.resolution_x = sc.render.resolution_y = 128
for eng in ['BLENDER_EEVEE_NEXT','BLENDER_EEVEE','BLENDER_WORKBENCH']:
    try:
        sc.render.engine = eng; sc.render.filepath = f'/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad/sty/test_{eng}.png'
        bpy.ops.render.render(write_still=True); print('OK', eng)
    except Exception as e: print('FAIL', eng, e)
