# Jeu de plateforme 2D — document de concept

**Statut : v0.2 — concept validé.** Les quatre arbitrages sont pris (voir §11) :
l'histoire est **L'Arcade Éternelle**, la direction artistique le **cel-shadé
animé**, et les cartes servent à la fois de **clés** et de **collection à deck
équipé**. Le détail (monde 1 salle par salle, 45 cartes, boss, technique) est
dans **`DESIGN-ARCADE-ETERNELLE.md`** — c'est le document de référence pour la
suite. Ce document-ci reste le « pourquoi » ; les points marqués « ⛔ à
trancher » ci-dessous sont les arbitrages déjà rendus.

Objectif : un **jeu de plateforme 2D, animation style manga**, à stages
complexes — on cherche des objets pour ouvrir la voie, on tue des ennemis, on
trouve des cartes à collectionner. Il vivrait dans `src/games/`, à côté de
Mirage Rush et Vice City Rush, avec sa page, ses succès, sa sauvegarde de compte
et son mode au doigt.

---

## 1. L'idée en une phrase

> **Un platformer d'action 2D dessiné comme un anime, où chaque carte trouvée
> est à la fois une pièce de collection et une clé qui ouvre le monde.**

Les trois envies du projet se répondent au lieu de s'ajouter :

| Envie | Réponse de design |
| --- | --- |
| Stages complexes à explorer | Salles interconnectées, 3 chemins par stage, secrets à 3 niveaux |
| Trouver des objets pour avancer | **Les cartes elles-mêmes ouvrent les portes** (double saut, grappin, bombe…), plus quelques objets d'énigme locaux (fusible, clé, levier) |
| Ennemis, combats | Combat au corps-à-corps + tir d'encre, 6 archétypes d'ennemis, boss en 3 phases |
| Cartes à collectionner | Classeur de 45 cartes (12 pouvoirs + 33 légendes), raretés, cartes animées, doublons recyclables |

---

## 2. Trois pistes d'histoire (✅ **Piste A retenue**)

> **Choix validé : « L'Arcade Éternelle ».** Les trois pistes restent décrites
> ci-dessous, pour mémoire et parce que B et C peuvent revenir sous forme de
> mondes ou d'extensions.

### Piste A — « L'Arcade Éternelle » (méta, nostalgie) — **RETENUE**
Une grande salle d'arcade abandonnée. Une entité — **le Brouilleur**, faite de
neige cathodique et de bandes magnétiques — efface les jeux de la mémoire des
joueurs. Le héros entre dans les bornes et rejoue les mondes qu'on oublie :
un désert 8 bits, un dojo de sabre, une ville de néon et de mechas, un ring de
combat des années 90…

- **Les cartes** = des fragments de mémoire de jeux perdus. Chaque carte
  retrouvée rallume une machine.
- **Ton** : nostalgique, chaleureux, un peu drôle. Un hommage, ce qui colle
  parfaitement à l'ADN de l'émission.
- **Force** : chaque monde peut avoir **sa propre direction artistique** (pixel
  art, cel-shadé, ukiyo-e…) sans jamais casser la cohérence — le hub les relie.
- **Risque** : le côté « pastiche de jeux connus » peut diluer l'identité.

### Piste B — « Qarin » (originale, manga + Maghreb) — *ma préférence*
Un **qarin** est, dans la tradition arabe, le double invisible qui accompagne
chacun. Ici, celui d'un adolescent de la ville s'est réveillé dans un vieux jeu
de cartes qu'il a trouvé au marché aux puces. Le quartier se déforme : les toits
de la casbah deviennent des plateformes, le tramway un rail aérien, le
bazar une salle des coffres. **Un collectionneur sans visage veut compléter son
deck — avec les âmes des habitants.**

- **Les cartes** = les esprits des lieux et des gens. Chaque carte trouvée
  redonne un morceau du quartier.
- **Direction artistique** : manga cel-shadé, mais avec la lumière et les motifs
  d'ici — zellige, moucharabieh, crépuscules ocre, calligraphie dans les menus
  (et des onomatopées en arabe **et** en japonais, clin d'œil assumé).
- **Force** : une vraie identité, personne ne fait ça. C'est le jeu que
  *Let's Play* serait le seul à pouvoir sortir.
- **Risque** : demande un travail d'écriture plus fin (respect de la culture,
  pas de folklore de carte postale).

