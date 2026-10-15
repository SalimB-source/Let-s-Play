# 11 — La Dernière Liste : bible visuelle et intégration

## Règle absolue : un personnage, un portrait de référence

Les personnages récurrents **ne sont pas générés de nouveau pour chaque scène**.
La première version utilise des peintures fixes, composées avec des décors
séparés et du texte DOM. La même illustration est réutilisée dans le dialogue,
le briefing, le journal et la plaque adverse du duel.

Le registre unique est `src/games/rpgStoryCast.js` :

- `RPG_STORY_CAST` : identité, rôle, couleur de cartouche, fichier et cadrage ;
- `RPG_STORY_OPPONENT_CAST` : correspondance étage → personnage ;
- `portraitHistoire` : résolution commune des images ; pour une carte existante,
  délégation au résolveur `cardArt` de la page, avec la même révision de cache ;
- `RPG_STORY_DECORS` : décors indépendants, sans nouvelle incarnation des héros.

**Les répliques ne contiennent que l'identifiant du personnage, jamais une
image alternative.** Les objets du registre sont figés et les tests vérifient
les références, les fichiers livrés et la continuité de leurs URL dans l'interface.

## Les références conservées

| Personnage | Illustration canonique | Règle |
| --- | --- | --- |
| Salem | `public/cards/salem.jpg` | **Repeint en nihonga** (octobre 2026) : même visage, même perche, même carnet |
| Yamina | `public/cards/yamina.jpg` | **Repeinte en nihonga** (octobre 2026) : même visage, même outil d'horlogère |
| Fériel | `public/cards/feriel.jpg` | **Repeinte en nihonga** (octobre 2026), y compris comme adversaire à `listes-4` |
| Tarek | `public/cards/tarek.jpg` | **Repeint en nihonga** (octobre 2026) : même visage, même charge sur l'épaule |
| Boualem | `public/cards/boualem.jpg` | **Repeint en nihonga** (octobre 2026) ; toujours réservé pour les actes suivants |
| Le Guetteur de palier | `public/cards/guetteur-du-beffroi.jpg` | Portrait existant adopté comme référence de ce gardien |
| La Scribe | `public/sablier-story/scribe.jpg` | Portrait dédié au personnage féminin du récit ; ne remplace pas l'illustration de la carte générique `scribe-de-la-liste` |
| Le Puisatier des Cendres | `public/sablier-story/puisatier.jpg` | Personnage distinct de Boualem |
| Mahieddine | `public/sablier-story/mahieddine.jpg` | Le Grand Horloger de `listes-5`, pas l'Horloger du Zénith |

Les quatre nouveaux fichiers de `public/sablier-story/` sont des illustrations
IA réalisées pour cet épisode : trois portraits et un décor vide (`greffe.jpg`).
Les peintures de la Tour des Listes et les cartes existantes ont servi de
références de style.

### Les cinq héros repeints en nihonga

