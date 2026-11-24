# Sorts et propositions de capacités de créature

Inventaire du catalogue `RPG_DUEL_CARDS` au moment de cette proposition. Il ne
modifie ni les cartes ni les règles. Les « créatures » ci-dessous comprennent
les héros jouables, mais pas les Sites. Les associations sont des propositions
thématiques, pas des liens déjà implémentés entre les cartes.

**Règle retenue pour les associations proposées :** chaque créature ne peut
activer son effet qu'**une seule fois**, et non une fois par tour. L'application
concrète de cette règle aux capacités existantes et le cas d'une créature qui
quitte le jeu puis revient restent à définir et à implémenter.

## Périmètre et lecture

Le catalogue contient **58 cartes de type magie** : 53 sorts examinés ici,
4 contresorts exclus et une arme-sort (Sabre maudit) écartée parce qu'elle
s'équipe comme une arme. Les 24 cartes de type arme ne sont pas incluses.

- **À associer** : proposition d'une créature qui n'a pas déjà de champ
  `activation`. Le sort reste une carte jouable ; aucune capacité n'a été ajoutée.
- **Proche existant** : une capacité activée actuelle ressemble au sort, mais
  le catalogue ne stocke pas d'identifiant reliant cette capacité à ce sort.
  Ce rapprochement est une interprétation, pas la preuve d'une association
  officielle ; les différences importantes sont indiquées. Il faut les vérifier
  avant de considérer le sort comme entièrement couvert.

Il y a **36 propositions nouvelles** et **17 rapprochements existants**. La
frontière entre les deux repose sur cette lecture des effets, pas sur un
registre officiel des sorts déjà confiés. Certains rapprochements n'en
reproduisent qu'une partie : ils figurent quand même ici pour éviter de les
compter à tort comme des équivalences parfaites.

## Braise — 9 sorts

| Sort | Créature proposée ou proche | État et raison |
| --- | --- | --- |
| Confluence des étincelles | Ifrit al-Ahmar, seigneur des braises | À associer — seigneur des Djinns ; invoque les Djinns de la main. |
| Veille des braises | Veilleur des cendres | À associer — veille et retour éphémère depuis la main, proches de son thème de retour éphémère. |
| Frappe d’iaijutsu | Tojiro, le pourfendeur | Proche existant — 2 dégâts à une créature, comme l'effet de base. |
| Feux de kitsune | Oni de la fournaise | Proche existant — dégâts ciblés, mais son activation inflige seulement 2 dégâts à une cible ; le sort offre 4 à une ou 2 à deux. |
| Serment de la forge | Daimyō du Soleil rouge | Proche existant — renfort allié +2/+1 ; son activation actuelle ne donne pas le Coup critique imprimé sur le sort. |
| Trait de braise | La Lionne du midi ardent | À associer — son souffle frappe déjà à l'arrivée ; le sort peut aussi viser un sorcier. |
| Brise-lame | Ifrit furtif | Proche existant — détruit une arme et pioche une carte. |
| Nuage de cendres | Susanoo | À associer — ancre du Lien du sort, avec sa vague et son écho différé. |
| Vent rouge | Tengu du mont ardent | À associer — vents du mont et résonance samouraï ; le Daimyō, ancre du Lien, possède déjà une activation. |

## Sable — 9 sorts

| Sort | Créature proposée ou proche | État et raison |
| --- | --- | --- |
| Éveil des dunes | Dune marchante | À associer — élémental du désert et réveil depuis le deck. |
| Mémoire de l’armurerie | Chercheuse des armes ensevelies | À associer — retrouver une arme au cimetière et l'équiper à un allié. |
| Lettre de marque | Le Chasseur d’Ocracoke | À associer — pirate, Abordage et ancre du Lien. |
| Le Grand Débarquement | La Barbe-Rousse, amiral des deux mers | À associer — amiral, cales occupées et ancre du Lien. |
| Rapport du greffier | Guetteur du beffroi | À associer — rôle de veille et de transmission ; pioche de deux cartes. |
| Rempart de dunes | La Dame aux ailes d’or | À associer — protectrice et ancre du Lien. |
| Tempête de sable | Le Faucon du zénith | À associer — souffle de sable et ancre du Lien. |
| Réanimation | Gardienne des sables ensevelis | À associer — sa capacité d'arrivée réanime déjà une créature, sous des conditions différentes. |
| Voile de la lune noire | Souverain de la lune noire | À associer — même thème de lune noire et protection d'un allié ; l'effet est identique à Parade de verre. |

## Eau — 10 sorts

| Sort | Créature proposée ou proche | État et raison |
| --- | --- | --- |
| Appel des marées | Veilleuse des citernes | À associer — gardienne des eaux, pour le choix d'invocation parmi les trois premières cartes. |
| Haut-fond | Le Kraken | À associer — ancre du Lien et pression des profondeurs. |
| Le Routier | Bakunawa | À associer — ancre du Lien ; pioche puis défausse. |
| Eau de la source | Völva soigneuse | Proche existant — elle soigne son sorcier de 2 PV ; le sort en soigne 4 et son ancre est le Site Source de Bimini. |
| Lame de mer | Le Seigneur des mâchoires | À associer — ancre du Lien et morsure qui peut exiler. |
| Parade de verre | Guetteuse des marées | Proche existant — bouclier sur une créature alliée. |
| Brisure de verre | Vipère de verre | À associer — éclats de verre et dégâts de zone. |
| Ressac | Sorcier du ressac noir | Proche existant — renvoi en main d'une créature. |
| Courant de retour | Léviathan | Proche existant — renvoi en main ; l'activation actuelle ne pioche pas, contrairement au sort. |
| Ressac de la lune noire | Traqueur des nuits sans lune | À associer — thème de la lune noire ; renvoi de toutes les créatures sauf les Vampires. |

