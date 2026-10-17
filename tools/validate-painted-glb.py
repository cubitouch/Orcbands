"""Regression check: painted orc green survives an actual binary GLB export.

Presence of COLOR_0 alone is insufficient: an earlier Blender MixRGB node
exported pale near-white vertex values. Decode actual accessor bytes and PBR
baseColorFactor to ensure the effective character skin is olive green.
"""
import json
import struct
import sys
from pathlib import Path

path=Path(sys.argv[1])
raw=path.read_bytes()
assert raw[:4]==b'glTF', 'Not a GLB file'
json_length=struct.unpack_from('<I',raw,12)[0]
doc=json.loads(raw[20:20+json_length])
chunk_start=20+json_length
bin_length,bin_type=struct.unpack_from('<II',raw,chunk_start)
assert bin_type==0x004e4942,'GLB is missing a BIN chunk'
binary=memoryview(raw)[chunk_start+8:chunk_start+8+bin_length]

types={5121:('B',1,255.0),5123:('H',2,65535.0),5126:('f',4,1.0)}
def color_average(index):
    acc=doc['accessors'][index]
    assert acc['type'] in ('VEC3','VEC4')
    fmt,nbytes,norm=types[acc['componentType']]
    view=doc['bufferViews'][acc['bufferView']]
    n=3 if acc['type']=='VEC3' else 4
    stride=view.get('byteStride',n*nbytes)
    offset=view.get('byteOffset',0)+acc.get('byteOffset',0)
    sample_count=min(acc['count'],64)
    colors=[]
    for i in range(sample_count):
        k=int(i*(acc['count']-1)/max(1,sample_count-1))
        channels=struct.unpack_from('<'+fmt*n,binary,offset+k*stride)
        colors.append([channel/norm for channel in channels[:3]])
    return tuple(sum(x[j] for x in colors)/len(colors) for j in range(3))

found=[]
for mesh in doc.get('meshes',[]):
    if not mesh.get('name','').startswith('Body - anatomical'):
        continue
    for primitive in mesh['primitives']:
        index=primitive['attributes'].get('COLOR_0')
        if index is None:
            continue
        rgb=color_average(index)
        mat=doc['materials'][primitive.get('material',0)]
        factors=mat.get('pbrMetallicRoughness',{}).get('baseColorFactor',[1,1,1,1])
        effective=tuple(rgb[i]*factors[i] for i in range(3))
        found.append(effective)
        r,g,b=effective
        assert .11<g<.70, f'Unexpected skin green channel: {effective}'
        assert g>r*1.17, f'Orc skin lost green color in GLB: {effective}'
        assert g>b*1.38, f'Orc skin is too blue/white in GLB: {effective}'
assert found,'No painted primary body mesh exported'
print('PASS: effective GLB skin albedo is green:', found)
