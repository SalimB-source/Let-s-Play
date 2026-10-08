# L'ARCADE ÉTERNELLE — charte artistique (issue des maquettes validées)

**Statut : maquettes validées.** Les quatre images de ce dossier ont été
choisies ; ce document fige ce qu'elles montrent pour que le dessin et le code
ne repartent pas chacun de leur côté. Les couleurs ci-dessous sont **mesurées
sur les images**, pas inventées.

| Fichier | Ce qu'il montre | État |
| --- | --- | --- |
| `00-planche-de-validation.jpg` | Les quatre maquettes sur une planche, légendées | Vue d'ensemble |
| `01-ecran-de-jeu-desert.png` | Stage 1-1 (Le Puits Sec) : le plan signature des plateformes invisibles révélées par leur ombre, HUD, onomatopée, ennemis | ✅ validée |
| `02-planche-personnages.png` | Héros en 5 poses, PIX en 3 humeurs, les 6 familles d'ennemis du désert en 6 dessins isolés | ✅ validée (référence de production) |
| `03-carte-pouvoir-vent.png` | Anatomie d'une carte-pouvoir : cadre or, fond indigo, plaque de légende | ✅ validée |
| `04-hub-grande-salle.png` | La Grande Salle : 12 bornes sous housse, une allumée, comptoir, jukebox, carte au mur | ✅ validée |
| `05-prototype-feel-captures.png` | Six captures du prototype jouable : entrée du puits, bac à sable, grand trou, mode mesures (F3), corniches, écran de salle franchie | ✅ rendu réel du code (`mockups/05`) |

---

## 1. Les six règles du cel-shadé (non négociables)

1. **Contour d'encre sur tout** — 2 px à l'échelle interne. **Chaud dans les
   mondes** (brun sombre, voir palettes) et **froid dans la Salle** : c'est ce
   qui distingue « on est dans un jeu » de « on est dans la réalité ».
2. **Deux tons d'ombre, jamais de dégradé.** Un ton clair, un ton d'ombre, une
   réserve de lumière (le blanc du papier). Un troisième ton = une erreur.
3. **Trame de manga** dans les ombres d'ambiance uniquement (points, 45°,
   densité 20-30 %). Jamais sur un personnage à l'écran : ça vibre.
4. **Personnages sur les deux, monde à 60 ips.** La simulation tourne à 60 Hz ;
   l'animation des personnages change d'image **toutes les 5 images de
   simulation** (12 img/s). C'est *le* détail qui fait « anime » plutôt que
   « jeu vidéo lisse » : la caméra, la poussière et les particules restent
   parfaitement fluides pendant que le héros garde le « stop » du dessin animé.
5. **Smear frame obligatoire** sur la frappe et le dash : une image étirée de
   l'arme ou du corps, à l'encre, avant le retour au dessin propre.
6. **Un impact se lit en 2 images** : flash blanc (ou noir sur fond clair) +
   onomatopée, puis retour au jeu. Jamais plus de 90 ms d'arrêt sur image.

---

## 2. Palettes mesurées

### Désert de Bits (monde 1) — chaud, lumineux, poussiéreux
| Rôle | Hex | Remarque |
| --- | --- | --- |
| Ciel | `#4CB7D9` | Aplat unique, sans dégradé (on ajoute une bande plus claire `#68C8E0` en haut) |
| Sable clair (lumière) | `#ECD197` | Le ton de base du sol |
| Sable moyen | `#D1A667` | Étage d'ombre du sable |
| Roche / falaise | `#8C6C4C` | Blocs taillés, ruines |
| Ombre bleutée | `#5A8B99` | Ombre portée au sol, ombres des plateformes invisibles |
| Brume lointaine | `#B3D7D8` | Plans lointains, ruines au fond |
| Encre du monde | `#50493D` | Contour chaud : jamais du noir pur |

### La Grande Salle (hub) — froid, nocturne, nostalgique
| Rôle | Hex | Remarque |
| --- | --- | --- |
| Noir de salle | `#212524` | Les coins, le sous-plafond |
| Mur | `#4B3827` / `#5C4934` | Deux tons, jamais plus |
| Ombre froide | `#364342` | Le teal qui refroidit tout le décor |
| Lampe | `#AF926A` / `#BDB6AB` | Uniquement près de la borne allumée et du rideau |
| Encre du hub | `#0F1414` | Contour froid, presque noir : la Salle n'est pas un jeu |

