# 16 — Le deck « La Balance des Heures » (Ténèbres · civilisation égyptienne)

**Statut : le set, le banc d'essai et le deck du catalogue sont codés.**
La fiche ci-dessous reste la référence de design. Le format cible d'origine —
le **banc d'essai sans terrains** (`modeMana: 'essai'`,
`15-essai-mana-sans-terrains.md`) — **30 cartes non-terrain**, main de départ 3,
main max 6, mana +1 par tour jusqu'à 10, champ de 5 cases avec sacrifice de la
sixième — est rejoint depuis par le **deck de collection** de l'étagère
(§10.3 et « Le deck du catalogue » plus bas). Le format classique avec
terrains (le Portail scellé) reste en phase 2.

## 1. Le parti pris : l'Égypte pharaonique

Comme le Nord pour la Neige ou le Japon pour le Soleil rouge, chaque couleur du
Sablier puise dans une civilisation. Les Ténèbres prennent l'**Égypte
pharaonique**, et le motif central tombe tout seul :

> Le **Jugement** — le cœur du défunt posé sur la balance contre la plume. Trop
> lourd, il est dévoré. **Les points de vie sont le poids du cœur** : « payez
> N PV » n'est pas une abstraction, c'est l'iconographie même de la
> civilisation.

Trois raisons de choisir celle-là :

1. **L'accroche art déco est historique.** Bab El est une ville art déco ; la
   *mania* égyptienne de 1922 (Toutankhamon) est un pilote du style. Les
   cartes s'écrivent en **égyptien revival des années 30** : colonnes en
   lotus, hiéroglyphes stylisés, lapis et or sur bitume — le set rejoindra la
   ville au lieu de la quitter.
2. **Inédit dans la rotation** : Sable = Amazigh, Braise = folklore arabe,
   Eau = Tipaza et bêtes marines, Neige = Nord, Soleil rouge = Japon.
3. **La panoplie mécanique existe déjà dans le moteur** : les jetons
   (shabtis), l'exil (le cœur dévoré), le déclenchement à la mort, la pioche +
   défausse, le buff de camp.

**Écriture des figures** : on suit la prudence du set Neige — les grandes
figures sont nommées **par leur attribut** (« Celle qui pèse », « La
Dévoreuse », « Celui qui juge »), jamais par leur nom divin. Les lignes de
type restent muettes, la saveur porte le mythe.

## 2. Le mot-clé : **Tribut**

Le transfert de vie — ce que la fiche précédente appelait « lien de vie » —
reçoit un nom propre, calé sur le vocabulaire du set (Butin, Harakiri,
Résonance : un mot court, français, qui se lit sans le voir jouer) :

> **Tribut N** — *Quand cette créature touche le sorcier adverse, il perd N PV
> et vous en gagnez N.*

Règles et frontières :

- **Même voie de déclenchement que le Butin** : les bilans de combat de
  `rpgLancerAttaque` / `rpgAttaquerSorcier` disent qui a frappé le sorcier —
  `declencherTributs` s'y branche à côté de `declencherButins`. Toucher une
  créature ne déclenche rien, comme le Butin ;
