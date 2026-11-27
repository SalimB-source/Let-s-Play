# Sorts et propositions de capacités de créature

Inventaire du catalogue `RPG_DUEL_CARDS` au moment de la proposition initiale.
Les « créatures » comprennent les héros jouables, mais pas les Sites.
Les associations proposées sont thématiques et distinctes des Liens imprimés
sur les sorts.

**Règle retenue :** une activation par créature pendant sa présence en jeu.
Une créature qui quitte le jeu puis revient est une nouvelle présence et peut
réutiliser son effet. Les créatures de même nom ont chacune leur propre usage.

**État d'implémentation :** 29 associations sont ajoutées au catalogue et
au moteur classique/PvP, sans appliquer les Liens des sorts. Les sept magies
rapides proposées initialement restent exclues ; aucune proposition ne reste à
associer. Ces 29 sorts ne sont plus des cartes jouables : leur effet est
conservé comme capacité de créature. Leurs anciennes fiches restent uniquement
en archive pour les sauvegardes et effets existants. Dans les decks maison,
leurs exemplaires sont remplacés automatiquement après fusion de la sauvegarde
et du stock, par des cartes possédées dans les couleurs d'origine et dans les
limites d'exemplaires. Le détail du deck indique chaque remplacement ; si le
stock compatible est insuffisant, une place reste à compléter dans l'atelier.
Aucune acquisition n'est effacée. En cas de lecture du compte indisponible,
la migration attend la synchronisation afin de ne pas utiliser un stock partiel.
Les recettes et leçons ne distribuent plus ces sorts. En Conquête, la page et l'IA proposent le Défi du Jarl,
la récupération d'équipement de la Chercheuse, ainsi que Rapport du greffier,
Les feuillets, Le routier et Lettre de marque. Le Bâton des citernes reste exclu
de cette récupération : son jeton exige un placement adapté. Les prix en PV,
invocations, zones et autres activations n'ont pas encore de parcours Conquête
complet et ne sont pas proposés dans cette page.

## Périmètre et lecture

L'inventaire initial contenait **58 cartes de type magie** : 53 sorts examinés ici,
4 contresorts exclus et une arme-sort (Sabre maudit) écartée parce qu'elle
s'équipe comme une arme. Les 24 cartes de type arme ne sont pas incluses.

- **Implémenté** : association ajoutée avec l'effet de base du sort, sans Lien ; la carte du sort est retirée du jeu.
- **Exclu — magie rapide** : le sort reste jouable comme magie rapide,
  y compris en réponse pendant le tour adverse. Une capacité préexistante
  éventuellement ressemblante est conservée, mais ne constitue pas une
  association au sort et ne sera pas modifiée pour le reproduire.
- **Proche existant** : une capacité activée actuelle ressemble au sort, mais
  le catalogue ne stocke pas d'identifiant reliant cette capacité à ce sort.
  Ce rapprochement est une interprétation, pas la preuve d'une association
  officielle ; les différences importantes sont indiquées. Il faut les vérifier
  avant de considérer le sort comme entièrement couvert.

L'inventaire initial contenait **36 propositions nouvelles** : 29 implémentées et 7 exclues
comme magies rapides. Il contenait aussi **17 rapprochements existants**,
dont 8 concernent des magies rapides et ne sont pas des associations. La
frontière entre les deux repose sur cette lecture des effets, pas sur un
registre officiel des sorts déjà confiés. Certains rapprochements n'en
reproduisent qu'une partie : ils figurent quand même ici pour éviter de les
compter à tort comme des équivalences parfaites.

## Braise — 9 sorts

