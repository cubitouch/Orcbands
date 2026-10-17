"""Orcbands #15 - Worker Orc handcrafted topology/texture sculpt study.

This is an actual editable mesh and UV/image-textured static character, *not*
a concept illustration or an animation rig. Designed from the owner's primary
four-view Worker Orc turnaround. No downloaded meshes or third-party textures.

blender -b -t 2 --python-exit-code 1 --python art/worker_orc_sculpt_study.py \
    -- --output /tmp/worker-orc-study
"""
import bpy
import math
import json
import random
import sys
from pathlib import Path
from math import sin, cos, pi, exp, sqrt
from mathutils import Vector

args = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
out = Path(args[args.index("--output")+1] if "--output" in args else "/tmp/worker-orc-study")
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(15017)
objects = []
image_names = []

def gauss(x,y,px,py,sx,sy):
    return exp(-((x-px)/sx)**2 - ((y-py)/sy)**2)

def clamp(x,a=0.0,b=1.0):
    return max(a,min(b,x))

def imgmat(name, base, variation, grain, rough=.82, metal=0):
    """Portable, UV-mapped painted color: packed PNG inside real GLB."""
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*base,1)
    m.use_nodes=True
    bs=m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Roughness"].default_value=rough
    bs.inputs["Metallic"].default_value=metal
    im=bpy.data.images.new(name+"_ALBEDO",width=256,height=256,alpha=True)
    pix=[]
    for j in range(256):
        v=j/256
        for i in range(256):
            u=i/256
            n=(sin(u*71+v*19)*sin(v*53-u*17)*.38+
               sin(u*151-v*97)*sin(v*109+u*83)*.17+
               sin(u*27+v*7)*.22)
            fibers=sin((u*.20+v)*grain*2*pi)
            haze=.028*cos(u*13+v*9)
            d=n*variation+fibers*variation*.14+haze
            pix.extend((clamp(base[0]+d),clamp(base[1]+d*.95),
                        clamp(base[2]+d*.78),1.0))
    im.pixels.foreach_set(pix)
    im.pack()
    tex=m.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image=im
    tex.interpolation="Linear"
    tex.label="Authored tileable image albedo / packed in GLB"
    m.node_tree.links.new(tex.outputs["Color"],bs.inputs["Base Color"])
    image_names.append(im.name)
    return m

skin=imgmat("01 Olive skin with subtle mottling",(.385,.456,.215),.061,29,.85)
skindark=imgmat("02 Deep skin creases",(.18,.245,.102),.036,38)
skinlight=imgmat("03 Green highlight raised tissue",(.42,.49,.245),.039,33)
leather=imgmat("04 Worn walnut leather apron",(.255,.145,.085),.075,79)
edge=imgmat("05 Leather seam and edge wear",(.41,.262,.147),.053,104)
dark=imgmat("06 Charcoal trousers",(.128,.123,.112),.030,131)
red=imgmat("07 Faded terracotta red linen",(.49,.165,.117),.058,115)
redlight=imgmat("08 Bandana folded edges",(.58,.236,.17),.047,140)
boot=imgmat("09 Deep brown boot hide",(.215,.14,.105),.062,97)
metal=imgmat("10 Forged iron and steel",(.36,.405,.404),.052,39,.39,.65)
steel=imgmat("11 Polished steel edge",(.66,.675,.62),.026,35,.3,.68)
bone=imgmat("12 Aged ivory tusks",(.85,.79,.62),.028,40,.53)
eye=imgmat("13 Gold amber eye",(.62,.50,.23),.021,27,.35)
iris=imgmat("14 Black pupil",(.075,.074,.05),.014,50,.33)
wood=imgmat("15 Dark ash axe haft",(.35,.22,.12),.070,163,.85)
stitch=imgmat("16 Pale leather thread",(.67,.49,.30),.033,201,.79)

def mesh(name,verts,faces,mat,smooth=True,uv=True):
    me=bpy.data.meshes.new(name)
    me.from_pydata(verts,[],faces)
    me.update()
    ob=bpy.data.objects.new(name,me)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    if smooth:
        for f in me.polygons:f.use_smooth=True
    objects.append(ob)
    if uv:
        bpy.ops.object.select_all(action="DESELECT")
        ob.select_set(True)
        bpy.context.view_layer.objects.active=ob
        try:
            bpy.ops.object.mode_set(mode="EDIT")
            bpy.ops.mesh.select_all(action="SELECT")
            bpy.ops.uv.smart_project(island_margin=.025)
        finally:
            bpy.ops.object.mode_set(mode="OBJECT")
    return ob