- **gain entier** : 25 PV n'est plus un plafond, le gain est toujours au
  complet et le **maximum suit** — la réserve de vie du sorcier s'élargit
  (au-delà, le surplus s'évapore) ; **la perte, elle, peut tuer** le sorcier
  adverse ;
- **jamais écrit en « dégâts »** : la carte dit « perd/gagne des PV », donc la
  règle de direction §11 est intacte — les dégâts nus restent la langue de la
  Braise ;
- **distinct du soin du Sable** : le Sable *ramasse* (gain seul), le Tribut
  *transfère* (l'un perd, l'autre gagne) ;
- **distinct du Harakiri** (Soleil rouge) : le Harakiri déclenche **à la mort**,
  en dégâts, au hasard — le Tribut déclenche **au contact**, en transfert, à
  coup sûr ;
- sur une arme, il se porte comme les autres mots-clés : `donne: { tribut: 1 }`
  → le porteur gagne le mot-clé tant que l'arme est attachée.

**Noms écartés** : *Lien de vie* (calque littéral de *lifelink*), *Ka* (trop
opaque pour une pastille), *Offrande* (désigne le paiement, pas le
transfert), *Dette* (sens temporel). **Tribut** dit les deux moitiés de
l'économie du set : l'un paie, l'autre reçoit — et rappelle le premier fruit
versé au temple.

Icône à produire : `#effet-tribut` du sprite `preview-effets-icone.html` —
**le cœur en balance**, pastille sous la ligne de type, comme la besace du
Butin.

## 3. La règle du deck : le Prix

Au-delà du mot-clé, le deck vit d'une ressource que le mode essai rend
précieuse : **les PV comme monnaie**. Quand le mana pousse tout seul (+1 par
tour), la vie est la seule contrainte réelle qui reste (25 PV de départ, un
maximum qui suit les soins).

- Toute dépense s'écrit **« Payez N PV »**, porté par un coût supplémentaire
  générique `prixPv: N` (voir §8) ;
- le paiement **ne peut pas faire descendre sous 1 PV** : sinon la carte est
  refusée, rien n'est payé (contrat de refus de paiement déjà en place) ;
- **aucune dépense n'est obligatoire** dans les 30 cartes : Papyrus
  et La Grande Pesée sont des options — le budget de vie
  toujours jouable, jamais subi.

La trinité du set : **on paie** (prixPv), **on reçoit** (Tribut,
transfert), **on meurt** (déclenchements de destruction).

## 4. Les autres verbes — et leurs garde-fous

| Verbe | Carte emblématique | Garde-fou convenu |
|---|---|---|
| **La défausse** | *Nom effacé* | **1 carte max**, 2 mana, vitesse sorcellerie, **l'adversaire choisit** sa carte (il garde sa meilleure), **×2 max** — jamais gratuite, jamais collée à un corps (mode essai : 1 carte = 20 à 33 % d'une main de 3 à 5) |
| **Le compte (mill)** | *Les feuillets*, *Scribe des feuillets* | paquet de 30 ⇒ 10 % par lot de 3 ; **3 cartes max par effet**, ×1 en rare ; la fatigue déjà codée en essai (1, 2, 3… PV) fait le reste |
| **L'exil** | *La Dévoreuse* | à l'arrivée d'un corps, 6 mana, 4/5 + exil |
| **Les shabtis** | *Momie de lin* | jetons hors collection, mal d'invocation conservé (contrat du Samouraï du Daimyō) |
| **Le pump** | *Offrande de lin* | sans paiement de PV, borné à la fin du tour (contrat du Rempart de dunes) |

**Ce que le deck ne fait jamais** : infliger des dégâts, contrer, renvoyer en
main, soigner sans contrepartie, défausser plus d'une carte.

## 5. Les 30 cartes

**Identité** : mono-Ténèbres (aucune hybride — le validateur d'essai exige
`cardColors(carte) ⊆ couleurs`).
**Copies** : `cardCopyLimit` — **2 au maximum**, mythique **1** (aucune
exception demandée).
**Courbe** : 1 mana ×5 · 2 mana ×10 · 3 mana ×10 · 4 mana ×2 · 5 mana ×1 ·
6 mana ×2 — lourde en 2–3 (le mana est garanti +1/tour), deux sorties de fin.

| Carte | Coût | ⚔/🛡 | Rareté | Ex. | Rôle |
|---|---|---|---|---|---|
| Chacal du seuil | 1 | 2/1 | commune | 2 | **Tribut 1**, **Rapidité** — pression dès l’arrivée |
| Ouvrier du natron | 1 | 1/1 | commune | 1 | à sa mort : transfert 1 |
| Papyrus _(magie rapide)_ | 1 | — | commune | 2 | payez 2 PV : piochez 1 carte |
| Gardienne de la balance | 2 | 0/3 | commune | 2 | à sa mort : vous gagnez 3 PV |
| Scribe des feuillets | 2 | 2/1 | commune | 2 | à sa mort : 1 carte du paquet adverse au cimetière |
| Prêtre de la bouche | 2 | 2/2 | inhabituelle | 2 | à l'arrivée : transfert 1 |
| Nom effacé _(sorcellerie)_ | 2 | — | inhabituelle | 2 | l'adversaire défausse 1 carte |
| Offrande de lin _(sorcellerie)_ | 2 | — | commune | 2 | +1/+0 à toutes vos créatures jusqu'à la fin du tour |
| Uræus du seuil | 3 | 2/1 | inhabituelle | 2 | **Attaque ciblée** — contrôle des créatures |
| Momie de lin | 3 | 2/4 | commune | 2 | à sa mort : crée 1 Shabti 1/1 |
| Ibis des comptes | 3 | 2/2 | inhabituelle | 2 | **Envol** ; à l'arrivée : piochez 1 puis défaussez 1 |
| Khopesh d'or _(arme)_ | 3 | +2/+1 | rare | 1 | le porteur gagne **Tribut 1** ; à sa mort, revient avec 1 DEF |
| Le Poids _(magie rapide)_ | 3 | — | commune | 2 | transfert 2 |
| Celle qui pèse | 4 | 3/3 | rare | 1 | Arrivée : l’adversaire défausse une carte |
| Les feuillets _(sorcellerie)_ | 4 | — | rare | 1 | 3 cartes du paquet adverse au cimetière |
| La Grande Pesée _(sorcellerie)_ | 5 | — | rare | 1 | payez 3 PV : transfert 3, puis piochez 1 carte |
| La Dévoreuse | 6 | 4/5 | **mythique** | 1 | à l'arrivée : retire de la partie une créature adverse |
| Celui qui juge | 6 | 3/5 | rare | 1 | **Tribut 2** — la finition Arrivée : détruit toutes les créatures qui coûtent 3 mana ou moins. |

