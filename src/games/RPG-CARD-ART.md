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

Les **figures du Nord** sont peintes comme des personnes, chacune avec son
attribut, parce que leur sujet ne doit jamais se réduire à un objet :

- le **Maître du marteau** (le Tonnerre) — un colosse à la chevelure et à la
  barbe rousses, gantelets de fer et large ceinture cloutée, marteau runique
  levé sous l’orage. C’est le seul moyen de ne pas le confondre avec
  l’Éclair du marteau, la magie du set, qui montre le marteau seul fendant le
  ciel ;
- le **Père des corbeaux** — un vieux marcheur à large chapeau de voyage,
  corbeaux sur les épaules et vol de corbeaux dans la tempête (et non un
  sorcier à chapeau pointu, qui n’aurait rien du Nord). Depuis sa refonte
  (coût 6, 5/5, foudre activée), sa peinture est une **illustration
  photoréaliste** — direction demandée explicitement pour cette figure,
  tranchant sur l’huile du reste de la collection ;
- la **Dame des neuf mondes** — une femme au foyer de bois, le fil à la main ;
- le **Serpent du monde** — le corps en anneau qui entoure les eaux.

### Les deux dernières cartes du Serment (octobre 2026)

- **Le Grand Hiver** (`grand-hiver.jpg`) — sorcellerie Neige à 2 manas : 1 dégât
  à toutes les créatures, les deux camps compris. Peinture à l'huile dans la
  direction générale de la collection : deux bandes de guerriers du fjord
  saisis par le même mur de neige, aucun camp épargné.
- **Hache de la banquise** (`hache-de-la-banquise.jpg`) — arme Neige à 3 manas :
  elle inflige 1 dégât à son porteur en s'attachant, puis il gagne +2/+0 et un
  bouclier de 1. Comme les autres armes du prototype, elle suit la
  **dérogation photoréaliste** documentée plus bas : le porteur tient l'arme
  en pleine action, l'arme entièrement dans le cadre, pointe et pommeau
  dégagés.

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
- **Samouraï du torii** : parade au katana contre un second guerrier.
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
- **Daimyō du Soleil rouge** (rare) : daimyō sur un cheval blanc, yari levé, soleil rouge géant,
  phénix d'or et cerisiers.

Ils portent `soleil-rouge-kaiga-couleurs-v7`. Ils ne figurent pas dans le deck préconstruit : ils se
composent à l'atelier. Les trois ajouts sont des créatures `Samouraï` : ils reçoivent la Résonance samouraï.

Le Daimyō a depuis sa **bannière** et ses deux **Samouraïs** : la carte devient
un 3/3 à 5 qui lève deux créatures-jetons 1/1 en arrivant (`samourai-du-daimyo`,
peinture dédiée ci-dessus) et grandit de +1/+1 chaque Samouraï de son camp qui
attaque. Sa peinture ne change pas — le daimyō au cheval blanc reste son
illustration, version `soleil-rouge-kaiga-couleurs-v7` —, et la refonte
n’ajoute aucune carte au catalogue : le jeton vit hors de `RPG_DUEL_CARDS`,
comme les chiens de sable.

Le **Kenshi de la forge** a, lui, reçu l'**aura de forge** : 1/2 au lieu de 2/4,
et « tant qu'il est en jeu, les autres créatures de type Samouraï de votre camp
gagnent +1/+0 » — l'aura ne touche jamais la défense, donc la perdre ne peut pas
tuer. Sa peinture ne change pas (le forgeron frappant une
lame en fusion reste son illustration, version `soleil-rouge-kaiga-couleurs-v7`) :
c'est bien lui qui forge les autres, y compris les Samouraïs du camp adverse,
comme le veut le texte imprimé.

Les peintures sont versionnées `soleil-rouge-kaiga-couleurs-v7` dans
`CARD_ART_CACHE_VERSIONS`, sauf les Feux de kitsune (`kitsune-kaiga-couleurs-v4`)
et la Frappe d’iaijutsu corrigée (`iaijutsu-kaiga-couleurs-sans-jambes-v10`). Les noms des fichiers, le plein art 1024×1280 et les
règles des cartes restent inchangés.

Les sujets humains s’inspirent des guerriers du Japon ; les tengu, oni,
kitsune et Kagutsuchi relèvent de sa mythologie et ne sont pas présentés
comme des figures historiques. Le deck utilise les Montagnes et les Crêtes
de cendre existantes ; il n’ajoute pas de terrain sans illustration dédiée.


### Résonance samouraï

Le Samouraï du torii, le Tengu et Kagutsuchi portent **Résonance samouraï** : chaque source donne
+1/+1 uniquement aux créatures dont la ligne de type indique **Samouraï**, dans
les deux camps et quelle que soit leur couleur. La couleur Braise et le nom
d’une carte ne suffisent pas. Ni les yōkai, ni les kami, ni les autres types
ne bénéficient du bonus. Les types imprimés existants restent inchangés.
La Résonance Neige et Honneur gardent leurs règles. Les illustrations ne sont
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
le ciblage des magies : +5/-2 et Coup rapide permanents tant que le porteur
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
Rapidité et Honneur 3. Elle bénéficie de Résonance samouraï. Un exemplaire
remplace un Tengu dans le deck préconstruit, qui garde ses 40 cartes et ses
16 terrains. La carte se débloque à `sables-3`.


### Orochi et Petit Orochi

Orochi rejoint Soleil rouge : créature légendaire mythique Braise, Serpent,
coût 8, force/défense 8/8. À sa mort, son contrôleur crée sur son champ de
bataille deux créatures-jetons « Petit Orochi » 4/4. Orochi ne possède pas Honneur, par exception à la règle de rareté du set. Les petits n’ont ni Honneur, ni
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

Créature légendaire Braise — Kami · Tempête, coût 5, force/défense 6/3,
Honneur 3. À son arrivée, son contrôleur choisit une créature de l’un ou
l’autre camp et la retire de la partie. L’exil n’est pas une mort : ni
Honneur, ni création de jetons, ni retour programmé ne se déclenchent.
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
  ceux de la peinture précédente, reprise comme référence ; la pose et le
  cadrage aussi. Un personnage garde **un seul fichier**, réutilisé par la
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

### Versions de cache

Les cinq peintures des héros du récit sont datées ensemble par la révision
`heros-nihonga-algerien-v1` dans `CARD_ART_CACHE_VERSIONS`
(`RpgDuelPage.jsx`). Le Serpent du monde porte désormais sa révision dédiée,
`serpent-terre-nihonga-v1`, car sa composition a été entièrement repensée.
L'Armure de cendres porte la sienne, `armure-nihonga-v1`, et le Bâton des
citernes, `baton-nihonga-vitrine-dehors-v2`. Le jeton `serpent-des-citernes`
reste, lui, dans le lot photoréaliste : il n'a pas encore été repris.
Ces révisions empêchent les caches de resservir les images précédentes. Pour
le Serpent du monde, la révision dédiée l'emporte sur `SET_NEIGE_ART_VERSION`.
Le garde-fou `PLEIN_ART_45` de `tests/rpg-duel.test.js` vérifie le ratio 4:5
comme le reste de la collection, l'Armure de cendres y compris.
