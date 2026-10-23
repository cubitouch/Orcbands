using System;
using UnityEngine;

namespace Orcbands.Editor
{
    /// <summary>Owned, editable pose; never changes the vendor prefab or import settings.</summary>
    [CreateAssetMenu(menuName = "Orcbands/Worker rest profile")]
    public sealed class WorkerRestProfile : ScriptableObject
    {
        [Serializable] public struct BonePose
        {
            public string Bone;
            public Vector3 LocalEuler;
            public BonePose(string bone, Vector3 euler) { Bone = bone; LocalEuler = euler; }
        }

        // Absolute local rotations make repeated scene generation idempotent.
        public BonePose[] Bones = {
            new BonePose("upperarm_r", new Vector3(-77.895f, 38.756f, -16.589f)),
            new BonePose("lowerarm_r", new Vector3(-3.725f, 24.435f, -1.828f)),
            new BonePose("hand_r", new Vector3(-1.097f, 11.497f, -.845f)),
            new BonePose("upperarm_l", new Vector3(-77.740f, -37.398f, 15.927f)),
            new BonePose("lowerarm_l", new Vector3(-3.725f, -24.435f, 1.828f)),
            new BonePose("hand_l", new Vector3(-1.097f, -11.497f, .845f))
        };

        [Header("Right hand socket (hand_r local space)")]
        public Vector3 GripPosition = new Vector3(0f, -.045f, .10f);
        public Vector3 GripEuler = new Vector3(0f, 0f, 90f);
        [Header("Axe mesh coordinates, metres after Synty import")]
        public Vector3 AxeGripPoint = new Vector3(0f, -.20f, -.02f);
        public float AxeAuthoredLength = 1.0279594f;
        public float AxeWorldLength = .85f;

        public static Transform RequireBone(Transform model, string name)
        {
            foreach (Transform bone in model.GetComponentsInChildren<Transform>(true))
                if (bone.name == name) return bone;
            throw new InvalidOperationException("Worker rest profile requires bone: " + name);
        }

        public void Apply(Transform model)
        {
            // A future controller explicitly takes ownership by enabling these
            // Animators. No Update/LateUpdate pose writer competes with animation.
            foreach (var animator in model.GetComponentsInChildren<Animator>(true))
            {
                animator.applyRootMotion = false;
                animator.enabled = false;
            }
            foreach (var pose in Bones)
                RequireBone(model, pose.Bone).localRotation = Quaternion.Euler(pose.LocalEuler);
        }

        public Transform CreateGrip(Transform model)
        {
            var grip = new GameObject("Worker axe grip").transform;
            grip.SetParent(RequireBone(model, "hand_r"), false);
            grip.localPosition = GripPosition;
            grip.localRotation = Quaternion.Euler(GripEuler);
            return grip;
        }
    }
}
