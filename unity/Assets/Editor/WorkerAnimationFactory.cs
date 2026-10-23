using System;
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

namespace Orcbands.Editor
{
    internal static class WorkerAnimationFactory
    {
        private const string Sources = "Assets/Mixamo/Worker/";
        private const string Generated = "Assets/Orcbands/Generated/";

        // Build an owned body avatar from a detached copy of the untouched vendor
        // hierarchy. The imported Synty avatar and import settings remain unchanged.
        // Fingers deliberately stay outside humanoid retargeting: the purchased
        // mitten hand keeps our authored tool grip instead of Mixamo's open fingers.
        public static Avatar CreateAvatar(GameObject prefab, string modelName)
        {
            var reference = UnityEngine.Object.Instantiate(prefab);
            reference.name = modelName;
            reference.transform.SetPositionAndRotation(Vector3.zero, Quaternion.identity);
            var map = new Dictionary<HumanBodyBones, string> {
                {HumanBodyBones.Hips,"pelvis"}, {HumanBodyBones.Spine,"spine_01"},
                {HumanBodyBones.Chest,"spine_02"}, {HumanBodyBones.UpperChest,"spine_03"},
                {HumanBodyBones.Neck,"neck_01"}, {HumanBodyBones.Head,"head"},
                {HumanBodyBones.LeftShoulder,"clavicle_l"}, {HumanBodyBones.RightShoulder,"clavicle_r"},
                {HumanBodyBones.LeftUpperArm,"upperarm_l"}, {HumanBodyBones.RightUpperArm,"upperarm_r"},
                {HumanBodyBones.LeftLowerArm,"lowerarm_l"}, {HumanBodyBones.RightLowerArm,"lowerarm_r"},
                {HumanBodyBones.LeftHand,"hand_l"}, {HumanBodyBones.RightHand,"hand_r"},
                {HumanBodyBones.LeftUpperLeg,"thigh_l"}, {HumanBodyBones.RightUpperLeg,"thigh_r"},
                {HumanBodyBones.LeftLowerLeg,"calf_l"}, {HumanBodyBones.RightLowerLeg,"calf_r"},
                {HumanBodyBones.LeftFoot,"foot_l"}, {HumanBodyBones.RightFoot,"foot_r"},
                {HumanBodyBones.LeftToes,"ball_l"}, {HumanBodyBones.RightToes,"ball_r"}
            };
            try
            {
                var human = new List<HumanBone>();
                foreach (var pair in map)
                {
                    WorkerRestProfile.RequireBone(reference.transform, pair.Value);
                    human.Add(new HumanBone { boneName = pair.Value,
                        humanName = HumanTrait.BoneName[(int)pair.Key],
                        limit = new HumanLimit { useDefaultValues = true } });
                }
                var skeleton = reference.GetComponentsInChildren<Transform>(true).Select(t =>
                    new SkeletonBone { name = t.name, position = t.localPosition,
                        rotation = t.localRotation, scale = t.localScale }).ToArray();
                var avatar = AvatarBuilder.BuildHumanAvatar(reference, new HumanDescription {
                    human = human.ToArray(), skeleton = skeleton,
                    upperArmTwist = .5f, lowerArmTwist = .5f, upperLegTwist = .5f, lowerLegTwist = .5f,
                    armStretch = .05f, legStretch = .05f, feetSpacing = 0f });
                if (avatar == null || !avatar.isValid || !avatar.isHuman)
                    throw new InvalidOperationException("Cannot build the worker's mapped humanoid avatar");
                avatar.name = "Worker body retarget avatar";
                AssetDatabase.DeleteAsset(Generated + "WorkerBodyAvatar.asset");
                AssetDatabase.CreateAsset(avatar, Generated + "WorkerBodyAvatar.asset");
                return avatar;
            }
            finally { UnityEngine.Object.DestroyImmediate(reference); }
        }

        public static bool HasSources()
        {
            string[] files = { "Idle", "Walking", "Chopping" };
            int found = files.Count(n => AssetDatabase.LoadAssetAtPath<GameObject>(Sources + n + ".fbx") != null);
            if (found != 0 && found != files.Length)
                throw new InvalidOperationException("Worker animation pack is incomplete");
            return found == files.Length;
        }

        public static void Configure(GameObject root, Transform model, Avatar avatar)
        {
            var clips = new[] { LoadClip("Idle"), LoadClip("Walking"), LoadClip("Chopping") };
            string path = Generated + "WorkerAnimations.controller";
            AssetDatabase.DeleteAsset(path);
            var controller = AnimatorController.CreateAnimatorControllerAtPath(path);
            var machine = controller.layers[0].stateMachine;
            foreach (var clip in clips)
            {
                var state = machine.AddState(clip.name);
                state.motion = clip;
                // Brisk work cadence without changing idle/walk or root travel.
                state.speed = clip.name == "Chopping" ? 1.5f : 1f;
                state.iKOnFeet = true;
                state.writeDefaultValues = false;
                if (clip.name == "Idle") machine.defaultState = state;
            }
            var animator = model.GetComponent<Animator>();
            if (animator == null) animator = model.gameObject.AddComponent<Animator>();
            animator.avatar = avatar;
            animator.runtimeAnimatorController = controller;
            animator.applyRootMotion = false;
            animator.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            animator.enabled = true;
            root.AddComponent<WorkerAnimation>().Body = animator;
            Debug.Log("WORKER_ANIMATIONS: valid mapped humanoid avatar, Idle/Walking/Chopping; root motion off");
        }

        private static AnimationClip LoadClip(string name)
        {
            string path = Sources + name + ".fbx";
            var importer = AssetImporter.GetAtPath(path) as ModelImporter;
            if (importer == null) throw new InvalidOperationException("Missing animation: " + path);
            importer.animationType = ModelImporterAnimationType.Human;
            importer.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            importer.importAnimation = true;
            importer.importCameras = false;
            importer.importLights = false;
            importer.materialImportMode = ModelImporterMaterialImportMode.None;
            importer.optimizeGameObjects = false;
            importer.SaveAndReimport();
            var takes = importer.defaultClipAnimations;
            if (takes.Length == 0) throw new InvalidOperationException("No takes in " + path);
            // Mixamo exports also contain a zero-length 'Take 001'. Use the
            // actual longest motion rather than silently importing that take.
            var take = takes.OrderByDescending(c => c.lastFrame - c.firstFrame).First();
            take.name = name;
            take.loopTime = true;
            take.loopPose = name != "Chopping";
            take.lockRootRotation = true;
            take.keepOriginalOrientation = true;
            take.lockRootPositionXZ = false; // extract travel; Animator discards root motion
            take.lockRootHeightY = true;
            take.keepOriginalPositionY = false;
            take.heightFromFeet = true;
            importer.clipAnimations = new[] { take };
            importer.SaveAndReimport();
            var clip = AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>()
                .FirstOrDefault(c => c.name == name && c.length > .1f && c.humanMotion);
            if (clip == null) throw new InvalidOperationException("No usable humanoid motion in " + path);
            Debug.Log("WORKER_CLIP: " + name + ", duration=" + clip.length + ", humanoid=" + clip.humanMotion);
            return clip;
        }
    }
}
