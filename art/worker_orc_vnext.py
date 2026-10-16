"""Orcbands Worker Orc vNext — original, Blender-native character model.

Run headless:
    blender -b -t 2 --python art/worker_orc_vnext.py -- --output /tmp/orcbands-art

Creates: editable .blend, exportable .glb, consistent multi-angle real 3D renders.
This is an art-direction prototype, NOT a skinned/Unity-validated Humanoid.
No purchased or third-party geometry or textures are used.
"""
import bpy, math, sys, json
from pathlib import Path
from mathutils import Vector
from math import sin, cos, pi

argv = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
out = Path(argv[argv.index("--output")+1] if "--output" in argv else "/tmp/orcbands-art")
out.mkdir(parents=True, exist_ok=True)
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

def material(name, rgba, roughness=.8, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgba,1)
    mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*rgba,1)
    bsdf.inputs['Roughness'].default_value=roughness
    bsdf.inputs['Metallic'].default_value=metallic
    return mat

skin=material("01 Orc moss skin",(.245,.382,.160))
skinlight=material("02 Face/knuckle highlight",(.342,.461,.225))
skindark=material("03 Deep skin shade",(.115,.221,.092))
leather=material("04 Dark saddle leather",(.24,.13,.085))
leather_mid=material("05 Worn brown leather",(.32,.169,.095))
leather_light=material("06 Leather edge",(.45,.273,.155))
cloth=material("07 Warm dark cloth",(.12,.12,.105))
red=material("08 Crimson canvas",(.40,.103,.082))
red_dark=material("09 Dirty crimson",(.28,.085,.07))
bone=material("10 Ivory tusks",(.88,.81,.63),.59)
metal=material("11 Forged black iron",(.23,.26,.25),.38,.65)
metal_light=material("12 Honed steel",(.52,.59,.57),.36,.73)
gold=material("13 Brass details",(.46,.32,.15),.4,.62)
eye_white=material("14 Yellow iris",(.72,.67,.35))
black=material("15 Dark eyes/hair",(.075,.082,.057))

def apply_mat(obj, mat):
    obj.data.materials.append(mat)
    return obj

def bevel(obj, width=.035, segments=2):
    mod=obj.modifiers.new('hand-shaped softened corners','BEVEL')
    mod.width=width
    mod.segments=segments
    if hasattr(mod,'affect'):
        mod.affect='EDGES'
    return obj

def sphere(name, center, dims, mat, segments=20, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=center)
    obj=bpy.context.object;obj.name=name
    obj.scale=dims
    apply_mat(obj,mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj

def box(name, center, dims, mat, width=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=center)
    obj=bpy.context.object;obj.name=name
    obj.dimensions=dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_mat(obj,mat)
    if width: bevel(obj,width)
    return obj

def link_mesh(name, verts, faces, mat):
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    o=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(o)
    apply_mat(o,mat)
    for polygon in o.data.polygons:
        polygon.use_smooth=True
    return o

def ring_loft(name,rings,mat,segments=16):
    """Art-directed continuous trunk/limb topology from ring cross sections.
    rings: [(centerXYZ, radiiXY), ...], aligned along z."""
    verts=[]
    for center,rad in rings:
        for j in range(segments):
            a=2*pi*j/segments
            verts.append((center[0]+rad[0]*cos(a), center[1]+rad[1]*sin(a),center[2]))
    faces=[]
    faces.append(tuple(range(segments-1,-1,-1)))
    for i in range(len(rings)-1):
        for j in range(segments):
            a=i*segments+j
            b=i*segments+(j+1)%segments
            faces.append((a,b,b+segments,a+segments))
    last=(len(rings)-1)*segments
    faces.append(tuple(last+j for j in range(segments)))
    return link_mesh(name,verts,faces,mat)

def tube(name, start, end, r1, r2, mat, verts=12):
    a,b=Vector(start),Vector(end)
    direction=b-a
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1,radius2=r2,depth=direction.length,location=(a+b)/2)
    obj=bpy.context.object;obj.name=name
    obj.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
    apply_mat(obj,mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj

def curved_line(name,points,radius,mat):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D'
    curve.resolution_u=8;curve.bevel_depth=radius;curve.bevel_resolution=2
    poly=curve.splines.new('BEZIER');poly.bezier_points.add(len(points)-1)
    for p,co in zip(poly.bezier_points,points):
        p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,curve)
    bpy.context.collection.objects.link(obj)
    apply_mat(obj,mat)
    return obj

