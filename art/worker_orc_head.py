"""ART-01 authored head surface. Executed in the character build namespace.

Landmark sections define the jaw/profile; fine orbital and muzzle sculpting is
applied to this surface. The head is kept out of the coarse body remesh.
All generated meshes remain editable in the saved Blender source.
"""
head_start = len(objects)
# z, half width, front plane, back plane. Deliberately projecting mandible,
# tucked temple, and long occipital arc instead of spherical skull proportions.
sections = [
 (2.285,.19,-.20,.18),(2.32,.28,-.36,.24),
 (2.36,.36,-.47,.27),(2.40,.405,-.535,.29),
 (2.44,.425,-.565,.31),(2.48,.43,-.557,.325),
 (2.52,.423,-.526,.34),(2.56,.425,-.488,.35),
 (2.60,.44,-.451,.355),(2.65,.462,-.420,.36),
 (2.70,.463,-.402,.365),(2.75,.449,-.395,.368),
 (2.80,.438,-.405,.37),(2.85,.433,-.424,.366),
 (2.90,.43,-.424,.36),(2.95,.424,-.40,.348),
 (3.00,.392,-.358,.32),(3.05,.31,-.28,.265),
 (3.09,.19,-.17,.18),(3.11,.025,-.025,.025)]
# Catmull-Rom interpolation retains deliberately placed facial landmarks.
def cat(a,b,c,d,t):
    return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)
rows=[]
for i in range(len(sections)-1):
    for k in range(5):
        rows.append(tuple(cat(sections[max(i-1,0)][j],sections[i][j],
                              sections[i+1][j],sections[min(i+2,len(sections)-1)][j],k/5)
                          for j in range(4)))
rows.append(sections[-1])
v=[];f=[];N=128
for z,w,front,back in rows:
    for j in range(N):
        t=2*pi*j/N
        x=w*sin(t)
        # Broad flat facial planes become rounded at the cheek's lateral edge.
        frontness=max(0,cos(t))
        y=(front*frontness**.47 if cos(t)>=0 else back*(-cos(t))**.83)
        if frontness>0:
            # Orbital depression, zygomatic arch and sculpted muzzle pads.
            y+=.074*gauss(abs(x),z,.235,2.783,.115,.065)*frontness
            y-=.049*gauss(abs(x),z,.335,2.682,.105,.07)*frontness
            y-=.033*gauss(abs(x),z,.145,2.568,.14,.055)*frontness
            # Downturned mouth cut and soft roll below it are in the same skin.
            line=2.505-.038*(abs(x)/.34)**1.6
            y+=.038*exp(-((z-line)/.011)**2)*exp(-(x/.35)**8)*frontness
            y-=.022*gauss(x,z,0,2.456,.32,.024)*frontness
            # Low-relief folds: no separate dark tubes.
            foldx=.18+max(0,2.62-z)*.72
            y+=.014*exp(-((abs(x)-foldx)/.015)**2)*exp(-((z-2.565)/.070)**2)*frontness
            y+=.009*gauss(x,z,.012,2.91,.014,.055)*frontness
            y-=.008*gauss(x,z,-.18,2.425,.17,.06)*frontness
        v.append((x,y,z))
for i in range(len(rows)-1):
    for j in range(N):
        a=i*N+j;b=i*N+(j+1)%N
        f.append((a,b,b+N,a+N))
f.extend([tuple(reversed(range(N))),tuple((len(rows)-1)*N+j for j in range(N))])
face=mesh('ART01 / continuous mandible muzzle cheek and cranium',v,f,skin)

# Sculpt the broad nasal wedge as a closed loft with developed alar lobes.
nose=loft('ART01 / nasal bridge tip and alae',[
 ((0,-.425,2.855),.045,.035),((0,-.449,2.80),.063,.047),
 ((0,-.493,2.744),.070,.069),((0,-.543,2.696),.117,.098),
 ((0,-.558,2.679),.139,.094),((0,-.547,2.649),.153,.080),
 ((0,-.519,2.624),.123,.051),((0,-.482,2.612),.058,.020)],skin,64)
