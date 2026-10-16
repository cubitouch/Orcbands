"""Rig and animate the *real* Blender Worker Orc mesh from the art pipeline.

Input: editable .blend built by worker_orc_vnext.py --export-only
Output: experimental deforming/skinned GLB, Blender source, posed CI captures.
NOT Unity-Humanoid validated or production-quality animation.
No third-party assets.
"""
import bpy, math, sys, json
from pathlib import Path
from mathutils import Vector

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
def flag(name,default):
    return args[args.index(name)+1] if name in args else default
src=Path(flag('--input','art-review/worker-orc-vnext.blend')).resolve()
out=Path(flag('--output','art-review')).resolve()
out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(src))
# Blender art uses Bezier curves for straps, seams and axe-wrap details.
# A glTF export renders those curves, but an Armature modifier cannot skin
# them: until now they remained in bind pose and floated as the limbs moved.
# Convert EVERY curve to a proper mesh BEFORE building the bone skinning.
curves=[o for o in bpy.context.scene.objects if o.type=='CURVE']
for curve in curves:
    bpy.ops.object.select_all(action='DESELECT')
    curve.select_set(True)
    bpy.context.view_layer.objects.active=curve
    bpy.ops.object.convert(target='MESH')
character=[o for o in bpy.context.scene.objects if o.type=='MESH']
print('Skinnable objects:',len(character),'converted decorative curves:',len(curves))
if len(character)<20: raise RuntimeError('Expected the authored original orc meshes')
if any(o.type=='ARMATURE' for o in bpy.context.scene.objects):raise RuntimeError('Already rigged')
bpy.ops.object.armature_add(enter_editmode=True, location=(0,0,0))
rig=bpy.context.object;rig.name='Orcbands_Worker_Rig'
rig.data.name='Orcbands Humanoid-oriented hierarchy'
rig.show_in_front=True
rig.data.edit_bones.remove(rig.data.edit_bones[0])
spec=[
 ('Hips',None,(0,0,1.04),(0,0,1.26)),
 ('Spine','Hips',(0,0,1.26),(0,0,1.67)),
 ('Chest','Spine',(0,0,1.67),(0,0,2.06)),
 ('Neck','Chest',(0,0,2.06),(0,0,2.27)),
 ('Head','Neck',(0,0,2.27),(0,0,2.80))
]
for suffix,s in [('L',-1),('R',1)]:
    spec.extend([
      (f'UpperLeg.{suffix}','Hips',(s*.32,0,1.08),(s*.32,0,.67)),
      (f'LowerLeg.{suffix}',f'UpperLeg.{suffix}',(s*.32,0,.67),(s*.32,0,.28)),
      (f'Foot.{suffix}',f'LowerLeg.{suffix}',(s*.32,0,.28),(s*.32,-.30,.16)),
      (f'Shoulder.{suffix}','Chest',(s*.48,.02,2.03),(s*.77,.03,1.95)),
      (f'UpperArm.{suffix}',f'Shoulder.{suffix}',(s*.77,.03,1.95),(s*.98,-.06,1.51)),
      (f'LowerArm.{suffix}',f'UpperArm.{suffix}',(s*.98,-.06,1.51),(s*1.055,-.16,1.19)),
      (f'Hand.{suffix}',f'LowerArm.{suffix}',(s*1.055,-.16,1.19),(s*1.055,-.21,1.02))
    ])
for name,parent,head,tail in spec:
    b=rig.data.edit_bones.new(name)
    b.head=head;b.tail=tail
    b.use_connect=False
    if parent:b.parent=rig.data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
bpy.context.view_layer.update()

def clamp(t):return max(0.,min(1.,t))
def smooth(a,b,x):
    t=clamp((x-a)/(b-a))
    return t*t*(3-2*t)
def split(lower,upper,t):
    k=smooth(lower,upper,t)
    return 1-k,k