## Neige — 14 sorts

| Sort | Créature proposée ou proche | État et raison |
| --- | --- | --- |
| Ralliement des neiges | Valkyrie au corbeau | À associer — rassemblement d'une créature de coût 5 depuis la main. |
| Éclair du marteau | Le Maître du marteau | À associer — son effet d'arrivée inflige déjà 3 dégâts à une créature ou au sorcier. |
| Mur de boucliers | Guerrier au bouclier rond | À associer — thème du mur défensif et renfort collectif. |
| Festin des vaillants | Eirik du Premier Serment | Proche existant — soin de 2 aux alliés et au sorcier ; Eirik est aussi l'ancre du Lien. |
| Brume du fjord | Veilleuse de la lune givrée | À associer — brume et gel de zone, en écho à son gel à l'arrivée. |
| Hurlement du blizzard | Géant des banquises | À associer — ancre du Lien et souffle de givre. |
| Poigne de givre | Valkyrie des glaces | Proche existant — 2 dégâts et gel ciblés ; elle est aussi l'ancre du Lien. |
| Grand Voile blanc | La Dame des Neuf Mondes | À associer — voile protecteur empêchant les dégâts de combat ce tour. |
| Appât de la meute | Archère viking du givre | Proche existant — malus ciblé de −2/+0 pour le tour. |
| Verglas | Le cavalier du ressac gelé | À associer — son arrivée gèle déjà les adversaires ; le sort ajoute 2 dégâts de zone. |
| Défi du Jarl | Jarl au marteau de guerre | À associer — duel entre une créature alliée et une adversaire. |
| Embuscade | Gardien viking du fjord | Proche existant — −2/−2 aux adversaires pour le tour, sans descendre sous 1. |
| Le Grand Hiver | Kagutsuchi, Flamme originelle | Proche existant, **inter-éléments** — dégâts aux autres créatures des deux camps ; son activation inflige 2 au lieu de 1 et épargne la source. À revoir si l'on impose la même couleur. |
| Tempête de foudre et de givre | Le Père des corbeaux | À associer — figure mythique de Neige pour une tempête globale puissante. |

## Ténèbres — 11 sorts

| Sort | Créature proposée ou proche | État et raison |
| --- | --- | --- |
| Retour des ensevelis | Gardienne des derniers noms | À associer — le retour d'une créature Ténèbres depuis le cimetière évoque son invocation à la mort, mais la zone et les conditions diffèrent. |
| Neige noire | Corbeau de givre | À associer — croisement Ténèbres/gel ; destruction des petites créatures des deux camps, puis gel, pour un prix de 3 PV. |
| Effacement des faibles | La Dévoreuse | Proche existant — détruit une cible de coût 2 ou moins ; le sort accepte jusqu'à 3. |
| Le Jugement des colosses | Celui qui juge | À associer — thème du jugement ; destruction ciblée des créatures de coût 4 ou plus. |
| La Dernière Pesée | Le Maître des corbeaux | À associer — figure funèbre pour la destruction totale des deux camps. |
| Papyrus | Scribe de la Liste | Proche existant — pioche une carte ; l'activation ne demande pas les 2 PV du sort. |
| Nom effacé | Lecteur du dernier nom | Proche existant — défausse adverse d'une carte. |
| Offrande de lin | Momie de lin | À associer — thème du lin et tribut accordé aux alliés ; le sort coûte 1 PV. |
| Le Poids | Celle qui pèse | Proche existant — transfert de 1 PV au lieu des 2 du sort, sans le malus supplémentaire de son Lien. |
| Les feuillets | Scribe des feuillets | À associer — il envoie déjà une carte du deck adverse au cimetière à sa mort ; le sort en envoie trois. |
| La Grande Pesée | Gardienne de la balance | À associer — thème de la balance et gain de vie ; transfert, pioche et prix en PV sont à conserver ou à arbitrer. |

## Exclusions et points à trancher avant toute implémentation

- **Contresorts exclus** : Écueil, Contresort des abîmes, Silence d’écume et
  Déflection (`maree-contraire`).
- **Sabre maudit** est une magie dont l'effet est `arme` : exclu de cette liste,
  et non oublié. Aucune arme n'est convertie en capacité ici.
- **État actuel du jeu :** une capacité activée existante est généralement
  utilisable une fois par tour, pendant le tour de son contrôleur, au lieu
  d'attaquer. Cette liste ne change pas encore ce comportement pour appliquer
  la règle retenue d'une seule activation par créature. Une capacité n'est pas
  automatiquement l'équivalent d'une magie rapide, d'un coût en PV, d'un
  choix multiple, d'un effet lié ou d'une invocation depuis une autre zone.
- Les 36 propositions sont des **idées à équilibrer**, pas des capacités
  activées prêtes à jouer. Il faudra préciser prix, cibles, temporalité,
  restrictions d'invocation, effets différés, lien avec l'ancre, protection et
  choix joueur/IA. Même utilisables une seule fois par créature, une destruction
  totale ou une réanimation demandent une décision d'équilibrage.
- La couleur de la créature diffère de celle du sort pour certains
  rapprochements déjà existants ; l'activation utilise normalement la couleur
  de sa créature. Cette différence affecte notamment les protections.
- Le passage au jeu demanderait également de vérifier l'interface, l'IA et les
  modes classique et Conquête, plutôt que de supposer qu'une simple copie des
  données de sort fonctionnera partout.
