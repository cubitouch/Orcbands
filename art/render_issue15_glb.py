"""Render the actual exported GLB from controlled views for issue #15.

Run with Blender:
blender -b -t 2 --python-exit-code 1 --python art/render_issue15_glb.py -- \
  --baseline /tmp/orcbands/worker-orc-vnext.glb --output issue15-review \
  [--candidate art/candidate/worker-orc-candidate.glb]

Does NOT generate a 3D character. Evidence only: geometry stats and real
Blender/Cycles pixels from GLB imports with *identical* framing/lighting.
"""
import bpy
import hashlib
import json
import sys
from pathlib import Path
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def flag(key, default=None):
    return args[args.index(key) + 1] if key in args else default
baseline_path = Path(flag("--baseline")).resolve()
candidate_arg = flag("--candidate")
candidate_path = Path(candidate_arg).resolve() if candidate_arg else None
output = Path(flag("--output", "issue15-review")).resolve()
output.mkdir(parents=True, exist_ok=True)

def lit_stage():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 14
    # Ubuntu apt Blender is compiled without OpenImageDenoiser.
    scene.cycles.use_denoising = False
    scene.render.resolution_x = 800
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.exposure = 0
    world = bpy.data.worlds.new("Reference neutral ambient")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (.22, .22, .22, 1)
    bg.inputs["Strength"].default_value = .65

    floor_mat = bpy.data.materials.new("Reference neutral floor")
    floor_mat.diffuse_color = (.12, .135, .135, 1)
    bpy.ops.mesh.primitive_plane_add(size=150, location=(0, 0, -.045))
    bpy.context.object.name = "REVIEW ONLY / ground"
    bpy.context.object.data.materials.append(floor_mat)

    def area(name, location, power, size):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = power
        light.data.shape = "DISK"
        light.data.size = size
        light.rotation_euler = (Vector((0, 0, 1.5)) - light.location).to_track_quat("-Z", "Y").to_euler()

    area("REVIEW ONLY / key", (-4, -5, 8), 520, 6)
    area("REVIEW ONLY / fill", (6, -1, 6), 280, 6)
    area("REVIEW ONLY / rim", (2, 6, 7), 450, 5)

    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.name = "REVIEW ONLY / fixed camera"
    camera.data.type = "ORTHO"
    scene.camera = camera
    return camera