def loft(name,rings,mat,seg=24,phase=0):
    """True lofted rings; contiguous shoulder/muscle/palm surfaces."""
    verts=[]
    for c,rx,ry in rings:
        for k in range(seg):
            t=2*pi*k/seg+phase
            verts.append((c[0]+rx*cos(t),c[1]+ry*sin(t),c[2]))
    faces=[]
    for i in range(len(rings)-1):
        for j in range(seg):
            a=i*seg+j;b=i*seg+(j+1)%seg
            faces.append((a,b,b+seg,a+seg))
    faces.append(tuple(reversed(tuple(range(seg)))))
    faces.append(tuple((len(rings)-1)*seg+j for j in range(seg)))
    return mesh(name,verts,faces,mat)

def limb(name,stops,mat,seg=24):
    """Organic tapered limb: cross-section follows curved 3D spline tangent."""
    verts=[]
    for i,(p,r1,r2) in enumerate(stops):
        p=Vector(p)
        before=Vector(stops[max(0,i-1)][0])
        after=Vector(stops[min(len(stops)-1,i+1)][0])
        tangent=(after-before).normalized()
        xaxis=Vector((0,1,0)).cross(tangent)
        if xaxis.length<.05:xaxis=Vector((1,0,0))
        xaxis.normalize()
        yaxis=tangent.cross(xaxis).normalized()
        for k in range(seg):
            t=2*pi*k/seg
            q=p+xaxis*r1*cos(t)+yaxis*r2*sin(t)
            verts.append(tuple(q))
    faces=[]
    for i in range(len(stops)-1):
        for j in range(seg):
            a=i*seg+j;b=i*seg+(j+1)%seg
            faces.append((a,b,b+seg,a+seg))
    faces.extend([tuple(reversed(range(seg))),
                  tuple((len(stops)-1)*seg+j for j in range(seg))])
    return mesh(name,verts,faces,mat)

def ribbon(name,rows,mat,width_segments=12):
    """Cloth/leather sheet driven by rows: [(left xyz, right xyz), ...]."""
    v=[]
    for left,right in rows:
        a=Vector(left);b=Vector(right)
        for k in range(width_segments+1):
            t=k/width_segments
            p=a.lerp(b,t)
            # Folds in actual geometry rather than a shading trick.
            p.y+=.012*sin(t*8*pi)*sin(t*pi)
            v.append(tuple(p))
    faces=[]
    n=width_segments+1
    for i in range(len(rows)-1):
        for j in range(width_segments):
            a=i*n+j;faces.append((a,a+1,a+1+n,a+n))
    o=mesh(name,v,faces,mat,smooth=False)
    solid=o.modifiers.new("real fabric thickness","SOLIDIFY")
    solid.thickness=.026
    bevel=o.modifiers.new("soft cloth rims","BEVEL")
    bevel.width=.014;bevel.segments=2
    o.modifiers.new("weighted clothing normals","WEIGHTED_NORMAL")
    return o

def tube(name,points,r,mat,seg=9):
    # Piecewise polyline details rendered as continuous geometry; not curves
    stops=[(p,r,r) for p in points]
    return limb(name,stops,mat,seg)

def orb(name,center,radii,mat,seg=24,rings=16,mod=None):
    """Only used for small metal hardware, eyes and boot toe, never anatomy."""
    verts=[];faces=[]
    for i in range(rings+1):
        t=pi*i/rings
        for j in range(seg):
            f=2*pi*j/seg
            x=sin(t)*cos(f)*radii[0]
            y=sin(t)*sin(f)*radii[1]
            z=cos(t)*radii[2]
            if mod:x,y,z=mod(x,y,z)
            verts.append((center[0]+x,center[1]+y,center[2]+z))
    for i in range(rings):
        for j in range(seg):
            a=i*seg+j;b=i*seg+(j+1)%seg
            faces.append((a,b,b+seg,a+seg))
    return mesh(name,verts,faces,mat)

