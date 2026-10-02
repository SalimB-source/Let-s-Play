import { useCallback, useSyncExternalStore } from 'react';
import {
  GRAPHICS_LOW,
  GRAPHICS_NORMAL,
  GRAPHICS_STORAGE_KEY,
  graphicsStore,
} from './mirageGraphics';

/**
 * Option « Graphismes baissés » côté React : lit et change le choix partagé
 * (`graphicsStore`). Tous les composants qui l'utilisent — boutons de la page,
 * de la course en ligne, moteur 3D — voient le même niveau, tout de suite, et un
 * changement fait dans un autre onglet les rattrape (évènement `storage`).
 *
 *   - `quality` : `'normal'` ou `'low'` ;
 *   - `low` : vrai quand les graphismes sont baissés ;
 *   - `setQuality(niveau)` / `toggle()` : changent le choix, mémorisé aussitôt.
 */
function subscribe(onChange) {
  const unsubscribe = graphicsStore.subscribe(onChange);
  const onStorage = (event) => {
    // `key === null` : le stockage a été vidé en bloc.
    if (event.key === null || event.key === GRAPHICS_STORAGE_KEY) graphicsStore.sync();
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    unsubscribe();
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

const serverSnapshot = () => GRAPHICS_NORMAL;

export default function useMirageGraphics() {
  const quality = useSyncExternalStore(subscribe, graphicsStore.get, serverSnapshot);
  const setQuality = useCallback((next) => graphicsStore.set(next), []);
  const toggle = useCallback(
    () => graphicsStore.set(graphicsStore.get() === GRAPHICS_LOW ? GRAPHICS_NORMAL : GRAPHICS_LOW),
    [],
  );
  return { quality, low: quality === GRAPHICS_LOW, setQuality, toggle };
}
