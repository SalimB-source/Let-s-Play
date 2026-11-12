/**
 * Entrée du banc d'essai de la visionneuse — compilée par
 * `scripts/gallery-lightbox-check.mjs` (build Vite `--ssr`), jamais exécutée
 * seule.
 *
 * Le fichier ré-exporte le vrai composant de galerie (celui qu'utilisent les
 * actus, les dossiers et les tests), le catalogue des galeries et l'instance
 * React du bundle : le script de vérification monte ensuite la galerie dans
 * jsdom et clique réellement sur les captures.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import Gallery from '../src/components/ArticleGallery';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { articleGalleries, getArticleGallery } from '../src/articleGalleries';

export { React, renderToString, articleGalleries, getArticleGallery };

// Comme dans le site, la vraie galerie reçoit son contexte d’interface.
// La langue imposée garde les assertions du banc d’essai déterministes.
export function ArticleGallery(props) {
  return <LanguageProvider lang="fr"><Gallery {...props} /></LanguageProvider>;
}

/** Rendu serveur de la galerie : sert à vérifier qu'aucune visionneuse n'y est rendue. */
export function renderGallery(props) {
  return renderToString(React.createElement(ArticleGallery, props));
}