### Piste C — « Studio Zéro » (méta, l'émission)
L'émission est détournée en direct : le plateau, les régies, les archives
deviennent des niveaux. Le héros est le stagiaire. Les cartes = les épisodes.

- **Force** : intégration totale à la marque, humour maison, décors déjà connus.
- **Risque** : très « private joke » ; difficile de faire rêver quelqu'un qui
  découvre le site.

### Combinaison recommandée
**Piste B pour l'univers et les personnages + structure de la A** (un hub, des
mondes-portails aux ambiances très différentes). On garde l'originalité
culturelle de Qarin et la liberté visuelle de l'arcade.

### Titres candidats
| Titre | Pourquoi |
| --- | --- |
| **QARIN** | Court, mystérieux, unique au monde, se retient |
| **CARTES OUBLIÉES** | Dit tout le concept en deux mots |
| **ENCRE VIVE** | Évoque le dessin manga, le mouvement, la vie |
| **L'ARCADE ÉTERNELLE** | Nostalgie pure, accroche les 30-45 ans |

---

## 3. Direction artistique (✅ **Option 1 retenue**)

### Option 1 — Cel-shadé « anime » (recommandé) — **RETENUE**
L'objectif n'est pas « un jeu en 2D » mais **« un épisode qui s'anime sous les
doigts »** :

- **Aplats francs, contour d'encre noir, ombre en 2 tons** (1 ton + 1 réserve).
- **Animation « sur les deux » (12 images/s) pour les personnages, 60 ips pour
  tout le reste** (caméra, poussière, particules). C'est *le* détail qui fait
  qu'un jeu ressemble à un anime : le mouvement à l'écran reste fluide, mais le
  personnage garde le « stop » du dessin animé.
- **Trames de manga (screentone)** pour les ombres d'ambiance, appliquées en
  shader ou par motif de points.
- **Effets d'impact** : 2 images de flash blanc (ou noir), « smear frame »
  étirée sur la frappe, traits de vitesse radiaux sur les dashs.
- **Onomatopées dessinées dans le monde** — *ZAN !*, *DOON !*, *TAK TAK* — et
  **plaques de nom** pour les boss (« LE GARDIEN DU PORTAIL »), comme un jeu de
  combat.
- **Transitions au pinceau** : un coup de rouleau d'encre qui balaie l'écran
  entre deux salles (le site a déjà un balayage d'encre pour le thème clair —
  même vocabulaire graphique).
- **Menus manga** : le HUD est tracé à la main, le journal est un carnet.

### Option 2 — Pixel art 16 bits « manga »
Mega Man Zero / Ninja Gaiden : 32-48 px, palette réduite, sprites à la main.
Moins cher à produire, lecture immédiate, nostalgie forte.

### Option 3 — Encres et trames, haut contraste
Noir et blanc sale + une couleur d'accent (rouge sang ou encre bleue), très
stylisé, à la Gris/Okami. Superbe, mais c'est une direction d'art sur mesure :
le plus long des trois à tenir sur 12 stages.

> **Recommandation : Option 1.** C'est la seule qui réponde littéralement à
> « style d'animation 2D manga », et elle se marie bien avec un rendu par code
> (formes vectorielles + aplats), donc testable et modifiable sans banque
> d'images externe — la convention actuelle du dépôt.

---

## 4. Le cœur du jeu

### 4.1 La boucle
**Entrer → comprendre la salle → se battre ou l'éviter → trouver ce qui manque
→ ouvrir → nouvelle salle → récompense (carte) → rejouer ailleurs avec le
nouveau pouvoir.**

Trois moteurs de motivation s'emboîtent :

1. **La curiosité** : la salle suivante, le secret derrière la grille.
2. **La collection** : il me manque 4 cartes sur 12 dans ce monde.
3. **La maîtrise** : ce passage est trop dur *maintenant*, pas dans 20 minutes.

### 4.2 Le moveset (listé dans l'ordre d'obtention)

