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
- Succès du joueur dans le profil (`/auth`) : 42 succès débloqués par les
  actions réalisées sur le site, classés en quatre grades de difficulté — bronze,
  argent, or, platine — avec niveau, XP, grades visibles et notifications de
  déblocage (voir « Succès débloqués par les actions du site »)
- Quizz gaming & quizz du jour (`/quizz`, alias `/quiz` et `/quizzes`) :
  huit quizz rédigés par la rédaction (culture générale, rétro, souls-like,
  RPG, e-sport, studios, tech et cinéma), quizz du jour en rotation quotidienne avec série de
  jours, corrections commentées, commentaires, recherche et cinq succès
  dédiés (voir « Quizz gaming & quizz du jour »)
- Amis : demandes d'ami depuis les profils publics, les commentaires et le hub ;
  liste d'amis **en ligne / hors ligne** dans la fenêtre sociale en bas à
  droite, pour tout joueur connecté (voir « Amis : demandes, liste et
  présence »)
- Messagerie : discussions **1-à-1 entre amis** en texte et en temps réel, avec
  **non-lus**, accusé de lecture, **blocage** et **signalement**, dans la même
  fenêtre sociale (voir « Messagerie : discussions 1-à-1 entre amis »)
- Amis + messagerie dans la **même fenêtre** : un seul lanceur « MESSAGERIE »
  (pastilles des non-lus et des demandes en attente, amis en ligne) ouvre un
  panneau à quatre onglets — Amis / Demandes / Ajouter / Messages ; sur mobile
  (≤ 760 px), la messagerie s'ouvre sur une **vraie page** (`/messages`) et la
  fenêtre ne concerne plus que les amis (pop-up plein écran)

Les visuels des cartes vidéo utilisent les miniatures publiques YouTube des épisodes correspondants
(voir « Miniatures YouTube » plus bas : aucune carte ne reste sans image).

## Player accounts & authentication (Supabase)

