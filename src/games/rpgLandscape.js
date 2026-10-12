import { requestNativeFullscreen, exitNativeFullscreen, nativeFullscreenElement } from './gameFullscreen.js';

/** A duel owns only the orientation/fullscreen it requested. A late browser
 * promise must never lock the screen again after the player leaves the duel. */
export function createRpgLandscapeSession(win = window, doc = document) {
  let active = false;
  let generation = 0;
  let ownsFullscreen = false;
  let ownsOrientation = false;
  const mobile = () => Boolean(win.LetsPlayAndroid)
    || Boolean(win.matchMedia?.('(pointer: coarse)').matches)
    || win.innerWidth <= 620;
  return {
    async enter({ fullscreen = true } = {}) {
      const needsLandscape = mobile();
      active = true;
      const token = ++generation;
      if (needsLandscape) {
        try { win.LetsPlayAndroid?.setDuelLandscape?.(true); } catch { /* older APK */ }
      }
      // The native fullscreen request must happen inside the launch/resume
      // gesture. It applies on desktop too; CSS keeps the table fitted to the
      // viewport when the browser or an embedded preview rejects the request.
      if (fullscreen && !nativeFullscreenElement(doc)) {
        const opened = await requestNativeFullscreen(doc.documentElement);
        if (opened) {
          if (!active || token !== generation) {
            if (!active) await exitNativeFullscreen(doc);
            else ownsFullscreen = true;
            return;
          }
          ownsFullscreen = true;
        }
      }
      if (!active || token !== generation || !needsLandscape) return;
      try {
        if (win.screen?.orientation?.lock) {
          await win.screen.orientation.lock('landscape');
          if (!active) win.screen.orientation.unlock?.();
          else ownsOrientation = true;
        }
      } catch { /* Safari / embedded previews: the rotate prompt is the fallback. */ }
    },
    leave() {
      active = false;
      generation++;
      try { win.LetsPlayAndroid?.setDuelLandscape?.(false); } catch { /* older APK */ }
      if (ownsOrientation) {
        try { win.screen.orientation.unlock?.(); } catch { /* already unlocked */ }
      }
      ownsOrientation = false;
      if (ownsFullscreen) exitNativeFullscreen(doc);
      ownsFullscreen = false;
    },
  };
}
