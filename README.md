# Let’s Play — page officielle

Landing page éditoriale dédiée à **Let’s Play**, l’émission algérienne qui parle de gaming, cinéma, e-sport, tech et pop culture.

## Lancer le projet

```bash
npm install
npm run dev
```

Pour produire la version de production :

```bash
npm run build
```

## Contenu

- Hero éditorial avec CTA YouTube
- Présentation de l’émission × Algérie Télécom avec l’épisode HicoSoft à la une (page d’accueil uniquement)
- Épisode partenaire Ooredoo : le FreeFire Algerian Championship 2023 (FFAC2023) en lecteur YouTube,
  présenté comme l’épisode HicoSoft — grille miroir, accents aux couleurs Ooredoo (page d’accueil uniquement)
- Présentation de l’émission et chiffres de communauté
- Formats : Gaming, Cinéma et Pop Culture
- Dernières vidéos YouTube avec filtres interactifs
- Liens vers les comptes officiels
- Partenaires & collaborations : Algérie Télécom, TCL et le Games & Comic Con Dzaïr 2026
  (section d’accueil + page dédiée `/partenaires`)

Les visuels des cartes vidéo utilisent les miniatures publiques YouTube des épisodes correspondants.

## Partenaires

Les partenaires sont déclarés dans `src/partnersData.js` (nom, liens, couleur de
marque) et leurs textes traduits vivent dans `t.partners` / `t.home.partners`
(`src/i18n/translations.js`), en français, anglais et arabe.

Par défaut, chaque marque s’affiche sous forme de monogramme aux couleurs du
partenaire (`src/components/PartnerMark.jsx`). Pour utiliser un logo officiel,
déposez le fichier dans `public/partners/` puis renseignez le champ `logo`
correspondant dans `src/partnersData.js`, par exemple :

```js
{ id: 'tcl', logo: 'partners/tcl.png' /* … */ }
```

## 7ouma Arena (page Events)

7ouma Arena est expliqué en tête de la page Events (`/events`, alias
`/partenaires`) par le composant `src/components/ArenaShowcase.jsx` : le
rendez-vous y est présenté comme **une émission et un tournoi** — « by Djezzy »
pour la marque qui le présente, organisé par **EGOR Gaming avec l’équipe
Let’s Play** pour la partie compétition. La section déroule les deux formats,
les rôles de chacun, le contenu de l’émission puis ses sources.

Les textes vivent dans les objets `copy` fr / en / ar du composant, et les
fiches partenaires correspondantes (`djezzy`, `7ouma-arena`, `egor-gaming`) dans
`src/partnersData.js` — elles alimentent aussi la carte d’accueil, qui renvoie
vers la section via `partner.page` (`/events#7ouma-arena-show`).

Trace publique utilisée : l’annonce de lancement du show
(`arenaLaunchSource` dans `src/partnersData.js`), complétée par les sites
officiels de Djezzy et d’EGOR Gaming. La participation de l’équipe Let’s Play
est confirmée par l’équipe elle-même — c’est indiqué comme tel sur la page.

## Calendrier des sorties & compte à rebours « le plus attendu » (page Actus)

Tout part d'une seule liste : `gameReleases` dans `src/releasesData.js`. La page
Actus (`src/pages/News.jsx`) ne cite aucun jeu en dur — ni dans le compte à rebours,
ni dans les libellés de mois.

### Le compte à rebours tourne tout seul

Le bloc prend le premier de la file des sorties **pas encore disponibles**, triée par :

1. `awaitedRank` — rang éditorial (« le plus attendu » = `1`, celui qui prend le relais = `2`, …) ;
2. puis date de sortie (les jeux sans `awaitedRank` ne sont proposés qu'en dernier
   recours, ce qui évite un bloc vide tant qu'il reste une sortie au calendrier).

Le décompte se fait à la seconde près côté visiteur : le basculement sur le jeu
suivant a donc lieu tout seul, même onglet ouvert, **sans redéploiement**. Trois états :

- **avant la sortie** — titre, date et chiffres du jeu en cours ;
- **jour J** — les chiffres comptent déjà le jeu suivant, et une pastille
  « SORTI AUJOURD'HUI · {titre} » + une ligne de contexte préviennent le lecteur ;
- **calendrier épuisé** — « CALENDRIER À JOUR », chiffres à `--`, visuel de la dernière sortie.

Changer de jeu « le plus attendu » = changer les `awaitedRank`. Rien d'autre.

### Le calendrier peut couvrir plusieurs mois

Une entrée peut préciser `month` (et `year`). La grille et la frise affichent le
**mois actif** : le mois courant s'il a des sorties, sinon le mois de la prochaine
sortie annoncée, sinon le dernier mois connu. Le compte à rebours, lui, ignore les
frontières de mois — dès que septembre est terminé, il enchaîne sur le premier jeu
d'octobre poussé dans la liste. Les libellés (« SEPTEMBRE 2026 », « 15 SEP », la
frise 01→30/31) sont déduits des données et localisés, rien n'est codé en dur.

Faire suivre la saison :

```js
// src/releasesData.js
{ slug: 'metroid-ravenous', month: 10, day: 28, title: 'Metroid Ravenous',
  platforms: 'SWITCH 2', image: 'releases/metroid-ravenous.jpg',
  alt: 'Metroid Ravenous — Samus dans une grotte organique', awaitedRank: 9 }
```

- déposer le visuel 16:9 (800×450) dans `public/releases/` ;
- `awaitedRank` est une échelle **globale** : le premier jeu d'octobre prend le rang
  qui suit le dernier de septembre ;
