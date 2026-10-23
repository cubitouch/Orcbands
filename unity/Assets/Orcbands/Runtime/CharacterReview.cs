using UnityEngine;

namespace Orcbands
{
    /// <summary>Explicit art-review commands; does not run during normal gameplay.</summary>
    public sealed class CharacterReview : MonoBehaviour
    {
        public CharacterPresentation Character;
        public Camera View;
        public Collider Ground;
        public CampReveal Reveal;
        public Vector3 CampfireFeet;
        private Vector3 originalFeet;
        private void Awake() { originalFeet = Character.transform.position; }
        [System.Serializable] private class ReportData
        {
            public Vector3 feet, unitScreen, destinationScreen, camera, facing, gripInHand, axeUp;
            public bool licensedGrip;
            public bool selected;
            public int frame;
            public string rayTarget, lastSelectionHit;
            public float groundError;
        }
        public void Report(string unused)
        {
            Vector3 feet = Character.transform.position;
            Vector3 destination = feet + new Vector3(2f,0f,.5f);
            if (Ground.Raycast(new Ray(destination + Vector3.up * 45f, Vector3.down), out RaycastHit target,100f))
                destination = target.point;
            Ground.Raycast(new Ray(feet + Vector3.up * 45f,Vector3.down), out RaycastHit surface,100f);
            var controller = GetComponent<OrcbandsController>();
            Physics.Raycast(View.ScreenPointToRay(View.WorldToScreenPoint(feet + Vector3.up * .8f)), out RaycastHit pick, 300f);
            Transform grip = null;
            foreach (Transform child in Character.GetComponentsInChildren<Transform>(true))
                if (child.name == "Worker axe grip") { grip = child; break; }
            Debug.Log("CHARACTER_REPORT:" + JsonUtility.ToJson(new ReportData {
                facing = Character.transform.forward,
                licensedGrip = grip != null,
                gripInHand = grip == null ? Vector3.zero : grip.localPosition,
                axeUp = grip == null ? Vector3.zero : grip.up,
                feet = feet, unitScreen = View.WorldToViewportPoint(feet + Vector3.up * .8f),
                destinationScreen = View.WorldToViewportPoint(destination),
                camera = View.transform.position, selected = controller.IsWorkerSelected,
                frame = Time.frameCount, rayTarget = pick.collider == null ? "none" : pick.collider.name,
                lastSelectionHit = controller.LastSelectionHit,
                groundError = Mathf.Abs(feet.y - surface.point.y) }));
        }
        [System.Serializable] private class TuningBone { public string name; public Vector3 euler; }
        [System.Serializable] private class WorkerTuning
        {
            public Vector3 gripPosition, gripEuler;
            public TuningBone[] bones;
        }
        // Explicit art-review action only, never a gameplay Update or pose owner.
        // After calibration, copy values back into the owned editor profile.
        public void TuneWorker(string json)
        {
            var tuning = JsonUtility.FromJson<WorkerTuning>(json);
            if (tuning == null || Character.ReviewRoles == null || Character.ReviewRoles.Length == 0) return;
            Transform worker = Character.ReviewRoles[0];
            if (worker == null) return;
            foreach (Transform child in worker.GetComponentsInChildren<Transform>(true))
            {
                if (child.name == "Worker axe grip")
                {
                    child.localPosition = tuning.gripPosition;
                    child.localRotation = Quaternion.Euler(tuning.gripEuler);
                }
                if (tuning.bones == null) continue;
                foreach (var bone in tuning.bones)
                    if (child.name == bone.name) child.localRotation = Quaternion.Euler(bone.euler);
            }
        }

        public void Capture(string preset)
        {
            bool preserveFacing = preset == "worker-moved";
            Vector3 feet = preserveFacing ? Character.transform.position : originalFeet;
            if (preset == "warm" || preset == "worker-three-quarter") feet = CampfireFeet;
            if (preset == "cool") feet = new Vector3(5.5f, 0f, 4.5f);
            if (Ground.Raycast(new Ray(new Vector3(feet.x,45f,feet.z),Vector3.down), out RaycastHit hit,100f))
                feet.y = hit.point.y;
            Character.transform.position = feet;
            if (!preserveFacing) Character.transform.rotation = Quaternion.Euler(0f, -35f, 0f);
            Reveal.SetFogOfWar(!preset.EndsWith("off"));
            Character.ShowReviewRole(preset.StartsWith("warrior") ? 1 : preset.StartsWith("shaman") ? 2 : 0);
            Vector3 target = new Vector3(0f,0f,-1f);
            Vector3 offset = new Vector3(-20f,22f,27f);
            if (preset == "out") offset *= 1.65f;
            if (preset == "close" || preset == "warm" || preset == "cool" || preset == "warrior" || preset == "shaman")
            {
                target = feet + Vector3.up * .75f;
                offset = new Vector3(-3.2f,2.1f,4.1f);
            }
            if (preset == "worker-front" || preset == "worker-side" || preset == "worker-three-quarter" || preset == "worker-moved")
            {
                target = feet + Vector3.up * 1.05f;
                Vector3 localOffset = preset == "worker-front" ? new Vector3(0f, .1f, 3.8f)
                    : preset == "worker-side" ? new Vector3(3.8f, .1f, 0f)
                    : new Vector3(2.8f, 1.3f, 3.5f);
                offset = Character.transform.rotation * localOffset;
            }
            View.transform.position = target + offset;
            View.transform.LookAt(target);
        }
    }
}
