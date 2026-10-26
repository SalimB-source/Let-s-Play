# Direction artistique des cartes RPG

Toute nouvelle carte du duel doit recevoir une illustration **full art** avant d’être ajoutée au catalogue.

## Format des fichiers

- Fichier local `public/cards/<identifiant>.jpg`, au ratio **exact 4:5** de la
  face (1024×1280 livrés), illustration plein cadre jusqu'aux bords : aucune
  marge, aucun liseré blanc, aucun fond rapporté. Les peintures livrées dans un
  autre cadrage sont recadrées **puis** validées par le garde-fou
  `PLEIN_ART_45` de `tests/rpg-duel.test.js`, qui mesure le ratio dans le JPEG.
- Le champ `art` d’une carte ne sert qu’à pointer vers une illustration dédiée existante (`cardArtId`). Pour une nouvelle carte, utiliser son propre identifiant et livrer le JPG correspondant.
- Pas de cadre, bordure, bannière, cartouche vide, nom, texte, coût, symbole d’élément, statistique ou autre interface dessinée dans l’image. L’interface du jeu superpose elle-même les repères lisibles.
- Illustration peinte, détaillée et cinématographique, avec un cadrage conçu pour rester clair dans une carte portrait et un aperçu réduit.

## Direction picturale — refonte adulte

La collection adopte une fantasy adulte, sobre et incarnée, peinte comme une huile sur toile : modelés naturalistes, gestes et matières crédibles, clair-obscur maîtrisé, glacis profonds, touches de pinceau visibles et texture de toile discrète. Favoriser les compositions cinématographiques, les visages mûrs et expressifs, les palettes terreuses nuancées et les détails de matière plutôt que le spectaculaire facile.

Éviter l’esthétique cartoon, anime, jeunesse, le rendu 3D lisse, le concept art numérique trop brillant, les poses de catalogue et les effets magiques envahissants. Les personnages, vêtements, paysages, architectures et objets doivent rester dignes et documentés, avec une inspiration culturelle respectueuse propre à chaque set (amazighe et nord-africaine, nordique ou japonaise), sans clichés d’exotisme.

Cette direction constitue la base de la collection, avec les exceptions de style documentées par set ci-dessous — Sable, Eau, Braise, terrains, créatures, héros et magies. Chaque carte garde sa propre scène et son sujet clairement identifiable même en petit aperçu. La couleur de l’élément peut influencer la lumière et la palette, mais ne doit pas devenir un badge dessiné dans l’image. L’illustration reste une peinture plein cadre sans texte intégré; l’interface HTML/CSS superpose séparément types, coûts, icônes et statistiques.

Les terrains gardent une illustration plein cadre, mais ne reçoivent ni coût ni badge élémentaire.

## Les créatures-jetons

Un effet peut faire entrer en jeu des créatures **créées sur-le-champ**, sans
carte en main ni sable payé : les **créatures-jetons**. Elles sont déclarées
dans `RPG_JETON_CARDS` (`rpgCards.js`), hors de `RPG_DUEL_CARDS` — le catalogue
sait donc les peindre (`cardById`) sans les rendre collectionnables ni
jouables dans un deck.

- **Chien de sable** (`chien-de-sable.jpg`) — le jeton de Tarek : quand il
  arrive en jeu, il crée deux chiens de sable 1/1 sans coût. La peinture est
  livrée en plein art 4:5 (1024×1280), dans la palette, la lumière de fin de
  jour et la matière de sable sculpté de l'illustration de Tarek
  (`public/cards/tarek.jpg`), sans texte ni interface : deux chiens de sable
  debout sur une crête rocheuse, les ruines de la côte dans le lointain.
- **Samouraï** (`samourai-du-daimyo.jpg`) — le jeton du Daimyō du Soleil rouge,
  levé par deux à son arrivée : un ashigaru en armure lamellaire rouge braise
  et lacets indigo, yari à la main, l'étendard de clan derrière lui, grand
  soleil rouge à l'horizon et crêtes au lavis sumi. Peinture kaiga / nihonga
  plein art 1024×1280 dans la palette du set, **sans aucun idéogramme** — une
  étoffe ornée d'un seul motif de feuille d'or —, version de cache
  `samourai-du-daimyo-kaiga-couleurs-v1`.

Une créature-jeton suit les règles communes de l'illustration : sujet unique et
lisible même en vignette, cadre et statistiques superposés par l'interface.

## Les Tours de défense

Les cinq **Tours de défense** — Braise, Flots, Sable, Neige et Ténèbres — sont
bien des cartes de créature jouables. Elles sont déclarées dans
`RPG_TOUR_CARDS` (`rpgCards.js`), entrent dans `RPG_DUEL_CARDS` et sont donc
visibles dans le Catalogue et dans l’atelier de deck. Elles ne doivent pas être
rangées parmi les créatures-jetons : elles ont un coût, une rareté et leur
propre illustration `public/cards/tour-*.jpg`.

## Variantes illustrées des terrains

Chaque variante est une carte autonome à peinture dédiée, mais reprend strictement
le type, le coût nul et la production de mana de son terrain d’origine. Les
paquets préconstruits mélangent les deux versions pour renouveler les terrains
visibles en main et sur la table ; la campagne reprend aussi les variantes du
Sable et de la Neige dans ses decks personnalisés.

- **Dunes du Ténéré** (`dunes-du-tenere.jpg`) — variante Sable du Désert ;
- **Crêtes de cendre** (`cretes-de-cendre.jpg`) — variante Braise de la Montagne ;
- **Lagune des salines** (`lagune-des-salines.jpg`) — variante Eau de la Mer ;
- **Pétra des deux sources** (`petra-des-deux-sources.jpg`) — variante rare
  hybride de Pétra, déblocable avec Pétra à l’étage `listes-4` ;
- **Glacier des arches** (`glacier-des-arches.jpg`) — variante Neige du Glacier.

Ces cinq peintures sont des pleins arts verticaux au ratio de face 4:5, sans
texte ni symbole incrusté. Le champ `varianteDe` de `rpgCards.js` garde la
correspondance de règles explicite ; chaque variante reste une référence
cataloguée afin que le deck puisse réellement la jouer.

## État du set Neige

Le **Serment des Neuf Hivers** (couleur Neige, cadre bleu clair `#a9e0f5`,
badge ❄️) est entièrement peint : ses vingt-deux cartes originales — Glacier,
Guerrier au bouclier rond, Loup des neiges, Scalde des runes, Valkyrie au
corbeau, Berserk des trois hivers, Jarl au marteau de guerre, Valkyrie des
glaces, Géant des banquises, Drakkar à tête de dragon, **Tour de Neige**, Éclair
du marteau, Mur de boucliers, Festin des vaillants, Brume du fjord, Hurlement
du blizzard, le Père des corbeaux, le Maître du marteau, la Dame des neuf
mondes, le Serpent du monde, **Le Grand Hiver** et la **Hache de la
banquise** — ont leur plein art dédié dans `public/cards/`.
Le Glacier possède aussi une seconde peinture jouable, **Glacier des arches**,
qui partage sa production de Neige.

La nouvelle mythique **Eirik du Premier Serment** rejoint ce vivier avec son
propre plein art 1024×1280 (`eirik-du-premier-serment.jpg`) : un guerrier
viking seul, en marche sur le fjord gelé à l’aube, hache basse et bouclier au
dos, dans la même huile naturaliste que le reste du Serment.

Cinq visuels ont été repris en 1024×1280 : **Éclair du marteau** (un marteau
entièrement fait d’électricité qui fonce vers un guerrier viking et son
bouclier, révision `eclair-marteau-electrique-cible-v1`), **Mur de boucliers**
(la charge frontale d’un mur de boucliers ronds peints), **Brume du fjord** (des Vikings
entièrement prisonniers d’une gangue de glace translucide, figés en file dans
le brouillard du fjord), **Hurlement du blizzard** (un grizzli figé dans une
gangue de glace translucide au cœur de la tempête, révision
`hurlement-grizzli-gele-v1`) et l’état Furie du **Loup des neiges**
(`loup-des-neiges-furie.jpg`, même meute et même composition que la peinture
intacte, chef ensanglanté et crocs dehors).

Les **figures du Nord** sont peintes comme des personnes, chacune avec son
attribut, parce que leur sujet ne doit jamais se réduire à un objet :

- le **Maître du marteau** (le Tonnerre) — un colosse à la chevelure et à la
  barbe rousses, gantelets de fer et large ceinture cloutée, marteau runique
  levé sous l’orage. C’est le seul moyen de ne pas le confondre avec
  l’Éclair du marteau, la magie du set, qui montre un marteau d’électricité
  fonçant sur sa cible ;
- le **Père des corbeaux** — un vieux marcheur à large chapeau de voyage,
  corbeaux sur les épaules et vol de corbeaux dans la tempête (et non un
  sorcier à chapeau pointu, qui n’aurait rien du Nord). Depuis sa refonte
  (coût 6, 5/5, foudre activée), sa peinture est une **illustration
  photoréaliste** — direction demandée explicitement pour cette figure,
  tranchant sur l’huile du reste de la collection ;
- la **Dame des neuf mondes** — une femme au foyer de bois, le fil à la main ;
- le **Serpent du monde** — le corps en anneau qui entoure les eaux.

### La passe Souls du Neige — dix cartes (octobre 2026)

Le Serment des Neuf Hivers avait déjà son huile naturaliste, mais quatre
peintures juraient franchement dans la collection, et six autres flottaient à
mi-chemin. Dix cartes sont donc reprises dans la direction générale de la
maison — huile sombre, clair-obscur, une seule source froide par image, plein
art 4:5 — sous la révision `neige-souls-cendres-v1` :

- **Serpent du monde** — la mappemonde dorée (un globe en anneau, sans rapport
  avec une carte de duel) devient le corps immense qui se dresse entre deux
  parois de roche noire, de nuit, une longère allumée sur la rive pour donner
  l'échelle.
- **Tour de neige** — la tour était en **paysage 1408×768**. Elle est
  maintenant verticale : pierre noire sur la crête, couronne brisée, une seule
  fenêtre allumée, le pin mort contre la muraille.
