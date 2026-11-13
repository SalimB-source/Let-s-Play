# 28 — Les pierres d'effets

Les mots-clés du Sablier ne s'impriment plus en trait doré posé à même le texte :
chaque effet porte une **pierre taillée**, un petit emblème de héros — fond
saturé, anneau en creux, liseré sombre, pictogramme plein **blanc**
au centre. La référence de style est celle des emblèmes de héros des jeux
d'auto-battler : le losange braise, l'hexagone ténèbres, l'hexagone or.

![Les pierres d'effets : avant/après, faces de cartes, pastilles, toutes les pierres, échelle et états](assets/pierres-effets.svg)

## La grammaire

Deux choses se lisent d'un coup d'œil, sans lire le mot :

- **la forme dit le rôle du repère** — hexagone pour tous les effets,
  losange pour couleur, type et coût ;
- **la couleur dit le type** — rouge pour l’assaut, bleu pour garde et tempo,
  violet pour ombre et ressources ;
- **le pictogramme au trait dit l’effet** — casque à cornes (Furie), flamme
  (Dégâts), cœur (Soin), ancre (Ténacité), caisse (Butin). Les symboles
  retrouvent leur dessin d’origine, pas les silhouettes pleines.


| Famille | Forme | Pierre | Effets |
| --- | --- | --- | --- |
| **Assaut** | hexagone | braise | Dégâts, Affaiblissement, Coup critique, Attaque ciblée, Traque, Overkill, Furie, Harakiri, Abordage, Prise, les quatre Destructions |
| **Tempo** | hexagone | azur | Rapidité, Envol, Esquive, Contre-attaque, Invocation spéciale, Rebond |
| **Garde** | hexagone | bleu | Protection (et ses variantes de sorts), Bouclier, Ténacité, Défenseur, Provocation, Aura, Bannière, Renfort, Résonance, Compagnie |
| **Ombre** | hexagone | ténèbres | Malédiction, Vol de vie, Furtivité, Infiltration, Exil, Réanimation, Contresort, Transfert, Tribut, Défausses, Blocages interdits, Cale |
| **Flux** | hexagone | violet | Pioche, Recherche, Butin, Cargaison, Mana, Soin, Recyclage, Heures, Jetons, Lien |

Trois repères de carte parlent désormais la même langue taillée, à la **même
taille** (`--rpg-plaque-taille`, posée par la face de la carte) :

| Repère | Silhouette | Dessin |
| --- | --- | --- |
| Couleur de la carte | **diamant** | `plaqueNue` — la pierre taillée sans pictogramme |
| Coût de la carte | **diamant** | `plaqueNue`, deux couleurs ⇒ champ en dégradé |
| Type de sort | **diamant** | sceau jaune (rapide) ou violet (sorcellerie) |
| Effet | **hexagone**, toutes familles | `pierreEffet`, pictogramme blanc |

La silhouette seule dit ce qu'on regarde : plus de disque rond ni de liseré CSS
autour de la couleur et du coût. La pierre nue se pose **dans le flux** du repère
(une grille d'une seule case, `grid-area: 1 / 1`) : un `position: absolute` ferait
prendre au coût de la main la taille de toute la carte.

Le registre complet vit dans **`src/games/effetPlaques.js`** : les silhouettes
(`PLAQUE_FORMES`), les pierres (`PLAQUE_PIERRES`) et la table des familles
(`PLAQUE_FAMILLE_EFFET`). Ajouter un effet, c'est **une ligne** dans cette table —
jamais retoucher le dessin. Une clé oubliée ne disparaît pas : elle retombe sur
la famille de son symbole (`FAMILLE_PAR_SYMBOLE`), et à défaut sur la garde.

## Le dessin

Tout tient dans un carré de **32 unités**, pour que la même pierre serve de
12 px (une main mobile) à 40 px (une planche de revue) sans redessin :

1. la **silhouette** entière en encre, doublée d'un trait d'encre (`CONTOUR`) —
   le contour sombre qui détache la pierre de l'illustration ;
2. l'**anneau** en creux — la marche du biseau ;
3. le **champ** dans la teinte de la pierre ;
4. le **pictogramme au trait**, blanc : 16 unités dans l’hexagone de tous les effets. Les 40 symboles du sprite retrouvent leurs contours d’origine.
   Le trait apparent est affiné à **1,75 unité de pierre**, avec un halo sombre
   discret de 1 unité supplémentaire : les détails restent ouverts.

Le fond reste simplifié à trois couches, avec les trois couleurs existantes.
Les IDs du sprite, infobulles, compteurs, états grisés et règles ne changent pas.

### Sablier de Sable

Dans la pastille de couleur, l’emoji Sable est remplacé par `CardHourglass`,
un SVG qui occupe 56 % de la pastille. Les montants et traverses sont dessinés
avec un trait de 2,3 unités, les deux amas de sable sont pleins. Le dessin
crème-blanc et son ombre sombre restent lisibles sur le fond doré, sans dépendre
du rendu des emojis de l’OS. Les pastilles hybrides utilisent le même dessin.

## Une couleur par effet

Les effets utilisent exactement **trois couleurs fixes** selon leur type :
- **rouge** : Assaut (attaque, dégâts) ;
- **bleu** : Garde et Tempo (défense, mouvement) ;
- **violet** : Ombre et Flux (altérations, ressources).

Il n’y a plus de variation par clé ni de recoloration de Protection selon
l’élément repoussé. Cet élément reste indiqué dans le DOM et les infobulles.
Les couleurs élémentaires du coût et de la pastille de couleur ne changent pas.

Rien n'est deviné en CSS : la pierre est dessinée dans le SVG, ce qui la rend
insensible aux couleurs de texte qui l'entourent et vérifiable hors navigateur
(`scripts/effets-pierres-preview.mjs`).

## Où la pierre remplace l'ancienne icône

- **Pastilles** (`PastillesCarte`) : la pierre ouvre le mot, le mot reste écrit.
  Elle fait **20 px** dans la pilule.
- **Badges de face** (`IconesCarte`) : la pierre **est** le badge — plus de
  pastille ronde ni de liseré CSS ; le chiffre de l'effet (« Furie 2 ») garde sa
  petite pastille sombre, posée en bas à droite de la pierre. La taille vient de
  la carte (`--rpg-plaque-taille`) : `clamp(24px, 26cqw, 52px)` partout : table, main, mulligan, aperçu,
  catalogue et atelier. Couleur et effets partagent cette mesure unique ; le
  coût utilise une taille 12 % plus grande. Le coût se place dans le coin haut
  gauche et la couleur juste en dessous, également dans le mulligan et l’aperçu.
- **Interlignage** (`IconeLigneRegle`) : 18 px devant la ligne de règle, réservé
  aux surfaces de lecture.

Sur une carte **en jeu**, la colonne d'emblèmes n'est pas posée *dans*
l'illustration : elle est chevillée au bord droit, à cheval sur le cadre, comme
les emblèmes d'Arcane Rush. La colonne s'aligne sur le bord (`right: 0`) puis
glisse vers l'extérieur d'une part d'elle-même (`--rpg-plaque-bord` : 36 % sur
la table et le plateau, 30 % dans la main, 22 % au doigt), d'où une pierre dont l'axe reste
juste à l'intérieur du cadre et dont la moitié déborde sur la table. La carte
ouvre son rognage de 24 px (20 px en main) pour laisser passer ce débord — `overflow: clip` avec
une marge, jamais `hidden` : aucun débordement ne crée de zone de défilement —
et l'illustration reprend le rayon du cadre à son compte.

Les états existants suivent : une Ténacité dépensée, un Bouclier tombé ou un
gain de Furie encore en attente gardent leur pierre à leur place, éteinte par
`filter: grayscale(1)`.

## La Protection élémentaire

Une Protection teinte **sa pierre** de l'élément qu'elle repousse — Braise,
Eau, Neige, Ténèbres —, avec la palette de `PROTECTION_COULEURS`. La Protection
contre le **Sable** ne prend aucune teinte et garde la pierre or de sa famille.
Une Protection double affiche deux pierres, une par couleur.

## La revue

```bash
node scripts/effets-pierres-preview.mjs      # public/preview-effets-pierres.html
node scripts/effets-pierres-planche.mjs      # la planche SVG de cette page
node --test tests/rpg-effets-pierres.test.js # la grammaire, les formes, la feuille
```

La page de revue assemble le balisage réel (sprite + `plaqueSvg`) et
`effet-icons.css` : une face de carte, les pastilles de quatre fiches, toutes
les pierres rangées par famille, l'échelle des tailles et les états.

Les effets de la main commencent en haut de la face, sur le bord droit.
Le coût reste visible sur le plateau. L’aperçu et sa face utilisent
`overflow: visible` : les pierres ne sont plus rognées par le volet ;
l’illustration conserve ses propres coins arrondis.

Le volet d’aperçu réserve 28 px sur ses côtés et un interstice de 32 px :
les pierres restent à l’intérieur de la zone défilante du panneau parent,
même quand sa face est en débord visible (52 × 45 % + halo < 28 px).

Les symboles de couleur sont volontairement plus discrets : le sablier SVG
occupe 56 % de sa pastille, les autres glyphes utilisent un corps de 42 %.
Le sigle SVG d’un sceau de type de sort occupe 48 % du sceau. La taille des
pierres d’effets et celle du coût ne changent pas.

## Liseré doré

Les hexagones d’effets et les losanges de couleur/coût portent un liseré fin
`#d4b57a`, repris du losange des armes. Le trait SVG extérieur passe de 1,4
à 0,8 unité ; la silhouette dorée remplace l’ancienne silhouette noire.
Les sceaux de type utilisent le même or. Les fonds rouge/bleu/violet et les
pictogrammes blancs sont conservés ; le halo sombre du pictogramme reste
uniquement pour son contraste, à l’intérieur de la pastille.

Les pictogrammes d’effets sont réduits à 16 unités (20 → 18 → 16), centrés
dans les mêmes hexagones. Le trait apparent, le contour doré et les tailles
des pastilles restent inchangés.


## Coût dans le coin supérieur gauche

Le losange de coût chevauche le coin haut gauche (`top: 0`, `left: 0`,
translation de −36 % sur les deux axes). Il grandit de **12 %**, chiffre
compris, sans agrandir les pastilles de couleur ni les hexagones d’effets.
La couleur passe sous la partie visible du coût, avec un écart de 6 px.
Une carte hybride conserve ses deux couleurs empilées sous le coût ; les
compteurs de durabilité et de cale sont décalés sous cet ensemble.
Sans coût (terrain), la couleur conserve son emplacement haut habituel.

La règle est commune au plateau, à la main, au mulligan, aux aperçus,
au catalogue et à l’atelier, sur PC et tactile. Le débord maximal du coût
agrandi reste inférieur à la marge de 22 px des grandes faces.