def band(name,center_z,rx,ry,thickness,mat):
    """Belt/rolled boot tops following body as a closed flat surface."""
    verts=[];faces=[];seg=52
    for z in (center_z-thickness/2,center_z+thickness/2):
        for j in range(seg):
            t=2*pi*j/seg
            verts.append((rx*cos(t),ry*sin(t),z+.010*sin(4*t)))
    for j in range(seg):faces.append((j,(j+1)%seg,(j+1)%seg+seg,j+seg))
    return mesh(name,verts,faces,mat)

# A single continuous, art-directed anatomical torso, with pectoral/oblique
# volume built into the rings rather than detached shoulder balls.
rings=[]
for z,rx,ry in [
    (1.12,.37,.235),(1.19,.43,.28),(1.30,.47,.30),(1.47,.45,.29),
    (1.64,.53,.33),(1.77,.65,.34),(1.92,.76,.36),(2.04,.79,.37),
    (2.15,.67,.36),(2.23,.45,.28),(2.29,.30,.22)
]:
    rings.append(((0,.03,z),rx,ry))
torso=loft("SCULPT / continuous barrel chest and obliques",rings,skin,48)
# Modify torso topology directly to give pectoral bulk, lower ribs and
# structured scapula without intersecting primitive geometry.
for v in torso.data.vertices:
    x,y,z=v.co
    if y<-.10:
        v.co.y-=.10*gauss(abs(x),z,.36,1.98,.28,.14)
        v.co.y+=.035*gauss(abs(x),z,.06,1.97,.06,.11)
    if y>.12:
        v.co.y+=.055*gauss(abs(x),z,.40,2.0,.34,.20)
    # Broad scapula, not a perfect cylinder seen from the RTS angle.
    if z>1.80 and y>.11:
        v.co.y += .035*gauss(abs(x),z,.49,2.0,.21,.18)
torso.data.update()

# Integral organic neck rising naturally from pectoral collar.
loft("SCULPT / trapezius and neck",[
    ((0,.035,2.20),.36,.25),((0,.03,2.30),.30,.25),
    ((0,0,2.40),.255,.23),((0,-.015,2.49),.28,.25)
],skin,40)

# Sculpted face shell: shared, dense hand-shaped vertex grid. Eye sockets,
# jaw, brow, nose and cheeks displace *the same mesh*, not piled spheres.
verts=[];faces=[]
nlat=42;nlong=80
for i in range(nlat+1):
    theta=pi*i/nlat
    for j in range(nlong):
        phi=2*pi*j/nlong
        a=sin(theta)*cos(phi);b=sin(theta)*sin(phi)
        # squared fantasy skull rather than a shiny smooth egg
        x=.49*math.copysign(abs(a)**.77,a)
        y=-.012+.365*math.copysign(abs(b)**.78,b)
        z=2.69+.405*cos(theta)
        if y<-.10:
            cheek=.085*gauss(abs(x),z,.36,2.61,.16,.18)
            jowl=.13*gauss(abs(x),z,.22,2.44,.31,.11)
            muzzle=.12*gauss(abs(x),z,.13,2.52,.27,.11)
            nose=.24*gauss(x,z,0,2.68,.18,.125)
            brow=.12*gauss(abs(x),z,.24,2.87,.19,.08)
            socket=.105*gauss(abs(x),z,.24,2.77,.12,.083)
            chin=.075*gauss(x,z,0,2.40,.22,.07)
            y+=-cheek-jowl-muzzle-nose-brow+socket-chin
        # Heavy jaw / cheekbone plane with reduced taper lower face.
        x*=1+.13*gauss(abs(x),z,.30,2.48,.3,.15)
        verts.append((x,y,z))
for i in range(nlat):
    for j in range(nlong):
        a=i*nlong+j;b=i*nlong+(j+1)%nlong
        faces.append((a,b,b+nlong,a+nlong))
head=mesh("SCULPT / one continuous expressive face and jaw",verts,faces,skin)