- **Dame des neuf mondes** — la femme au foyer de bois, de face, fil et
  quenouille, la flamme basse et son ombre démesurée sur la cloison.
- **Père des corbeaux** — son portrait était **photoréaliste**, seul de son
  espèce dans la collection. Même homme, même chapeau à large bord, même œil
  pâle, mêmes corbeaux et même bâton ; la facture seule rejoint l'huile.
- **Poigne de givre**, **Verglas**, **Embuscade**, **Défi du jarl**,
  **Appât de la meute**, **Grand Voile blanc** — les six peintures qui
  restaient à mi-chemin passent à l'huile sombre : la main de glace sur le
  guerrier, la file de boucliers prise dans la gangue, l'embuscade qui sort de
  la congère, le jarl seul sur son rocher, l'appât cerné par la meute au bord
  de la lumière, la voile immense qui casse sous le blizzard.

**Ce qui change dans le code** : la version de cache du set entier
(`peintures-definitives-v3`) disparaît au profit d'une révision **par carte**.
Une carte non repeinte ne change plus d'URL, et un futur repeint ne fera plus
changer d'URL vingt-neuf peintures pour en dater dix.

**Les dix anciennes peintures** rejoignent `public/cards/alt/` et les
illustrations alternatives (échelle d'XP pour les mythiques, boutique pour le
reste).

### Deuxième lot Souls : les figures du Nord et cinq magies (octobre 2026)

Dix cartes de plus, sous la même marque `neige-souls-cendres-v1` :

- **Eirik du premier serment** — seul sur le fjord gelé à l'aube, hache basse
  et bouclier au dos, les seams de la glace sous ses bottes.
- **Valkyrie des glaces** — la cavalière sur la banquise, l'aurore pâle derrière
  elle, lance en avant.
- **Géant des banquises** — il marche dans l'eau noire au bord de la mer prise,
  un corps de neige tassée et de vieille glace, une épave de drakkar au premier
  plan pour l'échelle.
- **Drakkar à tête de dragon** — la proue sculptée sort du brouillard, givre et
  cordages gelés, la voile sombre.
- **Scalde des runes** — la cithare contre l'épaule, la bouche ouverte sur un
  mot, une seule flamme à ses pieds dans la grande salle noire.
