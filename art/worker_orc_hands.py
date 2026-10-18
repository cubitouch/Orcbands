"""Worker hands: inward-facing relaxed right palm and a left power grip.

Character faces -Y in Blender. Anatomical LEFT is +X (viewer-right in front).
Legacy L/R mesh labels used screen sides; new hand/prop metadata is anatomical.
The left fingers are authored around the same haft axis used by the equipment.
"""
HATCHET_AXIS = Vector((1.13, -.27, 1.00))

def finish_hand(palm, pieces, side):
    objects[:] = [ob for ob in objects if ob not in pieces]
    bpy.ops.object.select_all(action='DESELECT')
    for ob in pieces: ob.select_set(True)
    bpy.context.view_layer.objects.active=palm
    bpy.ops.object.join()
    objects.append(palm)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
    palm.data.remesh_voxel_size=.0065;bpy.ops.object.voxel_remesh()
    sm=palm.modifiers.new('Soft palm and knuckle transitions','SMOOTH');sm.factor=.45;sm.iterations=3
    bpy.ops.object.modifier_apply(modifier=sm.name)
    for p in palm.data.polygons:p.use_smooth=True
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(island_margin=.015);bpy.ops.object.mode_set(mode='OBJECT')
    palm['ART02_hand']=True;palm['anatomical_side']=side
    palm['palm_direction']='inward toward ipsilateral thigh'
    return palm

def nail_material(side):
    m=skin.copy();m.name=side+' worn olive nails'
    bs=m.node_tree.nodes.get('Principled BSDF')
    for link in list(m.node_tree.links):
        if link.to_socket==bs.inputs['Base Color']:m.node_tree.links.remove(link)
    bs.inputs['Base Color'].default_value=(.12,.145,.065,1)
    bs.inputs['Roughness'].default_value=.63
    return m

def worker_hand(s,legacy_side):
    if s==1:
        left_grip()
    else:
        right_relaxed()

def right_relaxed():
    start=len(objects)
    palm=loft('R / inward relaxed palm',[
      ((-1.12,-.172,1.245),.145,.135),((-1.125,-.182,1.18),.15,.124),
      ((-1.13,-.196,1.105),.177,.116),((-1.14,-.210,1.035),.19,.113),
      ((-1.145,-.218,.982),.176,.100),((-1.145,-.222,.952),.145,.073)],skin,40)
    tips=[]
    for k,(x,tip,r) in enumerate([(.995,.735,.049),(1.095,.698,.052),(1.198,.724,.049),(1.29,.786,.041)]):
        root=.998-(.012 if k==3 else 0);span=root-tip;spread=(k-1.3)*.013
        pts=[((-x,-.224,root+.045),r*.94,r*1.02),
             ((-(x+spread*.25),-.233,root),r,r*1.06),
             ((-(x+spread*.60),-.230,root-span*.35),r*.91,r*.96),
             ((-(x+spread),-.210,root-span*.55),r*.94,r*.95),
             ((-(x+spread),-.185,root-span*.79),r*.79,r*.83),
             ((-(x+spread*.90),-.170,tip+.021),r*.75,r*.78),
             ((-(x+spread*.90),-.168,tip+.008),r*.57,r*.60),
             ((-(x+spread*.90),-.167,tip),r*.12,r*.14)]
        finger=limb('R / relaxed finger '+str(k+1),pts,skin,24)
        sub=finger.modifiers.new('Rounded finger joints','SUBSURF');sub.levels=1
        bpy.context.view_layer.objects.active=finger;bpy.ops.object.modifier_apply(modifier=sub.name)
        tips.append((-(x+spread*.90),tip,r))
    limb('R / thenar pad',[
      ((-1.01,-.230,1.13),.087,.085),((-.966,-.264,1.063),.083,.079),
      ((-.955,-.282,1.013),.060,.061)],skin,28)
    thumb=limb('R / relaxed opposed thumb',[
      ((-.971,-.263,1.09),.063,.069),((-.921,-.289,1.045),.066,.066),
      ((-.881,-.321,.995),.058,.058),((-.873,-.349,.953),.055,.052),
      ((-.889,-.367,.919),.045,.044),((-.903,-.370,.903),.027,.029),
      ((-.911,-.369,.897),.009,.011)],skin,28)
    sub=thumb.modifiers.new('Thumb joints','SUBSURF');sub.levels=1
    bpy.context.view_layer.objects.active=thumb;bpy.ops.object.modifier_apply(modifier=sub.name)
    pieces=objects[start:];finish_hand(palm,pieces,'R')
    nails=[];mat=nail_material('R')
    for k,(x,tip,r) in enumerate(tips):
        # Low convex plates embedded in the dorsal distal surface.
        nail=orb('R / nail '+str(k+1),(x,-.170-r*.74,tip+.043),
                 (r*.46,.006,.026),mat,24,12)
        nails.append(nail)
    nails.append(orb('R / thumb nail',(-.888,-.402,.940),(.023,.006,.027),mat,24,12))
    # Rotate complete hand and nail assembly around its own wrist. Palm +Y
    # becomes +X (toward the right leg); the thumb moves to the front (-Y).
    for ob in [palm]+nails:
        for v in ob.data.vertices:
            x,y,z=v.co;dx=x+1.12;dy=y+.172
            # Rotate as a unit: the nearly round wrist stays centered under
            # the cuff without twisting the broad thenar web into a fin.
            angle=-pi*.5
            v.co.x=-1.12+dx*cos(angle)-dy*sin(angle)
            v.co.y=-.172+dx*sin(angle)+dy*cos(angle)
        ob['ART02_hand']=True;ob['anatomical_side']='R';ob.data.update()