def prism(name,outline,y1,y2,mat):
    n=len(outline)
    v=[(x,y,z) for y in [y1,y2] for x,z in outline]
    f=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
    for i in range(n):
        j=(i+1)%n
        f.append((i,j,n+j,n+i))
    obj=link_mesh(name,v,f,mat)
    for p in obj.data.polygons:p.use_smooth=False
    return obj

# One coherent continuous bare upper-body volume and lower trunk.
ring_loft("Body - anatomical shoulder to hip surface",[
    ((0,0,1.04),(.39,.27)),
    ((0,0,1.18),(.48,.30)),
    ((0,.015,1.38),(.52,.34)),
    ((0,.015,1.63),(.65,.39)),
    ((0,.045,1.87),(.71,.42)),
    ((0,.03,2.03),(.69,.40)),
    ((0,0,2.16),(.52,.30)),
    ((0,0,2.23),(.28,.25)),
],skin,24)
# Leather waistcoat follows the torso but leaves shoulders visible.
ring_loft("Fitted worker leather vest",[
    ((0,-.028,1.22),(.48,.315)),
    ((0,-.045,1.43),(.54,.363)),
    ((0,-.035,1.65),(.55,.395)),
    ((0,-.015,1.91),(.59,.391)),
    ((0,-.010,2.08),(.45,.28)),
],leather_mid,24)
# Open collar, front bib and fabric edging; avoid cubic overlays.
sphere("Vest collar left",(-.27,-.27,2.01),(.15,.12,.17),leather,12,8)
sphere("Vest collar right",(.27,-.27,2.01),(.15,.12,.17),leather,12,8)
prism("Apron asymmetrical hanging front",[(-.39,1.16),(.43,1.17),(.39,.83),(.33,.70),(.16,.57),(-.06,.61),(-.17,.57),(-.40,.66)],-.405,-.480,leather)
prism("Apron hem facing",[(-.37,.71),(-.18,.64),(-.06,.685),(.15,.64),(.32,.765),(.30,.715),(.16,.58),(-.06,.64),(-.19,.62),(-.37,.68)],-.482,-.493,leather_light)
curved_line("Apron worn vertical fold",[(-.12,-.497,1.06),(-.10,-.505,.86),(-.07,-.505,.69)],.013,leather_mid)
curved_line("Apron side seam",[(.34,-.489,1.10),(.37,-.495,.90),(.32,-.505,.71)],.017,leather_mid)
prism("Apron stitched red repair",[(-.32,.87),(-.11,.90),(-.12,.71),(-.32,.68)],-.490,-.508,red_dark)
curved_line("Apron patch stitching",[(-.31,-.51,.85),(-.30,-.51,.71),(-.13,-.51,.725)],.011,leather_light)
for i in range(5):
    sphere(f'Apron hand sewn stitch {i}',(-.30+i*.043,-.525,.713),(.013,.008,.012),bone,7,5)
for sx in [-1,1]:
    curved_line("Shoulder harness",[ (sx*.39,-.23,2.16),(sx*.39,-.37,1.70),(sx*.31,-.41,1.32)],.077,leather)
    sphere("Harness rivet",(sx*.33,-.415,1.38),(.045,.028,.038),gold,10,7)

# Heavy belt, separate buckle and side pouch.
ring_loft("Heavy belt",[
    ((0,0,1.12),(.50,.395)),
    ((0,0,1.24),(.50,.395)),
],leather,20)
box("Steel belt buckle",(0,-.438,1.175),(.25,.046,.17),metal_light,.022)
box("Buckle dark inset",(0,-.470,1.176),(.12,.012,.08),leather,.007)
sphere("Worker tool pouch",(.46,-.15,1.04),(.22,.22,.28),leather,14,9)
sphere("Tool pouch flap",(.50,-.28,1.23),(.17,.09,.10),leather_light,12,8)
sphere("Tool pouch clasp",(.50,-.375,1.22),(.035,.028,.038),gold,8,6)

