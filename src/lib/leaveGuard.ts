// Lets a screen with unsaved changes (Preferences) stop the tab bar from leaving it.
// The screen registers a guard; the tab bar calls it with the navigation it was about to do.
// If the guard returns true it has taken over (e.g. shows "Save your changes?") and calls go() later.

type Guard = (go: () => void) => boolean;
let guard: Guard | null = null;

export function setLeaveGuard(g: Guard | null) {
  guard = g;
}

/** Runs `go` now, unless the current screen's guard wants to ask first. */
export function leave(go: () => void) {
  if (guard && guard(go)) return;
  go();
}