def left_grip():
    start=len(objects)
    # Palm plane is YZ; dorsal side is +X, inner palm faces left thigh (-X).
    palm=loft('L / inward power-grip palm',[
      ((1.12,-.172,1.245),.145,.135),((1.16,-.154,1.18),.115,.125),
      ((1.190,-.155,1.10),.077,.116),((1.195,-.155,1.00),.073,.108),
      ((1.187,-.157,.91),.066,.100),((1.174,-.174,.838),.055,.073),
      ((1.165,-.183,.811),.033,.041)],skin,40)
    specs=[(1.105,.044),(1.010,.046),(.916,.043),(.832,.036)]
    for k,(z,r) in enumerate(specs):
        verts=[];faces=[];steps=36;segments=20
        for j in range(steps+1):
            u=j/steps;theta=math.radians(48-231*u)
            # Gentle distal taper, with a rounded closed fingertip.
            taper=1.0 if u<.88 else max(.07,sqrt(max(0,1-((u-.88)/.12)**2)))
            radial=.104
            cx=HATCHET_AXIS.x+radial*cos(theta);cy=HATCHET_AXIS.y+radial*sin(theta)
            for h in range(segments):
                a=2*pi*h/segments
                verts.append((cx+r*taper*cos(a)*cos(theta),
                              cy+r*taper*cos(a)*sin(theta),z+r*taper*sin(a)))
        for j in range(steps):
            for h in range(segments):
                a=j*segments+h;b=j*segments+(h+1)%segments
                faces.append((a,b,b+segments,a+segments))
        faces.extend([tuple(reversed(range(segments))),tuple(steps*segments+h for h in range(segments))])
        mesh('L / curled grip finger '+str(k+1),verts,faces,skin)
    # Thumb passes over the front of the index/middle grip, opposing fingers.
    thumb=limb('L / opposed gripping thumb',[
      ((1.15,-.245,1.177),.067,.069),((1.13,-.302,1.153),.065,.062),
      ((1.104,-.355,1.117),.059,.057),((1.070,-.385,1.077),.052,.050),
      ((1.028,-.383,1.046),.045,.041),((1.005,-.369,1.036),.030,.029),
      ((.997,-.361,1.035),.007,.009)],skin,28)
    sub=thumb.modifiers.new('Rounded opposing thumb','SUBSURF');sub.levels=1
    bpy.context.view_layer.objects.active=thumb;bpy.ops.object.modifier_apply(modifier=sub.name)
    finish_hand(palm,objects[start:],'L')
    mat=nail_material('L')
    for k,(z,r) in enumerate(specs):
        verts=[];faces=[]
        for row in range(7):
            u=.70+.14*row/6;theta=math.radians(48-231*u)
            taper=1.0
            for col in range(9):
                v=col/8*2-1;offset=v*r*.48
                radius=.104+r*taper*sqrt(max(0,1-(offset/(r*taper))**2))-.002
                verts.append((HATCHET_AXIS.x+radius*cos(theta),HATCHET_AXIS.y+radius*sin(theta),z+offset))
        for row in range(6):
            for col in range(8):
                a=row*9+col;faces.append((a,a+1,a+10,a+9))
        ob=mesh('L / fitted grip nail '+str(k+1),verts,faces,mat)
        ob['ART02_hand']=True;ob['anatomical_side']='L'
    ob=orb('L / fitted thumb nail',(1.033,-.421,1.057),(.021,.005,.023),mat,24,12)
    ob['ART02_hand']=True;ob['anatomical_side']='L'