Une passe postérieure a **repeint les cinq héros du récit** sous les mêmes
noms de fichiers : Salem, Yamina, Fériel, Tarek et Boualem. Le principe du
portrait unique est donc préservé — un personnage, un fichier —, seule la
facture change : peinture japonaise **nihonga** (pigments minéraux mats sur
feuille d'or, lavis d'encre, fibre de papier washi, nuages d'or plats) portée
par une **palette algérienne** plus riche — indigo touareg, safran, henné,
vert émeraude et turquoise, terre cuite, ocre, or abondant — avec des motifs
amazighs (losanges, chevrons, zigzags), des bijoux kabyles argent et corail,
et le sablier en filigrane.

Les repères d'identité restent intacts : même âge, même visage, même coiffure,
même tenue de métier et mêmes accessoires (perche à crochet et carnet de
Salem, outils d'horlogère de Yamina, canne et verre en fusion de Fériel,
carton de la Chambre de Tarek, corde et clef de citerne de Boualem), et la
tête reste dans le tiers supérieur du cadre pour que les portraits de
dialogue, le journal et les cartes la lisent sans recadrage. Les fichiers sont
désormais livrés au ratio **4:5 de la face**, contrôlé par `PLEIN_ART_45`, et
datés d'une seule révision de cache `heros-nihonga-algerien-v1` dans
`RpgDuelPage.jsx` : aucun cache ne peut resservir les huiles précédentes.

Les autres personnages du registre — Guetteur, Scribe, Puisatier des Cendres,
Mahieddine et les figures des autres tours — gardent leur illustration d'origine.
La passe a toutefois été étendue à la carte de héros **Le Serpent du monde**
(`public/cards/serpent-du-monde.jpg`), figure du Nord et récompense de
`fjord-4`, qui n'entre pas dans le casting du récit : même facture, même
palette, même révision de cache.

### Repères des nouveaux personnages

- **La Scribe** : cheveux noirs tressés, robe vert profond, manches ivoire,
  sceau-sablier au cou, plume et tache d'encre à la main. Attitude attentive,
  tenue d'administration, pas une sorcière caricaturale.
- **Le Puisatier des Cendres** : visage buriné, barbe poivre et sel, turban
  ocre, vêtement de travail indigo, corde et clef de citerne.
- **Mahieddine** : cheveux courts argentés, barbe courte, lunettes rondes de
  laiton, caftan bordeaux, col ivoire, broche-sablier et verre de thé. Courtois
  et fatigué plutôt que menaçant.

Pour les futurs chapitres, les **fichiers eux-mêmes** priment sur une simple
description textuelle. Une nouvelle pose devra être produite avec ce portrait
comme référence, puis contrôlée et validée avant intégration : visage, cheveux,
tenue, bijoux et accessoires. Pas de variante aléatoire ni de portrait provenant
d'une autre carte pour meubler une réplique. La version livrée n'utilise aucune
variante et garantit donc la continuité par réemploi du même fichier.

## Les sprites détourés (« stands »)

Le plateau du récit ne présente plus de portrait encadré : chaque personnage y
est posé **découpé sur le décor**, à la manière d'un roman visuel. Le sprite
provient toujours de la peinture canonique — même visage, même tenue, mêmes
accessoires — mais composée en pied, de face, sur fond magenta uni, puis
détourée par `tools/make-stands.py` (inondation depuis les bords, désincrustage
du halo, plume légère, WebP à fond transparent, 900 px de haut au plus).

- **Un sprite par personnage**, livré dans `public/sablier-story/stands/`, et
  déclaré dans `RPG_STORY_CAST` (`stand`). Le registre reste l'unique source :
  les scènes ne portent aucun chemin d'image.
- Les actes II à V sont désormais tous détourés : Marchand de sable, Gardienne
  des ksour, Djinn du tournant, Reine des étals, Pêcheur de perles, Nageuse des
  puits, Sonneur d'écume, Dévoreur de l'abîme, Garde du fjord, Meute des neiges,
  Valkyrie du fjord, Maître des Neuf Hivers, Dernier Fennec, Ifrit des ergs,
  Horloger du Zénith.
- La **carte** reste la référence du duel : la plaque adverse du duel garde le
  portrait encadré, le plateau du récit garde le sprite. Même peinture, deux
  usages.
- Un sprite qui ne se décode pas retombe sur le portrait encadré : jamais de
  carré cassé, jamais de fond de détourage visible.
- Une nouvelle passe de détourage incrémente la révision `?v=` de
  `standHistoire()` : aucun cache ne peut resservir l'ancienne image.

## Les poses selon la situation

Un personnage ne garde pas la même posture du premier au dernier échange. La
**situation** de la scène remplace sa pose de référence par une variante —
même visage, même tenue, même peinture, seule la posture change (et
l'expression avec elle). Trois situations existent, déclarées une fois pour
toutes dans `SITUATIONS_POSE_HISTOIRE` :

| Situation | Fichier | Quand elle s'applique | Posture |
| --- | --- | --- | --- |
| `duel` | `-affrontement` | Dernier échange d'une scène d'avant-duel | On se met en garde, on se cambre |
| `choix` | `-decision` | Une décision est posée au lecteur | La figure qui interroge tient son monde |
| `apres` | `-apaisement` | Dernier échange d'une scène d'après-duel | Les épaules redescendent, la voix s'adoucit |

Le registre est le seul endroit qui connaît les fichiers : chaque personnage
porte `poses: { duel: 'sablier-story/stands/stand-<id>-affrontement.webp',
choix: '…-decision.webp', apres: '…-apaisement.webp' }` et
`poseHistoire(id, situation)` résout l'image. Le nom du fichier suit toujours
le suffixe que la situation déclare (`SITUATIONS_POSE_HISTOIRE`, champ
`suffixe`) : le test refuse une variante mal nommée.
**Règles de continuité :**

- une situation non déclarée, inconnue ou absente retombe sur la pose de
  référence (`stand`) : aucune figure n'est jamais obligée d'avoir une variante ;
- la variante d'un personnage ne sert jamais à un autre — pas de pose
  empruntée, pas de retournement horizontal ;
- les variantes sont détourées par le même `tools/make-stands.py`, à partir de
  la pose de référence comme source de composition ;
- toute nouvelle variante incrémente la révision `?v=` de `standHistoire()` ;
- un changement de pose rejoue une courte recomposition
  (`@keyframes rpg-story-repose`), neutralisée pour `prefers-reduced-motion` ;
- les tests refusent une situation inventée, une variante identique à la
  référence, un fichier non livré ou sans canal alpha, et le lecteur monté
  vérifie que la pose change au dernier échange et revient au référentiel
  ensuite.

**État livré :** les deux postures de **toutes les figures détourées** — les
cinq héros (Salem, Yamina, Fériel, Tarek, Boualem, Mahieddine), les figures de
la Chambre (la Scribe, le Guetteur, le Puisatier des Cendres) et les
antagonistes des actes I à V (le Marchand de sable, la Gardienne des ksour, le
Djinn du tournant, la Reine des étals, le Pêcheur de perles, la Nageuse des
puits, le Sonneur d'écume, le Dévoreur de l'abîme, la Garde du fjord, la Meute
des neiges, la Valkyrie du fjord, le Maître des Neuf Hivers, le Dernier Fennec,
l'Ifrit des ergs, l'Horloger du Zénith).

**Huit figures ont en plus leur posture de décision** — les deux figures de
chacune des cinq scènes où le lecteur tranche : Salem, Yamina, la Scribe, le
Djinn du tournant, Boualem, Mahieddine, la Valkyrie du fjord et l'Horloger du
Zénith. À `listes-2-apres`, la Scribe montre la liste ouverte au lecteur, pages
tournées vers lui ; à `sables-3-apres`, le Grand Horloger ouvre les mains à
hauteur de hanche et passe la plume tandis que l'Horloger du Zénith tend son
astrolabe. **Aucun plateau de décision ne reste donc sur une posture d'un autre
moment**, et le repli garde sa preuve juste à côté : au niveau du registre, une
situation non déclarée pour une figure donnée (le Guetteur, qui n'a pas de pose
de décision) rend bien sa pose de référence.

Quelques repères de la garde et de la détente : la Garde du fjord dresse son
bouclier en mur devant sa poitrine, puis le pose contre sa jambe et ouvre la
main vers la herse ; le Maître des Neuf Hivers abat son bâton dans la glace et
fait tournoyer ses deux corbeaux, puis plante le bâton et offre le sceau du
Nord ; le Sonneur d'écume hisse sa cloche de bronze au-dessus de l'épaule, puis
s'écarte, la cloche au repos derrière le talon.

### Contour des sprites : le liseré de fond

Trois pièges du détourage, tous traités par l'outil et vérifiés par
`tools/check-stands.py` :

1. **La couleur du fond survit sous les pixels transparents.** Le flou d'alpha
   de la plume la révélait : tous les sprites portaient un liseré rose. La
   couleur du personnage est donc **étalée sous la zone vide** avant la plume
   (`etaler_couleur`) — le contour ne peut plus révéler que des couleurs du
   personnage. Le désincrustage a été resserré en même temps (`DESPILL` 42 → 22).
2. **La fringe JPEG** propre au fond magenta est absorbée par cette étape.
3. **Le cadrage de la source.** Le détourage rogne sur la figure : un sprite
   livré plus court que 900 px vient d'une source où la figure n'occupait pas
   toute la hauteur, et elle paraît plus petite que les autres sur le plateau.
   `python3 tools/check-stands.py` mesure les deux (liseré et gabarit) et nomme
   les sprites à reprendre. **Repris dans cette passe :** `stand-tarek.webp`
   (source portrait 896×1200), `stand-valkyrie-fjord.webp` et
   `stand-ifrit-ergs.webp` (sources portrait). **80 sprites** (24 figures et
   56 variantes) passent aujourd'hui le contrôle sans réserve.

## Mise en scène

- Décor atmosphérique indépendant, personnages découpés et cartouche de dialogue.
- **Le décor se voit.** Aucune nappe sombre ne recouvre la peinture : les deux
  couches qui la portent (`.rpg-narrative`, `.rpg-narrative__decor`) ne
  déclarent que l'image. Le seul assombrissement est la *bande de sol* — un
  fondu du dernier tiers de l'écran, jamais opaque — là où vivent les sprites,
  la boîte de dialogue et le pied de scène.
- La lisibilité vient donc des **panneaux qui portent du texte** et non d'un
  voile : boîte de dialogue opaque à liseré clair, halo local du cartouche et
  de la page de briefing, fond dense des décisions, ombres portées des
  libellés. Le garde-fou `npm run check:rpg-story-ui` refuse le retour d'un
  dégradé sombre sur les couches de décor.
- Décors : extérieur des Listes, greffe, citernes, atelier du Souk, fjord et
  sables. Les miniatures existantes servent de vues d'ambiance ; le nouveau
  greffe est vide.
- Pas de texte imprimé dans les images : les noms et répliques restent nets,
  sélectionnables et accessibles aux lecteurs d'écran.
- Un changement d'interlocuteur remplace le sprite par **le sien** — et jamais
  le portrait encadré : le plateau ne montre que des figures détourées.
  Aucun retournement horizontal, recoloration de costume ou nouvel âge.
- Lecteur utilisable en portrait sur téléphone, en paysage et au clavier.
  Le plein écran conserve la même coque que le duel.
- Texte immédiat, progression manuelle, son désactivable, transitions supprimées
  si `prefers-reduced-motion` est demandé. Aucun compte à rebours.

## Ce qui est livré

Accès : **Le Sablier → Histoire → Commencer le récit**.

- Épisode I, **Les absents** : 5 duels existants et 10 scènes.
- Décision de la Scribe : publication ou copie confiée à Tarek ; reprise dans
  la scène de Fériel et l'épilogue. Les deux voies préservent les mêmes cartes.
- Journal en lecture seule : scènes terminées, décision, les douze noms et
  portraits des personnages rencontrés, sans dévoiler les scènes futures.
- Les cinq tours libres restent accessibles, sans verrou narratif supplémentaire.
- Un duel déjà remporté peut être passé pour découvrir l'histoire sans grind.
- Une défaite ne fait pas avancer le récit et ne réimpose pas l'introduction.
- Ouvrir une lecture depuis un duel en cours demande confirmation avant de
  l'interrompre. « Continuer le récit » reprend directement un duel de campagne
  encore en mémoire.
- « Recommencer le récit » conserve les victoires, cartes et decks ; l'effacement
  complet des victoires se confirme séparément et met d'abord les cartes acquises
  en cache pour ne pas les retirer de la collection.

### Sauvegarde

`letsplay_sablier_histoire_v2` porte les victoires et le récit dans un même objet :
`version`, `etagesVaincus`, `recit` (`campagneId`, `curseur`, `scenesVues`, `choix`).
Le curseur peut être une scène avec sa réplique / son résumé, un briefing de
duel, ou la fin d'épisode.

Migration depuis la v1 sans perte de victoire ni décision inventée ; v1 gardée
en secours. Victoire et scène après-duel enregistrées ensemble. Un stockage
refusé est signalé sans empêcher la session. La progression narrative reste
**locale** : la synchronisation du compte porte toujours sur les decks et la
collection, pas sur le récit. Le plateau d'un duel n'est pas sauvegardé après
fermeture de page.

### Limites assumées

Les quatre actes suivants, les fins du portail, les neuf registres optionnels,
le doublage et la synchronisation du récit sont hors de cette livraison.
Le moteur `rpgDuel.js` et l'IA ne sont pas modifiés. Les récompenses d'étage
l'ont été depuis : le dossier 13 les a remplacées par des **révélations** —
l'étage dit où la carte entre dans la ville, le Souk la vend.

## Vérifications

- `npm run check:rpg` : tests du récit, dont les garde-fous de casting — tout
  personnage joué a son sprite, le fichier est livré, daté, et son WebP déclare
  bien un canal alpha (un fond opaque signalerait un détourage raté).
- `npm run check:rpg-story-ui` : tours libres et lecteur réellement montés ;
  victoire/défaite du moteur sur fixtures accélérées, reprise, décisions,
  journal, réinitialisation, stockage refusé, contrôle de l'interruption d'un
  duel — et le contrôle du décor : aucune des deux couches qui portent la
  peinture ne déclare de dégradé sombre, la bande de sol ne commence pas avant
  55 % de la hauteur et reste un fondu léger (alpha ≤ 0,6), le cartouche et la
  page de briefing gardent leur halo, les décisions leur fond dense.
- `npm run check:rpg-story-browser` : les deux branches dans Chromium, en tactile
  et sur ordinateur ; migration, clavier, rechargement, images décodées,
  portraits identiques, journal sans effet, 320 à 1440 px, thèmes clair/sombre.
- `npm run check:rpg-story-3d-ui` : les cinq maquettes de la version courante
  coexistent avec la campagne ; rotation, chargement à vue, navigation au clavier,
  défilement mobile, perte de contexte et repli sans WebGL vérifiés.
- `npm run check:rpg-ui`, `check:rpg-fullscreen`, `check:rpg-ambient-ui`,
  `check:rpg-deck-ui`, `check:rpg-tutorial-ui` et `npm run build` réussis.

**Point préexistant relevé :** `npm run check:rpg-mobile` échoue sur son assertion
« terrain stacks … and hand stats fit » à **568 px**, avec le Chromium de cet
environnement. Le même échec a été reproduit sur les sources du commit de départ
`65664ea4`, sans ces changements. Le test n'a pas été assoupli et le CSS du
plateau mobile n'a pas été modifié. Les vérifications mobiles du nouveau lecteur
passent. Le build conserve également les avertissements de taille des gros
chunks du site.