**De base, dès la première minute** : courir, sauter (hauteur variable : on
relâche tôt = saut court), attaque au corps-à-corps 3 coups, attaque en l'air,
saut contre le mur, accrochage de rebord, traverser les plateformes fines en
bas.

**Débloqué par les cartes** (chaque ligne = une capacité *et* une serrure) :

| Carte-Pouvoir | Capacité | Ce que ça ouvre |
| --- | --- | --- |
| Carte du Vent | Double saut | Gouffres larges, vides verticaux |
| Carte de l'Encre | Dash au sol et en l'air | Franchir les herses, briser les barrières fragiles |
| Carte du Serpent | Grappin / ruisselle | S'autosuspender sous les corniches, traverser les précipices |
| Carte du Souffle | Tir d'encre projeté | Allumer les braseros, casser les cibles éloignées |
| Carte du Masque | Bombe | Murs fissurés, blocs de pierre |
| Carte de l'Ombre | Phase (traverse les grilles fines) | Sas, cages, coffres-forts |
| Carte du Temps | Ralentir les engrenages | Plateformes mouvantes, pales, ponts de scie |
| Carte de la Racine | Planer / feuille | Descentes longues, courants d'air ascendants |

**Règle d'or du gating** : une capacité n'est jamais nécessaire *avant* d'être
trouvée dans le même monde ; et une porte bloquée est toujours **lisible** —
on voit ce qu'il faut (un mur fissuré *ressemble* à un mur fissuré, une grille
brille quand on s'en approche). Pas de chasse au pixel.

### 4.3 Le feel (le plus important, et le plus technique)

Le « feel » d'un platformer se joue à des chiffres précis. Proposition de
réglage, à ajuster manette en main :

| Paramètre | Valeur | Pourquoi |
| --- | --- | --- |
| Temps de coyote | 0,10 s | Sauter encore un peu après avoir quitté le rebord |
| Mémoire de saut | 0,12 s | Appuyer juste avant d'atterrir déclenche quand même |
| Saut court | vitesse coupée à 45 % au relâchement | Hauteur variable, obligatoire |
| Gravité montée / descente | ×2,6 / ×1,0 | Chute franche, montée « contrôlée » |
| Vitesse max | 9 tuiles/s (course 12) | Lisibilité à l'écran |
| Dash | 0,15 s, recharge 0,35 s | Punissant mais pas frustrant |
| Arrêt sur image à l'impact | 60-90 ms | Le « punch » du manga |
| Secousse d'écran | 2-6 px selon les dégâts | Feedback |
| Invincibilité après dégât | 1,0 s (clignotement) | Classique mais nécessaire |

Le prototype de l'étape 2 se juge là-dessus et sur rien d'autre : **si la
course, le saut et l'attaque ne sont pas délicieux à vide, aucun décor ne
sauvera le jeu.**

### 4.4 Le combat
- **Corps-à-corps** : enchaînement de 3 coups, le 3ᵉ projette. Une **esquive**
  (roulade en arrière) avec 0,15 s d'invincibilité — et une **parade**
  facultative pour les joueurs avancés (renvoie le projectile).
- **Dégâts** : 3 cœurs de base, soins rares (fruits, cœurs de secours),
  checkpoints = **bornes d'arcade** qui restaurent les cœurs sans faire revivre
  les ennemis (décision à trancher au prototype).
- **Mort** : pas de vies, retour à la dernière borne, les ennemis simples
  repopent, les cartes déjà obtenues restent. Le jeu ne punit jamais la
  curiosité, seulement l'imprudence.

### 4.5 Les ennemis (6 familles, réutilisables dans tous les mondes)

| Famille | Comportement | Faiblesse |
| --- | --- | --- |
| Rôdeur | Va-et-vient au sol | Se projette |
| Sentinelle | Immobile, tire à vue | Attaque dans le dos |
| Volatile | Plonge en piqué depuis le plafond | Attaque en l'air |
| Chargeur | Fonça droit sur vous dès qu'il vous voit | Parade / esquive → il s'écrase |
| Blindé | Coque qui bloque les coups | Bombe, ou attaque par le dessous |
| Fantôme d'encre | Invisible sauf sous une lampe | Tir d'encre |

