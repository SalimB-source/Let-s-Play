# 26 — Le cavalier sans nom (créature Eau + Ténèbres)

**Statut : codée et jouable.** Une créature **mythique** hybride **Eau + Ténèbres**,
ajoutée au catalogue (`src/games/rpgCards.js`, `RPG_CREATURE_CARDS`), révélé au
sommet de la **Tour de la Nécropole** (`necropole-4`), vendue à l’étal du Souk et
ouvrable en booster. Elle n’appartient à aucun set frappé : c’est une figure
isolée, comme l’Archonte du sablier noir ou la Danseuse des ombres de dune.

> On a gratté son nom du registre. Il revient sur la marée noire, et la marée,
> elle, n’oublie pas une dette.

---

## 1. La fiche

| Champ | Valeur |
| --- | --- |
| **Nom** | Le cavalier sans nom |
| **Identifiant** | `le-cavalier-sans-nom` |
| **Couleurs** | Eau + Ténèbres (`colors: ['eau', 'tenebres']`, `colorCost: { eau: 1, tenebres: 1 }`) |
| **Coût** | 6 mana (1 Eau + 1 Ténèbres + 4 générique) |
| **ATQ / DEF** | 5 / 5 |
| **Rareté** | Mythique (1 exemplaire) |
| **Ligne de type** | Créature légendaire — Cavalier · Spectre |
| **Illustration** | `public/cards/le-cavalier-sans-nom.jpg` |

**Texte de règle :**

> **Envol** — Ne peut être bloqué que par une créature avec Envol.
> **Tribut 2** — Quand cette créature touche le sorcier adverse, il perd 2 PV et
> vous en gagnez 2.
> Quand Le cavalier sans nom arrive : renvoyez une créature adverse ciblée **de
> coût 4 ou moins** dans la main de son propriétaire, **puis piochez une carte**.

**Saveur :** « Nul n’a gravé son nom sur la pierre ; la marée, elle, se souvient
de chaque noyé. »

---

## 2. Pourquoi ces effets — l’identité Eau + Ténèbres

La note de direction (`05-concept-cartes.md`, §11) fixe la langue de chaque
élément. Le cavalier parle exactement les deux :

- **Eau — elle renvoie, et elle rapporte.** Le **Rebond** à l’arrivée
  (`arrivee: { type: 'retour-main', cible: 'creature', coutMax: 4, pioche: 1 }`)
  est la langue de l’Eau : la marée reprend ce qui s’avance trop près du bord,
  sans brûler ni détruire, **et le courant vous raconte ce qu’elle a pris** —
  une carte piochée. C’est le geste du *Sonneur fêlé* marié au *Courant de
  retour*, posé sur une finisher.

  **Le plafond de coût est la contrepartie de la pioche.** Un Rebond qui
  remplace une carte ne peut pas aussi effacer n’importe quelle menace : au-delà
  de 4 mana, les grandes bêtes (*Le Kraken*, *Léviathan*, *Jörmungandr*) restent
  hors de portée. Le cavalier balaie le menu fretin et le milieu de courbe, pas
  les finisseurs adverses — c’est ce qui garde la carte du côté du tempo plutôt
  que de la réponse universelle.

  Le seuil est honoré partout par le garde-fou existant `cibleRespecteCoutMax`
  (`rpgDuel.js`) : **pose directe** (une cible hors seuil annule la pose, mana
  non dépensé), **désignation différée** (la table n’ouvre que les cibles
  légales) et **IA** (`meilleureCibleRenvoiIA` dans `rpgAI.js`). Et comme le
  *Courant de retour*, **la pioche part même sans cible légale** : le cavalier
  n’est jamais une carte morte sur une table vide ou trop lourde.
- **Ténèbres — elles prélèvent.** Le **Tribut 2** est le mot-clé du set Ténèbres
  (`rpgTenebres.js`) : jamais de « dégâts » nus, mais un **transfert de vie** —
  l’adversaire perd 2 PV, vous en gagnez 2. Le cavalier ne blesse pas la nuit,
  il encaisse sa dette.
- **Envol** porte la fiction : un spectre noyé chevauche au-dessus des lames.
  Mécaniquement, il ne peut être bloqué que par une autre créature avec Envol —
  une menace qui passe les lignes terrestres et force une réponse.

Le trio raconte la carte sans une ligne de règles inventée : **tempo** (Eau),
**pression de vie** (Ténèbres), **évasion** (le spectre). Aucun moteur neuf :
tous les effets existent déjà et sont couverts par l’IA et le PvP.

