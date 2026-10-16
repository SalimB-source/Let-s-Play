# Set Sable — la mécanique Butin + rééquilibrage (Veilleurs du désert)

La mécanique du set Sable s’appelle **Butin** :

> **Butin** — Quand cette créature touche le sorcier adverse, piochez une carte
> puis défaussez une carte.

Le désert *prend* (la défausse enterre) et le désert *rend* (la réanimation et
le faussoyeur déterrent). Le plan de jeu du deck : **Butin → le monstre est au
cimetière → on le remonte**.

Rendements calculés avec `rpgCardPower.js` (valeur ÷ coût).

## Tableau de bord

| Carte | Avant | Après | Rendement |
|---|---|---|---|
| Chien du guet | 2 mana 2/2 *vanilla* | **2 mana 2/2 + Butin** | 2,30 → 2,90 |
| Fennec des décombres | 2 mana 3/1 · Rapidité + Esquive 1 | **2 mana 3/1 · Rapidité + Butin** | 3,45 → 3,30 |
| Cavalier amazigh du Désert | 5 mana 4/4 · duel | **5 mana 4/4 · duel + Butin** | 2,24 → 2,48 |
| Dune marchante | 4 mana 2/5 *vanilla* | **4 mana 2/5** — *à la mort : recyclage de magie* | 1,90 → 2,28 |
| Faussoyeur des dunes 🆕 | — | **3 mana 2/2 + Butin** + *arrivée : recyclage de créature* | ~2,43 |
| Réanimation 🆕 | — | **5 mana Sorcellerie** — *créature du cimetière → en jeu* | — |
| Tiziri, voix du Djurdjura | 2 mana 2/2 · prot. Eau 2 tours · +1 ATQ permanent | **2 mana 2/1 · prot. Braise permanente · +1 ATQ jusqu’à la fin du tour** | 3,45 → 2,95 |
| Tin Hinan (héros) | 5 mana 4/5 · +2/+0 ET Infiltration à toute l’équipe (elle comprise) | **Infiltration aux autres créatures uniquement, sans boost** | 2,76 → ~2,44* |
| Tislit des Aurès | 1 mana 1/2 | **1 mana 1/1** | 3,20 → 2,53 |
| Tempête de sable | 4 mana (3 dmg) | **5 mana** (3 dmg conservés) | 1,43 → 1,14 |
| **Jitte d’Amayas** | 2 mana | **4 mana** | 4,80 → 2,40 |
| **Masque du guetteur** | pioche 2 / défausse 1 | **pioche 1 / défausse 1** (taux Butin) | 2,65 → 1,75 |
| Guetteur du beffroi | 3 mana 2/2 · pioche 1 à l’arrivée | **3 mana 2/2 · 2 compteurs d’Heures → sonnerie : 2 dmg + pioche** | 2,03 → 2,67 |
| Faiseur de passage | 2 mana 2/2 · pioche 1 à l’arrivée | **2 mana 2/1 · Infiltration à un allié ciblé** | 3,05 → 2,80 |
| Scribe de la Liste | 3 mana 2/2 · pioche 2 à la mort | **3 mana 2/3 · renvoie une carte du cimetière à la mort** | 2,33 → 2,53 |
| Amayas, Tislit (1/1), Djinn, Amani, autres magies, 9 autres armes, héros | — | **inchangés** | déjà justes |

---

## 1. Chien du guet — 2 mana 2/2 + Butin

```js
{
  id: 'chien-du-guet',
  name: 'Chien du guet',
  element: 'sable',
  cost: 2,
  atk: 2,
  def: 2,
  rarity: 'commune',
  typeLine: 'Créature — Chien',
  text: 'Butin — Quand cette créature touche le sorcier adverse, piochez une carte puis défaussez une carte.',
  flavor: 'Il n’aboie pas. Il compte.',
}
```

## 2. Fennec des décombres — Rapidité + Butin

**Changement :** Esquive 1 retirée, **Butin** ajouté. Le pillard pur : il
arrive, il touche, il emporte.

```js
{
  id: 'fennec-des-decombres',
  name: 'Fennec des décombres',
  element: 'sable',
  cost: 2,
  atk: 3,
  def: 1,
  rarity: 'inhabituelle',
  typeLine: 'Créature — Fennec',
  art: 'fennec-des-decombres',
  rapidite: true,
  butin: true,
  text: 'Rapidité — Cette créature peut attaquer le tour où elle arrive. Butin — Quand cette créature touche le sorcier adverse, piochez une carte puis défaussez une carte.',
  flavor: 'Les éclats sifflent ; le Fennec a déjà choisi son prochain pas.',
}
```