Répartition : 14 communes · 8 inhabituelles · 6 rares · 1 mythique.
**Rendements à recalculer** avec `rpgCardPower.js` avant implémentation (même
discipline que `nerfs-set-*.md`) ; La Dévoreuse est calquée au cheveu sur
Susanoo (6 mana 5/3 + exil) pour ne pas créer de plafond.

**Économie de vie** : Papyrus coûte 2 PV et La Grande Pesée 3 PV par
lancement ; Offrande de lin ne coûte plus de PV. Rentrées du Tribut bornées au maximum — le deck ne peut jamais se
tuer tout seul, condition de jouabilité en 25 PV.

## 6. Fiches prêtes à coller

Nouveau fichier **`src/games/rpgTenebres.js`**, importé par `rpgCards.js`
(miroir exact du fichier `rpgSoleilRouge.js`) :

```js
/**
 * La Balance des Heures — le set Ténèbres du Sablier.
 * Inspiration : l'Égypte pharaonique en égyptien revival art déco.
 * Identité de jeu : le Prix (payer des PV), le Tribut (transférer la vie),
 * la mort qui déclenche. Jamais de dégâts nus (règle de direction §11).
 */
export const RPG_TENEBRES_SET_ID = 'balance-des-heures';

const carte = (definition) => ({
  ...definition,
  element: 'tenebres',
  set: RPG_TENEBRES_SET_ID,
  art: definition.id,
});

export const RPG_TENEBRES_JETONS = [{
  id: 'shabti', name: 'Shabti', pluriel: 'shabtis',
  kind: 'creature', jeton: true, element: 'tenebres', set: RPG_TENEBRES_SET_ID,
  art: 'shabti', cost: 0, atk: 1, def: 1, rarity: 'commune',
  typeLine: 'Créature-jeton — Serviteur',
  text: 'Créé par les Momies de lin : 1/1, sans coût.',
  flavor: 'Il fait le travail que les morts n’ont plus les mains pour faire.',
}];

export const RPG_TENEBRES_CREATURES = [
  carte({
    id: 'chacal-du-seuil', name: 'Chacal du seuil',
    cost: 1, atk: 2, def: 1, rarity: 'commune', tribut: 1, rapidite: true,
    typeLine: 'Créature — Animal · Chacal',
    text: 'Tribut 1 — Quand cette créature touche le sorcier adverse, il perd 1 PV et vous en gagnez 1. Rapidité — Peut attaquer le tour où il arrive.',
    flavor: 'Il attend au seuil, où la balance n’a pas encore tranché.',
  }),
  carte({
    id: 'ouvrier-du-natron', name: 'Ouvrier du natron',
    cost: 1, atk: 1, def: 1, rarity: 'commune',
    destruction: { type: 'transfert', amount: 1, cible: 'sorcier' },
    typeLine: 'Créature — Humain · Ouvrier',
    text: 'Quand Ouvrier du natron meurt, le sorcier adverse perd 1 PV et vous en gagnez 1.',
    flavor: 'Le natron garde le corps ; il ne négocie pas les dettes.',
  }),
  carte({
    id: 'gardienne-de-la-balance', name: 'Gardienne de la balance',
    cost: 2, atk: 0, def: 3, rarity: 'commune',
    destruction: { type: 'soin', amount: 3 },
    typeLine: 'Créature — Humaine · Gardienne',
    text: 'Quand Gardienne de la balance meurt, vous gagnez 3 PV.',
    flavor: 'Elle tient la lame et le lin d’un geste appris avant qu’elle ne parle.',
  }),
  carte({
    id: 'scribe-des-feuillets', name: 'Scribe des feuillets',
    cost: 2, atk: 2, def: 1, rarity: 'commune',
    destruction: { type: 'defaussePaquet', amount: 1 },
    typeLine: 'Créature — Humain · Scribe',
    text: 'Quand Scribe des feuillets meurt, la carte du dessus du paquet adverse part au cimetière.',
    flavor: 'Il recopie les noms toute sa vie. Il en efface un chaque matin.',
  }),
  carte({
    id: 'pretre-de-la-bouche', name: 'Prêtre de la bouche',
    cost: 2, atk: 2, def: 2, rarity: 'inhabituelle',
    arrivee: { type: 'transfert', amount: 1, cible: 'sorcier' },
    typeLine: 'Créature — Humain · Prêtre',
    text: 'Quand Prêtre de la bouche arrive : le sorcier adverse perd 1 PV et vous en gagnez 1.',
    flavor: 'L’ouverture de la bouche rend la parole ; ici, elle rend autre chose.',
  }),
  carte({
    id: 'ureus-du-seuil', name: 'Uræus du seuil',
    cost: 3, atk: 2, def: 1, rarity: 'inhabituelle', coupRapide: true,
    typeLine: 'Créature — Animal · Serpent royal',
    text: 'Attaque ciblée — Sélectionné pour attaquer, il peut frapper une créature adverse de votre choix (30 % de chances de rater ; 100 % de chances de toucher le sorcier adverse) : il lui inflige ses dégâts d’attaque, sans riposte, et son attaque s’arrête là.',
    flavor: 'Il frappe avant que la main n’atteigne le seuil.',
  }),
  carte({
    id: 'momie-de-lin', name: 'Momie de lin',
    cost: 3, atk: 2, def: 4, rarity: 'commune',
    destruction: { type: 'jetons', jeton: 'shabti', nombre: 1 },
    typeLine: 'Créature — Momie',
    text: 'Quand Momie de lin meurt, créez une créature-jeton « Shabti » 1/1.',
    flavor: 'Le lin tient ce que les os ne tiennent plus.',
  }),
  carte({
    id: 'ibis-des-comptes', name: 'Ibis des comptes',
    cost: 3, atk: 2, def: 2, rarity: 'inhabituelle',
    envol: true,
    arrivee: { type: 'pioche-defausse', pioche: 1, defausse: 1 },
    typeLine: 'Créature — Oiseau · Ibis',
    text: 'Envol — Ne peut être bloqué que par une créature avec Envol. Quand Ibis des comptes arrive : piochez une carte puis défaussez une carte.',
    flavor: 'Il compte les feuillets comme on compte les jours : sans jamais en garder.',
  }),
  carte({
    id: 'celle-qui-pese', name: 'Celle qui pèse',
    cost: 4, atk: 3, def: 3, rarity: 'rare',
    arrivee: { type: 'defausse-adverse' },
    typeLine: 'Créature légendaire — Celle qui pèse',
    text: 'Quand Celle qui pèse arrive : l’adversaire défausse une carte.',
    flavor: 'Elle ne juge pas. Elle pèse.',
  }),
  carte({
    id: 'la-devoreuse', name: 'La Dévoreuse',
    cost: 6, atk: 4, def: 5, rarity: 'mythique',
    arrivee: { type: 'exil', cible: 'creature' },
    typeLine: 'Créature légendaire — Bête du seuil',
    text: 'Quand La Dévoreuse arrive : retirez de la partie une créature adverse ciblée.',
    flavor: 'Elle ne tue pas : elle avale, et la balance ne retrouve plus le cœur.',
  }),
  carte({
    id: 'celui-qui-juge', name: 'Celui qui juge',
    cost: 6, atk: 3, def: 5, rarity: 'rare', tribut: 2,
    arrivee: { type: 'degats', amount: 3, cible: 'toutes-autres' },
    typeLine: 'Créature légendaire — Celui qui juge',
    text: 'Tribut 2 — Quand cette créature touche le sorcier adverse, il perd 2 PV et vous en gagnez 2. Quand Celui qui juge arrive en jeu : il détruit toutes les créatures qui coûtent 3 mana ou moins.',
    flavor: 'Il ne regarde pas le sable. Il regarde le poids.',
  }),
];

export const RPG_TENEBRES_MAGIES = [
  carte({
    id: 'papyrus', name: 'Papyrus',
    kind: 'magie', cost: 1, rarity: 'commune', instant: true, prixPv: 2,
    typeLine: 'Magie Rapide — Ténèbres',
    effet: { type: 'pioche', amount: 1 },
    text: 'Payez 2 PV : piochez une carte.',
    flavor: 'Ce qui s’écrit sur le papyrus se paie sur le cœur.',
  }),
  carte({
    id: 'nom-efface', name: 'Nom effacé',
    kind: 'magie', cost: 2, rarity: 'inhabituelle',
    typeLine: 'Sorcellerie — Effacement · Ténèbres',
    effet: { type: 'defausse-adverse' },
    text: 'L’adversaire défausse une carte.',
    flavor: 'On ne tue pas un nom. On le raye, et la balance l’oublie.',
  }),
  carte({
    id: 'offrande-de-lin', name: 'Offrande de lin',
    kind: 'magie', cost: 2, rarity: 'commune',
    typeLine: 'Sorcellerie — Offrande · Ténèbres',
    effet: { type: 'buff', atk: 1, def: 0, tours: 1 },
    text: 'Toutes vos créatures gagnent +1/+0 jusqu’à la fin du tour.',
    flavor: 'Le lin prend la peau ; le prix prend le reste.',
  }),
  carte({
    id: 'le-poids', name: 'Le Poids',
    kind: 'magie', cost: 3, rarity: 'commune', instant: true,
    typeLine: 'Magie Rapide — Ténèbres',
    effet: { type: 'transfert', amount: 2, cible: 'sorcier' },
    text: 'Le sorcier adverse perd 2 PV et vous en gagnez 2.',
    flavor: 'Deux grains tombent de chaque côté ; la table ne bouge pas.',
  }),
  carte({
    id: 'les-feuillets', name: 'Les feuillets',
    kind: 'magie', cost: 4, rarity: 'rare',
    typeLine: 'Sorcellerie — Livre des morts · Ténèbres',
    effet: { type: 'defaussePaquet', amount: 3 },
    text: 'Les 3 cartes du dessus du paquet adverse partent au cimetière.',
    flavor: 'Sur trente feuillets, trois partent d’un seul souffle.',
  }),
  carte({
    id: 'la-grande-pesee', name: 'La Grande Pesée',
    kind: 'magie', cost: 5, rarity: 'rare', prixPv: 3,
    typeLine: 'Sorcellerie — Pesée · Ténèbres',
    effet: { type: 'transfert', amount: 3, cible: 'sorcier', pioche: 1 },
    text: 'Payez 3 PV : le sorcier adverse perd 3 PV, vous en gagnez 3, puis piochez une carte.',
    flavor: 'Le cœur est pesé, le nom est lu, la page est tournée.',
  }),
];

export const RPG_TENEBRES_ARMES = [
  carte({
    id: 'khopesh-d-or', name: 'Khopesh d’or',
    kind: 'arme', cost: 3, rarity: 'rare',
    typeLine: 'Arme — Khopesh',
    bonus: { atk: 2, def: 1 }, donne: { tribut: 1 },
    porteurMeurt: { type: 'reanimation-porteur' },
    text: 'Arme — Le porteur gagne +2/+1 et Tribut 1. Quand le porteur meurt, il revient en jeu avec 1 point de défense.',
    flavor: 'Le fer recourbé prête sa lame au cœur qui pèse.',
  }),
];

export const RPG_TENEBRES_TERRAINS = []; // aucun — le banc d’essai n’en a pas.
```

