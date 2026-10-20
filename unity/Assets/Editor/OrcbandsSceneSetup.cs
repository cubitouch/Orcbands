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
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(.30f, .35f, .29f);
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogStartDistance = 46f;
            RenderSettings.fogEndDistance = 108f;
            RenderSettings.fogColor = new Color(.24f, .31f, .28f);
            QualitySettings.shadows = ShadowQuality.All;
            QualitySettings.shadowDistance = 45f;

            Shader vertexShader = Shader.Find("Orcbands/VertexColorLit");
            if (vertexShader == null) throw new InvalidOperationException("Missing VertexColorLit shader");
            Material art = new Material(vertexShader);
            art.SetColor("_Tint", new Color(.78f, .80f, .78f));
            art = SavedMaterial("ForestArt", art);
            var ground = ColoredMesh("Ground", "terrain", art, true);
            ColoredMesh("Approved resources and storage", "resource-art", art, false);
            ColoredMesh("Approved rock geometry", "stone-props", art, false);
            ColoredMesh("Grass and woodland cover", "grass-props", art, false);

            var building = (GameObject)PrefabUtility.InstantiatePrefab(hut);
            building.name = "Timber Hut 01";
            building.transform.position = Surface(ground, layout.hut.x, layout.hut.z);
            building.transform.rotation = Quaternion.Euler(0f, layout.hut.angle * Mathf.Rad2Deg, 0f);

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
                int ring = distance < 18f ? 0 : distance < 29f ? 1 : 2;
                foreach (var renderer in tree.GetComponentsInChildren<MeshRenderer>())
                {
                    renderer.shadowCastingMode = distance < 25f ? ShadowCastingMode.On : ShadowCastingMode.Off;
                    renderer.receiveShadows = distance < 25f;
                    var materials = renderer.sharedMaterials;
                    for (int m = 0; m < materials.Length; m++)
                    {
                        Material baseMat = materials[m];
                        if (baseMat == null || !baseMat.HasProperty("_Color")) continue;
                        string key = ring + "-" + baseMat.name.Replace('/', '_');
                        if (!Shades.TryGetValue(key, out Material tinted))
                        {
                            tinted = new Material(baseMat);
                            tinted.color *= ring == 0 ? .83f : ring == 1 ? .61f : .37f;
                            tinted = SavedMaterial("PineShade-" + key, tinted);
                            Shades.Add(key, tinted);
                        }
                        materials[m] = tinted;
                    }
                    renderer.sharedMaterials = materials;
                }
            }

            var hearth = new GameObject("Fire and stone hearth");
            hearth.transform.position = Surface(ground, layout.campfire.x, layout.campfire.z);
            Campfire(hearth.transform);
            var torches = new GameObject("Camp torches");
            foreach (P loc in layout.torches)
            {
                var torch = new GameObject("Torch");
                torch.transform.parent = torches.transform;
                torch.transform.position = Surface(ground, loc.x, loc.z);
                Torch(torch.transform);
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
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = RenderSettings.fogColor;
            cameraObject.transform.position = new Vector3(-20f, 22f, 26f);
            cameraObject.transform.LookAt(new Vector3(0f, 0f, -1f));

            GameObject sunObject = new GameObject("Warm sun");
            Light sun = sunObject.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.color = new Color(1f, .92f, .83f);
            sun.intensity = 1.28f;
            sun.shadows = LightShadows.Soft;
            sun.shadowStrength = .80f;
            sunObject.transform.rotation = Quaternion.Euler(48f, -28f, 0f);
            RenderSettings.sun = sun;

            var controllerObject = new GameObject("Orcbands Controller");
            var controller = controllerObject.AddComponent<OrcbandsController>();
            controller.Worker = worker.transform;
            controller.SelectionRing = ringObject.transform;
            controller.GameCamera = camera;
            controller.Ground = ground.GetComponent<Collider>();
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

        private static void Flame(Transform parent, float y, float height, float radius)
        {
            var lamp = new GameObject("Warm fluctuating fire light");
            lamp.transform.SetParent(parent, false);
            lamp.transform.localPosition = new Vector3(0f, y + .2f, 0f);
            var light = lamp.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = new Color(1f, .51f, .18f);
            light.range = radius;
            light.shadows = LightShadows.None;
            var flame = Part(parent, PrimitiveType.Capsule,
                new Vector3(0f, y, 0f), new Vector3(.16f, height * .48f, .16f),
                new Color(1f, .53f, .13f), true);
            flame.name = "Animated flame";
            flame.AddComponent<CampFlame>().Warmth = light;
        }

        private static void Torch(Transform root)
        {
            Part(root, PrimitiveType.Cylinder, new Vector3(0f, .82f, 0f),
                new Vector3(.085f, .82f, .085f), new Color(.34f, .24f, .14f));
            Part(root, PrimitiveType.Cylinder, new Vector3(0f, 1.63f, 0f),
                new Vector3(.20f, .13f, .20f), new Color(.27f, .26f, .22f));
            Flame(root, 1.90f, .46f, 5f);
        }

        private static void Campfire(Transform root)
        {
            for (int i = 0; i < 11; i++)
            {
                float a = i * 2f * Mathf.PI / 11f;
                Part(root, PrimitiveType.Cube,
                    new Vector3(Mathf.Cos(a) * .77f, .1f, Mathf.Sin(a) * .77f),
                    new Vector3(.36f, .2f, .33f), new Color(.47f, .47f, .41f))
                    .transform.localRotation = Quaternion.Euler(0f, a * Mathf.Rad2Deg, 0f);
            }
            for (int i = 0; i < 3; i++)
                Part(root, PrimitiveType.Cylinder, new Vector3(0f, .13f, 0f),
                    new Vector3(.12f, .55f, .12f), new Color(.28f, .19f, .11f))
                    .transform.localRotation = Quaternion.Euler(0f, i * 60f, 90f);
            Flame(root, .48f, .88f, 6f);
        }

        /// <summary>GameCI custom build method, invoked separately for each target.</summary>
        public static void Build()
        {
            GenerateScene();
            BuildTarget target = EditorUserBuildSettings.activeBuildTarget;
            // GitHub Pages serves static files without Content-Encoding for
            // Unity's pre-compressed WebGL bundles. Emit uncompressed files.
            if (target == BuildTarget.WebGL)
                PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
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