VIEWS = (
    ("01-front", (0, -8, 2.1), (0, 0, 1.48), 4.2),
    ("02-left", (-8, 0, 2.1), (0, 0, 1.48), 4.2),
    ("03-back", (0, 8, 2.1), (0, 0, 1.48), 4.2),
    ("04-right", (8, 0, 2.1), (0, 0, 1.48), 4.2),
    ("05-three-quarter", (5, -8, 5.5), (0, 0, 1.47), 4.4),
    ("06-face-close", (1, -7, 3.1), (0, 0, 2.52), 1.6),
    ("10-face-left", (-7, 0, 2.72), (0, 0, 2.68), 1.4),
    ("11-face-right", (7, 0, 2.72), (0, 0, 2.68), 1.4),
    ("12-face-three-quarter", (4, -7, 3.4), (0, 0, 2.6), 1.8),
    ("07-hands-and-gear", (5, -8, 2.6), (0, 0, 1.22), 2.7),
)
def shoot(scene, camera, destination, name, pos, at, ortho, wide=False):
    camera.location = pos
    camera.rotation_euler = (Vector(at) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.ortho_scale = ortho
    scene.render.resolution_x = 1280 if wide else 800
    scene.render.resolution_y = 720 if wide else 800
    scene.render.filepath = str(destination / (name + ".png"))
    bpy.ops.render.render(write_still=True)
    print("ISSUE15_RENDER", scene.render.filepath, flush=True)

def metrics(path, objects):
    images = [
        {"name": img.name, "size": list(img.size)}
        for img in bpy.data.images
        if img.source == "FILE" and all(img.size)
    ]
    meshes = [o for o in objects if o.type == "MESH"]
    triangles = 0
    for obj in meshes:
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
    # Mesh budget is for one character, *before* rendering five test copies.
    materials = sorted({slot.material.name for o in meshes
                        for slot in o.material_slots if slot.material})
    content = path.read_bytes()
    return {
        "file": path.name, "sha256": hashlib.sha256(content).hexdigest(),
        "bytes": len(content), "mesh_objects": len(meshes),
        "triangles": triangles, "materials": len(materials),
        "material_names": materials, "image_textures": images,
        "source": "imported real exported GLB, no source-mesh rendering",
        "unity_humanoid_validated": False,
        "automatic_art_quality_pass": False,
    }

def run(path, label):
    if not path.is_file():
        raise FileNotFoundError(path)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    source = list(bpy.context.scene.objects)
    if not any(o.type == "MESH" for o in source):
        raise RuntimeError("No actual mesh in exported GLB: " + str(path))
    # Render bind/rest pose (not whatever frame an animation import selected).
    for obj in source:
        if obj.animation_data:
            obj.animation_data_clear()
    stats = metrics(path, source)
    destination = output / label
    destination.mkdir(parents=True, exist_ok=True)
    camera = lit_stage()
    scene = bpy.context.scene
    for name, pos, at, scale in VIEWS:
        shoot(scene, camera, destination, name, pos, at, scale)

    # Instantiate four additional copies from imported meshes, *not* a 2D
    # cutout. Linked duplication keeps one-character geometry affordable.
    for shift in (-5.6, -2.8, 2.8, 5.6):
        bpy.ops.object.select_all(action="DESELECT")
        for obj in source:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = source[0]
        bpy.ops.object.duplicate(linked=True)
        for duplicate in bpy.context.selected_objects:
            if duplicate.parent is None:
                duplicate.location.x += shift
    shoot(scene, camera, destination, "08-rts-five",
          (11, -17, 17), (0, 0, 1.48), 13.8, wide=True)
    (destination / "glb-metrics.json").write_text(
        json.dumps(stats, indent=2) + "\n", encoding="utf-8")
    return stats

report = {"baseline": run(baseline_path, "baseline"),
          "candidate": run(candidate_path, "candidate") if candidate_path else None,
          "notice": "Evidence only: no automatic claim of visual improvement"}
(output / "summary.json").write_text(json.dumps(report, indent=2) + "\n")
sections = [
    "<!doctype html><html lang='en'><meta charset='utf-8'>",
    "<meta name='viewport' content='width=device-width,initial-scale=1'>",
    "<title>Orcbands #15 — exported GLB evidence</title>",
    "<style>body{background:#171b1a;color:#f1f4ef;font:16px system-ui;"
    "max-width:1400px;margin:auto;padding:24px}section{border-top:1px solid "
    "#4a514b;padding:20px 0}figure{margin:8px}img{max-width:100%;height:auto}"
    ".pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));"
    "gap:16px}figcaption{padding:10px;color:#c1d4c5}</style>",
    "<h1>Worker Orc #15 — exported GLB review</h1>",
    "<p>Real 3D imports, identical camera and neutral lighting. "
    "No automated art-quality approval. Do not confuse baseline with a new model.</p>",
]
for view in [name for name, _, _, _ in VIEWS] + ["08-rts-five"]:
    sections.append(f"<section><h2>{view}</h2><div class='pair'>")
    for label in ("baseline", "candidate") if candidate_path else ("baseline",):
        sections.append(
            f"<figure><img loading='lazy' src='{label}/{view}.png' "
            f"alt='{label} {view} from actual exported GLB'>"
            f"<figcaption>{label}</figcaption></figure>"
        )
    sections.append("</div></section>")
sections.append("</html>")
(output / "comparison.html").write_text(
    "\n".join(sections) + "\n", encoding="utf-8")
print("ISSUE15_REPORT", json.dumps(report, indent=2))
