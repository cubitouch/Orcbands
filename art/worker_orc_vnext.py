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

skin=material("01 Orc moss skin",(.32,.48,.23))
skinlight=material("02 Face/knuckle highlight",(.43,.55,.29))
skindark=material("03 Deep skin shade",(.18,.31,.16))
leather=material("04 Dark saddle leather",(.24,.13,.085))
leather_mid=material("05 Worn brown leather",(.38,.22,.13))
leather_light=material("06 Leather edge",(.56,.34,.20))
cloth=material("07 Warm dark cloth",(.12,.12,.105))
red=material("08 Crimson canvas",(.48,.15,.12))
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
    # Keep readable low-poly facets, use weighted normals on larger forms
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
    return apply_mat(obj,mat)

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
prism("Apron hanging below belt",[(-.40,1.16),(.41,1.17),(.38,.66),(.25,.54),(-.32,.56),(-.42,.63)],-.40,-.455,leather_mid)
prism("Apron red repair",[(-.29,.86),(-.09,.88),(-.12,.68),(-.31,.64)],-.465,-.48,red_dark)
curved_line("Apron seam",[(-.36,-.49,.77),(-.35,-.49,.65),(-.25,-.49,.59)],.011,leather_light)
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
sphere("Orc wide cranium",(0,0,2.51),(.45,.355,.365),skin,24,16)
# Lower jaw extends forward with angular cheek support.
ring_loft("Broad lower jaw anatomy",[
  ((0,-.045,2.23),(.365,.31)),
  ((0,-.079,2.33),(.44,.337)),
  ((0,-.045,2.47),(.43,.34)),
  ((0,.010,2.60),(.37,.32)),
],skin,20)
sphere("Large flattened lower lip",(0,-.334,2.305),(.285,.108,.105),skinlight,20,10)
sphere("Muzzle chin plane",(0,-.307,2.38),(.26,.155,.155),skin,18,10)
sphere("Heavy nose bridge",(0,-.347,2.52),(.135,.14,.19),skin,16,10)
sphere("Nose end",(0,-.408,2.46),(.175,.13,.095),skinlight,16,10)
for sx,label in [(-1,"L"),(1,"R")]:
    sphere(f'{label} nostril',(sx*.10,-.527,2.438),(.031,.014,.026),skindark,10,7)
    sphere(f'{label} cheek',(sx*.306,-.225,2.37),(.172,.165,.16),skin,15,10)
    # Brow shadows, deep-set iris, heavy sloping brow over eyes.
    sphere(f'{label} eye socket',(sx*.185,-.318,2.58),(.143,.072,.09),skindark,14,9)
    sphere(f'{label} pale ochre eye',(sx*.192,-.378,2.56),(.087,.022,.055),eye_white,13,8)
    sphere(f'{label} pupil',(sx*.196,-.403,2.555),(.027,.012,.039),black,11,7)
    brow=sphere(f'{label} scowling brow ridge',(sx*.194,-.349,2.632),(.195,.094,.070),skinlight,16,10)
    brow.rotation_euler[1]=-sx*.18
    sphere(f'{label} broad ear base',(sx*.438,.035,2.535),(.16,.18,.15),skin,14,10)
    sphere(f'{label} pointed ear',(sx*.570,.045,2.57),(.185,.083,.075),skin,12,8)
    sphere(f'{label} dark inner ear',(sx*.548,-.043,2.574),(.095,.024,.052),skindark,12,8)
    # Pointed ivory tusks curve out then rise from lower jaw.
    tube(f'{label} tusk base',(sx*.269,-.341,2.304),(sx*.318,-.409,2.418),.087,.066,bone,12)
    tube(f'{label} tusk tip',(sx*.318,-.409,2.418),(sx*.350,-.405,2.555),.064,0,bone,12)
    sphere(f'{label} earring',(sx*.495,.010,2.437),(.03,.04,.042),gold,12,9)
# Hard red bandana and back ribbons.
ring_loft("Red wrap headband",[
  ((0,.008,2.730),(.43,.33)),
  ((0,.011,2.804),(.40,.33))
],red,22)
sphere("Bandana side knot",(.42,.06,2.765),(.125,.125,.093),red_dark,13,9)
prism("Bandana tail long",[(.39,2.75),(.56,2.74),(.61,2.38),(.52,2.47)],.14,.21,red)
prism("Bandana tail short",[(.45,2.74),(.58,2.73),(.73,2.54),(.66,2.52)],.10,.17,red_dark)
sphere("Top hair crest",(0,.06,2.817),(.18,.15,.08),black,12,8)

# Separate hero weapon (held at right side), strongly tapered axe head.
tube("Axe hardwood shaft",(1.13,-.20,.54),(1.14,-.22,1.52),.058,.050,leather_mid,13)
tube("Axe dark wrapping",(1.14,-.22,1.06),(1.14,-.22,1.24),.071,.069,leather,13)
prism("Axe steel head",[(1.06,1.61),(1.36,1.71),(1.61,1.60),(1.64,1.23),(1.37,1.15),(1.06,1.31)],-.30,-.14,metal_light)
prism("Axe dark forging",[(1.06,1.61),(1.30,1.67),(1.29,1.21),(1.06,1.31)],-.323,-.31,metal)
sphere("Axe connector",(1.13,-.23,1.42),(.085,.1,.15),metal,12,8)

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

area("Soft key",(-3,-4,7),900,5,(1,.88,.72))
area("Cool fill",(4,-1,5),650,4,(.77,.89,1))
area("Rim",(2,4,6),1000,4,(1,.85,.64))

bpy.ops.object.camera_add(location=(4,-7,4))
camera=bpy.context.object
bpy.context.scene.camera=camera
camera.data.type='ORTHO'
camera.data.ortho_scale=3.85

scene=bpy.context.scene
# Cycles CPU works headlessly on GitHub Actions without EGL/OpenGL.
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=20
scene.cycles.use_denoising=False
scene.render.resolution_x=720
scene.render.resolution_y=720
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
scene.view_settings.exposure=0
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