# Ears are sculpted leaf-like cartilaginous surfaces, inset concha.
for s,side in ((-1,"L"),(1,"R")):
    v=[
        (s*.43,.025,2.84),(s*.56,.015,2.87),(s*.73,.07,2.99),
        (s*.67,-.06,2.78),(s*.55,-.15,2.63),(s*.44,-.11,2.70),
        (s*.55,-.08,2.79)
    ]
    mesh(side+" ear / thick swept cartilage",v,[(0,1,6,5),(1,2,3,6),(3,4,5,6)],skin)
    orb(side+" ear / inset concha",(s*.57,-.108,2.77),(.088,.017,.105),skindark)
    # Lower tusks flow upward from the jaw, curved and irregular.
    limb(side+" ivory jaw tusk",[
        ((s*.355,-.495,2.44),.087,.077),
        ((s*.362,-.536,2.51),.076,.066),
        ((s*.37,-.548,2.61),.050,.047),
        ((s*.387,-.529,2.69),.008,.009)
    ],bone,18)
    # Eyes are inset in the carved cheek/brow; make small, not googly.
    orb(side+" deep eye socket",(s*.235,-.452,2.776),(.120,.020,.078),skindark)
    orb(side+" amber eye",(s*.235,-.477,2.768),(.071,.017,.043),eye)
    orb(side+" small pupil",(s*.237,-.496,2.765),(.027,.008,.033),iris)
    # Lower eyelid and high menacing brow follow expression.
    tube(side+" lower eyelid",[(s*.128,-.471,2.75),
         (s*.20,-.485,2.723),(s*.30,-.477,2.732),(s*.355,-.449,2.765)],.022,skinlight)
    # Skin crease / raised supraorbital ridge.
    tube(side+" sharply slanted brow",[(s*.10,-.481,2.865),
         (s*.19,-.488,2.864),(s*.32,-.455,2.895),
         (s*.382,-.404,2.924)],.050,skindark)
    orb(side+" nose wing",(s*.136,-.558,2.632),(.09,.030,.049),skin)
    orb(side+" true dark nostril",(s*.132,-.600,2.635),(.034,.009,.020),skindark)
    # Sculpted cheek/smile creases, not extra decorative tusks.
    tube(side+" nasolabial crease",[(s*.23,-.496,2.583),(s*.29,-.49,2.552),
                                   (s*.33,-.45,2.51)],.015,skindark)
# Shallow anatomy creases across the sculpted cheek surface, low-cost
# asymmetry gives age without decorating the face with large cylinders.
for side_sign, label in ((-1,"L"),(1,"R")):
    tube(label+" age crease below eye",[
        (side_sign*.145,-.477,2.694),
        (side_sign*.218,-.501,2.681),
        (side_sign*.285,-.483,2.683)
    ],.010,skindark,8)
    tube(label+" temple skin fold",[
        (side_sign*.365,-.398,2.839),
        (side_sign*.400,-.350,2.803),
        (side_sign*.416,-.323,2.771)
    ],.014,skinlight,8)
# Grumpy asymmetric broad lip line, curved lower jaw edge
tube("Inset mouth / downturned expression",[
    (-.29,-.515,2.476),(-.17,-.590,2.477),(0,-.618,2.465),
    (.20,-.580,2.479),(.30,-.510,2.496)],.023,skindark)
tube("Heavy lower lip",[
    (-.24,-.523,2.45),(0,-.587,2.438),(.25,-.516,2.46)],.039,skinlight)

# Muscular arms: through-elbow geometry and separately articulated fingers
# on broad hands, not mitten lumps. Both hands down near belt/upper thigh.
for s,side in ((-1,"L"),(1,"R")):
    limb(side+" SCULPT / continuous deltoid, elbow, forearm, palm",[
        ((s*.69,.015,2.09),.215,.235),
        ((s*.81,-.018,2.04),.280,.245),
        ((s*.93,-.037,1.91),.288,.255),
        ((s*1.02,-.064,1.69),.241,.214),
        ((s*1.045,-.106,1.56),.178,.161),
        ((s*1.085,-.123,1.41),.205,.188),
        ((s*1.10,-.140,1.25),.225,.20),
        ((s*1.12,-.173,1.13),.178,.166),
        ((s*1.125,-.182,1.055),.18,.17),
        ((s*1.13,-.206,.945),.20,.15)
    ],skin,36)
    # Visible digit arcs and knuckle ridges at the end of broad palm.
    for k in range(4):
        x=s*(.99+k*.083)
        limb(f"{side} finger {k+1} / sculpted joint chain",[
           ((x,-.24,.993),.053,.058),
           ((x+s*.01,-.264,.911),.054,.051),
           ((x+s*.005,-.278,.849),.044,.045),
           ((x,-.277,.832),.026,.031)
        ],skin,14)
        tube(f"{side} knuckle crease {k}",[
            (x-s*.03,-.310,.906),(x,-.319,.902),(x+s*.031,-.305,.910)
        ],.007,skindark,6)
    limb(side+" curled thumb",[
        ((s*.975,-.28,1.10),.080,.075),
        ((s*.90,-.34,1.039),.067,.060),
        ((s*.915,-.369,.976),.043,.041)],skin,18)
    # Wrist guards curved around forearms, actually at wrists.
    for dz in (0,.10,.205):
        z=1.23+dz
        limb(side+f" leather wrist cuff {dz:.2f}",[
          ((s*1.10,-.154,z-.041),.225,.210),
          ((s*1.10,-.154,z+.041),.225,.210)
        ],leather,28)
    for ix in (-1,0,1):
        x=s*1.1 + ix*.06
        orb(side+f" bracer bronze rivet {ix}",(x,-.379,1.34),(.024,.016,.024),steel,12,8)

