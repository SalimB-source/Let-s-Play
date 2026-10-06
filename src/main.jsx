import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles.css';
import './profile-lists.css';
import './news-article.css';
import './components/SpoilerAlert.css';
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
import './messages/calls.css';
import './social/social.css';
import './typography.css';
import './theme.css';        // thème clair : importé en dernier (surcharge)
import { LanguageProvider } from './i18n/LanguageContext';
import { ThemeProvider } from './theme/ThemeContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import { AuthProvider } from './auth/AuthContext';
import { AchievementProvider } from './achievements/AchievementContext';
import AchievementTracker from './achievements/AchievementTracker';
import AchievementPopup from './achievements/AchievementPopup';
import { FriendsProvider } from './friends/FriendsContext';
import { MessagesProvider } from './messages/MessagesContext';
import { CallsProvider } from './messages/CallsContext';
import CallOverlays from './messages/CallOverlays';
import SocialDock from './social/SocialDock';
import { initSinglePlayback } from './lib/videoPlayback';
import { normalizePhoneViewport } from './lib/phoneLayout';
import { applyLaneCountForDevice } from './games/mirageLanes';

/**
 * Pages à la demande — le shell (barre, thème, contexte de compte) se charge
 * seul, chaque page arrive quand on l'ouvre.
 *
 * Pourquoi : le bundle d'entrée doit rester léger pour tout le monde. Sans ce
 * découpage, ce sont les articles (`CurrentNews`), les quizz, les dossiers et
 * l'arcade qui partaient dans le même fichier que la page d'accueil — soit
 * plusieurs centaines de kilo-octets téléchargés par un visiteur qui ne lit
 * qu'une brève. `Home` reste importée en dur : c'est la porte d'entrée du
 * site, elle ne doit pas attendre un aller-retour réseau de plus.
 *
 * Le repli est celui des jeux (`RouteLoading`), pour que l'attente ait la même
 * allure partout.
 */
