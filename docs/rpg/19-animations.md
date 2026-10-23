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
d'Heures**, la **plaque de vie**, les **sites persistants**, les éléments
**Sable / Ténèbres / Verre / Encre**, les mots-clés **Tribut, Cargaison,
Traque, Butin**, et **toute la respiration de la ville** entre deux duels.

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
| **Le sablier se retourne** · `rpg-fin-de-tour-retourne` | Le bouton « Fin du tour » se retourne en 3D (rotation Y, 240 ms) et devient la pastille dorée du tour suivant. Le geste le plus répété de la partie doit être le plus satisfaisant. | 480 ms · CSS `rotateY` | **P0** · S |
| **Les Heures s'égrènent** · `rpg-heures-grain` ✅ | Un compteur d'Heures perd une unité : un grain traverse le losange, le verre s'éclaire et le chiffre repart. Chaque coup rejoue son geste, même deux coups rapprochés (variantes a/b). Aujourd'hui c'est un changement de texte. | 420 ms · CSS | **P0** · S |
| **La dernière Heure** · `rpg-heures-derniere` ✅ | À **une** Heure restante, le verre se fêle et un liseré pulse : le joueur sait que l'effet tombe au prochain tour sans lire le journal. Le moteur retirant le compteur à zéro, la chute du dernier grain ne peut pas s'animer — l'état de veille la remplace. | 2 s en boucle · CSS | **P0** · S |
| **La marée de mana** · `rpg-mana-maree` | Au début du tour, les pastilles de mana se remplissent **une par une**, de gauche à droite, avec une petite vague ; le débordement au-delà du plafond ondule au lieu de clignoter. Réutilise `rpg-flux-icone-allumee`. | 45 ms × n · CSS | **P0** · S |
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
| **La destruction est du sable** · `rpg-carte-delitee` | Une carte détruite ne s'évapore pas : elle se délite en grains, et les grains **tombent sur le sol du plateau** (là où le sable s'accumule, cf. mécanique d'origine). Le cimetière se remplit visuellement. | 700 ms · canvas léger ou CSS | **P0** · M |
| **Défausser** · `rpg-defausse` | Une carte défaussée glisse en biais, se retourne et rejoint le cimetière ; le compteur du cimetière encaisse. | 300 ms · WAAPI | P1 · S |

### E. Les éléments et les sorts

Braise, Eau, Foudre, Neige et le soin ont leur signature. **Sable, Ténèbres,
Verre et Encre n'en ont pas** — et ce sont eux qui portent l'histoire.

| Nom · id proposé | Ce qui se joue | Durée · technique | P · coût |
| --- | --- | --- | --- |
| **Sable — l'érosion** · `rpg-sort-sable` | Une lame de poussière traverse la carte visée, qui se retrouve érodée (bord mangé, texture). Le sable retombe et **reste** au sol 1 s : c'est la ressource qui tombe. | 750 ms · SVG + CSS | **P0** · M |
| **Ténèbres — la lumière se retire** · `rpg-sort-tenebres` | La zone s'assombrit en vignette locale (jamais l'écran), puis **la balance penche** : le fléau s'incline du côté qui perd des PV. Deux hiéroglyphes s'allument. Référence directe au set Balance des Heures. | 800 ms · CSS + SVG | **P0** · M |
| **Verre — l'éclat** · `rpg-sort-verre` | La carte se fend en prismes, la lumière se diffracte, les éclats partent vers le cimetière. Le Verre est le camp de Fériel et Yamina : il doit être **beau**, pas agressif. | 700 ms · CSS + clip-path | P1 · M |
| **Encre — le nom s'efface** · `rpg-sort-encre` | Une coulure noire descend sur la carte et efface **le nom** avant le reste (l'axe narratif du jeu : ce qui n'a plus de nom n'existe plus). Le plus fort du catalogue, à réserver aux sorts d'Encre. | 900 ms · SVG masque + CSS | P1 · M |
| **Magie Rapide / Sorcellerie** · `rpg-famille-geste` | Deux gestes distincts, pas deux couleurs : la Magie Rapide **part** (trait latéral, 180 ms) ; la Sorcellerie **se prépare** (cercle qui se trace, 450 ms). `SortSigil` donne le signe, il manque le mouvement. | 180 / 450 ms · CSS | P1 · M |
| **Contresort** · `rpg-contresort-rebond` | Le sort adverse heurte la réponse, se replie sur lui-même et repart. Aujourd'hui une bordure dorée suffit à le dire ; l'animation le rendrait **mémorable**. | 520 ms · CSS | P1 · M |
| **Écho** · `rpg-sort-echo-vague` | La seconde vague d'un sort à écho (Nuage de cendres) repart de la première, comme une marée qui revient, avec sa propre couleur. | 400 ms · CSS | P1 · S |
| **Critique** · `rpg-crit-temps` | Un critique ne secoue pas plus fort : il **ralentit** 120 ms, la carte visée marque une tache d'encre, le chiffre éclate en deux puis se recompose. Le rare se joue au tempo, pas au volume. | 420 ms · WAAPI | **P0** · S |