def influences(pos,name):
    x,y,z=pos
    sx='L' if x<0 else 'R'
    # Heads and features never flow into torso while neck is rotating.
    if any(n in name.lower() for n in ('head','cranium','jaw','lip','muzzle','nose','eye','brow','ear','tusk','scalp','bandana','forehead','cheek','canine','hair','earring','scar','field paint','nostril')):
        return {'Head':1}
    if 'neck' in name.lower() or 'necklace' in name.lower() or 'pendant' in name.lower():
        return {'Neck':.75,'Chest':.25}
    if name.startswith('Axe ') or name.startswith('Axe') or 'Axe ' in name:
        return {'Hand.R':1}
    if ('boot' in name.lower() or 'sole' in name.lower() or 'lacing' in name.lower()):
        return {f'Foot.{sx}':1} if z<.24 else {f'LowerLeg.{sx}':.80,f'Foot.{sx}':.20}
    if any(w in name.lower() for w in ('trouser','knee patch')):
        hi=smooth(.55,.82,z)
        return {f'UpperLeg.{sx}':hi,f'LowerLeg.{sx}':1-hi}
    if ('Continuous orc shoulders' in name or
       any(w in name.lower() for w in ('hand palm','knuckle','biceps','forearm','shoulder deltoid','elbow','thumb'))):
        # Smoothly distribute continuous deformed skin between arms/chest.
        if abs(x)>.58 and z>1.03:
            hand=1-smooth(1.12,1.27,z)
            fore=(1-smooth(1.35,1.55,z))*smooth(1.12,1.27,z)
            upper=smooth(1.34,1.57,z)*(1-smooth(1.82,2.05,z))
            shoulder=smooth(1.79,2.0,z)
            blend=smooth(.54,.76,abs(x))
            raw={f'Hand.{sx}':hand, f'LowerArm.{sx}':fore, f'UpperArm.{sx}':upper, f'Shoulder.{sx}':shoulder,'Chest':(1-blend)*.7}
            return {k:v for k,v in raw.items() if v>1e-6}
    if any(w in name.lower() for w in ('bracer','wrist','plate rivet','arm','hand')):
        if z<1.20:return {f'Hand.{sx}':.85,f'LowerArm.{sx}':.15}
        if z<1.54:return {f'LowerArm.{sx}':1}
        if z<1.90:return {f'UpperArm.{sx}':1}
        return {f'Shoulder.{sx}':1}
    if abs(x)>.79 and z>1.2:
        return {f'UpperArm.{sx}':.85,'Chest':.15}
    if 'hip' in name.lower() or 'belt' in name.lower() or 'apron' in name.lower() or 'pouch' in name.lower():
        return {'Hips':1} if z<1.16 else {'Hips':.55,'Spine':.45}
    # Vest/saddle follows chest with articulated spine and hips.
    spine=smooth(1.10,1.55,z)*(1-smooth(1.72,2.10,z))
    chest=smooth(1.55,1.94,z)
    hips=1-smooth(1.16,1.47,z)
    return {'Hips':hips,'Spine':spine,'Chest':chest}

skinned=0
for obj in character:
    if obj.type!='MESH':continue
    groups={b.name:obj.vertex_groups.new(name=b.name) for b in rig.data.bones}
    verts=list(obj.data.vertices)
    # Do not bend tiny rivets, laces, stitches, eyes or decorative metal across
    # joints. In the first proof their individual vertices picked differing
    # nearest bones, causing scattered or floating jewelry during motion.
    # Large organic surfaces and garments still deform with blended weights.
    world_positions=[obj.matrix_world@v.co for v in verts]
    mins=Vector(tuple(min(v[k] for v in world_positions) for k in range(3)))
    maxs=Vector(tuple(max(v[k] for v in world_positions) for k in range(3)))
    center=(mins+maxs)*.5
    small_hard_part=(maxs-mins).length<.37
    deformable=('Continuous orc shoulders' in obj.name or
        any(n in obj.name.lower() for n in ('trouser','vest','tunic','apron','belt','boot shaft','shoulder harness')))
    stable_weights=None
    if small_hard_part and not deformable:
        nominal=influences(center,obj.name)
        # Select a single bone for accessories, avoiding deforming metal.
        bone=max(nominal,key=nominal.get)
        stable_weights={bone:1}
    for vert,position in zip(verts,world_positions):
        weights=stable_weights or influences(position,obj.name)
        total=sum(weights.values())
        if total<1e-7:weights={'Chest':1};total=1
        for bone,weight in weights.items():
            if weight>1e-7:groups[bone].add([vert.index],weight/total,'REPLACE')
    mod=obj.modifiers.new('Humanoid bone skinning','ARMATURE')
    mod.object=rig;mod.use_vertex_groups=True
    obj.parent=rig
    skinned+=1

# FK action prototypes, enough to verify actual deformation and test controls.
scene=bpy.context.scene
scene.render.fps=24
rig.animation_data_create()
bones=rig.pose.bones
for p in bones:p.rotation_mode='XYZ'
def key(fr, rotations):
    scene.frame_set(fr)
    for pb in bones:
        pb.rotation_euler=(0,0,0)
        if pb.name in rotations:pb.rotation_euler=rotations[pb.name]
        pb.keyframe_insert(data_path='rotation_euler',frame=fr,group=pb.name)

def action(name,frames):
    act=bpy.data.actions.new(name)
    rig.animation_data.action=act
    for frame,rot in frames:key(frame,rot)
    return act

idle=action('Idle',[(1,{}),
    (13,{'Chest':(.025,0,.015),'Head':(-.012,0,.016)}),
    (25,{})])
