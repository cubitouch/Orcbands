"""Inspect a downloaded third-party CC0 character archive. No asset is committed.
Only the uploader's 2021 OpenGameArt CC0 pack is allowed; we preserve source info.
"""
from pathlib import Path
import zipfile, json, re, sys
archive=Path(sys.argv[1]); dest=Path(sys.argv[2]);dest.mkdir(parents=True,exist_ok=True)
limit=450*1024*1024
with zipfile.ZipFile(archive) as z:
  members=z.infolist()
  assert len(members)<20000
  assert sum(i.file_size for i in members)<limit
  for entry in members:
    target=(dest/entry.filename).resolve()
    if not target.is_relative_to(dest.resolve()):
      raise ValueError('unsafe ZIP path '+entry.filename)
  z.extractall(dest)
files=[p for p in dest.rglob('*') if p.is_file()]
matches=sorted((p for p in files if re.search(r'(orc|goblin|ogre|troll|barbarian)',str(p),re.I)),key=lambda p:(p.suffix.lower()!='.fbx',len(str(p))))
report={'source':'https://opengameart.org/content/animated-characters-pack','archive':'https://opengameart.org/sites/default/files/ultimate_animated_character_pack_by_quaternius.zip','author':'Quaternius','license':'CC0','published':'2021-06-18','all_files':len(files),'candidates':[str(p.relative_to(dest)) for p in matches[:150]],'formats':{ext:sum(p.suffix.lower()==ext for p in files) for ext in ['.fbx','.blend','.obj','.gltf','.glb']}}
Path('source-review').mkdir(exist_ok=True)
Path('source-review/source-candidates.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
if matches:
  fbx=next((p for p in matches if p.suffix.lower()=='.fbx'),None)
  if fbx:Path('source-review/selected-fbx.txt').write_text(str(fbx))
