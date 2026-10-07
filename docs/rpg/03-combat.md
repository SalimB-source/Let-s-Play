# 03 — Le système de combat (sans réflexes)

Contrainte du créateur, reprise telle quelle : **pas de parade ni d'esquive en
temps réel**. Le combat reste un tour par tour classique dans sa forme — mais
il ne doit pas être passif. La solution retenue : **tout se joue sur
l'information et la position, jamais sur le timing.**

> Trois références, mais une seule leçon gardée de *Clair Obscur* : l'ennemi
> **annonce** ce qu'il va faire. Ce qu'on en fait, c'est de la décision.

Règle de design qui départage tout le reste :

> **Le joueur doit pouvoir expliquer pourquoi il a gagné. Aucun coup ne doit
> dépendre de ses réflexes, et aucune défaite ne doit être une surprise.**

Tout ce fichier est implémenté dans `src/games/rpgCombat.js` et vérifié par
`tests/rpg-combat.test.js`. Les constantes citées portent le même nom dans le
code (`RPG_PA_PER_TURN`, `RPG_SABLE_SPILL`, `RPG_TIER_DAMAGE`…).

---

## 1. Le terrain : une cage d'escalier

Le combat se joue sur **3 étages** (`RPG_TIERS`), comme la ville.

- Frapper depuis un étage élevé : **+15 % de dégâts par étage** au-dessus du
  premier (`RPG_TIER_DAMAGE`).
- Être frappé depuis un étage élevé : **−5 % de dégâts subis par étage**.
- **Tout le monde descend d'un étage à chaque fin de round**
  (`RPG_SLIDE_PER_ROUND`) : la ville glisse, la hauteur se mérite.
- **La Chute** : un coup qui fait passer un ennemi du 3ᵉ au 1ᵉ étage frappe
  **×1,4** (`RPG_CHUTE_BONUS`).

La hauteur est donc une ressource qui fond : on la gagne avec des compétences
de déplacement, et on la perd mécaniquement. C'est la métaphore de la ville
jouée en système.

## 2. L'Intention : on lit, on ne devine pas

**Chaque ennemi annonce son action un round à l'avance.** L'intention est
affichée sur sa fiche : icône, nom du coup, cible, dégâts estimés. Cinq
familles :

| Icône | Famille | Ce que ça veut dire | Comment on répond |
| --- | --- | --- | --- |
| ⬇ | **Lourd** | Un gros coup sur une cible | Garde, barrage, contre-élément |
| ⬒ | **Zone** | Touche tout le monde | Garde de toute l'équipe, barrage, ou tuer avant |
| ⧗ | **Incantation** | Se charge, frappe au round suivant | **Interruption** avec le bon élément |
| ⛃ | **Sablier** | Ramasse le sable du sol pour se soigner | **Souffle** : on lui vole son sable |
| ⚑ | **Soutien** | Renforce un allié | Interruption, ou focus de l'autre |

Aucune attaque n'arrive sans avoir été annoncée. C'est un contrat avec le
joueur, et c'est ce qui remplace le réflexe : **la tension vient de ce qu'on
sait, pas de ce qu'on rate.**

## 3. Les quatre réponses (toutes des décisions)

| Réponse | Coût | Effet |
| --- | --- | --- |
| **Garde** | 1 PA | −60 % sur le prochain coup encaissé. Si l'acteur était la cible annoncée : **+1 Verre**. |
| **Barrage de verre** | 1 PA + 20 sable | Bouclier qui absorbe `40 + Magie × 1,2` dégâts, tient jusqu'à être brisé. |
| **Contre-élément** | le coût du sort | Frapper l'attaquant avec l'élément qui bat le sien **avant** son coup : son attaque −50 % et **+15 Fêlure**. |
| **Reposition** | 1 PA | Monter d'un étage (soi ou un allié) : sort de la zone, gagne la hauteur. |

La Garde coûte un tiers du tour : c'est un vrai choix, pas un bouton par
défaut. Le Contre-élément est la réponse élégante — elle demande de connaître
la table, et elle fait monter la Fêlure.

## 4. Le Sable : la deuxième barre de vie

**La moitié des PV perdus tombe au sol** (`RPG_SABLE_SPILL` = 50 %) et
s'accumule sur le sol **du camp de la victime** (plafond 200 par sol).

- **Récolte** (1 PA) : puise jusqu'à 40 sable sur son sol et soigne
  `sable × 0,8`.
- **Souffle** (1 PA) : retire jusqu'à 40 sable du sol **ennemi**, et en
  récupère la moitié.
- Certains sorts coûtent du sable (`sandCost`) au lieu de PA supplémentaires :
  les plus gros effets du jeu passent par là.

Conséquence : **un même combat peut coûter 500 PV à tout le monde ou 200**,
selon qu'on laisse le sable au sol ou qu'on le ramasse. Et quand un ennemi
annonce ⛃, on sait exactement ce qu'il va se soigner — à nous de souffler son
sol avant.

## 5. Les ressources de puissance

| Ressource | Portée | Max | Rôle |
| --- | --- | --- | --- |
| **PA** | par personnage, par tour | 3 | Payer les actions |
| **Verre** | partagé par l'équipe | 5 | Payer les **Cristallisations** (3) |
| **Fêlure** | par ennemi | 100 | Remplir → l'ennemi est **Fêlé** |

- **Verre** : +1 quand un personnage en garde est la cible annoncée, +1 sur un
  contre-élément réussi, +1 sur une Consonance. Trois Verres **cristallisent**
  une compétence : puissance ×2 et effet secondaire renforcé.