| Sort | Créature proposée ou proche | État et raison |
| --- | --- | --- |
| Confluence des étincelles | Ifrit al-Ahmar, seigneur des braises | Implémenté — les premiers Djinns Braise de coût 1 et 3 depuis la main. |
| Veille des braises | Veilleur des cendres | Implémenté — choix en main d’une créature Braise de coût 3, éphémère. |
| Frappe d’iaijutsu | — | Exclu — Magie rapide : exclue des associations. Capacité préexistante de Tojiro, le pourfendeur conservée, sans association. |
| Feux de kitsune | Oni de la fournaise | Proche existant — dégâts ciblés, mais son activation inflige seulement 2 dégâts à une cible ; le sort offre 4 à une ou 2 à deux. |
| Serment de la forge | Daimyō du Soleil rouge | Proche existant — renfort allié +2/+1 ; son activation actuelle ne donne pas le Coup critique imprimé sur le sort. |
| Trait de braise | — | Exclu — Magie rapide : exclue des associations. |
| Brise-lame | — | Exclu — Magie rapide : exclue des associations. Capacité préexistante de Ifrit furtif conservée, sans association. |
| Nuage de cendres | Susanoo | Implémenté — carré adverse et écho différé, sans Lien. |
| Vent rouge | Tengu du mont ardent | Implémenté — colonne adverse, sans Lien. |

## Sable — 9 sorts

| Sort | Créature proposée ou proche | État et raison |
| --- | --- | --- |
| Éveil des dunes | Dune marchante | Implémenté — premier Élémental Sable de coût 4 depuis la pioche. |
| Mémoire de l’armurerie | Chercheuse des armes ensevelies | Implémenté — choix d’un porteur allié puis d’une arme au cimetière, avec ses règles d’équipement. |
| Lettre de marque | Le Chasseur d’Ocracoke | Implémenté — Abordage de la prochaine créature et pioche, sans Lien. |
| Le Grand Débarquement | La Barbe-Rousse, amiral des deux mers | Implémenté — +2/+2 et Overkill aux cales occupées, sans Lien. |
| Rapport du greffier | Guetteur du beffroi | Implémenté — rôle de veille et de transmission ; pioche de deux cartes. |
| Rempart de dunes | — | Exclu — Magie rapide : exclue des associations. |
| Tempête de sable | Le Faucon du zénith | Implémenté — rangée adverse, sans Lien. |
| Réanimation | Souverain de la lune noire | Implémenté — choix d’une créature à réanimer au cimetière ; créature de coût 6. |
| Voile de la lune noire | — | Exclu — Magie rapide : exclue des associations. |

## Eau — 10 sorts

| Sort | Créature proposée ou proche | État et raison |
| --- | --- | --- |
| Appel des marées | Veilleuse des citernes | Implémenté — choix parmi les trois cartes du dessus et placement des autres dessous. |
| Haut-fond | — | Exclu — Magie rapide : exclue des associations. |
| Le Routier | Bakunawa | Implémenté — pioche de deux puis choix d'une défausse, sans Lien. |
| Eau de la source | Völva soigneuse | Proche existant — elle soigne son sorcier de 2 PV ; le sort en soigne 4 et son ancre est le Site Source de Bimini. |
| Lame de mer | Le Seigneur des mâchoires | Implémenté — −3/−3 à une cible adverse ; exil si sa défense tombe sous 1, sans Lien. |
| Parade de verre | — | Exclu — Magie rapide : exclue des associations. Capacité préexistante de Guetteuse des marées conservée, sans association. |
| Brisure de verre | — | Exclu — Magie rapide : exclue des associations. |
| Ressac | — | Exclu — Magie rapide : exclue des associations. Capacité préexistante de Sorcier du ressac noir conservée, sans association. |
| Courant de retour | Léviathan | Proche existant — renvoi en main ; l'activation actuelle ne pioche pas, contrairement au sort. |
| Ressac de la lune noire | Traqueur des nuits sans lune | Implémenté — renvoi dans une rangée choisie, Vampires épargnés. |

## Neige — 14 sorts

