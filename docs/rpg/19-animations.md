# 19 — Catalogue des animations à créer

> Ce document ne décrit pas ce qui est fait : il décrit **ce qu'on pourrait
> faire ensuite**. L'inventaire de l'existant est en §2, pour éviter de
> refaire deux fois le même geste — il y a déjà **185 `@keyframes`** dans les
> feuilles du Sablier, et le doublon coûte plus cher que le manque.
>
> Tout le catalogue est écrit **contre les mécaniques réelles du jeu** :
> l'Astrolabe, les compteurs d'Heures, le mana, les sites persistants, les six
> éléments, les mots-clés des sets Ténèbres et Lettres de Marque, le Souk, le
> PvP. Une animation qui ne raconte pas une règle est une animation à ne pas
> faire.

---

## 1. Le contrat d'animation du Sablier

Cinq règles, héritées de `03-combat.md` et de `README.md` :

1. **Aucune animation ne conditionne une action.** Le jeu attend indéfiniment.
   Une animation peut accompagner, jamais imposer un timing. Rien à parer,
   rien à esquiver : l'animation n'est pas une épreuve.
2. **Une animation ne retarde jamais la décision suivante de plus d'une
   seconde.** Tout ce qui dépasse doit être *sautable* (un clic, une touche,
   un tap n'importe où) et se jouer **en parallèle** du rendu de l'état.
3. **Le budget de durée** :

   | Famille | Durée cible | Plafond |
   | --- | --- | --- |
   | Retour d'interface (survol, sélection, réglage) | 120–180 ms | 220 ms |
   | Geste de carte (poser, défausser, engager) | 240–380 ms | 450 ms |
   | Action de combat (attaque, blocage, dégâts) | 300–500 ms | 700 ms |
   | Sort signature d'élément | 500–800 ms | 1 000 ms |
   | Moment fort (Astrolabe, boss, fin de Tour) | 900 ms–1,6 s | 2 s, **une fois** |
   | Ambiance de table (boucle) | sans fin | jamais devant une décision |

   Un tour complet reste sous les **12 secondes**, animations comprises.
4. **Local, pas plein écran.** Une animation répétée ne flashe pas tout
   l'écran : elle vit sur la carte, la plaque ou une couche `pointer-events:
   none` de la zone concernée. Les secousses d'écran sont réservées aux
   impacts majeurs (`rpg-screen-shake-a/b` existe déjà).
5. **`prefers-reduced-motion` n'est pas une option, c'est une seconde
   version.** Chaque animation livrée a sa variante réduite : fondu court,
   état final immédiat, **son conservé**. Le réglage interne du jeu (§3.L)
   doit pouvoir la forcer sans toucher au système.

**Technique** : CSS `@keyframes` pour tout ce qui est linéaire et peu coûteux ;
Web Animations (`element.animate`) quand il faut annuler, enchaîner ou lire une
position (`rpgMythicImpact.js` est le patron) ; SVG pour les tracés (flèches,
cracks) ; Three.js **uniquement** dans le décor de table (`rpgTableScene.js`),
jamais au-dessus des cartes. Pas de GIF, pas de vidéo, pas de Lottie : le jeu
tourne hors ligne dans la coque Electron et dans l'APK Android.

**Nommage** : `rpg-<scène>-<geste>`, la scène d'abord (`rpg-heures-*`,
`rpg-souk-*`), pour que la feuille se lise par famille. Les états transitoires
portent une classe `is-*` posée puis retirée par un timer annulable.

---

## 2. Ce qui existe déjà (à ne pas refaire)

| Scène | Couvert | Où |
| --- | --- | --- |
| Arrivée de carte (slam, poussière, fissures, secousse, écho) | commune **et** mythique | `rpgMythicImpact.js`, `rpg-mythic-impact.css` |
| Attaque au corps à corps, impact, chiffres flottants, secousse d'écran | oui | `rpg-battle.css` (`card-lunge-*`, `rpg-hit`, `rpg-screen-shake-*`) |
| Boucliers (entrée, impact, fissure, bris) et soins (halo, montant, source) | très couvert | `rpg-bouclier-*`, `rpg-soin-*` |
| Braise, Eau, Foudre, Neige, Envol, cercles magiques | oui | `rpg-roue-feu-*`, `rpg-tourbillon-eau-*`, `rpg-eclair-marteau-*`, `rpg-freeze-*`, `rpg-envol-*`, `rpg-cercle-magique-*` |
| Abordage / Grappin / Cale / Prisonnière | oui | `rpg-abordage-*`, `rpg-prisonniere-arrivee` |
| Pioche, mulligan, main, draft, vol de carte | oui | `rpg-player-card-draw`, `rpg-mulligan-*`, `rpg-card-flight-to-table`, `rpg-tear-*` |
| Annonces de tour et d'action, IA qui réfléchit | oui | `rpg-annonce-*`, `rpg-ai-thinking-pulse` |
| Souk, boosters, quêtes, solde, sceau | très couvert | `rpg-souk-*`, `rpg-quests-jour-*` |
| Histoire (scènes, journal, portrait, sable, grain) | oui | `rpg-story-*` |
| PvP (en ligne, pulsation, partie rapide) | partiel | `rpg-pvp-pulse`, `rpg-en-ligne-pulse` |
| Tutoriel (flèches, cibles, impacts, progression) | très couvert | `city-rush-tutorial.css` ne sert pas ici ; voir `rpg-tutorial-*` |

**Les vrais trous**, confirmés par lecture des feuilles : les **compteurs
d'Heures**, la **plaque de vie**, les **sites persistants**, les deux
éléments sans signature **Sable et Ténèbres** (le jeu n'en compte que cinq —
`RPG_ELEMENTS = ['braise', 'eau', 'sable', 'neige', 'tenebres']` ; le Verre et
l'Encre ne sont pas des éléments), les mots-clés **Tribut, Cargaison,
Traque, Butin**, et **toute la respiration de la ville** entre deux duels.

> **Mise à jour (octobre 2026).** La plaque de vie et les compteurs d'Heures
> sont livrés (§5 bis). Les deux signatures d'élément manquantes le sont aussi
> (§5 ter) : la **tempête de sable** pour le Sable et la **balance des Heures**
> pour les transferts de vie Ténèbres (Tribut et sorts « pesée »).

---

## 3. Le catalogue

> Légende — **P0** : vertical slice, à faire en premier. **P1** : fort impact,
> après le slice. **P2** : luxe, si le temps le permet.
> Coût : **S** < 1 jour, **M** 1–3 jours, **L** > 3 jours (un jour = une
> personne qui connaît les feuilles du jeu).

### A. La table et la ville

Le duel de cartes a remplacé le combat à étages du prototype, mais la ville
verticale reste le sujet du jeu. Ces animations sont les seules qui peuvent
rappeler, sans texte, qu'on joue **au-dessus d'un désert qui monte**.

| Nom · id proposé | Ce qui se joue | Durée · technique | P · coût |
| --- | --- | --- | --- |
| **Le sable monte** · `rpg-ville-sable-monte` | Quand les PV du joueur passent sous 10, une nappe de sable gagne lentement le bas du plateau, poussée par `--rpg-sable-niveau` (0 → 1). Elle recule au soin, sans à-coup. Pilotée par une seule variable CSS, jamais par un timer. | boucle lente · CSS + variable | **P0** · S |
| **L'étage tombe** · `rpg-ville-etage-perdu` | Transition entre deux duels de la Tour : le plateau du duel gagné se détache et tombe en poussière, le suivant monte du bas et se met en place. C'est la mécanique du monde (un étage par cycle) montrée une fois par étage, pas à chaque carte. | 1,6 s · CSS + Three.js | **P0** · M |
| **L'Astrolabe du ciel** · `rpg-ville-astrolabe-cran` | L'astrolabe peint dans le décor tourne d'un cran discret à chaque nouveau tour — assez lent pour ne pas distraire, assez visible pour qu'on le remarque au troisième tour. | 2 s par cran · Three.js / CSS | P1 · S |
| **Rafale sur la table** · `rpg-decor-rafale` | Toutes les 40–90 s (aléatoire, jamais pendant une annonce) une rafale traverse le plateau : poussière qui file, tapis qui frémit, deux ou trois cartes en main qui bougent d'un pixel. | 900 ms · CSS | P2 · S |
| **La table penche** · `rpg-plateau-bascule` | En conquête (`rpgTerritoire.js`), la table s'incline de 0,3° vers le camp qui mène, et la frontière respire. La bascule suit l'écart de territoires, elle ne le commente pas. | continu · CSS `rotate` | P2 · M |
| **Changement de plateau** · `rpg-plateau-fondu` | Quand la découpe change (site persistant, variante fantaisiste), les deux peintures se fondent l'une dans l'autre au lieu de claquer. | 300 ms · CSS | P1 · S |

### B. Mise en place du duel

| Nom · id proposé | Ce qui se joue | Durée · technique | P · coût |
| --- | --- | --- | --- |
| **Ouverture du duel** · `rpg-duel-ouverture` | Les deux dos de deck se posent, l'Astrolabe du HUD s'allume, les deux mains montent du bas de l'écran, la pastille « Tour 1 » frappe. Une seule fois par partie : c'est là qu'on gagne le joueur. | 1,4 s, sautable · CSS + WAAPI | **P0** · M |
| **Main qui s'éveille** · `rpg-main-eveil` | Au début du tour, les cartes jouables s'allument **en cascade** (30 ms d'écart, ordre de la main) ; les injouables restent mates. Remplace le halo statique actuel, sans le supprimer. | 400 ms · CSS délais échelonnés | **P0** · S |
| **Pioche multiple** · `rpg-pioche-rafale` | Un sort qui pioche 2 ou 3 cartes les fait sortir **l'une après l'autre**, avec 120 ms d'écart, chacune se retournant en vol. Aujourd'hui elles arrivent ensemble et on ne lit rien. | 3 × 180 ms · WAAPI | P1 · S |
| **Carte écartée** · `rpg-mulligan-dissout` | Une carte écartée au mulligan ne disparaît pas : elle se délite en sable vers le bas de l'écran. Le mulligan devient un geste, pas une case cochée. | 350 ms · CSS | P1 · S |
| **Paquet qui s'épuise** · `rpg-paquet-vide` | Quand la pioche tombe à 3, 2, 1 puis 0 : le dos du paquet s'amincit visiblement, et le dernier avertit d'un liseré. La fatigue de pioche se lit **avant** de la subir. | 300 ms · CSS | P1 · S |
| **Le cimetière s'ouvre** · `rpg-cimetiere-eventail` | Ouvrir le cimetière fait remonter les cartes en éventail fantôme, translucides, avec leur nom lisible au survol. | 280 ms · CSS | P2 · S |

### C. La lecture du tour — le cœur du jeu sans réflexes

C'est la famille la plus importante : le Sablier se gagne en **lisant**. Une
animation qui clarifie l'état vaut dix animations de dégâts.

| Nom · id proposé | Ce qui se joue | Durée · technique | P · coût |
| --- | --- | --- | --- |
| **Le grain du tour** · `rpg-astrolabe-grain` | À chaque passage de tour, un grain de sable traverse l'anneau de l'Astrolabe du HUD et tombe dans le verre du bas. Le compteur de tours devient un objet, pas un nombre. | 600 ms · SVG `stroke-dashoffset` | **P0** · S |
| **Le sablier se retourne** · `rpg-fin-de-tour-retourne` ✅ | Le bouton « Fin du tour » se retourne en 3D (rotation Y de 90° à 0). Le geste le plus répété de la partie doit être le plus satisfaisant. Livré sur le libellé seul (§5 quater) ; la transformation en pastille dorée reste une piste d'enrichissement. | 480 ms · CSS `rotateY` | **P0** · S |
| **Les Heures s'égrènent** · `rpg-heures-grain` ✅ | Un compteur d'Heures perd une unité : un grain traverse le losange, le verre s'éclaire et le chiffre repart. Chaque coup rejoue son geste, même deux coups rapprochés (variantes a/b). Aujourd'hui c'est un changement de texte. | 420 ms · CSS | **P0** · S |
| **La dernière Heure** · `rpg-heures-derniere` ✅ | À **une** Heure restante, le verre se fêle et un liseré pulse : le joueur sait que l'effet tombe au prochain tour sans lire le journal. Le moteur retirant le compteur à zéro, la chute du dernier grain ne peut pas s'animer — l'état de veille la remplace. | 2 s en boucle · CSS | **P0** · S |
| **La marée de mana** · `rpg-mana-maree` ✅ | Au début du tour, les pastilles de mana se rallument **une par une**, de gauche à droite, avec une petite vague. Ne se déclenche que quand la réserve remonte (recharge), pas à la dépense ni au premier rendu ; voir §5 quater. L'ondulation de débordement au-delà du plafond reste une piste d'enrichissement. | 40 ms × n · CSS | **P0** · S |
| **Intention révélée** · `rpg-intention-deplie` | L'intention ennemie imprimée sur le parchemin se déplie d'un coup sec, puis l'icône est **tamponnée** (échelle 1,3 → 1, encre). Le joueur doit voir le moment où il apprend ce qui vient. | 380 ms · CSS | P1 · S |
| **Le sorcier réfléchit** · `rpg-sorcier-pendule` | Pendant le tour adverse, un pendule d'horloger oscille près de sa plaque, puis s'arrête net quand il joue. Remplace/complète `rpg-ai-thinking-pulse`, qui pulse sans raconter. | boucle ≤ 2 s · CSS | P2 · S |
| **L'annonce adverse** · `rpg-annonce-pose` | Une carte jouée par le sorcier arrive par un rideau de sable qui s'écarte, la fiche se pose au milieu, puis repart en s'effaçant. Le bandeau existe ; il manque le **départ** propre. | 300 + 260 ms · CSS | P1 · S |

### D. Les cartes sur la table

| Nom · id proposé | Ce qui se joue | Durée · technique | P · coût |
| --- | --- | --- | --- |
| **Arrivée discrète** · `rpg-arrivee-commune` | Une commune se **pose** : 6 px de chute, ombre qui se referme, aucun effet. La cérémonie de `rpgMythicImpact` reste aux mythiques ; une commune posée vingt fois par partie ne doit pas faire trembler la table. | 220 ms · CSS | **P0** · S |
| **Arrivée de héros** · `rpg-arrivee-heros` | Le portrait d'un héros respire **une fois** (halo chaud, 700 ms) puis se fige. Le héros n'est pas une carte rare : c'est un personnage, il a droit à un souffle, pas à des éclats. | 700 ms · CSS | P1 · S |
| **Le terrain se déplie** · `rpg-terrain-deplie` | Un terrain posé fait glisser sa peinture sous les cartes déjà en jeu, et les créatures surélevées se réalignent d'un cran. On voit la table **gagner** une ressource. | 420 ms · CSS | **P0** · M |
| **Le site mue** · `rpg-site-mue` | Un site persistant perd un compteur : un voile de sable balaie la peinture et découvre l'étape suivante. Prolonge `rpg-site-stage-reveal` (qui ne joue que l'arrivée). | 600 ms · CSS | P1 · M |
| **L'arme se noue** · `rpg-equipement-lace` | Une arme du Sable s'attache : une lanière de cuir se tend entre l'arme et la carte, puis l'arme prend sa place au bord. `rpg-bouclier-veille` donne déjà le ton. | 380 ms · SVG tracé | P1 · M |
| **La cale se referme** · `rpg-cale-verrou` | Une carte envoyée en cale glisse derrière son ravisseur, puis un petit cadenas de sable se referme et devient le compteur de cale. `rpg-prisonniere-arrivee` fait glisser la carte ; il manque **la fermeture**. | 320 ms · CSS | P1 · S |
| **La carte s'engage** · `rpg-carte-engagee` | Une créature qui attaque ou utilise un effet s'incline d'un quart de tour, son ombre s'allonge, et un liseré de sable marque qu'elle est dépensée jusqu'au prochain tour. | 240 ms · CSS | **P0** · S |
| **Le jeton naît** · `rpg-jeton-sable` | Un jeton (Shabti, serviteur) sort **du sable** : la carte émerge du bas, encore couverte de grains, puis se nettoie. Aucune autre carte du jeu n'apparaît comme ça. | 600 ms · CSS | P1 · M |
| **La destruction est du sable** · `rpg-carte-delitee` ✅ | Une carte détruite ne s'évapore pas : elle se délite en grains, et les grains **tombent sur le sol du plateau** (là où le sable s'accumule, cf. mécanique d'origine). Le cimetière se remplit visuellement. Livré en particules CSS (transform/opacité, variables `--dx/--dy/--d`), sans canvas (§5 octies). | 700 ms · CSS | **P0** · M |
| **Défausser** · `rpg-defausse` | Une carte défaussée glisse en biais, se retourne et rejoint le cimetière ; le compteur du cimetière encaisse. | 300 ms · WAAPI | P1 · S |

### E. Les éléments et les sorts

Le jeu ne compte que **cinq éléments** (`RPG_ELEMENTS` : braise, eau, sable,
neige, ténèbres). Braise, Eau et Neige ont leur signature de table (`RoueDeFeu`,
`TourbillonEau`, `RpgMassFreezeFx`) ; la Foudre n'est pas un élément mais la
cinématique d'une carte précise (le Maître du marteau). Le Sable et les
Ténèbres avaient les deux seuls éléments muets — ils sont désormais livrés
(§5 ter). Le Verre et l'Encre ne sont **pas** des éléments : « verre » ne nomme
que des cartes (Vipère de verre) et « encre » une couleur typographique.

| Nom · id proposé | Ce qui se joue | Durée · technique | P · coût |
| --- | --- | --- | --- |
| **Sable — la tempête** · `rpg-tempete-sable` ✅ | Une lame de poussière **descend** sur chaque créature frappée par un sort Sable (Tempête de sable…), un voile ocre l'enveloppe, les bords s'érodent et six grains retombent au sol. Un sort **de zone** couvre en plus tout le côté du plateau qu'il balaie : un mur de sable traverse la moitié de table, du bord à la frontière du territoire, semé de grains sur toute la largeur (`rpg-tempete-sable-zone`). Déclenchée par les blessures du journal dont `elements` contient `sable`, comme la roue de feu pour la Braise. | 900 ms (carte) / 1 100 ms (zone) · CSS | **P0** · M |
| **Ténèbres — la balance des Heures** · `rpg-balance-tenebres` ✅ | Au centre de la table, un fléau s'incline du côté qui perd des PV, deux hiéroglyphes s'allument et cinq grains d'or filent de la coupelle basse vers la haute. Branchée sur un journal de transferts hors état : Tribut au contact comme sorts « pesée ». | 1 100 ms · CSS | **P0** · M |
| **Ténèbres — le nom s'efface** · `rpg-nom-efface` (à faire) | *Nom effacé* (`defausse-adverse`) est un sort Ténèbres, pas une « Encre » : une coulure sombre raye le nom de la carte défaussée avant qu'elle rejoigne le cimetière. Geste à réserver à cette carte, à câbler sur la fenêtre de défausse. | 900 ms · SVG masque + CSS | P1 · M |
| **Magie Rapide / Sorcellerie** · `rpg-famille-geste` | Deux gestes distincts, pas deux couleurs : la Magie Rapide **part** (trait latéral, 180 ms) ; la Sorcellerie **se prépare** (cercle qui se trace, 450 ms). `SortSigil` donne le signe, il manque le mouvement. | 180 / 450 ms · CSS | P1 · M |
| **Contresort** · `rpg-contresort-rebond` ✅ | Le sort adverse heurte la réponse, se replie sur lui-même et repart. La bordure dorée continue de l'identifier ; le rebond (520 ms, transform/opacité) le rend **mémorable**, sans toucher à l'arrivée des sorts normaux (§5 septies). | 520 ms · CSS | P1 · M |
| **Écho** · `rpg-sort-echo-vague` | La seconde vague d'un sort à écho (Nuage de cendres) repart de la première, comme une marée qui revient, avec sa propre couleur. | 400 ms · CSS | P1 · S |
| **Critique** · `rpg-crit-temps` | Un critique ne secoue pas plus fort : il **ralentit** 120 ms, la carte visée marque une tache d'encre, le chiffre éclate en deux puis se recompose. Le rare se joue au tempo, pas au volume. | 420 ms · WAAPI | **P0** · S |

### F. Le combat et les plaques

| Nom · id proposé | Ce qui se joue | Durée · technique | P · coût |
| --- | --- | --- | --- |
| **La vie est du sable** · `rpg-vie-ecoule` ✅ | La nappe de sable derrière le chiffre descend à la nouvelle part de vie, le chiffre **roule** jusqu'à sa nouvelle valeur et six grains quittent la plaque. C'est la métaphore fondatrice du jeu, appliquée là où on la regarde. | 420–780 ms · CSS + rAF | **P0** · S |
| **La vie revient** · `rpg-vie-remonte` ✅ | Un soin fait remonter la nappe de sable et l'allume par le haut, le chiffre roule vers le haut. Même geste, sens inverse : on lit le soin sans lire le chiffre. | 540 ms · CSS + rAF | P1 · S |
| **Au-delà de 25** · `rpg-vie-reserve` ✅ | La vie tenue dépasse le maximum d'origine : une **bande d'or** s'ouvre au-dessus du trait des 25 PV. La règle « la vie peut dépasser 25 » devient visible. | 420 ms · CSS | P1 · S |
| **Déclaration d'attaque** · `rpg-ligne-de-charge` ✅ | Avant le bond, une ligne de sable se trace de l'attaquant à sa cible. Le joueur voit **qui** frappe **qui** avant l'impact, pas pendant. Livrée en div rotatif + CSS (transform/opacité) plutôt qu'en SVG (§5 sexies), en 220 ms de tracé sur 420 ms de vie. | 220 ms · CSS | **P0** · S |
| **Blocage** · `rpg-blocage-etincelle` | Une flèche de blocage existe ; à l'impact, elle produit une étincelle et la carte bloqueuse recule d'un pixel. Le blocage doit se _sentir_ dans la carte, pas seulement dans le chiffre. | 260 ms · CSS | P1 · S |
| **Dégâts cumulés** · `rpg-degats-cumul` | Plusieurs sources dans le même combat : les chiffres flottants s'additionnent au lieu de se chevaucher, le total reste 300 ms puis s'efface. Lisibilité pure. | 600 ms · CSS | P1 · S |
| **Héros à zéro** · `rpg-heros-brise` | Un héros tombe : son portrait se fêle (verre), la carte reste sur la table en grisé **sans animation de disparition**. Au Sablier on ne meurt pas spectaculairement : on cesse d'être lisible. | 800 ms · CSS | **P0** · M |
| **Victoire** · `rpg-victoire-table` ✅ | Le camp gagnant reste, l'autre s'efface en sable ; l'Astrolabe s'arrête sur le tour exact de la victoire. Le bilan s'ouvre **par-dessus**, sans couper la scène. Presque aucun JS : un attribut `data-vainqueur` pilote toute la scène CSS (§5 nonies). | 1 s · CSS | **P0** · M |
| **Égalité** · `rpg-egalite-sabliers` | Match nul : les deux sabliers du HUD s'arrêtent ensemble, un grain tombe de chaque côté au même instant. Une égalité doit avoir sa propre image, sinon elle ressemble à un bug. | 700 ms · CSS | P1 · S |

### G. Les mots-clés des sets récents

Chaque mot-clé doit avoir **un geste**, sinon il n'existe que dans le texte de
la carte. Abordage en a déjà un (`rpg-abordage-*`) : les autres attendent.

| Nom · id proposé | Ce qui se joue | Durée · technique | P · coût |
| --- | --- | --- | --- |
| **Tribut** · `rpg-tribut-fil` ✅ | Un fil de sable relie le payeur au bénéficiaire, les PV voyagent le long du fil et **arrivent** chez l'autre. Ténèbres, set Balance des Heures. Livré en div rotatif + CSS (transform/opacité) plutôt qu'en SVG, pour rester dans la règle « pas de propriété de mise en page animée » (§5 quinques). | 550 ms · CSS | **P0** · M |
| **Abordage — le seuil** · `rpg-abordage-tendu` | Quand la condition d'Abordage est atteinte, la chaîne existante **se tend** et le grappin mord : on sait que la carte vient de gagner son effet. | 300 ms · CSS | P1 · S |
| **Cargaison** · `rpg-cargaison-debarque` | Une caisse descend le long d'un filin, s'ouvre, et sa valeur se pose sur la carte. Littérature de pirate, lisible en 400 ms. | 400 ms · SVG | P1 · M |
| **Traque** · `rpg-traque-marque` | Une marque de sable en forme de viseur se pose sur la proie désignée, et reste tant que la Traque dure. L'information doit être **permanente**, pas un pop. | 220 ms posé · CSS | P1 · S |
| **Butin** · `rpg-butin-bourse` | Le Butin se récolte : une bourse s'ouvre au-dessus de la carte et les pièces tombent dans la réserve de vie. | 450 ms · CSS | P2 · S |
| **Prise** · `rpg-prise-retour` | Une carte prise en cale repart chez son propriétaire quand la condition l'exige : elle traverse la table, encore marquée de sable. | 500 ms · WAAPI | P2 · M |

### H. Les moments forts

| Nom · id proposé | Ce qui se joue | Durée · technique | P · coût |
| --- | --- | --- | --- |
| **L'Astrolabe sonne** · `rpg-astrolabe-sonne` | L'arène vire déjà au cuivre. Il manque **l'onde** : un anneau part de l'astrolabe, traverse la table, et chaque carte touchée s'incline d'un cran. La règle (les ennemis gagnent en puissance) se lit dans la propagation. | 900 ms · SVG + CSS | P1 · M |
| **Cinq PV** · `rpg-seuil-cinq` | À 5 PV ou moins, le décor ralentit (les boucles d'ambiance passent à 40 % de vitesse) et un battement de sable pulse au bord bas. Le jeu ne crie pas : il ralentit. | continu · CSS `animation-duration` | P1 · S |
| **Dernière carte** · `rpg-derniere-carte` | Une seule carte en main : elle se centre légèrement, la table se vide autour d'elle, et le bruit de fond baisse. Un silence de mise en scène, pas un effet. | 600 ms · CSS + audio | P2 · S |
| **Fin de série** · `rpg-serie-victoires` | Trois victoires d'affilée dans les Tours : les trois plateaux des étages gagnés s'empilent brièvement au fond, comme des strates. | 1,2 s · CSS | P2 · M |
| **Le duel repris** · `rpg-duel-reprise` | En PvP asynchrone, quand on rouvre une partie laissée la veille : les dernières actions rejouées en accéléré (un « résumé de ce que tu as manqué » de 2 s, sautable). | ≤ 2 s · WAAPI | P1 · L |

### I. Le mode Histoire

| Nom · id proposé | Ce qui se joue | Durée · technique | P · coût |
| --- | --- | --- | --- |
| **Chapitre qui tourne** · `rpg-chapitre-cycle` | Entre deux chapitres, l'astrolabe du récit fait un tour complet et les numéros de chapitre défilent comme des heures. | 1,2 s · CSS | P1 · S |
| **Le journal s'écrit** · `rpg-journal-plume` | Une ligne de journal s'écrit au rythme d'une plume (déjà partiellement dans `rpg-story-caret`) et le sceau de la Chambre des Heures se pose à la fin du paragraphe. | 600 ms · CSS | P2 · S |
| **Le choix pèse** · `rpg-choix-sceau` | Au moment d'un choix narratif, le sceau du chapitre s'abaisse sur l'option survolée avant validation. Le choix doit avoir un poids physique. | 260 ms · CSS | P1 · S |
| **La liste se raye** · `rpg-liste-rayee` | Un nom de la Dernière Liste est barré : le trait part de gauche à droite, l'encre bave, le nom reste visible en dessous. | 500 ms · SVG | **P0** · S |
| **Portrait d'entrée** · `rpg-portrait-entree` | Un personnage entre dans la scène : son portrait arrive du côté qui correspond au camp, avec le grain de la peinture qui se stabilise 200 ms. | 420 ms · CSS | P1 · S |

### J. Souk, collection, atelier

Le Souk a déjà la part belle (`rpg-souk-*` : sachet déchiré, sceau, mythe
éveillé). Ce qui manque est **la transaction** et **le rangement**.

| Nom · id proposé | Ce qui se joue | Durée · technique | P · coût |
| --- | --- | --- | --- |
| **L'achat** · `rpg-souk-achat` | Les pièces quittent la bourse, traversent l'écran et tombent sur le comptoir ; le paquet s'illumine et descend dans le sac. | 650 ms · WAAPI | P1 · M |
| **Solde insuffisant** · `rpg-souk-refus` | La bourse **refuse** : elle se ferme d'un coup sec, secoue la tête (2 px, 3 allers), et le prix clignote une fois. Un refus, pas une erreur rouge. | 300 ms · CSS | P1 · S |
| **Quête réclamée** · `rpg-quests-encaisse` | Le sceau de la quête se brise et les crédits filent vers la bourse. Il existe l'« appel » ; il manque l'encaissement. | 420 ms · CSS | P1 · S |
| **Doublon → sable** · `rpg-doublon-fonte` | Une carte en doublon se dissout en sable dans le compteur de poussière, avec le chiffre qui monte. | 500 ms · CSS | P2 · S |
| **La recette se compose** · `rpg-atelier-recette` | À l'atelier de decks, les cartes de la recette se posent une à une dans la fente du boîtier, qui se referme et affiche le deck complet. | 700 ms · CSS | P2 · M |
| **Le deck se range** · `rpg-deckbox-range` | Un deck validé glisse dans son boîtier sur l'étagère ; le boîtier prend la couleur de l'élément dominant. | 500 ms · WAAPI | P2 · M |
| **La collection s'ouvre** · `rpg-collection-album` | Ouvrir un set fait tourner les pages d'un album, les cartes manquantes restant en creux gris. | 450 ms · CSS | P2 · M |
| **Badge de nouveauté** · `rpg-nouveaute-pastille` | Une pastille « nouveau » qui s'éteint en se consumant quand on l'a vue. | 300 ms · CSS | P2 · S |

### K. PvP et social

| Nom · id proposé | Ce qui se joue | Durée · technique | P · coût |
| --- | --- | --- | --- |
| **L'attente** · `rpg-pvp-attente` | En attente d'adversaire : un sablier se retourne en boucle, mais **lentement** (4 s), avec un grain qui tombe à chaque tour. Rien qui donne l'impression que ça rame. | boucle 4 s · CSS | P1 · S |
| **Le coup arrive de loin** · `rpg-pvp-coup-distance` | Une action jouée par l'adversaire distante arrive avec une légère latence visuelle assumée : la fiche se pose 300 ms après le bandeau d'annonce, comme un courrier. | 300 ms · CSS | P1 · S |
| **Défi accepté** · `rpg-pvp-defi-accepte` | Le lien de défi cliqué s'ouvre en deux (le sceau se brise) et les deux plaques de duellistes se posent face à face. | 700 ms · CSS | P1 · M |
| **Reconnexion** · `rpg-pvp-resync` | Perte de liaison : la table se couvre d'un voile de sable **partiel** (on continue de voir la partie), et le voile se retire quand l'état est resynchronisé. Jamais un écran blanc. | 600 ms · CSS | **P0** · M |
| **Adversaire parti** · `rpg-pvp-abandon` | L'adversaire quitte : sa plaque se vide de son sable, la partie se fige proprement et propose la reprise. Une sortie propre vaut mieux qu'un message d'erreur. | 800 ms · CSS | P1 · S |
| **Invitation dans la messagerie** · `rpg-pvp-invitation` | Une invitation reçue dans la messagerie se présente comme un sceau fermé qui s'ouvre au survol. | 260 ms · CSS | P2 · S |

### L. Accessibilité et réglages

Ces trois-là ne sont pas des « bonus » : elles conditionnent la livraison de
tout le reste.

| Nom · id proposé | Ce qui se joue | Durée · technique | P · coût |
| --- | --- | --- | --- |
| **Réglage de vitesse** · `rpg-anim-vitesse` ✅ | Un réglage dans les options du jeu : ×0,5 · ×1 · ×2, appliqué par une variable `--rpg-anim-scale` sur les durées et les délais, et par `dureeAnimation()` sur les minuteurs JS. Indispensable pour les joueurs qui enchaînent les duels. Module pur `rpgAnimations.js`, carte « Animations de la table » (§5 decies). | — · CSS variable | **P0** · S |
| **Animations réduites (forcée)** · `rpg-anim-reduite` ✅ | Une case qui force le mode réduit **sans** dépendre de `prefers-reduced-motion` : fondu de 120 ms, état final immédiat, sons conservés. Bien des joueurs ignorent le réglage système. Classe `.is-reduced` sur la coquille, indépendante du système (§5 decies). | — · classe `is-reduced` | **P0** · S |
| **Mode lecture** · `rpg-mode-lecture` | Option « pas d'effets » qui remplace les animations par le journal de duel seul, en texte, avec les mêmes informations. Le Sablier doit rester jouable sur un vieux téléphone et pour qui ne supporte pas le mouvement. | — · rendu alternatif | P1 · M |

---

## 4. Le lot de la vertical slice (à faire en premier)

Dix animations, toutes **P0**, choisies pour couvrir les quatre moments qui
décident si le jeu accroche : l'ouverture, la lecture du tour, la perte de vie,
la fin.

| # | Animation | Pourquoi elle est dans le lot |
| --- | --- | --- |
| 1 | `rpg-duel-ouverture` | Première impression, une seule fois par partie |
| 2 | `rpg-main-eveil` | Rend le tour lisible en un regard |
| 3 | `rpg-astrolabe-grain` + `rpg-fin-de-tour-retourne` | Les deux gestes les plus répétés du jeu |
| 4 | `rpg-heures-grain` + `rpg-heures-derniere` | Mécanique signature aujourd'hui muette |
| 5 | `rpg-mana-maree` | La ressource la plus consultée |
| 6 | `rpg-ligne-de-charge` | Qui frappe qui, avant l'impact |
| 7 | `rpg-vie-ecoule` | La métaphore du jeu, sur l'élément le plus regardé |
| 8 | `rpg-carte-delitee` | Relie la destruction au sable, visuellement |
| 9 | `rpg-victoire-table` | La fin doit valoir le détour |
| 10 | `rpg-anim-vitesse` + `rpg-anim-reduite` | Sans elles, tout le reste est en dette d'accessibilité |

**Ordre de production conseillé** : le lot ci-dessus (≈ 8–10 jours), puis
`rpg-ville-sable-monte` et `rpg-ville-etage-perdu` (le monde, 4 j). Les deux
éléments muets (Sable et Ténèbres) sont livrés depuis octobre 2026 (§5 ter),
ainsi que les deux gestes de tour `rpg-fin-de-tour-retourne` et
`rpg-mana-maree` (§5 quater), le fil du Tribut `rpg-tribut-fil` (§5
quinques) et la ligne de charge `rpg-ligne-de-charge` (§5 sexies). La
vertical slice est désormais **soldée** : le rebond du contresort
`rpg-contresort-rebond` (§5 septies), la destruction en sable
`rpg-carte-delitee` (§5 octies), la scène de victoire `rpg-victoire-table`
(§5 nonies) et les deux réglages d'accessibilité `rpg-anim-vitesse` /
`rpg-anim-reduite` (§5 decies) ferment les dix postes du lot. Restent les
mots-clés (Cargaison, Traque, 2 j — le transfert de vie du Tribut passe
déjà par la balance, son tracé par le fil), puis le PvP (reconnexion et
attente, 2 j). Le reste (P2) au fil de l'eau.

---

## 5. Où coder quoi

| Type | Fichier | Convention |
| --- | --- | --- |
| Gestes de table et de cartes | `src/games/rpg-battle.css` (blocs existants) | `@keyframes rpg-<scène>-<geste>`, état dans une classe `is-*` |
| Effet autonome qui doit s'annuler | nouveau `src/games/rpg<Effet>.js`, sur le patron de `rpgMythicImpact.js` | retourne une fonction de nettoyage, `reduced` en paramètre |
| Décor et ambiance | `src/games/rpgTableScene.js`, `rpgTableSceneThemes.js` | une ambiance par plateau, aucun objet au-dessus des cartes |
| Écran de duel | `src/games/RpgDuelPage.jsx` | jamais de timer non annulé dans un `useEffect` ; `impactEcran` est le modèle d'événement ponctuel (jeton + variante) |
| Souk / atelier / PvP | `rpg-souk.css`, `rpg-deck-atelier.css`, `rpg-pvp.css` | les feuilles de scène existent déjà, ne pas en créer |
| Vérification | `scripts/rpg-battle-ui-check.mjs` (jsdom), `npm run check:rpg` | une animation ne doit rien changer à l'état du duel : le test est le garde-fou |

**Trois pièges à éviter**, appris des feuilles existantes :

1. **Ne jamais animer une propriété de mise en page** (`width`, `height`,
   `top`/`left` en dehors d'une couche absolue) : la table est déjà dense en
   `transform` et `opacity`, et un reflow au milieu d'un tour se voit.
2. **Ne pas empiler deux animations sur la même propriété** : la cinématique
   `card-lunge-*` a dû être déclarée en `.rpg-card.card-lunge-*` pour ne pas
   perdre contre le survol. Toute nouvelle animation de carte doit vérifier
   sa spécificité avant d'être ajoutée.
3. **Un timer qui n'est pas annulé est un bug de duel** : les `useEffect` du
   duel survivent au démontage de la page (changement d'onglet), et une
   animation orpheline qui écrit dans le DOM d'une partie terminée produit des
   effets fantômes. Le patron est celui de `rpgMythicImpact` : tout est
   annulable, tout est idempotent.

---

## 5 bis. Livré — la vie et les compteurs (octobre 2026)

Les cinq animations marquées ✅ ci-dessus sont codées, vérifiées et visibles
dans un aperçu interactif.

| Ce qui a été livré | Où |
| --- | --- |
| `PlaqueVie` — jauge de sable, bande d'or de la réserve, roulage du nombre, six grains, veille à 5 PV | `src/games/RpgVieCompteurs.jsx` |
| `CompteurCarte` — pose, perte d'un grain, gain, dernière Heure qui se fêle et veille | `src/games/RpgVieCompteurs.jsx` |
| Calculs purs (part de jauge, réserve, durée et courbe du roulage, variantes) | `src/games/rpgVieCompteurs.js` |
| Les deux animations, en CSS, avec leur version en mouvement réduit | `src/games/rpg-vie-compteurs.css` |
| Règles vérifiées | `tests/rpg-vie-compteurs.test.js` (`npm run check:rpg-vie-compteurs`) |
| Rendu jsdom réel | `scripts/rpg-vie-compteurs-check.mjs`, `scripts/rpg-vie-compteurs-smoke.jsx` |
| Aperçu interactif, sans navigateur à installer | `npm run preview:rpg-vie-compteurs`, `scripts/rpg-vie-compteurs-apercu.jsx` |

Trois décisions prises en codant, à garder pour la suite :

1. **Le chiffre vrai ne roule pas dans le DOM.** `.rpg-wizard-plate__hp-value`
   garde toujours la valeur exacte ; le roulage est un calque `aria-hidden`
   posé dessus. Les lecteurs d'écran, les tests et les captures lisent donc
   une vie juste, même au milieu du geste.
2. **L'horloge du roulage est celle de `requestAnimationFrame`**, prise à la
   première image. `performance.now()` d'un autre contexte part d'une autre
   origine : le roulage ne finissait jamais (bug attrapé par le rendu jsdom,
   qui a fait tomber le processus avant la correction).
3. **La dernière Heure est un état, pas une disparition.** Le moteur retire le
   compteur à zéro : on ne peut donc pas animer la chute du dernier grain.
   L'animation veille à **une** Heure restante — fêlure et liseré qui pulse —,
   ce qui prévient le joueur avant que l'effet ne tombe, sans mentir sur l'état.

---

## 5 ter. Livré — les deux signatures d'élément manquantes (octobre 2026)

Le Sable et les Ténèbres étaient les deux seuls éléments sans signature de table
(le jeu n'en compte que cinq ; Verre et Encre n'en sont pas). Les deux animations
sont codées, vérifiées et suivent exactement les patrons de la roue de feu et du
tourbillon d'eau.

| Ce qui a été livré | Déclencheur | Où |
| --- | --- | --- |
| `TempeteSable` — voile ocre, lame de poussière qui **descend** sur la carte (balayage vertical), érosion des bords, six grains qui retombent au sol | une blessure du journal dont `elements` contient `sable` (ex. *Tempête de sable*) | composant `TempeteSable` et état `tempetesSable` dans `RpgDuelPage.jsx`, `rpg-tempete-sable-*` dans `rpg-battle.css` |
| `TempeteSableZone` — tout un côté du plateau : nappe de poussière, mur qui descend du haut vers le bas avec son front clair, dix-neuf grains semés d'un bord à l'autre du côté | une blessure de sable dont la carte source vise une zone (`rpgSortViseUneZone`), pour **chaque camp frappé** | composant `TempeteSableZone` et état `tempetesSableZone` dans `RpgDuelPage.jsx`, `rpg-tempete-sable-zone-*` dans `rpg-battle.css`, ancrage `--rpg-frontiere` |
| `BalanceTenebres` — halo local, deux hiéroglyphes, fléau qui s'incline du côté qui perd des PV, cinq grains d'or qui traversent | le journal des transferts de vie : Tribut au contact et sorts « pesée » (`transfert`) | composant `BalanceTenebres` et état `balancesTenebres` dans `RpgDuelPage.jsx`, `rpg-balance-*` dans `rpg-battle.css` |
| Journal moteur des transferts, hors état JSON (`WeakMap`) | tout passage par `transfertVie` | `rpgNombreTransferts` / `rpgTransfertsDepuis` dans `rpgDuel.js` |
| Variantes `prefers-reduced-motion` (fondu supprimé, son et autres retours conservés) | — | bloc `prefers-reduced-motion` de `rpg-battle.css` ; la tempête n'est pas créée et la position du journal de transfert avance quand même |
| Vérifications | rendu jsdom réel, feuille et câblage | `scripts/rpg-tempete-sable-check.mjs`, `scripts/rpg-balance-tenebres-check.mjs` (`npm run check:rpg-tempete-sable`, `check:rpg-balance-tenebres`), tests moteur dans `tests/rpg-tenebres.test.js` |

Décisions prises en codant, à garder pour la suite :

1. **Le Sable se détecte comme la Braise.** Aucun changement du moteur n'est
   nécessaire : `rpgBlesserCreature` journalise déjà la couleur de la source, et
   `rpgLancerMagie` lui passe `cardColors(carte)`. La page relève
   `blessure.elements.includes('sable')` avec la même règle de fraîcheur que la
   roue de feu, pour ne pas rallumer une ancienne blessure à l'action suivante.
2. **La balance se branche sur un journal dédié, pas sur les soins.** Le journal
   des soins ne dit que le camp qui gagne ; le transfert nomme aussi celui qui
   perd. `transfertVie` est l'entonnoir unique du Tribut et des sorts de pesée,
   donc un seul journal alimente les deux. Un lot de transferts simultanés ne
   produit qu'**une** balance centrale (le calque ne dépend d'aucune position de
   carte, il est centré dans `.card-table`).
3. **Le Tribut au combat n'a pas de carte source** (`sourceCarteId: null`) :
   seule une pesée lancée depuis la main transmet sa carte. Le sens du fléau et
   le flux des grains (`--sens`) viennent du camp receveur, pas de la carte.
4. **Un sort de zone balaie le côté du plateau, pas une liste de cartes.** La
   portée est lue sur la carte que la blessure nomme (`sourceCarteId`) avec la
   fonction du moteur, exportée pour l'occasion (`rpgSortViseUneZone`) : la
   table ne peut pas se désynchroniser de la résolution. Le calque n'est ancré
   sur aucune carte — `--rpg-frontiere` (la même propriété typée que la découpe
   des peintures) le cale sur la moitié de table touchée, et le côté vient du
   camp des victimes (`blessure.cote`) : un sort qui inclut les alliés couvre
   les deux moitiés. Les créatures traversées n'ajoutent pas leur lame de
   carte : le mur les couvre déjà.

---

## 5 quater. Livré — le geste de fin de tour et la marée de mana (octobre 2026)

Deux gestes du cœur du tour, jusqu'ici muets : le bouton qui rend la main au
joueur et la recharge de la ressource la plus consultée. Tous deux sont des
effets purs — aucun état du duel n'en dépend —, restent sous la seconde,
uniquement en `transform`/`opacity`, et se réduisent à rien en mouvement réduit.

| Ce qui a été livré | Déclencheur | Où |
| --- | --- | --- |
| `rpg-fin-de-tour-retourne` — le libellé du bouton se retourne en 3D (rotateY 90° → −12° → 0, perspective 440 px, 480 ms) | chaque nouveau tour dont `tour === 'joueur'`, détecté par rapport au tour précédent | état `flipTourNeuf` / réf. `tourPrecedentFlipRef` et `timerFlipRef` dans `RpgDuelPage.jsx`, `rpg-fin-de-tour-retourne` dans `rpg-battle.css` |
| `rpg-mana-maree` — les orbes disponibles se rallument de gauche à droite en cascade (40 ms d'écart par emplacement, vague de 400 ms) | la réserve disponible **remonte** (`disponible` augmente), jamais quand elle descend, jamais au premier rendu | état `maree` / réf. `precedentDispoRef` et `timerMareeRef` dans `FluxManaTrack` (`RpgDuelPage.jsx`), `rpg-mana-maree` dans `rpg-mana-essai.css` |
| Index de cascade exposé à la feuille | chaque orbe pose `style={{ '--mana-slot': index }}` | `FluxManaTrack`, délai `calc(var(--mana-slot, 0) * 40ms)` |
| Variantes `prefers-reduced-motion` (geste supprimé, état et son conservés) | — | blocs `prefers-reduced-motion` des deux feuilles ; en outre `animationsReduites()` empêche le déclenchement côté React |
| Vérifications | rendu jsdom réel de la piste, feuilles et câblage | `scripts/rpg-mana-maree-check.mjs` + `-smoke.jsx`, `scripts/rpg-fin-tour-retourne-check.mjs` (`npm run check:rpg-mana-maree`, `check:rpg-fin-tour-retourne`), aussi en bout de chaîne `check:rpg-ui` |

Décisions prises en codant, à garder pour la suite :

1. **Le flip porte sur le libellé, jamais sur le bouton.** La classe
   `is-tour-neuf` est bien posée sur le `<button>`, mais la rotation s'applique à
   `<span class="rpg-btn--endturn__label">` (boîtier `inline-block`) qui
   entoure le texte. Les transform de survol, d'état désactivé et d'appui du
   bouton restent intacts : la règle de non-empilement sur une même propriété
   (§5, piège n°2) est respectée.
2. **L'effet de tour lit `duelRef.current`, sans tableau de dépendances.** C'est
   le même patron que les journaux de soins et de transferts : l'effet tourne à
   chaque rendu et compare lui-même le tour courant au précédent. Mettre
   `[duel.tour]` en dépendance plante au rendu — la constante `duel`
   (`const duel = duelRef.current`) est déclarée plus bas dans le corps du
   composant, donc encore dans sa zone morte temporelle quand le tableau est
   évalué. Toute nouvelle dépendance inline à `duel` est un piège du même ordre.
3. **La marée ne se lève que quand la réserve remonte.** Une dépense fait
   descendre `disponible` et ne doit rien déclencher ; la recharge du tour la
   fait remonter. Une référence mémorise la valeur du rendu précédent, initialisée
   à la valeur courante pour que le premier rendu reste silencieux. La vague
   s'applique aux deux camps, mais seuls les orbes `is-lit` bougent : les
   emplacements vides ou déjà dépensés ne participent pas. La durée (800 ms)
   couvre les dix orbes — 9 × 40 ms de décalage plus les 400 ms de la vague.
4. **Tout est annulable et idempotent**, selon le patron `rpgMythicImpact` :
   chaque minuteur est claironné au démontage de la page et dans le bloc de
   reset d'un duel neuf, qui réarme aussi les références (un nouveau duel
   n'hérite ni d'un flip ni d'une marée du précédent).

---

## 5 quinques. Livré — le fil de sable du Tribut (octobre 2026)

Le mot-clé Tribut n'existait que dans le texte des cartes : le transfert de vie
avait sa balance (§5 ter), mais rien ne disait quelle créature venait de
ponctionner le sorcier. Le fil relie désormais la créature collectrice à la
plaque qui paye, et trois grains d'or remontent le fil du payeur vers le
bénéficiaire. Geste pur, sous la seconde, en `transform`/`opacity`, annulable.

| Ce qui a été livré | Déclencheur | Où |
| --- | --- | --- |
| Journal moteur dédié, hors état JSON (`WeakMap`) : `{ entityId, cote, montant }` par contact au sorcier | `declencherTributs`, l'entonnoir unique du Tribut au combat (attaque groupée comme raccourci `rpgAttaquerSorcier`) | `tributsParDuel`, `rpgNombreTributs` / `rpgTributsDepuis` dans `rpgDuel.js` |
| `TributFil` — trait doré qui se tend (`scaleX`), trois grains qui remontent le fil (`translateX` de la longueur à 0, décalés de 60 ms) | la page relève les nouveaux Tributs après chaque rendu, **un fil par créature** | composant `TributFil`, état `filsTribut` et réf. `tributsDuelRef` dans `RpgDuelPage.jsx`, `rpg-tribut-fil*` dans `rpg-battle.css` |
| Géométrie figée à la capture : centre de la créature (`prendreInstantaneChamp`) vers le centre de la plaque adverse, longueur et angle calculés une fois | au relevé du journal, avant le rendu du calque | helper `geometrieFilTribut` dans `RpgDuelPage.jsx` |
| Variantes `prefers-reduced-motion` (filet statique, grains effacés ; le fil n'est même pas créé côté React) | — | bloc `prefers-reduced-motion` dédié et bloc global `!important` de `rpg-battle.css` ; garde `animationsReduites()` dans l'effet |
| Vérifications | moteur, rendu jsdom réel des deux camps, feuille et câblage | `tests/rpg-tenebres.test.js` (41 tests), `scripts/rpg-tribut-fil-check.mjs` + `-smoke.jsx` (`npm run check:rpg-tribut-fil`), aussi en bout de chaîne `check:rpg-ui` |

Décisions prises en codant, à garder pour la suite :

1. **Un journal jumeau de celui des transferts, pas une extension.** Le journal
   des transferts ne connaît que le camp qui reçoit la vie ; le fil a besoin de
   la créature source. Plutôt que d'alourdir son contrat (et la balance qui le
   lit), `tributsParDuel` enregistre `entityId` / `cote` / `montant`. Les sorts
   « pesée » passent par `transfertVie` sans créature source : ils ne peuvent
   pas entrer dans ce journal — un check garantit un seul appel de
   journalisation, dans `declencherTributs`.
2. **Div rotatif plutôt que SVG.** La proposition initiale parlait de SVG ; le
   fil est en fait un `div` absolu dont la rotation et la longueur sont figées
   en style inline, le trait s'anime en `scaleX` et les grains en
   `translateX(var(--fil-longueur))`. Aucune propriété de mise en page n'est
   animée (le piège n°1 du §5), et le même jeu de keyframes sert aux deux camps
   : seule la géométrie capturée change. Le `div` porte `transform-origin: 0 0`
   — sans lui, la rotation autour du milieu détachait le fil de la créature
   comme de la plaque sur tout Tribut diagonal (voir §5 sexies, décision
   4 bis).
3. **Le sens des grains suit la vie, pas l'attaque.** Le conteneur part de la
   créature et pointe vers la plaque ; les grains naissent à l'extrémité
   plaque (`translateX(longueur)`) et meurent à la créature (`translateX(0)`) :
   la vie quitte le payeur et arrive chez le bénéficiaire, dans les deux camps.
4. **La créature est garantie présente au relevé.** Un Tribut ne se déclenche
   que sur un contact au sorcier : une créature bloquée ne le touche pas, donc
   une créature qui ponctionne est toujours en vie et sur la table quand l'effet
   lit son `entityId`. Un défaut de géométrie (DOM absent) retombe sur le centre
   de la table au lieu de planter, comme les autres instantanés de champ.
5. **Minuteries et chien de garde, sur le patron de la balance.** Chaque fil a
   sa minuterie de 550 ms, toutes sont claironnées au démontage et au reset
   d'un duel neuf (qui réarme aussi la position de lecture), et un chien de
   garde fonde les fils fantômes quand une mise en veille d'onglet avale les
   minuteries.

---

## 5 sexies. Livré — la ligne de charge des attaques (octobre 2026)

L'attaque avait son bond (`fx-lunge`) et ses chocs, mais rien n'annonçait la
cible avant l'impact : il fallait lire le bond pendant qu'il arrivait. Juste
avant l'élan, un trait ocre se trace désormais du centre de l'attaquant vers sa
cible, dans les deux camps. Geste pur, sous la seconde, en `transform`/
`opacity`, sans aucune écriture moteur, annulable et invisible en mouvement
réduit.

| Ce qui a été livré | Déclencheur | Où |
| --- | --- | --- |
| `LigneCharge` — trait de sable qui se trace en 220 ms (`scaleX`) avec une pointe losange en tête, tient puis fond sur 420 ms de vie | les deux résolutions de combat locales (`resoudreAttaqueJoueur`, `resoudreAttaqueEnnemie`), **avant** `animerModificationsChamp` qui lance le bond | composant `LigneCharge`, état `lignesCharge` / réf. `chargeTimersRef` dans `RpgDuelPage.jsx`, `rpg-ligne-charge*` et keyframes `rpg-ligne-de-charge-*` dans `rpg-battle.css` |
| Géométrie figée sur l'instantané d'avant combat : centre de l'attaquant vers une créature ou la plaque du sorcier défenseur | une ligne par attaquant, cible = coup rapide désigné → premier bloqueur → plaque (dérivée de `combat.ciblesAttaque` et des `blocages` vivants) | helper `geometrieLigneCharge` et fonction unique `declencherLignesCharge` dans `RpgDuelPage.jsx` |
| Variantes `prefers-reduced-motion` (la ligne ne se trace pas ; le bond, le choc et les sons restent) | — | bloc `prefers-reduced-motion` dédié et bloc global `!important` de `rpg-battle.css` ; garde `animationsReduites()` à l'entrée du déclencheur |
| Vérifications | rendu jsdom réel des trois variantes (créature / plaque, deux camps), feuille et câblage, moteur vérifié vierge de tout visuel | `scripts/rpg-ligne-charge-check.mjs` + `-smoke.jsx` (`npm run check:rpg-ligne-charge`), aussi en bout de chaîne `check:rpg-ui` |

Décisions prises en codant, à garder pour la suite :

1. **Aucun changement moteur, contrairement au Tribut.** Le moteur sait déjà
   tout ce qu'il faut via l'objet `combat` : `ciblesAttaque` (coups rapides),
   les `blocages` revivants et, par défaut, la plaque du sorcier. La cible de
   chaque attaquant se dérive donc entièrement dans la page ; un check garantit
   que `rpgDuel.js` ne contient ni classe ni nom de la ligne. La règle « le
   moteur n'a aucun déclencheur visuel » reste intacte.
2. **Div rotatif, pas SVG, et ocre de sable, pas or.** Comme le fil du Tribut
   (§5 quinques, décision 2), la ligne est un `div` absolu dont la géométrie
   est figée en style inline et qui ne s'anime qu'en `scaleX` : zéro propriété
   de mise en page animée. Sa palette ocre (`#d6a854`, `rgba(240,215,154)`) la
   distingue volontairement de l'or des transferts de vie — deux fils ne se
   ressemblent pas sur la table.
3. **La ligne précède le bond sans jamais l'attendre.** Elle est tracée dans le
   même tick que le déclenchement de `fx-lunge` : les 220 ms de tracé se
   déroulent pendant l'amorce du mouvement, donc la lecture « qui frappe qui »
   précède l'impact sans ajouter de latence ni bloquer la moindre action. C'est
   un signal, pas une porte.
4. **La géométrie vient de l'instantané d'avant combat, pas d'un mesurage
   vivant.** `champAvantAttaque = prendreInstantaneChamp()` est déjà capturé
   avant la résolution ; le helper y lit les centres, ce qui garantit que la
   ligne part de la place de repos de la créature, jamais de sa position en
   plein bond. Un DOM absent retombe sur le centre de la table, comme pour le
   Tribut.
4 bis. **Le `div` tourne autour de son extrémité, pas de son milieu.** Le
   calque est posé à `left/top` = centre de l'attaquant, puis tourné ; sans
   `transform-origin: 0 0`, la rotation se fait autour du milieu du segment et
   le trait démarre à quelques centaines de pixels du combattant (≈ 372 px à
   droite et 256 px sous lui sur une attaque diagonale de 550 px), ce qui donne
   l'impression d'un trait qui balaie l'écran au lieu de relier deux cartes.
   Le fil du Tribut (§5 quinques) porte la même ancre, pour la même raison.
5. **Périmètre : les deux résolutions locales seulement.** Le combat PvP passe
   par des chemins d'état distants (`pvpRef`, intentions) où les cibles ne sont
   pas toutes présentes au moment du rendu ; la ligne y est simplement absente
   plutôt que risquée sur une géométrie incomplète. Le solo et la résolution
   locale, surfaces testables de la vertical slice, sont couverts des deux
   côtés de la table.
6. **Minuteries, chien de garde et reset, sur le patron de la balance.** Chaque
   ligne a sa minuterie de 420 ms, toutes sont claironnées au démontage et au
   reset d'un duel neuf, et un chien de garde fonde les lignes fantômes après
   une mise en veille d'onglet.

---

## 5 septies. Livré — le rebond du contresort (octobre 2026)

Le contresort n'existait que par sa bordure dorée : on lisait la réponse, pas
le choc. La fiche centrale du sort joué (`rpg-spell-played`) porte déjà sa
variante `--contre` quand l'annonce est une contre ; le geste est donc 100 %
CSS, sans nouveau composant ni écriture moteur. La fiche heurte la réponse,
s'écrase au centre (squash), repart vers l'origine du sort contré puis se
stabilise, orientée par une variable de sens `--rebond` (1 joueur, −1 sorcier).

| Ce qui a été livré | Déclencheur | Où |
| --- | --- | --- |
| Keyframes `rpg-contresort-rebond` (520 ms) : translation depuis le camp du répondant, aplati `scale(1.07, .91)` à l'impact, renvoi de 12 px, repos stable | la fiche `rpg-spell-played--contre`, variante posée par le JSX d'annonce `${contre ? ' rpg-spell-played--contre' : ''}` | règle `.rpg-spell-played--contre` et keyframes dans la zone FX gardée de `rpg-battle.css` |
| Sens selon le camp (`--rebond: 1` / `−1`), bordure dorée `rgba(255,206,110,.9)` conservée | variante `.rpg-spell-played--sorcier.rpg-spell-played--contre` | `rpg-battle.css` |
| Les sorts normaux gardent leur arrivée `rpg-spell-arrival` de 280 ms ; le rebond ne déborde jamais hors de la variante contre | — | règle `.rpg-spell-played` de base, hors zone FX |
| Mouvement réduit : arrivée instantanée, la bordure et le sur-titre suffisent | bloc `prefers-reduced-motion` et surcharge `.is-reduced` (§5 decies) | `rpg-battle.css` |
| Vérifications | keyframes sans propriété de layout, sens des deux camps, périmètre limité à la variante, moteur vierge | `scripts/rpg-contresort-rebond-check.mjs` (`npm run check:rpg-contresort-rebond`), en bout de chaîne `check:rpg-ui` |

Décisions :

1. **Aucun composant nouveau.** L'habillage de l'annonce existe déjà ; seul un
   jeu d'images clés dédié remplace l'arrivée tranquille de la fiche, et la
   règle de base (les autres sorts) reste inchangée.
2. **Le squash raconte le choc, pas le dégât.** L'aplatissement puis le renvoi
   signalent la collision et le reflux du sort ; la fiche se stabilise à
   `transform: none`, donc ses informations restent lisibles jusqu'à sa
   disparition programmée.
3. **Transform et opacity seulement, comme tout le lot.** Aucune propriété de
   mise en page n'est animée ; le moteur ne contient ni la classe ni le nom du
   rebond, vérifié par le check.

## 5 octies. Livré — la destruction qui redevient du sable (octobre 2026)

Une carte détruite s'évaporait vers le haut, à l'envers de la métaphore du jeu :
au Sablier, la destruction **rend du sable**, qui tombe et s'accumule au sol.
Le fantôme de destruction existant (`FantomeCarteDetruite`) gère déjà la
géométrie, le cycle de vie et la variante Braise. Le délitement est un calque
frère, douze grains qui s'échappent en éventail et tombent, réservé aux morts
génériques.

| Ce qui a été livré | Déclencheur | Où |
| --- | --- | --- |
| Calque `.rpg-carte-delitee` (absolu, `z-index: 54` sous le fantôme, `pointer-events: none`, `overflow: visible`) portant douze grains `.rpg-carte-delitee__grain` | rendu seulement pour une mort générique : `{!prise && !effet.bruleeParBraise && (…)}` — ni la prise en cale d'Abordage ni la combustion Braise ne font tomber de grains | composant du fantôme dans `RpgDuelPage.jsx`, styles dans `rpg-battle.css` |
| Chute de 700 ms en `transform`/`opacity`, courbe qui accélère comme une pesanteur ; chaque grain porte ses variables figées `--gx` (départ en %), `--dx/--dy` (chute en px) et `--d` (décalage en ms) | `GRAINS_DELITEMENT` (tableau `Object.freeze` de douze jeux de coordonnées), `GRAINS_DELITEMENT.map(...)` | keyframes `rpg-carte-delitee-grain` dans `rpg-battle.css`, paramètres dans `RpgDuelPage.jsx` |
| Le fantôme générique se tasse désormais vers le bas (`translate: 0 10px`) au lieu de s'évaporer ; la cinématique Braise (`rpg-card-burn`) reste intacte | keyframes `rpg-card-destroy` modifiée dans son seul état final | `rpg-battle.css` |
| Mouvement réduit : aucun grain (opacité 0), la carte disparaît sans chute ; le bloc global `!important` couvre aussi le calque | blocs `prefers-reduced-motion` dédié et global, surcharge `.is-reduced` | `rpg-battle.css` |
| Vérifications | rendu jsdom réel (douze grains, géométrie et variables), feuille, garde « ni prise ni Braise », moteur vierge de `rpg-carte-delitee` et de `GRAINS_DELITEMENT` | `scripts/rpg-carte-delitee-check.mjs` + `-smoke.jsx` (`npm run check:rpg-carte-delitee`), en bout de chaîne `check:rpg-ui` |

Décisions :

1. **Un calque frère, pas une variante du fantôme.** Le fantôme conserve son
   cycle de vie et sa géométrie capturée ; le délitement s'y superpose en
   reprenant exactement `left/width/height`, puis laisse les grains déborder
   (`overflow: visible`) jusqu'au plateau.
2. **Des particules CSS, pas un canvas.** La fiche catalogue envisageait un
   canvas léger ; douze grains en `transform`/`opacity`, paramétrés par des
   variables inline figées à la création, suffisent et restent dans la règle
   « aucune propriété de mise en page animée ».
3. **Le sable n'apparaît que sur une vraie mort.** Une carte prise en cale
   repart chez son capteur, une carte Brûlée par la Braise a ses flammes :
   forcer des grains dans ces deux cas mentirait sur ce qui arrive à la carte.
4. **Chute vers le bas, jamais vers le haut.** L'ancienne évaporation
   (`translate: 0 -20px`) est supprimée ; l'état final du fantôme et la chute
   des grains vont dans le même sens, celui du sable qui se dépose.

## 5 nonies. Livré — la victoire se joue sur la table (octobre 2026)

La fin de partie basculait directement sur le panneau de bilan, sans dernier
plan sur la table. Désormais, dès que le moteur connaît le vainqueur, la table
le nomme et se met en scène : le camp perdant s'affaisse et pâlit comme du
sable qui se dépose, l'Astrolabe se fige sur « DUEL TERMINÉ » et le bilan
s'ouvre par-dessus sans couper l'image. Presque aucun JS : un seul attribut
pilote toute la scène.

| Ce qui a été livré | Déclencheur | Où |
| --- | --- | --- |
| Attribut `data-vainqueur` sur `.card-table` (posé avec `data-territoire-termine`), sans nouvel état ni porte | le moteur continue de décider seul via `rpgVainqueur(duel)` ; la page ne fait que relayer son résultat | `RpgDuelPage.jsx` |
| Camp vaincu : affaissement d'une seconde (`rpg-victoire-sable`, fin `opacity: .22`, `translateY(12px) scale(.96)`), le gagnant reste en place | sélecteurs `.card-table[data-vainqueur="…"] .card-row--…` / `.rpg-wizard-plate--…` pour les deux camps | `rpg-battle.css`, zone FX de la victoire |
| Astrolabe figé en 550 ms (`rpg-victoire-indicateur`, libellé « DUEL TERMINÉ ») et bilan en panneau borné (480 ms + 120 ms de silence de mise en scène), voile plein cadre pour la défaite | `.rpg-turn-indicator.is-finished`, `.rpg-overlay--win` / `--loss` ; le centrage `translate(-50%,-50%)` du panneau de victoire reste assuré par sa règle statique | `rpg-battle.css` |
| Mouvement réduit : pas d'affaissement, une atténuation statique `opacity: .35` désigne le vaincu ; le bilan ne fait pas d'entrée en scène | bloc `prefers-reduced-motion` dédié et surcharge `.is-reduced` (fondu de 120 ms pour les panneaux) | `rpg-battle.css` |
| Vérifications | attributs et libellé, keyframes sans propriété de layout, deux camps, centrage conservé, moteur vérifié vierge de `data-vainqueur` et de `rpg-victoire` | `scripts/rpg-victoire-table-check.mjs` (`npm run check:rpg-victoire-table`), en bout de chaîne `check:rpg-ui` |

Décisions :

1. **Un attribut, pas un état React de scène.** `data-vainqueur` est le seul
   fil posé côté JSX ; toute la mise en scène découle de sélecteurs CSS
   attribués, ce qui garde la fin purement déclarative et le moteur intact.
2. **Le bilan passe par-dessus, jamais à la place.** Le panneau de victoire est
   borné et centré, le plateau final (créatures, compteurs, main) reste visible
   autour ; aucune porte, le panneau garde la main et le centrage par sa règle
   structurelle, pas seulement par ses images clés.
3. **Une seconde, pas plus.** L'affaissement tient en 1 s et tout est en
   `transform`/`opacity` : la fin vaut le détour sans ralentir la lecture du
   bilan ni la relance d'un duel.

## 5 decies. Livré — les réglages d'animation, vitesse et mode réduit forcé (octobre 2026)

Les deux derniers postes P0 de la vertical slice ferment sa dette
d'accessibilité. Un module pur (`src/games/rpgAnimations.js`, sans React) porte
deux préférences persistées sur l'appareil, sur le même modèle que le son : un
accès `localStorage` tolérant qui ne plante pas en navigation privée ou dans
une iframe restrictive.

| Ce qui a été livré | Déclencheur | Où |
| --- | --- | --- |
| **Vitesse ×0,5 / ×1 / ×2** : catalogue figé `RPG_VITESSES_ANIMATION` (lente `0.5`, normale `1`, rapide `2`), exposé à la feuille via `--rpg-anim-scale` sur la coquille `.rpg-battle` et aux minuteurs via `dureeAnimation(ms)` | commande segmentée de la carte « Animations de la table », chaque choix écrit `letsplay_sablier_anim_vitesse_v1` | `rpgAnimations.js`, `RpgDuelPage.jsx`, styles `rpg-settings__segment*` dans `rpg-battle.css` |
| Toutes les durées **et tous les délais** de la slice consomment la variable (`calc(<durée> * var(--rpg-anim-scale, 1))`), y compris les cascades `--d` et le décalage de la marée de mana | la variable est héritée de la coquille par toute la table, la barre d'actions comprise | `rpg-battle.css`, `rpg-mana-essai.css` |
| Les six minuteurs JS passent par `dureeAnimation(...)` (marée, balance, tribut, ligne de charge, flip de tour, tempête), avec plancher de 16 ms, pour rester calés sur la durée réellement affichée | à l'ordonnancement de chaque effet, nettoyage et `expireA` utilisant la même valeur | `RpgDuelPage.jsx` |
| **Mode réduit forcé** : case `rpg-anim-reduite` indépendante de `prefers-reduced-motion` ; `rpgAnimationsReduites(force)` = préférence joueur **OU** préférence système. La coquille prend `.is-reduced`, la table `data-anim-reduite` | le toggle écrit `letsplay_sablier_anim_reduite_v1` ('on'/'off') | `rpgAnimations.js`, `RpgDuelPage.jsx` |
| En `.is-reduced` : fondu opacité de 120 ms sans délai pour les panneaux de fin, gestes et particules coupés (`animation: none`), état final immédiat ; aucun `display: none`, l'information reste là, et **les sons ne changent pas** (l'audio vit en JS) | keyframes `rpg-fondu-reduit` et bloc `.rpg-battle.is-reduced` en fin de zone FX | `rpg-battle.css` |
| Valeurs illisibles ramenées à ×1, stockage absent sans erreur, états initialisés depuis les préférences | `readRpgVitessePref` / `readRpgReducedPref` avec replis | `rpgAnimations.js` |
| Vérifications | tests unitaires du module avec `window` factice (vitesses, persistance, replis, mode réduit, tolérance au stockage), câblage page, consommation de la variable sur durées et délais, bloc `.is-reduced`, styles de réglages, moteur vérifié vierge de tout réglage visuel | `scripts/rpg-animation-reglages-check.mjs` (`npm run check:rpg-animation-reglages`), en bout de chaîne `check:rpg-ui` |

