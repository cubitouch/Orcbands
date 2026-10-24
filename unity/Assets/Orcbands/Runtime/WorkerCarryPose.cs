using UnityEngine;

namespace Orcbands
{
    /// <summary>Small walking-only hand IK correction, evaluated after humanoid retargeting.</summary>
    public sealed class WorkerCarryPose : MonoBehaviour
    {
        public Animator Body;
        // The supplied carrying walk already authors the hand position.
        public bool CorrectionEnabled = false;
        [Tooltip("Metres in character-facing space, independent of model import scale.")]
        public Vector3 HandOffset = new Vector3(.22f, 0f, .06f);
        [Tooltip("Rotation relative to the animated right hand, in degrees.")]
        public Vector3 HandEuler = new Vector3(0f, 35f, 0f);
        public float Weight { get; private set; }

        private void OnAnimatorIK(int layer)
        {
            if (Body == null || !Body.isHuman || layer != 0) return;
            var state = Body.GetCurrentAnimatorStateInfo(0);
            Weight = state.IsName("Walking") ? 1f : 0f;
            if (Body.IsInTransition(0))
                Weight = Mathf.Lerp(Weight, Body.GetNextAnimatorStateInfo(0).IsName("Walking") ? 1f : 0f,
                    Mathf.Clamp01(Body.GetAnimatorTransitionInfo(0).normalizedTime));
            if (!CorrectionEnabled) Weight = 0f;
            // Read the fresh animation goal every IK pass. No accumulated bone
            // rotations, no tool/socket movement and no replacement walking cycle.
            Vector3 position = Body.GetIKPosition(AvatarIKGoal.RightHand);
            Quaternion rotation = Body.GetIKRotation(AvatarIKGoal.RightHand);
            Body.SetIKPositionWeight(AvatarIKGoal.RightHand, Weight);
            Body.SetIKRotationWeight(AvatarIKGoal.RightHand, Weight);
            Body.SetIKPosition(AvatarIKGoal.RightHand, position + transform.rotation * HandOffset);
            Body.SetIKRotation(AvatarIKGoal.RightHand, rotation * Quaternion.Euler(HandEuler));
        }
    }
}
