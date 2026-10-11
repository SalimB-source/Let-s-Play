/**
 * Le Sablier du temps — l'appui long d'une seconde.
 *
 * Sur écran tactile, le survol n'existe pas : l'aperçu instantané d'une carte
 * (type, coût, effets, statistiques) était donc inaccessible dans l'application
 * et sur mobile, où il ne restait que le clic — et le clic **agit** (poser la
 * carte, déclarer une attaque, produire un mana).
 *
 * Le geste qui manquait est l'**appui long** : garder le doigt une seconde sur
 * une carte ouvre son aperçu sans rien jouer. Ce module ne connaît ni le duel ni
 * React : il transforme un `pointerdown` en décision — appui long, ou pas — et
 * laisse la page afficher l'aperçu. Même contrat que `rpgTouchDrag.js`
 * (aucun DOM créé, un `cleanup` idempotent à appeler au démontage).
 *
 * Les règles :
 * - seul le doigt ou le stylet compte ; la souris a déjà le survol ;
 * - un déplacement au-delà du seuil annule : c'est un défilement de la main ou
 *   un glisser-déposer, pas une consultation ;
 * - lever le doigt avant la durée annule : c'est un clic, il doit agir ;
 * - une fois l'aperçu ouvert, le clic synthétique qui suit le lever du doigt est
 *   avalé : l'appui long ne joue jamais la carte et ne referme pas l'aperçu dans
 *   la même foulée ;
 * - le menu contextuel natif (callout iOS, menu Android) est étouffé, et
 *   l'aperçu ouvert ne dépend plus du doigt : il se ferme par son propre volet.
 */

/** Durée de l'appui qui ouvre l'aperçu : une seconde, geste volontaire. */
export const RPG_LONG_PRESS_MS = 1000;

/** Déplacement toléré pendant l'appui, en pixels — le seuil de `rpgTouchDrag.js`. */
export const RPG_LONG_PRESS_SEUIL_PX = 10;

/** Fenêtre pendant laquelle le clic qui suit le lever du doigt est avalé. */
const DELAI_CLIC_AVALE_MS = 400;

/**
 * Arme un appui long sur `source`. Retourne la fonction qui annule tout
 * (démontage, écran quitté), ou `null` si le geste ne concerne pas ce module
 * (souris, second doigt, arguments manquants).
 *
 * @param {PointerEvent} event le `pointerdown` reçu
 * @param {object} options
 * @param {Element} options.source l'élément tenu par le doigt (la carte)
 * @param {(detail: { source: Element, event: PointerEvent }) => void} options.onTrigger
 *        appelé une fois, après `duree` ms de contact immobile
 * @param {number} [options.duree] durée de l'appui, `RPG_LONG_PRESS_MS` par défaut
 * @param {number} [options.seuil] déplacement annulant l'appui, en px
 */
export function startRpgLongPress(event, {
  source,
  onTrigger,
  duree = RPG_LONG_PRESS_MS,
  seuil = RPG_LONG_PRESS_SEUIL_PX,
} = {}) {
  if (!event || !source || typeof onTrigger !== 'function') return null;
  if (!['touch', 'pen'].includes(event.pointerType) || event.isPrimary === false || event.button > 0) return null;
  const doc = source.ownerDocument;
  const win = doc.defaultView;
  if (!doc || !win) return null;
  const pointerId = event.pointerId;
  const departX = event.clientX;
  const departY = event.clientY;
  let timer = null;
  let declenche = false;
  let fini = false;
  const avalerClic = (e) => { e.preventDefault(); e.stopPropagation(); };
  const nettoyer = () => {
    if (fini) return;
    fini = true;
    if (timer !== null) win.clearTimeout(timer);
    timer = null;
    win.removeEventListener('pointermove', bouge);
    win.removeEventListener('pointerup', leve);
    win.removeEventListener('pointercancel', interrompu);
    win.removeEventListener('blur', interrompu);
    win.removeEventListener('scroll', interrompu, true);
    doc.removeEventListener('visibilitychange', pageCachee);
    source.removeEventListener('contextmenu', avalerClic);
  };
  const declencher = () => {
    timer = null;
    declenche = true;
    onTrigger({ source, event });
  };
  const bouge = (e) => {
    if (e.pointerId !== pointerId || declenche) return;
    const ecart = Math.max(Math.abs(e.clientX - departX), Math.abs(e.clientY - departY));
    if (ecart >= seuil) nettoyer();
  };
  const leve = (e) => {
    if (e.pointerId !== pointerId) return;
    if (declenche) {
      // Android comme iOS envoient un clic après `pointerup` : sans cet écran,
      // il jouerait la carte tenue ou refermerait l'aperçu à peine ouvert.
      doc.addEventListener('click', avalerClic, true);
      win.setTimeout(() => doc.removeEventListener('click', avalerClic, true), DELAI_CLIC_AVALE_MS);
    }
    nettoyer();
  };
  const interrompu = (e) => {
    if (e?.pointerId != null && e.pointerId !== pointerId) return;
    nettoyer();
  };
  const pageCachee = () => { if (doc.hidden) nettoyer(); };
  source.addEventListener('contextmenu', avalerClic);
  win.addEventListener('pointermove', bouge);
  win.addEventListener('pointerup', leve);
  win.addEventListener('pointercancel', interrompu);
  win.addEventListener('blur', interrompu);
  // Un rail de main ou de terrains qui défile sous le doigt annule l'appui.
  win.addEventListener('scroll', interrompu, true);
  doc.addEventListener('visibilitychange', pageCachee);
  timer = win.setTimeout(declencher, duree);
  return nettoyer;
}
