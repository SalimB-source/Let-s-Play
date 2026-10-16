# Set Eau (Marée des abysses) — rééquilibrage

> Suite des rééquilibrages (Neige, Soleil rouge, Sable). Le set Eau a déjà une
> identité forte (contresorts, retours-main, soins, boucliers) : pas de nouvelle
> mécanique de set. **Deux passes** : les prix/corps hors courbe, et — validée
> sur la direction artistique du jeu — **les effets de dégâts bruts traduits
> dans le langage de l’eau** (« les dégâts, c’est pour la Braise »).

## Tableau de bord

| Carte | Avant | Après | Rendement |
|---|---|---|---|
| **Bâton des citernes** | 2 mana | **4 mana** (serpents gardés) | 4,65 → 2,33 |
| **Sonneur fêlé** | rare, 4 mana 2/3 | **inhabituelle, 3 mana 2/3** | 1,90 → 2,53 |
| **Colosse de sel** | 6 mana 5/5 | **6 mana 6/6** | 2,15 → 2,53 |
| **Vipère de verre** | arrivee : 2 dégâts ciblés | **-2/-0 + ne peut pas attaquer** (la morsure engourdit) | 2,47 → 2,83 |
| **Bakunawa** | arrivee : 2 dégâts ciblés | **ne peut pas bloquer** (la lune dévorée) | 3,10 → 2,98 |
| **Léviathan** | arrivee : 3 dégâts ciblés | **renvoie toutes les autres créatures** (la vague) | 2,71 → 3,08 |
| **Lame de mer** | 3 dégâts ciblés | **-2/-2** (la lame ronge) | 1,88 → 1,04 |
| **Brisure de verre** | 1 dégât à toutes les créatures adverses | **-1/-1 à toutes les créatures adverses** (les éclats plantés) | 0,95 → ~1,2 |
| 🆕 **Écueil** | — | **2 mana Magie Rapide** : contre la créature | ~2,25 |
| Kraken, Jörmungandr, Porteuse, Veilleuse, Yamina, Boualem, 6 autres magies, terrains | — | **inchangés** | déjà justes |

## 1. Bâton des citernes — 4 mana

**Changement :** `cost: 2 → 4`. Tout le reste est gardé (+1/+2, le serpent à
l’arrivée, l’activation à 3 manas) : la carte paie son vrai prix, exactement
comme la Jitte d’Amayas côté Sable.

```js
{
  id: 'baton-des-citernes',
  name: 'Bâton des citernes',
  element: 'eau',
  kind: 'arme',
  typeLine: 'Arme — Bâton',
  cost: 4,
  rarity: 'rare',
  bonus: { atk: 1, def: 2 },
  arrivee: { type: 'jetons', jeton: 'serpent-des-citernes', nombre: 1, ephemere: true },
  activation: { cout: 3, effet: { type: 'jetons', jeton: 'serpent-des-citernes', nombre: 1, ephemere: true } },
  text: 'Arme — Le porteur gagne +1/+2. Quand cette arme arrive en jeu, créez un jeton Serpent 3/1 avec Rapidité, détruit à la fin du tour. 3 : créez un jeton Serpent 3/1 avec Rapidité, détruit à la fin du tour.',
  flavor: 'Il soulève les serpents des citernes comme des rubans de soie — puis les lâche, furieux, entre l’ennemi et vous.',
}
```

## 2. Sonneur fêlé — inhabituelle, 3 mana

**Changements :** `cost: 4 → 3` et `rare → inhabituelle`. Renvoyer une créature
ciblée à 4 manas sur un 2/3 sous-payait son Rebond ; à 3 manas, le Sonneur
retrouve sa place dans la courbe. Son reclassement en inhabituelle le fait
entrer dans la dotation de départ ; Abysses 1 ne le révèle donc plus au Souk.

```js
{
  id: 'sonneur-fele',
  name: 'Sonneur fêlé',
  element: 'eau',
  cost: 3,
  atk: 2,
  def: 3,
  rarity: 'inhabituelle',
  typeLine: 'Créature — Sonneur',
  art: 'sonneur-fele',
  arrivee: { type: 'retour-main', cible: 'creature' },
  text: 'Rebond — Quand le Sonneur arrive : il renvoie la créature ciblée dans la main de son propriétaire.',
  flavor: 'Un seul coup de bâton sur le bronze fêlé, et l’écho chasse l’intrus.',
}
```

