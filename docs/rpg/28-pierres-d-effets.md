# 28 — Les pierres d'effets

Les mots-clés du Sablier ne s'impriment plus en trait doré posé à même le texte :
chaque effet porte une **pierre taillée**, un petit emblème de héros — fond
saturé, biseau clair en haut, ombre en bas, liseré sombre, pictogramme **blanc**
au centre. La référence de style est celle des emblèmes de héros des jeux
d'auto-battler : le losange braise, l'hexagone ténèbres, l'hexagone or.

![Les pierres d'effets : avant/après, faces de cartes, pastilles, toutes les pierres, échelle et états](assets/pierres-effets.svg)

## La grammaire

Deux choses se lisent d'un coup d'œil, sans lire le mot :

- **la forme dit la famille d'action** — le `diamant` pour ce qui frappe et se
  déplace, l'`hexagone` pour ce qui tient et dure ;
- **la pierre dit le registre** — braise pour le combat, azur pour le tempo, or
  pour la garde, ténèbres pour ce qui ronge, émeraude pour les ressources ;
- **la nuance dit l'effet** — deux effets d'une même famille ne partagent jamais
  leur couleur (voir « Une couleur par effet »).

| Famille | Forme | Pierre | Effets |
| --- | --- | --- | --- |
| **Assaut** | diamant | braise | Dégâts, Affaiblissement, Coup critique, Attaque ciblée, Traque, Overkill, Furie, Harakiri, Abordage, Prise, les quatre Destructions |
| **Tempo** | diamant | azur | Rapidité, Envol, Esquive, Contre-attaque, Embuscade, Rebond |
| **Garde** | hexagone | or | Protection (et ses variantes de sorts), Bouclier, Ténacité, Défenseur, Provocation, Aura, Bannière, Renfort, Résonance, Compagnie |
| **Ombre** | hexagone | ténèbres | Malédiction, Vol de vie, Furtivité, Infiltration, Exil, Réanimation, Contresort, Transfert, Tribut, Défausses, Blocages interdits, Cale |
| **Flux** | hexagone | émeraude | Pioche, Recherche, Butin, Cargaison, Mana, Soin, Recyclage, Heures, Jetons, Lien |

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
4. la **moitié haute** du champ, éclaircie par la lueur ;
5. la **moitié basse**, assombrie par l'encre ;
6. le **filet** clair sur le champ — l'arête taillée ;
7. le **halo d'encre** du pictogramme (`HALO_SYMBOLE`) — un trait sombre qui
   détache le blanc du champ quand la pierre est claire (or, sable, azur) ;
8. le **pictogramme**, blanc, à 12 unités (diamant) ou 20 (hexagone).

Le biseau n'a pas la même épaisseur selon la forme (`BISEAU_PAR_FORME`) :
l'**hexagone** ouvre son champ à 80 % (anneau 90 %), le **diamant** à 84 %
(anneau 92 %) — ses quatre pointes rognent le centre, il lui faut donc un champ
plus large pour que son pictogramme reste dedans. Le contour sombre, lui, ne
vient plus de l'épaisseur de l'anneau mais du trait d'encre : la pierre garde un
grand champ de couleur **et** une arête nette, y compris sur une illustration
claire.

L'hexagone remplit aussi son carré de plus près que le premier dessin : 28 de
large sur 30 de haut. À 18 px sur une face de carte, une pierre étroite se lisait
comme un pois à côté de son pictogramme — d'où l'ouverture jusqu'aux bords.

Les formes pointues laissent moins de place au centre : le pictogramme y est plus
petit, mais son **épaisseur apparente ne change pas** — `EPAISSEUR_SYMBOLE`
compense la réduction (`2,2 × 24 / taille`), pour un trait effectif de 2,2 unités
de pierre partout : 1,1 px sur une pierre de 16 px (carte au doigt), 2,1 px sur
celle de 32 px de l'aperçu. Le halo suit la même règle (`+ 1,6` unité).

## Une couleur par effet

Le registre donne l'ancre ; la **nuance** donne la reconnaissance. `teinteEffet`
fait tourner chaque clé autour de la pierre de sa famille : ±26° de teinte, ±5 %
de luminosité, plus 1,5 % d'écart de parité — soit **64 couleurs distinctes**
pour 64 effets, vérifiées par les tests. Un joueur reconnaît donc l'effet à sa
seule pastille, sans lire le pictogramme, et la famille reste lisible : les
quinze Assauts vont du rouge sombre au rouge clair, jamais au bleu.

Les quatre couches de la pierre (`encre`, `creux`, `fond`, `lueur`) reçoivent la
même rotation, à des dosages différents : le champ tourne franchement, le creux
et la lueur suivent, l'encre reste presque noire.

Rien n'est deviné en CSS : la pierre est dessinée dans le SVG, ce qui la rend
insensible aux couleurs de texte qui l'entourent et vérifiable hors navigateur
(`scripts/effets-pierres-preview.mjs`).

## Où la pierre remplace l'ancienne icône

- **Pastilles** (`PastillesCarte`) : la pierre ouvre le mot, le mot reste écrit.
  Elle fait **20 px** dans la pilule.
- **Badges de face** (`IconesCarte`) : la pierre **est** le badge — plus de
  pastille ronde ni de liseré CSS ; le chiffre de l'effet (« Furie 2 ») garde sa
  petite pastille sombre, posée en bas à droite de la pierre. La taille vient de
  la carte (`--rpg-plaque-taille`) : `clamp(16px, 17cqw, 30px)` sur la table,
  24 px dans la main, 18 px au doigt, 32 px dans l'aperçu, 22 px à l'atelier.
- **Interlignage** (`IconeLigneRegle`) : 18 px devant la ligne de règle, réservé
  aux surfaces de lecture.

Sur une carte **en jeu**, la colonne d'emblèmes n'est pas posée *dans*
l'illustration : elle est chevillée au bord droit, à cheval sur le cadre, comme
les emblèmes d'Arcane Rush. La colonne s'aligne sur le bord (`right: 0`) puis
glisse vers l'extérieur d'une part d'elle-même (`--rpg-plaque-bord` : 36 % sur
la table et le plateau, 30 % dans la main, 22 % au doigt), d'où une pierre dont l'axe reste
juste à l'intérieur du cadre et dont la moitié déborde sur la table. La carte
ouvre son rognage de 14 px pour laisser passer ce débord — `overflow: clip` avec
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