## 3. Cavalier amazigh du Désert — duel + Butin

```js
{
  id: 'cavalier-amazigh-du-desert',
  name: 'Cavalier amazigh du Désert',
  element: 'sable',
  cost: 5,
  atk: 4,
  def: 4,
  rarity: 'rare',
  typeLine: 'Créature — Guerrier amazigh',
  art: 'cavalier-amazigh-du-desert',
  arrivee: { type: 'combat', cible: 'creature' },
  butin: true,
  text: 'Quand le Cavalier arrive : il se bat contre une créature adverse ciblée. Chacun inflige à l’autre un nombre de dégâts égal à son attaque. Butin — Quand cette créature touche le sorcier adverse, piochez une carte puis défaussez une carte.',
  flavor: 'Sa monture blanche fend la poussière ; le sabre ouvre la route au milieu du tumulte.',
}
```

## 4. Dune marchante — le recyclage des magies

**Changement :** `text: '—'` → l’effet de mort qui remonte une **carte Magie
ou Sorcellerie** du cimetière. Nouvel effet moteur `recyclage` (voir Impact).

```js
{
  id: 'dune-marchante',
  name: 'Dune marchante',
  element: 'sable',
  cost: 4,
  atk: 2,
  def: 5,
  rarity: 'commune',
  typeLine: 'Créature — Élémental',
  destruction: { type: 'recyclage', cible: 'magie-cimetiere' },
  text: 'Quand la Dune marchante meurt : renvoyez une carte Magie ou Sorcellerie de votre cimetière dans votre main.',
  flavor: 'Le vent la déplace. Elle revient toujours devant la porte.',
}
```

## 5. 🆕 Faussoyeur des dunes — 3 mana 2/2

Le porteur de Butin qui déterre : il remonte une **créature** du cimetière
(la Dune marchante, elle, remonte les magies — les deux moitiés du plan).

```js
{
  id: 'faussoyeur-des-dunes',
  name: 'Faussoyeur des dunes',
  element: 'sable',
  cost: 3,
  atk: 2,
  def: 2,
  rarity: 'rare',
  typeLine: 'Créature — Humain · Faussoyeur',
  art: 'faussoyeur-des-dunes',
  butin: true,
  arrivee: { type: 'recyclage', cible: 'creature-cimetiere' },
  text: 'Butin — Quand cette créature touche le sorcier adverse, piochez une carte puis défaussez une carte. Quand le Faussoyeur arrive : renvoyez une créature de votre cimetière dans votre main.',
  flavor: 'Le désert enterre tout — lui sait où chercher.',
}
```

## 6. 🆕 Réanimation — 5 mana Sorcellerie *(validée)*

La pièce maîtresse du plan Butin : on loote le monstre, on le repose pour 5.

```js
{
  id: 'reanimation',
  name: 'Réanimation',
  element: 'sable',
  kind: 'magie',
  typeLine: 'Sorcellerie — Sable',
  art: 'reanimation',
  cost: 5,
  rarity: 'rare',
  cibles: ['creature-cimetiere'],
  effet: { type: 'reanimation', cible: 'creature-cimetiere' },
  text: 'Ramenez une créature de votre cimetière en jeu sous votre contrôle.',
  flavor: 'Ce que le désert prend, il le rend — à son prix.',
}
```

## 7. Les armes — deux nerfs

### Jitte d’Amayas — 4 mana

**Changement :** `cost: 2 → 4`. Les trois modes et les compteurs restent : la
Jitte garde sa profondeur, elle paie juste son vrai prix (la formule du jeu la
voyait à 4,80 — la carte la plus rentable du catalogue).

