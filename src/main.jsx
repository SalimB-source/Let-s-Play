import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles.css';
import './profile-lists.css';
import './news-article.css';
import './auth/auth.css';
import './news-carousel.css';
import './news-view-toggle.css';
import './daily-news.css';
import './monthly-releases.css';
import './partners.css';
import './reels-carousel.css';
import './dossier-article.css';
import './achievements/achievements.css';
import './quizzes/quiz.css';
import './friends/friends.css';
import './messages/messages.css';
import './social/social.css';
import './typography.css';
import { LanguageProvider } from './i18n/LanguageContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import News from './pages/News';
import Calendar from './pages/Calendar';
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
import DossierPlayStation1 from './pages/DossierPlayStation1';
import DossierGenerations from './pages/DossierGenerations';
import DossierXbox360 from './pages/DossierXbox360';
import DossierPlayStation2 from './pages/DossierPlayStation2';
import Partners from './pages/Partners';
import Search from './pages/Search';
import QuizzesPage from './quizzes/QuizzesPage';
import QuizPage from './quizzes/QuizPage';
import EventAlgerieTelecom from './pages/EventAlgerieTelecom';
import EventOoredoo from './pages/EventOoredoo';
import EventArena from './pages/EventArena';
import NotFound from './pages/NotFound';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import MessagesPage from './messages/MessagesPage';
import { AuthProvider } from './auth/AuthContext';
import { AchievementProvider } from './achievements/AchievementContext';
import AchievementTracker from './achievements/AchievementTracker';
import AchievementPopup from './achievements/AchievementPopup';
import { FriendsProvider } from './friends/FriendsContext';
import { MessagesProvider } from './messages/MessagesContext';
import SocialDock from './social/SocialDock';
import { initSinglePlayback } from './lib/videoPlayback';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          {/* Les succès suivent les actions du joueur (navigation, lecture,
              vidéo, commentaires, langue, compte). Le fournisseur est placé
              dans le routeur : le suivi lit la route courante. */}
          {/* Les amis (liste, demandes, présence) et la messagerie 1-à-1
              suivent le compte connecté et partagent la même fenêtre sociale
              (en bas à droite, plein écran sur mobile) : `SocialDock`. Les
              boutons « Ajouter en ami » / « Message » des profils et les
              raccourcis du hub lisent les deux mêmes contextes. */}
          <FriendsProvider>
          <MessagesProvider>
          <AchievementProvider>
            <Layout>
              <AchievementTracker />
              <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/news" element={<News />} />
            <Route path="/calendrier" element={<Calendar />} />
            <Route path="/calendar" element={<Calendar />} />
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
            <Route path="/news/rayman-legends-retold" element={<CurrentNews slug="rayman-legends-retold" />} />
            <Route path="/news/fire-emblem-fortunes-weave" element={<CurrentNews slug="fire-emblem-fortunes-weave" />} />
            <Route path="/news/wolverine-exclu-ps5" element={<CurrentNews slug="wolverine-exclu-ps5" />} />
            <Route path="/news/kingdom-hearts-4-coco" element={<CurrentNews slug="kingdom-hearts-4-coco" />} />
            <Route path="/news/tokyo-game-show-2026-annulation" element={<CurrentNews slug="tokyo-game-show-2026-annulation" />} />
            <Route path="/news/eshop-switch-2-20-septembre" element={<CurrentNews slug="eshop-switch-2-20-septembre" />} />
            <Route path="/news/netmarble-tgs-2026" element={<CurrentNews slug="netmarble-tgs-2026" />} />
            <Route path="/news/control-resonant-24-septembre" element={<CurrentNews slug="control-resonant-24-septembre" />} />
            <Route path="/news/sorties-24-septembre" element={<CurrentNews slug="sorties-24-septembre" />} />
            <Route path="/news/sony-licence-jeux-numeriques" element={<CurrentNews slug="sony-licence-jeux-numeriques" />} />
            <Route path="/news/ea-sports-fc-27-carriere-dynamique" element={<CurrentNews slug="ea-sports-fc-27-carriere-dynamique" />} />
            {/* Actus du jour générées par le robot (scripts/news-bot/) :
                /news/<slug> lit src/news/autoIndex.js. Les slugs statiques
                ci-dessus restent prioritaires ; un slug inconnu affiche la
                page 404 (CurrentNews rend NotFound). */}
            <Route path="/news/:slug" element={<CurrentNews />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/dossiers" element={<Dossiers />} />
            <Route path="/dossiers/pourquoi-les-souls" element={<DossierSouls />} />
            <Route path="/dossiers/goya-hicosoft" element={<DossierGoya />} />
            <Route path="/dossiers/games-comic-con-dzair" element={<DossierComicCon />} />
            <Route path="/dossiers/let-play-awards-2025" element={<DossierAwards />} />
            <Route path="/dossiers/heritage-playstation-1" element={<DossierPlayStation1 />} />
            <Route path="/dossiers/choc-generations-gaming" element={<DossierGenerations />} />
            <Route path="/dossiers/20-ans-xbox-360" element={<DossierXbox360 />} />
            <Route path="/dossiers/25-ans-playstation-2" element={<DossierPlayStation2 />} />
            <Route path="/events" element={<Partners />} />
            <Route path="/events/algerie-telecom" element={<EventAlgerieTelecom />} />
            <Route path="/events/ooredoo" element={<EventOoredoo />} />
            <Route path="/events/7ouma-arena" element={<EventArena />} />
            <Route path="/partenaires" element={<Partners />} />
            <Route path="/search" element={<Search />} />
            {/* Quizz gaming : grille + quizz du jour (`/quizz`), partie par
                slug, alias anglais `/quiz` comme `/calendar` pour le
                calendrier. */}
            <Route path="/quizz" element={<QuizzesPage />} />
            <Route path="/quiz" element={<QuizzesPage />} />
            <Route path="/quizzes" element={<QuizzesPage />} />
            <Route path="/quizz/:slug" element={<QuizPage />} />
            <Route path="/quiz/:slug" element={<QuizPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Auth initialMode="signup" />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/profil/:userId" element={<Profile />} />
            <Route path="/u/:userId" element={<Profile />} />
            {/* Messagerie : une vraie page (surtout pour le mobile, où le
                pop-up laisse place au plein écran) — liste et discussion par
                URL, alias français `/messagerie`. */}
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:peerId" element={<MessagesPage />} />
            <Route path="/messagerie" element={<MessagesPage />} />
            <Route path="/messagerie/:peerId" element={<MessagesPage />} />
            <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
            <AchievementPopup />
            <SocialDock />
          </AchievementProvider>
          </MessagesProvider>
          </FriendsProvider>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

// Une seule vidéo à la fois : dès qu'un lecteur YouTube démarre, le
// coordinateur met en pause tous les autres lecteurs de la page.
initSinglePlayback();

createRoot(document.getElementById('root')).render(<App />);