const News = lazy(() => import('./pages/News'));
const GamingNews = lazy(() => import('./pages/GamingNews'));
const CinemaNews = lazy(() => import('./pages/CinemaNews'));
const TechNews = lazy(() => import('./pages/TechNews'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Physint = lazy(() => import('./pages/Physint'));
const MetroidRavenous = lazy(() => import('./pages/MetroidRavenous'));
const WarDogs = lazy(() => import('./pages/WarDogs'));
const ZeldaOcarina = lazy(() => import('./pages/ZeldaOcarina'));
const Onimusha = lazy(() => import('./pages/Onimusha'));
const OnimushaMillion = lazy(() => import('./pages/OnimushaMillion'));
const Gta6DualSense = lazy(() => import('./pages/Gta6DualSense'));
const Zelda40th = lazy(() => import('./pages/Zelda40th'));
const MonsterHunterWilds = lazy(() => import('./pages/MonsterHunterWilds'));
const BlizzardNews = lazy(() => import('./pages/BlizzardNews'));
const CurrentNews = lazy(() => import('./pages/CurrentNews'));
const Reviews = lazy(() => import('./pages/Reviews'));
const TestArticle = lazy(() => import('./pages/TestArticle'));
const Dossiers = lazy(() => import('./pages/Dossiers'));
const DossierSouls = lazy(() => import('./pages/DossierSouls'));
const DossierGoya = lazy(() => import('./pages/DossierGoya'));
const DossierComicCon = lazy(() => import('./pages/DossierComicCon'));
const DossierAwards = lazy(() => import('./pages/DossierAwards'));
const DossierPlayStation1 = lazy(() => import('./pages/DossierPlayStation1'));
const DossierGenerations = lazy(() => import('./pages/DossierGenerations'));
const DossierXbox360 = lazy(() => import('./pages/DossierXbox360'));
const DossierPlayStation2 = lazy(() => import('./pages/DossierPlayStation2'));
const Search = lazy(() => import('./pages/Search'));
const QuizzesPage = lazy(() => import('./quizzes/QuizzesPage'));
const QuizPage = lazy(() => import('./quizzes/QuizPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Games = lazy(() => import('./pages/Games'));
const Auth = lazy(() => import('./pages/Auth'));
const Profile = lazy(() => import('./pages/Profile'));
const MessagesPage = lazy(() => import('./messages/MessagesPage'));
const CommunityPage = lazy(() => import('./community/CommunityPage'));
const MirageRushPage = lazy(() => import('./games/MirageRushPage'));
const ViceCityRushPage = lazy(() => import('./games/ViceCityRushPage'));

/** Écran d'attente d'une page à la demande — mêmes marges que les replis des jeux. */
function RouteLoading({ label = 'Chargement…' }) {
  return <div className="wrap" style={{ minHeight: '60vh', paddingTop: 80 }}>{label}</div>;
}

function App() {
  return (
    <ThemeProvider>
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
          {/* Les appels vocaux/vidéo vivent à côté de la messagerie : ils
              s'adressent aux amis en ligne, vérifient les blocages et
              déposent leur trace dans les discussions. Les surfaces
              (appel entrant, panneau d'appel) se rendent au-dessus de
              tout, comme la fenêtre sociale. */}
          <CallsProvider>
          <AchievementProvider>
            <Layout>
              <AchievementTracker />
              {/* Une seule frontière pour toutes les pages à la demande : la
                  barre, le fond et les surcouches (appels, succès, messagerie)
                  restent en place pendant que la page arrive. Les jeux gardent
                  leur repli nommé, plus bas. */}
              <Suspense fallback={<RouteLoading />}>
              <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/gaming" element={<GamingNews />} />
            <Route path="/news/cinema" element={<CinemaNews />} />
            {/* Actus cinéma : les cartes du hub `/news/cinema` pointent vers
                /news/cinema/<slug> ; les clés d'article correspondantes dans
                CurrentNews sont préfixées « cinema/ » (ex. :
                cinema/jojo-steel-ball-run-episode-2). */}
            <Route path="/news/cinema/:slug" element={<CurrentNews slugPrefix="cinema/" />} />
            {/* Actus tech : troisième zone du hub `/news` (gaming / cinéma /
                tech), même mécanique que le cinéma — clés d'article préfixées
                « tech/ » dans CurrentNews (ex. :
                tech/starship-flight-14-premier-vol-orbital). */}
            <Route path="/news/tech" element={<TechNews />} />
            <Route path="/news/tech/:slug" element={<CurrentNews slugPrefix="tech/" />} />
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
            <Route path="/news/gta-6-satire-monde-invente" element={<CurrentNews slug="gta-6-satire-monde-invente" />} />
            <Route path="/news/physint-budget-400-millions-xbox" element={<CurrentNews slug="physint-budget-400-millions-xbox" />} />
            <Route path="/news/minecraft-the-sift-nouvelle-dimension" element={<CurrentNews slug="minecraft-the-sift-nouvelle-dimension" />} />
            <Route path="/news/god-of-war-laufey-precommandes-arc-serpent" element={<CurrentNews slug="god-of-war-laufey-precommandes-arc-serpent" />} />
            <Route path="/news/minecraft-world-hotel-chessington-2027" element={<CurrentNews slug="minecraft-world-hotel-chessington-2027" />} />
            <Route path="/news/the-witcher-3-remastered-sortie-29-septembre" element={<CurrentNews slug="the-witcher-3-remastered-sortie-29-septembre" />} />
            <Route path="/news/xbox-nadella-restructuration" element={<CurrentNews slug="xbox-nadella-restructuration" />} />
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
            <Route path="/search" element={<Search />} />
            {/* Quizz gaming : grille + quizz du jour (`/quizz`), partie par
                slug, alias anglais `/quiz` comme `/calendar` pour le
                calendrier. */}
            <Route path="/quizz" element={<QuizzesPage />} />
            <Route path="/quiz" element={<QuizzesPage />} />
            <Route path="/quizzes" element={<QuizzesPage />} />
            <Route path="/quizz/:slug" element={<QuizPage />} />
            <Route path="/quiz/:slug" element={<QuizPage />} />
            {/* Arcade : `/jeu` est la vitrine des jeux de la maison (Mirage
                Rush n'est qu'une des cartes), chaque jeu a sa propre route. */}
            <Route path="/jeu" element={<Games />} />
            <Route path="/jeux" element={<Games />} />
            <Route path="/jeu/mirage-rush" element={<Suspense fallback={<RouteLoading label="Chargement de Mirage Rush…" />}><MirageRushPage /></Suspense>} />
            <Route path="/jeu/vice-city-rush" element={<Suspense fallback={<RouteLoading label="Chargement de Vice City Rush…" />}><ViceCityRushPage /></Suspense>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Auth initialMode="signup" />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/profil/:userId" element={<Profile />} />
            <Route path="/u/:userId" element={<Profile />} />
            {/* Messagerie : une vraie page (surtout pour le mobile, où le
                pop-up laisse place au plein écran) — liste et discussion par
                URL, alias français `/messagerie`. */}
            <Route path="/communaute" element={<CommunityPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:peerId" element={<MessagesPage />} />
            <Route path="/messagerie" element={<MessagesPage />} />
            <Route path="/messagerie/:peerId" element={<MessagesPage />} />
            <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </Layout>
            <AchievementPopup />
            <SocialDock />
            <CallOverlays />
          </AchievementProvider>
          </CallsProvider>
          </MessagesProvider>
          </FriendsProvider>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
    </ThemeProvider>
  );
}

// Une seule vidéo à la fois : dès qu'un lecteur YouTube démarre, le
// coordinateur met en pause tous les autres lecteurs de la page.
initSinglePlayback();

// Sur un téléphone dont le navigateur a élargi la fenêtre de mise en page
// (zoom de page mémorisé par Safari, « version ordinateur », WebView qui
// ignore `<meta viewport>`), on réapplique le viewport de l'écran AVANT le
// premier rendu : la page repart à l'échelle 1 et les requêtes média mobiles
// s'appliquent. Appelée aussi juste après le montage : Safari applique
// parfois son zoom mémorisé une fois la page déjà chargée.
normalizePhoneViewport();

// Mirage Rush se joue sur trois voies sur téléphone — navigateur comme
// application — et sur quatre sur ordinateur et tablette (voir
// src/games/mirageLanes.js). Le choix est fait ici, une seule fois, AVANT le
// premier rendu : les courses, les rivaux du Duel et le décor lisent la piste
// au moment de construire la partie.
applyLaneCountForDevice();

createRoot(document.getElementById('root')).render(<App />);

setTimeout(normalizePhoneViewport, 400);
setTimeout(normalizePhoneViewport, 1500);
