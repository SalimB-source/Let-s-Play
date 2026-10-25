# Rééquilibrage du set Neige — Serment des Neuf Hivers

Règle retenue : chaque carte garde **son identité** (Furie 1→2→3, Résonance,
lance ciblée, Attaque ciblée) — seuls les chiffres changent. Rendements calculés
avec `rpgCardPower.js` (valeur ÷ coût).

| Carte | Avant | Après | Rendement |
|---|---|---|---|
| Valkyrie des glaces | 5 mana 4/4 | **5 mana 3/3** (lance : 2 dmg, inchangée) | 3,64 → 3,18 |
| Valkyrie au corbeau | 4 mana 3/3 | **4 mana 2/3** | 3,35 → 3,02 |
| Berserk des trois hivers | 4 mana 3/3 | **4 mana 3/2** | 2,83 → 2,58 |
| Jarl au marteau de guerre | 5 mana 4/4 | **5 mana 3/4** | 2,46 → 2,20 |
| Drakkar à tête de dragon | 5 mana 4/6 | inchangé (option 4/5 écartée) | 2,54 |
| Guerrier / Loup / Scalde / Géant | — | inchangés | déjà justes |
| Magies / Lance de givre / terrains | — | inchangées | cohérentes |
| Le Maître du marteau (Figure) | 6 mana 5/5 · AoE 3 + Furie 3 + Tenacité | **AoE 3 → 2 dégâts** (survie du deck) | 3,63 → 3,32 |

---

## 1. Valkyrie des glaces — 5 mana 3/3 (lance 2 dmg conservée)

**Changement :** `atk: 4 → 3`, `def: 4 → 3`. Le reste strictement identique.

```js
{
  id: 'valkyrie-des-glaces',
  name: 'Valkyrie des glaces',
  element: 'neige',
  cost: 5,
  atk: 3,
  def: 3,
  rarity: 'rare',
  typeLine: 'Créature — Valkyrie',
  art: 'valkyrie-des-glaces',
  resonance: 1,
  envol: true,
  arrivee: { type: 'degats', amount: 2, cible: 'creature' },
  text: 'Résonance — Tant qu’elle est en jeu, toutes les créatures Neige de la table gagnent +1/+1. Envol — Ne peut être bloquée que par une créature avec Envol. Quand elle arrive : choisissez une créature adverse — sa lance de givre lui inflige 2 dégâts.',
  flavor: 'Elle choisit qui monte, et qui reste dans la neige.',
}
```

## 2. Valkyrie au corbeau — 4 mana 2/3

**Changement :** `atk: 3 → 2`. Le reste strictement identique.
(Sa propre Résonance la fait déjà jouer 3/3 tant qu’elle est en jeu.)

```js
{
  id: 'valkyrie-au-corbeau',
  name: 'Valkyrie au corbeau',
  element: 'neige',
  cost: 4,
  atk: 2,
  def: 3,
  rarity: 'rare',
  typeLine: 'Créature — Valkyrie',
  art: 'valkyrie-au-corbeau',
  resonance: 1,
  envol: true,
  text: 'Résonance — Tant qu’elle est en jeu, toutes les créatures Neige de la table gagnent +1/+1. Envol — Ne peut être bloquée que par une créature avec Envol.',
  flavor: 'Le corbeau tourne une fois, puis la mêlée se souvient de son nom.',
}
```

## 3. Berserk des trois hivers — 4 mana 3/2

**Changement :** `def: 3 → 2`. Le reste strictement identique.

```js
{
  id: 'berserk-des-trois-hivers',
  name: 'Berserk des trois hivers',
  element: 'neige',
  cost: 4,
  atk: 3,
  def: 2,
  rarity: 'rare',
  typeLine: 'Créature — Berserk viking',
  art: 'berserk-des-trois-hivers',
  furie: 2,
  coupRapide: true,
  text: 'Furie 2 — La première fois qu’il est blessé et survit, le Berserk gagne +2/+2. Attaque ciblée — Sélectionné pour attaquer, il peut frapper une créature adverse de votre choix (30 % de chances de rater, 100 % de chances de toucher s’il attaque l’adversaire) : il lui inflige ses dégâts d’attaque, sans riposte, et son attaque s’arrête là. Si vous ne désignez personne, il attaque normalement.',
  flavor: 'Trois hivers de rage tenus dans un seul bras — et le sang ne fait que l’attiser.',
}
```

## 4. Jarl au marteau de guerre — 5 mana 3/4

**Changement :** `atk: 4 → 3`. Le reste strictement identique.
(Furie 3 conservée : il devient 6/7 une fois blessé — le Champion 6 mana
reste la pièce maîtresse.)

