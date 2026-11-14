# Ascension — Réserve, total exact et renforts

## Principe

**Ascension** est une invocation spéciale depuis une réserve séparée du
paquet, de la main, de la pioche, du cimetière et de l’exil. Sa zone dédiée
existe sur les plateaux Duel et MOBA.

- Chaque nouvelle partie reçoit **une copie de chacune des sept Ascensions**
  du catalogue. Un constructeur peut passer `joueurReserveAscension: []` pour
  désactiver la réserve ; une liste explicite est copiée et dédoublonnée.
- Les anciennes parties sans `reserveAscension` gardent une réserve **vide**.
- Ces cartes ne sont jamais proposées dans les decks ordinaires,
  l’atelier, les boosters, les achats du Souk ou la pioche.
- Les sacrifices sont **le seul prix** : aucun mana supplémentaire, aucune
  invocation normale ni Embuscade consommée. Le nombre imprimé de la carte
  n’est pas un paiement supplémentaire.
- Les matériaux sont des présences alliées, vivantes et distinctes. Deux
  exemplaires d’une carte sont possibles, jamais deux fois la même présence.
  Armes, buffs, dégâts, coûts modifiés et réductions ne changent pas les
  **coûts imprimés** de la recette. Les créatures-jetons ont un coût imprimé
  de **1**, même si leur création par effet ne coûte pas de mana.

## Les sept créatures

Toutes sont mythiques. Les recettes exigent les **cartes nommées** ci-dessous,
vivantes et distinctes ; l’ordre de sélection ne compte pas. La somme de leurs
coûts imprimés est exactement égale au coût imprimé de l’Ascension. Une autre
créature du même type ou de même coût ne la remplace pas.

| Ascension | Couleurs | Coût | ATQ / DEF | Sacrifices obligatoires |
| --- | --- | ---: | ---: | --- |
| Samouraï du Dragon Rouge | Braise | 7 | **7 / 7** | Rōnin du Soleil rouge (3) + Onna-musha des cendres (4) |
| Jarl du Dernier Rempart | Neige | 8 | **4 / 10** | Berserk des trois hivers (3) + Jarl au marteau de guerre (5) |
| Scorpion de l’Éclipse | Sable / Ténèbres | 8 | **5 / 9** | Scorpion du seuil (2) + Uræus du seuil (3) + Momie de lin (3) |
| Colosse du Verre Ardent | Braise / Sable | 8 | **7 / 8** | Djinn de la première étincelle (1) + Djinn de la flamme mourante (3) + Dune marchante (4) |
| Valkyrie de la dernière aurore | Neige | 5 | **4 / 5** | Guerrier au bouclier rond (2) + Gardien viking du fjord (3) |
| Amiral des abysses | Eau | 6 | **4 / 4** | Raïs de la galiote (2) + La légende du Hollandais volant (4) |
| Serpent des deux rivages | Sable / Eau | 7 | **6 / 6** | Cotre de course (3) + La légende du Hollandais volant (4) |

Le Dragon possède Contre-attaque, Esquive 15 % et Défenseur. Le Jarl possède
Overkill, Bouclier et Furie 4. Le Scorpion possède Défenseur et Poison : à son
arrivée, il détruit toutes les créatures blessées des deux camps ; en MOBA,
cette vague reste limitée à sa voie. Il n’a plus Vol de vie.

Le Colosse possède Bouclier et Provocation. À son arrivée, son contrôleur
choisit dans une fenêtre jusqu’à deux Djinns de coût imprimé 3 ou moins à
invoquer spécialement depuis son cimetière. Chaque arrivée déclenche ses effets ;
il peut arrêter après zéro ou une invocation.

La Valkyrie possède Envol et Vol de vie, mais pas Rapidité. À sa mort, son
contrôleur choisit une créature Viking de son cimetière à invoquer spécialement,
y compris une carte d’Ascension. L’Amiral conserve Butin et possède Bouclier et Abordage 5 ; à son
arrivée il fait piocher une carte et ne renvoie plus de créature en main. Le
Serpent donne à une créature alliée choisie un bouclier, +2 ATQ si elle est Sable
et +2 DEF si elle est Eau ; les deux bonus se cumulent si elle est Sable et Eau.

## Quatre soutiens ordinaires

Ce sont des cartes **de deck et de collection**, pas des Ascensions. Leurs
effets produisent des **invocations spéciales**, sans accorder universellement
une deuxième invocation normale. Chaque effet est limité à **une fois par
nom et par tour**, toutes les copies de ce nom confondues.
Les cartes indiquent leurs conditions propres sans répéter ces règles générales ;
les mots-clés des Ascensions sont expliqués par leurs pastilles dans l’aperçu.

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
  Rōnin et Onna-musha nommés, Réanimation, Tiziri et pioche.
