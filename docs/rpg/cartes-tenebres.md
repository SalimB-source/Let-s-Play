# Le Sablier — Les cartes Ténèbres

Version du 19 octobre 2026, après révision des effets, passage de l’Uræus du seuil à **2/1** et de l’Ouvrier du natron à **1/1**.

**22 cartes jouables : 14 créatures, 7 magies et 1 arme**, plus le jeton Shabti. Les figures du même set appartenant aux autres couleurs ne sont pas incluses.

## Créatures

Le coût est indiqué en mana. ATQ/DEF désigne l’attaque et la défense de base.

| Carte | Coût | ATQ/DEF | Rareté | Effet |
|---|---:|:---:|---|---|
| **Chacal du seuil** | 1 | 1/2 | commune | Tribut 1 — Quand cette créature touche le sorcier adverse, il perd 1 PV et vous en gagnez 1. Rapidité — Peut attaquer le tour où il arrive. |
| **Ouvrier du natron** | 1 | 1/1 | commune | Quand Ouvrier du natron meurt, le sorcier adverse perd 1 PV et vous en gagnez 1. |
| **Gardienne de la balance** | 2 | 1/3 | commune | Quand Gardienne de la balance meurt, vous gagnez 2 PV. |
| **Scribe des feuillets** | 2 | 2/1 | commune | Quand Scribe des feuillets meurt, la carte du dessus du paquet adverse part au cimetière. |
| **Prêtre de la bouche** | 2 | 2/2 | inhabituelle | Quand Prêtre de la bouche arrive : le sorcier adverse perd 1 PV et vous en gagnez 1. |
| **Uræus du seuil** | 3 | 2/1 | inhabituelle | Coup rapide — Sélectionné pour attaquer, il peut frapper une créature adverse de votre choix : il lui inflige ses dégâts d’attaque, sans riposte, et son attaque s’arrête là. |
| **Momie de lin** | 3 | 2/4 | commune | Quand Momie de lin meurt, créez une créature-jeton « Shabti » 1/1. |
| **Ibis des comptes** | 3 | 2/2 | inhabituelle | Envol — Ne peut être bloqué que par une créature avec Envol. Quand Ibis des comptes arrive : piochez une carte puis défaussez une carte. |
| **Celle qui pèse** | 4 | 3/3 | rare | Quand Celle qui pèse arrive : l’adversaire défausse une carte. |
| **La Dévoreuse** | 6 | 4/5 | mythique | Quand La Dévoreuse arrive : retirez de la partie une créature adverse ciblée. |
| **Celui qui juge** | 6 | 3/5 | rare | Tribut 2 — Quand cette créature touche le sorcier adverse, il perd 2 PV et vous en gagnez 2. Arrivée : détruit toutes les créatures qui coûtent 3 mana ou moins. |
| **Le Passeur au masque de chacal** | 6 | 5/5 | mythique | Quand Le Passeur au masque de chacal arrive : la dernière créature de votre cimetière revient en jeu. |
| **Le Maître des hiéroglyphes** | 5 | 3/5 | mythique | Envol — Ne peut être bloqué que par une créature avec Envol. Coup rapide — Sélectionné pour attaquer, il peut frapper une créature adverse de votre choix : il lui inflige ses dégâts d’attaque, sans riposte, et son attaque s’arrête là. Quand Le Maître des hiéroglyphes arrive : piochez deux cartes. |

## Magies

Les éventuels PV à payer s’ajoutent au coût en mana.

| Carte | Coût | Type | Rareté | Effet |
|---|---:|---|---|---|
| **La Dernière Pesée** | 5 | Sorcellerie | mythique | Détruisez toutes les créatures. |
| **Papyrus** | 1 | Magie rapide | commune | Payez 2 PV : piochez une carte. |
| **Nom effacé** | 2 | Sorcellerie | inhabituelle | L’adversaire défausse une carte. |
| **Offrande de lin** | 2 | Sorcellerie | commune | Toutes vos créatures gagnent +1/+0 jusqu’à la fin du tour. |
| **Le Poids** | 3 | Magie rapide | commune | Le sorcier adverse perd 2 PV et vous en gagnez 2. |
| **Les feuillets** | 4 | Sorcellerie | rare | Les 3 cartes du dessus du paquet adverse partent au cimetière. |
| **La Grande Pesée** | 5 | Sorcellerie | rare | Payez 3 PV : le sorcier adverse perd 3 PV, vous en gagnez 3, puis piochez une carte. |

## Arme

### Khopesh d’or

- **Coût :** 3 mana
- **Rareté :** rare
- **Effet :** Arme — Le porteur gagne +2/+1 et Tribut 1. Quand le porteur meurt, il revient en jeu avec 1 point de défense.

## Jeton

### Shabti — 1/1

Créé par les Momies de lin : 1/1, sans coût.

Ce jeton est créé par des effets : ce n’est pas une carte à ajouter au deck.

## Les decks qui les jouent

- **Le banc d'essai** — `essai-mana-tenebres`, la liste des 30 cartes de la
  fiche `16-deck-la-balance-des-heures.md` (§5).
- **Le deck du catalogue** — « La Balance des Heures » (`balance-des-heures`,
  onglet Deck) : 19 créatures · 10 magies · 1 arme, mono-Ténèbres, composé
  par `rpgDeckComposer.js` autour du Prix, du Tribut et des morts qui
  déclenchent. La Dévoreuse en est l'unique mythique ; Le Passeur, Le Maître
  des hiéroglyphes et La Dernière Pesée attendent les boosters.

## Dernières modifications

- **Uræus du seuil :** 2/1 pour 3 mana, avec Coup rapide à la place de Tribut.
- **Celle qui pèse :** défausse adverse à l’arrivée à la place de Tribut.
- **Le Passeur au masque de chacal :** conserve la réanimation, sans Tribut.
- **Le Maître des hiéroglyphes :** gagne Envol et Coup rapide et conserve la pioche de deux cartes, sans Tribut.
- **Tribut** reste sur le Chacal du seuil et Celui qui juge ; le Khopesh d’or peut aussi le donner à son porteur.

---

Source : `src/games/rpgTenebres.js`. Ce récapitulatif reflète les fiches actuelles du jeu.
