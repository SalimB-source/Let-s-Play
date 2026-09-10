import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles.css';
import './news-article.css';
import { LanguageProvider } from './i18n/LanguageContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import News from './pages/News';
import Physint from './pages/Physint';
import MetroidRavenous from './pages/MetroidRavenous';
import Reviews from './pages/Reviews';
import Dossiers from './pages/Dossiers';
import NotFound from './pages/NotFound';

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/physint" element={<Physint />} />
            <Route path="/news/metroid-ravenous" element={<MetroidRavenous />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/dossiers" element={<Dossiers />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </LanguageProvider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