## 3. Colosse de sel — 6/6

**Changement :** corps `5/5 → 6/6`. Un « colosse » 5/5 à 6 manas était le
géant le plus mou du catalogue.

```js
{
  id: 'colosse-de-sel',
  name: 'Colosse de sel',
  element: 'eau',
  cost: 6,
  atk: 6,
  def: 6,
  rarity: 'rare',
  typeLine: 'Créature — Géant',
  arrivee: { type: 'buff', atk: 1, def: 1 },
  text: 'Quand le Colosse arrive : vos autres créatures gagnent +1/+1.',
  flavor: 'La mer est partie. Son sel est resté debout.',
}
```

## 4. Les dégâts → le langage de l’eau *(validé)*

Règle de direction : **les effets de dégâts bruts appartiennent à la Braise**.
L’Eau contrôle : elle ronge, engourdit, emporte, protège. Le combat normal des
créatures (Serpents, Kraken…) reste des dégâts de combat — ce sont les **effets**
qui changent de langue.

### Vipère de verre — la morsure engourdit
> Quand la Vipère arrive : une créature adverse ciblée gagne **-2/-0** et **ne
> peut pas attaquer** pendant le prochain tour de son contrôleur.

```js
{
  id: 'vipere-de-verre',
  name: 'Vipère de verre',
  element: 'eau',
  cost: 3,
  atk: 3,
  def: 1,
  rarity: 'rare',
  typeLine: 'Créature — Vipère',
  arrivee: { type: 'debuff', atk: -2, def: 0, cible: 'creature-adverse', empecheAttaque: true, tours: 1 },
  text: 'Quand la Vipère arrive : une créature adverse ciblée gagne -2/-0 et ne peut pas attaquer pendant le prochain tour de son contrôleur.',
  flavor: 'Elle mord une créature adverse.',
}
```

### Bakunawa — la lune dévorée *(mythique)*
> Quand Bakunawa arrive : choisissez une créature adverse — elle **ne peut pas
> bloquer** pendant le prochain tour de son contrôleur.

Le miroir de la Vipère : l’un retire l’attaque, l’autre la défense. La lune
avale, plus rien n’éclaire la garde.

```js
{
  id: 'bakunawa',
  name: 'Bakunawa',
  element: 'eau',
  cost: 4,
  atk: 3,
  def: 6,
  rarity: 'mythique',
  typeLine: 'Créature — Serpent marin',
  arrivee: { type: 'empeche-blocage', cible: 'creature-adverse', tours: 1 },
  text: 'Quand Bakunawa arrive : choisissez une créature adverse — elle ne peut pas bloquer pendant le prochain tour de son contrôleur.',
  flavor: 'Il dévore la lune. La nuit tombe sur la défense.',
}
```

### Léviathan — la vague *(mythique)*
> Quand le Léviathan arrive : **renvoyez toutes les autres créatures** dans la
> main de leur propriétaire.

La mythique signature de la Marée : la vague de fond qui remet toute la table
dans les mains — le rêve du jeu de tempo.

```js
{
  id: 'leviathan',
  name: 'Léviathan',
  element: 'eau',
  cost: 6,
  atk: 5,
  def: 6,
  rarity: 'mythique',
  typeLine: 'Créature — Léviathan',
  arrivee: { type: 'retour-main', cible: 'toutes-autres' },
  text: 'Quand le Léviathan arrive : renvoyez toutes les autres créatures dans la main de leur propriétaire.',
  flavor: 'La vague ne choisit pas ce qu’elle emporte.',
}
```

### Lame de mer — la lame ronge
> La créature ciblée gagne **-2/-2**.

```js
{
  id: 'lame-de-mer',
  name: 'Lame de mer',
  element: 'eau',
  kind: 'magie',
  typeLine: 'Magie — Eau',
  art: 'lame-de-mer',
  cost: 2,
  rarity: 'commune',
  cibles: ['creature'],
  effet: { type: 'buff', atk: -2, def: -2, cible: 'creature-adverse' },
  text: 'La créature ciblée gagne -2/-2.',
  flavor: 'La mer taille dans le vivant sans jamais brûler.',
}
```

