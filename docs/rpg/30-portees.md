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
