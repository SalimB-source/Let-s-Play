# Le Sablier en ligne — le PvP

> **Réponse courte.** Les deux, mais pas en même temps, et pas dans cet ordre :
> **l'invitation cliquable d'abord**, la file d'attente ensuite. La raison n'est
> pas technique, elle est dans le jeu : le Sablier est un duel **tour par tour
> sans réflexes**, prévu pour être joué dans un bus et pour attendre le joueur
> indéfiniment (`03-combat.md`). Un tel jeu n'a pas besoin que les deux joueurs
> soient connectés à la même seconde — il a besoin que le défi soit **facile à
> lancer** et **reprenable**. Une file d'attente suppose une masse critique de
> joueurs en ligne au même instant ; un lien de défi marche avec deux joueurs,
> à n'importe quelle heure, y compris à la correspondance.
>
> Et le second n'est pas du travail perdu : une file d'attente ne fait que
> **créer un duel autrement**. Le moteur de partie, l'arbitre, la vue filtrée et
> l'écran de duel sont communs aux deux.

Ce document décrit l'architecture, ce qui est **déjà codé dans ce dépôt**
(`src/games/rpgPvp.js`, `tests/rpg-pvp.test.js`, `supabase/rpg-pvp.sql`) et ce
qui reste à écrire, étape par étape.

---

## 1. La contrainte qui décide de tout : l'information cachée

Un duel du Sablier n'est pas une course. Dans Mirage Rush, chaque client peut
connaître toute la partie : le pire qu'un tricheur puisse faire est de mentir
sur sa distance, et le jeu l'assume explicitement (« client-reported race
results, not anti-cheat verified », `supabase/mirage-rooms-README.md`).

Ici, **chaque joueur a une main secrète et un ordre de pioche secret**. Un
client qui reçoit l'état complet connaît la main de l'adversaire, ses deux
prochaines pioches et toutes ses esquives à venir. Le jeu n'a plus d'intérêt.

Conséquence : le PvP ne peut pas être un simple salon où l'on diffuse l'état.
Il faut un **arbitre** — un endroit unique qui tient la seule copie vraie de la
partie, applique les actions et renvoie à chacun une vue filtrée. C'est le seul
choix structurant de tout ce dossier.

Bonne nouvelle : le dépôt est déjà prêt pour ça, presque par accident.

| Ce qu'il faut à un arbitre | Où c'est déjà vrai |
| --- | --- |
| Un moteur sans DOM, importable en Node | `src/games/rpgDuel.js` est du calcul pur, testé en Node (`npm run check:rpg`) |
| Un état sérialisable | un duel neuf fait **~2 Ko de JSON** (mesuré), sans fonction ni classe |
| Un déploiement serveur | `api/` est déjà servi par Vercel (`api/youtube-live.js`) — mais Supabase Edge Functions ou Cloudflare font le même travail, voir §8 |
| Une base et des comptes | Supabase, `profiles`, `auth.uid()`, RLS partout |
| Des messages et des amis | `src/messages/*`, `src/friends/*`, realtime sur `direct_messages` |

---

## 2. Ce que le moteur impose (et que le protocole corrige)

Ces six points sont des faits vérifiés dans le code, pas des précautions de
principe. Chacun a sa réponse dans `src/games/rpgPvp.js`.

### 2.1 Les deux mains vivent dans le même objet

`duel.joueur.main` et `duel.sorcier.main` voisinent. **`rpgPvpVue(duel, siege)`
est la seule forme sous laquelle un état sort du serveur** :

