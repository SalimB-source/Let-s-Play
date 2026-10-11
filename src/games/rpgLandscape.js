import { requestNativeFullscreen, exitNativeFullscreen, nativeFullscreenElement } from './gameFullscreen.js';

/** One duel owns only the orientation/fullscreen it requested. A late browser
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
      if (!mobile()) return;
      active = true;
      const token = ++generation;
      try { win.LetsPlayAndroid?.setDuelLandscape?.(true); } catch { /* older APK */ }
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
      if (!active || token !== generation) return;
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