Registration, login, Google / Microsoft (Azure) sign-in, password reset and the
connected player hub (`/auth`) run on [Supabase Auth](https://supabase.com/auth)
(`@supabase/supabase-js`, client in `src/lib/supabase.js`, session in
`src/auth/AuthContext.jsx`). The navigation bar shows two separate buttons,
**Log in** and **Register** (highlighted), instead of the single « Join » link,
and `/auth` explains what is missing when Supabase is not configured — or the
visitor is offline.

Each button opens its own form: they are links to `/auth?mode=signin` and
`/auth?mode=signup`, and the page reads that `?mode=` parameter
(`readAuthMode` in `src/pages/Auth.jsx`) — **Register** therefore lands on the
register form (gamertag + password confirmation), never on the log-in one. The
`/register` shortcut passes `initialMode="signup"` and wins over the query
string, `state.mode` (links coming from the comment section) wins over both,
and while the pop-up is already open the form follows the address bar, so
clicking the other button switches forms instead of doing nothing. Values other
than `signin` / `signup` (or no parameter at all) fall back to log-in.

The one-click demo accounts (`VORTEX_DZ`, `PIXEL_QUEEN`) are **no longer shipped**:
`src/auth/demoProfiles.js` exports an empty registry, so the demo card on `/auth`
never renders and no visitor can borrow a fake identity. Everything the demo
preview used to exercise (friends dock, messaging, achievements hub) is still in
the codebase but dormant; the verification scripts re-activate it with the
fixtures in `scripts/demoFixtures.js` (see « Personas de démonstration » below).

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

1. **Database**: run `supabase/schema.sql` once in Dashboard → SQL Editor:
   paste the **whole** file and hit Run. It creates the `profiles` table (RLS
   enabled) and a trigger that inserts a profile row — with the gamertag chosen
   at registration — for every new user, plus the `comments` table behind the
   article comment section (see below), the `friendships` table behind the
   friends list (see « Amis : demandes, liste et présence ») and the
   `direct_messages` / `message_blocks` / `message_reports` tables behind the
   1-à-1 messaging (see « Messagerie : discussions 1-à-1 entre amis »). The
   script is idempotent: re-run it after pulling a newer version.
   The SQL Editor wraps the file in **one transaction**, so a single error used
   to roll everything back — and the script looks like it ran while nothing was
   created. It is therefore guarded: steps that depend on Supabase-internal
   objects (`auth.users`, the `anon` / `authenticated` roles) report a
   `WARNING` and let the rest apply. Read the output of the Run:
   - `WARNING … trigger sur auth.users refusé` → the profile trigger was
     skipped (profiles are then only created by the app's own flow); comments
     are unaffected because the author is read from the account metadata.
   - The last query is a control table — every line must read `OK`. If a line
     reads `MANQUANT`, the WARNING(s) above say why. The script also installs
     the `public.delete_my_account()` security-definer function used by the
     password-confirmed delete-account action on the profile hub; do not grant
     clients direct access to `auth.users`.
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

### Article comments

Every article page (`/news/*`, `/reviews/*`) ends with a comment section
(`src/components/Comments.jsx`, data layer in `src/lib/comments.js`) backed by
the `public.comments` table from `supabase/schema.sql`:

- **Reading** is public: visitors see the thread (newest first, 100 max) and a
  “sign in to comment” call to action that brings them back to the article
  (`#comments`) once signed in — including after an OAuth round trip (the target survives the
  full-page return).
- **Posting** requires a Supabase session. The client only sends the article
  route and the text; a `before insert` trigger stamps `user_id`, the author
  name (gamertag chosen on `/auth`, then profile, then e-mail) and the avatar
  server-side, so nobody can post under another name. Row Level Security lets
  players insert only as themselves and delete only their own comments.
- **Guard rails**: 1–1000 characters (enforced in the UI and by a check
  constraint), 5 comments per player per minute (trigger), comments are removed
  with the account (`on delete cascade`).
- **Demo profiles** (`/auth` → demo preview, no Supabase session) keep their
  comments in `localStorage` on that device only, flagged “DEMO” in the feed.

Threads are keyed by the article route (e.g. `/news/physint`), which is the
same on Vercel and on the GitHub Pages mirror. Nothing else to configure once
the SQL has been run; the section explains itself when something is off:

| Message in the comment section | Cause | Fix |
| --- | --- | --- |
| “Comments are not enabled on this deployment yet (the comments table is missing, or the API cache has not reloaded) — …” | The SQL was never run on the project this build points to | Dashboard → SQL Editor → paste **the whole** `supabase/schema.sql` and Run; the control table at the end must show `OK` on every line |
| Same message although the SQL was run | The file was run on another project, or only part of it was pasted | Check `VITE_SUPABASE_URL` points to the project where you ran it, and that the SQL Editor showed the control table |
| `WARNING Let's Play : ce rôle n'a pas le droit de créer un trigger sur auth.users` | `auth.users` belongs to Supabase; on some projects the SQL Editor role may not attach a trigger to it | Not blocking: `comments` and the rest of the script are applied. Profile rows then stay uncreated until the trigger can be attached |
| A line of the control table reads `MANQUANT` | That object is missing — see the WARNING above it | Re-run the file (it is idempotent) and read the warnings |
| “Your session has expired — sign in again to comment.” | The stored session is no longer valid | Sign out / in on `/auth` |
| “Easy there — wait a moment before posting again.” | More than 5 comments in one minute | Wait a minute |
| Sign-in gate although the site is deployed | Supabase variables missing at build time | See the environment-variable table above |

## Amis : demandes, liste et présence

Tout joueur connecté (compte Supabase — ou persona de démonstration dans les
scripts de vérification) dispose d'une liste d'amis. Elle vit dans la **fenêtre sociale** en bas à droite,
présente sur toutes les pages : un lanceur compact « MESSAGERIE » — avec les
pastilles des **non-lus** (messagerie) et des **demandes en attente**, et le
compteur d'amis en ligne — ouvre un panneau à **quatre onglets** (Amis /
Demandes / Ajouter / Messages). Amis et messagerie partagent donc la même
fenêtre ; le quatrième onglet est documenté plus bas. Un visiteur non connecté
ne voit rien.

| Onglet | Ce qui s'y trouve |
| --- | --- |
| **Amis** | les amis **en ligne** d'abord (point vert, « EN LIGNE »), puis **hors ligne** (avatar grisé, « Vu il y a 2 h »), chacun avec son niveau ; **la photo ou le nom ouvre la discussion** avec lui, le bouton **« Profil »** bien visible mène à sa fiche, et « Retirer » enlève l'ami (confirmation) |
| **Demandes** | les demandes **reçues** (Accepter / Refuser) et **envoyées** (Annuler) |
| **Ajouter** | recherche d'un joueur par pseudo (2 caractères minimum), demande en un clic |
| **Messages** | la messagerie 1-à-1 : liste des discussions puis fil (voir plus bas) |

L'état ouvert/fermé est mémorisé sur l'appareil ; Échap ferme le panneau. Les
notifications de succès partagent le coin : elles montent au-dessus du lanceur,
et glissent à côté du panneau quand il est ouvert.

**Sur mobile** (≤ 760 px), la fenêtre ouverte devient un **pop-up plein
écran** : elle couvre tout l'écran (au-dessus de la navigation), l'arrière-plan
ne défile plus, et la fermeture se fait par le bouton « × » de l'en-tête
(`src/social/social.css`). Elle ne concerne plus que les **amis** : l'onglet
« Messages » — comme toute ouverture de discussion — bascule vers la **page de
messagerie** `/messages` (voir plus bas), où la fenêtre s'efface entièrement.

**Où envoyer une demande d'ami** (`src/friends/FriendButton.jsx`) :

- sur un **profil public** (`/profile/:id`) : bouton principal « Ajouter en
  ami », qui devient « Demande envoyée · Annuler », « Accepter / Refuser »
  (si ce joueur nous a écrit en premier) puis « Amis · Retirer » ; le badge du
  profil annonce aussi **EN LIGNE / HORS LIGNE** ;
- dans le **fil de commentaires** : une petite icône « + » à côté du pseudo de
  chaque auteur (✓ quand c'est déjà un ami, ⏱ quand la demande est partie) ;
- dans l'onglet **Ajouter** de la fenêtre sociale (lanceur en bas à droite) :
  recherche par pseudo, demande en un clic.

**Dans le hub joueur** (`/auth`), la section « **Mes amis** » n'affiche que la
liste : un ami par ligne — avatar avec son point de présence, « EN LIGNE » ou
« Vu il y a 2 h », niveau — et **toute la ligne mène à son profil**. Six amis en
aperçu, puis un bouton « Voir tous mes amis ». Aucun geste ici (ni demande, ni
discussion) : ils restent dans la fenêtre sociale. Un visiteur, ou une page
montée sans le provider des amis, ne rend rien du tout.

Un visiteur qui clique sur « Se connecter pour ajouter des amis » est renvoyé
sur la page où il était une fois connecté.

### Comptes Supabase

Les relations vivent dans `public.friendships` (`supabase/schema.sql`,
étape 3d) : une ligne par paire de joueurs, `status = 'pending'` tant que le
destinataire n'a pas répondu, `'accepted'` ensuite ; refuser, annuler ou
retirer un ami **supprime** la ligne. Un index unique sur la paire ordonnée
interdit deux lignes A→B et B→A. Row Level Security : chaque joueur ne voit que
les relations dont il fait partie, n'envoie des demandes qu'en son nom
(`requester_id` forcé côté serveur), ne répond qu'à celles qu'il a reçues et ne
supprime que les siennes. Envoyer une demande à quelqu'un qui nous avait déjà
écrit **accepte sa demande** au lieu d'en créer une seconde (trigger
`prepare_friendship`).

Le statut en ligne croise deux signaux (`src/friends/presence.js`) :

1. **Supabase Realtime Presence** — chaque joueur connecté rejoint le canal
   `letsplay-presence` ; les entrées et sorties arrivent en direct. Aucune table
   à créer, il suffit que Realtime soit actif sur le projet (c'est le cas par
   défaut).
2. **Battement de cœur** — `profiles.last_seen_at` est rafraîchi toutes les
   90 secondes ; un joueur vu il y a moins de 3 minutes est considéré en ligne
   même si Realtime est indisponible, et « Vu il y a… » s'affiche pour les amis
   hors ligne. Le battement crée aussi la ligne `profiles` d'un compte qui n'en
   aurait pas (trigger d'inscription refusé sur le projet), ce qui le rend
   trouvable dans l'onglet « Ajouter ».

La liste se recharge quand `friendships` change (Realtime `postgres_changes`,
la table est ajoutée à la publication `supabase_realtime` par le script), toutes
les minutes en secours, et au retour sur l'onglet. Pseudos, avatars et niveaux
viennent de `public.profiles` (lecture publique) ; la recherche interroge
`username` / `display_name` (`ilike`).

Rien d'autre à configurer une fois le SQL relancé — le tableau de contrôle en
fin de script doit afficher `OK` pour `table public.friendships`, `politiques
RLS friendships (4)`, `trigger demande d'ami` et `presence
profiles.last_seen_at` ; `realtime friendships` peut rester `ABSENT` (la fenêtre
se rafraîchit alors toutes les minutes). Tant que la table manque, la fenêtre
et les boutons l'expliquent (« Les amis ne sont pas encore activés sur ce
déploiement… ») sans rien casser d'autre.

### Personas de démonstration (devenues fixtures de test)

Les comptes de démonstration ne sont **plus proposés aux visiteurs** :
`src/auth/demoProfiles.js` livre un registre vide, la carte « Explorer le compte
démo » de `/auth` ne s'affiche donc jamais. Les deux personas (`VORTEX_DZ`,
`PIXEL_QUEEN`) survivent comme **fixtures** dans `scripts/demoFixtures.js`, que
les entrées SSR (`scripts/*-smoke.jsx`) réinjectent dans le registre au
démarrage des vérifications — sans elles, le dock social ne pourrait pas être
testé du tout, puisqu'il n'y a aucun backend dans les scripts.