# Muscular limbs: continuous rounded profile for each upper arm, forearm, and hand.
for sx,label in [(-1,'L'),(1,'R')]:
    arm=sphere(f'{label} shoulder deltoid',(sx*.72,.025,1.95),(.32,.35,.36),skin,20,12)
    tube(f'{label} biceps',(sx*.77,.012,1.89),(sx*.98,-.06,1.53),.275,.226,skin,16)
    sphere(f'{label} elbow',(sx*.98,-.06,1.50),(.235,.22,.23),skin,18,10)
    tube(f'{label} forearm',(sx*.995,-.06,1.46),(sx*1.05,-.16,1.10),.235,.20,skin,16)
    tube(f'{label} leather wrist guard',(sx*1.01,-.095,1.42),(sx*1.05,-.15,1.23),.241,.226,leather,15)
    curved_line(f'{label} wrist trim',[(sx*1.00,-.32,1.40),(sx*1.07,-.36,1.36),(sx*1.16,-.33,1.35)],.018,gold)
    sphere(f'{label} hand palm',(sx*1.055,-.17,1.07),(.213,.22,.235),skin,16,10)
    for i in range(4):
        x=sx*(.90+i*.10)
        sphere(f'{label} knuckle {i}',(x,-.321,1.00),(.067,.068,.079),skinlight,11,8)
    sphere(f'{label} thumb',(sx*.90,-.37,1.14),(.095,.13,.11),skin,12,8)
    # Dark trousers, fabric volume and separate leather boot rather than huge rectangles.
    x=sx*.32
    ring_loft(f'{label} trousers',[
        ((x,0,.43),(.23,.22)),
        ((x,.025,.62),(.29,.27)),
        ((x,.015,.89),(.30,.26)),
        ((x,0,1.13),(.27,.27))
    ],cloth,15)
    ring_loft(f'{label} boot shaft',[
        ((x,-.01,.13),(.255,.28)),
        ((x,0,.29),(.27,.25)),
        ((x,0,.47),(.268,.26))
    ],leather,15)
    sphere(f'{label} leather boot toe',(x,-.20,.135),(.30,.40,.14),leather_mid,16,10)
    sphere(f'{label} sole',(x,-.18,.067),(.31,.43,.07),black,16,8)
    for j in range(3):
        z=.25+j*.077
        curved_line(f'{label} boot lacing {j}',[(x-.15,-.270,z),(x,-.290,z+.02),(x+.16,-.272,z)],.015,leather_light)
    sphere(f'{label} knee patch',(x,-.24,.57),(.235,.07,.14),leather_mid,12,8)

