# Ascension — Réserve, recettes exactes et renforts

## Principe

**Ascension** est une invocation spéciale depuis une réserve séparée du
paquet, de la main, de la pioche, du cimetière et de l’exil. Sa zone dédiée
existe sur les plateaux Duel et MOBA.

- Chaque nouvelle partie reçoit **une copie de chacune des quatre Ascensions**
  du catalogue. Un constructeur peut passer `joueurReserveAscension: []` pour
  désactiver la réserve ; une liste explicite est copiée et dédoublonnée.
- Les anciennes parties sans `reserveAscension` gardent une réserve **vide**.
- Ces quatre cartes ne sont jamais proposées dans les decks ordinaires,
  l’atelier, les boosters, les achats du Souk ou la pioche.
- Les sacrifices sont **le seul prix** : aucun mana supplémentaire, aucune
  invocation normale ni Embuscade consommée. Le nombre imprimé de la carte
  n’est pas un paiement supplémentaire.
- Les matériaux sont des présences alliées, vivantes et distinctes. Deux
  exemplaires d’une carte sont possibles, jamais deux fois la même présence.
  Armes, buffs, dégâts, coûts modifiés et réductions ne changent pas les
  **coûts imprimés** de la recette.

## Les quatre créatures

Toutes sont mythiques. Les exemples de matériaux ci-dessous ne sont **pas**
des noms de cartes obligatoires : les types, couleurs et coûts imprimés font
foi. L’ordre de sélection des rôles est libre.

| Ascension | Couleurs | Coût imprimé | ATQ / DEF | Recette exacte |
| --- | --- | ---: | ---: | --- |
| Samouraï du Dragon Rouge | Braise | 7 | **7 / 7** | **2 Samouraïs**, total imprimé **7** |
| Jarl du Dernier Rempart | Neige | 8 | **4 / 10** | **Viking 3 + Viking 5**, pas 4 + 4 |
| Scorpion de l’Éclipse | Sable / Ténèbres | 8 | **5 / 9** | **Scorpion Sable 2 + créature Ténèbres 3 + créature Ténèbres 3** |
| Colosse du Verre Ardent | Braise / Sable | 8 | **7 / 8** | **Djinn Braise 1 + Djinn Braise 3 + Élémental Sable 4** |

Un hybride peut correspondre à plusieurs rôles, mais chaque présence ne peut
payer **qu’un seul** de ces rôles. Les recettes du Jarl et du duo ne se
réduisent jamais à « total 8 ». Les deux recettes à trois créatures ne changent
pas celles à deux matériaux du Dragon et du Jarl.

### Samouraï du Dragon Rouge

**Dragon · Samouraï**, **Overkill**, **Esquive 15 %**, **Défenseur**.
L’excédent de combat perce jusqu’à l’adversaire. L’Esquive utilise les règles
ordinaires contre attaques, sorts et effets hostiles. Défenseur attire les
Attaques ciblées légales ; en MOBA il ne détourne pas les attaques des autres
voies et ne prime pas sur une Provocation accessible. Ce n’est pas un Mur.

Exemple : **Rōnin du Soleil rouge (3) + Onna-musha des cendres (4)**.
Deux coûts 3, deux coûts 4 ou un non-Samouraï ne conviennent pas.

### Jarl du Dernier Rempart

**Jarl · Viking**, **Overkill**, **Bouclier**, **Furie 4**.

- Bouclier bloque le premier sort ou effet de créature **adverse** qui
  l’atteint, y compris en zone ; il ne prévient pas une attaque ordinaire.
- Furie ajoute **4 ATQ**, sans cumul, quand sa défense vivante est inférieure
  à sa défense de base de 10. L’armure seule perdue ne suffit pas. Le bonus
  disparaît après soin complet et revient s’il est blessé de nouveau.
- La peinture Furie dédiée remplace réellement la face normale sur le plateau.