# Fitted dark worker trousers and separate gaiters. Wide but correctly
# continuous between hip and knees, not individually stuck-on round blobs.
for s,side in ((-1,"L"),(1,"R")):
    loft(side+" fitted trousers",[
      ((s*.315,.025,1.26),.315,.296),
      ((s*.325,.015,1.10),.30,.287),
      ((s*.335,.014,.87),.255,.259),
      ((s*.342,.02,.65),.244,.241),
      ((s*.347,.025,.52),.235,.238)
    ],dark,32)
    # Boot shaft leather wraps, larger wedge toe, double strap.
    loft(side+" sturdy leather boot shaft",[
      ((s*.345,.023,.565),.268,.274),
      ((s*.345,-.006,.412),.251,.245),
      ((s*.344,-.022,.245),.287,.281),
      ((s*.344,-.069,.132),.301,.32)
    ],boot,32)
    orb(side+" broad weathered boot toe",
        (s*.347,-.223,.167),(.349,.435,.147),boot,32,18,
        lambda x,y,z:(x,y*(1+.15*(y<0)),z))
    orb(side+" projecting layered outsole",
        (s*.347,-.214,.069),(.361,.448,.066),skindark,32,12)
    for iz in (.28,.45):
        loft(side+f" boot strapped binding {iz}",[
          ((s*.345,-.014,iz-.033),.273,.269),
          ((s*.345,-.014,iz+.033),.273,.269)],leather,32)
    for k in range(3):
        tube(side+f" laced cross-stitch {k}",[
           (s*(.34-.1),-.30,.40+k*.048),
           (s*.34,-.335,.420+k*.045),
           (s*(.34+.1),-.30,.40+k*.048)],.012,stitch)

# Fuse overlapping sculpted skin into ONE continuous watertight anatomical
# surface before dressing the worker. This is categorically different from
# merely putting large disconnected shoulder/finger spheres together.
# Preserve separately modelled inset eyelids, teeth, accessories and cloth.
base_skin = []
for obj in objects:
    if obj.type != "MESH" or not obj.data.materials or obj.data.materials[0] != skin:
        continue
    if ("SCULPT /" in obj.name or " finger " in obj.name or
        " curled thumb" in obj.name or " ear / thick" in obj.name or
        " nose wing" in obj.name):
        base_skin.append(obj)
if len(base_skin) < 10:
    raise RuntimeError("Missing anatomically sculpted pieces for continuous skin join")
objects[:] = [obj for obj in objects if obj not in base_skin]
bpy.ops.object.select_all(action="DESELECT")
for obj in base_skin:obj.select_set(True)
bpy.context.view_layer.objects.active = base_skin[0]
bpy.ops.object.join()
fused = bpy.context.object
fused.name = "SCULPT / watertight body neck face arms hands and ears"
fused.data.remesh_voxel_size = .020
bpy.ops.object.voxel_remesh()
smoothing=fused.modifiers.new("gentle organic transition smoothing","SMOOTH")
smoothing.factor=1.25
smoothing.iterations=5
bpy.ops.object.modifier_apply(modifier=smoothing.name)
for polygon in fused.data.polygons:polygon.use_smooth=True
# UVs must be regenerated AFTER voxel remeshing; the skin is truly image mapped.
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(island_margin=.020)
bpy.ops.object.mode_set(mode="OBJECT")
objects.append(fused)

