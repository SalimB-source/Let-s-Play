/**
 * Le Sablier — l'appui long d'une seconde.
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
 * - une fois l'aperçu ouvert, le clic synthétique qui suit la fin du geste est
 *   avalé — **quelle que soit la façon dont le geste se termine** (levée,
 *   annulation, défilement, fenêtre perdue, page cachée) : un `scroll` ou un
 *   `pointercancel` qui arrive entre le déclenchement et la levée du doigt
 *   (autoFocus du volet, rail de main qui remue, WebView qui reprend la main)
 *   ne doit jamais laisser passer ce clic, qui refermerait l'aperçu à peine
 *   ouvert — le joueur ne verrait « rien ne se passe » ;
 * - le menu contextuel natif (callout iOS, menu Android) est étouffé, et
 *   l'aperçu ouvert ne dépend plus du doigt : il se ferme par son propre volet.
 */

/** Durée de l'appui qui ouvre l'aperçu : 320 ms, réactif au doigt sans confondre avec un tap. */
export const RPG_LONG_PRESS_MS = 320;

/** Déplacement toléré pendant l'appui, en pixels — absorbe le roulement naturel du pouce sur écran capacitif. */
export const RPG_LONG_PRESS_SEUIL_PX = 14;

/** Fenêtre pendant laquelle le clic qui suit la fin du geste est avalé. */
const DELAI_CLIC_AVALE_MS = 400;

/**
 * Le `pointerdown` peut-il armer un appui long ? Seul le doigt ou le stylet
 * principal, bouton gauche. La page consulte ce prédicat AVANT d'annuler un
 * geste en cours : un second doigt (ou un clic droit) ne doit pas désarmer
 * l'appui du premier.
 *
 * @param {PointerEvent} event le `pointerdown` reçu
 */
export function peutDemarrerAppuiLong(event) {
  return Boolean(event)
    && ['touch', 'pen'].includes(event.pointerType)
    && event.isPrimary !== false
    && !(event.button > 0);
}

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
  if (!peutDemarrerAppuiLong(event)) return null;
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
  // Le clic synthétique naît de la levée du doigt, mais aussi de l'événement
  // qui a interrompu le geste (un `pointercancel` de WebView, par exemple) :
  // l'avalage s'arme donc dès la fin du geste, et se retire tout seul.
  const armerAvalageClic = () => {
    doc.addEventListener('click', avalerClic, true);
    win.setTimeout(() => doc.removeEventListener('click', avalerClic, true), DELAI_CLIC_AVALE_MS);
  };
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
    if (declenche) armerAvalageClic();
  };
  const declencher = () => {
    timer = null;
    declenche = true;
    try { win.navigator?.vibrate?.(10); } catch { /* haptique optionnelle selon la WebView */ }
    onTrigger({ source, event });
  };
  const bouge = (e) => {
    if (e.pointerId !== pointerId || declenche) return;
    const ecart = Math.max(Math.abs(e.clientX - departX), Math.abs(e.clientY - departY));
    if (ecart >= seuil) nettoyer();
  };
  const leve = (e) => {
    if (e.pointerId !== pointerId) return;
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
