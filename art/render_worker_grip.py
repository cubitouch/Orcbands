"""Fast visual QA of the *actual exported* worker-orc GLB hand/axe interface.

Not a replacement for the full art review. Captures close views and whole-character views using the
same GLB that the web preview will publish. CPU Blender, no Unity required.
"""
import bpy, sys
from mathutils import Vector
from pathlib import Path
args=sys.argv[sys.argv.index('--')+1:]
source=Path(args[args.index('--input')+1])
out=Path(args[args.index('--output')+1]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
mesh=[obj for obj in bpy.context.scene.objects if obj.type=='MESH']
if not mesh:raise RuntimeError("Exported GLB contains no mesh")
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=18
scene.cycles.use_denoising=False
scene.render.resolution_x=720
scene.render.resolution_y=720
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='Standard'
world=bpy.data.worlds.new('Hand review ambient')
scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.20,.22,.20,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.7
def light(location,power,size):
 bpy.ops.object.light_add(type='AREA',location=location)
 obj=bpy.context.object;obj.data.energy=power;obj.data.size=size
 obj.rotation_euler=(Vector((1.1,0,1.1))-obj.location).to_track_quat('-Z','Y').to_euler()
light((-.5,-4,5),540,5)
light((4,2,4),320,5)
bpy.ops.object.camera_add()
camera=bpy.context.object
scene.camera=camera
camera.data.type='ORTHO'
# Isolated medial view exposes contact otherwise obscured by the torso.
for name,cam,point,scale,isolate in [
 ("front-grip",(1.13,-5,1.10),(1.13,-.27,1.02),.85,False),
 ("inside-palm",(-4,-.35,1.12),(1.13,-.27,1.02),.85,True),
 ("outside-knuckles",(5,-.35,1.12),(1.13,-.27,1.02),.85,False),
 ("rear-grip",(1.13,5,1.12),(1.13,-.27,1.02),.85,False),
 ("three-quarter-grip",(3,-4,2),(1.13,-.27,1.02),1.10,False),
 ("right-empty-hand",(-4,-4,1.2),(-1.12,-.17,1.03),.90,False),
 ("front-full",(0,-7,3.0),(0,0,1.5),4.3,False),
 ("three-quarter-full",(5,-8,5.5),(0,0,1.5),4.4,False),
 ("back-full",(0,7,3.0),(0,0,1.5),4.3,False)]:
 for obj in mesh:
  obj.hide_render=isolate and not (obj.get('anatomical_side')=='L' or obj.get('character_prop')=='hatchet')
 camera.location=cam
 camera.rotation_euler=(Vector(point)-camera.location).to_track_quat('-Z','Y').to_euler()
 camera.data.ortho_scale=scale
 scene.render.filepath=str(out/(name+'.png'))
 bpy.ops.render.render(write_still=True)
 print('RENDERED_GRIP_QA',name,flush=True)