Exemple : **Gardien viking du fjord (3) + Jarl au marteau de guerre (5)**.
Le Berserk des trois hivers ou la Völva soigneuse peuvent remplir le rôle 3.
L’Archère viking du givre (4) et la Valkyrie au corbeau (4) ne remplacent pas
3 + 5 ; le Scalde des runes (3) n’est pas un Viking.

### Scorpion de l’Éclipse

**Scorpion · Spectre**, **Poison**, **Vol de vie**.
À l’arrivée, détruit une créature adverse ciblée **déjà blessée**, de
**coût imprimé 4 ou moins**. Les Sites sont exclus. Une perte absorbée
uniquement par l’armure ne rend pas la cible blessée. Le coût d’une arme
portée ne modifie pas ce seuil imprimé.

Poison inflige 1 PV au début de chacun des deux prochains tours de la créature
blessée ; il ne se cumule pas. Vol de vie rend la moitié des dégâts,
arrondie au supérieur (5 dégâts donnent 3 PV). En MOBA, les règles ordinaires
de voie, de réponse à l’arrivée, de Bouclier et de protection sont conservées.

Exemple : **Scorpion du seuil (Sable 2) + Momie de lin (Ténèbres 3) + Uræus du
seuil (Ténèbres 3)**. Une deuxième Momie ou un deuxième Uræus est possible.

### Colosse du Verre Ardent

**Golem · Élémental**, **Bouclier**, **Contre-attaque**.
À l’arrivée, inflige **2 dégâts à chaque créature adverse**, jamais aux
alliés ; en MOBA, uniquement dans **sa propre voie**. La Contre-attaque suit
les règles existantes : riposte aux Attaques ciblées et aux capacités ciblantes ;
face à un sort adverse, elle frappe le sorcier ou la voie correspondante.

Exemple : **Djinn de la première étincelle (Braise 1) + Djinn de la flamme
mourante (Braise 3) + Dune marchante (Sable 4)**. Le Ghul des cendres et le
Djinn de la flèche ardente sont d’autres matériaux possibles.

## Quatre soutiens ordinaires

Ce sont des cartes **de deck et de collection**, pas des Ascensions. Leurs
effets produisent des **invocations spéciales**, sans accorder universellement
une deuxième invocation normale. Chaque effet est limité à **une fois par
nom et par tour**, toutes les copies de ce nom confondues.

| Soutien | Carte | Invocation spéciale |
| --- | --- | --- |
| **Convoi des dunes** | Créature Sable 2, 1/2, Humain · Éclaireur, inhabituelle | À l’arrivée : la **première** créature Sable de coût imprimé **2** de votre main |
| **Retour des ensevelis** | Sorcellerie Ténèbres 3, inhabituelle | La **dernière créature admissible** Ténèbres **≤ 3** du cimetière ; **exclut les Ascensions** |
| **Confluence des étincelles** | Sorcellerie Braise 3, rare | Le **premier Djinn Braise 1**, puis le **premier Djinn Braise 3** de votre main, selon présence et place disponible |
| **Éveil des dunes** | Sorcellerie Sable 4, rare | Le **premier Élémental Sable 4 depuis le dessus de la pioche** ; les autres cartes gardent leur ordre |

Les effets d’arrivée des renforts restent actifs, notamment la vraie pioche
du Djinn de la flamme mourante. Une carte sans **Rapidité imprimée** ne peut
pas attaquer ce tour ; elle pourra le faire à son prochain tour. Rapidité
est conservée. Les règles d’attaque à l’arrivée des créatures ordinaires ne
sont pas changées globalement.

- Le Convoi joué normalement utilise le quota normal ; **son renfort non**.
  Un deuxième Convoi appelé par le premier n’ouvre pas une boucle.
- Les trois sorcelleries se jouent uniquement pendant la phase principale du
  propriétaire, sans réponse ni choix obligatoire en attente. Un lancement
  sans matériau ou sans place est refusé **avant paiement**.