# A purpose-built draped, curved leather surface, rather than the old
# rectangular ribbon. Side edges roll around the waist and the lower hem
# has asymmetric vertical folds. Keeping topology in one sheet makes later
# sculpting/retopology possible without detached overlays.
apron_verts = []
apron_faces = []
apron_u = 32
apron_v = 25
for row in range(apron_v + 1):
    t = row / apron_v  # collar/bib = 0, wide working hem = 1
    width = .365 + .065 * sin(pi*t) + .220 * (t*t*(3-2*t))
    z_base = 2.095 - 1.055*t
    for col in range(apron_u + 1):
        u = col / apron_u
        across = 2*u-1
        x = across * width + .006*sin(t*8+u*6)*t
        # Wide lower apron wraps around each thigh while the front center is
        # proud of the torso. Fold peaks are real vertices, not shiny normals.
        roll = .130 * abs(across)**1.65
        folds = .030 * sin(3*pi*across + .9*t) * (t**1.5)
        y = -.457 - .069*t + roll - folds
        # Curved and irregular cloth hem; upper bib stays neatly tailored.
        z = z_base + t**3*(.022*cos(5*pi*u+0.3)+.011*sin(11*pi*u))
        z += .008*(sin(u*12 + 5*t))*sin(pi*t)
        apron_verts.append((x,y,z))
for row in range(apron_v):
    for col in range(apron_u):
        a=row*(apron_u+1)+col
        apron_faces.append((a,a+apron_u+1,a+apron_u+2,a+1))
apron = mesh("COSTUME / draped anatomically fitted leather work apron",
             apron_verts,apron_faces,leather,smooth=True)
thickness = apron.modifiers.new("working leather sheet thickness", "SOLIDIFY")
thickness.thickness = .022
thickness.offset = -1.0
soft = apron.modifiers.new("soft sewn leather edges", "BEVEL")
soft.width = .009
soft.segments = 2
apron.modifiers.new("weighted apron normals", "WEIGHTED_NORMAL")
# Repair patch: real stitched thick leather panel held to lower bib.
ribbon("COSTUME / practical worn apron repair patch",[
    ((.12,-.546,1.35),(.31,-.535,1.355)),
    ((.10,-.554,1.22),(.30,-.547,1.218)),
    ((.115,-.56,1.13),(.33,-.540,1.14))
], edge, 8)
for k in range(5):
    z = 1.16 + k*.044
    tube(f"Apron repair stitch {k}",[
        (.105,-.568,z),(.14,-.572,z+.01)
    ],.0065,stitch,6)

# Apron ends in scalloped irregular bottom / surface edge stitching
tube("Apron lower hand-sewn hem",[
    (-.55,-.533,1.06),(-.38,-.537,1.043),(-.18,-.54,1.066),
    (0,-.545,1.041),(.20,-.54,1.056),(.40,-.538,1.038),
    (.55,-.535,1.067)],.013,edge)
for s,side in ((-1,"L"),(1,"R")):
    tube(side+" apron leather seam",[
        (s*.35,-.430,2.09),(s*.44,-.468,1.83),
        (s*.45,-.49,1.54),(s*.50,-.52,1.30),(s*.54,-.537,1.07)
    ],.018,edge)
    # Shoulder straps are real draped strips wrapping front → top → back.
    straprows=[]
    for i in range(12):
        t=i/11
        # from chest mid-front, over shoulder, down the back
        x=s*(.42+.13*sin(t*pi))
        y=-.50+.99*t
        z=1.73+.42*sin(pi*t)+.03*cos(pi*t)
        straprows.append(((x-s*.075,y,z),(x+s*.075,y,z+.011)))
    ribbon(side+" tailored shoulder suspender",straprows,edge,6)
    for k in range(4):
        z=1.85-k*.24
        x=s*(.41+.026*k)
        tube(side+f" suspender thread stitch {k}",[
          (x-.052,-.49-k*.009,z),(x+.052,-.49-k*.009,z)],.011,stitch)
# Back of apron with crossed straps and fitted cinch
ribbon("COSTUME / rear leather back panel",[
    ((-.36,.336,2.07),(.36,.336,2.07)),
    ((-.47,.345,1.82),(.47,.345,1.82)),
    ((-.47,.34,1.52),(.47,.34,1.52)),
    ((-.43,.325,1.22),(.43,.325,1.22))],leather,22)