```js
  {
    id: 'jitte-d-amayas',
    name: 'Jitte d’Amayas',
    element: 'sable',
    kind: 'arme',
    typeLine: 'Arme — Jitte',
    cost: 4,
    rarity: 'rare',
    bonus: { atk: 2, def: 0 },
    porteurBlesse: { type: 'compteurs-arme', amount: 1 },
    activation: {
      cout: 0,
      compteurs: 1,
      modes: [
        {
          id: 'force',
          label: 'Force du guide',
          description: 'Le porteur gagne +2/+2 jusqu’à la fin du tour.',
          effet: { type: 'buff', atk: 2, def: 2, cible: 'porteur', tours: 1 },
        },
        {
          id: 'trait',
          label: 'Trait de sable',
          description: 'La Jitte inflige 1 blessure à une créature adverse.',
          effet: { type: 'degats', amount: 1 },
        },
        {
          id: 'puits',
          label: 'Halte au puits',
          description: 'Vous gagnez 2 points de vie.',
          effet: { type: 'soin', amount: 2 },
        },
      ],
    },
    text: 'Arme — Le porteur gagne +2/+0. Quand le porteur inflige des blessures de combat, mettez un compteur de sable sur la Jitte. Retirez un compteur : le porteur gagne +2/+2 jusqu’à la fin du tour, ou la Jitte inflige 1 blessure à une créature adverse, ou vous gagnez 2 PV.',
    flavor: 'Trois gestes, et le guide n’a pas encore parlé.',
  },
```

### Masque du guetteur — taux Butin

**Changement :** `pioche: 2 → 1` dans le déclencheur (défausse 1 conservée).
Même taux que le Butin : *ce qui touche le sorcier pioche 1 puis défausse 1*.

```js
  {
    id: 'masque-du-guetteur',
    name: 'Masque du guetteur',
    element: 'sable',
    kind: 'arme',
    typeLine: 'Arme — Masque',
    cost: 2,
    rarity: 'rare',
    bonus: { atk: 1, def: 1 },
    porteurBlesseSorcier: { type: 'pioche-defausse', pioche: 1, defausse: 1 },
    text: 'Arme — Le porteur gagne +1/+1. Quand le porteur inflige des blessures de combat au sorcier adverse : piochez une carte, puis défaussez une carte.',
    flavor: 'Il ne rapporte pas ce qu’il a vu. Il rapporte ce qui manquait.',
  },
```

### Armes inchangées (déjà dans la bande)

Sandales de Tislit (1,00) · Takouba des pistes (1,70) · Licou du chien de
sable (1,80) · Lame des ergs (1,85) · Harnais du méhari (2,13) · Cuirasse de
sel (2,25) · Boussole du Hoggar (2,28) · Javelot du beffroi (2,30) · Takouba
de Tin Hinan (3,16 — mythique).

## 8. Tiziri, voix du Djurdjura — 2 mana 2/1

**Changement :** corps `def: 2 → 1` ; la protection **change de couleur** (Eau →
**Braise**) et devient **permanente** (plus de limite de tours) ; le +1 ATQ
d’équipe devient **temporaire** (`tours: 1`). Le cri de ralliement ne dure que
l’assaut — sa saveur le disait déjà : *« Son chant rassemble les villages
**avant la tempête** »*.

```js
{
  id: 'tiziri-du-djurdjura',
  name: 'Tiziri, voix du Djurdjura',
  element: 'sable',
  cost: 2,
  atk: 2,
  def: 1,
  rarity: 'commune',
  typeLine: 'Créature — Amazighe kabyle',
  art: 'tiziri-du-djurdjura',
  protection: { contre: 'braise' },
  arrivee: { type: 'buff', atk: 1, def: 0, tours: 1 },
  text: 'Tiziri est protégée contre la Braise. Quand elle arrive : vos autres créatures gagnent +1 ATQ jusqu’à la fin du tour.',
  flavor: 'Son chant rassemble les villages avant la tempête.',
}
```

## 9. La famille « pioche » — quatre rôles distincts *(validée)*

Les quatre petites créatures du set faisaient toutes « 2/2 pioche » de façon
interchangeable (Guetteur = Faiseur en plus cher). Chacune devient ce que sa
saveur raconte déjà :

### Tislit des Aurès — inchangée
« Chaque trait de plume ajoute un prénom à la liste » : la pioche EST sa
saveur, et sur un 1/1 à 1 mana c’est son juste rôle (déjà nerfée 1/2 → 1/1).

### Guetteur du beffroi — 3 mana 2/2 · le temps qui sonne
« Le beffroi ne dort jamais, il compte. » — il compte **les heures** (la tour
d’horloge de Bab El). Compte à rebours offensif, fidèle à la mécanique Sable
« offensive ou de temps ».

> À l’arrivée : mettez 2 compteurs d’Heures sur lui. À chaque début de votre
> tour, retirez-en un. Quand le dernier est retiré : infligez 2 dégâts au
> sorcier adverse et piochez une carte.

