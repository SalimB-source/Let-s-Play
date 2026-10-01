# Brainstorming — Jeu Soulslike (même esprit que Mirage Rush)

> Objectif de ce doc : cartographier **ce qui est réalisable** dans notre stack
> (React + Vite + Three.js, intégré au site Let's Play) avant d'écrire la moindre
> ligne de gameplay.
>
> **Statut : décisions principales prises** (voir §8) — le format est verrouillé,
> on peut enchaîner sur les jalons M0→M4.

## État d'avancement

- [x] **M0 — Fondations** : livré. Route **`/jeu/la-cendre`**, carte dans
  l'arcade `/jeu` (+ key art généré). Contrôleur ZQSD/WASD + flèches, caméra
  orbitale souris (pointer lock + repli glisser), collisions cercle/AABB,
  anti-mur par raycast, Cour du Seuil (murs, tours, colonnes, braseros,
  feu de cendres), chevalier procédural animé (marche/course/respiration),
  écrans intro/pause, HUD (coords, keycaps, pastille souris). Checks :
  `npm run build` ✓, `check:phone-css` ✓, `check:mirage-flow` ✓,
  7 assertions Node sur `soulsRules.js` ✓.
- [ ] **M1 — Combat** : attaque légère/lourde, esquive i-frames, stamina,
  hitstop, lock-on, 1 ennemi télégraphé.
- [ ] **M2 — Boucle souls** : feu, flasque, mort → âmes/bloodstain, level-up.
- [ ] **M3 — Contenu** : 4 ennemis, zone + raccourci, boss 2 phases.
- [ ] **M4 — Polish** : écrans, audio, classement Supabase, smoke check
  `check:souls-flow`, port tactile.

---

## 1. Ce qu'on récupère de Mirage Rush (référence de production)

Mirage Rush prouve que la maison sait livrer un jeu 3D web complet et abouti :

| Pilier | Preuve dans le code |
|---|---|
| 3D procédurale sans assets externes | `MirageWorld.jsx` (~2 400 lignes) : modèles construits en code (`block()`, `makeExplorer()`), flat shading, baking des décors statiques (`bakeStaticScenery`) |
| Logique de jeu pure & testable | `mirageRules.js` séparé du rendu, smoke checks (`check:mirage-flow`, `check:phone-css`…) |
| Multi-plateforme | Clavier + tactile (`mirageTouch.js`) + gamepad, HUD mobile-first, `check:phone-*` |
| Progression & records | `mirageProgression.js` (localStorage : XP, skins, paliers) + classements Supabase (`mirageApi.js`) |
| Multi joueurs | Rooms 2–4 joueurs via Supabase (`mirageRooms.js`) — sync de positions déclarative |
| Écrans & polish | Intro, countdown, pause, résultats, audio (`arcadeAudio.js`), FX (flash, secousse, hitstop léger) |
| Intégration site | Route lazy `/jeu/mirage-rush`, page dédiée, CSS maison (~2 300 lignes) |

**Bilan :** le socle (scène, boucle, HUD, touches, progression, checks) est un
**pattern maîtrisé**. Un soulslike réutilise 100 % de ce pipeline. La vraie
nouveauté technique est le **gameplay** : déplacement libre + combat rapproché.

---

## 2. Les piliers d'un soulslike (ce qu'il faut toucher pour que ce soit « un vrai »)

1. **Combat à l'arme blanche sous stamina** — attaques/coûts en endurance, jamais de mash.
2. **Esquive roulée avec i-frames** — fenêtre d'invulnérabilité precise, punish window.
3. **Ennemis télégraphés** — windup lisible → frappe → recovery exploitables (lecture, pas réflexe brut).
4. **Lock-on** — ciblage pour piloter les duels.
5. **Mort qui pèse** — perte des « âmes » au sol, **récupérables** en rouvrant le bloodstain ; sinon perte définitive.
6. **Checkpoints (feu)** — respawn des ennemis, recharge de la flasque.
7. **Flasque de soin limitée** (X charges, recharge au feu).
8. **Boss** — patterns lisibles, 2 phases, mort apprenante.
9. **Croissance** — âmes = XP = monnaie ; level-up de stats (Vigueur, Endurance, Force…).
10. **Level design** — zone interconnectée, raccourcis qui se débloquent (l'âme du genre).

Nice-to-have (pas MVP) : parry/riposte, 2e arme, bouclier avec posture, objets/clés,
phantoms asynchrones, invasions, coop.

---

## 3. Verdict de faisabilité, pilier par pilier

### ✅ Réalisable maintenant (MVP)

- **Contrôleur 3D libre** : déplacement relatif caméra (ZQSD/WASD + souris),
  caméra orbitale derrière l'épaule avec raycast anti-mur. ~Pattern classique
  Three.js, nouveau pour nous (Mirage est sur lignes) mais bien balisé.
- **Lock-on** : cible = point médian joueur↔ennemi, leash pour le perdre.
- **Système de combat frame-data** : logique pure (durées de frames, i-frames,
  stamina, hitboxes capsule/OBB) dans un `soulsRules.js` testable, exactement à la
  façon de `mirageRules.js`.
- **Ennemis FSM** : états idle → patrol/aggro → windup → attack → recovery →
  stagger → mort. 4 archétypes suffisent (lent/lourd, rapide, bouclier, archer).
- **1 boss 2 phases** : grosses attaques télégraphées + zones au sol à esquiver.
- **Feu / flasque / mort / bloodstain / level-up** : toute la boucle est du logique
  + HUD, rien d'exotique.
- **Zone unique compacte** : hub + 2–3 embranchements + arène de boss + 1 raccourci.
- **Modèles & animations procéduraux** : squelette simple en hiérarchie de blocs
  (style `makeExplorer`), animations par rotations programmatiques + anticipation
  (squash/stretch, lean). Assumer un rendu **low-poly stylé**, pas du mocap.
- **Game feel** : hitstop 60–90 ms, screen shake, flash, son d'impact — on a déjà
  les briques FX dans Mirage.
- **Performance** : décor statique baké, ≤ 6 ennemis actifs, DPR plafonné.
- **Pipeline projet** : route lazy `/jeu/<nom>`, `check:<nom>-flow`, localStorage,
  leaderboard Supabase existant.

### ⚠️ Réalisable, mais à planner (v1.5 → v2)

- **2–3 armes avec movesets distincts** (vitesse/range/anti-garde différents) →
  du contenu d'animation à programmer, pas de la R&D.
- **Parry + riposte** : timing strict + feedback impitoyable ; faisable mais à
  peaufiner longuement (game feel).
- **Bouclier / posture** : idem.
- **2–3 zones supplémentaires + boss** : coût de contenu linéaire.
- **Objets clés / portes / NPCs vendeurs** : logique simple, beaucoup d'écriture.
- **Contrôles tactiles** : joystick virtuel + boutons — à traiter en fin de parcours
  (le MVP est desktop-first, décision D3), jamais oublier le mobile en sortie.
- **Phantoms asynchrones** (trace d'autres joueurs / bloodstains via Supabase) :
  le multi de Mirage montre le chemin, mais c'est un chantier à part.
- **Objets, amulettes, build variety** : équilibrage à prévoir.

### ❌ Hors scope (à exclure du projet pour l'instant)

- **Multi temps réel** (invasions, coop en direct) : le netcode d'action exige
  prédiction/réconciliation — un cran au-dessus de la sync de positions d'une course.
- **Monde ouvert interconnecté façon Dark Souls 1** : coût de niveau astronomique.
- **Qualité d'animation AAA / assets détaillés** : pas de mocap, pas d'artistes 3D.
  L'identité visuelle sera **procédurale et stylée**, à assumer fièrement.
- Voix, cinématiques, engin de dialogues.

---

## 4. Concepts proposés (le brainstorm) — décision : **Concept D**

### Concept D — Vertical slice dark fantasy classique ✅ **RETENU**
- **Pitch** : *working title « La Cendre »* (nom final à trancher, §8 D5) — un
  donjon de pierre et de braise, un chevalier sans nom, un feu, un boss.
  L'identité souls canonique, sans dette de cohérence avec Mirage Rush : on
  pioche dans Mirage Rush le **pipeline de production**, pas son univers.
- **Pourquoi** : le format le plus pur pour prouver le combat ; l'ambiance
  sombre met en valeur les FX (braises, lueur des feux, flash d'impact) sur
  notre rendu procédural low-poly.

### Concept A — « Dune Souls » / *Les Sables du Mirage* (écarté)
- Univers Mirage Rush (déserts, cité engloutie de Malbod, feux de bivouac),
  cohérence de marque, réutilisation des palettes désert.
- Écarté : on assume une rupture nette entre les deux jeux.

### Concept B — *Ashen Arena* (Boss rush arcade) (écarté)
- Le plus rapide à livrer, adné avec l'ADN « runs + records » de Mirage Rush.
- Écarté au profit de l'exploration. **Gardé comme plan B** : si le level design
  menace les délais, même moteur de combat + arène à la place de la zone.

### Concept C — Soulslike 2.5D (écarté)
- Techniquement le plus sûr, mais ne répond pas au « même style que Mirage
  Rush » (3D).

---

## 5. Architecture technique proposée (même pipeline que Mirage)

```
src/games/
  soulsRules.js      # logique PURE : stamina, i-frames, frame data, FSM ennemis,
                     # âmes/bloodstain, flasque, level-up → testable en smoke check
  SoulsWorld.jsx     # scène Three.js : contrôleur joueur, caméra, lock-on,
                     # hitboxes, ennemis, boss, décor baké, boucle (rAF)
  soulsModels.js     # modèles procéduraux (joueur, ennemis, boss, feu, déco)
  SoulsPage.jsx      # écrans : intro, HUD (vie/stamina/flasque/âmes), mort,
                     # level-up, victoire de boss, pause
  soulsTouch.js      # joystick virtuel + boutons (v1.5 mobile — voir D3)
  soulsAudio.js      # sons d'impact, ambiance (procédural ou 1-2 mp3)
  souls.css          # HUD dark + braise, écrans de mort…
main.jsx             # Route lazy : /jeu/la-cendre
scripts/
  souls-flow-check.mjs   # smoke check (pattern mirage-flow-check)
package.json         # + "check:souls-flow"
```

Réutilisations directes : `bakeStaticScenery`, approche `block()`/palette,
patterns FX/hitstop, `mirageProgression` (squelette localStorage), Supabase
leaderboard, audio skeleton d'`arcadeAudio`.

**Nouveaux blocs à écrire (le cœur du projet)** :
1. contrôleur joueur 360° + caméra orbitale souris,
2. machine à états de combat (joueur ET ennemis) avec frame data,
3. lock-on,
4. IA d'ennemis (aggro, spacing, télégraphes),
5. boucle de mort/âmes/feu.

---

## 6. Jalons proposés (MVP en 5 temps)

- **M0 — Fondations** : scène, contrôleur libre (ZQSD/WASD + souris), caméra
  orbitale, décor de base, HUD vide.
  *Critère : on se déplace proprement, la caméra ne se bloque jamais.*
- **M1 — Combat** : attaque légère/lourde, esquive i-frames, stamina, hitstop,
  1 ennemi godo avec télégraphes, lock-on.
  *Critère : un duel est lisible et satisfaisant — le cœur du jeu est validé.*
- **M2 — La boucle souls** : feu, flasque, mort → perte/récupération d'âmes,
  level-up de stats.
  *Critère : on peut perdre, apprendre, repartir plus fort.*
- **M3 — Contenu** : 4 ennemis, 1 zone compacte avec raccourci, 1 boss 2 phases.
  *Critère : une session complète de 15–20 min jouable de bout en bout.*
- **M4 — Polish & intégration** : écrans, audio, records/classement Supabase,
  route + smoke checks, équilibrage, **portage tactile**.
  *Critère : prêt à montrer sur le site, desktop ET mobile.*

Estimation honnête : **M0→M3 = le gros du travail** ; M4 suit les patterns déjà
connus. Chaque milestone est jouable/démontrable (pas de longue phase muette).
Le multijoueur temps réel et le contenu post-MVP (armes, parry, zones) démarrent
après validation du game feel en M1.

---

## 7. Risques principaux

1. **Game feel** (le vrai fossé d'un soulslike) : si les impacts ne claquent pas,
   tout le reste compte peu → imposer hitstop/shake/flash/son dès M1.
2. **Caméra** : se faire enfermer dans un mur tue l'expérience → raycast anti-cam
   dès M0.
3. **Souris capture (pointer lock)** : gérer proprement la sortie de capture
   (Échap, pause) — piège classique sur le web.
4. **Tactile (M4)** : le combat au joystick virtuel est exigeant → ennemis bien
   télégraphés, boutons généreux, aim-assist léger en lock-on.
5. **Perf** : baké du décor + budget ennemis strict.
6. **Ambition contenu** : résister à l'envie de 5 zones avant d'avoir un combat juste.

---

## 8. Décisions

- [x] **D1 — Direction artistique** : **Dark fantasy classique** (pierre, braise,
  cendre). Aucun lien d'univers avec Mirage Rush — on garde seulement son
  savoir-faire de production.
- [x] **D2 — Format** : **Slice aventure** — zone compacte unique + feu + 4
  ennemis + 1 boss 2 phases + boucle d'âmes. Plan B : boss rush (Concept B) si
  le level design explose.
- [x] **D3 — Plateformes** : **Desktop d'abord** (ZQSD/WASD + souris orbitale,
  gamepad ensuite). Le tactile arrive en M4 — jamais de sortie sans mobile.
- [x] **D4 — Multi** : **Solo + classement** (leaderboard Supabase). Le
  multijoueur asynchrone (phantoms/bloodstains) est un objectif v2, le temps
  réel hors périmètre.
- [x] **D5 — Nom provisoire + route** : **« La Cendre »** → route
  **`/jeu/la-cendre`** (nom définitif revisitables d'ici M4 ; propositions
  restantes : *Ashen Vow*, *Emberfall*, *Les Cendres d'Orlam*…).