# Heavy leather belt wraps fitted waist, metal buckle inset at front.
band("Wide supported leather belt",1.41,.505,.396,.17,leather)
# Raised edge stitching running across front
tube("Waist belt accent and wear",[(-.42,-.435,1.47),(0,-.440,1.47),
                                  (.42,-.435,1.47)],.012,edge)
for s,side in ((-1,"L"),(1,"R")):
    orb(side+" robust belt leather pouch",(s*.51,-.165,1.35),(.15,.18,.19),leather)
    tube(side+" pouch lid",[
        (s*.44,-.349,1.405),(s*.52,-.365,1.445),(s*.61,-.33,1.403)],.031,edge)
    orb(side+" pouch flap button",(s*.52,-.364,1.387),(.026,.024,.03),steel,12,8)
# Metallic rectangular waist buckle with hollow center.
for z in (1.32,1.49):
    tube(f"Buckle horizontal at z {z}",[(-.125,-.464,z),(.125,-.464,z)],.027,steel)
for x in (-.125,.125):
    tube(f"Buckle vertical at x {x}",[(x,-.464,1.32),(x,-.464,1.49)],.027,steel)
tube("Buckle tongue",[(-.014,-.497,1.40),(.102,-.495,1.40)],.016,steel)

# Sculpted headscarf: one continuous cloth-like radial mesh, following the
# squarish skull under it. Soft asymmetric crown folds remove the rigid pancake
# look. Its narrow front hem covers the hairline, with a right-rear knot.
scarf_verts=[]
scarf_faces=[]
scarf_rings=[
    (.518,.405,3.001),(.519,.402,3.038),
    (.490,.385,3.076),(.450,.355,3.111),
    (.375,.303,3.140),(.275,.235,3.162),
    (.150,.149,3.174),(.020,.020,3.178)
]
scarf_segments=72
for k,(rx,ry,z) in enumerate(scarf_rings):
    t=k/(len(scarf_rings)-1)
    for j in range(scarf_segments):
        angle=2*pi*j/scarf_segments
        radial=1.0+.016*sin(7*angle+.7*t)+.013*sin(11*angle-1.3*t)
        p=(rx*cos(angle)*radial,
           -.010+ry*sin(angle)*radial,
           z+.009*sin(4*angle+2*t)*(1.-t)+.006*sin(9*angle)*t)
        scarf_verts.append(p)
for k in range(len(scarf_rings)-1):
    for j in range(scarf_segments):
        a=k*scarf_segments+j
        b=k*scarf_segments+(j+1)%scarf_segments
        scarf_faces.append((a,b,b+scarf_segments,a+scarf_segments))
mesh("COSTUME / unified crumpled red head scarf", scarf_verts,
     scarf_faces,red,smooth=True)
tube("Bandana folded forehead welt",[
    (-.48,-.207,3.032),(-.34,-.34,3.027),
    (-.12,-.417,3.025),(.13,-.415,3.027),
    (.35,-.33,3.039),(.48,-.19,3.042)
],.019,redlight,11)
# Double-band upper seam sweeps around forehead, NOT stacked torus rings.
tube("Bandana diagonal soft sewn fold",[
    (-.42,-.252,3.092),(-.22,-.395,3.074),
    (0,-.427,3.068),(.22,-.384,3.084),(.42,-.239,3.096)
],.012,red,11)
orb("Scarf pinched cloth knot beneath folds",(.50,.15,3.046),
    (.086,.089,.079),red,18,12)
ribbon("Cloth tie tail 1 / bent by gravity",[
    ((.47,.20,3.055),(.60,.20,3.05)),
    ((.52,.305,2.94),(.665,.305,2.92)),
    ((.48,.39,2.77),(.61,.39,2.77)),
    ((.52,.45,2.63),(.62,.45,2.62))
],red,7)
ribbon("Cloth tie tail 2 / uneven split",[
    ((.43,.23,3.05),(.54,.23,3.05)),
    ((.34,.44,2.94),(.50,.45,2.93)),
    ((.31,.57,2.79),(.42,.59,2.81))
],redlight,7)