bpy.context.view_layer.objects.active=nose
sub=nose.modifiers.new('Round nasal cartilage','SUBSURF');sub.levels=2
bpy.ops.object.modifier_apply(modifier=sub.name)
# Fuse nose to the face at finer resolution than the body; preserve orbital
# creases after this operation via the separately authored lid topology.
bpy.ops.object.select_all(action='DESELECT')
face.select_set(True);nose.select_set(True)
# Brow tissue joins the forehead instead of reading as pasted eyebrows.
for s,label in ((-1,'L'),(1,'R')):
    brow=limb(label+' brow sculpt volume',[
      ((s*.065,-.400,2.837),.025,.032),
      ((s*.135,-.427,2.848),.052,.064),
      ((s*.22,-.421,2.867),.059,.063),
      ((s*.31,-.381,2.88),.054,.058),
      ((s*.397,-.295,2.87),.025,.036)],skin,32)
    bpy.context.view_layer.objects.active=brow
    sub=brow.modifiers.new('Relax brow','SUBSURF');sub.levels=2
    bpy.ops.object.modifier_apply(modifier=sub.name)
    brow['join_head']=True
bpy.ops.object.select_all(action='DESELECT')
face.select_set(True);nose.select_set(True)
joined_brows=[o for o in objects if o.get('join_head')]
for ob in joined_brows:ob.select_set(True)
for ob in joined_brows:objects.remove(ob)
bpy.context.view_layer.objects.active=face
bpy.ops.object.join()
objects.remove(nose)
face.data.remesh_voxel_size=.007
bpy.ops.object.voxel_remesh()
sm=face.modifiers.new('Sculpt surface relaxation','SMOOTH');sm.factor=.65;sm.iterations=3
bpy.ops.object.modifier_apply(modifier=sm.name)
for p in face.data.polygons:p.use_smooth=True
# Actual nostril cavities carved in the nasal wings, with shadowed interior.
for s,label in ((-1,'L'),(1,'R')):
    cutter=orb(label+' nostril cutter',(s*.100,-.623,2.656),(.036,.049,.025),skin,32,20)
    bpy.context.view_layer.objects.active=face
    mod=face.modifiers.new('Carve '+label+' nostril','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    objects.remove(cutter);bpy.data.objects.remove(cutter,do_unlink=True)
    orb(label+' nostril interior',(s*.100,-.579,2.656),(.033,.015,.019),skindark,24,16)
# Restrained post-remesh skin sculpt; shallow folds follow facial landmarks.
for vert in face.data.vertices:
    x,y,z=vert.co
    if y < -.24:
        mask=clamp((-y-.24)/.12)
        # under-eye crease and nasolabial transition; subtle asymmetry at chin
        crease_z=2.705+.09*(abs(x)-.23)
        vert.co.y += .007*exp(-((z-crease_z)/.006)**2)*exp(-((abs(x)-.26)/.10)**4)*mask
        vert.co.y += .006*gauss(x,z,-.018,2.413,.012,.027)*mask
        vert.co.y -= .006*gauss(x,z,-.27,2.56,.12,.07)*mask
# Pigmentation is portable vertex color multiplied by the existing image
# albedo in glTF, and remains visible in the editable Blender source.
colors=face.data.color_attributes.new(name='Facial pigmentation',type='FLOAT_COLOR',domain='CORNER')
for loop in face.data.loops:
    x,y,z=face.data.vertices[loop.vertex_index].co
    lip=gauss(x,z,0,2.467,.32,.029)*clamp((-y-.35)/.15)
    cheek=gauss(abs(x),z,.34,2.65,.10,.08)*clamp(-y/.35)
    colors.data[loop.index].color=(1-.07*lip,1-.14*lip-.04*cheek,1-.10*lip-.06*cheek,1)
face_mat=skin.copy();face_mat.name='ART01 olive facial pigmentation'
face.data.materials.clear();face.data.materials.append(face_mat)
nt=face_mat.node_tree
attr=nt.nodes.new('ShaderNodeVertexColor');attr.layer_name='Facial pigmentation'
mix=nt.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
tex=next(n for n in nt.nodes if n.type=='TEX_IMAGE')
nt.links.new(tex.outputs['Color'],mix.inputs[1]);nt.links.new(attr.outputs['Color'],mix.inputs[2])
nt.links.new(mix.outputs[0],nt.nodes.get('Principled BSDF').inputs['Base Color'])
# Regenerate real UVs following the sculpt union and cavity cuts.
bpy.context.view_layer.objects.active=face
bpy.ops.object.select_all(action='DESELECT');face.select_set(True)
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(island_margin=.015);bpy.ops.object.mode_set(mode='OBJECT')

for s,label in ((-1,'L'),(1,'R')):
    # Small eyeball, with eyelid surface wrapping from almond aperture out
    # into the orbital rim. Eyelids are annular surfaces, not round tubes.
    cx=s*.235;cz=2.778+( .004 if s<0 else 0)
    orb(label+' inset eyeball',(cx,-.391,cz),(.084,.061,.052),eye,40,24)
    orb(label+' iris',(cx+s*.004,-.449,cz),(.029,.008,.033),iris,32,20)
    orb(label+' catchlight',(cx-.009,-.457,cz+.012),(.008,.003,.008),bone,16,12)
    vv=[];ff=[];seg=64
    for ring in range(5):
        u=ring/4
        for j in range(seg):
            a=2*pi*j/seg
            localx=(.080+.045*u)*cos(a)
            zz=(.025+.052*u)*sin(a)+.011*cos(a)*s
            yy=-.445+.111*u-.010*sin(pi*u)
            vv.append((cx+localx,yy,cz+zz))
    for ring in range(4):
        for j in range(seg):
            a=ring*seg+j;b=ring*seg+(j+1)%seg;ff.append((a,b,b+seg,a+seg))
    mesh(label+' ART01 / wrapping upper and lower eyelids',vv,ff,skin)
    # Thick oval ears with a raised helix, concave bowl and solid back.
    vv=[];ff=[];seg=64
    for ring in range(7):
        r=ring/6
        for j in range(seg):
            a=2*pi*j/seg
            x=s*(.477+.106*r*cos(a)+.025*r*sin(a))
            z=2.775+.137*r*sin(a)
            y=-.015-.064*exp(-((r-.80)/.22)**2)+.015*(1-r)
            vv.append((x,y,z))
    for ring in range(6):
        for j in range(seg):
            a=ring*seg+j;b=ring*seg+(j+1)%seg;ff.append((a,b,b+seg,a+seg))
    ear=mesh(label+' ART01 / sculpted helix concha and lobe',vv,ff,skin)
    solid=ear.modifiers.new('Cartilage thickness','SOLIDIFY');solid.thickness=.035
    sub=ear.modifiers.new('Soft cartilage','SUBSURF');sub.levels=1
    # Tusks begin inside the mouth and curve up and back with compact tips.
    tusk=limb(label+' ART01 / curved lower canine',[
       ((s*.306,-.504,2.472),.058,.052),
       ((s*.321,-.550,2.519),.059,.050),
       ((s*.333,-.570,2.575),.044,.038),
       ((s*.337,-.561,2.625),.025,.023),
       ((s*.326,-.539,2.669),.003,.003)],bone,28)
    sub=tusk.modifiers.new('Smooth ivory curvature','SUBSURF');sub.levels=2
# Thin recessed mouth lining, hidden by the sculpted lip except at the slit.
tube('ART01 / recessed mouth lining',[
 (-.31,-.477,2.474),(-.23,-.527,2.490),(0,-.538,2.502),
 (.23,-.527,2.490),(.31,-.477,2.474)],.012,skindark,12)
for ob in objects[head_start:]:
    ob['ART01_head']=True