Une persona réinjectée évolue dans une **communauté scriptée**
(`src/friends/demoRoster.js`) : dix joueurs avec des statuts de présence
déterministes — toujours en ligne, toujours hors ligne, ou alternant toutes les
quelques minutes pour que la liste bouge. Chaque persona démarre avec des amis en
ligne et hors ligne, des demandes reçues et une demande envoyée ; l'état est
enregistré dans `localStorage` (par persona, par appareil) et les joueurs
« en ligne » acceptent d'eux-mêmes une demande après quelques secondes. Les
fiches de ces joueurs (`/profile/demo-player-…`) sont rendues comme des profils
publics.

La communauté est calculée **à la demande** (`demoCommunity()`), jamais au
chargement du module : c'est ce qui permet au registre d'être vide en production
et semé plus tard par les fixtures. Une version précédente la figeait au
chargement et lisait `DEMO_PROFILES.vortex.user_metadata` — registre vide, donc
`TypeError` à l'import, donc **écran blanc sur tout le site**.

### Où vit le code

| Fichier | Rôle |
| --- | --- |
| `src/friends/FriendsContext.jsx` | le contexte : amis / demandes / présence du joueur connecté, gestes (`sendRequest`, `accept`, `decline`, `cancel`, `unfriend`, `search`), et l'état de la **fenêtre sociale unifiée** (`dockOpen`, `dockTab` — l'onglet actif, `messages` inclus) ; inerte sans provider (SSR des scripts) |
| `src/friends/friendsApi.js` | couche de données : requêtes `friendships` / `profiles`, replis quand une colonne ou la table manque, état des personas |
| `src/friends/presence.js` | canal Realtime Presence + battement de cœur |
| `src/friends/FriendsTabs.jsx` | les onglets Amis / Demandes / Ajouter de la fenêtre sociale |
| `src/friends/FriendButton.jsx` | le bouton de demande d'ami (profil, commentaires, résultats de recherche) |
| `src/friends/FriendsHubSection.jsx` | la section « Mes amis » du hub : la liste des amis, chaque ligne menant à son profil |
| `src/friends/friendsCopy.js` | textes FR / EN / AR |
| `src/auth/demoProfiles.js` | registre des personas : **vide** dans le bundle livré, `registerDemoProfiles()` pour les scripts |
| `scripts/demoFixtures.js` | les deux personas en fixtures de test, semées par les entrées SSR |
| `src/friends/friends.css` | styles des onglets (listes, avatars, boutons) |
| `src/social/SocialDock.jsx` | la fenêtre sociale unifiée : un lanceur, un panneau à quatre onglets ; sur mobile, la messagerie part vers la page dédiée |
| `src/social/socialCopy.js` | textes de la fenêtre (FR / EN / AR) |
| `src/social/social.css` | position du lanceur/panneau, cohabitation avec les notifications, pop-up plein écran mobile (amis) |

### Vérifications

- `npm run check:friends` — logique pure (lignes `friendships` → relations
  vues par le joueur, gestes de démonstration sans doublon, présence scriptée
  déterministe avec des amis en ligne **et** hors ligne, recherche nettoyée
  pour PostgREST), cohérence de la communauté de démonstration (joueurs
  existants, jamais soi-même, textes complets dans les trois langues), puis
  rendu SSR du hub, de la fenêtre (fermée / ouverte) et d'un profil public —
  visiteur et persona — dans les trois langues.
- `npm run check:i18n` et `npm run check:achievements` continuent de rendre les
  pages sans le provider des amis : le contexte par défaut est inerte.

## Messagerie : discussions 1-à-1 entre amis

Tout joueur connecté (compte Supabase — ou persona de démonstration dans les
scripts de vérification) peut écrire à **ses amis** — et seulement à eux.

**Deux parcours** : sur **bureau**, la messagerie vit dans l'onglet
**Messages** de la **fenêtre sociale** (en bas à droite, documentée dans la
section amis) — la pastille jaune du lanceur compte les non-lus, et
`openThread` rouvre la fenêtre sur cet onglet. Sur **mobile** (≤ 760 px), elle
est une **vraie page** : `/messages` (alias `/messagerie`) pour la liste,
`/messages/:peerId` pour une discussion — un écran plein, de grandes zones
d'appui, le champ toujours à portée de pouce ; tous les points d'entrée
(bouton « Message » d'un profil, photo ou nom d'un ami dans la fenêtre
sociale) y naviguent.
La page existe aussi sur bureau, en deux colonnes. Sur la page, **la photo ou
le nom d'un interlocuteur ouvre la discussion** (jamais son profil : le
bouton « Profil » de l'en-tête de discussion y mène), et dans la liste d'amis
de la fenêtre, la photo/le nom d'un ami ouvre le chat tandis que le bouton
**« Profil »** bien visible remplace l'ancienne icône « Message ».
Un visiteur non connecté ne voit rien (carte de connexion sur la page).