```js
{
  id: 'guetteur-du-beffroi',
  name: 'Guetteur du beffroi',
  element: 'sable',
  cost: 3,
  atk: 2,
  def: 2,
  rarity: 'commune',
  typeLine: 'Créature — Guetteur du désert',
  art: 'guetteur-du-beffroi',
  arrivee: { type: 'heures', compteurs: 2 },
  text: 'Quand il arrive : mettez 2 compteurs d’Heures sur lui. À chaque début de votre tour, retirez-en un. Quand le dernier est retiré : infligez 2 dégâts au sorcier adverse et piochez une carte.',
  flavor: 'Le beffroi ne dort jamais, il compte.',
}
```

### Faiseur de passage — 2 mana 2/1 · le passage
« Ils ouvrent un passage dans la pierre et dans la bourse. » — le passage
**dans la pierre**, et dans la bourse *via* la synergie : Infiltration sur un
porteur de Butin = attaque garantie sur le sorcier = Butin. L’enableur
d’attaque du set.

> À l’arrivée : une créature alliée ciblée gagne Infiltration jusqu’à la fin
> du tour.

```js
{
  id: 'faiseur-de-passage',
  name: 'Faiseur de passage',
  element: 'sable',
  cost: 2,
  atk: 2,
  def: 1,
  rarity: 'commune',
  typeLine: 'Créature — Artisan de Bab El',
  art: 'faiseur-de-passage',
  arrivee: { type: 'donne', cible: 'allié', donne: { infiltration: true }, tours: 1 },
  text: 'Quand il arrive : une créature alliée ciblée gagne Infiltration jusqu’à la fin du tour.',
  flavor: 'Ils ouvrent un passage dans la pierre et dans la bourse.',
}
```

### Scribe de la Liste — 3 mana 2/3 · la Liste
« La Liste survit à ceux qui la tiennent. » — au pied de la lettre : **toute**
carte revient, souple — là où la Dune marchante ne ramène que les magies et le
Faussoyeur que les créatures.

> Quand il meurt : renvoyez une carte de votre cimetière dans votre main.

```js
{
  id: 'scribe-de-la-liste',
  name: 'Scribe de la Liste',
  element: 'sable',
  cost: 3,
  atk: 2,
  def: 3,
  rarity: 'commune',
  typeLine: 'Créature — Scribe de la Chambre',
  art: 'scribe-de-la-liste',
  destruction: { type: 'recyclage', cible: 'carte-cimetiere' },
  text: 'Quand il meurt : renvoyez une carte de votre cimetière dans votre main.',
  flavor: 'La Liste survit à ceux qui la tiennent.',
}
```

**La famille respire :** Tislit = la pioche simple · Faiseur = l’agression
(enableur Butin) · Guetteur = le temps qui frappe · Scribe = le cimetière.

## 10. Tin Hinan — la route pour les siens *(validée)*

**Changements :** le boost +2/+0 disparaît, et l’Infiltration profite aux
**autres** créatures — Tin Hinan elle-même ne gagne rien. La matriarche ouvre
la route **pour les siens** : la saveur le disait déjà (« elle ouvre la route
et rassemble les siens »). Échelle avec le set : le Faiseur de passage ouvre
un passage, Tin Hinan ouvre la route.

> Quand Tin Hinan arrive : jusqu’à la fin du tour, vos autres créatures ne
> peuvent pas être bloquées.

```js
{
  id: 'tin-hinan',
  name: 'Tin Hinan, mère des pistes',
  element: 'sable',
  cost: 5,
  atk: 4,
  def: 5,
  rarity: 'mythique',
  typeLine: 'Créature légendaire — Matriarche touarègue',
  art: 'tin-hinan-des-pistes',
  arrivee: { type: 'infiltration', cible: 'autres-allies', tours: 1 },
  text: 'Quand Tin Hinan arrive : jusqu’à la fin du tour, vos autres créatures ne peuvent pas être bloquées.',
  flavor: 'Dans la mémoire des pistes, elle ouvre la route et rassemble les siens.',
}
```

Note d’équilibre : la formule la voit à ~2,44, mais elle sous-évalue
l’Infiltration d’équipe — dans un deck Butin, c’est **tous les déclenchements
garantis** + tous les coups au sorcier. C’est une finisseuse de soutien, pas
un beater.

## 11. Nerfs de cohérence

**Tislit, éclaireuse des Aurès** — `def: 2 → 1`.

