using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace Orcbands
{
    /// <summary>Presentation-only strike feedback; tree transforms, colliders and navigation stay fixed.</summary>
    public sealed class TreeChopEffects : MonoBehaviour
    {
        public OrcbandsController Controller;
        public Material ChipMaterial;
        public const float SettleTime = .65f;
        public const int ChipsPerHit = 9;
        private sealed class Pulse
        {
            public WoodcuttingTarget tree;
            public Renderer[] renderers;
            public MaterialPropertyBlock[] original;
            public MaterialPropertyBlock block;
            public Vector3 pivot, direction;
            public float started;
        }
        private readonly List<Pulse> pulses = new List<Pulse>(4);
        private WorkerAnimation driver;
        private Transform axeGrip;
        private ParticleSystem chips;
        private Mesh chipMesh;
        private static readonly int PivotId = Shader.PropertyToID("_TreeBendPivot");
        private static readonly int BendId = Shader.PropertyToID("_TreeBend");
        public int StrikeCount { get; private set; }
        public int ActivePulses => pulses.Count;
        public int LiveChips => chips == null ? 0 : chips.particleCount;
        public string LastTree { get; private set; } = "";
        public float LastHitNormalizedTime { get; private set; }
        public float LastHitTime { get; private set; } = -100f;
        public float CurrentBend { get; private set; }
        public Vector3 LastChipOrigin { get; private set; }

        public static float BendAt(float age)
        {
            return age < 0f || age >= SettleTime ? 0f : .035f * Mathf.Exp(-7f * age) * Mathf.Cos(16f * age);
        }
        private void LateUpdate()
        {
            if (Controller != null && driver == null && Controller.Worker != null)
            {
                driver = Controller.Worker.GetComponent<WorkerAnimation>();
                if (driver != null)
                    foreach (Transform child in Controller.Worker.GetComponentsInChildren<Transform>(true))
                        if (child.name == "Worker axe grip") { axeGrip = child; break; }
            }
            CurrentBend = 0f;
            for (int i = pulses.Count - 1; i >= 0; i--)
            {
                Pulse pulse = pulses[i];
                float age = Time.time - pulse.started;
                if (pulse.tree == null || age >= SettleTime)
                { Restore(pulse); pulses.RemoveAt(i); continue; }
                float bend = BendAt(age);
                CurrentBend = Mathf.Max(CurrentBend, Mathf.Abs(bend));
                pulse.block.SetVector(PivotId, new Vector4(pulse.pivot.x, pulse.pivot.y, pulse.pivot.z, 1f));
                pulse.block.SetVector(BendId, new Vector4(pulse.direction.x * bend, pulse.direction.z * bend, 0f, 0f));
                foreach (var renderer in pulse.renderers)
                    if (renderer != null) renderer.SetPropertyBlock(pulse.block);
            }
        }
        public void PlayStrike(WoodcuttingTarget tree, float normalizedTime)
        {
            StrikeCount++; LastTree = tree.name;
            LastHitNormalizedTime = normalizedTime; LastHitTime = Time.time;
            Vector3 towardWorker = Vector3.ProjectOnPlane(Controller.Worker.position - tree.transform.position, Vector3.up).normalized;
            Pulse pulse = pulses.Find(p => p.tree == tree);
            if (pulse == null)
            {
                // One worker needs at most two settling trees; cap retained overrides regardless of retargeting.
                if (pulses.Count == 4) { Restore(pulses[0]); pulses.RemoveAt(0); }
                var renderers = tree.GetComponentsInChildren<MeshRenderer>();
                pulse = new Pulse { tree = tree, renderers = renderers,
                    original = new MaterialPropertyBlock[renderers.Length], block = new MaterialPropertyBlock() };
                for (int i = 0; i < renderers.Length; i++)
                {
                    pulse.original[i] = new MaterialPropertyBlock();
                    renderers[i].GetPropertyBlock(pulse.original[i]);
                }
                pulses.Add(pulse);
            }
            pulse.pivot = tree.transform.position; pulse.direction = -towardWorker; pulse.started = Time.time;
            EnsureChipPool();
            // Follow the authored axe height; release chips at the struck face, clear of low foliage.
            Vector3 head = axeGrip == null ? tree.transform.position + towardWorker * .45f + Vector3.up * .7f
                : axeGrip.position + axeGrip.up * .5f;
            float height = Mathf.Clamp(head.y - tree.transform.position.y, .35f, 1.2f);
            float reach = Mathf.Clamp(Vector3.Dot(head - tree.transform.position, towardWorker), tree.CrownRadius + .03f, tree.CrownRadius + .15f);
            LastChipOrigin = tree.transform.position + towardWorker * reach + Vector3.up * height;
            var random = new System.Random(2901 + StrikeCount * 47);
            Vector3 side = Vector3.Cross(Vector3.up, towardWorker);
            for (int i = 0; i < ChipsPerHit; i++)
            {
                float fan = (float)random.NextDouble() * 1.6f - .8f;
                var emit = new ParticleSystem.EmitParams {
                    position = LastChipOrigin + side * fan * .06f,
                    velocity = towardWorker * (.9f + (float)random.NextDouble() * .8f) +
                        side * fan + Vector3.up * (1f + (float)random.NextDouble() * 1.1f),
                    startLifetime = .45f + (float)random.NextDouble() * .25f,
                    startSize = .075f + (float)random.NextDouble() * .055f,
                    rotation3D = new Vector3(random.Next(360), random.Next(360), random.Next(360))
                };
                chips.Emit(emit, 1);
            }
        }
        private void EnsureChipPool()
        {
            if (chips != null) { if (!chips.isPlaying) chips.Play(); return; }
            var go = new GameObject("Pooled wood chips"); go.transform.SetParent(transform, false);
            chips = go.AddComponent<ParticleSystem>();
            chips.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            chips.useAutoRandomSeed = false; chips.randomSeed = 2901;
            var main = chips.main;
            main.loop = true; main.playOnAwake = false; main.startSpeed = 0f; main.maxParticles = 64;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.cullingMode = ParticleSystemCullingMode.AlwaysSimulate;
            main.gravityModifier = .85f; main.startRotation3D = true;
            var emission = chips.emission; emission.enabled = false;
            var shape = chips.shape; shape.enabled = false;
            var size = chips.sizeOverLifetime; size.enabled = true;
            size.size = new ParticleSystem.MinMaxCurve(1f, new AnimationCurve(
                new Keyframe(0f, 1f), new Keyframe(.65f, 1f), new Keyframe(1f, 0f)));
            var rotation = chips.rotationOverLifetime; rotation.enabled = true; rotation.separateAxes = true;
            rotation.x = new ParticleSystem.MinMaxCurve(-5f, 5f);
            rotation.y = new ParticleSystem.MinMaxCurve(-3f, 3f);
            rotation.z = new ParticleSystem.MinMaxCurve(-7f, 7f);
            var renderer = go.GetComponent<ParticleSystemRenderer>();
            renderer.renderMode = ParticleSystemRenderMode.Mesh;
            renderer.mesh = chipMesh = CreateChipMesh(); renderer.sharedMaterial = ChipMaterial;
            renderer.shadowCastingMode = ShadowCastingMode.Off; renderer.receiveShadows = false;
            chips.Play();
        }
        private static Mesh CreateChipMesh()
        {
            var a = new Vector3(-.45f, -.18f, -.55f); var b = new Vector3(.4f, -.12f, -.35f);
            var c = new Vector3(.05f, .22f, .6f); var d = new Vector3(.1f, -.28f, .1f);
            var mesh = new Mesh { name = "Original faceted wood chip" };
            mesh.vertices = new[] { a, c, b, a, b, d, b, c, d, c, a, d };
            mesh.triangles = new[] { 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 };
            mesh.RecalculateNormals(); mesh.RecalculateBounds(); return mesh;
        }
        private static void Restore(Pulse pulse)
        {
            for (int i = 0; i < pulse.renderers.Length; i++)
                if (pulse.renderers[i] != null)
                    pulse.renderers[i].SetPropertyBlock(pulse.original[i].isEmpty ? null : pulse.original[i]);
        }
        private void OnDisable()
        {
            foreach (var pulse in pulses) Restore(pulse);
            pulses.Clear(); CurrentBend = 0f;
            if (chips != null) chips.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
        }
        private void OnDestroy() { if (chipMesh != null) Destroy(chipMesh); }
    }
}
