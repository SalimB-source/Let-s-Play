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
- Bloc de diffusion YouTube live configurable sur la page d’accueil
- Partenaires & collaborations : Algérie Télécom, TCL et le Games & Comic Con Dzaïr 2026
  (section d’accueil + page dédiée `/partenaires`)

Les visuels des cartes vidéo utilisent les miniatures publiques YouTube des épisodes correspondants
(voir « Miniatures YouTube » plus bas : aucune carte ne reste sans image).

## Player accounts & authentication (Supabase)

Registration, login, Google / Microsoft (Azure) sign-in, password reset and the
connected player hub (`/auth`) run on [Supabase Auth](https://supabase.com/auth)
(`@supabase/supabase-js`, client in `src/lib/supabase.js`, session in
`src/auth/AuthContext.jsx`). Without configuration the page falls back to the
one-click demo preview.

### Environment variables

Local development — copy `.env.example` to `.env.local`:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_or_anon_key
```

Find both values in Supabase Dashboard → Settings → API (Project URL and the
publishable / anon public key). The app also accepts `VITE_SUPABASE_ANON_KEY`
as the key name.

On Vercel, two options (either works — **redeploy after changing variables**,
Vite embeds them at build time):

1. **Supabase marketplace integration** (recommended): Vercel → your project →
   Marketplace → Supabase → Connect. The integration provisions `SUPABASE_URL` /
   `SUPABASE_ANON_KEY` (no `VITE_` prefix) — `vite.config.js` mirrors those
   public values into the client bundle at build time, so nothing else is needed.
2. **Manual variables**: Vercel → Settings → Environment Variables → add
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for Production
   (and Preview if you want auth on preview deploys).

**These values are read at build time.** Vite inlines them into the bundle, so
adding a variable without rebuilding/redeploying changes nothing. Each target
needs its own copy:

| Where the site runs | Where to set the two values |
| --- | --- |
| Local `npm run dev` / Arena preview | `.env.local` at the repo root (never committed) |
| Vercel | Settings → Environment Variables, or the Supabase marketplace integration |
| GitHub Pages (`.github/workflows/deploy.yml`) | Settings → Secrets and variables → Actions → **Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |

Repository *variables* (not secrets) are enough for Pages: both values are
public by design — they ship inside the client bundle. The workflow accepts the
`SUPABASE_URL` / `SUPABASE_ANON_KEY` names too. When they are absent, the build
still deploys but `/auth` stays in demo-preview mode, and the workflow logs a
warning (`Supabase non configuré`).

If a variable is missing, `/auth` shows exactly which one under the form.

### Troubleshooting

| Symptom on `/auth` | Cause | Fix |
| --- | --- | --- |
| “Supabase authentication is not configured … Missing configuration: …” | The values were absent **at build time** for that deployment | Add them for that host (table above) and redeploy — this is what the GitHub Pages mirror showed before the workflow passed them |
| “Unable to reach the Supabase server (…supabase.co) — Failed to fetch” | Wrong project URL/key, or the project is paused (free projects pause after a week of inactivity) | Check Settings → API, restore the project in the Supabase dashboard |
| “Your email address is not confirmed yet” | Authentication → Sign Up → *Confirm email* is ON, and the confirmation mail never arrived | Configure a custom SMTP provider (Authentication → Emails) or turn *Confirm email* off |
| Signup answers “check your inbox” but no mail ever arrives, or “Too many attempts” | Supabase's built-in mailer is for testing only (≈2–4 mails/hour, restricted recipients) | Connect Resend/SendGrid/… under Authentication → Emails |
| Google / Microsoft returns to the site without a session | The redirect target is not whitelisted | Authentication → URL Configuration: Site URL = the deployed domain, Redirect URLs = `https://<domain>/**` |
| “Unsupported provider: provider is not enabled” after clicking Google / Microsoft | That provider is disabled in the Supabase project (`google` / `azure` show up as `false` in `/auth/v1/settings`) | Authentication → Sign In / Up → enable Google / Azure, or hide the buttons |
| Sign-in works on Vercel but not on the Pages mirror | Pages has no Supabase variables | See the table above |

### Supabase dashboard checklist

1. **Database**: run `supabase/schema.sql` once in Dashboard → SQL Editor. It
   creates the `profiles` table (RLS enabled) and a trigger that inserts a
   profile row — with the gamertag chosen at registration — for every new user.
2. **URLs**: Dashboard → Authentication → URL Configuration →
   - Site URL: `https://<your-domain>` (your Vercel domain),
   - Redirect URLs: add `https://<your-domain>/**` (covers `/auth`, where
     email confirmation, OAuth and password-recovery links land) **and** the
     Pages mirror if you use it:
     `https://salimb-source.github.io/Let-s-Play/**`.
   - The Supabase → Vercel integration keeps these redirect URIs in sync
     automatically, including preview deployments.
3. **Email confirmation** (optional): Authentication → Sign Up → Confirm email
   is ON by default — new accounts receive a confirmation link plus a resend
   button. Turn it OFF and signups log in immediately; both flows are handled.
4. **Google / Microsoft buttons** (optional): Authentication → Sign In / Up →
   enable the Google and Azure providers with your OAuth client IDs/secrets
   (the app uses provider keys `google` and `azure`).

The SPA fallback in `vercel.json` keeps deep links such as `/auth` working on
Vercel (the `/api/*` serverless routes are excluded from the rewrite).

## Live YouTube

La page d’accueil contient un lecteur live YouTube permanent basé sur l’ID de la
chaîne. Copiez `.env.example` vers `.env.local` si nécessaire et vérifiez
`VITE_YOUTUBE_CHANNEL_ID`. Pour Let’s Play Official, l’ID est
`UCBi989OGXiGBjvB17Xh5GUQ`.

Cette intégration fonctionne sur un hébergement statique, sans Vercel, sans clé API
et sans backend. YouTube résout automatiquement l’URL vers le direct public actif.
Quand la chaîne n’est pas en direct, le lecteur YouTube affiche son état hors ligne.


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

## Miniatures YouTube : aucune carte sans image

YouTube ne publie pas toutes les qualités de miniature pour toutes les vidéos.
`maxresdefault.jpg` (1280×720) n'existe que si la vidéo a été traitée en HD —
sinon l'URL répond **404** et la carte reste vide. C'était le cas du FreeFire
Algerian Championship 2023 (`twbaM8fiXpo`), épisode partenaire Ooredoo de
l'accueil :

| URL | Réponse |
| --- | --- |
| `https://i.ytimg.com/vi/twbaM8fiXpo/maxresdefault.jpg` | 404 |
| `https://i.ytimg.com/vi/twbaM8fiXpo/hqdefault.jpg` | 200 · JPEG 480×360 |

### La règle

Tout passe par `src/lib/videoThumbnails.js`, seul endroit du site qui écrit une
URL de miniature :

- `youTubeThumbUrl(id, quality)` construit l'URL (alias `maxres`/`hd`, `sd`, `hq`) ;
- `thumbFallbackChain(id, { quality })` donne l'échelle à essayer, de la
  meilleure qualité vers la plus sûre : `maxresdefault → sddefault → hqdefault`,
  le dernier barreau étant toujours publié par YouTube ;
- `VIDEOS_WITHOUT_HD_THUMB` liste les vidéos dont YouTube ne publie aucune
  miniature HD. **Ajouter un identifiant ici suffit** : la chaîne démarre alors
  à `hqdefault`, aucune requête n'est envoyée vers un 404 connu. `twbaM8fiXpo`
  y figure déjà, avec la trace de la mesure ;
- `createThumbFallback()` pilote le repli (position dans l'échelle, échec final)
  et `isThumbMissing()` reconnaît une image « chargée mais vide ».

L'afficheur est `src/components/VideoThumb.jsx` : il descend l'échelle et, si
aucune qualité ne répond, dessine un cadre Let's Play (`.video-thumb-fallback`)
à la place de l'image — la grille ne présente jamais de trou. Le repli passe par
deux chemins, parce qu'un seul ne suffit pas : `onError`, puis `isThumbMissing()`
après chaque rendu — un 404 servi depuis le cache du navigateur peut se régler
avant que React n'attache l'écouteur, et l'événement `error` est alors perdu.

```jsx
<VideoThumb className="featured-dossier-thumb" id={ep.id} alt={ep.title} />
<VideoThumb id="A2VPhWOUMHI" alt="25 ans de PlayStation 2" quality="hq" />
```

`quality` fixe la qualité de départ (les cartes de `/dossiers` restent en
`hqdefault`, comme avant) ; sans elle, le composant demande la meilleure
qualité disponible pour cette vidéo.

### Vérification

- `npm run check:thumbs` — l'échelle des qualités et son dernier barreau, le
  pilote rejoué avec une image simulée (chaque qualité manquante fait descendre
  d'un cran, la dernière bascule sur le cadre de repli, aucune requête vers un
  404 connu), le **rendu réel des pages** en SSR (accueil : trois vignettes,
  `twbaM8fiXpo` en `hqdefault`, HicoSoft toujours en `maxresdefault` ; dossiers :
  huit vignettes), et la source du site (aucune URL de miniature codée en dur
  hors de `src/lib/videoThumbnails.js`, les deux chemins du repli présents).

## Sources éditoriales

- [Instagram @letsplay.officiel](https://www.instagram.com/letsplay.officiel/)
- [YouTube Let’s Play Official](https://www.youtube.com/@letsplay.officiel)
- [Games & Comic Con Dzaïr](https://www.gccdz.com/)
- [Algérie Télécom](https://www.algerietelecom.dz/) · [IdOOM Market](https://idoom-market.com.dz/fr)
- [TCL](https://www.tcl.com/)