| Niveau | Ce qui s'y trouve |
| --- | --- |
| **Liste des discussions** | un ami par ligne : avatar et point de présence, dernier message, « il y a 5 min », badge des non-lus ; puis les **amis sans discussion** (« ÉCRIRE À UN AMI ») et les **joueurs bloqués** (à débloquer) ; un champ filtre les amis par pseudo |
| **Discussion** | le fil de bulles (les miennes à droite, avec **Vu** quand l'ami a ouvert), le statut de l'ami, le champ de saisie (Entrée pour envoyer, Maj + Entrée pour un saut de ligne, 1 000 caractères), et dans l'en-tête les gestes **Bloquer** et **Signaler** ; la discussion ouverte prend tout le panneau, l'icône « back » revient à la liste |

L'état ouvert/fermé et la discussion en cours sont mémorisés sur l'appareil ;
Échap remonte à la liste puis ferme la fenêtre.

**Où écrire à un ami** :

- le bouton **« Message »** d'un profil public (`/profile/:id`), à côté du
  bouton « Ajouter en ami » — grisé avec l'explication « Deviens ami avec ce
  joueur pour lui écrire » tant que l'amitié n'est pas acceptée, avec le
  nombre de non-lus en pastille sinon ;
- la **photo ou le nom** de chaque ami (onglet Amis de la fenêtre sociale) :
  le geste ouvre directement la discussion avec lui ;
- le **lanceur de la fenêtre sociale** (en bas à droite), qui rouvre la liste
  des discussions — et sur mobile la page `/messages`, plein écran.

Le **hub joueur** (`/auth`) ne porte plus aucun raccourci de messagerie : sa
section sociale se limite à la liste d'amis (chaque ligne mène au profil du
joueur). La messagerie reste la fenêtre sociale (bureau) et la page
`/messages` (mobile et bureau).

### Comptes Supabase

Les messages vivent dans `public.direct_messages` (`supabase/schema.sql`,
étape 3e) : une ligne par message, `conversation_key` = les deux identifiants
triés et séparés par `_` (les deux sens d'un échange partagent la même clé),
`read_at` à NULL tant que le destinataire n'a pas ouvert la discussion — c'est
ce qui compte les **non-lus**. Un trigger (`prepare_direct_message`) impose
côté serveur : expéditeur = joueur connecté, **amitié `accepted` obligatoire**,
aucun blocage entre les deux joueurs, message non vide et ≤ 1 000 caractères,
20 messages par minute au plus. Un second trigger
(`restrict_direct_message_update`) fait en sorte qu'une mise à jour ne puisse
**que** poser `read_at` (accusé de lecture) : ni le texte, ni l'expéditeur, ni
l'horodatage ne peuvent être modifiés, et un message lu ne redevient jamais
non-lu. Row Level Security : un joueur ne lit que ses propres échanges et
n'écrit qu'en son nom.

- **Temps réel** — la fenêtre écoute `direct_messages` sur deux canaux
  Realtime : `recipient_id = moi` pour les messages reçus (le badge des
  non-lus bouge tout de suite, quelle que soit la discussion ouverte) et
  `conversation_key = <clé>` pour la discussion en cours (messages de l'ami +
  accusés de lecture). Toutes les minutes en secours, et au retour sur
  l'onglet.
- **Bloquer** — `public.message_blocks` : qui bloque qui. Un joueur ne voit
  que **ses** blocages (jamais qui l'a bloqué). Bloquer coupe l'écriture dans
  les deux sens (vérifié par le trigger) et retire la discussion de la liste ;
  elle réapparaît dans la section « BLOQUÉS », avec « Débloquer ». Le joueur
  bloqué ne reçoit aucun message d'erreur explicite (« Ce joueur ne reçoit pas
  tes messages »).
- **Signaler** — `public.message_reports` : motif (harcèlement, spam, propos
  haineux, contenu inapproprié, autre), détail facultatif et identifiant du
  dernier message reçu. Un seul signalement par joueur signalé (le second met
  à jour le motif) ; le bouton passe à « Signalé ».

Rien d'autre à configurer une fois le SQL relancé — le tableau de contrôle en
fin de script doit afficher `OK` pour `table public.direct_messages`,
`politiques RLS direct_messages (3)`, `trigger message 1-à-1`, `trigger accusé
de lecture seul modifiable`, `tables blocages / signalements` et `politiques
RLS blocages (3) / signalements (2)` ; `realtime direct_messages` peut rester
`ABSENT` (la messagerie se rafraîchit alors toutes les minutes). Tant que la
table manque, la fenêtre l'explique (« La messagerie n'est pas encore activée
sur ce déploiement… ») sans rien casser d'autre.

### Personas de démonstration (fixtures de test)

Comme pour les amis, les personas ne sont plus livrées : `check:messages` les
réinjecte depuis `scripts/demoFixtures.js`. Une persona ainsi semée retrouve des
**discussions scriptées** (`src/messages/demoThreads.js`) avec des amis de la
communauté de démonstration : des messages non lus à traiter, des discussions
déjà lues, des réponses automatiques des joueurs « en ligne » (quelques
secondes après l'envoi) et des messages qui arrivent tout seuls au fil des
minutes pour montrer le badge des non-lus. Tout est déterministe et enregistré
dans `localStorage` (par persona, par appareil) ; bloquer un joueur arrête ses
réponses, et un signalement y est enregistré comme sur un vrai compte.

### Où vit le code

| Fichier | Rôle |
| --- | --- |
| `src/messages/MessagesContext.jsx` | le contexte : discussions / non-lus / blocages / signalements du joueur connecté, gestes (`openThread`, `openInbox`, `viewThread`, `send`, `markRead`, `block`, `unblock`, `report`), canaux temps réel ; `openThread` / `openInbox` ouvrent la **fenêtre sociale** sur l'onglet « Messages » sur bureau, et **naviguent vers la page `/messages`** sur mobile (l'onglet actif est porté par le contexte des amis) ; inerte sans provider (SSR des scripts) |
| `src/messages/messagesApi.js` | couche de données : requêtes `direct_messages` / `message_blocks` / `message_reports`, lignes → discussions, non-lus, repli quand la table manque, état des personas |
| `src/messages/demoThreads.js` | discussions de départ, réponses scriptées et messages entrants de l'aperçu démo |
| `src/messages/MessagesTabs.jsx` | les vues de messagerie (fenêtre sociale **et** page dédiée) : liste des discussions, fil avec séparateurs de jour, champ de saisie, accès « Profil », bloquer / signaler |
| `src/messages/MessagesPage.jsx` | la **page de messagerie** `/messages` + `/messages/:peerId` (alias `/messagerie`) : plein écran sur mobile, deux colonnes sur bureau |
| `src/messages/MessageButton.jsx` | le bouton « Message » des profils publics (ouvre le chat) |
| `src/messages/messagesCopy.js` | textes FR / EN / AR |
| `src/messages/messages.css` | styles (liste, bulles, signalement, page `/messages`) |