### Brisure de verre — les éclats plantés
> **-1/-1 à toutes les créatures adverses.**

```js
{
  id: 'brisure-de-verre',
  name: 'Brisure de verre',
  element: 'eau',
  kind: 'magie',
  typeLine: 'Magie Rapide — Eau',
  art: 'brisure-de-verre',
  instant: true,
  cost: 2,
  rarity: 'rare',
  cibles: ['toutes'],
  effet: { type: 'buff', atk: -1, def: -1, cible: 'toutes-creatures-adverses' },
  text: 'Magie Rapide — Toutes les créatures adverses gagnent -1/-1.',
  flavor: 'Le verre se fend en mille éclats, jamais au hasard.',
}
```

## 5. 🆕 Écueil — 2 mana Magie Rapide *(nouvelle carte)*

La famille des contresorts avait un trou : on pouvait contrer **une carte**
(Contresort des abîmes, 4 manas), une **magie rapide ou sorcellerie** (Silence
d’écume, 2 manas), ou **un sort + pioche** (Marée contraire, 3 manas) — mais
jamais une **créature** seule. Écueil comble le trou, au prix le plus bas de
la famille.

```js
{
  id: 'ecueil',
  name: 'Écueil',
  element: 'eau',
  kind: 'magie',
  typeLine: 'Magie Rapide — Eau',
  art: 'ecueil',
  instant: true,
  cost: 2,
  rarity: 'commune',
  cibles: ['soi'],
  effet: { type: 'contresort', cible: 'creature' },
  text: 'Magie Rapide — Contre la créature annoncée par l’adversaire.',
  flavor: 'Un récif ne bouge pas. Les bêtes non plus.',
}
```

**La famille des contresorts, complète :**

| Carte | Coût | Contre quoi |
|---|---|---|
| 🆕 Écueil | 2 | la créature (le mur anti-bêtes) |
| Silence d’écume | 2 | magie rapide ou sorcellerie |
| Marée contraire | 3 | un sort, puis pioche 1 |
| Contresort des abîmes | 4 | toute carte |

## Cartes inchangées

**Créatures :** Porteuse de cruches (2,90) · Veilleuse des citernes (2,23) ·
Kraken (2,52) · Jörmungandr (2,29) · Serpent des citernes (jeton éphémère).

**Héros mythiques :** Yamina (2,63) · Boualem (3,47 — « une fois dans la
partie »).

**Magies :** Eau de la source (2,00) · Parade du verre (1,05) ·
Contresort des abîmes (1,50) · Silence d’écume (2,00) · Marée contraire (2,50) ·
Ressac (2,00) · Courant de retour (1,17).

**Terrains :** Mer · Lagune des Salines.

## Impact moteur / code

- **Effets nouveaux** (`rpgDuel.js`) :
  - `debuff` ciblé avec `empecheAttaque` (Vipère) et `empecheBlocage`
    (Bakunawa) — restriction d’attaque/bloquage pour 1 tour (le miroir du
    gel existe peut-être déjà côté Neige : vérifier et réutiliser) ;
  - `retour-main` avec `cible: 'toutes-autres'` (Léviathan) — variante de
    masse du retour-main existant (Sonneur) ;
  - `buff` négatif ciblé et `toutes-creatures-adverses` (Lame de mer,
    Brisure de verre) ;
  - `contresort` avec `cible: 'creature'` (Écueil) — même effet que le
    Contresort des abîmes, filtre de cible étroit.
- **`rpgCardPower.js`** : `valeurEffet` : `debuff` → |atk|×0,8 + |def|×0,6,
  `empecheAttaque`/`empecheBlocage` → ~2, `retour-main` de masse → 6,
  `contresort` creature → ~4,5.
- **`docs/rpg/05-concept-cartes.md`** : note de direction — « les effets de
  dégâts bruts appartiennent à la Braise » (et la sous-section Butin déjà
  prévue côté Sable).
- **Tests** : Bâton à 4 manas, Sonneur à 3 manas, Colosse 6/6, Vipère (-2/-0 +
  bloquée l’attaque), Bakunawa (bloquage bloqué), Léviathan (masse), Lame de
  mer (-2/-2), Brisure (-1/-1), Écueil (contre une créature, PAS un sort).