Chaque monde réinterprète ces six familles avec sa peau visuelle et **une
variante de comportement** (ex. : au désert, le Rôdeur devient un scorpion qui
s'ensable). Le joueur réapprend vite, mais se sent toujours en terrain connu.

### 4.6 Les boss
Un boss par monde, **3 phases**, chacune annoncée par une plaque de nom à la
manière d'un jeu de combat. Chaque phase rapporte une carte (dont une carte
animée, la récompense rare du monde). La victoire ouvre la porte du monde
suivant **et** laisse une « cicatrice » sur la carte du monde (revanche
possible, score de temps).

### 4.7 Structure du monde (proposition)
**Un hub + des mondes-portails** (plutôt qu'un seul grand Metroidvania
entrelacé, plus dur à tenir en web et à reprendre en 5 minutes) :

- **Le hub — la Salle d'Arcade / le Bazar** : le classeur de cartes, l'édition du
  deck, la borne du défi du jour, les portes des mondes.
- **Monde** = 4 stages + 1 antre de boss. Chaque stage = **8 à 14 salles**,
  dont une salle-secrète et une salle-défi.
- **Retour partiel** : on peut revenir dans un monde avec les cartes trouvées
  ensuite → 3 à 5 secrets par monde ne s'ouvrent qu'en revenant. C'est ce qui
  fait « complexe » sans faire « labyrinthe ».

**Contenu cible v1** (voir §9) : **1 monde complet** (vertical slice) —
4 stages, 1 boss, 12 cartes, ~45 min en ligne droite, ~2 h en collection.

---

## 5. Les cartes (le cœur émotionnel)

### 5.1 Deux familles, un seul objet
- **Cartes-Pouvoir** (12 au total, 1 par capacité) : trouvées dans des salles
  mémorables, chacune accompagne une **courte cinématique en planches de manga**
  (« la carte te parle »). Elles ouvrent le monde.
- **Cartes-Légende** (33) : la collection pure. Chaque carte est un
  personnage, un objet ou un lieu de l'univers, avec :
  - un **palmarès** (rareté : commune / rare / brillante / animée),
  - un **effet passif** discret si équipée (ex. +1 cœur, aimant à jetons,
    dégâts réduits sur les chutes),
  - un **texte de lore** de 2-3 lignes (et, extension possible, un lien vers un
    article du site quand la carte référence un jeu réel).

### 5.2 Le deck
- **3 emplacements actifs** (cartes-pouvoir) : on garde les 8 capacités mais on
  n'en équipe que 3 → choix, style de jeu, rejouabilité.
- **3 emplacements de soutien** (cartes-légende passives).
- On ne perd jamais une carte : le changement de deck se fait au hub **et**
  aux bornes d'arcade (confort).

### 5.3 Comment on trouve une carte (4 canaux)
1. **Secret de niveau** (le plus fréquent) — caché derrière un mur, un chemin de
   retour, un tuyau invisible.
2. **Défi de salle** — sans se faire toucher, en moins de X secondes, en
   n'utilisant pas tel pouvoir.
3. **Butin d'ennemi rare** — certains ennemis « porteurs » ont une lueur ; les
   tuer fait tomber une carte. Renforce le combat.
4. **Achat / fabrication au hub** — les jetons collectés servent à ouvrir une
   **carte manquante contre de la poussière d'encre** (10 doublons → 1 carte
   choisie). Anti-frustration : on finit toujours la collection.

### 5.4 Le Classeur
- Pages par monde, vignettes façon album, **pourcentage par page et global**.
- Vue « collection » triable (rareté, monde, pouvoir, manquantes en ombre).
- **Cartes manquantes affichées en silhouette** avec un indice de lieu : on sait
  qu'il en reste une dans le stage 3, on ne sait pas où → exploration, pas
  hasard.
- **Boussole à cartes** : après le boss du monde, un pincement de boussole
  indique la direction de la carte la plus proche (rayon limité). Confort, sans
  casser le plaisir de la trouvaille.

### 5.5 Les secrets (3 niveaux par stage)
| Niveau | Type | Exemple |
| --- | --- | --- |
| 1 | Visible mais pas évident | Une corniche qu'on atteint avec un double saut |
| 2 | Dissimulé habilement | Un mur d'encre qui se dissout sous un tir |
| 3 | Énigme | Trois leviers à activer dans l'ordre lu sur une fresque trois salles plus loin |