### Héros — la seule tache froide du désert (lisibilité)
| Rôle | Hex | Remarque |
| --- | --- | --- |
| Veste | `#232324` → **`#2B2C31`** au rendu | Presque noire : le héros se détache de tout fond chaud. Éclaircie d'un cran dans le prototype : à 12 img/s en 640×360, le noir plein faisait un trou sans silhouette (voir §9 bis) |
| Écharpe | `#885A3B` → **`#9C4E2E`** au rendu | Le seul accent chaud du personnage, c'est lui qui « bouge » à l'écran. Brique plus franche dans le prototype : `#885A3B` se confondait avec le sable `#D1A667` |
| Bottes / lanières | `#634635` | |
| Peau et chemise | `#CCB8A1` / `#EDE2D2` | La réserve de lumière |
| Cheveux | Encre `#1A1613` | Masse pleine, sans détail : un manga lit par la silhouette |

> **Règle de lecture** : le héros est **sombre sur fond clair** dans le désert,
> et **clair sur fond sombre** dans la Salle et dans les mondes nocturnes
> (Dojo, Néon, Ring, Château). Aucune tenue alternative ne doit casser ça.

### HUD
| Rôle | Hex |
| --- | --- |
| Cœur (rouge de vie) | `#D34B3E` |
| Jeton (or) | `#DDB869` |
| Fond de plaque HUD | Encre à 70 % |
| Compteur de cartes | `#F2E7D5` sur encre |

### Carte
| Rôle | Hex |
| --- | --- |
| Fond de scène | `#0B0D1B` |
| Champ de la carte | `#242952` (indigo profond) |
| Cadre et plaque | `#BB9B60` (or patiné) sur relief `#966C40` |

---

## 3. Le héros — « le Dernier Client » (nom à trancher, cf. design §16)