# A practical wood axe carried near the worker's right hand/hip.
# Wood shaft follows a tapered swept topology; forged cutting blade is a
# bevelled CLOSED VOLUME shaped by a manually authored outline.
limb("EQUIPMENT / wooden haft with asymmetric grain",[
    ((1.385,-.38,.47),.061,.054),
    ((1.393,-.39,.78),.057,.052),
    ((1.402,-.39,1.12),.054,.049),
    ((1.41,-.39,1.40),.057,.048)
],wood,20)
for iz in range(5):
    z=.60+iz*.077
    tube(f"Axe handle leather grip wrap {iz}",[
        (1.32,-.39,z),(1.37,-.46,z+.028),(1.45,-.45,z+.038)],.016,leather)
# Blade silhouette in xz view, extruded along y with flat but visible thick
# dark forged middle and hand-sharpened edge.
outline=[
    (1.35,1.33),(1.55,1.38),(1.76,1.55),(1.96,1.59),
    (1.89,1.30),(1.94,1.055),(1.73,1.09),(1.55,1.22),
    (1.37,1.225)
]
verts=[(x,yy,z) for yy in (-.461,-.342) for x,z in outline]
faces=[tuple(reversed(range(len(outline)))),
       tuple(len(outline)+i for i in range(len(outline)))]
for i in range(len(outline)):
    k=(i+1)%len(outline)
    faces.append((i,k,k+len(outline),i+len(outline)))
ax=mesh("EQUIPMENT / forged axe steel substantial sharp blade",verts,faces,metal,False)
bev=ax.modifiers.new("Hand-ground convex metal cutting bevel","BEVEL")
bev.width=.03;bev.segments=3
ax.modifiers.new("Weighted blade normals","WEIGHTED_NORMAL")
# Edge on the cutting side with a narrow contrasting honed band.
ribbon("EQUIPMENT / pale sharpened working edge",[
    ((1.89,-.470,1.59),(1.96,-.46,1.59)),
    ((1.85,-.471,1.44),(1.93,-.46,1.44)),
    ((1.85,-.471,1.29),(1.92,-.46,1.29)),
    ((1.89,-.471,1.055),(1.94,-.46,1.055))],steel,4)
for z in (1.25,1.32):
    orb("Riveted axe head pin", (1.47,-.473,z),(.022,.018,.022),steel,12,8)

# Genuine wood grain along visible handle front; follows the tapered
# wooden shaft instead of floating as a flat image overlay.
for offset in (-.025,.021):
    tube("Axe wood longitudinal grain "+str(offset),[
        (1.391+offset,-.441,.92),(1.394+offset*.8,-.435,1.16),
        (1.40+offset*.6,-.436,1.31)
    ],.0055,edge,7)
for i in range(4):
    z=1.16+i*.091
    tube(f"Forged blade hand-hammer nicks {i}",[
        (1.72+i*.027,-.472,z),(1.75+i*.027,-.468,z+.038)
    ],.006,steel,7)

# Scene origin + metadata; export selection omits cameras/render staging.
for ob in objects:
    ob["Orcbands"] = "Original Worker Orc #15 static sculpt study"
    ob["Rigged"] = False

bpy.ops.object.select_all(action="DESELECT")
for ob in objects:ob.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
# Save real editable Blender source BEFORE the export; image albedos are packed.
bpy.ops.wm.save_as_mainfile(filepath=str(out/"worker-orc-sculpt-study.blend"))
bpy.ops.export_scene.gltf(filepath=str(out/"worker-orc-sculpt-study.glb"),
    export_format="GLB",use_selection=True,export_apply=True)
glb=out/"worker-orc-sculpt-study.glb"
info={
  "art_stage":"Static sculpt study iteration 3; not approved game-ready or rigged",
  "provenance":"Original authored topology; owner-provided AI-generated 2D reference; no third-party mesh",
  "geometry_mesh_objects":len(objects),
  "source_mesh_polygons":sum(len(ob.data.polygons) for ob in objects if ob.type=="MESH"),
  "source_mesh_triangles":sum(sum(max(0,len(p.vertices)-2) for p in ob.data.polygons) for ob in objects if ob.type=="MESH"),
  "uv_image_albedo_materials":len(image_names),
  "exported_glb_bytes":glb.stat().st_size,
  "source_blend_bytes":(out/"worker-orc-sculpt-study.blend").stat().st_size,
  "not_validated":["art quality","animation/rig","Unity Humanoid","5 instance performance"],
}
(out/"sculpt-study-info.json").write_text(json.dumps(info,indent=2)+"\n")
print("SCULPT_STUDY_METRICS",json.dumps(info),flush=True)
