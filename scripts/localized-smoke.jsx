// Point d'entrée du contrôle `check:localized` : réexporte la couche de
// traduction d'articles telle qu'elle est empaquetée par le site. Passer par
// un build SSR évite les imports sans extension que Node ne résout pas seul.
export { TRANSLATED_LANGS, loadArticleListings, loadArticleBody } from '../src/news/localized/load.js';
export { countLocalized } from '../src/news/localized/index.js';
export { localizeListing, localizeStory, searchTextFor } from '../src/news/localized/index.js';
export { searchContent } from '../src/search/searchIndex.js';