# Face: sculpted brow/jaw/muzzle rather than sphere with googly eyes.
sphere("Mass of neck",(0,-.005,2.18),(.305,.30,.235),skindark,18,11)
sphere("Orc wide cranium",(0,.012,2.505),(.443,.345,.368),skin,24,16)
# Lower jaw extends forward with angular cheek support.
ring_loft("Broad lower jaw anatomy",[
  ((0,-.045,2.23),(.365,.31)),
  ((0,-.079,2.33),(.44,.337)),
  ((0,-.045,2.47),(.43,.34)),
  ((0,.010,2.60),(.37,.32)),
],skin,20)
sphere("Strong lower jaw lip",(0,-.350,2.295),(.289,.103,.089),skin,20,10)
sphere("Muzzle chin plane",(0,-.290,2.38),(.30,.155,.14),skin,18,10)
curved_line("Angry dark lower mouth",[(-.255,-.421,2.330),(-.08,-.455,2.304),(.08,-.455,2.304),(.255,-.421,2.330)],.011,skindark)
sphere("Heavy nose bridge",(0,-.305,2.52),(.13,.13,.18),skin,16,10)
sphere("Nose end",(0,-.397,2.472),(.16,.108,.081),skin,16,10)
for sx,label in [(-1,"L"),(1,"R")]:
    sphere(f'{label} nostril',(sx*.10,-.499,2.446),(.026,.012,.021),skindark,10,7)
    sphere(f'{label} cheek',(sx*.309,-.222,2.37),(.155,.145,.141),skin,15,10)
    # Brow shadows, deep-set iris, heavy sloping brow over eyes.
    sphere(f'{label} eye socket',(sx*.182,-.325,2.585),(.139,.054,.07),skindark,14,9)
    sphere(f'{label} pale ochre eye',(sx*.192,-.367,2.57),(.070,.018,.044),eye_white,13,8)
    sphere(f'{label} pupil',(sx*.190,-.386,2.566),(.025,.011,.030),black,11,7)
    brow=sphere(f'{label} scowling brow ridge',(sx*.188,-.356,2.625),(.175,.079,.055),skinlight,16,10)
    brow.rotation_euler[1]=-sx*.18
    sphere(f'{label} broad ear base',(sx*.420,.044,2.529),(.13,.155,.136),skin,14,10)
    sphere(f'{label} pointed ear',(sx*.545,.060,2.558),(.15,.085,.063),skin,12,8)
    sphere(f'{label} dark inner ear',(sx*.536,-.025,2.561),(.081,.02,.046),skindark,12,8)
    # Pointed ivory tusks curve out then rise from lower jaw.
    tube(f'{label} tusk base',(sx*.258,-.346,2.304),(sx*.305,-.396,2.403),.076,.055,bone,12)
    tube(f'{label} tusk tip',(sx*.305,-.396,2.403),(sx*.334,-.394,2.513),.054,0,bone,12)
    sphere(f'{label} earring',(sx*.495,.010,2.437),(.03,.04,.042),gold,12,9)
# Hard red bandana and back ribbons.
ring_loft("Red cloth bandana",[
  ((0,.008,2.716),(.439,.334)),
  ((0,.011,2.759),(.420,.329))
],red,24)
sphere("Bandana side knot",(.415,.060,2.751),(.084,.086,.070),red_dark,13,9)
prism("Bandana tail long",[(.39,2.75),(.56,2.74),(.61,2.38),(.52,2.47)],.14,.21,red)
prism("Bandana tail short",[(.45,2.74),(.58,2.73),(.73,2.54),(.66,2.52)],.10,.17,red_dark)
# Skull and hair are visible above the narrow bandana, not hidden by a round fabric cap.
sphere("Top hair crest",(0,.075,2.859),(.17,.115,.081),black,12,8)

# Separate hero weapon (held at right side), strongly tapered axe head.
tube("Axe hardwood shaft",(1.13,-.20,.54),(1.14,-.22,1.52),.058,.050,leather_mid,13)
tube("Axe dark wrapping",(1.14,-.22,1.06),(1.14,-.22,1.24),.071,.069,leather,13)
prism("Axe forged hook blade",[(1.06,1.62),(1.33,1.71),(1.58,1.78),(1.52,1.62),(1.54,1.32),(1.68,1.22),(1.40,1.17),(1.06,1.31)],-.30,-.14,metal_light)
prism("Axe dark forged spine",[(1.06,1.61),(1.33,1.71),(1.33,1.24),(1.06,1.31)],-.323,-.31,metal)
sphere("Axe connector",(1.13,-.23,1.42),(.085,.1,.15),metal,12,8)



# Stylized but grounded personality: pronounced orc expression and lived-in armor.
# Short face scar, colored angular war paint and a thick jaw muscle.
curved_line("Worker cheek scar",[(.26,-.350,2.53),(.33,-.345,2.48),(.35,-.323,2.43)],.014,skindark)
curved_line("Right forehead ridge",[(.035,-.326,2.690),(.18,-.357,2.685),(.33,-.289,2.678)],.026,skindark)
curved_line("Left forehead ridge",[(-.035,-.326,2.690),(-.18,-.357,2.684),(-.33,-.289,2.675)],.026,skindark)
# A face isn't merely two tusks: mouth, lips and cheek shadow.
curved_line("Low canine mouth shadow",[(-.225,-.416,2.31),(-.12,-.455,2.305),(0,-.461,2.292),(.12,-.455,2.305),(.225,-.416,2.31)],.020,skindark)
for side in [-1,1]:
    sphere("Angled jaw mass",(side*.29,-.17,2.27),(.16,.17,.11),skin,14,10)
    # Ragged tribal marking near the lower cheek.
    prism("Red field paint",[(side*.30,2.42),(side*.37,2.38),(side*.35,2.31),(side*.31,2.34)],-.363,-.377,red_dark)