walk=[]
for fr in range(1,34,4):
    t=(fr-1)*math.pi*2/32
    wave=math.sin(t)
    rot={
        'Hips':(.023*abs(wave),0,.025*math.cos(t)),
        'UpperLeg.L':(.41*wave,0,0),
        'UpperLeg.R':(-.41*wave,0,0),
        'LowerLeg.L':(.12+max(0,-wave)*.26,0,0),
        'LowerLeg.R':(.12+max(0,wave)*.26,0,0),
        'UpperArm.L':(-.34*wave,0,0),
        'UpperArm.R':(.34*wave,0,0),
        'Chest':(.019,0,-.02*math.cos(t)),
    }
    walk.append((fr,rot))
walk.append((33,walk[0][1]))
walk_action=action('Walk',walk)
chop=action('Chop',[
 (1,{}),
 (9,{'Chest':(-.10,0,-.07),'UpperArm.R':(-1.03,.08,-.14),'LowerArm.R':(-.55,0,0),'Hand.R':(.28,0,0),'Head':(-.09,0,0)}),
 (15,{'Chest':(.20,0,.05),'UpperArm.R':(.26,-.06,.08),'LowerArm.R':(-.20,0,0),'Hand.R':(-.10,0,0),'Head':(.02,0,0)}),
 (20,{'Chest':(.19,0,.06),'UpperArm.R':(.50,0,.12),'LowerArm.R':(-.35,0,0)}),
 (29,{})])
carry=action('Carry',[(1,{'UpperArm.L':(-.62,0,-.18),'UpperArm.R':(-.62,0,.18),'LowerArm.L':(-.45,0,0),'LowerArm.R':(-.45,0,0)}),
  (13,{'UpperArm.L':(-.66,0,-.18),'UpperArm.R':(-.66,0,.18),'LowerArm.L':(-.45,0,0),'LowerArm.R':(-.45,0,0),'Chest':(.025,0,0)}),
  (25,{'UpperArm.L':(-.62,0,-.18),'UpperArm.R':(-.62,0,.18),'LowerArm.L':(-.45,0,0),'LowerArm.R':(-.45,0,0)})])
# Ensure each clip becomes a discrete NLA strip for the glTF exporter.
for a in [idle,walk_action,chop,carry]:
    tr=rig.animation_data.nla_tracks.new()
    tr.name=a.name
    strip=tr.strips.new(a.name,1,a)
    strip.action_frame_start=1
    strip.action_frame_end=max(k.co[0] for fcu in a.fcurves for k in fcu.keyframe_points)
    strip.repeat=1
    strip.blend_type='REPLACE'
rig.animation_data.action=None

# Snapshot armature, deformation and clips for CI's anatomical QA.
skin_info={
  'skinned':True,
  'humanoid_validated':False,
  'bones':[b.name for b in rig.data.bones],
  'clips':['Idle','Walk','Chop','Carry'],
  'mesh_count':skinned,
  'source':'Orcbands original Blender Worker Orc vNext',
  'mode':'experimental automatic weights; expect manual cleanup'
}
(out/'rig-metadata.json').write_text(json.dumps(skin_info,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'worker-orc-skinned-experiment.blend'))
# glTF: NLA strips are exported into animation tracks
bpy.ops.export_scene.gltf(
    filepath=str(out/'worker-orc-skinned-experiment.glb'),
    export_format='GLB',
    export_animations=True,
    export_nla_strips=True,
    export_apply=False,
)
if '--export-only' in args:
    print('Exported rigged worker orc GLB (no CPU renders)')
    sys.exit(0)
# Small repeatable real-frame images for evidence, not concept art.
bpy.ops.object.camera_add(location=(4,-7,3.6))
camera=bpy.context.object
camera.data.type='ORTHO';camera.data.ortho_scale=4.35
camera.rotation_euler=(Vector((0,0,1.50))-camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera=camera
world=bpy.data.worlds.new('Rig QA World')
scene.world=world
world.use_nodes=True
world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.24,.30,.26,1)
world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.8
for pos,power,size in [((-3,-4,6),440,4),((3,2,5),620,4)]:
    bpy.ops.object.light_add(type='AREA',location=pos)
    obj=bpy.context.object;obj.data.energy=power;obj.data.size=size
    obj.rotation_euler=(Vector((0,0,1.5))-obj.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES'
scene.cycles.device='CPU';scene.cycles.samples=16;scene.cycles.use_denoising=False
scene.render.resolution_x=620;scene.render.resolution_y=620
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='Standard'
scene.view_settings.exposure=-.35
for clip,frame in [('Idle',13),('Walk',9),('Walk',25),('Chop',9),('Chop',15),('Carry',13)]:
    for tr in rig.animation_data.nla_tracks:
        tr.mute=(tr.name!=clip)
    scene.frame_set(frame)
    scene.render.filepath=str(out/f'rig-qa-{clip.lower()}-{frame:02d}.png')
    bpy.ops.render.render(write_still=True)
print('RIG QA:',json.dumps(skin_info))
