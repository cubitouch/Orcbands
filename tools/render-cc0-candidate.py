import bpy, math, sys
from pathlib import Path
from mathutils import Vector
out=Path('source-review')
source=Path((out/'selected-fbx.txt').read_text().strip())
for ob in list(bpy.data.objects):bpy.data.objects.remove(ob,do_unlink=True)
bpy.ops.import_scene.fbx(filepath=str(source),use_anim=False)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
for obj in bpy.context.scene.objects: obj.hide_render=False
if not meshes:raise RuntimeError('FBX had no meshes')
# Diagnostic material override: force opaque on any unconfigured FBX atlas.
bpy.context.view_layer.update()
debug=bpy.data.materials.new('Debug character opaque green')
debug.use_nodes=True
p=debug.node_tree.nodes.get('Principled BSDF')
p.inputs['Base Color'].default_value=(.33,.50,.20,1)
p.inputs['Alpha'].default_value=1
for obj in meshes:
  obj.hide_render=False
  obj.hide_set(False)
  obj.data.materials.clear()
  obj.data.materials.append(debug)
  print('MESH',obj.name,'visible',obj.visible_get(),'hide_render',obj.hide_render,'verts',len(obj.data.vertices),'parent',obj.parent.name if obj.parent else None)
bpy.context.view_layer.update()
lo=Vector((float('inf'),)*3);hi=Vector((float('-inf'),)*3)
for o in meshes:
  for v in o.bound_box:
    p=o.matrix_world@Vector(v)
    for k in range(3):
      lo[k]=min(lo[k],p[k]);hi[k]=max(hi[k],p[k])
center=(lo+hi)/2;length=max((hi-lo).length,0.5)
print('SOURCE MODEL',source,'mesh count',len(meshes),'dimensions',hi-lo,'center',center,'bbox',lo,hi)
bpy.ops.mesh.primitive_cube_add(size=length*.16,location=center+Vector((0,-.5*length,0)))
marker=bpy.context.object;marker.name='DEBUG bounding center marker';marker.data.materials.append(debug)
def point(lightpos,power,size):
  bpy.ops.object.light_add(type='AREA',location=center+Vector(lightpos)*length)
  x=bpy.context.object;x.data.energy=power;x.data.size=size*length
  x.rotation_euler=(center-x.location).to_track_quat('-Z','Y').to_euler()
point((-1,-1,1.8),750,1.0);point((1,0.5,1.3),500,1.0)
bpy.ops.object.camera_add(location=center+Vector((1,-2,1.1))*length)
camera=bpy.context.object;bpy.context.scene.camera=camera
camera.data.type='ORTHO';camera.data.ortho_scale=length*1.3
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=16;scene.cycles.use_denoising=False
scene.render.resolution_x=680;scene.render.resolution_y=680
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.world.color=(.19,.20,.18)
bpy.ops.object.light_add(type='SUN',location=center+Vector((-1,-1,2))*length)
bpy.context.object.data.energy=1.0
for name,v in [('candidate-front.png',(0,-2,.55)),('candidate-three-quarter.png',(1.5,-2.5,1.3))]:
  camera.location=center+Vector(v)*length
  camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
  scene.render.filepath=str(out/name)
  bpy.ops.render.render(write_still=True)
print('RENDERED CC0 CANDIDATE',source)
