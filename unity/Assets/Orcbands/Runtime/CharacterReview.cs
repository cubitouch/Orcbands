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
            public Vector3 feet, unitScreen, destinationScreen, camera, facing, gripInHand, axeUp, gripEuler;
            public Vector3 leftFoot, rightFoot, rightHand, chopScreen, returnScreen, targetFeet;
            public float targetDistance, targetStandOff, walkingClipLength, choppingClipLength;
            public bool treeMarkerVisible, moving, workPositionClear;
            public string chopScreenTarget;
            public string animation, animatorState, chopTarget;
            public float animationTime, animationRate, gameTime, shadowBias, shadowNormalBias;
            public int activeSkinCount, treeCount;
            public float carryWeight, mapHalfExtent;
            public Vector3 handEuler, handOffset;
            public bool workerReceivesShadows, boxSelecting, pointerInside;
            public Vector3 cameraFocus;
            public float cameraDistance, zoomMin, zoomMax;
            public bool animated, rootMotion, gripParentCorrect;
            public bool licensedGrip;
            public bool selected;
            public int frame;
            public string rayTarget, lastSelectionHit;
            public float groundError;
            public int treeStrikes, activeTreePulses, woodChips;
            public int wood, remainingWood, lastTreeRemaining, depletedTrees, shadowRepairs, shadowChangedPixels, navigationRevision;
            public string lastDepletedTree;
            public Vector3 stumpPosition, stumpScreen;
            public float stumpRadius;
            public bool stumpVisible, lastTreeClearance;
            public float treeBend, lastStrikePhase, lastStrikeAge;
            public string lastStruckTree;
            public Vector3 chipOrigin;
            public bool navigationClear;
            public int remainingWaypoints, navigationObstacles, navigationExpanded;
            public string commandResult;
            public Vector3 navigationDestination;
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
            var driver = Character.GetComponent<WorkerAnimation>();
            var body = driver == null ? null : driver.Body;
            var carry = body == null ? null : body.GetComponent<WorkerCarryPose>();
            WoodcuttingTarget nearest = null;
            float nearestDistance = float.MaxValue;
            foreach (var tree in FindObjectsByType<WoodcuttingTarget>(FindObjectsSortMode.None))
            {
                Vector3 screen = View.WorldToViewportPoint(tree.transform.TransformPoint(new Vector3(0f, 2.5f, 0f)));
                if (tree.IsDepleted) continue;
                float distance = Vector3.Distance(tree.transform.position, feet);
                if (screen.z <= 0f || screen.x <= .08f || screen.x >= .92f ||
                    screen.y <= .08f || screen.y >= .92f || distance >= nearestDistance) continue;
                Physics.Raycast(View.ViewportPointToRay(screen), out RaycastHit treePick, 300f);
                if (treePick.collider != null && treePick.collider.GetComponentInParent<WoodcuttingTarget>() == tree && screen.z > 0f && screen.x > .08f && screen.x < .92f && screen.y > .08f && screen.y < .92f && distance < nearestDistance)
                { nearest = tree; nearestDistance = distance; }
            }
            var chopEffects = GetComponent<TreeChopEffects>();
            var harvest = GetComponent<WorkerHarvest>();
            var shadows = GetComponent<ForestShadowMap>();
            var lastTree = harvest == null ? null : harvest.LastTarget;
            var commandedTree = controller.ChoppingTarget;
            float walkingLength = 0f, choppingLength = 0f;
            if (body != null)
                foreach (var clip in body.runtimeAnimatorController.animationClips)
                {
                    if (clip.name == "Walking") walkingLength = clip.length;
                    if (clip.name == "Chopping") choppingLength = clip.length;
                }
            Debug.Log("CHARACTER_REPORT:" + JsonUtility.ToJson(new ReportData {
                wood = harvest == null ? 0 : harvest.Wood,
                remainingWood = controller.ChoppingTarget == null ? 0 : controller.ChoppingTarget.RemainingWood,
                lastTreeRemaining = lastTree == null ? WoodcuttingTarget.WoodPerTree : lastTree.RemainingWood,
                depletedTrees = harvest == null ? 0 : harvest.DepletedTrees,
                lastDepletedTree = harvest == null ? "" : harvest.LastDepletedTree,
                stumpPosition = harvest == null ? Vector3.zero : harvest.LastStumpPosition,
                stumpScreen = lastTree == null ? Vector3.zero : View.WorldToViewportPoint(lastTree.transform.position + Vector3.up * .2f),
                stumpRadius = lastTree == null ? 0f : lastTree.StumpRadius,
                stumpVisible = lastTree != null && lastTree.Stump != null && lastTree.Stump.activeSelf,
                lastTreeClearance = lastTree != null && controller.Pathfinder.IsClear(lastTree.transform.position + Vector3.right * (lastTree.StumpRadius + WorkerNavigation.Clearance + .05f)),
                shadowRepairs = shadows == null ? 0 : shadows.Repairs,
                shadowChangedPixels = shadows == null ? 0 : shadows.ChangedPixels,
                navigationRevision = controller.Pathfinder == null ? 0 : controller.Pathfinder.Revision,
                treeStrikes = harvest == null ? 0 : harvest.StrikeCount,
                activeTreePulses = chopEffects == null ? 0 : chopEffects.ActivePulses,
                woodChips = chopEffects == null ? 0 : chopEffects.LiveChips,
                treeBend = chopEffects == null ? 0f : chopEffects.CurrentBend,
                lastStrikePhase = chopEffects == null ? 0f : chopEffects.LastHitNormalizedTime,
                lastStrikeAge = chopEffects == null ? 0f : Time.time - chopEffects.LastHitTime,
                lastStruckTree = chopEffects == null ? "" : chopEffects.LastTree,
                chipOrigin = chopEffects == null ? Vector3.zero : chopEffects.LastChipOrigin,
                moving = controller.IsMoving,
                navigationClear = controller.Pathfinder != null && controller.Pathfinder.IsClear(feet),
                remainingWaypoints = controller.RemainingWaypoints,
                navigationObstacles = controller.Pathfinder == null ? 0 : controller.Pathfinder.ObstacleCount,
                navigationExpanded = controller.Pathfinder == null ? 0 : controller.Pathfinder.LastExpanded,
                navigationDestination = controller.Destination,
                commandResult = controller.LastCommandResult,
                boxSelecting = controller.IsBoxSelecting,
                pointerInside = controller.Navigation != null && controller.Navigation.PointerInsideCanvas,
                cameraFocus = controller.Navigation == null ? Vector3.zero : controller.Navigation.Focus,
                cameraDistance = controller.Navigation == null ? 0f : controller.Navigation.Distance,
                zoomMin = controller.Navigation == null ? 0f : controller.Navigation.MinDistance,
                zoomMax = controller.Navigation == null ? 0f : controller.Navigation.MaxDistance,
                workPositionClear = WoodcuttingTarget.ClearsWorkAreas(feet, controller.WorkPositionExclusions),
                treeCount = FindObjectsByType<WoodcuttingTarget>(FindObjectsSortMode.None).Length,
                mapHalfExtent = controller.MapHalfExtent,
                carryWeight = carry == null ? 0f : carry.Weight,
                handEuler = carry == null ? Vector3.zero : carry.HandEuler,
                handOffset = carry == null ? Vector3.zero : carry.HandOffset,
                treeMarkerVisible = controller.TreeTargetRing != null && controller.TreeTargetRing.gameObject.activeSelf,
                targetFeet = commandedTree == null ? Vector3.zero : commandedTree.transform.position,
                targetDistance = commandedTree == null ? 0f : Vector3.ProjectOnPlane(feet - commandedTree.transform.position, Vector3.up).magnitude,
                targetStandOff = commandedTree == null ? 0f : commandedTree.StandOff,
                walkingClipLength = walkingLength,
                choppingClipLength = choppingLength,
                chopScreenTarget = nearest == null ? "" : nearest.name,
                animated = body != null && body.isHuman,
                rootMotion = body != null && body.applyRootMotion,
                animation = driver == null ? "Static" : driver.Current.ToString(),
                animatorState = body == null ? "Static" : body.GetCurrentAnimatorStateInfo(0).IsName("Idle") ? "Idle"
                    : body.GetCurrentAnimatorStateInfo(0).IsName("Walking") ? "Walking" : "Chopping",
                animationTime = body == null ? 0f : body.GetCurrentAnimatorStateInfo(0).normalizedTime,
                animationRate = body == null ? 0f : body.speed * body.GetCurrentAnimatorStateInfo(0).speed * body.GetCurrentAnimatorStateInfo(0).speedMultiplier,
                gameTime = Time.time,
                shadowBias = RenderSettings.sun.shadowBias,
                shadowNormalBias = RenderSettings.sun.shadowNormalBias,
                activeSkinCount = Character.ReviewRoles[0].GetComponentsInChildren<SkinnedMeshRenderer>().Length,
                workerReceivesShadows = Character.ReviewRoles[0].GetComponentInChildren<SkinnedMeshRenderer>()?.receiveShadows ?? false,
                leftFoot = body == null ? Vector3.zero : body.GetBoneTransform(HumanBodyBones.LeftFoot).position,
                rightFoot = body == null ? Vector3.zero : body.GetBoneTransform(HumanBodyBones.RightFoot).position,
                rightHand = body == null ? Vector3.zero : body.GetBoneTransform(HumanBodyBones.RightHand).position,
                returnScreen = View.WorldToViewportPoint(originalFeet),
                chopScreen = nearest == null ? Vector3.zero : View.WorldToViewportPoint(nearest.transform.TransformPoint(new Vector3(0f, 2.5f, 0f))),
                chopTarget = controller.ChoppingTarget == null ? "" : controller.ChoppingTarget.name,
                gripEuler = grip == null ? Vector3.zero : grip.localEulerAngles,
                gripParentCorrect = grip != null && grip.parent.name == "hand_r",
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
        [System.Serializable] private class NavigationRequest { public Vector3 point; }
        // Review-only bridge exercises the same command path as a ground right-click.
        public void NavigationCommand(string json)
        {
            var request = JsonUtility.FromJson<NavigationRequest>(json);
            if (request == null) return;
            var controller = GetComponent<OrcbandsController>();
            var driver = Character.GetComponent<WorkerAnimation>();
            if (driver != null) driver.Preview("Gameplay");
            controller.CommandMove(request.point);
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

        [System.Serializable] private class CarryTuning
        {
            public Vector3 handEuler, handOffset;
            public bool disable, freeze;
            public float pose;
            public string mode = "Walking";
        }
        // Explicit WebGL pose calibration; copy accepted values into WorkerCarryPose.
        public void CarryReview(string json)
        {
            var tuning = JsonUtility.FromJson<CarryTuning>(json);
            var driver = Character.GetComponent<WorkerAnimation>();
            if (tuning == null || driver == null || driver.Body == null) return;
            var carry = driver.Body.GetComponent<WorkerCarryPose>();
            carry.CorrectionEnabled = !tuning.disable;
            carry.HandEuler = tuning.handEuler;
            carry.HandOffset = tuning.handOffset;
            driver.Preview(tuning.mode);
            driver.Body.Play("Base Layer." + tuning.mode, 0, tuning.pose);
            driver.Body.Update(0f);
            driver.Body.speed = tuning.freeze ? 0f : 1f;
        }

        [System.Serializable] private class ShadowTuning
        {
            public float normalBias = -1f, bias = -1f;
            public bool disableShadows, disableFirelights, freeze;
            public float pose;
        }
        // Explicit diagnostic only: compare an identical skinned pose under
        // baseline/tuned shadow bias, with a no-shadow control if needed.
        public void ShadowReview(string json)
        {
            var tuning = JsonUtility.FromJson<ShadowTuning>(json);
            if (tuning == null || RenderSettings.sun == null) return;
            if (tuning.normalBias >= 0f) RenderSettings.sun.shadowNormalBias = tuning.normalBias;
            if (tuning.bias >= 0f) RenderSettings.sun.shadowBias = tuning.bias;
            RenderSettings.sun.shadows = tuning.disableShadows ? LightShadows.None : LightShadows.Soft;
            foreach (var fire in FindObjectsByType<CampFlame>(FindObjectsSortMode.None))
                if (fire.Warmth != null) fire.Warmth.enabled = !tuning.disableFirelights;
            FindFirstObjectByType<CampCharacterLighting>()?.Refresh();
            var driver = Character.GetComponent<WorkerAnimation>();
            if (driver == null || driver.Body == null) return;
            if (tuning.freeze)
            {
                driver.Preview("Chopping");
                driver.Body.Play("Base Layer.Chopping", 0, tuning.pose);
                driver.Body.Update(0f);
                driver.Body.speed = 0f;
            }
            else driver.Body.speed = 1f;
        }

        public void AnimationPreview(string mode)
        {
            var driver = Character.GetComponent<WorkerAnimation>();
            if (driver != null) driver.Preview(mode);
        }
        public void Capture(string preset)
        {
            bool preserveFacing = preset == "worker-moved" || preset == "worker-chopping" || preset == "worker-wide" || preset == "tree-feedback" || preset == "harvest-stump";
            if (!preserveFacing) GetComponent<OrcbandsController>().CancelWorkerCommand();
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
            View.fieldOfView = preset == "map" ? 60f : 38f;
            View.farClipPlane = preset == "map" ? 400f : 240f;
            Vector3 offset = new Vector3(-20f,22f,27f);
            if (preset == "map") { target = Vector3.zero; offset = new Vector3(0f, 205f, .1f); }
            if (preset == "out") offset *= 1.65f;
            if (preset == "close" || preset == "warm" || preset == "cool" || preset == "warrior" || preset == "shaman")
            {
                target = feet + Vector3.up * .75f;
                offset = new Vector3(-3.2f,2.1f,4.1f);
            }
            if (preset == "worker-front" || preset == "worker-side" || preset == "worker-three-quarter" || preset == "worker-moved" || preset == "worker-chopping")
            {
                target = feet + Vector3.up * 1.05f;
                Vector3 localOffset = preset == "worker-chopping" ? new Vector3(3.8f, 1.5f, .3f)
                    : preset == "worker-front" ? new Vector3(0f, .1f, 3.8f)
                    : preset == "worker-side" ? new Vector3(3.8f, .1f, 0f)
                    : new Vector3(2.8f, 1.3f, 3.5f);
                offset = Character.transform.rotation * localOffset;
            }
            if (preset == "tree-feedback" && GetComponent<OrcbandsController>().ChoppingTarget is WoodcuttingTarget tree)
            {
                target = tree.transform.position + Vector3.up * 1.8f;
                Vector3 away = Vector3.ProjectOnPlane(Character.transform.position - tree.transform.position, Vector3.up).normalized;
                offset = away * 7.5f + Vector3.Cross(Vector3.up, away) * 4f + Vector3.up * 3.2f;
            }
            if (preset == "harvest-stump" && GetComponent<WorkerHarvest>().LastTarget is WoodcuttingTarget stumpTree)
            {
                target = stumpTree.transform.position + Vector3.up * .5f;
                offset = new Vector3(-5f, 6f, 7f);
            }
            View.transform.position = target + offset;
            View.transform.LookAt(target);
        }
    }
}