## 7. Le deck dans le banc d'essai

Entrée à ajouter dans `RPG_MANA_ESSAI_DECKS` (`src/games/rpgManaEssai.js`) :

```js
{
  id: 'essai-mana-tenebres',
  name: 'La Balance des Heures',
  element: 'tenebres',
  elements: ['tenebres'],
  boxArt: 'la-devoreuse',
  description: 'Mono-Ténèbres : on paie sa vie, on reçoit la leur.',
  cardIds: [
    ...copies('chacal-du-seuil', 2), 'ouvrier-du-natron',
    ...copies('papyrus', 2),
    ...copies('gardienne-de-la-balance', 2), ...copies('scribe-des-feuillets', 2),
    ...copies('pretre-de-la-bouche', 2), ...copies('nom-efface', 2),
    ...copies('offrande-de-lin', 2),
    ...copies('ureus-du-seuil', 2), ...copies('momie-de-lin', 2),
    ...copies('ibis-des-comptes', 2),
    'khopesh-d-or', ...copies('le-poids', 2),
    'celle-qui-pese', 'les-feuillets', 'la-grande-pesee',
    'la-devoreuse', 'celui-qui-juge',
  ],
},
```

Le validateur `validerDeckManaEssai` accepte la liste **dès que la couleur
existe** : 30 cartes ✓, mono ✓, aucune copie au-delà de 2 (mythique 1) ✓,
aucun terrain ✓, aucune carte de `RPG_MANA_ESSAI_CARTES_EXCLUES` ✓. La rotation
des adversaires (`adversaireManaEssai`) inclut le quatrième deck
automatiquement.

