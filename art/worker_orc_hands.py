"""ART-02: relaxed worker hands; fine skin union, sculpted joints and nail plates."""
def worker_hand(s,side):
    start=len(objects)
    palm=loft(side+' ART02 / wrist metacarpals and palm',[
      ((s*1.12,-.172,1.245),.145,.135),
      ((s*1.125,-.182,1.18),.15,.124),
      ((s*1.13,-.196,1.105),.177,.116),
      ((s*1.14,-.210,1.035),.19,.113),
      ((s*1.145,-.218,.982),.176,.100),
      ((s*1.145,-.222,.952),.145,.073)],skin,40)
    finger_specs=[(.995,.735,.049),(1.095,.698,.052),(1.198,.724,.049),(1.29,.786,.041)]
    tips=[]
    for k,(x,tip,r) in enumerate(finger_specs):
        root=.998-(.012 if k==3 else 0)
        span=root-tip
        spread=(k-1.3)*.013
        pts=[((s*x,-.224,root+.045),r*.94,r*1.02),
             ((s*(x+spread*.25),-.233,root),r,r*1.06),
             ((s*(x+spread*.60),-.246,root-span*.35),r*.91,r*.96),
             ((s*(x+spread),-.273,root-span*.55),r*.94,r*.95),
             ((s*(x+spread),-.297,root-span*.79),r*.79,r*.83),
             ((s*(x+spread*.90),-.304,tip+.021),r*.75,r*.78),
             ((s*(x+spread*.90),-.301,tip+.008),r*.57,r*.60),
             ((s*(x+spread*.90),-.297,tip),r*.12,r*.14)]
        finger=limb(side+f' ART02 / finger {k+1} phalanges',pts,skin,24)
        sub=finger.modifiers.new('Round relaxed finger transitions','SUBSURF');sub.levels=1
        bpy.context.view_layer.objects.active=finger;bpy.ops.object.modifier_apply(modifier=sub.name)
        tips.append((s*(x+spread*.90),tip,r))
    # Thenar pad and opposed thumb: the web remains open below the first joint.
    limb(side+' ART02 / thenar pad',[
      ((s*1.01,-.230,1.13),.087,.085),
      ((s*.966,-.264,1.063),.083,.079),
      ((s*.955,-.282,1.013),.060,.061)],skin,28)
    thumb=limb(side+' ART02 / opposed thumb',[
      ((s*.971,-.263,1.09),.063,.069),
      ((s*.921,-.289,1.045),.066,.066),
      ((s*.881,-.321,.995),.058,.058),
      ((s*.873,-.349,.953),.055,.052),
      ((s*.889,-.367,.919),.045,.044),
      ((s*.903,-.370,.903),.027,.029),
      ((s*.911,-.369,.897),.009,.011)],skin,28)
    sub=thumb.modifiers.new('Thumb joints','SUBSURF');sub.levels=1
    bpy.context.view_layer.objects.active=thumb;bpy.ops.object.modifier_apply(modifier=sub.name)
    pieces=objects[start:]
    bpy.ops.object.select_all(action='DESELECT')
    for ob in pieces:ob.select_set(True)
    bpy.context.view_layer.objects.active=palm;bpy.ops.object.join()
    objects[start:]=[palm]
    palm.name=side+' ART02 / continuous hand and separated digits'
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
    palm.data.remesh_voxel_size=.0065;bpy.ops.object.voxel_remesh()
    sm=palm.modifiers.new('Soft skin transitions','SMOOTH');sm.factor=.65;sm.iterations=3
    bpy.ops.object.modifier_apply(modifier=sm.name)
    # Shallow joint folds sculpted into skin; no dark floating crease strips.
    for vert in palm.data.vertices:
        x,y,z=vert.co
        if y<-.25:
            for k,(fx,tip,r) in enumerate(finger_specs):
                joint=.998-(.998-tip)*.55
                mask=exp(-((abs(x)-fx)/(r*.75))**4)
                vert.co.y+=.0045*exp(-((z-joint)/.006)**2)*mask
            # Fanned dorsal tendons fade into wrist and knuckle pads.
            if z>1.015:
                for fx in (1.02,1.12,1.22):
                    vert.co.y-=.004*gauss(abs(x),z,fx,1.075,.016,.07)
    for p in palm.data.polygons:p.use_smooth=True
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(island_margin=.015);bpy.ops.object.mode_set(mode='OBJECT')
    # Low-contrast broad nails fitted to the distal phalanges, not claws.
    nailmat=skin.copy();nailmat.name=side+' ART02 worn olive nails'
    bs=nailmat.node_tree.nodes.get('Principled BSDF')
    for link in list(nailmat.node_tree.links):
        if link.to_socket==bs.inputs['Base Color']:nailmat.node_tree.links.remove(link)
    bs.inputs['Base Color'].default_value=(.12,.145,.065,1);bs.inputs['Roughness'].default_value=.63
    for k,(x,tip,r) in enumerate(tips):
        vv=[];ff=[]
        for row in range(7):
            u=row/6
            z=tip+.018+u*.068
            width=r*.52*sin(pi*(.12+.76*u))
            for col in range(9):
                t=col/8*2-1
                vv.append((x+t*width,-.304-r*.76-.006*(1-t*t)*sin(pi*u),z))
        for row in range(6):
            for col in range(8):
                a=row*9+col;ff.append((a,a+1,a+10,a+9))
        nail=mesh(side+f' ART02 / nail {k+1}',vv,ff,nailmat)
        solid=nail.modifiers.new('Nail plate thickness','SOLIDIFY');solid.thickness=.004
    thumb_nail=orb(side+' ART02 / thumb nail',(s*.888,-.411,.940),(.026,.007,.032),nailmat,28,16)
    for ob in objects[start:]:
        ob['ART02_hand']=True
        ob['anatomical_side']=side
        # ART-03: preserve the wrist root on its OWN same-side forearm.
        # The previous arbitrary inward offset made the two silhouettes
        # harder to read and placed the right fingers away from the axe.
        for vert in ob.data.vertices:
            x,y,z=vert.co
            if side=='L':
                vert.co.x-=.028   # give the empty left hand room beside the hip
                continue
            # Right-hand *static* grip. Keep the root at the wrist bone's
            # x=1.12 / z=1.245; bend the distal palm and digits toward the
            # weapon at x=1.30, y=-.39. No changes to the left arm.
            bend=clamp((1.245-z)/.29)
            vert.co.x+=.082*bend
            vert.co.y-=.071*bend
            vert.co.z+=.080*bend
            # Opposing thumb arcs across the handle instead of pointing
            # into the opposite hand/forearm.
            if x<1.025 and z<1.105:
                thumb_bend=clamp((1.105-z)/.208)
                vert.co.x+=.30*thumb_bend
                vert.co.y-=.022*thumb_bend
        ob.data.update()