- La Confluence peut être partielle : une carte absente est ignorée ; une
  carte sans place reste en main. Aucun deuxième matériau n’est perdu.
- En MOBA, les renforts automatiques utilisent une case libre légale. Le Retour
  permet de choisir sa case, comme Réanimation. Aucune carte non auditée ne
  contourne la barrière MOBA.
- Une annonce contrecarrée consomme le lancement du soutien mais ne retire
  aucun futur renfort de sa source. Une annonce devenue sans source se
  dissipe une fois sans bloquer la partie.
- `camp.renfortsAscensionJoues` conserve les usages dans l’état sérialisable ;
  les usages des deux camps se réinitialisent au changement de tour.
- La **Réanimation ordinaire** reste indépendante : elle peut notamment
  ramener une Ascension morte. Le Retour des ensevelis ne le peut pas.

### Quatre préconstruits prêts à jouer

L’étagère du joueur, l’essai et le MOBA proposent **quatre decks dédiés**,
chacun de **30 cartes**, bicolore et validé par les règles de copies :

- **Éveil du Dragon Rouge** — Braise / Sable : 14 Samouraïs, couples 3 + 4,
  alternatives 2 + 5 et 1 + 6, Réanimation, Tiziri et pioche.
- **Serment du Dernier Rempart** — Neige / Ténèbres : sept Vikings 3 et quatre
  Vikings 5, recherche viking, boucliers, soins et Retour des ensevelis pour
  les quatre Vikings Ténèbres de coût 3.
- **Rite de l’Éclipse** — Sable / Ténèbres : Convois, Retours des ensevelis,
  Scorpions du seuil et six créatures Ténèbres de coût 3. Les petits Sable qui
  détournaient le Convoi sont remplacés par de la pioche ; Uræus et Javelot
  peuvent préparer la cible blessée.
- **Forge du Verre Ardent** — Braise / Sable : Confluences, Éveils, Djinns 1 et 3,
  et Dunes marchantes de coût 4.

Les listes et conseils de mulligan figurent dans
[`32-decks-ascension.md`](32-decks-ascension.md).
Les huit listes existantes, les decks personnels et les huit identités de
campagne ne sont pas remplacés. Les Ascensions restent dans leur réserve,
**pas parmi ces 30 cartes**. Les préconstruits sont des points de départ,
pas une garantie d’équilibrage compétitif.

## Interface sur le plateau

1. La zone **Ascension** reste visible même vide, pour les deux camps. Un
   indicateur doré signale une recette actuellement réalisable.
2. Un clic déplie une **petite fenêtre verticale juste au-dessus du bouton**,
   sans voile, déplacement ou réduction du plateau. Elle utilise les vraies
   faces `TableCard` : peinture, coût, statistiques et capacités. La liste
   des quatre cartes défile verticalement ; la fenêtre est bornée à 270 px
   et à l’espace réellement disponible.
3. **Cliquer une face ouvre l’aperçu standard** ; consulter ne sélectionne et
   ne paie rien. La réserve adverse est uniquement consultable.
4. **« Choisir les sacrifices »** ferme la fenêtre et ouvre le petit bandeau
   du bas. La main est temporairement masquée ; le joueur choisit les vraies
   créatures du champ, numérotées, avec leur coût imprimé. Le bandeau affiche
   **les rôles exacts**, pas seulement la somme. Aucun choix automatique.
5. **« Sacrifier et invoquer »** confirme en Duel. En MOBA,
   **« Préparer l’Ascension »** permet de choisir la case d’un des sacrifices,
   puis l’annonce ouvre la fenêtre de réponse existante.

**Échap** et le **Retour Android** ferment d’abord la fiche puis la réserve
ou le rituel, sans quitter la partie. Le focus revient à la face puis à la
zone. Un clic extérieur replie la consultation sans voler le focus d’une
saisie. La petite fenêtre n’a pas de piège de tabulation ; la fiche garde sa
navigation modale habituelle. Le rituel accepte Entrée/Espace et la
sélection/désélection des matériaux ; attaques, main et fin de tour y sont
neutralisées, pas le champ entier.

