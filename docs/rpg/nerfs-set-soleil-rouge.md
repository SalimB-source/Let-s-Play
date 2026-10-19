# Rééquilibrage du set Soleil rouge — Serment du Soleil rouge

Règle retenue : chaque carte garde **son identité** (Honneur par rareté 1/2/3,
Résonance samouraï, bannière du Daimyō, aura de forge) — chiffres et effets
ciblés uniquement. Rendements calculés avec `rpgCardPower.js` (valeur ÷ coût,
Honneur compris).

| Carte | Avant | Après | Rendement |
|---|---|---|---|
| Susanoo | 5 mana 6/3 · exil | **6 mana 5/3** · exil conservé | 3,96 → 3,08 |
| Tengu du mont ardent | 4 mana 4/2 | **4 mana 2/2** | 3,92 → 3,27 |
| Samouraï du torii | 3 mana 2/3 | **3 mana 1/3** | 3,87 → 3,43 |
| Kenshi de la forge | 3 mana 1/3 | **3 mana 1/2** | 2,93 → 2,60 |
| Onna-musha des cendres | 4 mana 3/3 | **4 mana 3/3 + Esquive** *(effet alternatif — buff)* | 2,23 → 2,60 |
| Feux de kitsune | 3 mana | **4 mana** (écho conservé) | 1,57 → 1,18 |
| Sabre maudit | +5/-2 · Coup rapide | **+4/-2** · Coup rapide conservé | 1,20 → 1,00 |
| Ashigaru, Hatamoto, Rōnin, Daimyō, Oni, Cavalier, Kagutsuchi, Orochi | — | inchangés | dans la bande |
| Frappe d’iaijutsu, Serment de la forge, terrains | — | inchangés | parité inter-sets |

Toutes les fiches ci-dessous sont à coller dans **`src/games/rpgSoleilRouge.js`**
(les textes restent sans la phrase d’Honneur : l’helper `carte()` la recolle).

---

## 1. Susanoo — 6 mana 5/3 (exil conservé)

**Changement :** `cost: 5 → 6`, `atk: 6 → 5`. Le reste strictement identique.

```js
  carte({
    id: 'susanoo', name: 'Susanoo',
    cost: 6, atk: 5, def: 3, rarity: 'mythique',
    typeLine: 'Créature légendaire — Kami · Tempête',
    arrivee: { type: 'exil', cible: 'creature' },
    text: 'Quand Susanoo arrive en jeu, retirez de la partie une créature de votre choix.',
    flavor: 'Sa tempête emporte jusqu’au souvenir de ses adversaires.',
  }),
```

## 2. Tengu du mont ardent — 4 mana 2/2

**Changement :** `atk: 4 → 2`. Le reste strictement identique.
(Sa propre Résonance le fait déjà jouer 3/3 tant qu’il est en jeu.)

```js
  carte({
    id: 'tengu-du-mont-ardent', name: 'Tengu du mont ardent',
    cost: 4, atk: 2, def: 2, rarity: 'rare', envol: true,
    typeLine: 'Créature — Yōkai · Tengu',
    resonance: 1,
    resonanceTribu: 'samourai',
    text: 'Résonance samouraï — Tant qu’il est en jeu, toutes les créatures de type Samouraï de la table, dans les deux camps, gagnent +1/+1. Envol — Ne peut être bloqué que par une créature avec Envol.',
    flavor: 'La montagne enseigne à ceux qui savent écouter ses ailes.',
  }),
```

## 3. Samouraï du torii — 3 mana 1/3

**Changement :** `atk: 2 → 1`. Le reste strictement identique.
(Sa propre Résonance le fait jouer 2/3 ; c’est le seigneur du deck, pas un beater.)

```js
  carte({
    id: 'samourai-du-torii', name: 'Samouraï du torii',
    cost: 3, atk: 1, def: 3, rarity: 'rare',
    typeLine: 'Créature — Humain · Samouraï',
    resonance: 1,
    resonanceTribu: 'samourai',
    text: 'Résonance samouraï — Tant qu’il est en jeu, toutes les créatures de type Samouraï de la table, dans les deux camps, gagnent +1/+1.',
    flavor: 'Il ne garde pas la porte pour empêcher les vivants d’entrer.',
  }),
```