- **Fêlure** : monte de 10 % des PV perdus, +15 au contre-élément, +25 à
  l'interruption, plus le bonus propre à chaque compétence. À 100, l'ennemi est
  **Fêlé** : il n'agit pas, subit **×2**, et la première compétence qui le
  touche est **gratuite**. Elle retombe de 25 après 3 rounds sans Fêlure.
- **Consonance** : 3 éléments différents dans le même round → tous les coups
  suivants du round ×**1,5** et +1 Verre. C'est la récompense de la composition
  d'équipe et de l'ordre des actions.

## 6. L'Astrolabe : l'horloge du combat

Un compteur visible tourne pendant le combat. Quand il arrive à zéro
(`RPG_CLOCK_INTERVAL` = 5 rounds, 4 sur les boss), **l'Astrolabe sonne** :

- tous les ennemis gagnent **+20 % d'Attaque** pendant 2 rounds ;
- tout le monde **descend d'un étage supplémentaire**.

Les combats longs deviennent donc plus durs *dans le temps*, et la hauteur se
perd plus vite : il faut conclure. C'est la même idée que le monde — le sable
monte — jouée à l'échelle d'un combat.

## 7. Éléments

- **Le cycle** : **Braise → Souffle → Sable → Eau → Braise.** Avantage ×1,5,
  désavantage ×0,75.
- **L'axe** : **Encre ↔ Verre**, avantage ×1,5 dans les deux sens. L'Encre est
  celle de la Chambre des Heures ; le Verre est celui de Fériel et de Yamina.
  L'axe narratif du jeu est aussi un axe de combat.

## 8. Les formules (telles qu'implémentées)

```
base  = Attaque × Puissance/100 − Défense_cible × 0,5
hauteur = (1 + 0,15 × (étage_attaquant − 1)) × (1 − 0,05 × (étage_cible − 1))
dmg   = base × élément × hauteur × critique × fêlure × consonance × variance
dmg   = max(1, arrondi(dmg))
```

| Multiplicateur | Valeur |
| --- | --- |
| Élément | 0,75 / 1 / 1,5 |
| Critique | ×1,6 — chance = `min(35 %, Agilité/400 + 5 %)` |
| Fêlé | ×2 |
| Consonance | ×1,5 |
| Chute (3ᵉ → 1ᵉ) | ×1,4 |
| Variance | 0,95 → 1,05 |
| Garde | ×0,4 |
| Contre-élément posé | ×0,5 |
| Barrage | absorbe avant les PV |

**Soin** : `Magie × Puissance/100 × 1,15`, plafonné aux PV manquants.
**Récolte** : `sable puisé × 0,8`.

## 9. Difficulté = information, pas réflexes

| Difficulté | Dégâts ennemis | Ce qu'on voit |
| --- | --- | --- |
| Récit | ×0,7 | Tout, y compris le nombre exact de dégâts |
| Normale | ×1 | Coup, cible, dégâts estimés |
| Veilleur | ×1,35 | Les coups de **Zone** n'affichent pas leur cible |

Changer de difficulté ne change jamais la vitesse du jeu ni le nombre de
clics : ça change ce que l'administration daigne vous dire. C'est cohérent
avec le sujet.

## 10. Intelligence ennemie

- Chaque ennemi a 2 à 5 actions pondérées et des règles d'instinct (soigne un
  allié sous 30 % PV, ramasse le sable s'il en a, cible le plus bas si son coup
  est « acharné »).
- Les boss ont 2 à 3 phases : à chaque phase, l'Astrolabe sonne plus souvent,
  la famille des coups change, et l'arène perd un palier.
- **Jamais de coup surprise** hors embuscade.

## 11. Rythme d'un combat (exemple réel)

1. **Round 1** — Le Greffier annonce ⧗ *Radiation* sur Yamina. Boualem annonce
   ⛃. Salem monte au 2ᵉ étage (Reposition, 1 PA), Fériel pose un Barrage sur
   Yamina (1 PA + 20 sable), Yamina **retarde** le Greffier d'un round.
2. **Round 2** — La Radiation tombe sur le barrage et ne fait rien. Salem,
   depuis le 2ᵉ étage, frappe le Greffier avec *Crochet* : il le fait tomber au
   1ᵉr — **Chute ×1,4**. Le Greffier est Fêlé.
3. **Round 3** — Le Greffier n'agit pas, subit ×2, et le premier coup est
   gratuit. Fériel cristallise (3 Verres) *Verre fondu*. Le combat bascule.

Trois rounds, cinq décisions, **zéro milliseconde**. C'est la cible du jeu.

## 12. Ce qu'on ne fait pas (choix assumés)

- **Aucun timing.** Pas de fenêtre de réaction, pas de QTE, pas de barre qui se
  referme. Le jeu doit rester jouable au tour par tour sur un téléphone, dans
  un bus, avec une seule main.
- **Pas d'aléatoire sur ce qui compte** : les jets de dé sont réservés à la
  variance de ±5 % et au critique. Aucune phase de boss ne dépend d'un dé.
- **Pas de grind obligatoire** : l'XP est calibrée pour arriver à chaque boss
  au niveau prévu ±2 en faisant la route normale.
- **Pas de combat aléatoire** : les ennemis sont visibles sur la carte.
- **Défaite = retour au dernier palier**, objets consommés perdus, rien
  d'autre.