Sur téléphone paysage, la fenêtre reste étroite (132 px, 154 px sur PC).
Si le bouton adverse est trop près du haut, sa fenêtre se déplie exceptionnellement
sous lui. La réserve du joueur reste au-dessus dans tous les formats vérifiés.
La fiche, son titre, ses statistiques et ses bulles restent accessibles sur
568 × 320, sans être couverts par les couches du plateau MOBA.

## Paiement, annonces et déplacements

Le moteur vérifie la source, le timing et **toute la recette avant mutation**.
En MOBA, la carte quitte sa réserve à l’annonce ; les victimes ne sont
sacrifiées **qu’à la résolution**. Un contre envoie la carte au cimetière sans
prendre les victimes ni le quota normal. Une recette périmée se dissipe.

Les **deux ou trois matériaux sont retirés simultanément**, avant leurs
équipements, cargaisons, Tenacité, Harakiri et autres déclenchements de mort.
La destination est réservée contre les jetons produits par les morts. Si le
paiement termine la partie ou ferme la destination, l’Ascension n’arrive pas,
sa carte va une seule fois au cimetière et les sacrifices ne sont pas rendus.

Une mort ordinaire reste au cimetière. Les renvois vers la main, les
récupérations du cimetière vers la main et les replis de cale rendent une
Ascension à **sa réserve**, jamais à la pioche. Les retours en jeu, exils
et réanimations conservent les autres règles existantes.

## Intégration technique

- `rpgAscensionCards.js` : quatre définitions hors-deck immuables.
- `rpgAscension.js` : recettes pures, appariement exact des rôles,
  combinaisons, timing, initialisation et routage des retours.
- `rpgAscensionSupports.js`, `rpgRenforts.js` : soutiens ordinaires,
  planification pure des sources, filtrage de résurrection et usages par nom.
- `rpgDuel.js`, `rpgInvocation.js`, `rpgMobaLocal.js` : prix, source autoritaire,
  réservations, renforts, fenêtres de réponse, arrivées et placement cohérent.
- `RpgReserveAscension.jsx`, `rpg-ascension.css` : hook et interface communs,
  fenêtre ancrée, sélection du vrai champ, focus et aperçus standard.
- Les IA Duel et MOBA évaluent les recettes et les soutiens **sur des copies**,
  sans consommer le hasard réel. Le Scorpion emporte sa cible blessée dans la
  simulation. Une voie nettoyée ou défendue par le nouveau corps n’est pas
  considérée à tort comme abandonnée par ses sacrifices.
- L’intention PvP existante `jouer-carte` transmet `carteId` et `sacrificeIds`.
  L’arbitre choisit la source depuis la définition imprimée, jamais depuis
  une gratuité ou une zone prétendue par le client. La réserve est publique.

Aucune migration de base de données, modification de compte ou activation du
mode en ligne n’est nécessaire. Les états restent sérialisables.

## Illustrations

Les neuf faces de production sont des JPEG progressifs optimisés,
**768 × 960**, toutes sous 260 Kio, avec URL de cache versionnée.

- **Dragon** : conserver la peinture humanoïde choisie par l’utilisateur,
  armure de samouraï éclatée ; `ascension-dragon-humanoide-v2`.
- **Jarl normal** : conserver la correction choisie, casque et loup,
  **hache dans sa main gauche et bouclier au bras droit** (hache à droite de
  l’image, bouclier à gauche) ; `ascension-jarl-casque-loup-v2`.
- **Jarl Furie** : face dédiée choisie, distincte de la normale ;
  `ascension-jarl-furie-v1`.
- **Scorpion et Colosse** : deux nouvelles peintures dark fantasy ;
  `ascension-duo-v1`.