# Linen and hide fastenings give scale to large sculpted forms.
for z in [1.48,1.59,1.70]:
    curved_line("Vest hand stitching",[(-.215,-.408,z),(-.12,-.413,z+.015),(.01,-.423,z+.006)],.009,leather_light)
for j in range(4):
    sphere("Shoulder pad rivet",(-.91+j*.106,-.253,2.15+j*.018),(.021,.019,.016),gold,8,6)
# Simple bone and bronze necklace, a recognizable signature accessory.
curved_line("Bone necklace", [(-.22,-.316,2.135),(-.09,-.388,2.042),(.13,-.403,2.045),(.23,-.330,2.13)],.031,leather)
tube("Bone pendant",(0,-.404,2.064),(.02,-.462,1.944),.055,.008,bone,10)
# Chipped steel, hide wrapping and buckle ornament on belt.
prism("Axe worn dark stripe",[(1.35,1.66),(1.50,1.71),(1.46,1.60),(1.34,1.57)],-.307,-.332,metal)
for z in [.91,.95,.99]:
    curved_line("Axe grip braid",[(1.09,-.274,z),(1.17,-.267,z+.014)],.018,leather_light)
sphere("Belt ornament",(0,-.478,1.181),(.04,.028,.039),gold,10,6)

# Finish detailing: forms that read from our strategy-camera view.
for sx,label in [(-1,"L"),(1,"R")]:
    # Bracer stitching and burnished brass plates on the forearm.
    for i in range(5):
        z=1.27+i*.036
        sphere(f'{label} bracer stitches {i}',(sx*1.00,-.320,z),(.013,.011,.012),leather_light,7,5)
    box(f'{label} bracer plate',(sx*1.02,-.280,1.357),(.31,.076,.085),leather_mid,.017)
    sphere(f'{label} plate rivet',(sx*1.10,-.323,1.364),(.023,.022,.020),gold,8,6)
    # Harness shoulder guards are deliberately asymmetrical, like field gear.
    if sx < 0:
        sphere('Left hammered shoulder pad',(sx*.72,-.06,2.14),(.31,.27,.09),leather,15,9)
        curved_line('Left pad edging',[(sx*.95,-.160,2.11),(sx*.75,-.328,2.15),(sx*.48,-.19,2.15)],.02,leather_light)
    else:
        curved_line('Right shoulder scar',[(sx*.61,-.301,2.08),(sx*.69,-.329,1.98),(sx*.77,-.34,1.925)],.018,skindark)
# Brass rivets, cross-stitching and tool details keep the model readable in closeup.
for sx in [-1,1]:
    for z in [1.60,1.74,1.88]:
        sphere('Leather vest lace eyelet',(sx*.35,-.394,z),(.018,.013,.018),gold,8,6)
curved_line('Diagonal cross-body weathered leather binding',[(-.45,-.30,2.02),(-.17,-.47,1.78),(.14,-.48,1.55),(.34,-.44,1.32)],.036,leather)
for i in range(4):
    sphere(f'Metal strap rivet {i}',(-.27+i*.115,-.475,1.88-i*.145),(.02,.016,.02),metal_light,8,6)
for x,z in [(-.32,.81),(-.28,.74),(.30,.83)]:
    sphere('Apron exposed stitch',(x,-.512,z),(.017,.011,.015),bone,8,6)
# Clean up anatomical intersections: merge body and arm skin volumes with voxel
# remeshing, removing the most obvious sphere/cylinder seams.
# Preserve face features, fingers, gear, leather and bone as separately editable parts.
skin_parts=[o for o in bpy.data.objects if o.type=='MESH' and
    (o.name.startswith('Body - anatomical') or
     any(key in o.name for key in (
       ' shoulder deltoid',' biceps',' elbow',' forearm',' hand palm',
       ' knuckle ',' thumb'))
    )]