**Design validé** : adolescent, cheveux noirs en bataille, **veste sombre
manches retroussées**, chemise claire, **écharpe qui flotte** (elle sert
d'indicateur de vitesse — plus elle tire, plus on court vite), pantalon sombre,
bottes montantes à lacets, mains gantées. Arme : **un gros pinceau à encre
tenu comme une lame**, qui dessine une traînée noire (le smear) à chaque coup.

**Échelle** : dessiné sur une cellule de **52 × 60 px** à l'échelle interne
(tuile = 32 px, héros ≈ 1,6 tuile de haut), contour de 2 px.

**Animations à produire** (12 img/s, donc 1 dessin toutes les 5 images de
simulation) :

| Animation | Images | Note de production |
| --- | --- | --- |
| Immobile | 6 | Respiro : l'écharpe bouge, pas le corps |
| Course | 8 | Deux paires de foulées, écharpe en retard d'une image |
| Saut (montée) | 3 | Jambes groupées, puis extension |
| Chute | 2 | Bras ouverts, écharpe vers le haut |
| À-plat / rebord | 4 | Accrochage simple, une main |
| Glissade murale | 2 | Contour du corps contre la paroi |
| Attaque 1 / 2 / 3 | 3 + 3 + 4 | Le 3ᵉ finit en **smear** d'une image |
| Attaque en l'air | 3 | Différenciée du sol : le pinceau part du haut |
| Esquive | 3 | Roulade, une image de smear |
| Dash | 3 | Position coulée + smear d'encre sur 10 tuiles |
| Dégât | 2 | Recul, tête en arrière |
| Atterrissage | 2 | Accroupi court (5 images de simulation) |

---

## 4. PIX — la mascotte

Petit débris 8 bits blanc à contour noir, **24 × 24 px**, deux yeux et une
bouche de pixel (voir `02-planche-personnages.png`, colonne de droite) :
**HAPPY / ALERT / GRUMPY**. Il **ne parle pas** : il bleep, il tremble, et le
texte s'écrit à côté de lui en bulle de manga. C'est la raison pour laquelle le
personnage peut rester sans traduction dans les trois langues du site.

Il sert de : boîte de dialogue (3 bulles maximum par écran), carnet vivant
(il tient la page), et HUD (il apparaît quand le Carnet a quelque chose de neuf
— pastille discrète, jamais un pop-up qui coupe le jeu).

---

## 5. Les six familles d'ennemis du désert (dessins validés)

Tailles à l'échelle interne (tuile 32 px). Chaque ennemi a **une animation
d'entrée télégraphiée** : le joueur doit toujours voir venir.

| Ennemi | Taille | Verbe | Animation clé |
| --- | --- | --- | --- |
| **Scarabée de sable** | 32 × 24 | Rôdeur : va-et-vient, accélère s'il te voit | Pince hissée avant de charger |
| **Idole à éclats** | 40 × 48 | Sentinelle : immobile, tire des éclats | Le socle s'allume 0,4 s avant le tir |
| **Vautour de pixels** | 40 × 28 | Volatile : attend au plafond, plonge | Ouvre les ailes en deux images |
| **Bélier de grès** | 56 × 40 | Chargeur : fonce, s'écrase contre le mur | Gratte le sol 0,5 s, tête baissée |
| **Golem de grès** | 56 × 64 | Blindé : les coups ricochent sur la coque | Fissures qui s'éclairent (indique la fissure à viser) |
| **Mirage de sable** | 40 × 48 | Fantôme : visible seulement dans un cône de lumière ou sous Écho | Contour ondule, jamais net |

---

## 6. HUD — anatomie mesurée

Deux plaques d'encre **tracées au pinceau** dans les coins, jamais de cadre
rectangulaire :

- **Haut-gauche** : 4 cœurs rouges (`#D34B3E`) sur une seule ligne, puis la
  ligne des jetons dorés (`#DDB869`) qui tombe en cascade quand on en ramasse.
- **Sous les cœurs** : **3 emplacements de cartes-pouvoir** (les 3 du deck
  équipé) avec voile noir + minuteur au rechargement. L'emplacement utilisé
  s'illumine un instant.
- **Haut-droit** : le compteur de cartes, **`n / 12` par monde** (l'icône du
  monde devant le chiffre). Le compteur pulse une fois quand une carte tombe.
- **Bas** : rien. Aucune barre d'expérience, aucun texte permanent.
- Le **rail des pouvoirs** (bas-droit) n'apparaît que sur téléphone, en
  surimpression translucide, et disparaît après 3 secondes sans contact.

---

## 7. Cartes — anatomie (validée sur `03-carte-pouvoir-vent.png`)

Format **2:3**, bord blanc fin, puis :
1. **Cadre or filigrané** (`#BB9B60` / relief `#966C40`), coins en volutes.
2. **Champ indigo** (`#242952`) en réserve, éventuellement étoilé.
3. **Illustration** cel-shadé, contour d'encre, trame dans l'ombre — elle se
   lit à 80 px de large dans le Classeur **et** à 600 px en plein écran : c'est
   une contrainte de composition, pas de détail.
4. **Plaque de légende** : nom du pouvoir en capitales espacées (**VENT**), et
   sous lui, plus petit, le titre narratif (**GÉNIE DES DUNES**).

**Les quatre raretés** (se voient à 3 mètres de l'écran) :

| Rareté | Traitement |
| --- | --- |
| Commune | Cadre pierre/bronze, champ indigo mat |
| Rare | Cadre argent, champ indigo dégradé léger, filet clair |
| Brillante | Cadre or, filigrane complet, halo quand on la survole |
| **Animée** | Cadre or + **illustration animée en 8 images** (boucle de 4 s), scintillement d'holographie au passage |

**Index de collection** : la carte non trouvée s'affiche en **silhouette
d'encre sur champ vide**, avec le nom du monde et l'indice de lieu — jamais un
« ??? » qui ne dit rien.

---

## 8. Onomatopées et accents manga

Dessinées à la main, en blanc cassé (`#F2E7D5`) avec contour d'encre, légère
rotation, jamais plus de 0,6 s à l'écran, jamais plus d'une à la fois :

| Dessin | Quand |
| --- | --- |
| **ZAN!** | coup de pinceau qui touche |
| **DOON!** | chute lourde d'un golem / onde de choc du boss |
| **TAK TAK** | pas de course sur la pierre |
| **FWOOSH** | dash |
| **GOOO** | rumeur de la salle avant un boss |
| **PIKO PIKO** | une borne s'allume, une carte est obtenue |

**Plaques de nom de boss** : bandeau d'encre qui balaie l'écran, nom en
capitales espacées, sous-titre narratif en plus petit. Une seule par boss, à
l'entrée de l'arène, pendant 1,5 s, avec le thème qui coupe net.

---

## 9. Ce que la maquette a confirmé — et les écarts à corriger

**Confirmé**
- Le plan des **ombres de plateformes invisibles** fonctionne tel quel (image 01) :
  les dalles en lévitation au-dessus sont lisibles par leur seule ombre portée.
  C'est le plan signature du monde 1, on ne change rien.
- La **banque d'ennemis** est cohérente en une seule planche : les six familles
  se distinguent à la silhouette.
- Le **hub se raconte tout seul** : les housses sont les mondes pas encore
  joués, la borne allumée est la promesse.
- La **carte** tient à la fois en vignette et en plein écran.

**Écarts à corriger à la production** (à ne pas laisser filer du dessin au code)

1. **Feuille de sprites** : la planche de personnages est une planche de
   *concept* (poses dessinées à la main, entre elles) ; il faudra la découper en
   sprites **strictement superposables** (mêmes repères de pieds et de tête)
   avant de l'animer.
2. **Trois emplacements de cartes, pas plus** : l'image 01 montre bien trois
   slots — c'est le deck, on s'y tient (la 4ᵉ ne viendra que si la carte
   « PIX édition spéciale » est équipée).
3. **Le héros change de tenue entre l'image 01 et l'image 02** (veste claire /
   veste sombre) : la référence de production est **l'image 02** (veste sombre,
   écharpe rouille) — c'est celle qui se lit le mieux dans le désert.
4. **Le panneau « ARCADE » au fond de la carte 03 est un décor de présentation**,
   pas un élément du jeu : la carte doit rester lisible sur fond uni.
5. **Contours** : garder l'encre **chaude** (`#50493D`) dans le désert et
   **froide** (`#0F1414`) dans la Salle. Ne pas mélanger dans un même plan.

---

## 9 bis. Écarts mesurés dans le prototype jouable

Écrire la charte puis la **peindre** a montré six choses que la maquette, plus
grande et plus lente, ne pouvait pas dire. Elles sont appliquées dans
`src/games/arcadeFeelArt.js` :

1. **Tête plus petite que la planche.** À 32 px de haut, garder les proportions
   de la planche exige une tête de 11 px : elle était chibi (2,6 têtes de haut)
   et pataude. Le prototype tient **3,5 têtes**, tête réduite d'un quart.
2. **Les yeux font le visage.** Sans iris ni sourcils lisibles, le personnage
   est une tache. Deux yeux à blanc franc et une bouche courte suffisent.
3. **Le pinceau ne se porte pas en permanence.** Au bout du bras au repos, il se
   lit comme un fusil et masque la jambe. Il n'apparaît que pendant le coup.
4. **L'écharpe est un ruban, pas un trait.** Il lui faut de la longueur
   (≈1,5 tuile), un effilement, une pointe **fourchue** et une ondulation ; un
   trait épais se lit comme une pagaie.
5. **Veste ouverte sur le tee-shirt clair.** C'est le panneau clair qui donne la
   silhouette ; la veste seule faisait un bloc noir.
6. **Pas de dégradé, jamais** — la règle tient, y compris pour la profondeur du
   grand trou (un aplat sombre plutôt qu'un fondu).

---

## 10. Passage au code (ce que la charte impose à `plateformerArt.js`)

- **Échelle interne : 640 × 360 px**, tuile **32 px** → 20 × 11,25 tuiles
  visibles, mise à l'échelle entière ×2 (1280 × 720) et ×3 (1920 × 1080).
  Sur téléphone en vertical, le jeu passe en paysage avec une bande noire
  assumée et une invite « tournez l'appareil » — plutôt qu'un jeu rétréci.
- **Tout le décor est dessiné par le code** (formes, aplats, contours) au
  chargement de la salle, puis cuit dans un canvas hors écran : le rendu d'une
  salle est un seul blit, plus les entités et les effets.
- **Les personnages** sont les seuls éléments dessinés image par image. Ils
  peuvent être soit tracés par le code (formes vectorielles + aplats, comme les
  portraits de Mirage Rush), soit des feuilles de sprites ; la charte est la
  même dans les deux cas, et le prototype du *feel* tranchera.
- **Contours** : trait de 2 px, jamais antialiasé « gras » — on trace les
  contours à part du remplissage pour garder l'encre nette à l'agrandissement.
- **Trames** : motif de points précuit (4 densités, une par monde) appliqué en
  masque, jamais calculé par pixel en temps réel.

---

## 11. À trancher

1. **Nom du héros** (design §16) — la charte attend le prénom pour la plaque de
   la planche de production.
2. **Tuile 32 px** (recommandé, 640 × 360) ou 48 px (960 × 540, plus de détail,
   plus de travail de décor).
3. **Personnages tracés par le code ou feuilles de sprites** : décision à
   prendre à l'étape 2 (prototype du feel), selon ce qui donne le meilleur
   rapport « qualité / effort d'animation ».
4. **Encre chaude dans les mondes / froide dans le hub** : à garder tel quel, ou
   testé sur un second monde (Dojo, nocturne) avant de figer.