- **Quatre soutiens** : peintures individuelles ; `ascension-soutiens-v1`.

Aucun texte ni cadre n’est incorporé aux peintures. Les anciens arts du jeu
ne sont pas remplacés.

## Vérification reproductible

Avec Node compatible Vite 8 (validé avec **Node 24**) :

```sh
npm run check:rpg-ascension
npm run check:rpg-ascension-browser
npm run build
```

- **154 tests de règles/interface/animation/decks** : les 46 du Dragon, les
  **75 du Jarl, du duo et des soutiens**, et les 8 tests existants
  d’interface/animation, plus **25 tests des quatre préconstruits**. Recettes et permutations, refus atomiques,
  coûts imprimés, état blessé/armure, Poison/Vol de vie, Bouclier/Furie,
  arrivées, trois morts simultanées, réanimation ordinaire, contres,
  quotas, usages, IA réelles sans mutation, PvP, catalogue et arts.
- **3 scénarios React/JSDOM** : consultation, focus, Retour Android,
  annulation et invocation sur les plateaux Duel souris/tactile et MOBA.
- **40 scénarios Chromium** : les 10 parcours Dragon sur les deux modes en
  1440 × 900, 1280 × 720, 844 × 390, 667 × 375 et 568 × 320 ; 12 parcours
  Jarl/Scorpion/Colosse en 1440 × 900 et 568 × 320 ; 2 vérifications Furie
  tactile ; 8 préparations par les quatre soutiens jusqu’à l’Ascension ;
  **8 démarrages depuis les vrais menus**, un par préconstruit et par mode.
  Les tests vérifient les peintures réellement chargées, les rôles affichés,
  les cibles, les résultats et les quotas. Les parcours tactiles utilisent
  de vrais **`.tap()`**.
- Tests complémentaires des préconstruits, de leurs menus et des arts vikings.
- Build de production ; les avertissements déjà présents sur les gros chunks
  et l’import dynamique d’article ne sont pas traités comme des échecs.

**Limite :** la suite historique complète n’est pas déclarée verte. La
comparaison bornée porte sur **993 tests historiques** (invocations, IA,
MOBA, PvP et arbitre). Les fixtures historiques incompatibles avec les
règles de decks et de mana ne sont pas réparées par cette fonctionnalité.
L’attente de huit decks sélectionnables est adaptée à **douze** pour tenir
compte des quatre préconstruits d’Ascension, sans enlever la validation de
chaque liste. Les résultats exacts de la comparaison sont consignés dans
le compte rendu de validation livré avec le patch.

## Démonstration locale

```sh
npm run preview:rpg-ascension
```

Le serveur de démonstration utilise le port **4173** : `/` en Duel,
`/?mode=moba` en MOBA. Le sélecteur propose Dragon, Jarl, Jarl Furie,
Scorpion, Colosse, Renforts Scorpion et Renforts Colosse. Le bouton
« Recommencer » réinitialise la scène ; chaque lien de mode garde la scène.

Exemples : `/?scene=scorpion`, `/?mode=moba&scene=colosse`,
`/?mode=moba&scene=soutiens-colosse`.

Le Dragon propose aussi le mauvais couple 3 + 2 pour vérifier le refus avant
le bon 3 + 4. Le Jarl propose deux Vikings 4 en plus de son 3 + 5.
La scène des soutiens Colosse commence avec l’invocation normale **déjà
consommée**, afin de vérifier le caractère spécial des trois renforts.

Scènes, sondes et transformations Vite sont réservées au serveur de démo :
**aucun import dans le jeu publié ou le build de production**.

**Livraison locale :** aucun commit, push, déploiement ou changement de base
de données n’est effectué par cette intégration.

Le lien **Decks** de la démo ouvre `/decks` : le menu réel permet de choisir
les préconstruits puis de démarrer une partie normale, avec mulligan et réserve
par défaut, sans main ou champ préparés. `?mode=moba` ouvre le sélecteur MOBA.