### Vérifications

- `npm run check:messages` — logique pure (lignes `direct_messages` →
  discussions : les deux sens regroupés, fil retrié, non-lus comptés, accusé de
  lecture, messages reçus en direct sans doublon ; clés de conversation
  symétriques ; saisie nettoyée et bornée ; erreurs du trigger reconnues),
  cohérence de l'aperçu de démonstration (discussions entre **amis**
  existants, jamais soi-même, non-lus et discussions lues, réponses
  déterministes, messages scriptés livrés une seule fois, blocage /
  signalement réversibles, textes complets dans les trois langues), puis rendu
  SSR du hub, de la fenêtre (fermée / liste / discussion ouverte) et de profils
  publics — visiteur, ami et non-ami — dans les trois langues.
- `npm run check:friends`, `npm run check:i18n` et `npm run check:achievements`
  continuent de passer : amis et messagerie partagent la même fenêtre sociale
  (un seul lanceur, quatre onglets ; sur mobile, la messagerie ouvre la page
  `/messages` et le pop-up reste pour les amis), et les contextes par défaut
  sont inertes.

## Succès débloqués par les actions du site

Le site récompense ce que le joueur fait réellement : lire un article, lancer
un épisode, commenter, chercher, explorer une nouvelle section, revenir
plusieurs jours de suite, créer un compte ou associer un fournisseur de
connexion. **42 succès** sont livrés, répartis en sept familles (premiers pas,
lecture, vidéo, communauté, fidélité, compte, quizz) et quatre **grades** de difficulté ;
chacun donne de l'XP, qui construit le niveau et le rang du joueur.

### Grades : bronze, argent, or, platine

Le grade (`rarity` dans le catalogue) résume la difficulté d'obtention, du plus
accessible au plus convoité. L'XP croît avec le grade (aucun succès bronze ne
rapporte plus qu'un succès argent, etc.), ce qui rend l'échelle lisible :

| Grade | Succès | XP | Exemples |
| --- | --- | --- | --- |
| 🥉 Bronze | 9 | 25–40 | premiers pas, première lecture, premier commentaire |
| 🥈 Argent | 11 | 60–90 | créer un compte, 5 articles, 3 jours de suite |
| 🥇 Or | 10 | 100–250 | 12 articles, semaine parfaite, trilingue, oiseau de nuit |
| 🏅 Platine | 7 | 400–800 | 30 articles, 14 jours d'affilée, 30 jours de visite, 15 commentaires, les 8 sections, 3 nuits de lecture après minuit |

Dans le profil `/auth`, la section « succès » compacte montre les succès
obtenus et les prochains objectifs. Elle ne répète ni le niveau, ni le rang, ni
la barre d'XP : tout cela vit dans la carte du joueur, juste au-dessus (un seul
bloc de progression par page). La **bulle d'information** d'une carte — la
description, la progression et l'XP — reste elle aussi toujours dans l'écran :
centrée sur la carte, elle est décalée juste ce qu'il faut quand la carte touche
un bord (mobile, dernières colonnes), et bascule **sous** la carte quand il n'y
a pas la place au-dessus. Chaque
carte porte son grade sous le nom, et le cadre des succès débloqués prend la
couleur du grade (bronze cuivré, argent, or, platine aux reflets irisés). La
notification de déblocage affiche aussi le grade du succès tombé. Il n’existe
pas de page « succès » séparée : le hub joueur est l’endroit unique où retrouver
cette progression.

Où ça se voit :

| Endroit | Ce qui s'y trouve |
| --- | --- |
| `/auth` (hub joueur) | la **barre d'XP du profil** (seul endroit où niveau, rang et progression sont affichés) et la section « succès » intégrée : succès obtenus et prochains objectifs |
| Toutes les pages | une **fenêtre de déblocage** au centre du site dès qu'un succès tombe : icône, nom, description, rareté, XP gagnés — et « NIVEAU N ATTEINT » quand les points font monter d'un rang |
| Navigation et pied de page | l’accès au profil joueur, qui contient les succès |

Le niveau et l'XP ne sont jamais stockés côté compte : ils se déduisent des
succès débloqués (`totalXp` puis `levelFromXp`, dans
`src/achievements/engine.js`). La barre d'XP de la carte profil du hub
(`src/pages/Auth.jsx`) est la **seule** à afficher la progression : elle lit le
`summary` du moteur, comme la carte de niveau qui vivait avant dans la section
« succès » — cette dernière n'en garde plus de copie, pour ne pas montrer deux
fois le même niveau. Les métadonnées Supabase d'un compte réel ne portent ni XP
ni niveau (seule la progression des succès y est écrite) : les relire laissait
la barre principale à 0 % au lieu de suivre le moteur. Seules
les personas de démonstration — registre `src/auth/demoProfiles.js`, vide dans
le bundle livré, semé par `scripts/demoFixtures.js` pendant les vérifications —
affichent des chiffres scriptés, pour prévisualiser un hub rempli sans backend.

La fenêtre vit dans `src/achievements/AchievementPopup.jsx` et lit la file
`notifications` du contexte. Plusieurs succès d'affilée sont présentés **un par
un** (« 1 sur 3 », bouton « SUIVANT »), la file est plafonnée à quatre pour
qu'une rafale ne se transforme pas en séance de clics. Elle se ferme au clic,
avec Échap, par son bouton, ou toute seule après quelques secondes — le
minuteur est suspendu tant que la souris la survole, pour laisser le temps de
lire.

### Comment une action devient un succès

Trois étages, un seul chemin :

1. **l'action** est signalée par la page qui la vit (`track('comment_posted')`,
   `track('search_performed', { query })`, `track('profile_updated')`, …) ou
   automatiquement par `src/achievements/AchievementTracker.jsx`, monté une
   fois dans `Layout` : visite datée, langue utilisée, route ouverte (section
   + article lu, mémorisé par slug), session connectée (connexion, inscription,
   comptes tiers) et lecture d'une vidéo — annoncée par le coordinateur
   « une seule vidéo à la fois » (`VIDEO_PLAYED_EVENT`, aussi émis pour le
   direct) ;
