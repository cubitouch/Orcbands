using System;
using UnityEngine;

namespace Orcbands.Editor
{
    public static class TreeChopChecks
    {
        private static void Require(bool condition, string message)
        { if (!condition) throw new InvalidOperationException("Tree strike regression: " + message); }
        public static void Run()
        {
            var clock = new WorkerHarvest.SwingCursor();
            Require(!clock.Advance(.1f), "entry emits an early hit");
            Require(!clock.Advance(.38f), "wind-up emits chips");
            Require(clock.Advance(.4f), "downward strike missing");
            Require(!clock.Advance(.4f) && !clock.Advance(.9f), "same swing duplicates a hit");
            Require(!clock.Advance(1.2f) && clock.Advance(1.4f), "next loop missing a hit");
            Require(clock.Advance(3.5f) && !clock.Advance(3.5f), "slow frame replays a backlog");
            clock.Reset(); Require(!clock.Advance(7.8f), "retarget catches up old hits");
            Require(!clock.Advance(.1f) && clock.Advance(.4f), "restarted animation missed strike");
            Require(TreeChopEffects.BendAt(0f) > .03f, "impact not visible immediately at low frame rates");
            Require(TreeChopEffects.BendAt(.2f) < 0f, "tree does not recoil");
            Require(TreeChopEffects.BendAt(TreeChopEffects.SettleTime) == 0f, "tree does not settle exactly");
            for (int i = 0; i <= 100; i++)
                Require(Mathf.Abs(TreeChopEffects.BendAt(i / 100f)) <= .03501f, "unbounded shudder");
            Debug.Log("TREE_CHOP_CHECKS: PASS strike phase, loop/restart/retarget/freeze/slow-frame cursor and bounded settling");
        }
    }
}