- **Éclair du marteau**, **Mur de boucliers**, **Festin des vaillants**,
  **Brume du fjord**, **Hurlement du blizzard** — les cinq magies passent à
  l'huile sombre et abandonnent leurs révisions dédiées (`eclair-marteau-
  electrique-cible-v1`, `mur-boucliers-charge-v1`, `brume-personnes-gelees-v2`,
  `hurlement-grizzli-gele-v1`) pour la marque commune de la passe.

### Les reprises et les deux armes (octobre 2026)

Trois cartes du lot ont été **reprises une seconde fois** après relecture :

- **Éirik du premier serment** — sa hache avait le fer monté **au milieu du
  manche** : ce n'était pas une hache. La nouvelle peinture donne une hache
  danoise à un seul fût continu, fer au bout, talon bas. Révision
  `neige-eirik-hache-v2`.
- **Éclair du marteau** — le marteau de foudre se lisait comme un **simple
  éclair**. Il a maintenant une tête carrée de fer et un manche, l'arc jaillit
  des angles. Révision `neige-eclair-marteau-v2`.
- **Hurlement du blizzard** — le grizzly prisonnier ressemblait à un **bloc de
  verre**. C'est désormais une glace de lac **fendue de partout**, dont la bête
  sort en forçant, l'épaule déjà libre. Révision `neige-hurlement-grizzli-v2`.

Et **les deux armes** ferment le set, traitées comme des reliques — l'objet
seul, aucune main, aucun porteur, aucune aurore colorée :

- **Lance de givre** — la hampe d'frêne plantée dans la glace de nuit, le fer
  feuille-de-saule givré sur les bords, le lacet de cuir à l'équilibre.
- **Hache de la banquise** — la hache plantée **lame première**, le fer coupé
  dans la glace du lac, le fût d'frêne debout vers le haut du cadre, l'éclat
  blanc en étoile autour de l'entaille. Deux essais ont été nécessaires : le
  premier enfouissait le fer sous une glace opaque et se lisait mal. Révision
  `neige-hache-fil-en-bas-v2`.

Et **Éclair du marteau** a demandé **trois reprises**. La peinture d'origine
montrait un éclair nu ; la deuxième, le marteau en vol ; la troisième, l'impact
sur un bouclier — joli, mais **superficiel**. La peinture définitive montre ce
que dit la carte : **un marteau de foudre qui s'abat du ciel sur une créature**
— la tête de fer à demi sortie de la nuée, des éclairs épais qui en dégringolent
comme un filet et viennent frapper la bête dressée sur la banquise, la glace
qui éclate sous les impacts. Révision `neige-eclair-marteau-v4`.

### Les deux dernières cartes du Serment (octobre 2026)

- **Le Grand Hiver** (`grand-hiver.jpg`) — sorcellerie Neige à 2 manas : 1 dégât
  à toutes les créatures, les deux camps compris. Peinture à l'huile dans la
  direction générale de la collection : deux bandes de guerriers du fjord
  saisis par le même mur de neige, aucun camp épargné.
- **Hache de la banquise** (`hache-de-la-banquise.jpg`) — arme Neige à 3 manas :
  sa nouvelle illustration 4:5 montre **la hache seule**, entière, avec sa lame
  givrée **plantée dans la glace**, ses entrelacs et son manche dressé au
  premier plan d'un fjord de banquise. La glace se fissure autour du point
  d'impact. Aucun porteur, aucune main et aucune autre arme ne viennent
  concurrencer l'objet. Révision dédiée `hache-plantee-glace-v2`.

## Le Corbeau des neuf nuits — Neige + Ténèbres

Le set hybride de la **Tour du Corbeau** (dossier 22) peint six cartes, toutes
au ratio exact de la face (1024×1280), dans une seule révision de cache —
`corbeau-neuf-nuits-v1` dans `rpgCardArt.js` :

- **Corbeau de givre** — un grand corbeau de nuit posé sur une pierre runique,
  le bec et les plumes pris dans le givre, la neige épaisse, l'aurore en haut
  du cadre. Le sujet se lit en vignette : l'oiseau occupe le tiers central.
- **Veilleuse au corbeau noir** — une devineresse mûre sous la neige, le
  corbeau au bras, un cordon de perles d'os dans la main. Le visage reste dans
  le tiers supérieur, comme les portraits du casting.
- **Berserk du crépuscule** — le dernier rouge du jour dans le dos d'un
  berserker de givre ; la nuit violette monte derrière lui.
- **Valkyrie des neuf nuits** — l'armure de fer sombre et le manteau de
  plumes, la lance basse, les corbeaux en spirale, la glace au sol.
- **Neige noire** — le champ de bataille figé sous une neige qui tombe à
  l'envers, la balance de pierre vide au centre, l'éclipse ourlée de violet.
  Le sort brise les petites créatures et fige les autres : les corps pris
  dans la glace et les mains encore levées disent les deux moitiés de la
  carte.
- **LE MAÎTRE DES CORBEAUX** — la figure retournée du Père des corbeaux : le
  même œil lumineux sous le chapeau, l'autre sous le bandeau, la neige noire
  mêlée à la blanche, le trône de pierres et l'arbre mort peuplé de corbeaux.

La direction reste celle de la collection — huile adulte, clair-obscur,
matière de toile —, et la Neige comme les Ténèbres n'y dessinent jamais un
badge : la lumière froide vient de la neige, la nuit du fond. Aucune image ne
porte de texte, de cadre ni d'interface.

Deux de ces six cartes portent la Furie et reçoivent donc, en plus de leur
peinture intacte, une **face de Furie** au même ratio et dans la même
composition, ensanglantée et enragée : `berserk-du-crepuscule-furie.jpg` et
`valkyrie-des-neuf-nuits-furie.jpg` (voir la dérogation Furie plus bas).

## État des sept magies reprises en plein art 4:5

Sept sorts du catalogue portaient une illustration prêtée, ou un cadrage qui
n'était pas celui de la face. Ils ont chacun leur peinture 4:5 depuis cette
passe (`public/cards/<identifiant>.jpg`) :

- **Eau de la source** — la vasque cachée sous la roche, coupe d'argile au bord
  de l'eau calme ; elle ne regarde plus la peinture du terrain Mer ;
- **Lame de mer** — la crête d'une vague effilée en lame de fond, un cotre au
  large pour l'échelle ;
- **Brisure de verre** — le voile d'eau vitrifiée saisi à l'instant où il se
  fend, éclats vers le spectateur ;
- **Parade de verre** — la muraille de sable fondu, lance et flamme prises dans
  la vitre, gardiens épaule contre épaule ;
- **Déflection** (fichier `maree-contraire.jpg`) — zoom sur le visage du
  sorcier en méditation, anneaux bleus d'ultrason qui renvoient le sort ;
- **Ressac** — le djinn noir aspiré par le tourbillon, saisi de près ;
- **Courant de retour** — le même geste vu du rivage : le courant remporte le
  djinn au large, une lanterne échouée revient seule vers le sable.

Le terrain **Mer** n'est plus partagé par aucune autre carte : la liste des
partages tolérés dans `tests/rpg-duel.test.js` est vide. Toute repeinture d'un
fichier existant se déclare dans `CARD_ART_CACHE_VERSIONS`
(`RpgDuelPage.jsx`) — sans ce `?v=`, le cache resservirait l'ancienne peinture
sous le même nom.

Chaque peinture garde son sujet propre même en vignette de 60 px. Une carte dont la peinture resterait à faire se déclare dans
`RPG_ART_PROVISOIRE` (`rpgCards.js`) : elle affiche alors le recadrage étalonné
d'une illustration voisine, et `npm run check:rpg` vérifie que la liste ne
contient que des cartes réellement livrées, image comprise. Les types, coûts, icônes et statistiques de jeu restent des éléments HTML/CSS séparés de l’illustration.


## Le Serment du Soleil rouge — Braise

Extension japonaise de quinze cartes, toutes livrées avec leur illustration
plein art 1024×1280 dans `public/cards/`, sans texte ni bordure.

**Direction spécifique du set : peinture japonaise kaiga, inspirée du nihonga.**
Cette direction concerne uniquement les quinze cartes du **Soleil rouge** :
les autres sets et leurs illustrations restent inchangés. Les Feux de kitsune
et le Cavalier des deux sabres servent de références picturales pour
harmoniser le set.

Pigments minéraux mats et palette enrichie : vermillon, indigo, turquoise,
jade, or, corail et ombres violettes. Contours à l’encre sumi avec pression
variable et grain de papier washi. Les dix illustrations de personnages et
de sorts ont été recolorées après le Cavalier ; le Sabre maudit et la Montagne
du Soleil rouge conservent encore leur palette précédente.
Composition asymétrique et profondeur picturale stylisée, gestes fluides,
visages adultes expressifs et sujets lisibles en petit aperçu. Ce rendu peint
remplace la 3D de ce set ; aucune interface, calligraphie, signature, sceau,
bordure ou marge blanche n’est intégrée aux images plein cadre.

Les scènes d’action et les identités des cartes sont conservées :

- **Ashigaru des braises** : avance au yari, deux fantassins derrière lui.
- **Rōnin du Soleil rouge** : course sur les marches brisées d’une forteresse.
- **Samouraï du torii** : chef samouraï qui expose sa stratégie sur une carte de bataille sous une tente, entouré de ses officiers ; le torii reste visible par l’ouverture. Nouvelle version d’image : `chef-samourai-strategie-sous-la-tente-v1`.
- **Onna-musha des cendres** : naginata sur un toit, avec une guerrière alliée.
- **Tengu du mont ardent** : plongeon ailé entre les montagnes.
- **Oni de la fournaise** : course sur un pont de pierre, kanabō sur l’épaule.
- **Kagutsuchi, Flamme originelle** : geste de feu en mouvement sur le sol volcanique.
- **Frappe d’iaijutsu** : pose plongeante inspirée de la référence fournie :
  buste penché vers le spectateur, tête basse, bras largement étendus et vue
  de dessus. Les jambes visibles au-dessus du dos ont été retirées ; cette
  zone laisse apparaître le lavis de forêt et de montagnes. Deux sabres dans les mains et un
  troisième tenu en bouche ; vêtements vermillon et hakama sombres, lavis de
  montagnes, arcs de frappe ocre-or. Le style kaiga est conservé, sans effets
  verts ni reprise du personnage de la référence. Cette scène remplace l’arbre
  tranché des versions précédentes.
- **Feux de kitsune** : renard de face, gueule ouverte, crachant de petites
  flammes vers le spectateur ; scène conservée, palette enrichie. Le sort
  inflige 2 dégâts à toutes les créatures adverses, puis 1 dégât supplémentaire
  au début du prochain tour du lanceur.
- **Serment de la forge** : forgeron au travail, samouraï et apprenti à ses côtés.

Trois samouraïs rejoignent le set, peints dans une direction **légendaire** : peinture kaiga
épique à l'or en feuille, encres sumi marquées, couleurs minérales vives et aura mythique. Ce
n'est pas un rendu photoréaliste.

- **Hatamoto des cendres** (commune) : silhouette sur un toit en ruine, katana qui trace un croissant
  d'or sous une lune géante, corbeaux rouges.
- **Kenshi de la forge** (rare) : forgeron-samouraï qui frappe une lame en fusion, dragon de feu qui
  s'élève des étincelles, angle plongeant.
- **Daimyō du Soleil rouge** (mythique) : daimyō sur un cheval blanc, yari levé, soleil rouge géant,
  phénix d'or et cerisiers.

Ils portent `soleil-rouge-kaiga-couleurs-v7`. Les trois ajouts sont des créatures `Samouraï` : ils reçoivent la Résonance samouraï et figurent dans la signature du deck préconstruit du Soleil rouge.

Le Daimyō a depuis sa **bannière** et ses deux **Samouraïs** : la carte devient
un 3/3 à 5 qui lève deux créatures-jetons 1/1 en arrivant (`samourai-du-daimyo`,
peinture dédiée ci-dessus) et grandit de +1/+1 chaque Samouraï de son camp qui
attaque. Sa peinture ne change pas — le daimyō au cheval blanc reste son
illustration, version `soleil-rouge-kaiga-couleurs-v7` —, et la refonte
n’ajoute aucune carte au catalogue : le jeton vit hors de `RPG_DUEL_CARDS`,
comme les chiens de sable.

Le **Kenshi de la forge** a, lui, reçu l'**aura de forge** : 1/2 au lieu de 2/4,
et « tant qu'il est en jeu, toutes vos autres créatures gagnent +1/+0, quel que
soit leur type » — l'aura ne touche jamais la défense, donc la perdre ne peut pas
tuer. Sa peinture ne change pas (le forgeron frappant une lame en fusion reste
son illustration, version `soleil-rouge-kaiga-couleurs-v7`) : il forge toutes les
autres créatures de son propre camp, sans franchir la ligne adverse.

Les peintures sont versionnées `soleil-rouge-kaiga-couleurs-v7` dans
`CARD_ART_CACHE_VERSIONS`, sauf le Samouraï du torii
(`chef-samourai-strategie-sous-la-tente-v1`), les Feux de kitsune
(`kitsune-kaiga-couleurs-v4`) et la Frappe d’iaijutsu corrigée
(`iaijutsu-kaiga-couleurs-sans-jambes-v10`). Les noms des fichiers et le plein
art 1024×1280 restent inchangés.

### Dérogation Souls — vingt-neuf cartes repeintes en huile sombre

Vingt-neuf cartes Braise sont revenues de la peinture kaiga à une **huile
sombre et réaliste**, dans l'esprit des concept arts de *Elden Ring* et *Dark Souls*
(dérogation demandée pour ce set ; les autres cartes du set gardent leur kaiga
— dont **Tojiro, le pourfendeur**, rendu à sa peinture nihonga à la demande —
et le reste du catalogue ne bouge pas).

Recette commune : **cadrage vertical 4:5, figure de pied en cap, échelle
monumentale**, palette de cendre et de suie avec une seule source chaude, huile
aux touches visibles, aucun texte ni signature :

- **Susanoo** — peint de zéro, même idée : le kami de la tempête planté sur
  un éperon de basalte, bras tendu paume ouverte vers une trombe d'eau noire
  où se tord un serpent, torii et lanterne de pierre sur une falaise
  lointaine, pluie battante et ciel de fer. Échelle colossale, robes
  détrempées.
- **Orochi** — les huit têtes sortant d'une vallée inondée, écailles trempées,
  lueur de braise dans les fissures du sol, toit de sanctuaire noyé.
- **Oni de la fournaise** — l'oni au kanabō sur l'épaule, traversant un pont
  de pierre au-dessus d'une rivière de fumée et de braises.
- **Kagutsuchi, Flamme originelle** — peint de zéro, même idée : le kami du
  feu debout sur la lèvre d'un caldeira, une flamme blanche dans la paume
  levée, un long fouet de feu qui vient lécher le basalte fissuré à ses
  pieds, cône fumant et foudre au loin. Figure de pied en cap, très grande,
  lisible en vignette.
- **Daimyō du Soleil rouge** — armure noire à kabuto cornu, cheval gris pâle,
  yari levé, soleil rouge éteint derrière les collines.
- **Tengu du mont ardent** — masque rouge lacé, cape de plumes, ailes
  déployées entre les pics, braises dans les vallées.
- **Onna-musha des cendres** — naginata traçant son cercle sur le toit brisé
  d'un donjon en feu.
- **Ifrit al-Ahmar** — minotaure de bronze noirci et de peau carbonisée,
  fissures de lave, ruines de palais en flammes.
- **Fériel** — archère en armure lamellaire, chèche indigo, mains au henné, sur
  la rampe d'une tour de guet en terre, flèche de braise encochée.
- **Anqa** — l'oiseau de feu colossal s'arrachant à une plaine de cendres,
  ailes déployées dont les pointes se consument, la poitrine ouverte sur une
  lumière blanche, vergers morts en dessous.
- **Ifrit des ergs** — silhouette de fumée noire et de sable chaud, cornue et
  démesurée, sur la crête d'une dune qui rougeoie par en dessous ; charrettes
  à demi ensablées à ses pieds.
- **Sahir des braises** — sorcier encapuchonné dans un cercle tracé dans la
  poussière, une petite flamme entre les paumes, spirales de cendre soulevées
  par le vent, arches brisées derrière lui.
- **Cavalier des deux sabres** — cavalier sans armure debout sur les étriers
  d'un cheval sombre lancé au galop, une lame dans chaque main, plaine
  d'herbes grises, pics brisés et route noyée derrière lui.
- **La Lionne du midi ardent** — guerrière en harnois noirci, heaume à tête de
  lionne et crinière de laiton terni, cape pourpre déchirée, lame basse, entre
  deux colonnes rompues sous l'immense disque rouge du soleil couchant.
- **Shogun promu** — trois chefs samouraïs penchés sur une carte de guerre sous
  la lampe d'une tente, casques et lances empilés contre la toile, un torii
  déchiré visible par l'ouverture, noir sur un ciel de fumée.
- **Kenshi de la forge** — forgeron-samouraï torse nu dans une forge ruinée,
  marteau levé sur une lame chauffée à blanc, un serpent de feu qui se tord
  dans la fumée de la cheminée, étincelles en pluie.
- **Rōnin du Soleil rouge** — rōnin en haillons et chapeau de paille brisé
  gravissant au pas de charge les escaliers d'une forteresse, sabre au clair,
  cape rouge claquant, marches éclatées et lances abandonnées sous ses bottes.
- **Hatamoto des cendres** — samouraï en armure noire sur la crête d'un toit
  effondré, de trois quarts dos, sa lame traçant un croissant d'étincelles
  dans la cendre ; lune pâle immense derrière les nuées, corbeaux.
- **Ashigaru des braises** — fantassin en armure à laçures rouges avançant
  yari en avant, visage sous un jingasa, deux autres émergeant du rideau de
  fumée derrière lui, bannière morte pendant.
- **Braisier du souk** — vieil homme accroupi sur un brasero de cuivre,
  soufflant par un long roseau dans les braises, capuche de laine brute ;
  derrière lui l'arcade obscure d'un souk, cuivres ternis et lanternes mortes.
- **Serment de la forge** — le forgeron tient une lame ardente sur l'enclume,
  le samouraï agenouillé la saisit à mains nues, l'apprenti derrière avec les
  tenailles ; halle brûlée, chaînes et outils suspendus, étincelles en suspens.
- **Armure de cendres** — haubert de plates noirci, vide et debout sur une
  plaine brûlée, la lumière d'un feu profond dans le coffre et entre les
  lames, une longue lame soudée au gantelet droit, congères de cendre.
- **Tour de Braise** — tour de guet de pierre fissurée sur une plaine brûlée,
  flammes sortant du parapet et coulant sur un flanc, meurtrières embrasées.
- **Sabre maudit** — la lame noircie à demi hors d'un fourreau de soie
  pourrie, un fil de braise dans la gouttière, une main scarifiée la tenant
  par la poignée, sur les dalles d'une salle ruinée.
- **Frappe d'iaijutsu** — l'instant du tirage, de profil : la lame jaillie du
  fourreau est tendue **horizontalement** devant lui, la coupe part droite vers
  le bord du cadre, la pluie suspendue dans son sillage. Aucun arc au-dessus de
  la tête : un iaijutsu balaie à hauteur d'épaule.
- **Feux de kitsune** — un unique feu follet immense entre deux cèdres noyés :
  une tête de renard de flamme froide, oreilles dressées, yeux creux, le corps
  se dénouant en rubans de feu pâle. La flamme est la **seule** lumière du
  tableau, le reste est noir.
- **Trait de braise** — un sorcier encapuchonné dans un souk mort, bras tendu,
  un trait d'ember en travers du cadre, les étals vides derrière lui.
- **Nuage de cendres** — un nuage de cendre brûlante descendant sur une
  muraille, le ventre du nuage éclairé de braise, deux lanciers déjà à demi
  avalés.
- **Vent rouge** — une tempête de sable rouge et d'escarbilles entre des
  falaises, une caravane morte à son pied, une silhouette pliée contre le
  vent.

Palette et lumière : **figures très sombres** (gris cendre, noir de suie,
bleu ardoise froid, braise rare), **décors dans leur couleur naturelle
assombrie** — la neige reste gris-bleu, la mer noir-vert, le désert ocre
poussiéreux. Aucune image ne porte de cadre, de marge, de texte, de
calligraphie, de signature ni de glyphe. Les vingt-neuf peintures sont livrées
**plein art 4:5** (1024×1280) sous leurs anciens noms de fichiers. Révisions
de cache (`CARD_ART_CACHE_VERSIONS`), une par lot : `braise-souls-cendres-v2`
(Susanoo, Kagutsuchi), `-v3` (Orochi, Oni, Daimyō, Tengu, Onna-musha, Fériel,
Ifrit al-Ahmar, Anqa, Ifrit des ergs, Sahir) et `-v4` (Cavalier, Lionne,
Shogun promu, Kenshi, Rōnin, Hatamoto, Ashigaru, Braisier, Serment de la
forge, Armure de cendres) et `-v5` (Tour de braise, Sabre maudit, Trait de
braise, Nuage de cendres, Vent rouge). La Frappe d'iaijutsu et les Feux de
kitsune, refaits une seconde fois, portent `-v6`.

Restent en kaiga dans le set : Tojiro, rendu à sa peinture nihonga, et la
Montagne du Soleil rouge — un terrain, hors du lot des cartes jouées.

Les idées et les sujets documentés du set sont conservés — mêmes créatures,
mêmes scènes, même esprit ; seule la facture change. Susanoo et Kagutsuchi ont
été **repeints de zéro** (composition neuve, sans référence à l'ancienne
carte) et portent à ce titre la révision `braise-souls-cendres-v2`.

### Les illustrations alternatives

Une peinture remplacée n'est pas jetée : elle devient une **illustration
alternative**, montrée dans le **Catalogue**, à côté de la fiche de la carte
qu'elle double (`rpgCardArtAlternatives.js`). Elle a **deux sources**.

**1. L'échelle d'XP — une illustration tous les quatre niveaux.** Les cartes
**mythiques** d'abord, celles qui font plaisir à voir tomber : niveaux 4, 8,
12… jusqu'au **plafond 60**, ce qui fait quinze paliers. Le déblocage se
**calcule** depuis le niveau courant, il ne se stocke pas : rien ne se perd sur
un appareil qui revient en arrière, et rien ne se paie deux fois. L'écran dit
« **Gagnez cette carte en montant au niveau N** ».

**2. La boutique — le reste, au prix de la rareté de la carte doublée.**

| Rareté de la carte | Prix |
| --- | --- |
| Commune | 80 ◈ |
| Inhabituelle | 140 ◈ |
| Rare | 240 ◈ |
| Mythique | 400 ◈ |

Repères : un paquet du Souk coûte 140 ◈, un étage déblayé rapporte 50, un duel
libre 8. L'achat se fait dans la **fiche du catalogue**, sur la vitrine de
l'illustration — un bouton, une fois ; le solde court s'écrit sous le bouton
(« Il manque N ◈ »), jamais par une alerte. Les achats vivent dans le
portefeuille (`illustrations.achetees`), se fusionnent en union entre deux
appareils, et ne redescendent jamais.

**La peinture achetée ou gagnée peut habiller la carte elle-même** : un bouton
dans la vitrine bascule entre la peinture de la passe Souls et l'alternative
(`illustrations.affichees`, lu par `cardArt`). C'est ce qui donne au catalogue
son intérêt de jeu, et non de simple galerie.

- **Les fichiers** vivent dans `public/cards/alt/<carteId>.jpg`, livrés en
  **plein art 4:5** (1024×1280) comme les faces — les anciennes peintures en
  `928×1152` ou `1408×1760` ont été recadrées puis ramenées au ratio. Le nom
  du fichier ne bouge plus : une alternative est archivée une fois pour toutes.
- **Elles s'affichent quand on les gagne** : l'écran de fin de duel compare le
  niveau d'avant la partie à celui d'après et montre, sous la barre d'XP, les
  vignettes des illustrations tombées pendant le duel — avec leur nom et la
  carte qu'elles doublent.
- **À l'écran** : une illustration d'échelle non gagnée est une tuile qui
  n'annonce que son niveau et **ne charge aucune image** — une récompense ne se
  devine pas. Celle de la boutique, elle, montre ce qu'elle vend, prix compris.
  L'en-tête du Catalogue compte séparément l'échelle et la boutique
  (« l'échelle 3 / 15, la boutique 7 / 62 »).

Le lot actuel archive **soixante-dix-sept** peintures : les vingt-neuf de
Braise, les quarante-sept du Sable et l'ancien art de la Tour oubliée.

Les sujets humains s’inspirent des guerriers du Japon ; les tengu, oni,
kitsune et Kagutsuchi relèvent de sa mythologie et ne sont pas présentés
comme des figures historiques. Le deck utilise les Montagnes et les Crêtes
de cendre existantes ; il n’ajoute pas de terrain sans illustration dédiée.


### Résonance samouraï

Le Samouraï du torii et le Tengu portent **Résonance samouraï** ; Kagutsuchi n’en porte plus. Chaque source donne
+1/+1 uniquement aux créatures dont la ligne de type indique **Samouraï**, dans
les deux camps et quelle que soit leur couleur. La couleur Braise et le nom
d’une carte ne suffisent pas. Ni les yōkai, ni les kami, ni les autres types
ne bénéficient du bonus. Les types imprimés existants restent inchangés.
La Résonance Neige et le Harakiri gardent leurs règles. Les illustrations ne sont
pas modifiées par cet ajustement de mécanique.


### Sabre maudit et Montagne du Soleil rouge

Deux nouvelles cartes peintes en kaiga / nihonga complètent le set :

- **Sabre maudit** : lame sombre à fil argenté, garde ouvragée bronze et or,
  poignée tressée rouge-noir ; un bras la tient et se corrompt de veines
  d’encre noire et d’ombres violettes. Le décor est une terrasse de palais
  délabrée sous la pleine lune, avec panneaux shoji brisés et mer lointaine.
  Version d’image : `sabre-maudit-kaiga-palais-v1`.
- **Montagne du Soleil rouge** : montagne volcanique, soleil vermillon,
  nuages en lavis, pins et érables encadrant un chemin de sanctuaire.
  Version d’image : `montagne-kaiga-soleil-rouge-v1`.

La nouvelle montagne est une variante commune de Montagne : même mana Braise,
mais une peinture autonome. Elle remplace huit Montagnes uniquement dans le
préconstruit Soleil rouge ; les anciens terrains ne sont pas repeints.
Le Sabre maudit est une arme rare à 4 mana, attachée à une créature alliée via
le ciblage des magies : +5/-2 et une Attaque ciblée permanente tant que le porteur
reste en jeu. Il quitte le jeu avec lui (mort ou renvoi en main), au cimetière.
Deux sabres remplacent un exemplaire de Frappe d’iaijutsu et un des Feux de
kitsune : le deck reste à quarante cartes et seize terrains. Le terrain est
possédé dès le départ ; le sabre se gagne à `sables-2`.


### Cavalier des deux sabres — mythique

Samouraï **sans armure**, en kimono et hakama, un katana dans chaque main,
sur un cheval galopant à travers un champ de blé vers le spectateur.
Palette enrichie : blés dorés, ciel turquoise, nuages corail, végétation jade
et vêtements vermillon et indigo.
Peinture kaiga / nihonga plein art 1024×1280, harmonisée avec le Soleil rouge,
sans texte ni cadre ; version `cavalier-deux-sabres-kaiga-champ-ble-v2`.

Créature mythique Braise de type Samouraï : coût 6, force/défense 5/4,
Rapidité et Harakiri 3. Elle bénéficie de Résonance samouraï. Un exemplaire
remplace un Tengu dans le deck préconstruit, qui garde ses 40 cartes et ses
16 terrains. La carte se débloque à `sables-3`.


### Orochi et Petit Orochi

Orochi rejoint Soleil rouge : créature légendaire mythique Braise, Serpent,
coût 8, force/défense 8/8. À sa mort, son contrôleur crée sur son champ de
bataille deux créatures-jetons « Petit Orochi » 4/4. Orochi ne possède pas Harakiri, par exception à la règle de rareté du set. Les petits n’ont ni Harakiri, ni
Rapidité, ni effet de mort ; ils ne sont pas Samouraïs. Un renvoi en main
d’Orochi ne crée pas de jetons, et un Petit Orochi renvoyé cesse d’exister.

Deux illustrations kaiga colorées dédiées, plein art 1024×1280 :
`orochi.jpg` (serpent mythologique menaçant à plusieurs têtes, écailles
vert émeraude et jade, accents vermillon, ciel et brume rouge sombre) et
`petit-orochi.jpg` (jeune serpent dans un ruisseau). Versions de cache
`orochi-kaiga-vert-rouge-v2` et `petit-orochi-kaiga-couleurs-v1`.
Le jeton est consultable par le moteur mais absent des decks et de la collection.
Orochi se débloque à `sables-3`. Un exemplaire remplace une Onna-musha dans le
préconstruit, qui conserve 40 cartes, 17 créatures, 7 magies et 16 terrains.


### Susanoo — mythique

Créature légendaire Braise — Kami · Tempête, coût 6, force/défense 5/3,
Harakiri 1. À son arrivée, son contrôleur choisit une créature de coût 5 ou
plus de l’un ou l’autre camp et la retire de la partie. L’exil n’est pas une
mort : ni Harakiri, ni création de jetons, ni retour programmé ne se déclenchent.
La cible ne rejoint ni la main ni le cimetière ; les armes attachées sont
mises au cimetière et les auras de la créature quittant le jeu disparaissent.
La protection et le contresort de Boualem s’appliquent aux capacités ciblées.
Sans créature ciblable déjà présente, Susanoo peut être posé sans cible.

Le joueur désigne la cible dans l’interface ; l’IA privilégie une menace
adverse. Illustration kaiga colorée dédiée `susanoo.jpg`, 1024×1280,
version `susanoo-kaiga-couleurs-v1` : kami des tempêtes au katana sur une
côte balayée par un vortex. Un exemplaire remplace une Onna-musha dans le
deck Soleil rouge : toujours 40 cartes, 17 créatures, 7 magies et 16 terrains.
Susanoo se débloque à `sables-3`.

## Dérogation : deux armes et le serpent en photoréaliste (octobre 2026)

Trois armes du prototype (`takouba-des-pistes`, `lance-de-givre`,
`hache-de-la-banquise`) et le jeton
`serpent-des-citernes` dérogent **volontairement** à la direction
« huile sur toile » ci-dessus :
elles sont livrées en **rendu photoréaliste fantaisiste** (photo de cinéma,
live-action), direction validée carte par carte au moment de leur création.
Le reste de la collection reste en huile ; une éventuelle conversion globale
n'est pas décidée.

Règles de tir propres à ces cartes (vérifiées visuellement une à une) :

- un **porteur** tient l'arme, cadrage sur l'arme, pose **en pleine
  action/attaque** ;
- l'arme est **entièrement dans le cadre, pointe → pommeau**, avec une marge
  d'espace libre à chaque extrémité — aucun bord ne rogne l'arme ni les
  sujets ; les plans larges y arrivent mieux que les gros plans ;
- aucun texte, glyphe, logo ni interface dessinée.

- **Serpent des citernes** (`serpent-des-citernes.jpg`) — le jeton évoqué
  par le Bâton : serpent verdâtre dressé dans la citerne moussue.

### Le Maître du marteau à la taverne (octobre 2026)

Sa peinture de bataille est remplacée par une **scène de taverne** : le colosse
roux attablé dans une halle de nuit, renversé en arrière, riant à pleine
gueule, une **chope de bois cerclée de fer, grosse comme sa tête**, la mousse
qui déborde sur son poignet et dans sa barbe. Une deuxième chope et une corne
renversée sur la table, un plat d'os, le feu pour seule lumière, et son marteau
appuyé contre le banc, hors du chemin.

Sa **face de Furie garde, elle, sa peinture de bataille** — le colosse debout
sur son rocher, marteau levé, crâne fendu et foudre froide courant sur
l'avant-bras (révision `neige-furie-souls-v1`) : c'est le moment où le tavernier
cesse de rire, et la table n'a plus rien à y faire.

Révision de la carte de base : `neige-maitre-tavern-v1`. L'ancienne peinture de
bataille est archivée en `avant-tavern-maitre-du-marteau.jpg`.

## Passe Souls de l'Eau — premier lot (octobre 2026)

L'Eau garde son caractère : pas de désert, mais des citernes, des canaux, des
ports et des nuits de mer. Les dix premières cartes passent à l'huile sombre
sous la marque `eau-souls-cendres-v1`.

- **Yamina** et **Boualem**, les deux héros du récit, gardent **leur
  identité** — même visage, même âge, même coiffe, mêmes vêtements et mêmes
  objets — mais changent de scène et de facture : Yamina au bord d'une
  **citerne obscure**, la main sur la margelle, sa chienne à ses côtés ;
  Boualem sur les marches d'une **porte d'eau** à la lanterne. Tout l'aplat
  doré et les cadrans du Souk disparaissent : c'est peint, plus imprimé.
- **Bâton des citernes** — le bâton d'ornement art nouveau devient un **anneau
  de pierre sur une hampe de cuivre vert-de-gris**, planté dans l'eau noire.
- **Porteuse de cruches** — plus de rue de souk ensoleillée : elle monte une
  ruelle aveugle au crépuscule, deux cruches au joug.
- **Pilote de la carreira** — sa cabine passe à la nuit, la carte marine
  réduite à des traits et des sondes, la chandelle pour seule lumière.
- **Source de Bimini** — la grotte turquoise devient une **vasque noire**
  frappée par une seule fente de jour.
- **Le Routier** — le parchemin sépia devient un **garde de chaussée noyée**,
  lanterne et bâton, la route qui s'en va sous l'eau.
- **Haut-fond**, **Lame de mer** et **Eau de la source** — l'épave au crépuscule,
  la vague de nuit, le puits ruiné.

### Le bleu de l'Eau : une marque de set, pas un détail

Peint dans la palette commune — gris de cendre et ardoise froide — le premier
lot de l'Eau se confondait avec la **Neige** au premier regard. Les deux sets
sont pourtant voisins dans la barre d'XP et dans les boosters : une carte doit
se reconnaître à trois mètres. L'Eau reçoit donc, dans la peinture elle-même,
un **virage au bleu de nuit** : les ombres et l'eau se décalent vers un bleu
profond, le contraste monte un peu, et les seules chaleurs qui restent sont les
lampes et les visages.

| Réglage | Valeur |
| --- | --- |
| Rouge | × 0,82 |
| Vert | × 0,96 |
| Bleu | × 1,36 |
| Saturation | × 1,18 |

C'est une **règle du set**, appliquée dès la peinture pour toute la suite
(marque `eau-souls-bleue-v1`), et pas un filtre de navigateur : l'image livrée
est déjà bleue, en duel comme en vignette.

### Deuxième lot : les bêtes et les gardiens

- **Léviathan** — la tête et un tronçon de dos seulement, le reste sous l'eau
  noire : on ne le voit jamais en entier, comme le dit sa saveur.
- **Bakunawa** — le serpent dressé contre la pleine lune, gueule ouverte sur
  elle, la lune pour seule lumière.
- **Jörmungandr** — vu d'une falaise, son corps barre tout l'horizon et
  s'enfonce aux deux bouts.
- **Le Seigneur des mâchoires** — le crocodile de la crue, à demi hissé sur la
  berge noyée, une lanterne de village pour seule note chaude.
- **La Vipère de verre** — le serpent de verre sur la margelle d'une citerne,
  ses reflets froids jetés sur la pierre.
- **La Tour des flots** — la tour seule en mer, démâtée, le ressac qui monte
  plus haut qu'elle. Elle était peinte **en paysage** (1376 × 768) : c'est la
  première carte du catalogue recomposée en portrait.
- **Le Sonneur fêlé** — le vieil homme à la corde dans le clocher noyé, sa
  cloche fendue au-dessus de lui.
- **La Veilleuse des citernes** — la gardienne au trousseau de clés, lanterne
  et courte lance, sur la margelle.
- **Le Silence d'écume** — l'écume refermée sur le sort comme une main, le
  visage du sorcier à peine lisible derrière.

**Le Kraken** reste pour le dernier lot : la première peinture rendait un
**serpent** — pas un tentacule. Il sera repris avec le bras seul, sans tête.

### Troisième lot : le verre et le ressac — le set est clos

- **Le Kraken** refait : un **seul bras**, épais comme un mât, anneaux de
  ventouses, enroulé au grand mât d'un navire en perdition. **Aucune tête,
  aucun œil** — c'est le membre qui est terrible, pas la face.
- **La Parade de verre** — la plaque de verre épais montée dans l'air devant
  un combattant, la lame enfoncée dedans et arrêtée net.
- **La Brisure de verre** — le mur de verre qui éclate vers le spectateur, les
  silhouettes cuirassées hachées derrière.
- **L'Écueil** — les dents de roche noire dans la houle, l'étrave déjà trop
  près au bord du cadre.
- **Le Contresort des abîmes** — le sort qui coule, repris au fond par une
  main trop longue.
- **La Marée contraire** — la mer qui recule contre elle-même, le sorcier
  assis qui écoute.
- **Le Ressac** — le chevalier pris par l'eau qui se retire, son épée plantée
  dans le sable.
- **Le Courant de retour** — le chenal noir ouvert dans le ressac, la barque
  déjà emportée.

### L'Eau est close : 27 cartes sur 27

Même contrôle que pour la Neige : aucune carte de l'élément Eau ne garde son
ancienne peinture. Les deux seules entrées Eau sans tableau sont des **jetons**
(`serpent-des-citernes`, `marée-des-abysses`), qui n'ont jamais eu d'image de
carte.

Les dix-huit anciennes peintures rejoignent `public/cards/alt/` : **cent
vingt-six illustrations alternatives**, dont quinze à l'échelle et cent onze en
boutique.

### Bilan du catalogue

| Élément | Cartes | Dans l'huile sombre | Reste |
| --- | --- | --- | --- |
| Sable | 47 | 47 | — |
| Neige | 29 | 29 | — |
| Eau | 27 | 27 | — |
| Braise | 32 | 32 | — |
| Ténèbres | 29 | 6 (le Corbeau des neuf nuits) | **22** |

**Braise était déjà faite** : la dérogation Souls de dix-huit cartes de ce
document (vingt-neuf au total avec les reprises) a couvert tout le set en 2025
et 2026, sous les révisions `braise-souls-cendres-v2` à `-v6`. La seule carte
du set qui n'est pas à l'huile est **Tojiro, le pourfendeur**, rendu à sa
peinture nihonga à la demande ; la **Montagne du Soleil rouge** est un terrain,
hors du lot des cartes jouées.

> **Ne pas se fier aux seuls noms de révision.** Un comptage rapide des marques
> contenant `souls` donnait « Braise : 0/32 » — faux : plusieurs cartes portent
> une révision d'un autre nom (`pirates-v1`, `kaiga-couleurs`, `nihonga`) et
> quelques-unes ont été peintes **avant** que la convention de cache existe,
> donc sans clé du tout. Le seul état fiable est visuel, ou celui de ce
> document.

**Cent trente-cinq cartes** sont désormais dans la même huile sombre, chacune
avec son ancienne peinture conservée en alternative. Le dernier set encore dans
l'ancien registre est **Ténèbres** — l'Égypte de la balance : or, violet et
lumière de musée, à reprendre en os, suie et or terni.

## Passe des Ténèbres — l'Égypte de la balance (octobre 2026)

Dernier set resté dans l'ancien registre : **or massif, violet et lumière de
musée**. Vingt-huit cartes jouables, dont vingt-deux à reprendre — les six
autres sont le **Corbeau des neuf nuits**, déjà fait.

### La palette du set

L'or et le violet étaient le problème : à côté des quatre autres sets, taillés
en cendre, les cartes Ténèbres ressemblaient à des vitrines. Le set garde son
sujet — les rites funéraires, la pesée du cœur, les serviteurs du seuil — et
change de matière :

- **Os et suie** : le blanc devient ivoire mort, le fond devient noir de four.
- **Or terni** : l'or ne brille plus, il est piqué, rayé, presque du bronze.
- **Violet → bleu de nuit** : le violet d'origine bascule vers un bleu froid
  (rouge × 0,98, vert × 1,00, bleu × 1,09, saturation × 0,96). Assez pour
  refroidir, pas assez pour confondre le set avec l'Eau.
- **Une seule source** : une lampe à huile, une fente de jour, jamais deux.

### Premier lot : l'atelier et les serviteurs

Marque `tenebres-os-cendres-v1`.

- **Khopesh d'or** — l'épée faucille plantée pointe en bas dans une dalle
  d'offrande, lame d'or ternie et piquée, une seule lumière de côté.
- **Chacal du seuil** — l'animal maigre sur la pierre du seuil, le passage
  derrière lui n'est plus qu'un vide.
- **Ouvrier du natron** — l'homme du sel à genoux devant son auge, les avant-
  bras blancs, la lampe au sol pour seule lumière.
- **Gardienne de la balance** — la gardienne debout dans la salle noire, lame
  courte et linge plié, un seul brasero de bronze.
- **Scribe des feuillets** — le vieux scribe assis par terre, le papyrus
  **vierge**, la lampe sur sa planche.
- **Prêtre de la bouche** — le prêtre à l'herminette devant la statue usée
  jusqu'à l'effacement, murs nus.
- **Uræus du seuil** — le cobra dressé sur la dalle, sans couronne ni joyau.

**Aucun hiéroglyphe nulle part** : les murs sont de la pierre nue. C'est une
règle du set, et elle vaut aussi pour les cartes à venir — les signes gravés
étaient précisément ce qui donnait aux anciennes peintures leur air de musée.

**Deux refus de modération** ont coûté des essais : le corps enseveli de
l'ouvrier et la bouche de la statue ont été reformulés (bundle de lin fermé,
statue sans visage). La **Momie de lin** a été refusée deux fois et sera
reprise autrement — sans forme humaine lisible, un linceul debout.

Les sept anciennes peintures rejoignent `public/cards/alt/` : **cent
trente-trois illustrations alternatives**.

## La passe des Furies (octobre 2026)

Les faces de Furie — l'état déclenché d'une créature blessée — étaient restées
en arrière : quatre humains en **photoréaliste fantaisiste**, un loup et une
valkyrie dans une huile d'une autre époque. La passe Souls du Neige les
ramène toutes à l'huile sombre de la collection.

**La règle tient** : une face de Furie n'est pas une seconde composition. Même
personnage, même pose, même cadrage, même décor — seulement marqué par le
combat : sang, armure ou casque brisé, cape ou pelisse déchirée, visage passé
en furie. Une paire qui jurerait de facture serait pire qu'une paire
ancienne : c'est pourquoi la face **intacte** des quatre humains est repeinte
en même temps que sa furie.

| Carte | Face intacte | Face de Furie |
| --- | --- | --- |
| Berserk des trois hivers | `neige-souls-cendres-v1` — debout, calme, aucun sang | `neige-furie-souls-v1` — gueule ouverte, torse et hache en sang |
| Maître du marteau | `neige-souls-cendres-v1` — marteau bas, gantelets intacts | `neige-furie-souls-v1` — marteau levé, crâne fendu, foudre froide |
| Loup des neiges | inchangée (la passe du set) | `neige-furie-loup-v1` — épaule et patte ouvertes, babines retroussées |
| Valkyrie au corbeau | inchangée | `neige-furie-valkyrie-v1` — plongeon, heaume brisé, corbeau au poing |

Les anciennes peintures sont archivées dans `public/cards/alt/` sous le
préfixe `avant-souls-` : rien ne se jette.

**Le lot est clos.** Le **Jarl au marteau de guerre** a été repris deux fois :
son arme se lisait comme une hache — c'est maintenant un **bloc de fer carré au
bout d'un manche**, face plate et courte pointe au dos, tenu bas sur la face
intacte et levé, ensanglanté, sur la furie. Le **Guerrier au bouclier rond**
garde son bouclier de fer goudronné sur sa furie, sans le motif vert et blanc.
Et les **deux furies du Corbeau des neuf nuits** — Berserk du crépuscule,
Valkyrie des neuf nuits — sont repeintes dans l'huile sombre, même grève, même
aurore, même spirale de corbeaux (`corbeau-furie-souls-v1`).

Les sept faces de Furie du catalogue sont désormais toutes dans la même
facture.

## Dérogation : les quatre porteurs humains de Furie en photoréaliste (octobre 2026)

Les quatre cartes humaines Neige qui portent le mot-clé **Furie** — **Guerrier au
bouclier rond**, **Berserk des trois hivers**, **Jarl au marteau de guerre** et
**Maître du marteau** — dérogent elles aussi à l’huile de la collection :
elles sont livrées en **photoréaliste fantaisiste**. Chacune possède deux
pleins arts 1024×1280, sans texte, logo, cadre ni interface dessinée :
`<identifiant>.jpg` pour la créature intacte et `<identifiant>-furie.jpg`
pour son état déclenché.

La version Furie n’est pas une seconde composition : elle reprend **la même
image** — même pose, même cadrage, même arrière-plan — seulement marquée par
le combat : sang, dégâts de bataille, armure ou casque partiellement brisé
lorsque la face intacte en porte un, équipement, pelisse ou cape déchirés
dans le cas contraire, et visage passé en furie. Le **Berserk des trois
hivers** fait exception pour sa seule face intacte : debout et calme avant
le combat, hache propre tenue basse, il ne porte **aucune trace de sang** ;
son double Furie conserve la charge ensanglantée, avec strictement le même
visage, le même rendu photoréaliste et la même peau de loup. Sept fichiers
portent la révision commune `furie-photorealiste-v1` ; cette face de base
repeinte porte sa révision dédiée `berserk-meme-visage-sans-sang-v1`.

Le **Loup des neiges**, cinquième porteur de Furie, ne suit pas cette
dérogation : sa face intacte reste l’huile d’origine et son état Furie la
reprend trait pour trait — même meute au couchant, même cadrage — avec le
chef de meute ensanglanté, blessé à l’épaule et à la patte, babines retroussées
(`loup-des-neiges-furie.jpg`, 1024×1280, révision `loup-furie-huile-v1`).

La **Valkyrie au corbeau**, désormais dotée de **Furie 2**, possède aussi une
peinture alternative (`valkyrie-au-corbeau-furie.jpg`, 1024×1280, révision
`valkyrie-vol-plongeon-enragee-v4`) qui repart de sa face intacte : même
Valkyrie, même heaume ailé, même corbeau noir, même bouclier et même champ de
bataille. Elle vole maintenant haut dans le ciel et fond sur sa cible dans un
plongeon enragé, jambes repliées par l’élan, cape et tresses balayées par la
vitesse. Elle brandit son épée ensanglantée, le visage couvert de sang, tandis
que son corbeau noir descend en vol à ses côtés ; le champ de bataille reste
lointain sous les nuages. Sa face intacte et l’appel de Viking ne changent pas.

Le **Corbeau des neuf nuits** fournit enfin les deux derniers doubles de Furie
du catalogue, sur le même principe : même composition que la peinture intacte,
seulement marquée par le combat, au format exact 1024×1280 et sous une
révision dédiée à chacune.

- **Berserk du crépuscule** (`berserk-du-crepuscule-furie.jpg`, révision
  `corbeau-furie-crepuscule-v1`) — le même berserker sur la grève, face au
  dernier rouge du jour ; le visage est passé en furie, la peau de loup
  déchirée et souillée, le torse et les bras couverts de sang, le bouclier
  rond fendu sur son bord et la hache noircie de gore. Le ciel violet, les
  montagnes et les corbeaux restent identiques.
- **Valkyrie des neuf nuits** (`valkyrie-des-neuf-nuits-furie.jpg`, révision
  `corbeau-furie-neuf-nuits-v1`) — la même Valkyrie sur la glace, sous la même
  aurore ; elle hurle, le visage et l’armure de fer sanglants, une épaulière
  brisée, le manteau de plumes arraché par endroits, la lance dressée d’une
  main plus ferme et le bouclier au corbeau éclaboussé. La neige, la spirale
  de corbeaux et les pins enneigés ne bougent pas.

En jeu, tant que la Furie est active, la peinture alternative pleine page
s’affiche sans cadre, sur la table comme dans la preview ; une **vignette
rouge animée** serre alors les bords de la face des deux côtés (elle devient
statique si les mouvements réduits sont demandés). Quand l’état retombe, la
face intacte et son cadre reviennent. Les faces intactes rejoignent le
garde-fou `PLEIN_ART_45`, et `check:rpg-furie-preview` mesure les fichiers
des huit porteurs — dont les deux du Corbeau — tout en rendant les deux
états.

## Passe Souls du Sable — quarante-huit cartes (octobre 2026)

Tout le **Sable** quittent leur peinture chaude et dorée pour l'huile
sombre de la dérogation Souls du Soleil rouge : mêmes sujets, mêmes scènes,
palette de cendre, d'ocre poussiéreux et de mer noire, une seule source chaude
par image, cadrage vertical 4:5, figure ou sujet monumental.

- **Le Faucon du zénith** — faucon colossal aux plumes de bronze brûlé perché
  sur le bras brisé d'une tour : un œil de midi blanc, l'autre creux et mort.
- **La Dame aux ailes d'or** — reine voilée sur un trône de pierre, ailes de
  laiton terni refermées derrière elle comme un reliquaire, salle ruinée noyée
  d'ombre, un rai de poussière sur les ailes seules.
- **Dune marchante** — la dune elle-même dressée en vague, l'épaule d'un corps
  sans visage dedans, la porte d'un fort à demi ensablée à son pied.
- **Djinn de foudre** — silhouette de nuage noir et de sable cornue, le bras
  lançant un éclair blanc dans la dune.
- **Fennec des décombres** — le petit renard aux oreilles immenses sous une
  arche effondrée, à la lune, une patte levée ; tout le reste est noir.
- **Tour de Sable** — tour de guet de sable et de pierre, le grain qui coule
  des meurtrières, le parapet vitrifié par la foudre, une bannière morte au
  pied.
- **Tislit des Aurès** — éclaireuse amazighe encapuchonnée sur un éperon
  au-dessus des cèdres noirs, arc court à la main.
- **Cavalier amazigh du Désert** — cavalier au litham indigo lancé dans la
  tempête de poussière sur une monture blanche, sabre bas.
- **Amayas du Hoggar** — guide touareg de nuit entre les pitons de basalte,
  une lanterne basse qui n'éclaire que ses pieds.
- **Faussoyeur des dunes** — silhouette de pilleur à demi enterrée qui creuse
  à deux mains dans le sable noir, un couvercle de cercueil exhumé derrière
  elle.

### Le set pirate

Dix cartes de la mer passent dans la même passe : les ciels dorés et l'eau
bleue deviennent des mers noires, du goudron et de la brume froide.

- **La Barbe-Rousse** — l'amiral corsaire en turban et cotte de mailles sur le
  pont d'une galère en pleine tempête, la ville blanche en flammes au loin.
- **La Barbe Noire** — la barbe qui fume et brûle, et le second visage qui se
  devine dans la fumée derrière l'épaule.
- **Le Chasseur d'Ocracoke** — seul dans une barque, long fusil sur l'avant-bras,
  lanterne au ceinturon, l'épave affleurant la brume.
- **La légende du Hollandais volant** — le galion fantôme, voiles en lambeaux
  qui ne prennent pas le vent, lueur verte froide aux sabords.
- **Galion de la flotte** — le trois-ponts talonné par la tempête, une seule
  lanterne à la poupe.
- **Cotre de course** — les deux voiles latines pleines, la coque qui ouvre une
  cicatrice blanche dans l'eau noire.
- **Le Renégat** — le corsaire immobile sur le môle sous la pluie, un fanal
  pour toute lumière.
- **Négociant des prises** — l'homme de rançons à sa table de registres, la
  lampe n'éclairant que ses mains.
- **Mousse des galiotes** — le mousse arc-bouté sur un cordage, le visage
  tourné vers le grain, sans une once de lumière chaude.
- **Raïs de la galiote** — le raïs à la barre, la lanterne qui se balance et la
  voile noire gonflée au-dessus de lui.

### Les figures du désert et trois magies

- **Tiziri du Djurdjura** — la chanteuse seule sur une crête nue, le chant
  ouvert, les cèdres noirs pliés d'un même côté, les lumières des villages
  appelés tout en bas.
- **Amani des ksour** — la gardienne dans la porte du ksar au crépuscule, la
  main à plat sur le chambranle, une seule fenêtre allumée dans la muraille.
- **Guetteur du beffroi** — la vigie de dos sur le parapet d'un fort de mer,
  la lanterne à ses pieds, la ligne d'écume qui se forme au large.
- **Scribe de la Liste** — le vieux scribe courbé sur un registre immense, la
  chandelle pour seule lumière, les rayonnages qui montent dans le noir.
- **Faiseur de passage** — l'éclaireur accroupi contre une muraille aveugle,
  la paume posée là où une fente de lumière froide vient de s'ouvrir.
- **Le Trésor de Lima** — la salle basse effondrée : or terni et chaînes
  contre la paroi, des bottes mortes debout dans le sable, un seul rai de jour.
- **Tercio de cuivre** — le bloc de soldats aux boucliers de cuivre sur un pont
  de navire, les piques au-dessus, la voile déchirée et la mer de brume.
- **Tempête de sable** — le mur de poussière qui tombe entre les falaises, les
  bêtes et les hommes roulés dedans, la caravane minuscule en dessous.
- **Rempart de dunes** — le sable dressé en rempart devant une porte de pierre,
  une seule lampe allumée derrière.
- **Réanimation** — une main et un avant-bras de squelette hors du sable, liés
  de lin pourri, la dune déjà en train de se fendre autour.

### Les héros du désert et les premiers équipements

**Les trois héros du désert entrent dans la passe**, avec une contrainte : leur
**identité ne change pas** (même visage, même âge, même teint, même coiffure,
même tenue et mêmes accessoires) — mêmes fiches, nouveaux décors et nouvelle
facture.

- **Salem** — au haut d'un escalier de medersa en ruine, la nuit, bâton planté,
  la main traçant un cercle ; arches brisées et sable sur les dalles.
- **Tarek** — il monte une dune noire, le coffre sur l'épaule, l'autre bras
  lancé en avant, une piste morte derrière lui.
- **Tin Hinan** — seule sur un éperon, robes et voile tirés par le vent,
  l'erg immense en dessous, une dernière bande de jour à l'horizon.

Et dix cartes de plus : **chien-du-guet** (la chienne maigre sur les marches,
la lampe au fond du passage), **grappin-d'abordage**, **takouba-des-pistes**,
**sandales-de-tislit**, **cuirasse-de-sel**, **javelot-du-beffroi**,
**licou-du-chien-de-sable** — six natures mortes traitées comme des reliques,
une seule source froide par image.

**Le set est clos.** Les huit dernières cartes sont peintes : le harnais du
mehari, le masque du guetteur, la jitte d'Amayas, la lame des ergs, la takouba
de Tin Hinan, la lettre de marque, le grand débarquement et le rapport du
greffier. Les magies sont traitées comme des natures mortes : le parchemin de
la lettre de marque est retourné face contre table — cire brisée, cachet,
chandelle —, et le grand débarquement est la seule scène de foule de la passe,
éclairée par l'incendie de la ville haute.

**Ce qui reste hors de la passe** : Yamina, Boualem et Fériel gardent leur
peinture nihonga algérienne documentée plus bas.

Révision de cache `sable-souls-cendres-v1` pour les quarante-huit cartes. Leurs
anciennes peintures rejoignent les illustrations alternatives
(`public/cards/alt/`), qui passent à cinquante-neuf entrées et remplissent la
courbe jusqu'au niveau 60. **Les cinq héros du récit (Salem, Tarek, Yamina,
Fériel, Boualem) gardent leur peinture nihonga algérienne** : elle est
documentée plus bas et n'entre pas dans cette passe.

## Dérogation : les équipements du Sable en nihonga coloré (octobre 2026)

Les dix cartes du **lot d'équipements du Sable** (`docs/rpg/14-equipements-du-sable.md`)
dérogent **volontairement** à la direction « huile sur toile » comme à la
dérogation photoréaliste des quatre armes du prototype : elles sont livrées en
**nihonga coloré** — la peinture japonaise (contours de sumi, pigments
minéraux, passages de feuille d'or, papier washi) — **trempée dans une palette
algérienne saturée** : indigo du tagelmust, ocre safran, rouge henné, turquoise
des ksour, or du sable. Le Japon fournit la matière picturale, l'Algérie la
lumière et les couleurs ; le reste de la collection reste en huile.

Règles de tir propres à ces dix cartes :

- **l'équipement seul, rien d'autre** : ni porteur, ni animal, ni main, ni
  silhouette. C'est l'objet qui est la carte — posé, planté ou pendu sur un
  support sobre (dalle de grès, seuil de pierre, piquet de bois, monticule de
  sable), jamais porté ;
- l'objet est **entièrement dans le cadre**, d'une extrémité à l'autre, avec de
  l'espace libre autour de lui ;
- **composition centrée pour un cadre 4:5**, fond sobre — washi or de sable,
  lavis d'indigo en haut du ciel — pour que la peinture se recadre au ratio de
  la face sans rien rogner ;
- **plein bord à bord** : aucun cadre, liseré, filet, marge ornementale ni
  vignettage — la peinture court jusqu'aux quatre bords, comme pour le reste de
  la collection ;
- aucun texte, glyphe, logo ni interface dessinée ;
- plein art vertical, livré au ratio exact de la face (1024×1280).

| Carte | L'objet peint |
|---|---|
| Sandales de Tislit | la paire de sandales de cuir posée sur le seuil de pierre d'une maison du ksar, porte entrouverte |
| Cuirasse de sel | la cuirasse de cuir incrustée de sel, dressée sur un support de bois sombre |
| Javelot du beffroi | le javelot planté en biais dans un monticule de sable |
| Licou du chien de sable | le collier et le harnais tressés posés à plat sur une dalle de grès |
| Boussole du Hoggar | la boussole de laiton ouverte, posée à plat sur un rocher |
| Harnais du méhari | le harnais de méhari pendu à un piquet de bois, glands rouges et disques de laiton |
| Masque du guetteur | le masque de cuir à œillère et cordons indigo, posé sur une dalle de grès |
| Jitte d'Amayas | le bâton fourchu de fer posé sur une dalle de grès |
| Lame des ergs | le khopesh de bronze planté dans le sable |
| Takouba de Tin Hinan | la takouba dressée, la pointe posée sur une dalle de pierre |

## Dérogation : le lot du gel du Serment en fresque (octobre 2026)

Les six sorts de la famille « Gel & contrôle du combat » (`poigne-de-givre`,
`grand-voile-blanc`, `appat-de-la-meute`, `verglas`, `defi-du-jarl`,
`embuscade`) dérogent **volontairement** à la direction « huile sur toile »
ci-dessus : ils sont livrés en **fresque** (peinture murale, chaux et
pigments, plâtre patiné), direction validée carte par carte au moment de leur
création. Le reste de la collection reste en huile.

Format : pleine page **4:5**, 1024×1280, comme la face des cartes — aucun
texte, cadre, logo ou interface dessinés.

Règles de tir propres à ces cartes (vérifiées visuellement une à une) :

- les sujets sont **entièrement dans le cadre** : un recadrage 2:3 → 4:5 ne
  coupe jamais une tête ni un élément du sujet — marge de ciel et de sol
  réservées avant le tir ;
- palette de chaux, gestes larges de fresque méditerranéenne, lisibles en
  vignette comme en pleine page.

- **Poigne de givre** (`poigne-de-givre.jpg`) — le froid qui se referme sur
  une créature, givre et souffle blanc.
- **Grand Voile blanc** (`grand-voile-blanc.jpg`) — la tourmente blanche
  qui avale le champ de bataille.
- **Appât de la meute** (`appat-de-la-meute.jpg`) — la meute qui se referme
  sur l’appât, loups en cercle.
- **Verglas** (`verglas.jpg`) — la grêle et le gel qui clouent la scène.
- **Défi du Jarl** (`defi-du-jarl.jpg`) — le jarl et son ours polaire face à
  la meute sur la banquise, duel de deux camps.
- **Embuscade** (`embuscade.jpg`) — le cercle de loups qui se referme sur
  l’isolé, les défenses dehors.

## Dérogation : la passe nihonga algérienne (octobre 2026)

Six héros et deux armes — les cinq du récit, **Salem** (`salem.jpg`),
**Yamina** (`yamina.jpg`), **Fériel** (`feriel.jpg`), **Tarek** (`tarek.jpg`)
et **Boualem** (`boualem.jpg`), plus le **Serpent du monde**
(`serpent-du-monde.jpg`, figure du Nord), l'**Armure de cendres**
(`armure-de-cendres.jpg`) et le **Bâton des citernes**
(`baton-des-citernes.jpg`) — dérogent **volontairement** à la
direction « huile sur toile » ci-dessus : ils sont repeints en **peinture
japonaise nihonga**
(pigments minéraux *iwa-enogu* mats, blanc de coquille *gofun*, sous-drawing
à l'encre *sumi*, fibre de papier *kozo washi*, nuages d'or plats *suyari
kasumi* sur fond de feuille d'or *kinpaku*), direction demandée explicitement
pour ces huit cartes. Le reste de la collection reste en huile, à l'exception
des dérogations déjà documentées (Soleil rouge en kaiga, armes en
photoréaliste, gel en fresque).

### Ce qui change, et ce qui ne change pas

- **Ce qui ne change pas** : l'identité des cinq héros du récit. Âge, visage,
  teint, coiffure, barbe, silhouette, tenue de métier et accessoires restent
  ceux de la peinture précédente, reprise comme référence. La pose et le
  cadrage sont conservés pour Salem, Yamina, Tarek et Boualem ; **Fériel
  fait exception** avec sa nouvelle scène d’archère sur la tour, décrite
  ci-dessous. Un personnage garde **un seul fichier**, réutilisé par la
  carte, le dialogue, le journal et la plaque adverse du duel (voir
  `docs/rpg/11-bible-visuelle.md`). Le Serpent du monde garde, lui, son identité
  de grand serpent marin du Nord et la facture nihonga algérienne.
- **Nouvelle composition du Serpent du monde** : un seul serpent anatomiquement
  cohérent encercle un globe bleu-vert, l'Afrique tournée vers le lecteur. Sa
  tête rejoint sans rupture un cou musclé puis un corps continu, qui passe
  lisiblement derrière la planète sur l'arc supérieur et devant elle sur
  l'arc inférieur ; la gueule referme doucement l'anneau sur l'unique queue.
  Écailles dorsales et plaques ventrales suivent la courbe du corps. Aucune
  tête doublée, aucun membre, aucune aile ni segment détaché.
- **Ce qui change** : la facture (nihonga sur or) et la palette, désormais
  algérienne et plus riche — indigo touareg profond, safran, rouge-orangé de
  henné, vert émeraude et vert-de-gris, turquoise, terre cuite, ocre chaud et
  or abondant. Motifs amazighs (losanges, chevrons, zigzags) brodés sur les
  étoffes, bijoux kabyles argent et corail, sablier en filigrane dans le décor.

### Règles de tir (vérifiées carte par carte)

- plein art **4:5, 1024×1280**, peinture jusqu'aux bords ;
- **tête dans le tiers supérieur** : le portrait de dialogue (3:4), le
  journal (4:5) et la face de carte (4:5) lisent le visage sans recadrage ;
- **aucun texte, aucun idéogramme** (ni kanji, ni kana, ni chiffre, ni logo,
  ni cadre) : l'interface superpose seule nom, coût, statistiques et élément ;
- pas d'anime ni de cartoon : visages adultes, dignes, naturalistes ;
- la couleur de l'élément influence la lumière (sable ocré pour Salem et
  Tarek, bleu de verre et d'eau pour Yamina et Boualem, braise orangée pour
  Fériel) sans jamais devenir un badge dessiné ;
- le **Serpent du monde** garde son élément Neige lisible : ses écailles
  indigo et turquoise et les mers bleu-vert du globe restent froides, tandis
  que l'or du ciel réchauffe la scène et que quelques reflets safran et terre
  cuite ponctuent l'œil et les motifs. Les géométries amazighes suivent les
  écailles comme une broderie, jamais en encadrement : la peinture reste plein
  cadre.
- l'**Armure de cendres** garde **son dessin d'origine trait pour trait** —
  la même figure en armure noire au-dessus du volcan, les deux épées noires
  entièrement visibles, le même cadrage et la même échelle : seule la
  facture change, du photoréaliste vers le nihonga, avec les motifs amazighs
  damasquinés dans l'acier noirci. Aucun ajout, aucun retrait de sujet :
  c'est une conversion de style, pas une recomposition.
- le **Bâton des citernes** montre **le bâton seul**, debout dans une
  **vitrine de musée** : glace sur les quatre faces, montants de laiton,
  socle de pierre, arches et sol carrelé de la galerie derrière, lumière
  tombant d'en haut. **Aucun personnage** — ni main, ni bras, ni visiteur :
  l'objet exposé est le seul sujet, et il est seul derrière la glace. Les
  serpents sont **tous à l'extérieur** de la vitrine : trois ou quatre,
  enroulés autour de la glace et des montants de laiton, lovés sur le sol
  tout autour du socle, têtes levées, museau contre la vitre et langue
  dehors, qui regardent le bâton sans pouvoir l'atteindre. Aucun serpent à
  l'intérieur. La citerne disparaît donc du cadre. Motifs amazighs carrelés
  dans le laiton de la vitrine et du bâton.

### Passe ciblée : Fériel et le Hollandais volant

- **Fériel** (`feriel.jpg`) conserve ses vêtements et ses motifs algériens,
  mais sa composition est nouvelle : elle se tient **au sommet d'une tour**,
  au-dessus de la ville et des dunes, et bande son arc avec **une flèche
  électrique** encochée. La révision dédiée est
  `feriel-tour-fleche-electrique-v1` ; les quatre autres héros gardent la
  révision commune du lot nihonga.
- **La légende du Hollandais volant** (`la-vengeance-de-la-reine-anne.jpg`)
  est désormais une scène **photoréaliste** : un trois-mâts en bois usé,
  voiles déchirés, lune, embruns et vagues détaillées, avec une luminescence
  spectrale discrète. Sa révision est `hollandais-volant-photorealiste-v2`.

### Versions de cache

Les peintures de Salem, Yamina, Tarek et Boualem sont datées ensemble par la
révision `heros-nihonga-algerien-v1` dans `CARD_ART_CACHE_VERSIONS`
(`rpgCardArt.js`). Fériel possède la révision dédiée indiquée ci-dessus, car
sa composition a changé. Le Serpent du monde porte désormais sa révision dédiée,
`serpent-terre-nihonga-v1`, car sa composition a été entièrement repensée.
L'Armure de cendres porte la sienne, `armure-nihonga-v1`, et le Bâton des
citernes, `baton-nihonga-vitrine-dehors-v2`. Le jeton `serpent-des-citernes`
reste, lui, dans le lot photoréaliste : il n'a pas encore été repris.
Ces révisions empêchent les caches de resservir les images précédentes. Pour
le Serpent du monde, la révision dédiée l'emporte sur `SET_NEIGE_ART_VERSION`.
Le garde-fou `PLEIN_ART_45` de `tests/rpg-duel.test.js` vérifie le ratio 4:5
comme le reste de la collection, l'Armure de cendres y compris.