```js
{
  id: 'tislit-des-aures',
  name: 'Tislit, éclaireuse des Aurès',
  element: 'sable',
  cost: 1,
  atk: 1,
  def: 1,
  rarity: 'commune',
  typeLine: 'Créature — Amazighe chaouie',
  art: 'tislit-des-aures',
  arrivee: { type: 'pioche', amount: 1 },
  text: 'Quand Tislit arrive : piochez une carte.',
  flavor: 'Elle connaît chaque sentier entre les cèdres et les crêtes.',
}
```

**Tempête de sable** — `cost: 4 → 5`.

```js
{
  id: 'tempete-de-sable',
  name: 'Tempête de sable',
  element: 'sable',
  kind: 'magie',
  typeLine: 'Sorcellerie — Sable',
  art: 'tempete-de-sable',
  cost: 5,
  rarity: 'rare',
  cibles: ['toutes'],
  effet: { type: 'degats', amount: 3, cible: 'toutes-creatures' },
  text: '3 dégâts à toutes les créatures adverses.',
  flavor: 'Le ciel se couche. Personne n’est invité.',
}
```

---

## Décisions actées

- **Réanimation** : ✅ gardée dans le set.
- **Fennec** : ✅ Butin à la place d’Esquive 1.
- **Amayas** : ✅ inchangée (protection Braise + pioche à la mort).
- **Tiziri** : ✅ 2/1 · prot. Braise permanente · +1 ATQ jusqu’à la fin du tour.
- **Famille Scribe/Faiseur/Guetteur** : ✅ effets alternatifs validés
  (quatre rôles distincts, §9).
- **Tin Hinan** : ✅ Infiltration aux autres créatures, sans boost, sans rien
  pour elle (§10).

## À surveiller ailleurs

- **Bâton des citernes** (armes Eau, rendement **4,65**) — même maladie que la
  Jitte : à traiter avec le set Eau.
- **Fennec** (3,30) reste le plafond assumé des « stars » du set, comme la
  Guerrière au fer froid côté Neige.

## Impact moteur / code

- **`rpgDuel.js`** :
  - déclencheur **Butin** quand une créature inflige des blessures de combat
    au sorcier (même chemin que `porteurBlesseSorcier` des armes) ;
  - effet `pioche-defausse` : **existe déjà** (Jörmungandr) ;
  - nouveaux effets `recyclage` (cimetière → main : magie pour la Dune,
    créature pour le Faussoyeur, **toute carte** pour le Scribe) et
    `reanimation` (cimetière → table) — la zone cimetière est déjà suivie ;
  - **don ciblé de mot-clé** (Faiseur de passage) : une créature alliée ciblée
    gagne Infiltration jusqu’à la fin du tour (`donne` avec cible + `tours`) ;
  - **compteur d’Heures** (Guetteur du beffroi) : déclencheur « début de votre
    tour » (précédent : Embrasement glouton), retrait de compteur, effet
    composite dégâts + pioche au dernier compteur ;
  - **protection permanente** : la protection de Tiziri n’a plus de `tours` —
    vérifier que le moteur accepte `protection: { contre }` sans `tours`
    (à l’infini), sinon ajouter ce cas à côté du cas limité existant.
- **`rpgCardPower.js`** : `if (carte.butin) valeur += 1.2 ;` et
  `valeurEffet` : `recyclage` → 1,5 (toute carte : 2), `reanimation` → 6,
  `heures` → ~3 (compteurs + effet final), `donne infiltration` → 2,5.
- **`docs/rpg/05-concept-cartes.md`** : nouvelle sous-section « Le Butin
  (set Sable) » à côté de Furie/Résonance/Honneur.
- **Nettoyage fait** : l’ancien classeur du prototype (`RPG_BASIC_CARDS`,
  `RPG_POWER_CARDS`, `RPG_BASIC_ATTACKS`, `RPG_STARTING_COLLECTION`) a été
  supprimé de `rpgCards.js`, catalogue et draft débranchés, syntaxe vérifiée.
- **Tests** : Fennec sans Esquive, Tiziri 2/1 (prot. Braise permanente, buff
  `tours: 1`), Tislit 1/1, Tempête 5 mana, Jitte 4 mana, Masque 1/1, famille
  §9 (Guetteur compteurs d’Heures, Faiseur donne Infiltration, Scribe
  recyclage libre), Tin Hinan (Infiltration aux autres uniquement, elle reste
  bloquable), et les nouveaux effets
  (butin/recyclage/reanimation/protection permanente).
