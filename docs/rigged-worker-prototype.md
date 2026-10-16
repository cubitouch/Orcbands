# Worker Orc — real skinning and animation proof (issue #8)

This is **experimental** work on the Blender-made Worker Orc vNext. The source is
original Orcbands geometry. No third-party model or animation is involved.

## What is actually exported

- `worker-orc-skinned-experiment.blend`: editable real Blender mesh + deforming armature.
- `worker-orc-skinned-experiment.glb`: browser-readable glTF 2 binary, skinned.
- Named bones for hips/spine/chest/neck/head and left/right shoulder, upper/lower arm,
  hand, upper/lower leg, foot (humanoid-oriented hierarchy).
- Four NLA animation clips with actual bone keyframes: Idle, Walk, Chop, Carry.
- Six Blender frame captures: idle, two walk poses, two chop poses, carry.
- Real Chromium WebGL screenshots of all three animated interaction modes.

## Build from a clean machine

```sh
mkdir -p rig-review
blender -b -t 2 --python-exit-code 1 --python art/worker_orc_vnext.py -- \
  --output rig-review --export-only
blender -b -t 2 --python-exit-code 1 --python art/rig_worker_orc.py -- \
  --input rig-review/worker-orc-vnext.blend --output rig-review
python3 tools/validate-rigged-glb.py rig-review
```

This flow runs in `.github/workflows/rig-worker-orc.yml`; CI artifacts preserve
the evidence and exported model for every PR revision.

The **browser studio** supports an optional `Rigged beta` model mode, showing
actual animation clips from `preview/assets/worker-orc-skinned-experiment.glb`.
The GitHub Pages workflow generates and deploys this GLB from reproducible
Blender source. The two existing models remain separately selectable.

## Quality gates and limitations

- Structural skin/animation tests and smoke screenshots are necessary, **not**
  proof of realistic motion or production-ready weights.
- Even if the animation runs, evaluate joins around shoulders, elbows, wrists,
  knees and apron during extreme poses. Evaluate the axe grip.
- The visible character remains short of the original stylized reference art.
- It is not Unity-validated, and Blender/GLB bone names alone do not guarantee
  Unity Humanoid Avatar validity or retargeted Mecanim animation quality.
- Full art review remains required; publish the rig only as a clearly identified
  beta option, never as an approved/validated Unity Humanoid model.
- Future work needs weight painting, better anatomy/clothing/UVs, and direct Unity
  Avatar validation once an editor is available.

## Review checklist

- [ ] Arms and legs bend plausibly from front and side.
- [ ] Curve accessories (stitches, seams, ornaments, straps) remain attached.
- [ ] Walk cycle has distinct left/right stepping and doesn't slide badly.
- [ ] Chop has a clear wind-up, impact and recovery, with axe held correctly.
- [ ] Carry posture makes sense from Orcbands' RTS camera distance.
- [ ] All motions play in Chromium and mobile-browser-size viewer.
- [ ] No crash or missing animation when switching model versions.
- [ ] Unity Humanoid and actual imported Animator validated **later**.
