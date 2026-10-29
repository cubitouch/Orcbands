# Menu, prologue and saved camps

The browser player opens on an illustrated menu using the approved four-panel Orcbands artwork. New Game starts the narrated-by-subtitles prologue. Back, Next and Skip work throughout; automatic advance takes nine seconds per panel and can be disabled. Reduced-motion preferences disable the pan. The story introduces three survivors; all three are now controllable workers. Three further recruits are planned for later.

Continue restores the newest readable camp. Load Game lists one autosave and three named camps, with wood, stone and saved date. Menu / Escape pauses worker movement, chopping, animation and camera input. Fire ambience continues. Resume continues the current in-memory camp. Save Game writes a named camp; overwrites and New Game require confirmation. New Game replaces the autosave when the prologue finishes but preserves named camps. Replaying the introduction from Settings never resets the camp.

Version 2 saves include every tree/outcrop's remaining supply, wood and stone totals, all three workers' positions/facing/selections/orders/tools, camera, fog setting and played time. Version 1 camps are validated and upgraded with two safely placed idle companions before changing the live world. Tree identities are tied to the fixed forest map version. Loading rebuilds navigation and restores crowns/stumps and their ground shadows. Full snapshot validation precedes live-world changes. If a previously valid order can no longer be routed, the camp loads with the worker idle and a message.

The browser autosaves every collected wood or stone and at ten played-second intervals, when paused and when focus is lost. Returning from another tab stays paused until Resume. Storage is local to this browser/origin; clearing site data removes saves. Download and import provide portable JSON backups. Manual save failures remain visible and Download current camp works without local storage. In the native desktop fallback, the basic pause menu uses one PlayerPrefs save; the illustrated browser prologue and portable slot manager belong to the WebGL host.

Settings persist music preference and volume. No audio request happens before a gesture. New Game/Continue/Resume play the supplied music if enabled; the footer toggle remains available. The supplied preview stream must remain reachable for music to play.

## Manual acceptance

1. Open a fresh browser profile: Continue is disabled; the menu and camp art are readable. Wait on the menu: the worker does not move or collect wood.
2. Open Settings, mute music and adjust volume. Reload: preferences survive and audio never starts without a gesture.
3. New Game: inspect all four panels and subtitles, move Back/Next, toggle automatic advance and Skip. On a reduced-motion device the artwork does not pan.
4. Select the worker and chop a tree until 2–4 wood. Open Menu; wait and verify wood stops changing. Save in Camp 1.
5. Resume and finish the same tree. Confirm 12 wood and one stump. Save in Camp 2.
6. Load Camp 1: the tree crown and collision return, the partial supply and wood match, and the worker resumes the saved order. The camera is restored.
7. Load Camp 2: exactly 12 wood, stump, released crown space and corrected shadow return. Reload the page and Continue: the same camp returns without the prologue.
8. Download a save and import it into a different browser profile. A malformed file must report an error while retaining the current camp.
9. Start another New Game, cancel the confirmation, then confirm and Skip: zero wood and fresh trees; Camp 1 and Camp 2 are retained. Replay introduction from Settings: the current camp is unchanged.
10. Check desktop, Retina and portrait widths; keyboard Tab/Shift+Tab/Enter/Space and Escape; background tab pause; a storage-blocked profile should show the save failure and still allow downloading the current camp.

## Automated evidence

- `tools/test-save-store.mjs`: isolated/corrupt slots, versions, size limits, storage denial, deletion.
- `tools/test-menu-host.mjs`: actual HTML/CSS/module with a mock engine; menu/prologue, named save, harmless replay, cancellation, reload/Continue, desktop/portrait captures.
- `tools/test-background-music.mjs`: decoded playback, loop, keyboard, no unsolicited download, pending cancellation and recovery.
- `GameSaveChecks.Run`: executable Unity roundtrip and invalid snapshot/resource checks during each build.
- `tools/capture-menu-persistence.mjs`: real compiled player; partial and exhausted trees, paused simulation, saved order/position/camera, collision/shadow restoration, invalid-load atomicity, replay, reload/Continue and fresh game preserving named saves.
- Existing finite resource, strike-feedback, navigation, RTS and art captures enter the camp through the user-facing menu before exercising gameplay.

