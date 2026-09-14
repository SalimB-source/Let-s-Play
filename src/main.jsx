import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles.css';
import './news-article.css';
import './auth/auth.css';
import './news-carousel.css';
import './news-view-toggle.css';
import './daily-news.css';
import './monthly-releases.css';
import './partners.css';
import './dossier-article.css';
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
import BlizzardNews from './pages/BlizzardNews';
import CurrentNews from './pages/CurrentNews';
import Reviews from './pages/Reviews';
import TestArticle from './pages/TestArticle';
import Dossiers from './pages/Dossiers';
import DossierSouls from './pages/DossierSouls';
import DossierGoya from './pages/DossierGoya';
import DossierComicCon from './pages/DossierComicCon';
import DossierAwards from './pages/DossierAwards';
import Partners from './pages/Partners';
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
              <Route path="/reviews/:slug" element={<TestArticle />} />
            <Route path="/news/onimusha-million" element={<OnimushaMillion />} />
            <Route path="/news/gta6-dualsense" element={<Gta6DualSense />} />
            <Route path="/news/zelda-40th" element={<Zelda40th />} />
            <Route path="/news/monster-hunter-wilds" element={<MonsterHunterWilds />} />
            <Route path="/news/starcraft-fps" element={<BlizzardNews slug="starcraft-fps" />} />
            <Route path="/news/diablo-v" element={<BlizzardNews slug="diablo-v" />} />
            <Route path="/news/diablo-switch-2" element={<BlizzardNews slug="diablo-switch-2" />} />
            <Route path="/news/diablo-netflix" element={<BlizzardNews slug="diablo-netflix" />} />
            <Route path="/news/persona-6-switch-2" element={<CurrentNews slug="persona-6-switch-2" />} />
            <Route path="/news/last-of-us-ii-mod" element={<CurrentNews slug="last-of-us-ii-mod" />} />
            <Route path="/news/cyberpunk-2077-battlenet" element={<CurrentNews slug="cyberpunk-2077-battlenet" />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/dossiers" element={<Dossiers />} />
            <Route path="/dossiers/pourquoi-les-souls" element={<DossierSouls />} />
            <Route path="/dossiers/goya-hicosoft" element={<DossierGoya />} />
            <Route path="/dossiers/games-comic-con-dzair" element={<DossierComicCon />} />
            <Route path="/dossiers/let-play-awards-2025" element={<DossierAwards />} />
            <Route path="/events" element={<Partners />} />
            <Route path="/partenaires" element={<Partners />} />
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