---

## 6. Objets-clés et énigmes locales

Les cartes ouvrent le monde ; **les objets locaux ouvrent la salle**. Ils sont
là pour varier le rythme (on ne peut pas toujours tout résoudre en sautant).

- **Objets** : fusible, clé rouillée, bobine de fil, sablier, lanterne, sceau
  d'eau. Toujours une **silhouette unique** et une **lueur discrète**.
- **Chaque détenteur d'objet a une raison de l'avoir** (un PNJ, un coffre, une
  récompense de mini-énigme), pour que le joueur se souvienne du « où ».
- **Le Carnet** note automatiquement ce qu'on a vu et pas pu passer :
  *« Grande herse rouge — un mécanisme, plus haut. »* → zéro blocage.
- **Énigmes autorisées** : poids sur une plaque, braseros à allumer, ordre de
  symboles (réponse lisible ailleurs), courant d'air + toile à déchirer, miroir
  à orienter. Rien qui demande de lire un dialogue pendant 3 minutes.

---

## 7. Habillage et progression

- **Carte du monde** : une **planche de manga** qui se remplit — chaque salle
  visitée devient une case encrée. Icônes : carte, objet, boss, secret non
  résolu. Zoom par monde.
- **Journal / Carnet** : les cartes, les objets, les ennemis rencontrés, les
  techniques (rappel des commandes contextuelles). Utile aussi pour la
  lisibilité : un joueur qui revient après 3 jours retrouve tout.
- **Tutoriel** : intégré à la première salle, en bulles de manga discrètes,
  jamais un mur de texte. (Le dépôt a un tutoriel Vice City très cadré — même
  approche : montrer, pas expliquer.)
- **Audio** : musique chiptune-orchestrale par monde, un thème de boss par
  monde ; bruitages courts et secs, **réverbération « salle »** pour la
  profondeur ; le silence est un effet (avant un boss, on coupe tout).
- **Succès du site** : nouvelles métriques (`platformerRuns`, `platformerCards`,
  `platformerStagesCleared`, `platformerBosses`, `platformerPerfectRooms`,
  `platformerNoHitBoss`) → trophées dans la vitrine du profil, exactement comme
  Mirage/Vice City.
- **Défi du jour** : une salle générée/choisie du jour, chronomètre, classement
  léger. Donne une raison de revenir chaque jour (et ça résonne avec le quizz du
  jour déjà en place).

---

## 8. Session de jeu, mobile, accessibilité

Le public d'un jeu de site web joue **5 à 15 minutes, souvent au téléphone**.
Ce n'est pas un détail, c'est une contrainte de design :

- **Sauvegarde automatique à chaque salle.** On ferme l'onglet, on revient, on
  reprend à la porte de la salle.
- **Résumé au retour** : « tu étais au stage 2, salle 7, 3 cartes trouvées ».
- **Commandes** : clavier (flèches/ZQSD + Z X C / J K L), **manette** (Gamepad
  API), et **tactile** : pouce gauche = croix/slide, pouce droit = saut +
  attaque, glissé vers le haut = pouvoir. Grandes zones, aucune latence
  d'attente au relâchement (leçon tirée de `mirageTouch.js`).
