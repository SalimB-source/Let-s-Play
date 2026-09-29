/**
 * `phoneLayout` — « est-on sur un téléphone ? », indépendamment de la largeur
 * que le navigateur donne à la fenêtre de mise en page.
 *
 * Pourquoi ce fichier existe : les feuilles de style basculent sur la mise en
 * page mobile via `@media(max-width:800px)`. Or la largeur de la fenêtre de
 * mise en page n'est pas toujours celle de l'écran :
 *
 * — **Safari iOS** mémorise un zoom par site (menu « Aa » → −) et l'applique au
 *   chargement : la fenêtre de mise en page peut valoir 800–1100 px sur un
 *   écran de 390 px, et toutes les règles `max-width:800px` étaient alors
 *   ignorées → barre de navigation « PC » et blocs côte à côte ;
 * — **« Version ordinateur »** (Safari/Chrome) élargit de la même façon la
 *   fenêtre de mise en page ;
 * — une **WebView** n'honore `<meta name="viewport">` que si l'application le
 *   lui demande, sinon elle met la page en page à ~980 px (voir
 *   `android/app/src/main/java/dz/letsplay/officiel/MainActivity.java`).
 *
 * `HANDHELD_MEDIA` décrit un téléphone d'après ses *capacités* et sa *taille
 * d'écran* (`device-width`, insensible au zoom de page) : vrai sur un
 * téléphone quel que soit le zoom, faux sur un ordinateur et sur une tablette.
 * Les feuilles de style l'ajoutent en OU de leurs requêtes `max-width`, et le
 * JavaScript s'en sert pour les décisions de navigation (page `/messages`
 * plutôt que pop-up, barre qui ne se cache pas au défilement).
 *
 * `device-width` n'est pas connue de Firefox : la condition est alors fausse,
 * ce qui est sans effet puisqu'elle est toujours écrite en OU d'une condition
 * `max-width` classique.
 */
export const HANDHELD_MEDIA =
  '((hover:none) and (pointer:coarse) and (max-device-width:600px)), ((hover:none) and (pointer:coarse) and (orientation:portrait))';

/** Mise en page « téléphone » : petit écran, ou téléphone à fenêtre large. */
export const PHONE_LAYOUT_MEDIA = `(max-width:800px), ${HANDHELD_MEDIA}`;

/** Seuil de la fenêtre sociale (amis + messagerie). */
export const SOCIAL_MOBILE_MEDIA = `(max-width:760px), ${HANDHELD_MEDIA}`;

/**
 * Appareil piloté au doigt. Un glissement pour esquiver peut alors faire
 * défiler la page par erreur : téléphone en paysage et tablette compris, que
 * `HANDHELD_MEDIA` (portrait, petit écran) ne décrit pas. Sert notamment à
 * ouvrir les courses de Mirage Rush en pop-up (voir `src/games/racePopup.js`).
 */
export const TOUCH_MEDIA = '(hover:none) and (pointer:coarse)';

function matches(query) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia(query).matches;
  } catch (e) {
    return false;
  }
}

/** Vrai sur un téléphone (portrait) quelle que soit la fenêtre de mise en page. */
export function isHandheld() {
  return matches(HANDHELD_MEDIA);
}

/** Vrai quand le design doit utiliser sa mise en page compacte. */
export function isPhoneLayout() {
  return matches(PHONE_LAYOUT_MEDIA);
}

/** Vrai sur un appareil tactile (téléphone, tablette), quelle que soit sa fenêtre. */
export function isTouchDevice() {
  return matches(TOUCH_MEDIA);
}

/**
 * Vrai dans l'app Android. `MainActivity` injecte un pont natif
 * (`webView.addJavascriptInterface(new CallAudioBridge(), "LetsPlayAndroid")`)
 * avant de charger le site : la clé existe donc dès le premier rendu, et jamais
 * dans un navigateur. L'app a besoin de ce signal à part : sa WebView peut être
 * large (téléphone en paysage) et n'applique donc pas la mise en page téléphone,
 * alors que le pouce qui la pilote reste un doigt (courses en pop-up).
 */
export function isAndroidApp() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.LetsPlayAndroid);
}

/**
 * Ramène la fenêtre de mise en page à la largeur de l'écran sur un téléphone
 * où elle a été élargie (zoom de page mémorisé par Safari, « version
 * ordinateur », page mise en cache avec un autre viewport, WebView mal
 * configurée). Les navigateurs réappliquent le `<meta name="viewport">` quand
 * son contenu change : la mise en page revient à l'échelle 1 et les feuilles de
 * style retrouvent leurs requêtes mobiles.
 *
 * Détection : un écran de téléphone (petit côté ≤ 600 px) dont la fenêtre de
 * mise en page dépasse 800 px **et** est plus haute que large. Un téléphone en
 * **paysage** n'est donc pas touché : sa fenêtre (844 × 390) est la largeur
 * réelle de son écran, pas un artefact de zoom, et la mise en page large y est
 * celle voulue. En zoom de page, en revanche, la fenêtre s'élargit *et* grandit
 * dans les mêmes proportions (860 × 1875 pour un écran de 390 × 844) : elle
 * reste plus haute que large.
 *
 * Quand le viewport est déjà celui du site, la fonction écrit une variante
 * équivalente (`initial-scale=1` au lieu de `1.0`) : la chaîne change, donc le
 * navigateur recalcule — sans effet sur le rendu si la fenêtre était correcte,
 * mais dans « version ordinateur » ou sur une page zoomée, ce recalcul ramène
 * souvent la mise en page à la largeur de l'écran. Le contenu étant écrit une
 * seule fois, les appels suivants ne font plus rien (pas d'oscillation).
 *
 * Sans effet sur un ordinateur, une tablette, ou un téléphone déjà à l'échelle.
 */
export function normalizePhoneViewport() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false;
  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return false;

  const screen = window.screen || {};
  const screenWidth = Number(screen.width) || 0;
  const screenHeight = Number(screen.height) || 0;
  const shortSide = Math.min(screenWidth, screenHeight) || screenWidth;
  // Un écran de téléphone ne dépasse pas ~600 px (CSS) sur son petit côté ;
  // la borne reste sous les tablettes (768 px et plus).
  if (!(shortSide && shortSide <= 600) && !isHandheld()) return false;

  const root = document.documentElement;
  const layoutWidth = window.innerWidth || root?.clientWidth || 0;
  const layoutHeight = window.innerHeight || root?.clientHeight || 0;
  if (layoutWidth <= 800) return false;                  // fenêtre normale
  // Paysage : la fenêtre est plus large que haute, c'est la largeur réelle de
  // l'écran — on n'y touche pas (mise en page large assumée, voir README).
  if (layoutHeight && layoutHeight < layoutWidth) return false;

  const canonical = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
  const variant = 'width=device-width, initial-scale=1, viewport-fit=cover';
  const current = meta.getAttribute('content') || '';
  if (current === variant) return false; // recalcul déjà demandé
  meta.setAttribute('content', current === canonical ? variant : canonical);
  return true;
}