2. **le moteur** (`src/achievements/engine.js`) applique l'action à l'état du
   joueur (compteurs, ensembles de contenus distincts, jours de visite, séries)
   puis débloque les succès dont la métrique atteint la cible ;
3. **le catalogue** (`src/achievements/catalog.js`) ne contient que des
   données : `{ id, icon, group, rarity, xp, metric, target, labels }`, les
   libellés étant donnés en FR / EN / AR.

| Action suivie | Métrique(s) alimentée(s) |
| --- | --- |
| `page_view` | `pagesVisited` |
| `visit` (une par jour) | `visitDays`, `bestStreak` |
| `article_read` (actu / test / dossier) | `articlesRead`, `newsRead`, `reviewsRead`, `dossiersRead`, `readAllKinds` (les trois familles), `nightReading` (entre 0 h et 5 h), `nightReadingDays` (nuits distinctes), `earlyReading` (entre 5 h et 8 h) |
| `section_visited` | `sectionsVisited`, `profileOpened` |
| `video_played` | `videosWatched`, `liveWatched` |
| `comment_posted` | `commentsPosted` |
| `search_performed` | `searchesPerformed`, `distinctSearches` |
| `language_used` | `languagesUsed` |
| `account_created` / `signed_in` | `accountsCreated`, `sessions` |
| `provider_linked` | `providersLinked` |
| `profile_updated` | `profileUpdates` |

### Ajouter un succès (ou une action)

Un succès pour une action déjà suivie = **une entrée** dans
`src/achievements/catalog.js` :

```js
{ id: 'dossier-fan', icon: '🗂️', group: 'reading', rarity: 'gold', xp: 90,
  metric: 'dossiersRead', target: 5,
  labels: {
    en: { name: 'Dossier fan', desc: 'Read 5 dossiers.' },
    fr: { name: 'Fan de dossiers', desc: 'Lis 5 dossiers.' },
    ar: { name: 'من عشاق الملفات', desc: 'اقرأ 5 ملفات.' },
  } }
```

Rien d'autre : la progression, les notifications, le compteur du hub et la
section « succès » du profil sont déduits du catalogue. Une **nouvelle action**
(un nouveau geste sur le site) ajoute d'abord un cas dans `reduce()` et une
métrique dans `METRICS` (`engine.js`), puis autant de succès que voulu.

Un succès ajouté plus tard profite aux joueurs existants : le catalogue est
réévalué au chargement (`evaluate()`), donc les actions déjà enregistrées
débloquent le nouvel objectif sans être rejouées.

### Où vit la progression

La progression appartient à **chaque joueur**, jamais à un appareil :

- **Visiteur (sans compte)** — `localStorage`, clé `letsplay_achievements_v1:guest` :
  le site statique fonctionne sans backend, un visiteur non connecté débloque
  déjà des succès, mais ils restent liés à cet appareil ;