**Pourquoi le deck tient en mode essai** (rappel des contraintes du mode) :

- main de départ 3 / max 5 → **la défausse ne sert qu'une fois**, choisie, à
  2 mana — elle ne peut pas verrouiller une main déjà réduite ;
- champ de 5 cases → le petit corps large (Momies, Shabtis) et le Tribut
  récompensent la présence durable plutôt que l'explosion de main ;
- **la sixième créature impose un sacrifice** : avec des morts qui
  déclenchent (Momie, Ouvrier, Scribe, Gardienne), le sacrifice du mode
  *nourrit* le deck au lieu de le punir — variante « contrat à chaque
  sacrifice » réservée à la phase 2 ;
- paquet de 30 + fatigue (1, 2, 3… PV) : le compte des feuillets presse la
  fatigue sans en être le plan — le plan reste le Tribut et le clock des
  25 PV de départ.

## 8. Ce que le moteur doit ajouter

1. **La couleur** — `'tenebres'` en fin de `RPG_ELEMENTS` (`rpgCards.js`) :
   - `CARD_FRAME_COLORS` : mono + les **15 clés hybrides manquantes** (15 → 31
     au total) + `arme-tenebres` ; `CARD_FRAME_FALLBACK_KEY` bascule sur la
     clé à cinq voies ;
   - emblème SVG de la jauge d'essai (5ᵉ glyphe : **la balance**), teinte de
     la main, contenus dérivés (`cardColors`, `RPG_CARD_COLORS`, filtres de
     l'atelier, besoins de l'IA, rayons du Souk — voir §10).
