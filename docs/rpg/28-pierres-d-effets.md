# 28 — Les pierres d'effets

Les mots-clés du Sablier ne s'impriment plus en trait doré posé à même le texte :
chaque effet porte une **pierre taillée**, un petit emblème de héros — fond
saturé, anneau en creux, liseré sombre, pictogramme plein **blanc**
au centre. La référence de style est celle des emblèmes de héros des jeux
d'auto-battler : le losange braise, l'hexagone ténèbres, l'hexagone or.

![Les pierres d'effets : avant/après, faces de cartes, pastilles, toutes les pierres, échelle et états](assets/pierres-effets.svg)

## La grammaire

Deux choses se lisent d'un coup d'œil, sans lire le mot :

- **la forme dit la famille d'action** — le `diamant` pour ce qui frappe et se
  déplace, l'`hexagone` pour ce qui tient et dure ;
- **la couleur dit le type** — rouge pour l’assaut, bleu pour garde et tempo,
  violet pour ombre et ressources ;
- **la silhouette blanche dit l’effet** — poing (Furie), éclair (Dégâts),
  impact (Critique), croix (Soin), rocher fissuré (Ténacité), bourse (Butin).

| Famille | Forme | Pierre | Effets |
| --- | --- | --- | --- |
| **Assaut** | diamant | braise | Dégâts, Affaiblissement, Coup critique, Attaque ciblée, Traque, Overkill, Furie, Harakiri, Abordage, Prise, les quatre Destructions |
| **Tempo** | diamant | azur | Rapidité, Envol, Esquive, Contre-attaque, Embuscade, Rebond |
| **Garde** | hexagone | bleu | Protection (et ses variantes de sorts), Bouclier, Ténacité, Défenseur, Provocation, Aura, Bannière, Renfort, Résonance, Compagnie |
| **Ombre** | hexagone | ténèbres | Malédiction, Vol de vie, Furtivité, Infiltration, Exil, Réanimation, Contresort, Transfert, Tribut, Défausses, Blocages interdits, Cale |
| **Flux** | hexagone | violet | Pioche, Recherche, Butin, Cargaison, Mana, Soin, Recyclage, Heures, Jetons, Lien |

Trois repères de carte parlent désormais la même langue taillée, à la **même
taille** (`--rpg-plaque-taille`, posée par la face de la carte) :

| Repère | Silhouette | Dessin |
| --- | --- | --- |
| Couleur de la carte | **hexagone** | `plaqueNue` — la pierre taillée sans pictogramme |
| Coût de la carte | **diamant** | `plaqueNue`, deux couleurs ⇒ champ en dégradé |
| Effet | diamant ou hexagone de sa famille | `pierreEffet`, pictogramme blanc |

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
4. le **pictogramme plein**, blanc : 16 unités dans le diamant et 20 dans
   l’hexagone. Les 40 symboles du sprite sont des silhouettes fermées, avec
   `fill="currentColor"`, `stroke="none"` et des découpes franches en `evenodd`.
   La couleur blanche est fixée sur le `<use>` de la pierre ; les usages dans
   les lignes de règles héritent de leur couleur de texte.

Le fond reste simplifié à trois couches. Le pictogramme ne dépend plus d’un
trait épaissi par son contexte : les mêmes silhouettes servent sur le plateau,
en main, au mulligan et dans les aperçus. IDs du sprite, infobulles, compteurs,
états grisés et logique du jeu restent inchangés.

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
  catalogue et atelier. Couleur, coût et effets partagent cette mesure unique.
  Le coût du mulligan se place sous la couleur, comme dans l’aperçu.
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
