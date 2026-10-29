using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace Orcbands.Editor
{
    internal static class CharacterSceneFactory
    {
        public static GameObject Create(Vector3 feet, int startingRole = 0)
        {
            // Keep public PR builds and local clones usable without licensed art.
            var licensed = LicensedCharacterFactory.TryCreate(feet, startingRole);
            if (licensed != null) return licensed;

            const string path = "Assets/Orcbands/CharacterPalette.asset";
            var palette = AssetDatabase.LoadAssetAtPath<CharacterMaterialProfile>(path);
            if (palette == null)
            {
                palette = ScriptableObject.CreateInstance<CharacterMaterialProfile>();
                AssetDatabase.CreateAsset(palette, path);
            }
            var shader = Shader.Find("Orcbands/CharacterMatte");
            if (shader == null) throw new System.InvalidOperationException("Missing character shader");
            Color[] colors = { palette.Skin, palette.Cloth, palette.Leather,
                               palette.Metal, palette.Bone, palette.Faction };
            string[] names = { "Skin", "Cloth", "Leather", "Metal", "Bone", "Faction" };
            var materials = new Material[colors.Length];
            for (int i = 0; i < colors.Length; i++)
            {
                string materialPath = "Assets/Orcbands/Generated/Character-" + names[i] + ".mat";
                var material = new Material(shader) { name = "Character-" + names[i], color = colors[i] };
                material.SetFloat("_SurfaceContrast", palette.TonalDepth);
                var existing = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
                if (existing == null) AssetDatabase.CreateAsset(material, materialPath);
                else { EditorUtility.CopySerialized(material, existing); UnityEngine.Object.DestroyImmediate(material); material = existing; }
                materials[i] = material;
            }
            var root = new GameObject("Worker");
            root.transform.position = feet;
            var collider = root.AddComponent<CapsuleCollider>();
            collider.height = 1.65f; collider.radius = .48f;
            collider.center = new Vector3(0f, .825f, 0f);
            var presentation = root.AddComponent<CharacterPresentation>();
            presentation.ModelMount = new GameObject("Model mount — replace with licensed prefab").transform;
            presentation.ModelMount.SetParent(root.transform, false);
            presentation.ReviewRoles = new Transform[3];
            presentation.StartingRole = startingRole;
            for (int role = 0; role < 3; role++)
            {
                var model = new GameObject(new[] { "Worker proxy", "Warrior proxy", "Shaman proxy" }[role]).transform;
                model.SetParent(presentation.ModelMount, false);
                presentation.ReviewRoles[role] = model;
                // Original faceted forms: no purchased/modelled asset-store geometry.
                Part(model, "Boot L", new Vector3(-.19f,.12f,.06f), new Vector3(.26f,.24f,.40f), materials[2]);
                Part(model, "Boot R", new Vector3(.19f,.12f,.06f), new Vector3(.26f,.24f,.40f), materials[2]);
                Part(model, "Leg L", new Vector3(-.19f,.40f,0), new Vector3(.24f,.42f,.25f), materials[2]);
                Part(model, "Leg R", new Vector3(.19f,.40f,0), new Vector3(.24f,.42f,.25f), materials[2]);
                Part(model, "Tunic", new Vector3(0,.79f,0), new Vector3(.67f,.49f,.42f), materials[role == 1 ? 3 : 1]);
                Part(model, "Belt", new Vector3(0,.61f,.01f), new Vector3(.70f,.10f,.45f), materials[2]);
                Part(model, "Head", new Vector3(0,1.27f,.025f), new Vector3(.61f,.51f,.49f), materials[0]);
                Part(model, "Muzzle", new Vector3(0,1.17f,.26f), new Vector3(.36f,.18f,.16f), materials[0]);
                Part(model, "Eye L", new Vector3(-.14f,1.34f,.272f), new Vector3(.075f,.055f,.025f), materials[2]);
                Part(model, "Eye R", new Vector3(.14f,1.34f,.272f), new Vector3(.075f,.055f,.025f), materials[2]);
                for (int side = -1; side <= 1; side += 2)
                {
                    var ear = Part(model, "Ear", new Vector3(side*.35f,1.30f,0), new Vector3(.21f,.20f,.17f), materials[0]);
                    ear.localRotation = Quaternion.Euler(0,0,side*30);
                    var arm = Part(model, "Arm", new Vector3(side*.43f,.84f,0), new Vector3(.22f,.42f,.26f), materials[0]);
                    arm.localRotation = Quaternion.Euler(0,0,side*12);
                    Part(model, "Hand", new Vector3(side*.48f,.61f,.03f), new Vector3(.24f,.22f,.26f), materials[0]);
                    Part(model, "Tusk", new Vector3(side*.14f,1.19f,.35f), new Vector3(.06f,.13f,.06f), materials[4]);
                    if (role == 1) Part(model, "Broad pauldron", new Vector3(side*.43f,1.03f,0), new Vector3(.38f,.22f,.39f), materials[3]);
                }
                Part(model, "Faction sash", new Vector3(.21f,.83f,.23f), new Vector3(.12f,.38f,.035f), materials[5]);
                if (role == 1) Part(model,"Shield",new Vector3(-.62f,.75f,.16f),new Vector3(.14f,.65f,.51f),materials[1]);
                if (role == 2)
                {
                    Part(model,"Robe",new Vector3(0,.42f,0),new Vector3(.70f,.50f,.47f),materials[1]);
                    Part(model,"Staff",new Vector3(-.69f,.87f,.07f),new Vector3(.07f,1.72f,.07f),materials[2]);
                    Part(model,"Staff bone",new Vector3(-.69f,1.73f,.07f),new Vector3(.30f,.24f,.21f),materials[4]);
                    Part(model,"Headdress",new Vector3(0,1.56f,0),new Vector3(.37f,.19f,.33f),materials[4]);
                }
                CombineRole(model, materials);
                model.gameObject.SetActive(role == startingRole);
            }
            var tools = root.AddComponent<WorkerTools>();
            var hand = new GameObject("Worker axe grip").transform;
            hand.SetParent(presentation.ReviewRoles[startingRole], false); hand.localPosition = new Vector3(.48f, .61f, .11f);
            tools.Axe = new GameObject("Proxy axe"); tools.Axe.transform.SetParent(hand, false);
            Part(tools.Axe.transform, "Haft", new Vector3(0f,-.15f,0f), new Vector3(.06f,.65f,.06f), materials[2]);
            Part(tools.Axe.transform, "Head", new Vector3(.10f,.14f,0f), new Vector3(.3f,.17f,.08f), materials[3]);
            tools.Pickaxe = new GameObject("Proxy pickaxe"); tools.Pickaxe.transform.SetParent(hand, false);
            Part(tools.Pickaxe.transform, "Haft", new Vector3(0f,-.15f,0f), new Vector3(.06f,.65f,.06f), materials[2]);
            Part(tools.Pickaxe.transform, "Pick head", new Vector3(0f,.16f,0f), new Vector3(.65f,.08f,.07f), materials[3]);
            tools.Equip(false);
            return root;
        }

        private static void CombineRole(Transform model, Material[] materials)
        {
            var parts = model.GetComponentsInChildren<MeshFilter>();
            foreach (Material material in materials)
            {
                var combine = new List<CombineInstance>();
                foreach (var part in parts)
                    if (part.GetComponent<Renderer>().sharedMaterial == material)
                        combine.Add(new CombineInstance { mesh = part.sharedMesh,
                            transform = model.worldToLocalMatrix * part.transform.localToWorldMatrix });
                if (combine.Count == 0) continue;
                var mesh = new Mesh { name = model.name + " " + material.name };
                mesh.CombineMeshes(combine.ToArray());
                string path = "Assets/Orcbands/Generated/Combined-" + model.name.Replace(" ", "-") + "-" + material.name + ".asset";
                mesh = SaveMesh(mesh, path);
                var group = new GameObject(material.name); group.transform.SetParent(model, false);
                group.AddComponent<MeshFilter>().sharedMesh = mesh;
                var renderer = group.AddComponent<MeshRenderer>(); renderer.sharedMaterial = material;
                renderer.shadowCastingMode = ShadowCastingMode.On; renderer.receiveShadows = true;
            }
            foreach (var part in parts) Object.DestroyImmediate(part.gameObject);
        }

        // Eight-sided chamfered boxes, flat triangle normals, no smoothing modifier.
        private static Transform Part(Transform parent, string name, Vector3 at, Vector3 size, Material material)
        {
            var vertices = new List<Vector3>(); var indices = new List<int>();
            Vector2[] rim = { new Vector2(-.32f,-.5f), new Vector2(.32f,-.5f),
                new Vector2(.5f,-.32f), new Vector2(.5f,.32f), new Vector2(.32f,.5f),
                new Vector2(-.32f,.5f), new Vector2(-.5f,.32f), new Vector2(-.5f,-.32f) };
            for (int i = 0; i < 8; i++)
            {
                Vector2 a = rim[i], b = rim[(i+1)%8];
                Triangle(vertices, indices, new Vector3(a.x,-.5f,a.y),new Vector3(a.x,.5f,a.y),new Vector3(b.x,.5f,b.y));
                Triangle(vertices, indices, new Vector3(a.x,-.5f,a.y),new Vector3(b.x,.5f,b.y),new Vector3(b.x,-.5f,b.y));
                Triangle(vertices, indices, new Vector3(0,.5f,0),new Vector3(b.x,.5f,b.y),new Vector3(a.x,.5f,a.y));
                Triangle(vertices, indices, new Vector3(0,-.5f,0),new Vector3(a.x,-.5f,a.y),new Vector3(b.x,-.5f,b.y));
            }
            var mesh = new Mesh { name = "Original chamfered proxy part" };
            mesh.SetVertices(vertices); mesh.SetTriangles(indices,0); mesh.RecalculateNormals(); mesh.RecalculateBounds();
            // Persist meshes: procedural scene builds must survive scene reload by BuildPipeline.
            string path = "Assets/Orcbands/Generated/CharacterPart-" + parent.name.Replace(" ","-") + "-" + name.Replace(" ","-") + "-" + parent.childCount + ".asset";
            mesh = SaveMesh(mesh, path);
            var part = new GameObject(name); part.transform.SetParent(parent,false);
            part.transform.localPosition = at; part.transform.localScale = size;
            part.AddComponent<MeshFilter>().sharedMesh = mesh;
            var renderer = part.AddComponent<MeshRenderer>(); renderer.sharedMaterial = material;
            renderer.shadowCastingMode = ShadowCastingMode.On; renderer.receiveShadows = true;
            return part.transform;
        }
        private static Mesh SaveMesh(Mesh mesh, string path)
        {
            var existing = AssetDatabase.LoadAssetAtPath<Mesh>(path);
            if (existing == null) AssetDatabase.CreateAsset(mesh, path);
            else {
                EditorUtility.CopySerialized(mesh, existing);
                Object.DestroyImmediate(mesh);
                mesh = existing;
            }
            return mesh;
        }
        private static void Triangle(List<Vector3> vertices, List<int> indices, Vector3 a, Vector3 b, Vector3 c)
        {
            int start = vertices.Count; vertices.Add(a); vertices.Add(b); vertices.Add(c);
            indices.Add(start); indices.Add(start+1); indices.Add(start+2);
        }
    }
}