2. **Effets** (`appliquer`, `rpgDuel.js`) :
   - `transfert: { amount, cible: 'sorcier' }` — le camp cible **perd** `amount`
     PV (peut tuer : même vérification de victoire que le combat), le camp
     source **gagne** `amount` en entier (la vie peut dépasser 25, le maximum
     suit) ; mot « dégâts » jamais utilisé au journal ;
   - `defausse-adverse` — un seul exemplaire, **l'adversaire choisit** sa
     défausse : le joueur reçoit l'écran de choix (chemin
     `defausseEnAttente`, camp adverse), l'IA garde sa meilleure carte ;
   - `defaussePaquet: { amount }` — les N cartes du dessus partent au
     cimetière (arrivée, destruction ou sorcellerie) ; accélère la fatigue
     existante ;
   - **chaînage** : `transfert` + `pioche` sur *La Grande Pesée* — même
     discipline que `retour-main` + `pioche` (déjà résolu) ;
   - **`prixPv: N`** — coût supplémentaire générique, vérifié au paiement
     (refus si PV < N + 1), appliqué avant l'effet ; réutilisable par tous les
     sets.
3. **Le Tribut** — `tribut: N` sur la fiche et `donne.tribut` sur l'arme →
   `entite.tribut` (chemin `donne` existant) ; `declencherTributs(duel, cote,
   bilans)` branché aux mêmes bilans que `declencherButins` (`rpgLancerAttaque`,
   `rpgAttaquerSorcier`) ; valeur dans `rpgCardPower.js` (même barème que le
   Butin, **+0,9** par point semble le point de départ — à recalculer).
4. **Icône** `#effet-tribut` (cœur en balance) dans
   `preview-effets-icone.html`, pastille sous la ligne de type.
5. **Jetons** — `shabti` dans `RPG_JETON_CARDS`, sans Rapidité (contrat du
   Samouraï du Daimyō).
6. **Fichier du set** — `src/games/rpgTenebres.js` importé par `rpgCards.js`
   (chemins des créatures, magies, armes et jetons, miroir du Soleil rouge).

## 9. Direction artistique & arts à produire

- **Style** : égyptien revival art déco — bitume noir, lapis, or, vert
  malachite ; hiéroglyphes stylisés en frise ; la balance comme motif central
  récurrent ; cadre de la couleur en **indigo-aubergine quasi-noir**
  (`#3d2a63` → `#14101f`), à ne pas confondre avec l'améthyste des mythiques
  (`#a875ed`) ni de la Sorcellerie (`#b39ae0`) ;
- **19 illustrations de cartes + le shabti**, plein art **4:5**, dans
  `public/cards/`, une par identifiant, **aucun partage d'illustration au sein
  du deck** (garde-fou du catalogue + `tests/rpg-duel.test.js`) ;