- `countdownImage` (optionnel) donne un visuel dédié au bloc « le plus attendu ».

### La liste complète vit sur sa propre page : `/calendrier`

La grille des sorties ne reste plus sur la page Actus : le lien
« VOIR LE CALENDRIER COMPLET » (en tête de section et en bandeau sous le compte
à rebours) ouvre la page interne `/calendrier` (alias `/calendar`, route
`src/pages/Calendar.jsx`). Elle déroule **tous les mois ayant au moins une
sortie datée** — septembre 2026 → avril 2027 — avec :

- une barre de navigation collante (un chip par mois, avec le nombre de sorties) ;
- pour chaque mois, la même frise et les mêmes cartes que la section Actus
  (`MonthTimeline` / `ReleaseGrid`, composants partagés dans
  `src/components/ReleasesCalendar.jsx`) ;
- le compte à rebours « le plus attendu » en tête de page ;
- les cartes dont l'entrée du calendrier fournit un visuel deviennent des liens
  internes quand l'entrée renseigne `to` (ex. Zelda Ocarina → `/news/zelda-ocarina`).

Une sortie sans key art déposé dans `public/releases/` s'affiche quand même,
sous forme de vignette « ticket » (jour + mois, mention « VISUEL À VENIR ») :
rien n'empêche d'ajouter un mois au calendrier en attendant son visuel.

Ajouter un mois = pousser des entrées avec `month` / `year` dans
`src/releasesData.js` : la page `/calendrier` le liste automatiquement
(la barre de mois et les compteurs sont déduits de `calendarMonths()`), et la
page Actus bascule dessus dès que le mois courant n'a plus rien au calendrier.

### Une heure de lancement exacte, si besoin

Par défaut le décompte vise **minuit, heure locale du visiteur** — le basculement ne
tombe donc pas au même moment partout. Pour un lancement mondial synchronisé, renseigner
`releaseAt` (ISO 8601 avec fuseau) ; il prime sur `day`, qui reste utilisé pour la grille :

```js
{ slug: 'marvels-wolverine', day: 15, releaseAt: '2026-09-15T00:00:00Z', /* … */ }
```

### Voir un état futur sans attendre la date

Un paramètre d'URL décale l'horloge de toute la section (figé à l'ouverture, puis
l'horloge simulée avance à vitesse réelle) :

```
/news?at=2026-09-14              → la veille de Marvel’s Wolverine
/news?at=2026-09-15T23:59:55     → le basculement se déclenche en direct
/news?at=2026-09-30              → dernière sortie du mois / état « à jour »
```

### Vérifications

- `npm run check:countdown` — rejoue septembre, le passage de relais multi-mois,
  `releaseAt`, l'ordre de la file, le décompte, les dates localisées et la liste
  des mois de la page `/calendrier` (section 7/7).
- `npm run check:i18n` — toutes les routes × FR / EN / AR, dont les trois états du bloc
  (les textes vivent dans `t.news.calendar` et `t.news.countdown`).

## Une seule vidéo à la fois

Plusieurs pages cumulent les lecteurs YouTube (accueil : 4 reels ; `/reviews` :
dossiers + shorts ; `/events/…` : un épisode par partenaire). Dès qu'un lecteur
démarre, tous les autres sont mis en pause : plus de vidéo qui continue hors
écran pendant qu'on en regarde une autre.

Le comportement vit dans `src/lib/videoPlayback.js` :

- `youTubeEmbedUrl(id, { autoplay, start })` construit l'URL de tous les embeds
  du site et ajoute `enablejsapi=1` — sans ce paramètre, un lecteur YouTube
  reste muet et ne peut plus être piloté depuis la page ;
- `initSinglePlayback()`, démarré dans `src/main.jsx`, repère les iframes
  YouTube du DOM (MutationObserver compris, pour la modale et les embeds
  reconstruits), s'abonne à chacune, puis envoie `pauseVideo` à toutes les
  autres dès qu'un lecteur passe en lecture ;
- `pauseAllPlayback()` coupe tout d'un coup — utilisé à l'ouverture de la modale
  de test (`src/components/VideoModal.jsx`), dont l'autoplay peut être refusé
  par le navigateur.

Aucun script externe : le coordinateur parle directement le protocole
postMessage de l'embed YouTube (`{"event":"listening"}` pour s'abonner,
`{"event":"command","func":"pauseVideo"}` pour couper) et reconnaît le lecteur
qui écrit par sa fenêtre (`event.source`). Il cohabite avec le chapitrage des
dossiers (`src/lib/useChapterVideo.js`) : l'API IFrame et le coordinateur
écoutent la même fenêtre.

Les embeds tiers (Instagram, TikTok…) n'exposent aucun protocole de pause : ils
ne sont pas rechargés, un rechargement relançant leur lecture automatique.

### Vérification

- `npm run check:videos` — l'URL partagée contient bien `enablejsapi=1`, aucun
  composant ne construit son embed à la main, et le protocole est rejoué sur un
  DOM simulé : un lecteur démarre → les autres reçoivent `pauseVideo`, le
  lecteur actif n'est pas touché, un état répété ne renvoie rien, les lecteurs
  retirés de la page sont oubliés.

## Sources éditoriales

- [Instagram @letsplay.officiel](https://www.instagram.com/letsplay.officiel/)
- [YouTube Let’s Play Official](https://www.youtube.com/@letsplay.officiel)
- [Games & Comic Con Dzaïr](https://www.gccdz.com/)
- [Algérie Télécom](https://www.algerietelecom.dz/) · [IdOOM Market](https://idoom-market.com.dz/fr)
- [TCL](https://www.tcl.com/)