- la main et la pioche adverses sont vidées, remplacées par `mainCount` et
  `deckCount` (l'écran affiche « 5 cartes en main », pas les cartes) ;
- la graine du hasard (`duel.hasard`) est supprimée : la connaître, c'est
  prédire toutes les pioches suivantes ;
- le profil d'IA (`duel.sorcier.ia`) et la puissance du sorcier disparaissent ;
- le camp `sorcier` est **retourné** : sa main descend en bas de l'écran, son
  adversaire monte. `vue.joueur` signifie toujours « moi », quel que soit le
  siège — c'est ce qui permet de réutiliser l'écran de duel existant.

### 2.2 Le moteur écrit à la deuxième personne

`duel.log` contient « Vous posez le terrain », « Le sorcier pioche ». Vrai
contre l'IA, faux entre deux joueurs — et carrément inversé pour celui qui
reçoit la vue retournée. `rpgPvpNommerLog(entrees, acteur, noms)` réécrit les
entrées avec les pseudos, en s'appuyant sur le fait qu'**une action n'a qu'un
acteur**.

### 2.3 Le hasard n'est pas dans l'état

Le générateur est rangé dans une `WeakMap` (`hasardParDuel`), qui ne survit pas
à un aller-retour JSON : chaque requête repartirait sur `Math.random`. Si l'on
veut pouvoir rejouer une partie (litige, audition, test), il faut une graine
persistée : `rpgPvpBrancherHasard(duel, graine)` accroche un générateur semé
dont l'état vit **dans** le duel (`duel.hasard = { graine, compteur }`).

À noter : `rpgPoserTerrain` tire encore l'identifiant d'instance avec
`Math.random()` (les terrains ne sont plus au catalogue, le cas est dormant).
Le rejeu est donc exact **pour les règles**, pas pour les identifiants
d'objets.

### 2.4 Les animations sont hors de l'état

`presentations` (pioches, effets) et le journal des soins sont aussi des
`WeakMap`. L'arbitre les consomme après chaque action
(`rpgConsommerPresentations`, `rpgConsommerSoins`) et les renvoie dans
`evenements` — **filtrés** : une pioche de l'adversaire ne doit pas révéler la
carte piochée.

### 2.5 « À qui le tour » n'est pas toujours `duel.tour`

Pendant `phase === 'blocage'` (le défenseur choisit ses bloqueurs) et pendant
`fenetreReponse` (il répond à une magie rapide), c'est **l'autre camp** qui doit
agir. `rpgPvpCoteActif(duel)` centralise cette règle ; le serveur et le client
l'appellent tous les deux.

### 2.6 L'écran suppose que le joueur est `joueur`

`RpgDuelPage.jsx` appelle le moteur avec `'joueur'` en dur. Deux options :

- (recommandé) la page reçoit `vue` + `siege` et **agit toujours en `joueur`**
  côté moteur, parce que la vue a déjà été retournée. Aucune modification des
  règles, seulement de la source des données ;
- ou bien la page reçoit un `siege` et le passe partout — plus intrusif, à
  éviter pour ne pas semer des `cote` dans 9 500 lignes.

---

## 3. Les trois architectures possibles

| | A. Salon client (comme Mirage) | **B. Arbitre serveur** | C. Défi « fantôme » par lien |
| --- | --- | --- | --- |
| Principe | l'état circule entre clients | le serveur tient la partie | le lien contient la partie |
| Anti-triche | aucun | oui | sans objet |
| Information cachée | **non** (main adverse visible) | oui | le lien révèle tout à qui le décode |
| Coût | 3–5 j | 8–12 j | 2–4 j |
| Usage | course, party game | **duel de cartes** | « bats mon meilleur duel », partage social |

**Recommandation : B**, avec C plus tard comme bonus (le dépôt sait déjà faire
C pour Mirage : `src/games/duelChallenge.js` encode une course dans un lien).
A est disqualifiant pour un jeu de cartes : il suffit d'ouvrir la console pour
lire la main d'en face.

### L'arbitre, concrètement

Une fonction Vercel `api/sablier-duel.js`, deux secrets
(`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`), et le moteur importé tel quel :

```js
import { rpgPvpAppliquer, rpgPvpVue, rpgPvpBrancherHasard } from '../src/games/rpgPvp.js';

// 1. Vérifier le JWT (supabase.auth.getUser(token)) → uid
// 2. Lire le duel (clé service) et vérifier que uid est bien hôte ou invité
// 3. Charger l'état, brancher le hasard, rejouer l'intention :
//      const { ok, raison } = rpgPvpAppliquer(duel.etat, siege, intention);
// 4. Si ok : écrire etat + seq + tour + echeance (transaction), renvoyer
//      rpgPvpVue(duel.etat, siege) — jamais l'état complet.
```

Trois règles d'or :

1. **Le client n'envoie jamais d'état**, seulement une intention
   (`{ type: 'jouer-carte', carteId, cibleId }`). Il n'envoie jamais non plus
   un résultat, un gain de PV ou une victoire.
2. **Atomicité** : `rpgPvpAppliquer` restaure l'état à l'identique en cas de
   refus ou d'exception (vérifié par test). Une action refusée ne laisse aucune
   mutation partielle.
3. **Le deck est revalidé côté serveur** : `rpgValiderDeck(cardIds)` **et**
   appartenance à la collection du joueur (`rpg_sablier_progress.state`). Sinon
   un client envoie quarante mythiques qu'il ne possède pas.

---

## 4. L'invitation cliquable dans la messagerie

C'est le chemin court, et celui qui correspond à la façon dont la communauté
partage déjà (`duelChallenge.js`, les liens d'actus, le groupe WhatsApp de
l'émission).

### 4.1 Le message typé, pas une URL à parser

`direct_messages` gagne deux colonnes (`supabase/rpg-pvp.sql`) :

```sql
alter table public.direct_messages
  add column if not exists kind text not null default 'texte',
  add column if not exists payload jsonb;
-- kind ∈ ('texte', 'defi-sablier', 'defi-sablier-resultat')
```

`body` garde une phrase lisible ; `payload` porte `{ code, mode, deckNom }`.
Un ancien client affiche le texte — il ne casse pas ; le client à jour dessine
une carte « Défi du Sablier » avec deux boutons. **Le statut de la carte n'est
jamais recopié dans `payload`** : la carte interroge l'arbitre, donc elle ne
peut pas mentir (défi accepté, refusé, expiré, terminé).

### 4.2 Le parcours

```
Salim                                   Yasmine
─────                                   ───────
Duel en ligne → Inviter un ami
  choisit Yasmine + son deck
  « Proposer un duel »
        │
        └── DM kind='defi-sablier' ───▶  badge « 1 message »
                                         carte : « Salim te défie »
                                           [ Rejoindre ]  [ Refuser ]
        ◀── realtime + carte à jour ───  choisit son deck
        │
   duel (direct ou correspondance)
        │
        └── fin : DM kind='defi-sablier-resultat'
            « Salim 4 — 12 Yasmine » + [ Revanche ]
```

### 4.3 Le lien profond

`/jeu/sablier-de-bab-el/defi/AB12CD34` — le code est la seule clé. Le lien sert
à deux choses :

- **dans le site** : la carte du message ;
- **hors du site** : collé dans WhatsApp, Discord, Instagram — salons où le jeu
  recrute vraiment. `rpgPvpLienDefi` / `rpgPvpCodeDuLien` normalisent et
  relisent le code (URL complète, chemin, saisie brute, minuscules).

Un joueur non connecté qui ouvre le lien passe par l'authentification puis
retombe sur le défi (mémoriser le code dans `sessionStorage` avant le détour).
`RpgEntryChoice` ne doit **pas** s'interposer : un lien de défi ouvre le duel,
pas l'écran « PC ou navigateur ».

### 4.4 Garde-fous

- 1 invitation en attente par couple d'amis (index unique partiel en SQL) ;
- expiration à 7 jours (`rpg_sablier_purge`, à planifier une fois par heure) ;
- un joueur bloqué (`message_blocks`) ne peut pas être défié — hériter de la
  modération existante ;
- défi « par lien » = visibilité `lien`, pas de blason, pas de note ;
- refuser un défi n'envoie pas de message : la carte grise simplement.

---

## 5. La file d'attente (matchmaking)

Utile, mais **en second** : elle souffre du problème de la masse critique. À
l'échelle actuelle du site, un bouton « Trouver un adversaire » qui tourne dans
le vide 30 secondes est pire que pas de bouton.

La version qui ne déçoit jamais :

1. Le joueur entre dans la file (RPC `rpg_sablier_file_rejoindre`, appariement
   atomique par `for update skip locked`, fenêtre de note ±200 qui s'élargit) ;
2. au bout de **15 s sans adversaire**, on propose deux issues :
   « Jouer contre l'IA en attendant » (l'IA existe déjà, `rpgAI.js`) ou
   « Créer un défi à partager » — qui retombe sur le parcours du §4 ;
3. au bout de 30 s, la ligne de file expire d'elle-même (battement de cœur).

Points de conception :

- **deux files** : `live` (les deux sont là, horloge de 90 s par tour) et
  `async` (correspondance, rappel à 24 h, abandon technique à 7 jours) ;
- **amical par défaut**, classé sur demande (Elo 1200, K = 24, table
  `rpg_sablier_classement`) ;
- **la présence des amis** (`src/friends/presence.js`, déjà en place) mérite
  mieux qu'un matchmaking anonyme : « 3 amis en ligne » en haut de l'écran PvP
  convertit mieux qu'une file.

---

## 6. Le protocole de partie (déjà codé)

### 6.1 L'API de l'arbitre

| Action | Corps | Réponse |
| --- | --- | --- |
| `ouvrir` | `{ deck }` | crée un duel (code, siège `joueur`, état initial) |
| `rejoindre` | `{ code, deck }` | siège `sorcier`, état initialisé |
| `etat` | `{ code }` | `rpgPvpVue(etat, siege)` + `seq` + échéance |
| `jouer` | `{ code, seq, intention }` | nouvelle vue, ou `{ refusee, raison }` |
| `refuser` / `abandonner` | `{ code }` | statut à jour |
| `revanche` | `{ code }` | nouveau duel, mêmes decks, couleurs inversées |

`seq` est le garde-fou anti-rejeu : le serveur n'accepte que `seq + 1` et
retourne `409` sinon. Le journal (`rpg_sablier_duel_actions`) donne l'audit et
permet de rejouer une partie à partir de la graine.

### 6.2 Les intentions couvertes

`mulligan`, `choix-mana`, `jouer-carte`, `activer`, `attaquer`, `fin-de-tour`,
`conceder` — dispatchées vers les fonctions du moteur (`rpgJouerCreature`,
`rpgLancerMagie`, `rpgJouerArme`, `rpgLancerAttaque`, `rpgFinDeTour`…), après
contrôle du tour et du camp.

Une limite assumée en v1 : **le défenseur ne choisit pas encore ses bloqueurs**,
le moteur les assigne. L'échange « déclaration / blocage » suppose de suspendre
une attaque entre deux camps, ce qui est un chantier dans le moteur lui-même —
à traiter en P3 (§9), pas à improviser dans le protocole.

### 6.3 Horloges et abandon

| Mode | Tour | Rappel | Fin technique |
| --- | --- | --- | --- |
| `live` | 90 s (puis « fin de tour » forcée) | — | 3 tours oubliés = abandon |
| `async` | aucune | 24 h sans coup → notification | 7 jours = abandon |

`rpgPvpHorloge(mode, dernierCoup, maintenant)` rend `{ echeance, restant,
expire, rappel }` : le client affiche le compte à rebours, le serveur décide.

### 6.4 Reprise après déconnexion

Gratuite, et c'est l'argument décisif pour l'arbitre serveur : l'état vit en
base, pas dans l'onglet. Le joueur revient, `etat` répond, il reprend au tour
où il en était — sur un autre appareil s'il veut. La page interroge l'arbitre
toutes les 2 s quand ce n'est pas son tour (même choix que les salons Mirage,
200 ms en course / 900 ms au salon) ; pas de realtime à ajouter pour la partie,
seule l'invitation en a besoin et `direct_messages` est déjà publié.

---

## 7. L'écran, en pratique

- **Entrée** : une troisième action dans l'écran d'entrée ou le menu du duel —
  « Duel en ligne ». Pas un quatrième écran d'accueil : le jeu a déjà
  « PC / navigateur », il ne faut pas empiler les portes.
- **Salon d'invitation** : choix du deck (les decks maison existent déjà), mode
  direct / correspondance, liste d'amis avec pastille de présence.
- **Pendant** : bandeau « À toi de jouer » / « À Yasmine — 00:47 », journal
  nommé, bouton « Abandonner » discret (deux clics, il ne doit pas être à côté
  de « Fin de tour »).
- **Fin** : résultat, delta de note si classé, `[ Revanche ]` et
  `[ Partager le lien ]`. Le message de résultat part dans le fil existant.
- **États d'erreur à soigner** : lien expiré, duel déjà terminé, joueur qui
  s'invite lui-même, versions de client différentes.

Chargement : la carte du message et le salon ne doivent **pas** importer
`RpgDuelPage` (chunk de ~740 Ko). L'écran d'invitation est léger ; le duel reste
un `lazy()`.

---

## 8. Où tourne l'arbitre : Vercel, GitHub, Cloudflare ou Supabase

### 8.1 GitHub ne peut pas le faire, et ce n'est pas une question de goût

GitHub héberge déjà trois choses dans ce projet : le code, la release de
l'installeur PC (`tag desktop`), et un miroir du site sur GitHub Pages
(`.github/workflows/deploy.yml`). Aucune des trois ne peut tenir le rôle
d'arbitre :

1. **Pages ne sert que des fichiers statiques.** Pas de fonction, pas de
   secret, pas de clé service. Or l'arbitre doit détenir la seule copie vraie
   de la partie : si le code tourne dans le navigateur, l'état est lisible par
   le joueur, et il n'y a plus de main secrète (§1).
2. **Actions n'est pas un serveur.** Les workflows se déclenchent sur `push`,
   `cron` (5 minutes minimum) ou à la main ; ils ne répondent pas à une requête
   HTTP entrante. On ne peut pas y brancher un duel.
3. **Pages a un plafond de bande passante** (≈100 Go/mois en usage raisonnable)
   et interdit l'usage commercial — ce n'est pas grave pour un miroir, c'est
   disqualifiant comme hébergement principal d'un site à partenaires.

Donc oui : il faut **un** endroit où du code serveur s'exécute. La bonne
nouvelle, c'est qu'il en existe déjà un dans la pile — et même deux.

### 8.2 Vercel : le chemin zéro effort (recommandé pour commencer)

**Pourquoi c'est déjà le bon choix aujourd'hui, sans rien décider :**

- `api/` existe et est déployé (`api/youtube-live.js`) ;
- `vercel.json` fait déjà le repli SPA **en excluant `/api/*`** — une nouvelle
  route serveur n'a rien à configurer ;
- la coque Android pointe sur `let-s-play-nu.vercel.app`
  (`android/.../MainActivity.java`, `SITE_HOST`) ;
- le README documente l'intégration Supabase ↔ Vercel et les URLs de
  redirection OAuth qui vont avec ;
- 4,5 Mo de charge utile maximum par requête : notre état fait ~2 Ko.

**Limites du plan Hobby (2026)** : 1 M d'invocations de fonction par mois,
4 h de CPU actif, 100 Go de transfert, 300 s de durée maximale. Pour un duel
tour par tour, c'est large — voir le calcul d'invocations en §8.6.

**Deux points de vigilance**, tous les deux réglables :

- **La région.** Une fonction Vercel tourne dans une seule région (iad1 par
  défaut). Pour un arbitre, la latence qui compte n'est pas celle du joueur
  mais celle de **Postgres** : régler la région de la fonction sur celle du
  projet Supabase, sinon chaque action paie deux fois le trajet
  transatlantique.
- **Hobby est réservé à un usage personnel non commercial** (politique
  d'usage raisonnable de Vercel). Un site de média avec des partenaires est
  à la limite ; c'est un argument de plus pour la §8.3 si le jeu décolle.

### 8.3 Supabase Edge Functions : l'arbitre à côté de la base

C'est l'option qui demande **le moins de décisions** : aucun fournisseur de
plus, les secrets (URL, clé service) sont déjà dans le projet, le SQL et le
code vivent dans le même dépôt, et la fonction tourne **dans la région de la
base** — donc un aller-retour Postgres de quelques millisecondes par action.

```
supabase/functions/sablier-duel/index.ts   →  import ... from '../../../src/games/rpgPvp.js'
```

Le moteur est **portable tel quel** : graphe ESM pur, 11 modules, 461 Ko de
source, aucun `node:` , aucun `process.env`, aucun `window`/`document`
(vérifié : seuls les modules audio touchent au DOM, et l'arbitre ne les
importe pas). Deno l'exécute sans adaptation.

**Limites (2026)** : 2 s de CPU par requête, 150 s de durée murale (Free),
500 000 invocations/mois gratuites, 256 Mo de mémoire, 20 Mo de bundle.

**Ce que ça coûte, mesuré sur ce dépôt** (Node 22, même moteur V8) :

| Mesure | Valeur |
| --- | --- |
| Une action de duel rejouée par l'arbitre (`rpgPvpAppliquer`) | **0,025 ms** |
| Une vue filtrée et retournée (`rpgPvpVue`) | **0,020 ms** |
| Chargement complet du moteur (parse + évaluation) | ~22 ms, **une fois par instance** |

Autrement dit : 2 s de CPU, c'est 80 000 actions de marge. Le seul coût réel
est le **démarrage à froid** (~100–300 ms en Deno selon la région), absorbé par
le pool d'instances.

Bonus : `supabase.functions.invoke` envoie le JWT de l'utilisateur, la fonction
le vérifie localement — **aucun CORS à configurer**, contrairement à un
arbitre sur un autre domaine.

### 8.4 Cloudflare Workers + Pages : viable, et meilleur pour la suite

**Le moteur y tourne aussi**, et c'est mesurable : même graphe ESM pur, aucun
API Node ; Wrangler le bundle depuis `src/games/rpgPvp.js`. Bundle bien en
dessous des 3 Mo (limite Free) une fois compressé.

**Le fameux plafond de 10 ms de CPU du plan gratuit ne nous concerne pas.**
C'est la limite qu'on cite toujours ; ici une action coûte **0,025 ms**, soit
400 fois moins. Même en ajoutant la sérialisation JSON de l'état (~2 Ko) et le
temps d'écriture, on reste très loin du plafond. Les vrais chiffres (2026) :
100 000 requêtes/jour et 10 ms de CPU par requête en gratuit ; 5 $/mois pour
supprimer le plafond quotidien et monter le CPU à 5 minutes.

**Les vraies objections, elles, sont ailleurs :**

1. **La distance à Postgres.** Un Worker s'exécute là où est l'utilisateur ;
   la partie, elle, vit dans le projet Supabase, dans une région fixe. Chaque
   action fait donc un ou deux allers-retours vers la base : depuis Alger vers
   une région européenne, 40–80 ms par trajet, alors que le calcul, lui, dure
   0,025 ms. Pour ce jeu, **le goulot est la base, pas le CPU** — l'argument
   « edge » ne joue donc pas. Correctif : `Smart Placement` de Cloudflare (le
   Worker se replace près de la base — c'est-à-dire qu'on renonce justement à
   l'avantage edge) ou un Worker épinglé sur une seule région.
2. **Il faut écrire la plomberie** : `wrangler.toml`, secrets, `_routes.json`
   ou `_redirects` pour que `/jeu/*` retombe sur `index.html` sans avaler
   `/api/*`, et un workflow de déploiement en plus de `deploy.yml`. Une
   demi-journée, pas un chantier.
3. **Le site et la coque Android restent sur Vercel** (`SITE_HOST` dans
   `MainActivity.java`) : migrer seulement l'arbitre crée deux domaines à
   maintenir ; migrer tout le site est un autre projet.

**Là où Cloudflare gagne vraiment, c'est la suite** : les **Durable Objects**
donnent un objet unique et cohérent par duel, avec WebSockets — exactement ce
qu'il faut pour un mode temps réel (salon d'attente vivant, spectateurs,
tournois, présence). Sur Vercel ou Supabase Edge, le temps réel passerait par
Supabase Realtime (déjà payé, 2 M de messages/mois en gratuit). C'est un
argument pour P5, pas pour l'arbitre tour par tour de P1.

### 8.5 Comparaison

| | Vercel (déjà là) | Supabase Edge | Cloudflare Workers |
| --- | --- | --- | --- |
| Effort de mise en route | **nul** | petit (une fonction, CI) | moyen (Wrangler, routes, CI) |
| Proximité de Postgres | à régler | **native** | Smart Placement |
| Budget CPU par requête | 300 s | 2 s | 10 ms (Free) — 400× de marge |
| Quota gratuit | 1 M d'invocations/mois | 500 k/mois | 100 k/jour |
| Fournisseurs en plus | 1 (déjà) | **0** | 1 (+ Pages) |
| Usage commercial en gratuit | non (Hobby) | oui | oui |
| Temps réel futur | Supabase Realtime | Supabase Realtime | **Durable Objects** |

**Verdict.** Aujourd'hui : **Vercel**, parce que la route existe déjà et que le
premier duel ne doit pas attendre une migration. Ensuite, si l'objectif est de
simplifier : **Supabase Edge Functions**, l'arbitre collé à la base, zéro
fournisseur de plus. Cloudflare devient le bon choix le jour où l'on veut du
**vrai temps réel** — pas avant. Dans tous les cas, c'est **le même fichier**
`src/games/rpgPvp.js` qui tourne : rien dans ce dossier n'est lié à un
hébergeur.

### 8.6 Ce qui coûtera plus cher que l'hébergeur : les requêtes

L'architecture interroge l'arbitre toutes les 2 s quand ce n'est pas son tour
(§6.4). Une partie de 10 minutes, c'est environ 150 lectures par joueur, donc
**~300 invocations par partie**. Traduit en quotas gratuits :

| Hébergeur | Quota | Parties par mois (ordre de grandeur) |
| --- | --- | --- |
| Vercel Hobby | 1 M d'invocations | ~3 000 |
| Supabase Edge | 500 k | ~1 600 |
| Cloudflare Free | 100 k/jour | ~10 000 (mais plafond quotidien) |

Si ce plafond devient la contrainte, trois leviers, dans l'ordre :

1. **Descendre la fréquence** : 2 s quand l'onglet est visible, 10 s quand il
   est caché (`document.visibilityState`), et pas de sondage du tout pour les
   parties `async` ;
2. **Pousser au lieu de tirer** : `realtime.broadcast` de Supabase (2 M de
   messages/mois en gratuit) depuis l'arbitre vers un canal privé — le client
   écoute au lieu de demander ;
3. **Regrouper** : une seule invocation renvoie l'état ET la liste des défis
   en attente.

### 8.7 Et si je ne veux aucun hébergeur de plus ?

Alors la réponse est **Supabase Edge Functions** : c'est déjà dans la pile,
déjà payé (plan gratuit : 500 k invocations, 500 Mo de base, 2 M de messages
Realtime), et l'arbitre y est mieux placé qu'ailleurs puisqu'il parle à la base
en quelques millisecondes. Vercel peut rester ce qu'il est aujourd'hui — le
site — sans jamais connaître le PvP.

### 8.8 Le même arbitre, trois enveloppes

Le cœur ne change pas — seul le fichier d'entrée change de forme.

```js
// api/sablier-duel.js  (Vercel)
import { arbitrer } from '../src/server/sablierArbitre.js';
export default async function handler(req, res) {
  const { status, body } = await arbitrer({ method: req.method, headers: req.headers, body: req.body });
  res.status(status).json(body);
}
```

```ts
// supabase/functions/sablier-duel/index.ts  (Supabase Edge, Deno)
import { arbitrer } from '../../../src/server/sablierArbitre.js';
Deno.serve((req) => arbitrer(req));
```

```js
// worker/sablier-duel.js  (Cloudflare, avec wrangler.toml + _routes.json)
import { arbitrer } from '../src/server/sablierArbitre.js';
export default { fetch: (req, env) => arbitrer(req, env) };
```

`src/server/sablierArbitre.js` (P1) contiendra la logique commune : vérifier le
JWT, lire le duel, `rpgPvpAppliquer`, écrire, répondre `rpgPvpVue`. Il prend une
`Request` web standard et rend une `Response` — c'est la seule forme que les
trois plateformes comprennent, et c'est aussi celle qu'on peut tester en Node
(`node --test`) sans rien déployer.

## 9. Découpage proposé

| Étape | Contenu | Durée | Critère de sortie |
| --- | --- | --- | --- |
| **P0 — socle** | `rpgPvp.js` + tests + SQL (ce commit) | fait | `npm run check:rpg-pvp` vert (20 tests) |
| **P1 — arbitre** | `src/server/sablierArbitre.js` + une enveloppe (`api/sablier-duel.js` sur Vercel, voir §8), actions de base, duel `live` jouable par code | 4–6 j | deux comptes terminent un duel réel |
| **P2 — messagerie** | `kind='defi-sablier'`, carte cliquable, refus, expiration, lien profond | 3–4 j | un défi reçu dans la messagerie se joue en 2 clics |
| **P3 — confort** | correspondance (`async`), rappels, blocage des bloqueurs, revanche, abandon | 3–5 j | un duel `async` se termine sur 3 jours |
| **P4 — file** | `rpg_sablier_file`, repli IA 15 s, classement Elo | 3–5 j | un joueur trouve un adversaire en < 30 s (ou l'IA) |
| **P5 — bonus** | défi « fantôme » par lien sans compte, spectateurs, tournois | ? | — |

Tests à ajouter à chaque étape : rejeu d'une partie depuis le journal (P1),
allée-retour de la carte d'invitation en jsdom (P2), expiration et double envoi
(P2/P3), appariement concurrent de la file (P4).

---

## 10. Les pièges

1. **Ne jamais envoyer `etat`**, même « pour déboguer ». Un `console.log` de
   l'état côté client est une fuite.
2. **Le camp `sorcier` n'est pas un joueur** dans le moteur : il porte
   `puissance` et `ia`. En PvP, forcer `puissance: 0` et `ia: null` pour les
   deux camps, sinon les cartes de l'histoire se comportent différemment.
3. **Le client installé (PC/Android)** doit masquer l'entrée en ligne hors
   connexion, et ne jamais proposer la file d'attente hors ligne.
4. **Versions** : `RPG_PVP_VERSION` voyage dans `rpg_sablier_duels.version` ;
   refuser un duel entre deux versions, sinon un client ancien recevra des
   champs qu'il ne comprend pas.
5. **Fuites d'animations** : ne pas relayer `presentations` brutes — une pioche
   adverse y figure avec son `carteId`.
6. **Abandon et classement** : un joueur qui perd ne doit pas pouvoir fuir
   sans pénalité ; l'abandon compte comme défaite en classé, pas en amical.
7. **Modération** : un défi est un message ; il hérite des blocages et des
   signalements existants. Ne pas créer un second canal parallèle.

---

## 11. Ce qui existe dans ce commit

| Fichier | Rôle |
| --- | --- |
| `src/games/rpgPvp.js` | protocole : codes et liens, tour actif, vue filtrée et retournée, application atomique des intentions, résultat, journal nommé, horloges, hasard persisté |
| `tests/rpg-pvp.test.js` | 13 tests de protocole : fuite de main, retournement, atomicité, tour, abandon, hasard, horloge |
| `tests/rpg-pvp-db.test.js` | 7 tests sur le vrai schéma (PGlite) : RLS fermée, appariement de la file, invitation unique, messages typés, purge |
| `supabase/rpg-pvp.sql` | tables des duels, journal d'actions, file d'attente, classement, RLS fermée sur l'état, RPC de file, purge, colonnes `kind`/`payload` des messages |
| `package.json` | `npm run check:rpg-pvp` |

Rien de tout cela n'est branché sur une route : le jeu actuel est inchangé.
L'étape suivante (P1) est d'écrire l'arbitre et de brancher
`RpgDuelPage` sur `rpgPvpVue`.

---

## 12. Les décisions qui restent à prendre

1. **Direct ou correspondance par défaut ?** Le jeu penche pour la
   correspondance ; l'invitation, elle, doit proposer les deux au moment de
   défier.
2. **Classé dès le départ ?** Recommandation : non — amical d'abord, note
   seulement quand la file existe (P4), sinon les premiers arrivés fixent la
   référence.
3. **Défier hors de sa liste d'amis ?** Oui par lien (`visibilite='lien'`),
   non en invitation nominative.
4. **Un deck maison par duel, ou un deck par siège ?** Le SQL porte un deck par
   siège, ce qui autorise le miroir plus tard ; l'interface v1 peut n'en
   proposer qu'un.
5. **Revanche automatique** (mêmes decks, couleurs inversées) ou nouveau défi ?
   La revanche immédiate est plus simple et évite un aller-retour de messages.