| Sort | Créature proposée ou proche | État et raison |
| --- | --- | --- |
| Ralliement des neiges | Valkyrie au corbeau | Implémenté — choix en main d’une créature de coût 5. |
| Éclair du marteau | — | Exclu — Magie rapide : exclue des associations. |
| Mur de boucliers | Drakkar à tête de dragon | Implémenté — +2/+0 et Overkill pour le tour ; créature de coût 5. |
| Festin des vaillants | Eirik du Premier Serment | Proche existant — soin de 2 aux alliés et au sorcier ; Eirik est aussi l'ancre du Lien. |
| Brume du fjord | Veilleuse de la lune givrée | Implémenté — rangée adverse et 15 % de chances de gel, sans Lien. |
| Hurlement du blizzard | Géant des banquises | Implémenté — colonne adverse et 15 % de chances de gel, sans Lien. |
| Poigne de givre | — | Exclu — Magie rapide : exclue des associations. Capacité préexistante de Valkyrie des glaces conservée, sans association. |
| Grand Voile blanc | — | Exclu — Magie rapide : exclue des associations. |
| Appât de la meute | — | Exclu — Magie rapide : exclue des associations. Capacité préexistante de Archère viking du givre conservée, sans association. |
| Verglas | Le cavalier du ressac gelé | Implémenté — carré adverse, dégâts et gel, sans Lien. |
| Défi du Jarl | Jarl au marteau de guerre | Implémenté — deux cibles choisies, une créature alliée et une adverse, se combattent. |
| Embuscade | Gardien viking du fjord | Proche existant — −2/−2 aux adversaires pour le tour, sans descendre sous 1. |
| Le Grand Hiver | Kagutsuchi, Flamme originelle | Proche existant, **inter-éléments** — dégâts aux autres créatures des deux camps ; son activation inflige 2 au lieu de 1 et épargne la source. À revoir si l'on impose la même couleur. |
| Tempête de foudre et de givre | Le Père des corbeaux | Implémenté — colonne des deux camps, source comprise, sans Lien. |

## Ténèbres — 11 sorts

| Sort | Créature proposée ou proche | État et raison |
| --- | --- | --- |
| Retour des ensevelis | Gardienne des derniers noms | Implémenté — choix au cimetière d’une créature Ténèbres non-Ascension de coût 3 ou moins. |
| Neige noire | Valkyrie des neuf nuits | Implémenté — prix de 3 PV ; dans un carré choisi, destruction des créatures de coût 3 ou moins, puis gel des survivantes. Créature de coût 5, plutôt que le Corbeau de coût 2 proposé initialement. |
| Effacement des faibles | La Dévoreuse | Proche existant — détruit une cible de coût 2 ou moins ; le sort accepte jusqu'à 3. |
| Le Jugement des colosses | Celui qui juge | Implémenté — thème du jugement ; destruction ciblée des créatures de coût 4 ou plus. |
| La Dernière Pesée | Le Maître des corbeaux | Implémenté — destruction des deux camps ; coût imprimé de la créature : 7. |
| Papyrus | — | Exclu — Magie rapide : exclue des associations. Capacité préexistante de Scribe de la Liste conservée, sans association. |
| Nom effacé | Lecteur du dernier nom | Proche existant — défausse adverse d'une carte. |
| Offrande de lin | Momie de lin | Implémenté — prix de 1 PV, +1/+0 et Tribut 1 pour le tour. |
| Le Poids | — | Exclu — Magie rapide : exclue des associations. Capacité préexistante de Celle qui pèse conservée, sans association. |
| Les feuillets | Scribe des feuillets | Implémenté — il envoie déjà une carte du deck adverse au cimetière à sa mort ; le sort en envoie trois. |
| La Grande Pesée | Le Passeur au masque de chacal | Implémenté — prix de 1 PV, transfert de 3 et pioche de deux, sans Lien ; coût imprimé de la créature : 6. |

## Exclusions et points à trancher avant toute implémentation

- **Magies rapides exclues** : tous les sorts jouables en réponse pendant le
  tour adverse restent des magies rapides et ne sont pas associés aux créatures.
  Les capacités préexistantes similaires demeurent indépendantes des sorts.
- **Contresorts exclus** : Écueil, Contresort des abîmes, Silence d’écume et
  Déflection (`maree-contraire`).
- **Sabre maudit** est une magie dont l'effet est `arme` : exclu de cette liste,
  et non oublié. Aucune arme n'est convertie en capacité ici.
- Une activation de créature est utilisable une fois par présence en jeu,
  pendant le tour de son contrôleur, au lieu d'attaquer. Les nouvelles
  associations implémentées utilisent l'effet de base, sans les Liens.
- La couleur de la créature diffère de celle du sort pour certains
  rapprochements déjà existants ; l'activation utilise normalement la couleur
  de sa créature. Cette différence affecte notamment les protections.
- Les parcours IA et PvP classique sont testés ; les choix interactifs restent
  à vérifier visuellement. Les parcours Conquête partiels ci-dessus ont des tests
  moteur et d'interface JSDOM ; les autres restent à adapter et à tester.