if skin_parts:
    bpy.ops.object.select_all(action='DESELECT')
    for o in skin_parts: o.select_set(True)
    bpy.context.view_layer.objects.active=skin_parts[0]
    bpy.ops.object.join()
    combined=bpy.context.object
    combined.name='Continuous orc shoulders, arms and hands'
    combined.data.remesh_voxel_size=.032
    bpy.ops.object.voxel_remesh()
    for poly in combined.data.polygons:
        poly.use_smooth=True

# Dedicated character collection for stable export. Make stage separately.
character_objs=list(bpy.data.objects)
char_collection=bpy.data.collections.new("CHARACTER — Worker Orc vNext")
bpy.context.scene.collection.children.link(char_collection)
for obj in character_objs:
    for coll in list(obj.users_collection):coll.objects.unlink(obj)
    char_collection.objects.link(obj)
    obj["Orcbands"] = "Worker Orc vNext: art prototype; no rig"

# Export real game asset before constructing render-only studio.
bpy.ops.object.select_all(action='DESELECT')
for obj in character_objs: obj.select_set(True)
bpy.context.view_layer.objects.active=character_objs[0]
bpy.ops.export_scene.gltf(filepath=str(out/'worker-orc-vnext.glb'),export_format='GLB',use_selection=True,export_apply=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'worker-orc-vnext.blend'))

stage=material("Studio sage",(.11,.18,.15))
bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=1.75,depth=.12,location=(0,0,-.10))
floor=bpy.context.object;floor.name="STUDIO ONLY - pedestal";apply_mat(floor,stage)
ground=material("Studio dark",(.048,.068,.063))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.19))
apply_mat(bpy.context.object,ground)
studio_world=bpy.data.worlds.new("Studio charcoal world")
bpy.context.scene.world=studio_world
studio_world.use_nodes=True
studio_world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.14,.18,.16,1)
studio_world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.75

def area(name,pos,power,size,color):
    bpy.ops.object.light_add(type='AREA',location=pos)
    o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=color
    o.rotation_euler=(Vector((0,0,1.5))-o.location).to_track_quat('-Z','Y').to_euler()

area("Soft key",(-3,-4,7),440,5,(1,.91,.82))
area("Cool fill",(4,-1,5),250,4,(.77,.89,1))
area("Rim",(2,4,6),500,4,(1,.86,.73))

bpy.ops.object.camera_add(location=(4,-7,4))
camera=bpy.context.object
bpy.context.scene.camera=camera
camera.data.type='ORTHO'
camera.data.ortho_scale=3.85

scene=bpy.context.scene
# Cycles CPU works headlessly on GitHub Actions without EGL/OpenGL.
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=24
scene.cycles.use_denoising=False
scene.render.resolution_x=760
scene.render.resolution_y=760
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.camera.data.lens=50
scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='Standard'
try:
    scene.view_settings.look='Medium High Contrast'
except (TypeError, ValueError):
    scene.view_settings.look='Medium High Contrast' if False else 'None'
scene.view_settings.exposure=-.35
# This is an asset-facing render stage, never included in the exported GLB.

def render(name,pos,look_at=(0,0,1.5),scale=3.7):
    camera.location=pos
    camera.rotation_euler=(Vector(look_at)-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=scale
    scene.render.filepath=str(out/name)
    bpy.ops.render.render(write_still=True)

render('01-front.png',(0,-7,2.1),(0,0,1.46))
render('02-three-quarter.png',(5,-7,4.6),(0,0,1.46),3.8)
render('03-side.png',(7,0,2.2),(0,0,1.46))
render('04-rts.png',(7,-9,10),(0,0,1.4),5.2)
metrics={
    "source":"original Blender procedural mesh","character_meshes":len(character_objs),
    "triangles":sum(len(o.data.polygons) for o in character_objs if o.type=='MESH'),
    "outputs":["worker-orc-vnext.blend","worker-orc-vnext.glb","01-front.png","02-three-quarter.png","03-side.png","04-rts.png"],
    "humanoid_validated":False,"skinned":False,"asset_store_dependencies":False
}
(out/'model-info.json').write_text(json.dumps(metrics,indent=2))
print("Orcbands Worker Orc vNext:",json.dumps(metrics))
