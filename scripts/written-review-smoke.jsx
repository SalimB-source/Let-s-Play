// Rendu des pages réellement utilisées par le test écrit de Chaft.
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { AuthProvider } from '../src/auth/AuthContext';
import Reviews from '../src/pages/Reviews';
import TestArticle from '../src/pages/TestArticle';
import SEO from '../src/components/SEO';
import { getTest } from '../src/reviewsData';
import { getArticleGallery } from '../src/articleGalleries';
import { searchContent } from '../src/search/searchIndex';

export { getTest, getArticleGallery, searchContent };

// Le contrôle monte aussi le vrai composant SEO : ses métadonnées sont posées
// dans un effet côté client, donc un rendu HTML serveur ne suffit pas.
export function ReviewSeo({ path }) {
  return (
    <LanguageProvider lang="fr">
      <MemoryRouter initialEntries={[path]}><SEO /></MemoryRouter>
    </LanguageProvider>
  );
}

export function renderReviewPage(path) {
  return renderToString(
    <LanguageProvider lang="fr">
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/reviews/:slug" element={<TestArticle />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </LanguageProvider>,
  );
}
