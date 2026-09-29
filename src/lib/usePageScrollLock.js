import { useEffect } from 'react';
import { setAppPullToRefresh } from './appBridge';

/**
 * `usePageScrollLock` — gèle le défilement de la page tant qu'un écran plein
 * cadre est ouvert (course de Mirage Rush en pop-up, salon en ligne…).
 *
 * Pourquoi pas seulement `overflow: hidden` sur `<body>` : iOS Safari ignore
 * largement cette règle (le corps de page continue de « caoutchouter », et un
 * glissement du doigt déplace la page sous le doigt). On fige donc le corps à
 * sa position de défilement — `position: fixed` + `top: -<hauteur défilée>` —
 * puis on rend au `<body>` ses styles d'origine et sa position au moment de
 * fermer. C'est la technique classique des bibliothèques de verrouillage.
 *
 * Dans l'app Android, la page gelée n'ayant plus rien à faire défiler, le geste
 * vers le bas irait à l'indicateur natif de tirer-pour-rafraîchir et
 * rechargerait la manche en cours : le verrou coupe donc aussi ce geste-là
 * (`setAppPullToRefresh`), et le rend à la fermeture.
 *
 * `lockPageScroll()` renvoie la fonction de libération ; les styles écrits sont
 * exactement ceux d'avant (chaîne vide si la feuille de style les portait), et
 * la restauration n'a lieu qu'une fois, même si la libération est appelée deux
 * fois. Sans DOM (rendu SSR des scripts de vérification), tout est inerte.
 */
let lockDepth = 0;

export function lockPageScroll(
  targetWindow = typeof window !== 'undefined' ? window : null,
  targetDocument = typeof document !== 'undefined' ? document : null,
) {
  const noop = () => {};
  if (!targetWindow || !targetDocument) return noop;
  const { body, documentElement } = targetDocument;
  if (!body || !body.style) return noop;

  const offset = Math.max(0, targetWindow.scrollY || documentElement?.scrollTop || 0);
  const previous = {
    overflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
  };

  body.style.overflow = 'hidden';
  if (offset > 0) {
    body.style.position = 'fixed';
    body.style.top = `-${offset}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
  }

  // Deux écrans pourraient se verrouiller l'un après l'autre : seul le dernier
  // déverrouillage rend le geste à l'app.
  lockDepth += 1;
  if (lockDepth === 1) setAppPullToRefresh(false);

  let released = false;
  return () => {
    if (released) return;
    released = true;
    Object.entries(previous).forEach(([property, value]) => {
      body.style[property] = value;
    });
    if (offset > 0 && typeof targetWindow.scrollTo === 'function') {
      targetWindow.scrollTo(0, offset);
    }
    lockDepth = Math.max(0, lockDepth - 1);
    if (lockDepth === 0) setAppPullToRefresh(true);
  };
}

/** `usePageScrollLock(active)` — verrouille le défilement pendant `active`. */
export default function usePageScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    return lockPageScroll();
  }, [active]);
}