```js
{
  id: 'jarl-au-marteau-de-guerre',
  name: 'Jarl au marteau de guerre',
  element: 'neige',
  cost: 5,
  atk: 3,
  def: 4,
  rarity: 'rare',
  typeLine: 'Créature — Jarl viking',
  art: 'jarl-au-marteau-de-guerre',
  furie: 3,
  text: 'Furie 3 — La première fois qu’il est blessé et survit, le Jarl gagne +3/+3.',
  flavor: 'Le vieux chef ne crie pas : il encaisse, puis il avance.',
}
```

---

## 5. Le Maître du marteau — l’AoE calmée *(héros, validé)*

**Changement :** l’embrasement d’arrivée passe **3 → 2 dégâts** à toutes les
créatures adverses. Furie 3 et Tenacité sont gardées : il restait le seul
héros du jeu au-dessus du plafond mythique (3,63) — trois mythes dans une
carte. À 2 dégâts, « son marteau tombe » frappe encore très fort (3,32).

```js
{
  id: 'maitre-du-marteau',
  name: 'Le Maître du marteau',
  element: 'neige',
  cost: 6,
  atk: 5,
  def: 5,
  rarity: 'mythique',
  typeLine: 'Créature légendaire — Héros',
  art: 'maitre-du-marteau',
  arrivee: { type: 'degats', amount: 2, cible: 'toutes-creatures' },
  furie: 3,
  tenacite: true,
  text: 'Quand il arrive : son marteau tombe — 2 dégâts à toutes les créatures adverses. Furie 3 — La première fois qu’il est blessé et survit, le Maître gagne +3/+3. Tenacité — Une fois par partie, s’il doit être détruit, il survit et il lui reste 1 point de défense.',
  flavor: 'Le tonnerre n’est pas un bruit : c’est un rendez-vous — et son marteau, lui, retrouve toujours sa main.',
}
```

## Impact

- **`05-concept-cartes.md`** : rien à toucher — seules les valeurs de Furie
  (1/2/3) y sont documentées, elles sont conservées.
- **`rpgDeckRecipes.js`** : rien à toucher — la signature du Serment
  (jarl, loup, guerrier…) ne cite pas de statistiques.
- **`rpgCardPower.js`** : rien à toucher — la formule reçoit simplement des
  corps plus petits ; le classement du composeur se recalcule tout seul.
- **Tests** : Valkyrie 3/3, Valkyrie corbeau 2/3, Berserk 3/2, Jarl 3/4, et
  le Maître du marteau (2 dégâts à l’arrivée — plus 3 —, Furie 3 et Tenacité
  inchangées).

---

## 6. Le Maître du marteau — la Furie du Tonnerre *(révision de la fiche)*

**Changement :** la fiche quitte l'AoE et l'Overkill imprimé. Le Maître
**frappe à l'arrivée** — 3 dégâts à une créature **ou** au sorcier adverse, au
choix, comme un Trait de braise — et **sa Furie lui prête Overkill et Envol**
tant qu'elle tient. Tenacité est conservée, et sa renaissance rejoue
désormais explicitement l'effet d'arrivée : un Maître revenu frappe de
nouveau.

```js
{
  id: 'maitre-du-marteau',
  name: 'Le Maître du marteau',
  element: 'neige',
  cost: 6,
  atk: 5,
  def: 5,
  rarity: 'mythique',
  typeLine: 'Créature légendaire — Héros',
  art: 'maitre-du-marteau',
  furie: 3,
  furieGains: { overkill: true, envol: true },
  tenacite: true,
  arrivee: { type: 'degats', amount: 3, cible: 'creature', cibles: ['creature', 'sorcier'] },
  text: 'Quand il arrive : son marteau frappe — 3 dégâts à une créature ou au sorcier adverse, au choix. Furie 3. Tant que sa Furie est active, il gagne aussi Overkill et Envol. Tenacité — Une fois par partie, quand il meurt (sauf exilé), il revient en jeu au début de votre prochain tour avec 1 point de défense ; son effet d’arrivée se déclenche alors de nouveau.',
}
```

- **`rpgDuel.js`** : `furieGains` allume et éteint les mots-clés avec la Furie ;
  l'arrivée accepte `cibleId: 'sorcier'` (`arriveeViseSorcier`,
  `effetArriveePourCible`) ; `appliquerArriveeDeRetour` rejoue l'arrivée des
  retours en jeu (Tenacité, Khopesh, Anqa).
- **`RpgDuelPage.jsx`** : le visage adverse s'allume pendant l'attente
  d'arrivée, et le clic dessus résout les 3 dégâts.