Décisions :

1. **La variable est posée sur la coquille `.rpg-battle`, pas sur la table.**
   La barre d'actions et le bouton de fin de tour vivent hors de `.card-table`
   mais dans la coquille : c'est le seul périmètre dont héritent à la fois la
   table et le chrome, donc le seul qui scale vraiment tout le geste.
2. **La vitesse agit deux fois, sinon elle ment.** Scaler les seules durées CSS
   laisserait les minuteurs JS sur leur durée nominale, et le nettoyage couperait
   un geste encore visible à ×2 (ou attendrait après une fin à ×0,5). Chaque
   minuteur de la slice passe donc par `dureeAnimation`, sur le timer comme sur
   la date de péremption `expireA`.
3. **Le mode réduit n'est pas la vitesse nulle.** Il ne met pas les durées à
   zéro : il ne fait pas naître les effets à spawn (garde JS existante
   `animationsReduites()`), et pour les scènes CSS-only remplace le geste par un
   fondu de 120 ms ou une atténuation statique. Les deux réglages restent
   orthogonaux, et les bruitages sont conservés dans tous les cas.
4. **Un module pur, testable sans DOM.** Toute la logique de préférence et de
   calcul de durée est hors de React, importable et testable avec un `window`
   factice ; la page ne fait que lire, écrire et relayer. Le moteur (`rpgDuel.js`)
   reste strictement vierge de tout nom de réglage ou de classe visuelle.