### F. Le combat et les plaques

| Nom · id proposé | Ce qui se joue | Durée · technique | P · coût |
| --- | --- | --- | --- |
| **La vie est du sable** · `rpg-vie-ecoule` ✅ | La nappe de sable derrière le chiffre descend à la nouvelle part de vie, le chiffre **roule** jusqu'à sa nouvelle valeur et six grains quittent la plaque. C'est la métaphore fondatrice du jeu, appliquée là où on la regarde. | 420–780 ms · CSS + rAF | **P0** · S |
| **La vie revient** · `rpg-vie-remonte` ✅ | Un soin fait remonter la nappe de sable et l'allume par le haut, le chiffre roule vers le haut. Même geste, sens inverse : on lit le soin sans lire le chiffre. | 540 ms · CSS + rAF | P1 · S |
| **Au-delà de 25** · `rpg-vie-reserve` ✅ | La vie tenue dépasse le maximum d'origine : une **bande d'or** s'ouvre au-dessus du trait des 25 PV. La règle « la vie peut dépasser 25 » devient visible. | 420 ms · CSS | P1 · S |
| **Déclaration d'attaque** · `rpg-ligne-de-charge` | Avant le bond, une ligne de sable se trace de l'attaquant à sa cible. Le joueur voit **qui** frappe **qui** avant l'impact, pas pendant. | 220 ms · SVG | **P0** · S |
| **Blocage** · `rpg-blocage-etincelle` | Une flèche de blocage existe ; à l'impact, elle produit une étincelle et la carte bloqueuse recule d'un pixel. Le blocage doit se _sentir_ dans la carte, pas seulement dans le chiffre. | 260 ms · CSS | P1 · S |
| **Dégâts cumulés** · `rpg-degats-cumul` | Plusieurs sources dans le même combat : les chiffres flottants s'additionnent au lieu de se chevaucher, le total reste 300 ms puis s'efface. Lisibilité pure. | 600 ms · CSS | P1 · S |
| **Héros à zéro** · `rpg-heros-brise` | Un héros tombe : son portrait se fêle (verre), la carte reste sur la table en grisé **sans animation de disparition**. Au Sablier on ne meurt pas spectaculairement : on cesse d'être lisible. | 800 ms · CSS | **P0** · M |
| **Victoire** · `rpg-victoire-table` | Le camp gagnant reste, l'autre s'efface en sable ; l'Astrolabe s'arrête sur le tour exact de la victoire. Le bilan s'ouvre **par-dessus**, sans couper la scène. | 1,2 s · CSS + WAAPI | **P0** · M |
| **Égalité** · `rpg-egalite-sabliers` | Match nul : les deux sabliers du HUD s'arrêtent ensemble, un grain tombe de chaque côté au même instant. Une égalité doit avoir sa propre image, sinon elle ressemble à un bug. | 700 ms · CSS | P1 · S |

### G. Les mots-clés des sets récents

Chaque mot-clé doit avoir **un geste**, sinon il n'existe que dans le texte de
la carte. Abordage en a déjà un (`rpg-abordage-*`) : les autres attendent.

| Nom · id proposé | Ce qui se joue | Durée · technique | P · coût |
| --- | --- | --- | --- |
| **Tribut** · `rpg-tribut-fil` | Un fil de sable relie le payeur au bénéficiaire, les PV voyagent le long du fil et **arrivent** chez l'autre. Ténèbres, set Balance des Heures. | 550 ms · SVG + CSS | **P0** · M |
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
| **Réglage de vitesse** · `rpg-anim-vitesse` | Un réglage dans les options du jeu : ×0,5 · ×1 · ×2, appliqué par une variable `--rpg-anim-scale` sur les durées et les délais. Indispensable pour les joueurs qui enchaînent les duels. | — · CSS variable | **P0** · S |
| **Animations réduites (forcée)** · `rpg-anim-reduite` | Une case qui force le mode réduit **sans** dépendre de `prefers-reduced-motion` : fondu de 120 ms, état final immédiat, sons conservés. Bien des joueurs ignorent le réglage système. | — · classe `is-reduced` | **P0** · S |
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
`rpg-ville-sable-monte` et `rpg-ville-etage-perdu` (le monde, 4 j), puis les
quatre éléments manquants (Sable, Ténèbres, Verre, Encre, 6 j), puis les
mots-clés (Tribut et Cargaison d'abord, 3 j), puis le PvP (reconnexion et
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
