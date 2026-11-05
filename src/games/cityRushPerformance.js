/** Budgets de rendu : les règles et la simulation ne changent pas. */
export function cityRushRenderBudget({ lite = false, devicePixelRatio = 1 } = {}) {
  const ratio = Number(devicePixelRatio);
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  return {
    pixelRatio: Math.min(safeRatio, lite ? 1 : 1.25),
    antialias: !lite,
    shadowSize: lite ? 512 : 1024,
    shadowIntervalMs: lite ? 150 : 100,
    mirrorIntervalMs: lite ? 250 : 100,
  };
}

/** Horloge indépendante de la simulation, pour les seuls effets visuels. */
export function createCityRushVisualClock(intervalMs) {
  let last = -Infinity;
  return (now) => {
    if (!Number.isFinite(now)) return false;
    if (now < last || now - last >= intervalMs) { last = now; return true; }
    return false;
  };
}
