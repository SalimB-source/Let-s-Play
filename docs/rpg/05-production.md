# 05 — Production : de l'idée au jeu

## 0. Où on en est aujourd'hui

| Étape | État |
| --- | --- |
| Concepts d'univers | ✅ 3 propositions écrites, **concept B retenu** (`01-concepts.md`) |
| Contrainte de conception | ✅ aucun réflexe : combat 100 % décisionnel (`03-combat.md`) |
| Histoire complète | ✅ Bab El, 5 compagnons, 7 chapitres, 3 fins (`02-histoire.md`) |
| **Moteur de combat codé + jouable** | ✅ `src/games/rpgCombat.js` + page `/jeu/sablier-de-bab-el` |
| Règles vérifiées par des tests | ✅ `npm run check:rpg` (51 tests) et `npm run check:rpg-ui` |
| Direction artistique | 🟡 maquettes en cours (voir `04-progression-da.md`) |
| Exploration, villes, dialogues | ⬜ à faire |
| Contenu (7 chapitres) | ⬜ à faire |

Le prototype actuel couvre **un seul combat** : 4 compagnons, 3 vagues dont un
boss à deux phases qui raccourcit l'horloge, intentions annoncées, sable au
sol, étages, Astrolabe. C'est exactement la tranche qu'il fallait coder en
premier : si ce combat n'est pas bon, rien d'autre ne sauve le jeu.

## 1. Les trois questions à trancher avant d'aller plus loin

1. **Le combat est-il bon sans réflexes ?** → faire jouer 10 personnes au
   prototype et mesurer deux choses : le temps d'un combat ordinaire (cible
   3-5 minutes) et la proportion de joueurs qui **lisent** l'intention avant
   d'agir. Si personne ne la lit, le système est décoratif et il faut le
   rendre plus lisible — pas plus rapide.
2. ~~Quelle plateforme d'abord ?~~ → **tranché : navigateur**, dans la page
   Jeux de Let's Play. La contrainte force une direction artistique légère,
   qui est aussi la moins chère.
3. **Quelle longueur pour la première version ?** → recommandation : **les 3
   premiers chapitres** (≈ 5 h) en version 1.0, plutôt que 7 chapitres en trois
   ans.

## 2. Roadmap

| Jalon | Contenu | Durée indicative |
| --- | --- | --- |
| **M0 — Conception** | ce dossier + prototype de combat | ✅ fait |
| **M1 — Vertical slice** | 1 donjon complet, 1 ville, 3 boss, dialogues du chapitre 1, direction artistique définitive sur une scène | 6-10 semaines |
| **M2 — Chapitre 1 jouable de bout en bout** | prologue + chapitre 1, boucle complète (exploration → combat → aube) | 3-4 mois |
| **M3 — Production** | chapitres 2 à 7, tous les boss, tout l'équilibrage | 12-18 mois |
| **M4 — Finition** | 3 fins, nouveau cycle+, localisations, accessibilité, certification | 4-6 mois |

**Total réaliste pour un jeu complet : 24 à 30 mois.** Une version courte
(3 chapitres) tient en **12 à 15 mois**.

## 3. Équipe

**Version navigateur (recommandée pour commencer) — 3 à 5 personnes**

| Rôle | Charge |
| --- | --- |
| Game design + écriture | 1 personne à plein temps (c'est le poste critique) |
| Programmation (moteur, outils, site) | 1 à 2 |
| Direction artistique + sprites | 1 |
| Son / musique | 1 (peut être intermittent) |

**Version complète 2D HD-2D — 8 à 12 personnes**, 24-30 mois.

## 4. Ce qui coûte vraiment cher (à ne pas sous-estimer)

1. **L'écriture.** 250 000 mots pour le concept A, dont 60 % de dialogues de
   combat et de descriptions d'objets — le travail invisible.
2. **Les animations de combat.** Un RPG tour par tour vit ou meurt à ses
   animations. Budget : ~30 animations par personnage × 5 personnages × 30
   ennemis. C'est plus cher que tous les décors réunis.
3. **L'équilibrage.** 40 heures de test minimum, deux passes complètes.
4. **Les boss.** Un bon boss = 2 à 3 semaines. Il y en a 10 dans le jeu.

## 5. Risques et parades

| Risque | Probabilité | Parade |
| --- | --- | --- |
| Le combat devient répétitif après 5 h | Moyenne | Une règle de champ de bataille neuve par chapitre ; réactions qui changent de motif à chaque boss |
| Le thème est trop lourd / trop local pour l'export | Moyenne | Le thème se lit aussi sans connaître la culture : « oublier pour survivre » est universel ; la culture est le décor, pas la leçon |
| La mort permanente frustre | Moyenne | La Veillée transforme la perte en gain ; aucun contenu n'est bloqué par une mort |
| Les réactions en temps réel excluent | Faible | Mode automatique + difficulté Récit, annoncés sans honte |
| Périmètre qui explose | **Élevée** | Couper. Version 1.0 = 3 chapitres, pas 7 |

## 6. Prochaines actions concrètes (dans l'ordre)

1. **Faire jouer le prototype** à 5-10 personnes et noter ce qui coince
   (surtout : les fenêtres de parade sont-elles trop serrées ?).
2. Écrire **le chapitre 1 en détail** : 12 à 15 scènes dialoguées, plan du
   donjon, 6 ennemis, 1 boss.
3. Poser la **direction artistique** sur une seule image : un combat contre le
   Chorog du Sel, décor de palmeraie de nuit, lanterne allumée.
4. Décider la **plateforme** et la **longueur** de la version 1.0.
5. Écrire l'**outil de dialogue** avant les dialogues — c'est le piège classique
   des RPG faits à deux.
