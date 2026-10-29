// EN PREMIER, et volontairement : ce module comble les API récentes
// (`Object.hasOwn`, `Array.prototype.at`, `structuredClone`, `randomUUID`) sur
// les moteurs anciens — la WebView Android de l'APK, en particulier. Placé
// avant tous les autres imports, il est évalué avant le premier module qui
// s'en sert. Voir `src/lib/navigateursAnciens.js`.
import './lib/navigateursAnciens.js';
import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles.css';
import './profile-lists.css';
import './news-article.css';
import './written-review.css';
import './components/SpoilerAlert.css';
import './auth/auth.css';
import './news-carousel.css';
import './actus.css';
import './news-view-toggle.css';
import './daily-news.css';
import './monthly-releases.css';
import './partners.css';
import './dz-dev.css';
import './reels-carousel.css';
import './dossier-article.css';
import './achievements/achievements.css';
import './quizzes/quiz.css';
import './friends/friends.css';
import './messages/messages.css';
import './messages/calls.css';
import './social/social.css';
import './typography.css';
import './large-screen.css'; // paliers ≥ 1440 px : conteneur, grilles, rythme
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
import GameLoadBoundary from './games/GameLoadBoundary.jsx';
import MiseAJourDisponible from './components/MiseAJourDisponible';
import GardeErreur from './components/GardeErreur';

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
const Actus = lazy(() => import('./pages/Actus'));
const AllNews = lazy(() => import('./pages/AllNews'));
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
const DzDev = lazy(() => import('./pages/DzDev'));
const DzDevHicosoft = lazy(() => import('./pages/DzDevHicosoft'));
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
// Écran d'entrée du Sablier : propose l'installeur PC ou le navigateur AVANT
// de tirer le chunk du duel (voir src/games/RpgEntryChoice.jsx).
const RpgEntryChoice = lazy(() => import('./games/RpgEntryChoice'));
// Le Sablier en ligne : salon du défi puis plateau. Chunk séparé du duel solo —
// on n'y télécharge pas le moteur local, tout vient de l'arbitre.
const RpgPvpSalon = lazy(() => import('./games/RpgPvpSalon'));
const MirageRushPage = lazy(() => import('./games/MirageRushPage'));
const ViceCityRushPage = lazy(() => import('./games/ViceCityRushPage'));
// Prototype de RPG tour par tour « Le Sablier » (dossier : docs/rpg/).

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
            <Route path="/actus" element={<Actus />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/articles" element={<AllNews />} />
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
            <Route path="/news/hellraiser-revival-sortie" element={<CurrentNews slug="hellraiser-revival-sortie" />} />
            {/* Actus gaming du 18.10.2026 (aujourd'hui), du 17.10 et du 16.10.2026 :
                comme pour les éditions précédentes, les clés sans préfixe de ces
                éditions reçoivent leur route explicite. Les actus cinéma et tech
                sont servies par /news/cinema/:slug et /news/tech/:slug. */}
            <Route path="/news/zelda-ocarina-of-time-switch-2-affichages-hud" element={<CurrentNews slug="zelda-ocarina-of-time-switch-2-affichages-hud" />} />
            <Route path="/news/peak-console-edition-crossplay-22-octobre" element={<CurrentNews slug="peak-console-edition-crossplay-22-octobre" />} />
            <Route path="/news/steam-ensembles-de-succes-beta" element={<CurrentNews slug="steam-ensembles-de-succes-beta" />} />
            <Route path="/news/total-war-shogun-2-complete-edition-retiree" element={<CurrentNews slug="total-war-shogun-2-complete-edition-retiree" />} />
            <Route path="/news/modern-warfare-4-campagne-acces-anticipe" element={<CurrentNews slug="modern-warfare-4-campagne-acces-anticipe" />} />
            <Route path="/news/beast-of-reincarnation-fin-cycle-mises-a-jour" element={<CurrentNews slug="beast-of-reincarnation-fin-cycle-mises-a-jour" />} />
            {/* Actus gaming du 15.10.2026 : les clés sans préfixe de l'édition du
                jour reçoivent leur route explicite, comme les articles de la
                rédaction (la route générique /news/:slug les servirait aussi). */}
            <Route path="/news/gta-6-trailer-de-lancement" element={<CurrentNews slug="gta-6-trailer-de-lancement" />} />
            <Route path="/news/zelda-ocarina-of-time-nouvelle-presentation" element={<CurrentNews slug="zelda-ocarina-of-time-nouvelle-presentation" />} />
            {/* Actus gaming du 14.10.2026 et du 11.10.2026 : les clés sans préfixe
                (hors cinéma et tech) reçoivent leur route explicite, comme les
                articles de la rédaction. */}
            <Route path="/news/sonic-racing-crossworlds-annee-2" element={<CurrentNews slug="sonic-racing-crossworlds-annee-2" />} />
            <Route path="/news/tekken-8-roger-jr-ace-combat-8-million" element={<CurrentNews slug="tekken-8-roger-jr-ace-combat-8-million" />} />
            <Route path="/news/ghost-tsushima-legends-anime-2028" element={<CurrentNews slug="ghost-tsushima-legends-anime-2028" />} />
            <Route path="/news/gta-6-cloud-pc-dementi-xbox" element={<CurrentNews slug="gta-6-cloud-pc-dementi-xbox" />} />
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
            <Route path="/dz-dev" element={<DzDev />} />
            <Route path="/dz-dev/hicosoft" element={<DzDevHicosoft />} />
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
            <Route path="/jeux-video" element={<Games />} />
            <Route path="/lets-play" element={<Games />} />
            <Route path="/jeu/mirage-rush" element={<Suspense fallback={<RouteLoading label="Chargement de Mirage Rush…" />}><MirageRushPage /></Suspense>} />
            <Route path="/jeu/vice-city-rush" element={<Suspense fallback={<RouteLoading label="Chargement de Vice City Rush…" />}><ViceCityRushPage /></Suspense>} />
            <Route path="/jeu/sablier-de-bab-el" element={<GameLoadBoundary jeu="Le Sablier"><Suspense fallback={<RouteLoading label="Chargement du duel…" />}><RpgEntryChoice variantesPlateaux /></Suspense></GameLoadBoundary>} />
            {/* Duel en ligne : le salon sans code crée un défi, le salon avec
                code rejoint une invitation. Le lien d'invitation est un chemin
                réel (`…/defi/AB12CD34`) pour qu'il se colle partout. */}
            <Route path="/jeu/sablier-de-bab-el/defi" element={<GameLoadBoundary jeu="Le Sablier"><Suspense fallback={<RouteLoading label="Chargement du duel en ligne…" />}><RpgPvpSalon /></Suspense></GameLoadBoundary>} />
            <Route path="/jeu/sablier-de-bab-el/defi/:code" element={<GameLoadBoundary jeu="Le Sablier"><Suspense fallback={<RouteLoading label="Chargement du duel en ligne…" />}><RpgPvpSalon /></Suspense></GameLoadBoundary>} />
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
            {/* La relance de mise à jour : à la racine, hors de `Layout`, pour
                qu'elle parle aussi sur la table de duel et par-dessus les
                surcouches. */}
            <MiseAJourDisponible />
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

createRoot(document.getElementById('root')).render(
  // Le filet de dernier recours : une erreur de rendu non rattrapée vidait la
  // page sans rien dire (écran noir dans l'APK). Voir `GardeErreur.jsx`.
  <GardeErreur>
    <App />
  </GardeErreur>,
);

/**
 * Retire l'amorce de `index.html` dès que React a posé son premier écran.
 *
 * L'amorce est du HTML pur : elle s'affiche même si le module compilé ne
 * s'exécute jamais (moteur trop ancien) — c'est le script de secours
 * d'`index.html` qui prend alors le relais avec un message lisible. Ici, on ne
 * la retire que lorsque `#root` a réellement des enfants : retirer à l'aveugle
 * laisserait un écran vide pendant tout le temps de montage.
 */
function retirerAmorce() {
  const racine = document.getElementById('root');
  const amorce = document.getElementById('amorce');
  if (!amorce) return;
  if (racine && racine.childElementCount > 0) {
    amorce.remove();
    // Si le panneau de secours s'était affiché (erreur signalée pendant le
    // chargement, fichier pas encore publié), le site qui démarre le referme :
    // une page qui marche ne doit jamais rester couverte par un message
    // d'échec.
    const secours = document.getElementById('secours');
    if (secours) secours.style.display = 'none';
    return;
  }
  // Douze secondes au plus : au-delà, c'est le panneau de secours qui parle.
  if (typeof performance !== 'undefined' && performance.now() > 12000) return;
  requestAnimationFrame(retirerAmorce);
}
requestAnimationFrame(retirerAmorce);

setTimeout(normalizePhoneViewport, 400);
setTimeout(normalizePhoneViewport, 1500);