- **Serment du Dernier Rempart** — Neige / Ténèbres : deux Berserks des trois
  hivers et deux Jarls au marteau de guerre, avec recherche viking, Ralliement
  des neiges, boucliers et soins.
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
   des sept cartes défile verticalement ; la fenêtre est bornée à 320 px
   et à l’espace réellement disponible.
3. **Cliquer une face ouvre l’aperçu standard** ; consulter ne sélectionne et
   ne paie rien. La réserve adverse est uniquement consultable.
4. **« Préparer l’Ascension »** ferme la fenêtre et ouvre le bandeau du bas. La recette est vérifiée puis les présences les plus faibles parmi les combinaisons légales sont proposées automatiquement.
5. **« Sacrifier et invoquer »** confirme en Duel. En MOBA, **« Choisir l’emplacement »** permet de choisir la case, puis l’annonce ouvre la fenêtre de réponse existante.

**Échap** et le **Retour Android** ferment d’abord la fiche puis la réserve
ou le rituel, sans quitter la partie. Le focus revient à la face puis à la
zone. Un clic extérieur replie la consultation sans voler le focus d’une
saisie. La petite fenêtre n’a pas de piège de tabulation ; la fiche garde sa
navigation modale habituelle. Le rituel accepte Entrée/Espace ; attaques, main et fin de tour y sont neutralisées jusqu’à confirmation ou annulation.

Sur téléphone paysage, la fenêtre reste étroite (132 px, 176 px sur PC).
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

- `rpgAscensionCards.js` : sept définitions hors-deck.
- `rpgAscension.js` : recettes pures, appariement exact des rôles,
  combinaisons, timing, initialisation et routage des retours.
- `rpgAscensionSupports.js`, `rpgRenforts.js` : soutiens ordinaires,
  planification pure des sources, filtrage de résurrection et usages par nom.
- `rpgDuel.js`, `rpgInvocation.js`, `rpgMobaLocal.js` : prix, source autoritaire,
  réservations, renforts, fenêtres de réponse, arrivées et placement cohérent.
- `RpgReserveAscension.jsx`, `rpg-ascension.css` : hook et interface communs,
  fenêtre ancrée, sacrifices proposés automatiquement, focus et aperçus standard.
- Les IA Duel et MOBA évaluent les recettes et les soutiens **sur des copies**,
  sans consommer le hasard réel. La vague du Scorpion et les renforts du Colosse sont évalués dans la simulation. Une voie nettoyée ou défendue par le nouveau corps n’est pas
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
- **Scorpion** : peinture dark fantasy `ascension-duo-v1`.
- **Colosse** : nouvelle peinture dark fantasy `ascension-colosse-necrodjinn-v2`.
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
le bon 3 + 4. Le Jarl accepte deux Vikings 4 aussi bien que 3 + 5.
La scène des soutiens Colosse commence avec l’invocation normale **déjà
consommée**, afin de vérifier le caractère spécial des trois renforts.

Scènes, sondes et transformations Vite sont réservées au serveur de démo :
**aucun import dans le jeu publié ou le build de production**.

**Livraison locale :** aucun commit, push, déploiement ou changement de base
de données n’est effectué par cette intégration.

Le lien **Decks** de la démo ouvre `/decks` : le menu réel permet de choisir
les préconstruits puis de démarrer une partie normale, avec mulligan et réserve
par défaut, sans main ou champ préparés. `?mode=moba` ouvre le sélecteur MOBA.

## Renforts du cimetière et sélection automatique

La Gardienne des sables ensevelis (Sable, coût 4) choisit une créature de coût imprimé 3 ou moins dans son cimetière et l’invoque spécialement et lui donne un bouclier avant son arrivée. Cette capacité est limitée à une fois par tour, toutes ses copies confondues. Les arrivées ciblées des créatures réanimées se résolvent sur une cible légale ; le renfort choisi peut demander cette cible.

La préparation de l’Ascension recherche les combinaisons respectant intégralement la recette, puis sélectionne celle dont la somme des ATQ et PV actuels est la plus faible. Les sacrifices proposés sont affichés avant confirmation ; le serveur revérifie la recette. En MOBA, la destination est choisie après cette confirmation.

La Valkyrie et le Colosse ouvrent une fenêtre réservée à leur contrôleur pour choisir leurs renforts dans le cimetière. Les choix successifs sont sérialisés et les arrivées des créatures invoquées sont résolues.
