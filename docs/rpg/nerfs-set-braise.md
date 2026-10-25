# Set Braise (Cour des Djinns & Sentiers de cendre) — rééquilibrage

> Dernier set du catalogue (après Neige, Soleil rouge, Sable, Eau). Ici, **les
> effets de dégâts restent** : c’est la langue de la Braise, confirmée par la
> direction (« les dégâts, c’est pour la braise »). Seuls les prix, les corps
> et la vitesse de renaissance d’Anqa bougent.
>
> Ce set couvre les deux decks braise : **Cour des Djinns** (mono-Braise) et
> **Sentiers de cendre** (hybride Sable + Braise).

## Tableau de bord

| Carte | Avant | Après | Rendement |
|---|---|---|---|
| **Anqa des braises** (mythique) | 4 mana 4/4 Envol · revient après **2** tours | **5 mana** · revient après **4** tours | ~3,55 → ~2,95 |
| **Djinn du souk** (mythique) | 5 mana 3/3 · détruit un terrain adverse au hasard | **5 mana 5/4** (effet gardé) | 1,88 → 2,60 |
| **Fériel** (héros mythique) | 4 mana 3/1 · Rapidité + Attaque ciblée | **4 mana 4/3** | 1,85 → 2,68 |
| **Braisier du souk** (rare) | 3 mana 1/1 · 1 dégât aux créatures adverses | **3 mana 2/2** · + 1 dégât **au sorcier adverse** | 1,40 → 2,58 |
| **Armure de cendres** (arme) | 3 mana +3/+3 · Rapidité · Immunité Braise | **4 mana** (package gardé) | 3,13 → 2,35 |
| Ghul des cendres, Sahir, Ifrit des ergs, Ifrit al-Ahmar, Trait de braise, Nuage de cendres, Vent rouge, Djinn de foudre, terrains | — | **inchangés** | déjà justes |

## 1. Anqa des braises — 5 mana, renaissance lente

**Changements :** `cost: 4 → 5`, et le retour passe **de deux à quatre tours**.
L’Anqa renaît trop vite pour qu’on la sente partir — au bout de quatre tours,
sa revient est un vrai événement de fin de partie, pas un tour d’absence.

```js
{
  id: 'anqa-des-braises',
  name: 'Anqa des braises',
  element: 'braise',
  cost: 5,
  atk: 4,
  def: 4,
  rarity: 'mythique',
  typeLine: 'Créature — Phénix',
  art: 'anqa-des-braises',
  envol: true,
  destruction: { type: 'retour-differe', tours: 4 },
  text: 'Envol — Ne peut être bloquée que par une créature avec Envol. Quand Anqa est détruite : elle revient en jeu après quatre tours.',
  flavor: 'Même la cendre sait où se cachent les braises.',
}
```

## 2. Djinn du souk — 5/4

**Changement :** corps `3/3 → 5/4`. L’effet (détruire un terrain adverse au
hasard) est gardé tel quel — le djinn des épices avait juste un corps à sa
taille de légende.

```js
{
  id: 'djinn-du-souk',
  name: 'Djinn du souk',
  element: 'braise',
  cost: 5,
  atk: 5,
  def: 4,
  rarity: 'mythique',
  typeLine: 'Créature — Djinn',
  art: 'djinn-du-souk',
  arrivee: { type: 'destruction-terrain', cible: 'terrain-adverse', hasard: true },
  text: 'Quand le Djinn arrive : il détruit un terrain adverse au hasard.',
  flavor: 'Il vendait des épices. Il a gardé le feu.',
}
```

## 3. Fériel — 4/3

**Changement :** corps `3/1 → 4/3`. La lame de verre frappait trop légère
pour une mythique ; en 4/3 Rapidité + Attaque ciblée, elle devient le miroir
agressif de Salem (4/3 défensif).

