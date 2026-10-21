using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace Orcbands.Editor
{
    /// <summary>
    /// Deterministic first-scene generator. The .unity file is generated rather than
    /// hand-authoring Unity YAML or modifying our existing Three.js Asset Lab.
    /// </summary>
    public static class OrcbandsSceneSetup
    {
        private const string ScenePath = "Assets/Scenes/OrcbandsStarter.unity";
        private const string PinePath = "Assets/Orcbands/Art/low-poly-pine-01.obj";
        private const string HutPath = "Assets/Orcbands/Art/timber-hut-01.obj";

        [Serializable] public class P { public float x, z, scale = 1f, angle; }
        [Serializable] public class Grove { public P[] trees; public P hut, campfire; public P[] torches; public int resourceCount; }
        private const string Generated = "Assets/Orcbands/Generated/";
        private static readonly Dictionary<string, Material> Shades = new Dictionary<string, Material>();

        [MenuItem("Orcbands/Generate Starter Scene")]
        public static void GenerateScene()
        {
            GameObject pine = AssetDatabase.LoadAssetAtPath<GameObject>(PinePath);
            GameObject hut = AssetDatabase.LoadAssetAtPath<GameObject>(HutPath);
            TextAsset json = AssetDatabase.LoadAssetAtPath<TextAsset>(Generated + "grove-layout.json");
            if (pine == null || hut == null || json == null)
                throw new InvalidOperationException("Run npm install --no-save three@0.166.1 && node tools/generate-unity-environment.mjs");
            Grove layout = JsonUtility.FromJson<Grove>(json.text);
            if (layout == null || layout.trees == null || layout.trees.Length != 244 ||
                layout.hut == null || layout.campfire == null || layout.torches == null ||
                layout.torches.Length != 4)
                throw new InvalidOperationException("Incomplete exported Three.js grove");

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            Shades.Clear();
            // The original Asset Lab uses a strong sky/ground hemisphere,
            // not the flat dim ambience from the first Unity import.
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(.54f, .63f, .53f);
            RenderSettings.ambientEquatorColor = new Color(.43f, .48f, .41f);
            RenderSettings.ambientGroundColor = new Color(.29f, .29f, .26f);
            // Like the original Three.js renderer, use atmospheric distance
            // fog (85-135m) *and* the six-source camp visibility mask.
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogStartDistance = 85f;
            RenderSettings.fogEndDistance = 135f;
            RenderSettings.fogColor = new Color(64f/255f, 83f/255f, 79f/255f);
            QualitySettings.shadows = ShadowQuality.All;
            QualitySettings.shadowDistance = 65f;

            Shader vertexShader = Shader.Find("Orcbands/VertexColorLit");
            Shader worldShader = Shader.Find("Orcbands/WorldColorLit");
            if (vertexShader == null || worldShader == null)
                throw new InvalidOperationException("Missing camp visibility shaders");
            Material art = new Material(vertexShader);
            // Preserve the original vertex colors; the former .78 tint plus
            // hard tree darkening made the whole forest muddy.
            art.SetColor("_Tint", Color.white);
            art = SavedMaterial("ForestArt", art);
            Texture2D pineShadowMap =
                AssetDatabase.LoadAssetAtPath<Texture2D>(Generated + "approved-pine-shadows.png");
            if (pineShadowMap == null)
                throw new InvalidOperationException("Missing exported approved pine shadow map");
            Material terrainArt = new Material(art);
            terrainArt.SetTexture("_ForestShadowTex", pineShadowMap);
            terrainArt.SetFloat("_ForestShadowStrength", .78f);
            terrainArt.SetColor("_Tint", new Color(.74f, .77f, .72f));
            terrainArt = SavedMaterial("WoodlandGroundWithShadows", terrainArt);
            Material fireArt = new Material(vertexShader);
            fireArt.SetColor("_Tint", Color.white);
            fireArt.SetFloat("_Unlit", 1f);
            fireArt = SavedMaterial("ApprovedFireGlow", fireArt);
            var ground = ColoredMesh("Ground", "terrain", terrainArt, true);
            // Root patches sit above terrain and must receive the SAME baked
            // canopy/root shadow mask, or they hide the grounding we added.
            ColoredMesh("Tree roots and woodland ground patches", "forest-patches", terrainArt, false);
            ColoredMesh("Approved resources and storage", "resource-art", art, false);
            ColoredMesh("Approved rock geometry", "stone-props", art, false);
            ColoredMesh("Grass and woodland cover", "grass-props", art, false);
            ColoredMesh("Approved hearth and cut firewood", "hearth-art", art, false);
            ColoredMesh("Approved hearth flames and embers", "hearth-flames", fireArt, false);
            ColoredMesh("Approved torch stakes and baskets", "torches-art", art, false);
            ColoredMesh("Approved torch flames", "torches-flames", fireArt, false);

            var building = (GameObject)PrefabUtility.InstantiatePrefab(hut);
            building.name = "Timber Hut 01";
            building.transform.position = Surface(ground, layout.hut.x, layout.hut.z);
            building.transform.rotation = Quaternion.Euler(0f, layout.hut.angle * Mathf.Rad2Deg, 0f);
            ApplyWorldMaterials(building, worldShader);

            var forest = new GameObject("Approved 244-pine forest");
            for (int i = 0; i < layout.trees.Length; i++)
            {
                P pos = layout.trees[i];
                var tree = (GameObject)PrefabUtility.InstantiatePrefab(pine, forest.transform);
                tree.name = "Pine " + (i + 1).ToString("D3");
                tree.transform.position = Surface(ground, pos.x, pos.z) - Vector3.up * .035f * pos.scale;
                tree.transform.rotation = Quaternion.Euler(0f, pos.angle * Mathf.Rad2Deg, 0f);
                tree.transform.localScale = Vector3.one * pos.scale;
                float distance = Mathf.Sqrt(pos.x * pos.x + pos.z * pos.z);
                ApplyWorldMaterials(tree, worldShader);
                foreach (var renderer in tree.GetComponentsInChildren<MeshRenderer>())
                {
                    renderer.shadowCastingMode = distance < 30f ? ShadowCastingMode.On : ShadowCastingMode.Off;
                    renderer.receiveShadows = distance < 25f;
                }
            }

            // The real art above is exported from buildCampfire/buildTorches in
            // Three.js; only the lightweight animated point lights are Unity-native.
            AddFlicker("Hearth firelight",
                Surface(ground, layout.campfire.x, layout.campfire.z) + Vector3.up * .76f,
                5f, .90f, .8f);
            for (int i = 0; i < layout.torches.Length; i++)
            {
                P loc = layout.torches[i];
                AddFlicker("Torch firelight " + (i + 1),
                    Surface(ground, loc.x, loc.z) + Vector3.up * 2f,
                    5f, .72f, i * 2.3f);
            }

            GameObject worker = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            worker.name = "Worker";
            worker.transform.position = Surface(ground, 1.7f, 2.8f) + Vector3.up;
            worker.transform.localScale = new Vector3(.72f, 1f, .72f);
            SetColor(worker, new Color(.29f, .53f, .22f));
            var ringObject = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            ringObject.name = "Worker selection ring";
            UnityEngine.Object.DestroyImmediate(ringObject.GetComponent<Collider>());
            ringObject.transform.localScale = new Vector3(.60f, .02f, .60f);
            SetColor(ringObject, new Color(.89f, .71f, .34f));
            ringObject.SetActive(false);

            GameObject cameraObject = new GameObject("Perspective RTS Camera");
            cameraObject.tag = "MainCamera";
            Camera camera = cameraObject.AddComponent<Camera>();
            camera.orthographic = false;
            camera.fieldOfView = 38f;
            camera.nearClipPlane = .1f;
            camera.farClipPlane = 240f;
            camera.allowHDR = true;
            var film = cameraObject.AddComponent<FilmicGrade>();
            film.GradeMaterial = SavedMaterial("BrowserFilmicGrade", new Material(Shader.Find("Hidden/Orcbands/FilmicGrade")));
            camera.clearFlags = CameraClearFlags.SolidColor;
            // A subdued distant clearing for areas outside the level mesh;
            // the woodland itself is obscured by the authored fog of war.
            camera.backgroundColor = new Color(64f/255f, 83f/255f, 79f/255f);
            cameraObject.transform.position = new Vector3(-20f, 22f, 26f);
            cameraObject.transform.LookAt(new Vector3(0f, 0f, -1f));

            GameObject sunObject = new GameObject("Warm sun");
            Light sun = sunObject.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.color = new Color(1f, .92f, .83f);
            sun.intensity = .92f;
            sun.shadows = LightShadows.Soft;
            sun.shadowStrength = .74f;
            // Source Three.js sun sits at (-22, 36, 18); Unity mirrors X.
            // Point the Unity light along the equivalent mirrored rays.
            sunObject.transform.rotation = Quaternion.LookRotation(
                new Vector3(-22f, -36f, -18f).normalized, Vector3.up);
            sun.shadowCustomResolution = 2048;
            RenderSettings.sun = sun;

            var controllerObject = new GameObject("Orcbands Controller");
            var reveal = controllerObject.AddComponent<CampReveal>();
            reveal.GameCamera = camera;
            reveal.Sources = new Vector4[6];
            reveal.Sources[0] = new Vector4(layout.hut.x, layout.hut.z, 10.5f, 0f);
            reveal.Sources[1] = new Vector4(layout.campfire.x, layout.campfire.z, 5f, 0f);
            for (int i = 0; i < layout.torches.Length; i++)
                reveal.Sources[i + 2] = new Vector4(layout.torches[i].x,
                    layout.torches[i].z, 6.2f, 0f);
            var controller = controllerObject.AddComponent<OrcbandsController>();
            controller.Worker = worker.transform;
            controller.SelectionRing = ringObject.transform;
            controller.GameCamera = camera;
            controller.Ground = ground.GetComponent<Collider>();
            controller.Reveal = reveal;
            Directory.CreateDirectory("Assets/Scenes");
            if (!EditorSceneManager.SaveScene(scene, ScenePath))
                throw new InvalidOperationException("Unable to save Unity forest scene");
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.SaveAssets();
            Debug.Log("Orcbands Unity: approved layout, 244 pines, colored ground, "+
                layout.resourceCount+" resources, vegetation, rocks, fire and RTS perspective camera");
        }

        private static Material SavedMaterial(string name, Material material)
        {
            string path = Generated + name + ".mat";
            if (AssetDatabase.LoadAssetAtPath<Material>(path) != null)
                AssetDatabase.DeleteAsset(path);
            AssetDatabase.CreateAsset(material, path);
            return material;
        }

        private static GameObject ColoredMesh(string name, string key, Material material, bool collider)
        {
            TextAsset asset = AssetDatabase.LoadAssetAtPath<TextAsset>(Generated + key + ".bytes");
            if (asset == null) throw new InvalidOperationException("Missing generated mesh " + key);
            Mesh mesh;
            using (var input = new BinaryReader(new MemoryStream(asset.bytes)))
            {
                int n = input.ReadInt32();
                if (n <= 0 || n % 3 != 0 || asset.bytes.LongLength != 4L + 24L * n)
                    throw new InvalidOperationException("Malformed generated " + key);
                var verts = new Vector3[n];
                var colors = new Color[n];
                var triangles = new int[n];
                for (int i = 0; i < n; i++)
                {
                    verts[i] = new Vector3(input.ReadSingle(), input.ReadSingle(), input.ReadSingle());
                    colors[i] = new Color(input.ReadSingle(), input.ReadSingle(), input.ReadSingle());
                    triangles[i] = i;
                }
                mesh = new Mesh { name = name, indexFormat = IndexFormat.UInt32 };
                mesh.vertices = verts;
                mesh.colors = colors;
                mesh.triangles = triangles;
                mesh.RecalculateNormals();
                mesh.RecalculateBounds();
            }
            string path = Generated + key + ".asset";
            if (AssetDatabase.LoadAssetAtPath<Mesh>(path) != null) AssetDatabase.DeleteAsset(path);
            AssetDatabase.CreateAsset(mesh, path);
            var go = new GameObject(name);
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            var renderer = go.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.receiveShadows = true;
            renderer.shadowCastingMode = ShadowCastingMode.Off;
            if (collider) go.AddComponent<MeshCollider>().sharedMesh = mesh;
            return go;
        }

        private static Vector3 Surface(GameObject ground, float x, float z)
        {
            if (ground.GetComponent<Collider>().Raycast(
                new Ray(new Vector3(x, 45f, z), Vector3.down), out RaycastHit hit, 110f))
                return hit.point;
            throw new InvalidOperationException("No terrain at " + x + ", " + z);
        }

        private static void SetColor(GameObject obj, Color color, bool unlit = false)
        {
            Shader shader = Shader.Find(unlit ? "Unlit/Color" : "Standard");
            if (shader == null) throw new InvalidOperationException("Missing color shader");
            obj.GetComponent<Renderer>().sharedMaterial = new Material(shader) { color = color };
        }

        private static GameObject Part(Transform parent, PrimitiveType primitive,
            Vector3 position, Vector3 scale, Color color, bool unlit = false)
        {
            var part = GameObject.CreatePrimitive(primitive);
            part.transform.SetParent(parent, false);
            part.transform.localPosition = position;
            part.transform.localScale = scale;
            UnityEngine.Object.DestroyImmediate(part.GetComponent<Collider>());
            SetColor(part, color, unlit);
            return part;
        }

        private static void ApplyWorldMaterials(GameObject obj, Shader shader)
        {
            foreach (var renderer in obj.GetComponentsInChildren<MeshRenderer>())
            {
                var materials = renderer.sharedMaterials;
                for (int i = 0; i < materials.Length; i++)
                {
                    Material source = materials[i];
                    if (source == null || !source.HasProperty("_Color")) continue;
                    // Key by original material name and actual color, not by
                    // distance band; all trees retain their authored palette.
                    string key = source.name.Replace('/', '_') + "-" +
                        ColorUtility.ToHtmlStringRGB(source.color);
                    if (!Shades.TryGetValue(key, out Material replacement))
                    {
                        replacement = new Material(shader);
                        // The source MTL roof swatches look too peachy under
                        // Unity's gamma/lighting response. Match the deeper
                        // red finish from the approved Three.js hut preview.
                        if (source.name.StartsWith("roof_", StringComparison.OrdinalIgnoreCase))
                            replacement.color = new Color(
                                source.color.r * .86f, source.color.g * .77f,
                                source.color.b * .75f, source.color.a);
                        else if (source.name.IndexOf("needle", StringComparison.OrdinalIgnoreCase) >= 0)
                            // Preserve every authored needle/light/shadow MTL
                            // swatch, but compensate for Unity's overly pastel
                            // Lambert result compared with MeshStandardMaterial.
                            replacement.color = new Color(
                                source.color.r * .82f, source.color.g * .85f,
                                source.color.b * .73f, source.color.a);
                        else replacement.color = source.color;
                        if (source.name.IndexOf("needle", StringComparison.OrdinalIgnoreCase) >= 0)
                            replacement.SetFloat("_SurfaceContrast", 1.23f);
                        else if (source.name.IndexOf("bark", StringComparison.OrdinalIgnoreCase) >= 0)
                            replacement.SetFloat("_SurfaceContrast", 1.09f);
                        else if (source.name.StartsWith("roof_", StringComparison.OrdinalIgnoreCase))
                            replacement.SetFloat("_SurfaceContrast", 1.07f);
                        replacement = SavedMaterial("CampColor-" + key, replacement);
                        Shades.Add(key, replacement);
                    }
                    materials[i] = replacement;
                }
                renderer.sharedMaterials = materials;
            }
        }

        private static void AddFlicker(string name, Vector3 position,
            float radius, float intensity, float phase)
        {
            var flame = new GameObject(name);
            flame.transform.position = position;
            var light = flame.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = new Color(1f, .63f, .34f);
            light.range = radius;
            light.intensity = intensity;
            light.shadows = LightShadows.None;
            var motion = flame.AddComponent<CampFlame>();
            motion.Warmth = light;
            motion.BaseIntensity = intensity;
            motion.Phase = phase;
        }

        /// <summary>GameCI custom build method, invoked separately for each target.</summary>
        public static void Build()
        {
            GenerateScene();
            BuildTarget target = EditorUserBuildSettings.activeBuildTarget;
            // GitHub Pages serves static files without Content-Encoding for
            // Unity's pre-compressed WebGL bundles. Emit uncompressed files.
            if (target == BuildTarget.WebGL)
            {
                PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
                // Use the Asset Lab's dark, landscape-oriented presentation,
                // not the white branded Unity starter template.
                PlayerSettings.WebGL.template = "PROJECT:Orcbands";
            }
            if (target != BuildTarget.WebGL && target != BuildTarget.StandaloneOSX)
                throw new InvalidOperationException("Unsupported Orcbands CI target: " + target);

            string folder = Path.GetFullPath(Path.Combine(
                Application.dataPath, "../../build", target.ToString()));
            Directory.CreateDirectory(folder);
            string output = target == BuildTarget.WebGL
                ? Path.Combine(folder, "Orcbands")
                : Path.Combine(folder, "Orcbands.app");

            var options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                target = target,
                locationPathName = output,
                options = BuildOptions.None
            };
            BuildReport report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
                throw new InvalidOperationException(
                    "Orcbands Unity build failed: " + report.summary.result);
            Debug.Log("Orcbands Unity build succeeded: " + output);
        }
    }
}
