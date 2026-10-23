using UnityEngine;

namespace Orcbands
{
    /// <summary>Three small presentation states; gameplay owns travel and facing.</summary>
    public sealed class WorkerAnimation : MonoBehaviour
    {
        public enum Mode { Idle, Walking, Chopping }
        public Animator Body;
        public Mode Current { get; private set; }
        public bool Reviewing { get; private set; }
        private bool initialized;

        private void Awake()
        {
            if (Body != null) { Body.applyRootMotion = false; Set(Mode.Idle, true); }
        }

        public void Request(Mode mode)
        {
            if (!Reviewing) Set(mode, false);
        }

        public void Preview(string mode)
        {
            if (mode == "Gameplay") { Reviewing = false; return; }
            if (!System.Enum.TryParse(mode, out Mode parsed)) return;
            Reviewing = true;
            Set(parsed, true);
        }

        private void Set(Mode mode, bool force)
        {
            if (Body == null || (!force && initialized && mode == Current)) return;
            Current = mode;
            initialized = true;
            Body.CrossFadeInFixedTime("Base Layer." + mode, force ? 0f : .15f, 0);
        }
    }
}