---

## 6. Annexe — récapitulatif

| Scène | Nombre d'idées | Dont P0 |
| --- | --- | --- |
| A. Table et ville | 6 | 2 |
| B. Mise en place | 6 | 2 |
| C. Lecture du tour | 8 | 5 |
| D. Cartes sur la table | 10 | 4 |
| E. Éléments et sorts | 8 | 3 |
| F. Combat et plaques | 9 | 4 |
| G. Mots-clés | 6 | 1 |
| H. Moments forts | 5 | 0 |
| I. Histoire | 5 | 1 |
| J. Souk et collection | 8 | 0 |
| K. PvP et social | 6 | 1 |
| L. Accessibilité | 3 | 2 |
| **Total** | **80** | **25** |

---

## 7. Ce qu'on ne fera pas (et pourquoi)

- **Des animations de parade ou d'esquive.** Le jeu est sans réflexes : une
  fenêtre de timing, même décorative, enverrait le mauvais signal.
- **Du plein écran à chaque sort.** `rpg-screen-shake-*` existe et suffit ;
  au-delà, on fatigue le joueur et on casse la lecture de la table.
- **Des vidéos ou du Lottie.** Poids, hors-ligne, coque Electron, APK : trois
  raisons de rester en CSS/SVG/canvas.
- **Des animations qui retardent le tour adverse.** Le PvP est asynchrone :
  une animation longue chez l'un ne doit jamais bloquer la décision chez
  l'autre.
- **Un effet par carte.** 500 cartes × un effet = 500 effets à maintenir. Les
  effets suivent l'**élément**, le **rang**, la **famille de sort** et le
  **mot-clé** — quatre axes, pas cinq cents cas.