- **Compte connecté** — table Supabase `public.player_progress` (une ligne par
  compte, protégée par RLS : chacun ne lit et n'écrit que sa ligne). C'est la
  **référence** : elle est chargée à la connexion, mise à jour après chaque
  action (écriture différée de 1,5 s pour les rafales), et sa lecture fait
  suivre le joueur d'un appareil à l'autre. Un cache local par compte
  (`letsplay_achievements_v1:u:<id>`) sert de filet hors ligne.
  Un compte **neuf démarre au niveau 1, sans aucun succès**, même sur un
  appareil où l'on a déjà joué : la progression locale de l'appareil n'est
  jamais publiée vers un compte, et deux comptes sur la même machine restent
  étanches ;
- **Ancien déploiement** (schéma SQL pas encore relancé) : repli transparent
  sur l'ancienne copie dans les métadonnées du compte, puis migration vers la
  table dès qu'elle existe. Les comptes créés avant cette mise à jour gardent
  leur progression (l'ancienne copie du compte est reprise à la première
  connexion) ;
- **Sessions de démonstration** (aperçu réactivé par les fixtures des scripts,
  plus atteint en production) : toujours locales — les liaisons Google /
  Microsoft y sont simulées et ne comptent donc pas comme un compte associé
  (ce succès se débloque avec un vrai compte).

Le niveau et l'XP publics du profil (affichés dans le fil de commentaires) sont
synchronisés avec la progression des succès par un trigger SQL
(`sync_profile_progress`).

Pour appliquer la migration : relancer `supabase/schema.sql` dans le SQL
Editor du projet Supabase (le script est relançable sans risque).

#### Comment vérifier que la progression serveur est active

1. Se connecter, débloquer un succès (par exemple lire un article), attendre
   quelques secondes (écriture différée), puis ouvrir les outils de
   développement → Application → Stockage local : la clé
   `letsplay_achievements_v1:u:<id>` (avec l'identifiant du compte) contient
   la progression ;
2. Dans Supabase → Table Editor → `player_progress` : une ligne existe pour
   ce compte, avec `updated_at` récent et les succès dans `state` ;
3. Ouvrir le site dans **un autre navigateur** (ou en navigation privée), s'y
   connecter avec le même compte : les succès et le niveau suivent — la copie
   serveur est bien la référence. Un compte neuf y démarre au niveau 1, même
   si l'autre navigateur a une progression invité.

### Vérifications

- `npm run check:achievements` — cinq niveaux : cohérence du catalogue
  (identifiants uniques, trois langues, métriques connues, cibles et XP
  valides) ; comportement du moteur (contenus distincts, lecture de nuit,
  séries de jours, fusion appareil ↔ compte, données corrompues, courbe de
  niveau, détection du passage de niveau) ; **scénario complet qui débloque les
  42 succès** (donc aucun succès inatteignable) ; rendu réel en SSR du panneau
  du profil joueur et du hub — en aperçu de démonstration **et avec un compte réellement
  connecté** (la barre d'XP du profil doit se remplir, être la seule de la
  page, et annoncer le niveau et le rang déduits du moteur), la **bulle
  d'information** d'une carte de succès montée dans jsdom avec une géométrie
  de téléphone (elle est décalée pour rester dans l'écran, et bascule sous la
  carte quand il n'y a pas la place au-dessus) — et
  de la **fenêtre de déblocage** (montée avec la file qu'un
  joueur verrait après une action : succès, rareté, XP, palier franchi,
  compteur de file, boîte de dialogue accessible, rien sans succès à fêter),
  plus la source du site (actions branchées, fenêtre montée dans `main.jsx`,
  plus aucun reste des anciennes notifications, un seul module écrit la
  progression locale).
- `npm run check:i18n` — les routes × FR / EN / AR, dont le hub joueur `/auth`.
- `npm run check:auth` — les deux boutons de compte de la navigation : lecture du
  `?mode=` (les deux boutons, `?mode=` vide ou inconnu, priorité de la prop
  `/register`), rendu SSR réel de chaque URL (quel formulaire s'ouvre : pseudo et
  confirmation côté inscription, « mot de passe oublié » côté connexion), liens de
  la navbar, et garde-fous de source pour que le mode initial continue de suivre
  l'URL — y compris quand le pop-up est déjà ouvert.

## Quizz gaming & quizz du jour

Nouvelle section éditoriale : `/quizz` (grille + quizz du jour) et
`/quizz/:slug` (partie, corrections, commentaires), alias anglais `/quiz` et
`/quizzes`. Le rendu se replie sur `fr` tant qu'une traduction `en`/`ar` manque,
mais la structure de données les accepte déjà.

- **Données** — `src/quizzesData.js` : huit quizz de huit questions (culture
  générale, rétro, souls-like, RPG, e-sport, studios, tech et cinéma), la
  plupart liés à un article maison (`source`). Ajouter un quizz =
  une entrée : la grille, la recherche (`searchIndex`), la rotation du jour et
  le succès « Tour complet » le prennent en compte (mettre à jour la cible du
  succès si le nombre de quizz change).
- **Miniatures** — chaque quizz a sa propre illustration 16/9
  (`image`, fabriquée par `quizThumbUrl(slug)` depuis
  `public/quizzes/<slug>.jpg`) : une par thème, à la charte du site. La carte de
  la grille, la bannière du quizz du jour et les résultats de recherche
  l'affichent. L'épisode lié (`videoId`) reste en repli : `VideoThumb` reçoit
  l'illustration en `lead` et ne descend l'échelle YouTube que si le fichier
  manque — aucune requête `i.ytimg.com` dans le cas nominal. Ajouter un
  quizz = déposer son illustration sous ce nom, `check:thumbs` le vérifie.
- **Moteur** — `src/quizzes/engine.js` (pur, sans React) : mélange déterministe
  par graine (le quizz du jour est le même pour tous), barème, paliers de
  résultat (`rookie` → `legend`), meilleure série de jours consécutifs.
- **Minuteur** — 15 secondes par question (`QUESTION_TIME`, mutable pour les
  tests) : une barre de décompte passe au rouge dans les 3 dernières secondes
  et, à zéro, la question avance sans réponse (comptée ratée, signalée
  « Temps écoulé » dans les corrections).
- **Quizz du jour** — rotation par journée locale sur le catalogue, bannière
  sur `/quizz` (avec compte à rebours « nouveau quizz dans… », horloge simulée
  `?at=` partagée avec les autres comptes à rebours) et bandeau d'accueil ;
  terminer le quizz du jour crédite un jour de série (succès platine
  « Semaine parfaite » = 7 jours d'affilée). Le meilleur score de l'appareil
  s'affiche sur chaque carte de la grille.
- **Succès** — l'action `quiz_completed` (`QuizPlayer`) alimente le moteur des
  succès : parties, quizz distincts, sans-faute, jours de série. Cinq succès
  au catalogue : Premier quizz (bronze), Rival trouvé (bronze, premier défi
  envoyé), Sans faute (argent), Tour complet (or), Semaine parfaite (platine).
  L'XP reste celle des succès, comme partout sur le site.
- **Révision des erreurs** — depuis l'écran de résultat, « Rejouer mes erreurs »
  ne rejoue que les questions ratées (tour d'entraînement : succès, record,
  série et classement ne bougent pas, vérifié par `check:quiz`).
- **Défi entre amis** — depuis l'écran de résultat, `QuizChallenge` envoie à
  un ami (messagerie 1-à-1 existante, mode démo ou Supabase) un message
  pré-rempli avec le score à battre ; sans compte ni backend, un message
  l'explique. Chaque défi crédite `quiz_challenge`.
- **Scores & classement** — `supabase/schema.sql` (section 8) : table
  `public.quiz_attempts` (meilleur score par compte et par quizz, bornes
  `0 ≤ score ≤ total` vérifiées côté serveur) + RPC `submit_quiz_attempt` et
  `get_quiz_leaderboard` (top 10 joint aux profils, ligne du joueur marquée
  `mine`), non exposées en direct (revoke). Le compte connecté envoie sa
  tentative à la fin de la partie (`src/quizzes/quizApi.js`) ; le visiteur
  garde son meilleur score sur l'appareil (`localStorage`, clé propre aux
  quizz). Sans backend, la section classement explique comment le débloquer.
  Après collage du schéma dans le Dashboard Supabase, le tableau de contrôle
  final affiche les lignes 31–33 « OK ».
- **Vérification** — `npm run check:quiz` : moteur (jour, mélange, barème,
  série, minuteur à 15 s), miniatures (une illustration distincte par quizz,
  demandée par les cartes rendues — aucune requête YouTube), partie complète
  8/8 jouée en jsdom avec la vraie pile de providers (succès crédités dans le
  stockage), grille rendue en FR/EN/AR. Le scénario de
  `check:achievements` débloque aussi les cinq succès quizz ; `check:i18n`
  rend les nouvelles routes dans les trois langues ; `check:thumbs` vérifie les
  fichiers livrés dans `public/quizzes/`.

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

Un lecteur qui démarre émet aussi `VIDEO_PLAYED_EVENT`
(`letsplay:video-played`, avec l'identifiant de la vidéo) : c'est ce que les
succès écoutent pour compter les vidéos lancées, direct compris
(`src/achievements/AchievementTracker.jsx`). L'événement ne change rien au
comportement de pause.

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
  et `isThumbMissing()` reconnaît une image « chargée mais vide » ; son option
  `lead` place une ou plusieurs sources **avant** l'échelle YouTube — c'est par
  là que passent les illustrations maison des quizz (`public/quizzes/`), dont
  l'épisode lié n'est alors qu'un repli.

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

```jsx
// Grille des quizz : l'illustration maison d'abord, l'épisode en repli.
<VideoThumb id={quiz.videoId} lead={quiz.image} alt={titre} quality="hq" />
```

### Vérification

- `npm run check:thumbs` — l'échelle des qualités et son dernier barreau, le
  pilote rejoué avec une image simulée (chaque qualité manquante fait descendre
  d'un cran, la dernière bascule sur le cadre de repli, aucune requête vers un
  404 connu, l'illustration locale essayée avant YouTube quand elle est passée
  en `lead`), le **rendu réel des pages** en SSR (accueil : trois vignettes,
  `twbaM8fiXpo` en `hqdefault`, HicoSoft toujours en `maxresdefault` ; dossiers :
  huit vignettes ; quizz : bannière du jour + huit cartes servies par
  `public/quizzes/`, chaque fichier livré et non tronqué), et la source du site
  (aucune URL de miniature codée en dur hors de `src/lib/videoThumbnails.js`,
  ni de chemin `public/quizzes/` hors de `src/quizzesData.js`, les deux chemins
  du repli présents).

## Robot actus du jour

La page Actus s’alimente toute seule : un robot (`scripts/news-bot/`) tourne
chaque matin via GitHub Actions (`.github/workflows/news-bot.yml`), va chercher
les news gaming sur les flux RSS des médias (FR + internationaux), sélectionne
les trois plus fortes de la fenêtre des 36 h — promos, guides, tests et patch
notes écartés, deux articles maximum par média — et les met en forme façon
Let’s Play : titre en deux temps, chapô, deux sections titrées, citation
d’analyse et encadré « À RETENIR », avec la source d’origine toujours citée
et liée.

- **Rédaction hybride** : si une clé d’IA est configurée (secrets
  `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY` ou `GEMINI_API_KEY`
  — une seule suffit, `NEWS_LLM_PROVIDER`/`NEWS_LLM_MODEL` pour affiner),
  l’article est écrit par le modèle avec le guide de style du site, à partir
  du texte de la source. Sans clé, le robot publie avec le gabarit extractif
  et reste alors sur les sources francophones (il ne traduit pas). En cas de
  panne du modèle, repli automatique sur le gabarit : aucun run n’est perdu.
- **Publication automatique** : le robot committe sur `main`
  (`src/news/auto/*.json` + `src/news/autoIndex.js` + visuels SVG générés dans
  `public/news-auto/`), ce qui déclenche le déploiement Pages. Rien de neuf →
  aucun commit. Sortie clairement en échec si *tous* les flux sont tombés.
- **Miniature officielle obligatoire** : avant publication, le robot extrait
  `image` du JSON-LD ou `og:image`/`twitter:image` de l’article source, vérifie
  qu’il s’agit d’une URL HTTP(S), télécharge le fichier image et contrôle son
  type MIME et sa taille minimale. Si la source ne fournit pas de miniature
  officielle exploitable, l’article est abandonné ; aucune carte éditoriale ne
  peut contourner cette règle. La miniature locale est utilisée par les cartes
  et la couverture de l’article, tandis que le visuel SVG Let’s Play reste
  conservé comme repli éditorial historique.
- **Intégration site** : `src/lib/autoNews.js` dérive la liste des actus
  (ouvertes par les plus récentes), les routes `/news/<slug>` (route générique
  dans `src/main.jsx` — les slugs manuels restent prioritaires, un slug
  inconnu affiche la page 404) et l’index de recherche interne. Les articles
  générés sont archivés après 21 jours (`archiveDays`) pour garder le bundle
  léger. Les visuels sont des cartes éditoriales SVG aux couleurs Let’s Play :
  aucune image de droit n’est embarquée automatiquement.
- **Honnêteté éditoriale** : chaque article généré porte la mention
  « ACTU DU JOUR », crédite sa source (lien « Lire l’article source ») et le
  mode gabarit indique noir sur blanc que l’article a été préparé
  automatiquement ; le mode IA crédite « rédigé avec l’assistance d’un modèle
  de langage ».

Run manuel : onglet Actions → « Robot actus du jour » → Run workflow (choisir
le nombre d’articles, cocher « forcer » pour élargir la fenêtre). En local :

```bash
npm run news:fetch        # run réel (réseau requis)
node scripts/news-bot/fetch-news.mjs --fixtures   # démo hors-ligne (3 articles de test)
npm run check:newsbot     # rejoue la chaîne hors-ligne et valide les fichiers committs
```

Ajouter ou retirer un média, ajuster les mots-clés « chauds » (studios,
licences, salons) et les filtres anti-bruit : tout vit dans
`scripts/news-bot/config.mjs`. L’état anti-doublons est conservé dans
`news-bot/state.json` (GUID des news déjà vues, slugs déjà publiés).

## Sources éditoriales

- [Instagram @letsplay.officiel](https://www.instagram.com/letsplay.officiel/)
- [YouTube Let’s Play Official](https://www.youtube.com/@letsplay.officiel)
- [Games & Comic Con Dzaïr](https://www.gccdz.com/)
- [Algérie Télécom](https://www.algerietelecom.dz/) · [IdOOM Market](https://idoom-market.com.dz/fr)
- [TCL](https://www.tcl.com/)

### Réactions des articles actus

La section « Vous en pensez quoi ? » utilise désormais Supabase, et non les
compteurs du navigateur. **Relancer `supabase/schema.sql` dans le SQL Editor du
projet utilisé par le site avant de déployer le frontend.** Cette migration
ajoute `article_reactions` et les RPC `get_article_reactions` /
`set_article_reaction`.

Tous les visiteurs voient le total partagé et la répartition en pourcentages
(par choix, pas une note numérique). Un compte connecté peut voter, changer
son choix ou cliquer à nouveau pour le retirer. La clé primaire impose un seul
vote par compte et par article, y compris sur plusieurs appareils. Les RPC
n'exposent pas les identités des votants et l'identité d'écriture est issue de
`auth.uid()`. Les comptes démo ne votent pas. La tendance est relue toutes les
30 secondes, au retour sur la fenêtre et après chaque vote.

Les anciens compteurs locaux ne sont pas importés : ils ne constituent pas des
votes vérifiables. En cas de panne ou de migration manquante, une erreur est
affichée, sans simuler un enregistrement local.
