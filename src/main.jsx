import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles.css';
import './news-article.css';
import './auth/auth.css';
import './news-carousel.css';
import './news-view-toggle.css';
import './daily-news.css';
import { LanguageProvider } from './i18n/LanguageContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import News from './pages/News';
import Physint from './pages/Physint';
import MetroidRavenous from './pages/MetroidRavenous';
import WarDogs from './pages/WarDogs';
import ZeldaOcarina from './pages/ZeldaOcarina';
import Onimusha from './pages/Onimusha';
import OnimushaMillion from './pages/OnimushaMillion';
import Gta6DualSense from './pages/Gta6DualSense';
import Zelda40th from './pages/Zelda40th';
import MonsterHunterWilds from './pages/MonsterHunterWilds';
import Reviews from './pages/Reviews';
import Dossiers from './pages/Dossiers';
import NotFound from './pages/NotFound';
import Auth from './pages/Auth';
import { AuthProvider } from './auth/AuthContext';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Layout>
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/physint" element={<Physint />} />
            <Route path="/news/metroid-ravenous" element={<MetroidRavenous />} />
            <Route path="/news/wardogs" element={<WarDogs />} />
            <Route path="/news/zelda-ocarina" element={<ZeldaOcarina />} />
            <Route path="/reviews/onimusha" element={<Onimusha />} />
            <Route path="/news/onimusha-million" element={<OnimushaMillion />} />
            <Route path="/news/gta6-dualsense" element={<Gta6DualSense />} />
            <Route path="/news/zelda-40th" element={<Zelda40th />} />
            <Route path="/news/monster-hunter-wilds" element={<MonsterHunterWilds />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/dossiers" element={<Dossiers />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