## 4. Kenshi de la forge — 3 mana 1/2

**Changement :** `def: 3 → 2`. Le reste strictement identique.

```js
  carte({
    id: 'kenshi-de-la-forge', name: 'Kenshi de la forge',
    cost: 3, atk: 1, def: 2, rarity: 'rare',
    typeLine: 'Créature — Humain · Samouraï',
    aura: { type: 'buff-tribu', tribu: 'samourai', atk: 2, def: 0, saufSoi: true, camps: 'tous' },
    text: 'Tant qu’il est en jeu, les autres créatures de type Samouraï de la table, dans les deux camps, gagnent +2/+0.',
    flavor: 'Il a appris à tenir l’acier avant de savoir tenir une lame.',
  }),
```

## 5. Onna-musha des cendres — 4 mana 3/3 + Esquive *(effet alternatif : buff)*

**Changement :** ajout d’`esquive` et de sa ligne de texte (la naginata
défend — elle esquive parfois le coup entier). L’Honneur 2 est toujours recollé
par l’helper `carte()`.

*Révision (demande 24) :* l’Esquive ne retire plus 1 dégât par coup, elle donne
**25 % de chance d’esquiver une attaque** — le coup ne porte pas du tout, et les
magies ne s’esquivent jamais. Le champ est un booléen, sans chiffre.

```js
  carte({
    id: 'onna-musha-des-cendres', name: 'Onna-musha des cendres',
    cost: 4, atk: 3, def: 3, rarity: 'rare', esquive: true,
    typeLine: 'Créature — Humaine · Guerrière · Samouraï',
    text: 'Esquive — 25 % de chance d’esquiver une attaque : elle ne porte pas du tout.',
    flavor: 'La naginata décrit un cercle ; personne n’en franchit le bord.',
  }),
```

## 6. Feux de kitsune — 4 mana

**Changement :** `cost: 3 → 4`. Le reste strictement identique.

```js
  carte({
    id: 'feux-de-kitsune', name: 'Feux de kitsune',
    kind: 'magie', cost: 4, rarity: 'rare',
    typeLine: 'Sorcellerie — Feu follet · Braise',
    cibles: ['toutes'],
    effet: { type: 'degats', amount: 2, cible: 'toutes-creatures', echo: { amount: 1, tours: 1 } },
    text: 'Inflige 2 dégâts à toutes les créatures adverses, puis 1 dégât supplémentaire au début de votre tour suivant.',
    flavor: 'Ne suivez pas les lumières entre les cèdres : elles connaissent déjà votre chemin.',
  }),
```

## 7. Sabre maudit — +4/-2 (Coup rapide conservé)

**Changement :** `atk: 5 → 4` dans l’effet, et le même chiffre dans le texte
imprimé.

```js
  carte({
    id: 'sabre-maudit', name: 'Sabre maudit',
    kind: 'magie', cost: 4, rarity: 'rare',
    typeLine: 'Arme — Sabre maudit',
    cibles: ['creature-amie'],
    effet: { type: 'arme', cible: 'creature-amie', atk: 4, def: -2, coupRapide: true },
    text: 'Arme — Le porteur gagne +4/-2 et Coup rapide : déclaré attaquant, il peut frapper une créature adverse de votre choix — elle encaisse sa force sans riposte, et son attaque s’arrête là ; sans proie désignée, il attaque normalement. Le sabre reste attaché et rejoint le cimetière quand le porteur quitte le jeu. Si sa défense tombe à 0, le porteur meurt.',
    flavor: 'La lame prend la force. La main en paie le prix.',
  }),
```

---

## Impact

- **`RPG_HONNEUR_PAR_RARETE`** : inchangé (1/2/3 — identité du set).
- **`rpgDeckRecipes.js`** (`serment-du-soleil-rouge`) : rien à toucher — la
  signature ne cite pas de statistiques. Feux de kitsune coûte 1 mana de plus,
  la courbe du deck se rééquilibre toute seule.
- **Tests** : vérifier les tests qui figent des statistiques
  (`tests/rpg-*.test.js`, checks UI) — notamment Susanoo 6 mana, Tengu 2/2,
  Torii 1/3, Kenshi 1/2, Sabre +4/-2.