### Équilibre

Pour 6 mana, un 5/5 Envol + Tribut 2 + Rebond borné piochant une carte est un
**moteur de tempo**, pas un rouleau compresseur : elle n’a ni Protection ni
Tenacité, donc elle tombe sur un sort de destruction ou une attaque ciblée. Le
Rebond ne rend pas la carte à l’adversaire gratuitement — elle est **remplacée**
par la pioche, ce qui en fait un avantage de carte net, mais borné aux coûts ≤ 4.
On la compare aux autres six-drops : *La Dévoreuse* (6 mana, 4/5, exil sans
limite de coût), *Le Passeur au masque de chacal* (6 mana, 5/5, réanimation),
*Celui qui juge* (6 mana, 3/5, Tribut 2 + petite pesée). Le cavalier échange la
réponse universelle contre de l’évasion, du tempo et une carte — un profil
hybride, plus souple, moins explosif.

---

## 3. Direction artistique

Conforme à `AGENTS.md` : **dark fantasy** inspirée d’Elden Ring / Dark Souls,
sombre et cinématographique, adaptée à l’élément. Un cavalier squelettique noyé,
armure corrodée sans visage sous le heaume, monture spectrale dont le bas se
dissout dans l’eau noire ; une chaussée inondée sous une lune noyée. Palette
**bleu abyssal / sarcelle** (Eau) fondue dans le **violet-noir** (Ténèbres),
lumière froide en contre-jour, brume. Livrée en 768 × 960, qualité 72
(`npm run art:aleger`), comme tout le catalogue.

---

## 4. Intégration

- **Catalogue** — `RPG_CREATURE_CARDS` (`rpgCards.js`). Cadre hybride
  `hybride-eau-tenebres`, sans reflet (règle des hybrides, même mythiques).
- **Collection** — révélée à `necropole-4` (`rpgCollection.js`), aux côtés des
  autres figures hybrides de la nuit. Hors dotation (mythique), vendue **300 ◈**
  à l’étal (`rpgSoukDirect.js`), présente au vivier des boosters.
- **Decks composés** — aucune recette n’a l’identité `['eau', 'tenebres']` : la
  carte n’entre donc dans aucun deck précomposé (comme le *Traqueur des nuits
  sans lune*). Elle se joue à l’atelier, en PvP et dans les decks personnalisés.
- **Aperçu** — trois pastilles : **Envol**, **Tribut 2**, **Rebond**
  (`effetIcons.js`) ; le texte d’arrivée reste lisible sur la fiche.
- **Voix** — muette, volontairement : nul ne connaît son nom, nul ne l’entend.
  Elle garde l’effleurement générique, comme les autres cartes sans voix.

**Tests :** `tests/rpg-cavalier-sans-nom.test.js` (12 contrôles : fiche, seuil de
coût, cadre, peinture, disponibilité, aperçu, Rebond + pioche, refus d’une cible
de coût 5, désignation différée, pioche sans cible, ciblage de l’IA, Tribut).
Ajouté à `npm run check:rpg`.

---

## 5. Réglages et pistes ouvertes

**Retenu** : la piste « plus marée » — Rebond **+ pioche**, avec le rebond
**borné à coût 4 ou moins**. Le plafond est la contrepartie de la carte piochée :
sans lui, un Rebond qui se remplace soi-même répondrait à n’importe quelle
menace, ce qui sortrait la carte de son rôle de tempo.

Le seuil est le bouton de réglage naturel si l’équilibre le demande : `coutMax: 3`
resserre la carte sur le menu fretin, `coutMax: 5` l’ouvre aux gros six-drops
adverses — une ligne à changer dans la fiche, aucun moteur à toucher.

Autres directions, si l’on veut infléchir son rôle sans changer son identité :

1. **Plus « effacement » (Ténèbres durcies).** Remplacer le Rebond par un **exil**
   ciblé sous le même seuil (`arrivee: { type: 'exil', cible: 'creature',
   coutMax: 4 }`, comme le Père des corbeaux) : le nom est littéralement effacé,
   pas seulement repoussé. Plus fort en contrôle, moins tempo — et il faudrait
   alors retirer la pioche.
2. **Version rare 4/4 pour 5 mana**, sans Envol, en ouvrant la carte au plus
   grand nombre — la légende mythique restant la version « complète ».

Ces variantes restent dans la langue des deux éléments et n’exigent aucun
nouveau moteur.