- **Accessibilité** : mode assisté (invincibilité, ralenti, double saut offert
  d'emblée), secousses d'écran et flashs réduits, sous-titres sur les
  cinématiques, remap des touches.
- **Plein écran** et bascule de qualité graphique, réutilisant
  `useGameFullscreen` et le sélecteur de qualité existants.

---

## 9. Technique

### 9.1 Moteur : Canvas 2D maison (recommandé) ou three.js orthographique
- **Canvas 2D (recommandé)** : collisions précises au pixel, palette et aplat
  parfaits pour le cel-shadé, simulation **déterministe à pas fixe (60 Hz)**,
  donc **testable sans navigateur** — c'est la convention du dépôt
  (`cityRushRules.js` est de la donnée pure, testée par `node --test`).
- **three.js en caméra orthographique (alternative)** : réutilise l'outillage
  existant (lumières, post-traitement, parallaxe en profondeur, trames en
  shader). Plus joli sur les effets, plus lourd à itérer et à tester.

### 9.2 Découpage prévu des fichiers (si Canvas 2D)
```
src/games/
  plateformerRules.js     ← simulation pure : physique, collisions, IA ennemis,
                            portes, dégâts, cartes ramassées (testable)
  plateformerStages.js    ← données des stages : salles, tuiles, entités,
                            portes, secrets (aucun code de rendu)
  plateformerCards.js     ← catalogue des cartes : id, nom, rareté, pouvoir,
                            lore, paramètres d'illustration
  plateformerProgress.js  ← sauvegarde (localStorage + copie serveur Supabase,
                            comme cityRushProgress.js)
  plateformerArt.js       ← dessin des personnages/ennemis/décors par le code
  plateformerAudio.js     ← musique et bruitages (WebAudio)
  PlateformerWorld.jsx    ← canvas, boucle de jeu, HUD
  PlateformerPage.jsx     ← page du jeu : vignette, intro, commandes, plein écran
tests/plateformer-*.test.js      ← physique, gating, cartes, sauvegarde
scripts/plateformer-*-check.mjs  ← parcours automatique de stages, UI en jsdom
```
Une **vignette** (comme les autres jeux), une entrée dans la navigation Jeux, et
un chapitre `README.md` — les mêmes rails que Mirage Rush et Vice City Rush.

### 9.3 Objectifs de performance
60 ips sur un téléphone de milieu de gamme, 1 seul canvas, rendu en couches
(décor → entités → effets → HUD), **aucune allocation par image** dans la
boucle (les tableaux d'entités sont réutilisés), décors dessinés une fois dans
des canvas hors écran puis blittés. Support des écrans haute densité avec un
facteur interne plafonné.

---

## 10. Périmètre et feuille de route

**v1 = une tranche verticale complète et finissable**, pas un jeu à moitié
partout :

| Étape | Livrable |
| --- | --- |
| 0 | Ce document + `DESIGN-ARCADE-ETERNELLE.md` (design détaillé) — **fait** |
| 1 | Maquettes visuelles + charte (palette, héros, HUD, une salle) — **fait** (`mockups/`) |
| 2 | **Prototype « feel »** : une salle, course/saut/attaque/dash, 60 ips, au clavier — c'est ici qu'on juge le jeu |
| 3 | Moteur de stages : tuiles, collisions, portes, 1 pouvoir-clé, 3 ennemis |
| 4 | Cartes : ramassage, classeur, HUD, sauvegarde, carte du monde |
| 5 | **Monde 1 complet** : 4 stages, 1 boss, 12 cartes, objet-clé, énigme, musique |
| 6 | Intégration site : page, vignette, succès, Supabase, tactile, plein écran, accessibilité |
| 7 | Extension : mondes 2-3, cartes du jour, défis chronométrés |

Estimation honnête : les étapes 1-2 sont rapides (quelques sessions) ; le
contenu (étape 5) est le vrai coût, parce que **12 cartes = 12 illustrations +
4 stages à dessiner**. C'est pourquoi on commence par le feel et par un stage
observable de bout en bout.

---

## 11. Décisions prises

| Sujet | Décision |
| --- | --- |
| **Histoire** | **L'Arcade Éternelle** (piste A) — un Brouilleur efface les jeux de la mémoire des joueurs ; chaque monde est un jeu d'arcade rejoué de l'intérieur, avec sa propre direction artistique. Les pistes B (Qarin) et C (Studio Zéro) pourront revenir comme mondes ou extensions. |
| **Direction artistique** | **Cel-shadé animé** (option 1) — aplats, contour d'encre, animation des personnages sur les deux (12 img/s), caméra et effets à 60 ips, trames de manga, onomatopées et plaques de nom de boss. |
| **Rôle des cartes** | **Les deux, avec deck équipé** — 12 cartes-pouvoir (clés, 3 équipées) + 33 cartes-légende (collection, passifs, 3 équipées). |
| **Prochaine étape** | **Le design écrit détaillé** → `DESIGN-ARCADE-ETERNELLE.md` (fait). Ensuite : maquettes visuelles, puis prototype du *feel*, puis monde 1. |

