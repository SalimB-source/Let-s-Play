# 30 — Les portées

> État : **fondation posée, non branchée.** Le moteur de portée existe, testé
> (`src/games/rpgPortees.js`, `tests/rpg-portees.test.js`), mais **aucune attaque
> ne l'utilise encore**. Ce document dit pourquoi, et ce qu'il reste à décider.

## La règle visée

| Créature | Portée | Peut frapper |
|---|---|---|
| Mêlée | 1 | la case juste devant ; la diagonale si la case d'en face est vide ; **jamais le dos** |
| À distance (`distance`) | 2 | deux cases de grille |
| Attaque ciblée (`coupRapide`) | illimitée | n'importe où — seule la ligne décide |

La portée **ne remplace pas** la protection de ligne : on applique d'abord
`filtreLigne` (le fond est protégé tant que le front tient), puis `filtrePortee`.

## La géométrie

Deux lignes de cinq cases par camp, les fronts face à face de part et d'autre de
la ligne neutre :

```
profondeur 0 = front, 1 = fond ;  colonne = case % 5
distance(A, B) = profondeur(A) + profondeur(B) + 1 + |colonne(A) - colonne(B)|
```

- front ↔ front : **1**
- front ↔ fond : **2**
- fond ↔ fond : **3**

`distanceDeCases`, `porteeDe`, `cibleAPortee`, `filtrePortee`, `casesAPortee`
(la matière du survol) sont pures et sans effet de bord.

## Pourquoi ce n'est pas branché

La portée par colonne suppose qu'on **choisit sa colonne**. Aujourd'hui la pose
est automatique (`caseParDefaut` : la première case libre de la ligne imposée),
donc les colonnes ne s'alignent pas — et après deux morts, un corps à corps peut
n'avoir aucune cible : son unique case d'en face est vide, la diagonale aussi.

Sonde sur une partie réelle (deux fronts pleins) : chaque mêlée a **exactement
une** cible. Dès que le front adverse se troue (colonnes 0 et 1 vivantes,
attaquant en colonne 3), **plus aucune** — la créature est neutralisée sans
avoir rien fait. Sans mouvement, la règle ne crée pas de tactique : elle crée
des blocages.

## Ce qu'il reste à décider

1. **Brancher les portées avec le mouvement** (palier 2) — c'est leur place
   naturelle : on choisit sa colonne, donc on choisit sa cible.
2. **Ou les brancher à portée de ligne**, sans colonne : mêlée = tout le front
   adverse (le comportement actuel), distance = front + fond adverse. Le gain est
   alors quasi nul — d'où la préférence pour l'option 1.

En attendant, la fondation sert déjà à deux choses qui ne changent aucune règle :

- le **survol** qui montre ce qu'une créature peut atteindre (`casesAPortee`) ;
- le **sorcier adverse comme objectif**, atteignable depuis la dernière ligne.

## Le sorcier comme objectif : il faut avoir percé

Une attaque **directe** contre le sorcier adverse (le chemin qui contourne les
créatures) n'est proposée que lorsque rien n'est atteignable — c'est
`attaqueDirectePermise`. Cette règle disait *quand* on pouvait viser le
sorcier ; elle ne disait pas *d'où*. Depuis les lignes, un tireur du fond ou un
Défenseur garé derrière terminait donc la partie sans jamais toucher le front.

`attaqueDirecteSurLesLignes` (dans `rpgLignes.js`) ajoute la seule condition qui
manquait :

```js
export function attaqueDirecteSurLesLignes(duel, attaquant, adversaires = [], atteignables = null) {
  if (!attaqueDirectePermise(attaquant, adversaires, atteignables)) return false;
  if (!lignesActives(duel) || duel?.moba) return true;   // hors lignes : rien ne change
  if (!adversaires.length) return true;                  // sorcier à découvert
  if (!Number.isInteger(attaquant?.emplacement)) return true;
  return ligneDe(attaquant) === RPG_LIGNE_FRONT;         // il faut être au contact
}
```

Elle remplace `attaqueDirectePermise` aux trois endroits qui décident de la
frappe directe : la liste des cibles individuelles
(`rpgCombatIndividuelClassique`), sa revérification à l'instant du clic, et le
raccourci de `rpgDuel.js` qui saute la sélection quand il n'y a qu'une proie.
La victoire, elle, ne bouge pas : `rpgVainqueur` conclut toujours sur
`duel.sorcier.pv <= 0`.

Conséquences voulues : un tireur du fond garde ses flèches sur les créatures,
un Défenseur ne finit plus la partie depuis sa case, et une créature qui vient
de percer le front peut terminer — c'est la récompense de la percée.

## Le survol : montrer la portée sans rien promettre

Survoler une des nôtres (souris, ou focus au clavier) allume d'un **anneau
doré** les proies que son attaque atteindrait vraiment. La page ne réécrit
aucune règle : elle appelle `rpgCiblesIndividuellesClassique(duel, 'joueur', id)`
— la fonction du clic — et pose `is-a-portee` sur les cartes rendues par cette
liste. Rien ne devient cliquable, aucune attaque n'est déclarée.

Trois garde-fous :

- **nos créatures seulement** — ce que l'adversaire peut frapper ne s'annonce
  pas ;
- **sur deux lignes seulement** (`lignesActives`), sinon le survol ne dirait
  rien de plus que le plateau ;
- **pas en PvP**, où la table adverse n'est pas la nôtre ;
- **pas pendant la phase d'attaque** : la sélection y parle déjà en cyan, l'or
  se tait pour ne pas doubler le signal.

Une créature qui n'a plus aucune proie atteignable mais qui garde la frappe
directe allume la **plaque du sorcier** (`is-ciblable`), exactement comme le
clic l'aurait fait : le survol annonce la décision avant qu'elle soit prise.

Les couleurs restent trois signaux distincts : l'**or** invite (survol), le
**cyan** ouvre le ciblage (`is-ciblable`), le **rouge** désigne la proie déjà
choisie (`is-spell-target`). L'anneau doré s'efface dès qu'un état plus fort
parle, et `prefers-reduced-motion` lui retire sa pulsation sans le retirer.

Au doigt, l'anneau n'existe pas : le premier appui sur une créature ouvre la
phase d'attaque et les proies légales s'y allument d'elles-mêmes. L'appui long,
lui, est déjà pris par la fiche de carte — c'est le geste en deux temps qui
sert de survol tactile.
