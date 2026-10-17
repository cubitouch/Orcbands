"""Structural GLB/rig checks are not a replacement for visual or Unity Avatar QA."""
import json,struct,sys
from pathlib import Path
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('rig-review')
doc=json.loads((base/'rig-metadata.json').read_text())
assert doc['skinned'] is True and doc['humanoid_validated'] is False
assert doc['mesh_count']>20,doc
assert doc['carry_prop_mesh_count']==3,'Carry requires a visible wooden resource'
assert doc['converted_curve_count']>=10,'Decorative Bezier paths were not skinned'
required={'Hips','Spine','Chest','Neck','Head'}
for s in ('L','R'):required|={f'UpperLeg.{s}',f'LowerLeg.{s}',f'Foot.{s}',f'Shoulder.{s}',f'UpperArm.{s}',f'LowerArm.{s}',f'Hand.{s}'}
assert required.issubset(doc['bones']),required-set(doc['bones'])
path=base/'worker-orc-skinned-experiment.glb'
with path.open('rb') as f:
    header=f.read(20)
    magic,version,total,length,tag=struct.unpack('<4sIIII',header)
    assert magic==b'glTF' and version==2 and tag==0x4e4f534a
    gltf=json.loads(f.read(length))
print('glTF skins:',len(gltf.get('skins',[])),'animations:',[a['name'] for a in gltf.get('animations',[])])
assert gltf.get('skins'), 'No actual skin exported'
mesh_nodes=[n for n in gltf.get('nodes',[]) if 'mesh' in n]
assert mesh_nodes, 'No mesh nodes in export'
assert all('skin' in n for n in mesh_nodes),'Unskinned meshes remain in animated GLB'
assert len([n for n in mesh_nodes if n.get('name','').startswith('CARRY_PROP_')])==3,'Missing real carried-log meshes'
clips=[a.get('name','') for a in gltf.get('animations',[])]
for action in ['Idle','Walk','Chop','Carry']:
    assert any(action.lower() in s.lower() for s in clips),'Missing clip '+action
for a in gltf.get('animations',[]):
    if any(v in a.get('name','').lower() for v in ('idle','walk','chop','carry')):
        assert len(a.get('channels',[]))>=3,'Empty clip '+a.get('name','')
for name in ['rig-qa-idle-13.png','rig-qa-walk-09.png','rig-qa-walk-25.png','rig-qa-chop-09.png','rig-qa-chop-15.png','rig-qa-carry-13.png','worker-orc-skinned-experiment.blend']:
    assert (base/name).stat().st_size>1000,name
print('PASS: actual skinned 3D model, bone hierarchy, four exported animation tracks and rendered pose evidence. No Unity Avatar proof yet.')