```js
{
  id: 'feriel',
  name: 'Fériel',
  element: 'braise',
  cost: 4,
  atk: 4,
  def: 3,
  rarity: 'mythique',
  typeLine: 'Héroïne — Souffleuse de verre',
  art: 'feriel',
  rapidite: true,
  coupRapide: true,
  text: 'Rapidité. Attaque ciblée — Sélectionnée pour attaquer, Fériel peut frapper une créature adverse de votre choix (30 % de chances de rater, 100 % de chances de toucher si elle attaque l’adversaire) : elle lui inflige ses dégâts d’attaque, sans riposte, et son attaque s’arrête là. Si vous ne désignez personne, elle attaque normalement.',
  flavor: 'Le verre se souvient du feu.',
}
```

## 4. Braisier du souk — 2/2, le feu se propage

**Changements :** corps `1/1 → 2/2`, et l’embrasement gagne le sorcier adverse
(« une seule braise, et le marché se vide ») — ça le distingue du Ghul des
cendres, qui ne brûle que les créatures, et seulement à la mort.

```js
{
  id: 'braisier-du-souk',
  name: 'Braisier du souk',
  element: 'braise',
  cost: 3,
  atk: 2,
  def: 2,
  rarity: 'rare',
  typeLine: 'Créature — Élémentaire',
  art: 'braisier-du-souk',
  arrivee: { type: 'degats', amount: 1, cible: 'toutes-creatures' },
  degatsSorcier: 1,
  text: 'Quand le Braisier arrive : 1 dégât à toutes les créatures adverses et au sorcier adverse.',
  flavor: 'Une seule braise, et le marché se vide.',
}
```

## 5. Armure de cendres — 4 mana

**Changement :** `cost: 3 → 4`. Le package (+3/+3, Rapidité, Immunité Braise)
reste entier — il paie son vrai prix, comme la Jitte (Sable) et le Bâton des
citernes (Eau).

```js
{
  id: 'armure-de-cendres',
  name: 'Armure de cendres',
  element: 'braise',
  kind: 'arme',
  typeLine: 'Armure — Cendres',
  cost: 4,
  rarity: 'rare',
  bonus: { atk: 3, def: 3 },
  donne: { rapidite: true, immunite: 'braise' },
  text: 'Arme — Le porteur gagne +3/+3 et Rapidité. Il est immunisé contre la Braise.',
  flavor: 'Sous la cendre, la chaleur ne brûle plus — elle attend.',
}
```

## Cartes inchangées

**Créatures :** Ghul des cendres (2,56 — 1 dégât à toutes les créatures
adverses à la mort) · Sahir des braises (3,3 — mythique assumée : pioche 1 +
« 2 dégâts avant riposte » en attaque comme en blocage) · Ifrit des ergs
(2,60) · Djinn de foudre (3,05 — hybride Sable+Braise).

**Héros :** Ifrit al-Ahmar (2,77).

**Magies :** Trait de braise (1,88 — 3 dégâts créature ou sorcier) ·
Nuage de cendres (1,90) · Vent rouge (1,27 — hybride).

**Terrains :** Montagne · Crêtes de cendre · Pétra · Pétra des deux sources.

## Impact moteur / code

- **`rpgDuel.js`** :
  - le retour différé d’Anqa existe déjà (« après deux tours ») — passer le
    délai à **4 tours** (paramètre `tours` du `retour-differe` / compteurs) ;
  - Braisier : effet de dégâts **combiné** (toutes les créatures adverses +
    le sorcier) — soit deux `effets` sur `arrivee`, soit une nouvelle cible
    mixte `toutes-creatures-adverses-et-sorcier` (les deux cas de `degats`
    existent déjà séparément).
- **`rpgCardPower.js`** : `retour-differe` → valeur dégressive selon la durée
  (2 tours : 2,5 → 4 tours : ~1,75) ; `degats` avec cible mixte → somme des
  deux cas.
- **`docs/rpg/05-concept-cartes.md`** : note de direction — « les effets de
  dégâts bruts appartiennent à la Braise » (avec la sous-section Butin côté
  Sable et le rappel Eau : ronger/renvoyer/contrer).
- **Tests** : Anqa à 5 manas et renaissance au 4e tour (pas avant), Djinn du
  souk 5/4, Fériel 4/3, Braisier 2/2 (+1 au sorcier), Armure à 4 manas.