- direction : `src/games/RPG-CARD-ART.md` ;
- plateau : **La Nécropole des dalles** (`necropole-des-dalles`,
  `public/plateau-necropole-des-dalles.jpg`, 4K 3:2, sans texte, **vu de
  dessus** comme l'Erg et Tipaza) — un décor **entièrement extérieur, en plein
  jour** : le plateau de calcaire blanchi par le soleil, le grand cercle
  d'hiéroglyphes vide au milieu, **deux pyramides dressées sur le plateau, à gauche, et une à droite**, vues d'en haut avec leur ombre portée, le reste
  du plateau laissé nu et quelques objets seulement — la balance de Maât, le
  khopesh, deux canopes et un shabti — dans les deux angles du haut, avec le
  Nil turquoise qui longe le bas du cadre. C'est aussi le terrain de la couleur dominante `tenebres`. Le
  second plateau des Ténèbres, **Le Palais du Pharaon**
  (`palais-du-pharaon`, `public/plateau-palais-du-pharaon.jpg`), appartient au
  tribunal de la Nécropole (`juges-de-la-necropole`) : **l'intérieur** de la
  salle du trône, le dallage d'albâtre et de granit, le trône doré et les
  colonnes de lotus, avec peu d'objets et le centre laissé nu.

## 10. Frontière & phase 2 (la 5ᵉ couleur canonique)

Tout ce qui précède tient dans le banc d'essai, qui **n'émet aucun événement
de quête/Souk et ne crédite rien** (`15-essai-mana-sans-terrains.md`). La
phase 2 — ouvrir Ténèbres au format classique — devra traiter, dans l'ordre :

1. `'tenebres'` dans `RPG_ELEMENTS` (déjà requis par l'essai) et **toutes les
   surfaces dérivées** : 31 clés de cadre, rayons du Souk
   (`COULEURS_SOUK`), boosters, atelier, validation de decks maison,
   couleur dominante → plateau, besoins de mana de l'IA ;
2. le **terrain** — *Le Portail scellé* (mana ténèbres), plus une variante du
   style de *Pétra* pour l'hybride Sable + Ténèbres (« sacrifier et déterrer ») ;
3. le **deck de collection** 30 cartes (recette `RPG_RECETTES_DECKS` +
   `composerDeck`) — **codé** (voir « Le deck du catalogue » plus bas) — et
   l'entrée Souk correspondante, **restant à faire** : les cartes Ténèbres ne
   sont encore ni dans la dotation, ni dans les révélations
   (`rpgCollection.js`, doc 16 §10 du test `rpg-decks-puissance`) ;
4. les variantes réservées : contrat à chaque sacrifice (règle des 5 cases),
   seuil de vie (« si vous avez 10 PV ou moins… »), exil en sorcellerie
   (aujourd'hui réservé à l'arrivée, format Susanoo).

## 11. Les six grandes figures d'Égypte (`RPG_TENEBRES_FIGURES`)

En complément des 20 fiches du banc d'essai mono-Ténèbres, six cartes
mythiques (`set: 'balance-des-heures'`) incarnent les grandes figures du
panthéon égyptien — toujours nommées **par leur attribut** (jamais le mot
« dieu ») et réparties sur les éléments de leur domaine :

| Carte | Identifiant | Couleur(s) | Coût | ⚔/🛡 | Capacités |
|---|---|---|---|---|---|
| **Le Passeur au masque de chacal** _(Anubis)_ | `passeur-au-masque-de-chacal` | Ténèbres | 6 | 5/5 | Arrivée : réanime la dernière créature de votre cimetière |
| **Le Maître des hiéroglyphes** _(Thot)_ | `maitre-des-hieroglyphes` | Ténèbres | 5 | 3/5 | **Envol**, **Attaque ciblée** (30 % contre une créature, 100 % contre le sorcier) ; arrivée : piochez 2 cartes |
| **Le Faucon du zénith** _(Horus)_ | `faucon-du-zenith` | Sable | 5 | 3/3 | **Envol**, **Attaque ciblée** (30 % contre une créature, 100 % contre le sorcier), **Tribut 1**, **Protection Ténèbres** (permanente) |
| **La Lionne du midi ardent** _(Sekhmet)_ | `lionne-du-midi-ardent` | Braise | 6 | 4/4 | **Rapidité**, **Protection Eau et Neige** (permanente) ; arrivée : 2 dégâts à toutes les créatures adverses |
| **La Dame aux ailes d'or** _(Isis)_ | `dame-aux-ailes-d-or` | Sable | 5 | 3/5 | **Envol** ; arrivée : bouclier de lumière ; mort : vous gagnez 4 PV |
| **Le Seigneur des mâchoires** _(Sobek)_ | `seigneur-des-machoires` | Eau | 6 | 6/6 | **Tenacité**, **Tribut 2** |

## Le deck du catalogue (étagère, onglet Deck)

En plus du banc d'essai, « La Balance des Heures » est un **boîtier de
l'étagère**, jouable depuis le lancement comme les six autres (`RPG_DECKS`) :

- **Recette** `balance-des-heures` (`rpgDeckRecipes.js`) : identité
  mono-Ténèbres, **19 créatures · 10 magies · 1 arme**, `mythiquesTotalMax: 1`,
  `raresTotalMax: 6` — La Dévoreuse est la mythique du boîtier ; les trois
  autres mythiques du set restent aux boosters ;
- **Signature** : le triptyque du set — le Prix (Papyrus, La Grande Pesée, Le
  Poids), le Tribut (Chacal du seuil, Celui qui juge, le Khopesh d'or) et la
  mort qui déclenche (Ouvrier du natron, Momie de lin),
  plus la défausse adverse (Nom effacé, Celle qui pèse) ;
- **Remplissage** par `composerDeck` : les meilleures cartes Ténèbres restantes,
  palier de rareté puis puissance, chacune à son maximum légal — le
  contrôle `tests/rpg-decks-puissance.test.js` rejette toute carte laissée de
  côté mieux classée qu'une carte retenue ;
- **Plateau** : la Nécropole des dalles (doc 16 §9) — le deck se bat enfin chez
  lui ;
- **Économie de collection** : comme les six autres boîtiers, ce deck ne
  consulte jamais la collection — il est jouable d'entrée de jeu. Les cartes
  Ténèbres restent hors dotation et hors boosters tant que l'entrée Souk
  (§10.3) n'est pas faite.

## 12. Vérifier

```bash
npm run check:rpg-mana-essai  # le 4ᵉ deck : liste, validateur, parcours
npm run check:rpg             # regressions classiques + essai
npm run check:rpg-ui          # fumigènes d’interface (cadres, hybrides, main)
npm run build
```

Les tests à étendre : `tests/rpg-mana-essai.test.js` (deck présent, 30 cartes,
validateur), `tests/rpg-frames.test.js` (31 clés de cadre), un test
`tests/rpg-tenebres.test.js` pour le Tribut (déclenchement, gain au-delà de 25,
arme qui donne le mot-clé) et les nouveaux effets
(`transfert`, `defausse-adverse`, `defaussePaquet`, `prixPv`).


## Révision des créatures — 18 octobre 2026

> **19 octobre 2026 —** l’**Ouvrier du natron** passe de 2/1 à **1/1** ;
> son coût, sa rareté et son déclenchement à la mort restent inchangés.

Tribut est désormais réservé à **2 des 14 créatures de couleur Ténèbres**
(contre 6 auparavant) : le Chacal du seuil pour démarrer et Celui qui juge
pour finir. Le Khopesh d’or conserve Tribut ; les figures des autres couleurs
ne changent pas. Les coûts, raretés et listes de decks restent inchangés. L’Uræus du seuil
passe de 3/2 à 2/1 ; les autres statistiques restent inchangées.

- **Uræus du seuil** remplace Tribut 1 par **Attaque ciblée** : il peut employer
  son attaque contre une créature sans riposte, au lieu de toucher le sorcier.
- **Celle qui pèse** remplace Tribut 1 par une défausse adverse à l’arrivée,
  choisie par la victime. Sans carte en main adverse, cet effet ne fait rien.
- **Le Passeur au masque de chacal** perd Tribut 2 et conserve la réanimation
  à l’arrivée : la dernière créature du cimetière revient, si le champ a une
  place libre. Il reste une menace de reconstruction plutôt qu’un finisseur
  supplémentaire par transfert de vie.
- **Le Maître des hiéroglyphes** perd Tribut 1, gagne Envol et Attaque ciblée et conserve
  la pioche de deux cartes à l’arrivée : son rôle est de renouveler la main.

Cette répartition distingue combat, défausse, réanimation et pioche, en plus
des déclenchements de mort, jetons et transferts déjà présents. Les effets
utilisent les mécanismes existants du moteur ; les textes imprimés et les
pastilles suivent les fiches révisées. Les tests automatisés vérifient les
rôles et leur résolution, sans remplacer les parties d’équilibrage.


## Nouvelle mythique — La Dernière Pesée

- **Identifiant :** `la-derniere-pesee`
- **Couleur :** Ténèbres
- **Type :** Sorcellerie — Jugement · Ténèbres
- **Rareté :** mythique (un exemplaire maximum par deck)
- **Coût :** 5 mana, sans prix en PV
- **Texte :** « Détruisez toutes les créatures. »
- **Illustration :** `public/cards/la-derniere-pesee.jpg`, plein art 1024 × 1280.

Destruction réelle, pas des dégâts ni un exil : les créatures des deux camps
rejoignent le cimetière, leurs armes suivent les règles ordinaires et les
capacités de mort se déclenchent après le retrait des victimes. Les Shabtis
créés par ces morts ne sont pas détruits par la même vague. Une créature tenace
meurt comme les autres et ne revient qu'au prochain tour de son camp, avec
1 point de défense ; les protections contre Ténèbres, elles, écartent la vague ;
les boucliers qui absorbent les dégâts ne préviennent pas cette destruction.

La carte rejoint le catalogue et la galerie, sans modifier la liste de
30 cartes du deck d’essai. Le catalogue Ténèbres compte désormais 7 magies.


### Khopesh d’or — retour du porteur

Le porteur gagne +2/+1 et Tribut 1. Quand il meurt, il revient en jeu avec
1 point de défense, sans son arme : le Khopesh reste au cimetière. Le retour
crée une nouvelle présence, avec le mal d’invocation habituel (sauf Rapidité),
et déclenche à nouveau les effets d’arrivée. Les effets de mort se déclenchent
aussi. Un renvoi en main, un exil ou une mort évitée ne déclenchent pas ce retour.
