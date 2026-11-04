# Auto-école : exercices routiers fermés

Accessible via `/jeu/vice-city-rush`. L’accueil ouvre l’auto-école, qui comprend désormais **23 situations fermées**, et propose un accès séparé à la **conduite libre**. Aucun examen ouvert sur toute la ville n’est proposé.

## Contrat d'un exercice

`drivingExercises.js` définit, pour chaque exercice :
- une section rectangulaire distincte de la carte existante (`bounds`) ;
- une position et une orientation de départ dans la voie de droite (`spawn`) ;
- une limite réglementaire, une allure conseillée distincte et une durée maximale ;
- des actions successives (`stages`) avec consignes et conditions de validation.

Les cinq exercices de base :
1. Démarrage et arrêt : rue X=100, au nord, arrêt maintenu une seconde.
2. Dos d'âne : rue X=-200, franchissement lent puis arrêt final.
3. Feu : carrefour (-100, -100), arrêt au rouge et passage au vert si la voie est libre.
4. STOP : carrefour sans feux (-300, -200), arrêt avant la ligne puis traversée.
5. Arrêt de précision : rue X=200, zone de rayon 2,5 m, arrêt de deux secondes.

La voiture et la caméra sont placées directement au départ. Les plans de coupe
WebGL masquent toute la ville extérieure à la section, y compris les objets
instanciés. Des barrières matérialisent le périmètre et les déplacements sont
bloqués avant celui-ci avec une marge pour la carrosserie. La minicarte dessine
uniquement la section, son départ bleu et l'objectif vert.

Le moteur réutilise encore les données de la ville entière en mémoire ; ce
n'est pas un chargement indépendant de chaque morceau de carte.

Les véhicules ambiants sont désactivés et les voitures garées dans la section
sont masquées et exclues des collisions. Le mode guidé montre les fautes pendant
l'exercice ; le mode évaluation les présente au bilan. Les deux utilisent la
même section, pas un parcours ouvert. Fin automatique après l'action finale,
expiration du temps ou sortie détectée de la section. Quitter affiche un bilan
interrompu ; recommencer replace la voiture au départ sans conserver son état.

## Validation

Un passage dans un repère ne suffit pas pour un arrêt : vitesse < 1 km/h,
rayon de 4 m (2,5 m pour la précision) et maintien d'une ou deux secondes.
Le compteur se réinitialise dès que la voiture roule ou quitte le repère.
L'objectif du feu attend la phase verte du même cycle que les feux 3D ; il
n'impose plus un arrêt artificiel si le feu est déjà vert.
Le ralentisseur exige un franchissement dans le bon sens à 20 km/h maximum,
comme le panneau posé dans cette section, avant l'objectif d'arrêt final.

Le bilan conserve les sanctions pour vitesse excessive, collisions, feux rouges,
STOP non marqué. Un dépassement du 20 signalé au ralentisseur est un excès de vitesse, sans double pénalité spécifique. Réussite : toutes les actions,
score >= 70/100, aucune faute éliminatoire. Les durées d'arrêt sont des tolérances
pédagogiques, pas des prescriptions réglementaires universelles.

## Signalisation et conduite à droite

`schoolSignLayout()` calcule les panneaux à partir de l'obstacle et du sens
d'approche : accotement droit à 7,9 m de l'axe, face au conducteur, dos gris.
Formes/pictogrammes internationaux courants, sans homologation nationale.
- Danger ralentisseur 30 m en amont sur cette carte urbaine à échelle réduite.
- Limite 20 à 18 m avant, reprise 50 à 18 m après (les panneaux et la détection utilisent la même section).
- STOP à la ligne d'arrêt à 18 m du centre du carrefour sans feux.
- Cédez-le-passage 30 m avant le centre du rond-point de rayon 25 m.
- Signal de position du passage piéton 3 m avant les bandes.

Seuls les équipements à l'intérieur de la section sont visibles. Le rond-point
et les places de stationnement subsistent dans les données, mais ne sont pas
proposés comme exercices actuellement. Conduite à droite pour les dix-neuf exercices, cockpit à volant à
gauche, feux et marquages orientés selon les approches droites.

## Limites et tests

Simulation non homologuée. Pas de piétons traversant, de contrôle des angles
morts/rétroviseurs, de clignotants ni de priorité face à d'autres usagers évalués.
Une séance de conduite sur les appareils cibles reste nécessaire pour ajuster
la lisibilité et la difficulté.

`node --test tests/driving-school.test.js tests/vice-city-traffic.test.js`

Les tests couvrent les sections distinctes, les départs et objectifs intérieurs,
les arrêts maintenus/réinitialisés, l'attente du vert, le ralentisseur non
contournable, la fin automatique, le délai, la sortie de zone et les règles.

## Exercices de priorité français (06 à 09)

Quatre scénarios supplémentaires, originaux et non issus de la banque officielle
ETG, sont fondés sur le chapitre V du Code de la route français :
https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074228/LEGISCTA000006159602/

- **06, R415-5** : priorité à droite à (100, 100), sans feux ni signalisation de
  priorité. Une voiture vient de la droite du joueur.
- **07, R415-7** : cédez-le-passage à (100, -100). Une voiture vient de la gauche
  sur la route abordée ; l'arrêt n'est pas une condition systématique de réussite.
- **08, R415-6** : STOP à (-100, 200). Arrêt complet puis passage de deux
  voitures de directions opposées. Le deuxième véhicule démarre avec un décalage.
- **09, R415-10** : céder à la voiture déjà dans le giratoire (200, 200), entrer
  et suivre l'anneau dans le sens antihoraire, puis sortir et s'arrêter.

Ressource de synthèse de la Sécurité routière :
https://www.securite-routiere.gouv.fr/reglementation-liee-la-route/intersections-et-priorites

**Important** : ces exercices français sont explicitement en conduite à droite,
avec volant à gauche et panneaux sur l'accotement droit. Les exercices de base
01–05 sont également à droite. L'interface indique la conduite à droite
sur les cartes, la consigne et le HUD ; une priorité française
est sélectionnée par défaut. Un giratoire avec cédez-le-passage n'est pas assimilé
à tous les ronds-points, dont le régime peut être différent.

### Mécanique

`frenchPriorityExercises.js` partage les trajectoires entre les véhicules 3D,
la minicarte et l'évaluateur. Le trafic se déclenche quand le joueur approche,
pas au lancement d'un chronomètre indépendant. Les acteurs roulent sur leur voie
droite et restent dans la section. Les feux préexistants du carrefour concerné
sont retirés et les panneaux du scénario remplacent le décor pédagogique de base.

Le franchissement de la limite d'engagement (au pare-chocs avant approximé) avant
la libération du conflit est une faute éliminatoire. Au STOP il faut aussi avoir
marqué l'arrêt, même si tous les véhicules sont passés. La seconde d'arrêt reste
une tolérance pédagogique, pas une durée imposée par le texte légal. Le scénario
giratoire détecte aussi la circulation à contresens. Les acteurs ont une collision
physique ; leurs mouvements sont déterministes et ne constituent pas une IA de
circulation générale. Les clignotants et les contrôles visuels restent non notés.

Chaque bilan contient le corrigé et le lien vers l'article concerné.

### Vérifications supplémentaires

`node --test tests/driving-school.test.js tests/french-priority.test.js tests/vice-city-traffic.test.js`

Tests des acteurs, du déclenchement à l'approche, du refus de priorité, du STOP
sans trafic, des deux directions, du cédez-le-passage sans arrêt obligatoire et
du sens de circulation giratoire. Vérification navigateur du démarrage et du
retour au bilan des quatre scénarios, sans exception JavaScript. Cette passe a
également corrigé l'ordre géométrie/matériau de deux InstancedMesh existants et
la superposition de la consigne avec le jeu et le pied de page du site.

La migration de tous les exercices vers la droite déplace également les départs
et tous les objectifs des exercices 01–05, les panneaux et lignes d’arrêt.
Les tests contrôlent le côté des voies et des panneaux pour éviter une simple
modification des libellés sans adaptation de la carte.


## Limites réglementaires et alerte rouge

Référence officielle (régime urbain utilisé par les exercices) :
https://www.securite-routiere.gouv.fr/reglementation-liee-aux-risques/reglementation-de-la-vitesse-au-volant

Les sections sont en agglomération : 50 km/h sans prescription différente, 20
uniquement entre les panneaux de la section aménagée du ralentisseur. Ce 20 est
un choix de signalisation locale dans la simulation, pas une règle nationale
pour tous les dos d'âne. Ni une intersection ni un giratoire n'impose à elle seule
un plafond national de 30/20 ; l'allure doit néanmoins être adaptée aux dangers.

Chaque exercice conserve une `advisorySpeed` (30 ou 20) comme simple conseil,
indépendant de `limit` (50) et de la restriction locale. Dépasser le conseil sous
la vitesse maximale autorisée ne produit ni alerte rouge ni faute de vitesse.
Les conditions d'arrêt maintenu à l'arrivée restent des objectifs pédagogiques.

`drivingSpeedStatus` fournit la même limite au moniteur, au bilan et à l'alerte.
Dès que la télémétrie dépasse la limite, sans tolérance artificielle de 3 km/h ou
attente de deux secondes, une bannière rouge et un cadre rouge sont affichés.
La bannière indique la vitesse et le maximum, sans clignotement ni interception
des commandes ; elle disparaît dès que la voiture revient à la limite ou en
 dessous. Elle fonctionne aussi pendant l'évaluation. Le score pédagogique retire
10 points une seule fois par épisode continu ; ce n'est pas le barème légal des
amendes ou des points du permis.

Tests additionnels : `tests/driving-speed-rules.test.js`. Vérification navigateur
par injection de télémétrie de test : 51 km/h -> alerte/cadre ; 50 -> disparition ;
40 -> pas d'alerte malgré le conseil à 30, sans exception JavaScript.

## Aspect des passages piétons

`roadCrosswalks.js` partage le même rendu entre les croisements de la ville et
les traversées propres aux exercices : onze bandes blanches régulières, de
0,6 m sur 4 m, disposées tous les 1,2 m sur la largeur de la chaussée. Il s'agit
des dimensions visuelles de cette carte, sans certification réglementaire.
Peinture mate légèrement granuleuse, éclairage et ombres, test de profondeur
actif et léger décalage anti-scintillement. Les sommets suivent le relief de la
route ; les bandes ne flottent pas et ne passent pas par-dessus les véhicules.
Les géométries sont regroupées pour limiter les appels de rendu. Aux entrées du
giratoire, les passages restent hors de l'anneau, à 32 m du centre.
Tests géométriques et matériaux : `tests/road-crosswalks.test.js`.

## Trottoirs du giratoire

Les trottoirs rectilignes et leurs bordures sont découpés avant l'emprise du
rond-point, avec une marge de 25 cm. Les dalles et pavés d'angle qui débordaient
sur l'anneau sont exclus. Les régions physiques des trottoirs correspondent aux
segments conservés, et la voiture suit le niveau du plateau routier dans le
giratoire : pas de marche de trottoir invisible. Les rues d'accès et l'îlot
central restent inchangés. Tests : `tests/roundabout-sidewalks.test.js`.

La dalle cylindrique sombre sous le giratoire a également été remplacée par
une surface de carrefour plane partageant le matériau et les UV de l'asphalte
des rues : plus de flanc noir ni de disque circulaire surélevé. La hauteur de
conduite suit cette surface ; les trottoirs extérieurs conservés gardent leur
propre hauteur. Tests : `tests/roundabout-road-surface.test.js`.

## Nettoyage des traits dans les exercices

Les lignes ordinaires des rues ne traversent plus l'anneau du giratoire.
Les longues séparations de stationnement sont découpées à son approche et les
petites barres de places de parking sont retirées de toute section d'exercice,
comme les voitures garées qu'elles desservaient. Les marquages ordinaires sont
blancs. Les passages piétons, lignes de cédez-le-passage et flèches pédagogiques
restent générés séparément et ne sont pas retirés par ce filtre.
Tests : `tests/driving-road-markings.test.js`.

## Ligne de guidage bleue

Chaque exercice affiche une ligne bleue continue de 22 cm sur la chaussée,
du départ jusqu'à l'arrivée, en passant par ses objectifs. Elle suit le relief,
reste masquée par la voiture et complète les cercles existants sans les remplacer.
Le giratoire utilise une trajectoire incurvée sur l'anneau, dans le sens de
circulation, sans couper l'îlot. Le même parcours apparaît sur la minicarte.
Ce guidage pédagogique ne remplace ni la signalisation ni les règles de priorité.
Tests : `tests/driving-route.test.js`.

## Voiture d'exercice plus lente

En Auto-école (guidé et évaluation), la voiture est plafonnée à 50 km/h,
avec une accélération maximale de 2 m/s² et une marche arrière de 7,2 km/h.
Ce réglage mécanique s'applique à tous les exercices, sans changer le freinage,
les limitations légales, les alertes ni les performances en conduite libre.
Tests : `tests/driving-school-vehicle.test.js`.

Sur demande, le bandeau rouge et le cadre rouge ont désormais un seuil visuel
unique strictement supérieur à 50 km/h. Ils ne s'affichent pas au dépassement de
20 km/h. Les panneaux locaux, consignes du dos d'âne et règles de notation restent
inchangés : ce seuil d'affichage ne modifie pas la limitation signalée.


## Situations supplémentaires (10 à 13)

Le catalogue conserve 13 exercices, en mode guidé et en évaluation, chacun sur
sa section distincte et fermée de la carte existante. Les ateliers abstraits
ajoutés précédemment ont été remplacés par des situations avec acteurs visibles :

- **10 · Laisser traverser un piéton** : passage piéton dédié, personne animée
  qui traverse, attente hors des bandes puis franchissement. Refuser la priorité
  est éliminatoire.
- **11 · Contourner un véhicule immobilisé** : véhicule réellement bloquant dans
  la voie, voiture venant en face, attente puis déport temporaire à gauche et
  retour dans la voie de droite. S'engager trop tôt est éliminatoire.
- **12 · Tourner à droite** : feu existant au carrefour (300, −100), trajectoire
  incurvée sur la chaussée, respect du feu puis alignement dans la nouvelle voie.
- **13 · Traverser une route à double sens** : cédez-le-passage sans feux,
  deux voitures arrivant de côtés opposés avec un décalage temporel ; attendre
  que les deux sens soient dégagés avant de traverser.

Les acteurs, leurs déplacements, collisions et règles de priorité sont partagés
entre rendu et validation. Les cas d’attente ne sont pas validés tant que les
acteurs prioritaires n’ont pas dégagé. Les contrôles visuels et clignotants de
la conduite réelle restent rappelés, mais ne sont pas évalués automatiquement.

## Guidage GPS sans trace arrière

La ligne bleue représente désormais uniquement l’itinéraire restant. Son début
avance avec la progression du véhicule et commence au-delà du pare-chocs avant,
avec une marge de trois mètres le long du parcours. La partie déjà parcourue
est masquée, sans recréer le maillage à chaque image. Les courbes du giratoire
et des virages restent visibles devant : ce n’est ni une traînée derrière la
voiture ni une droite qui coupe les trottoirs. La minicarte affiche elle aussi
le trajet restant, et les cercles d’arrêt sont conservés.

Tests : `tests/additional-driving-exercises.test.js`, `tests/driving-route.test.js`,
et tests communs de priorité, de sections distinctes et de passages piétons.

## Passage piéton avant le feu et clignotants automatiques

L'exercice 10 utilise maintenant le carrefour existant (300, −300), avec ses
vrais feux conservés. Son passage piéton est placé à z = −278, juste avant le
feu suspendu à z = −282 dans le sens de l'approche. Le passage standard à
z = −286 est remplacé pour cet exercice seulement. Le générateur des passages
spécifiques reçoit bien les onze bandes, et non une unique bande centrale.
Le piéton part du trottoir droit (x = 310) et traverse vers la gauche (x = 290).
Après l'avoir laissé passer, le conducteur doit attendre le vert avant de
franchir le passage. Les zones d'attente restent avant les bandes.

Les clignotants de la voiture s'allument automatiquement : à droite avant le
virage de l'exercice 12, à gauche pour se déporter dans l'exercice 11 puis à
droite pour reprendre sa voie, et à droite avant la sortie du giratoire.
Ils s'éteignent après la manœuvre. Aucun clignotant gauche artificiel n'est
activé à l'entrée du parcours tout droit du giratoire. Chaque côté possède
des feux orange avant/arrière et un répétiteur latéral synchronisés (période
0,7 seconde), plus des flèches de tableau de bord visibles en vue cockpit.
Les approches rectilignes et l'attente du piéton n'allument aucun clignotant.

Tests : `tests/driving-school-indicators.test.js` et
`tests/additional-driving-exercises.test.js`.

## Consignes express pendant la conduite

Le panneau en exercice affiche une seule consigne courte par étape (12 mots et
85 caractères maximum), la distance et la vitesse maximale. Les paragraphes
sur l'allure conseillée, la légende et les rappels de priorité sont retirés du
panneau pour éviter les doublons. L'étape, le chrono, le score et le maintien
d'arrêt restent compacts. Les erreurs restent rouges ; les explications
complètes restent disponibles avant l'exercice et dans les corrections du bilan.
Les règles, limitations et conditions de validation ne sont pas modifiées.
Tests : `tests/driving-instructions.test.js`.

Le piéton conserve désormais le cap Three.js correspondant à sa marche (face
locale −Z), sans inversion de rotation. Ses pas et balancements de bras suivent
la distance parcourue et continuent jusqu'au trottoir, même après libération
de la voie. La minicarte est en bas à gauche en Auto-école ; les clignotants
sont au-dessus, avec de l'espace réservé sous le panneau de consigne.
Tests : `tests/driving-school-pedestrian.test.js`.

## Première amélioration : situations réactives

Les consignes courtes sont calculées depuis l'état réel de validation :
approche, attente d'un usager prioritaire, STOP encore à marquer, voie dégagée,
phase rouge/orange/verte et maintien d'arrêt. Elles restent limitées à douze mots.
Le passage piéton de l'exercice 10 ne donne jamais une consigne d'avancer si le
piéton a terminé mais que le feu reste rouge. Une voiture qui freine après une
incursion dangereuse ne donne pas la priorité au joueur.

À chaque lancement ou redémarrage depuis l'interface, les vitesses des acteurs
mobiles varient de −10 % à +10 % et leur délai de départ de 0 à 1,2 seconde.
La variation est toujours calculée depuis le catalogue d'origine, sans dérive
cumulative après plusieurs redémarrages. Aucun chemin, panneau, limite, obstacle
immobilisé ni point de départ n'est déplacé. Les acteurs ne démarrent toujours
qu'à l'approche du joueur. Le rendu et le contrôle utilisent le même scénario.

Les voitures prioritaires ralentissent ou s'arrêtent si le joueur leur coupe
la route à courte distance. Leur progression utilise une horloge ralentie
partagée entre le rendu, les roues, la minicarte et le contrôle des priorités.
La progression ne recule pas lors d'une mise à jour de télémétrie ; un véhicule
sur la voie opposée suffisamment séparée ne freine pas inutilement. Cela ne
remplace pas une simulation complète de trafic routier.

Chaque faute conserve sa position, l'étape, la vitesse et la distance parcourue.
Le bilan affiche une explication précise et un conseil de correction, sans
alourdir le panneau pendant la conduite. Le GPS et les clignotants automatiques
restent disponibles dans les deux modes ; aucun nouvel exercice ni mode examen
manuel n'est introduit dans cette première amélioration.

Tests : `tests/driving-live-improvements.test.js` ; suite Auto-école : 100 tests.
Vérification navigateur : approche → attente, refus de priorité et correction
sur le bilan, sans erreur JavaScript.

## Marge de vitesse demandée

La notation accepte désormais jusqu'à +3 km/h inclus au-dessus du panneau :
53 km/h dans une section à 50 et 23 km/h dans une section à 20. Cette marge est
purement pédagogique : `limit` et le dépassement légal `overspeed` restent basés
sur les panneaux ; `penalizedOverspeed` pilote le retrait de points. Le maintien
d'une seule pénalité par épisode utilise aussi ce seuil. La validation du dos
d'âne accepte la même marge pour ne pas bloquer malgré l'absence de pénalité.
Le bandeau rouge reste désactivé au seuil local de 20, et ne s'allume qu'au-delà
de 53 km/h. La voiture demeure mécaniquement plafonnée à 50 km/h.


## Situations réelles 14 à 16

Le catalogue passe à **16 exercices**. Trois portions supplémentaires, sans
chevauchement avec les sections précédentes, utilisent les carrefours existants :

| Exercice | Section | Décision validée |
| --- | --- | --- |
| 14 · Tourner à gauche avec circulation | (200, 100) | Respecter le feu, puis laisser passer le véhicule en face avant de tourner. |
| 15 · Ne pas bloquer un carrefour | (−200, 100) | Attendre même au vert tant que le véhicule en sortie ne laisse pas assez de place. |
| 16 · Tourner sans couper un cycliste | (100, 300) | Respecter le feu, puis laisser le cycliste à droite dépasser la zone de conflit. |

Les refus de priorité et l'entrée dans le carrefour encombré donnent des fautes
éliminatoires spécifiques avec correction au bilan. Le cas 15 exige à la fois
une sortie dégagée et un feu vert au repère d'attente ; la présence du vert ne
suffit pas à valider l'objectif. Les cas 14 et 16 distinguent le feu d'entrée du
contrôle de priorité avant le virage. Une fois engagé, le conducteur termine
sa manœuvre lorsque le conflit est dégagé, sans attendre un nouveau vert à
l'intérieur du carrefour.

Le cycliste dispose d'un vélo 3D (cadre, deux roues, guidon, selle) et d'un
cycliste casqué, assis et animé suivant la distance parcourue. Le véhicule
opposé et le cycliste respectent leurs feux d'entrée. Ils ne traversent pas
au rouge avant de laisser le joueur prendre sa décision. Les modèles, cartes,
contrôles de priorité et collisions utilisent les mêmes positions et horaires.

Les guides GPS suivent des courbes sur l'asphalte, sans couper les trottoirs.
Les cercles d'attente et d'arrêt ne chevauchent pas les passages piétons.
Clignotant gauche automatique pour le cas 14, droit pour le 16, aucun clignotant
pour le trajet rectiligne du 15. Les consignes gardent un maximum de 12 mots.
La limitation à 50 et la marge pédagogique de +3 km/h restent inchangées.

Tests : `tests/real-situation-exercises.test.js` et suite commune Auto-école
(111 tests). Lancement des trois situations vérifié dans Chromium sans erreur
JavaScript. Les contrôles de rétroviseurs et d'angle mort ne sont pas évalués.


## Insertion : exercices 17 et 18

Le catalogue compte 18 exercices. La nouvelle série choisie couvre :

- **17 · Sortir d’un stationnement**, sur la rue x = −300 entre z = −184 et
  z = −122 : place peinte ouverte vers la chaussée, panneau P, voiture venant
  de l’arrière dans la voie à rejoindre. Attendre son passage, sortir doucement
  puis s’aligner. Référence : R415-9.
- **18 · Changer de voie sans gêner**, sur la rue z = −100 entre x = −292 et
  x = −215 : deux voies vers l’est, séparateur discontinu et flèches de même
  sens. Une voiture approche dans la voie gauche ; attendre un créneau puis
  se déporter, sans franchir l’axe vers le sens opposé. Référence signalement :
  R412-10. Un clignotant ne donne pas la priorité.

Les deux scènes ont un clignotant gauche automatique (éteint après insertion),
un guide GPS, des consignes courtes et une validation de priorité. Les limites
latérales utilisent une petite garde de carrosserie dédiée, au lieu d’appliquer
le pare-chocs avant de 2,6 m à un déplacement latéral. Une insertion trop tôt
est éliminatoire et donne une correction spécifique au bilan. Un véhicule qui
passe normalement à côté de la place ne freine pas inutilement derrière le
joueur, pour ne pas bloquer l’exercice. Les variantes de vitesse et de délai
restent partagées entre rendu et notation.

Les portions sont distinctes des seize autres exercices. Les contrôles visuels
rétroviseurs/angle mort sont rappelés avant l’exercice, mais ne sont pas mesurés
automatiquement. La limitation à 50 et la marge de notation +3 restent inchangées.
Tests : `tests/driving-merge-exercises.test.js` ; suite Auto-école : 117 tests.
Les deux scènes et leurs clignotants ont été lancés dans Chromium sans erreur.


## 19 · Choisir le stationnement autorisé

Nouvelle portion fermée de la rue x = −200, de z = 218 à z = 290,
parcourue vers le sud en conduite à droite. Le catalogue compte 19 exercices.

1. Un panneau B6a1 (disque bleu, bord rouge, une seule diagonale rouge) interdit
   le stationnement à partir de z = 234. Un panonceau d’étendue de 20 m limite
   explicitement cette première zone, également repérée par une ligne jaune
   discontinue côté bordure. Ce n’est pas un panneau d’interdiction de tout arrêt.
2. Plus loin, après cette zone, un panneau P et une place blanche signalent
   l’emplacement autorisé, centré en (−205,1 ; 274). Le joueur doit s’y garer.

Le guide passe d’abord dans la voie, sans inviter à s’arrêter dans la zone
interdite, puis rejoint la deuxième place. Le clignotant droit s’allume avant
la manœuvre. La réussite exige la voiture alignée et entièrement contenue
(d’après son empreinte pédagogique) dans la deuxième place, avec un maintien
de deux secondes. La simple proximité du cercle ne suffit pas.

Une tentative de stationnement immobile de trois secondes côté bordure dans
la première zone donne une faute éliminatoire et une correction indiquant le
panneau P. Les arrêts brefs et l’attente dans la voie ne sont pas assimilés à un
stationnement interdit. Les trois secondes servent seulement à reconnaître une
tentative dans cette simulation sans commande moteur : ce n’est pas une durée
légale distinguant arrêt et stationnement. Les règles et limitations de vitesse
ne changent pas.

Tests : `tests/parking-choice-exercise.test.js` ; suite Auto-école : 126 tests.
Lancement et réussite dans la deuxième place vérifiés dans Chromium sans erreur.

## Clarification de l’exercice 15

L’exercice s’appelle désormais **Feu vert, mais sortie bloquée** et sépare
explicitement trois étapes : avancer jusqu’au cercle avant le carrefour,
attendre que le taxi libère la sortie, puis traverser au vert et rejoindre
le cercle final. Il ne demande plus d’attendre dès le point de départ.

Un repère pédagogique « SORTIE BLOQUÉE » au-dessus du taxi désigne le véhicule
à observer ; il disparaît quand celui-ci a dégagé. Ce n’est pas un panneau
routier. Le taxi n’entame son attente puis son départ qu’après l’arrivée du
joueur au cercle et l’apparition du vert : la situation ne se résout plus
avant que le conducteur ait pu la voir. Il attend deux secondes, puis libère
la sortie en environ trois secondes, hors variation de circulation.

Consignes successives courtes : « Avancez jusqu’au cercle avant le carrefour »,
« Feu vert : attendez que le taxi libère la sortie », puis « Sortie libre et
feu vert : traversez ». Une sortie dégagée avec un feu rouge donne au contraire
« Sortie libre. Attendez le feu vert ». Les règles et fautes restent inchangées.
Tests : `tests/blocked-junction-clarity.test.js` ; suite Auto-école : 129 tests.

### Rétroviseurs latéraux en direct
Deux vues gauche/droite sont affichées pendant tous les exercices, en caméra extérieure comme en cockpit. Chaque rétroviseur possède sa propre caméra 3D orientée vers l’arrière et légèrement vers le côté correspondant ; le rétroviseur intérieur existant est conservé. Les images sont inversées horizontalement comme un miroir, avec correction du sens vertical des pixels WebGL. Les captures de 256 × 128 pixels alternent à intervalles minimaux de 60 ms pour limiter la charge. Les cibles de rendu sont libérées à la fermeture/reprise ; un échec affiche « Vue indisponible » sans interrompre l’exercice.

Validation : 121 tests ciblés réussis, dont 4 nouveaux tests sur les caméras, l’inversion, la limitation de fréquence, la restauration après erreur et la libération des ressources ; compilation réussie. Vérification navigateur : deux images non vides et distinctes (170 et 310 couleurs), présentes en cockpit, sans erreur JavaScript ; affichage mobile 360 × 640 vérifié. Les rétroviseurs facilitent les contrôles mais ne remplacent pas la vérification des angles morts.

### Retours sonores pendant les exercices
Un carillon ascendant accompagne chaque progression d’étape, y compris la dernière. Deux notes graves descendantes signalent l’apparition d’une faute. Les sons sont déclenchés par les transitions de la simulation, sans répétition sur les télémétries suivantes ; si faute et validation arrivent ensemble, le son d’erreur est prioritaire. Le réglage SON ON/OFF existant est respecté. Le contexte Web Audio est activé au clic de lancement/recommencement et libéré en quittant la page ; une indisponibilité audio n’interrompt jamais l’exercice. Quatre tests dédiés couvrent transitions, absence de répétition, distinction des sons, coupure du son et absence de support audio ; 16 tests ciblés et compilation réussis.

### Bandeau pleine largeur hors de la scène
Le brief occupe désormais une ligne de mise en page au-dessus du rendu 3D, et non une carte superposée à la route. La scène et son ratio de caméra s’adaptent automatiquement à l’espace restant via le ResizeObserver existant. Consigne courte, étape, limite, distance et bouton Recommencer restent visibles ; le titre complet et les actions secondaires se trouvent dans les détails. Les fautes restent rouges et visibles. La navigation du site est masquée uniquement durant l’exercice pour ne pas intercepter les boutons du bandeau.
Validation navigateur des dimensions : bandeau sur toute la largeur, aucune intersection avec la scène, aucun débordement horizontal en 1440 × 900 (hauteur 45 px), 700 × 480 (71 px) et 360 × 640 (115 px). Bouton Recommencer présent dans les limites du bandeau. 16 tests ciblés réussis ; compilation réussie.

### Halo jaune pédagogique ciblé
Les panneaux situés dans la section de l’exercice reçoivent un halo jaune local. Les piétons du scénario sont entourés d’un halo qui suit leur déplacement et disparaît une fois la traversée dégagée. Pour les exercices avec feu, seul le portique de l’approche du joueur (intersection, axe et côté correspondants) et son boîtier sont mis en évidence. Les couleurs et le fonctionnement des lentilles restent inchangés ; aucun changement en conduite libre. Effet sans bloom global ni éclairage supplémentaire, avec test de profondeur pour ne pas apparaître à travers les bâtiments. Les textures, géométries et matériaux restent attachés à la scène pour son nettoyage habituel. Trois tests dédiés vérifient le périmètre, la sélection des feux et les matériaux du halo.

### Apprentissage, autonomie et compréhension des erreurs
- Choix avant lancement : **Apprentissage** (halos jaunes et consignes contextuelles) ou **Autonomie** (sans halos ni conseils de décision). GPS, repères d’arrivée, parcours, circulation et notation restent identiques. Le niveau est conservé lors d’un recommencement ou du passage à l’exercice suivant. L’autonomie n’est pas une certification et reste distincte du bouton d’évaluation existant.
- Les retours en conduite expliquent les nouvelles fautes pendant six secondes de simulation, puis disparaissent. Les réussites d’étape ont un retour positif pendant cinq secondes. Aucun message répété sur les télémétries sans événement ; les fautes prennent priorité sur une validation simultanée. Les messages de conduite restent masqués pendant l’évaluation, comme les erreurs précédentes.
- Chaque faute enregistre la position du joueur, sa position précédente et les positions des usagers du scénario. Le bilan offre **Revoir mon erreur** : schéma simplifié de dessus, explication factuelle, conseil, règle de l’exercice et relance complète via **Réessayer cet exercice**. Il ne s’agit pas d’une vidéo, et les contrôles du regard ne sont pas notés. Les obstacles de collision ne sont pas reconstruits dans ce schéma.
- Le référentiel français et le caractère pédagogique/non homologué sont rappelés à côté du choix d’aide. Les temps d’arrêt de validation demeurent des conventions pédagogiques, pas des durées légales.
Validation : 143 tests ciblés réussis, dont sept tests sur l’aide, l’égalité de notation, les retours, les captures et la projection du schéma. Vérification navigateur : lancement en autonomie, faute de vitesse injectée, bilan ouvrable, schéma SVG et explications présents, aucune erreur JavaScript.

### Carnet de progression, badges et entraînement conseillé
Six domaines sont suivis : allure/arrêts, priorités, feux/STOP, usagers vulnérables, placement/voies et stationnement. Les 19 exercices sont rattachés à au moins un domaine. Aucun contrôle du regard ni angle mort n’est prétendument évalué.

Une compétence passe de « À découvrir » à « En cours d’acquisition », puis « Confirmée » après au moins trois exercices terminés avec réussite **sans aucune faute**, sur au moins deux scénarios différents, avec au moins une réussite en autonomie. Une réussite avec pénalité ne rapporte pas de progression de maîtrise. Les badges récompensent ces confirmations, jamais le temps de parcours. Un badge acquis reste acquis ; une faute ultérieure peut déclencher une recommandation de révision.

Le carnet est indépendant de l’historique des 20 derniers résultats et persiste dans `letsplay_driving_progress_v1`. Il compte les résultats complets, sorties de zone et délais dépassés, pas les abandons volontaires. Les anciens résultats sans identifiant d’exercice/niveau d’aide ne sont pas convertis en preuves de maîtrise. Le stockage absent ou corrompu ne bloque pas les exercices.

L’entraînement conseillé propose d’abord une situation à retravailler, puis diversifie les exercices d’une compétence non confirmée et suggère l’autonomie après deux réussites aidées. Le bouton lance directement le scénario et le niveau conseillé. Les arrivées de circulation déjà variables sont conservées ; aucun classement de vitesse n’est ajouté.

Validation : 152 tests ciblés réussis, dont neuf nouveaux tests de progression/persistance/recommandation. Navigateur : six cartes affichées, fin d’exercice injectée avec obtention effective du badge « Allure maîtrisée », compteur sauvegardé, affichage mobile sans débordement, aucune erreur JavaScript. Compilation réussie.

## Refonte de l’interface PC / mobile — version actuelle

### Accueil et choix d’une mission
L’ancien catalogue textuel est remplacé par `DrivingSchoolHub` : **Mon parcours**, **Les situations**, **Mon carnet**. L’accueil met en avant l’exercice conseillé, quatre chapitres tous accessibles (premiers réflexes, intersections, partage de la route, manœuvres) et un accès au carnet. Les 19 exercices, règles, scénarios, sauvegardes et critères de progression sont conservés. Les cartes utilisent des illustrations SVG locales (`SchoolSituationArt`), décoratives et simplifiées, pas des captures ni des plans exacts de la simulation.

Une carte ouvre une présentation native modale de la mission : résumé court, choix **Avec aide / Sans aide**, commandes et règle dépliables, bouton **Commencer la mission**. L’évaluation démarre explicitement en autonomie, sans retours textuels en conduite. Échap ferme la présentation et rend le focus au bouton d’origine. Sur petit téléphone (375 × 667), le bouton de départ est visible sans défilement initial. La navigation générale du site et la bulle sociale fermée sont masquées uniquement sur ce mode, dont l’en-tête garde un lien vers les jeux.

### Conduite
La consigne courte reste dans une zone opaque au-dessus de la scène ; le panneau de limitation circulaire est centré dans la barre inférieure. Petites pastilles d’étape, distance, bouton Recommencer visible, rétroviseurs gauche/droite, notifications temporaires à gauche et SON/COCKPIT/MENU à droite sont conservés. Le rendu 3D s’adapte à l’espace disponible sans recouvrement des feux par la consigne. Les limites légales et la marge de notation ne changent pas.

Les commandes tactiles proposent **boutons gauche/droite** ou **volant tactile** à gauche, frein et accélérateur séparés à droite. Chaque entrée gère capture, relâchement et annulation du pointeur. Sur écran bas, carte, clignotants et direction sont séparés verticalement et la barre inférieure se compacte. Le clavier reste utilisable (flèches/WASD, C, M). Deux tailles de consigne sont disponibles. Ces préférences sont enregistrées dans `letsplay_driving_interface_v1`, sans toucher aux données d’apprentissage.

**MENU / Échap ouvre une vraie pause**, au lieu d’abandonner immédiatement : simulation, circulation, télémétrie et temps pédagogique sont suspendus ; les entrées maintenues sont libérées et le son moteur suspendu. Reprendre, modifier le confort, recommencer ou quitter sont des actions distinctes. Les réglages et la pause ne reconstruisent pas le rendu 3D.

### Bilan
`DrivingSchoolResults` met d’abord en avant une réussite constatée et un conseil de progression. La note, les fautes et les références sont repliables. Recommencer, exercice suivant et quitter restent disponibles ; **Revoir mon erreur** ouvre directement le premier schéma. Le dernier exercice désactive toujours le suivant. Le retour aux situations restaure le focus sur le titre du catalogue. Animations discrètes de badge, états et textes accompagnent les couleurs ; les animations sont coupées avec `prefers-reduced-motion`.

### Validation
- **158 tests ciblés réussis**, dont six nouveaux tests de classement des chapitres, états de carte, préférences et résumés pédagogiques.
- Compilation de production réussie ; `git diff --check` propre.
- Vérification Playwright réelle : navigation, 19 cartes, filtres, aperçu de mission, préférences, limitation centrée, absence de chevauchement brief/scène/barre, carte au-dessus des clignotants, pause bloquant la télémétrie, appui/relâchement directionnel, bilan et schéma, retour au catalogue, sauvegarde et absence de débordement mobile ; aucune erreur JavaScript.
- Inspection visuelle des accueils 1280 × 900 et 390 × 844, de la conduite tactile 844 × 390 et du départ en mission 375 × 667.
- Test d’interface reproductible : `CHROMIUM_PATH=/chemin/vers/chromium node scripts/driving-school-interface-check.mjs` (serveur Vite démarré ; `SCHOOL_URL` facultatif). Dans l’environnement Arena, ajouter `LD_LIBRARY_PATH=/tmp/chromium-libs/lib` et utiliser `/tmp/chromium`.

### Feux sur trottoir au niveau des portiques
Dans les exercices, chaque feu de portique possède désormais un feu vertical sur son support côté trottoir, à droite de l’approche et au niveau de la même ligne d’arrêt (18 m avant le centre du carrefour), plutôt qu’un feu uniquement au coin du carrefour. Le boîtier bas est centré à 3,05 m, avec les trois couleurs et la même orientation que le portique. Les deux têtes partagent exactement l’intersection, l’axe et le temps de simulation : aucun cycle indépendant. Le halo pédagogique de l’approche utile s’applique aussi au feu sur trottoir, sauf en autonomie. Les carrefours volontairement sans feux restent inchangés.

L’indexation des lentilles des instances est attribuée après construction complète des deux listes, évitant des collisions d’indices entre têtes de portique et têtes sur trottoir de carrefours différents. Trois tests dédiés vérifient placement/orientation, synchronisation, indices uniques et sélection du halo ; 161 tests ciblés réussis, compilation validée et exercice 03 contrôlé visuellement dans le navigateur sans erreur JavaScript.

### Point d’entrée simplifié : auto-école et conduite libre
La route `/jeu/vice-city-rush` ouvre directement l’auto-école. Le bouton **Conduite libre** dans la navigation et la carte de l’accueil lancent la ville partagée, sans exercice ni réglages pédagogiques imposés. **MENU** revient au même écran du parcours : le hub reste monté mais masqué pendant cette exploration. La progression et les préférences de la conduite libre restent distinctes de celles des 19 situations ; aucune sauvegarde existante n’est effacée.

Les anciens contrôleurs de course, histoire et tournoi, les pistes dédiées, leurs interfaces/CSS, leurs illustrations publiques et leurs bancs de rendu ont été retirés physiquement : **129 fichiers, environ 6,38 Mio**. Les modèles, textures, audio, cockpit et règles partagés avec la ville sont conservés. Les petits modules de données/progression historiques et le client d’API restent pour compatibilité avec les anciens comptes/tests, sans point d’entrée jouable et sans import depuis la nouvelle route. Les autres jeux et les données du serveur ne sont pas modifiés.

Les deux usages chargent `ViceCityFreeRoam` via `React.lazy`/`Suspense`, uniquement à la demande. Sur le build mesuré, le chunk de la route d’accueil passe de **1 060,91 ko JS + 384,65 ko CSS** à **132,39 ko JS + 45,91 ko CSS**. La ville est un chunk différé distinct (**284,03 ko JS + 24,24 ko CSS**, hors dépendances Three.js partagées). Cela réduit le chargement initial ; ce n’est pas une réduction équivalente de tout le JavaScript du jeu, puisque le moteur 3D reste nécessaire en conduite.

Vérifications :
- `npm run check:city-rush` : **272 tests réussis** pour l’apprentissage et les composants partagés nécessaires aux deux accès.
- Suite complémentaire des modèles/règles/données historiques et de la ville : **259 tests réussis** (recoupement avec la commande précédente, pas à additionner).
- `npm run check:driving-interface` : parcours PC/mobile, mission, pause, contrôles tactiles, erreurs, bilan, retour et sauvegarde.
- `npm run check:free-drive-interface` : absence de chargement 3D au hub, rendu effectif de la ville libre, retour, sauvegarde pédagogique inchangée et absence de débordement mobile.
- Compilation de production et `git diff --check` réussis. Les scripts navigateur utilisent `CHROMIUM_PATH` et éventuellement `LD_LIBRARY_PATH` selon l’environnement.

### Miniatures fidèles aux situations
Les 19 miniatures ont désormais une scène sémantique dédiée (`schoolSituationArt.js`) plutôt qu’une illustration déduite du chapitre. Les virages et le changement de voie ne montrent plus un parking ; le giratoire possède un véritable anneau à circulation antihoraire ; le cycliste est dessiné sur un vélo, distinct du piéton qui traverse depuis la droite. Les STOP, cédez-le-passage, feux, taxi bloquant la sortie, obstacle et véhicules prioritaires correspondent à chaque mission. Le choix du stationnement montre l’interdit puis la deuxième place et une arrivée parallèle au trottoir ; la sortie de stationnement montre l’insertion inverse. Ces schémas illustratifs ne sont pas des plans à l’échelle.

Six tests dédiés couvrent les 19 scènes, les feux effectivement présents dans les étapes, les panneaux, usagers et sens des manœuvres. Suite ciblée : 278 tests réussis. Catalogue inspecté dans le navigateur : 19 SVG distincts, libellés non coupés, cycliste/giratoire/voies corrects, aucun débordement mobile et aucune erreur JavaScript.

## Quatre situations supplémentaires du code : catalogue de 23 missions
Les scénarios 20 à 23 sont définis dans `roadCodeExercises.js`, sur quatre sections distinctes sans recouvrement avec les 19 précédentes. Ils rejoignent les chapitres Intersections et Partager la route, les compétences existantes, la navigation Suivant et la sauvegarde de progression, sans effacer les acquis.

- **20 — Passage étroit : céder en face** : panneau B15 rond à bord rouge côté joueur, C18 bleu côté opposé. Deux épaulements physiques créent un passage pour une voiture ; géométrie, collisions et minicarte partagent les mêmes cotes. Le véhicule en face traverse réellement le couloir. S’engager avant son dégagement produit une faute critique spécifique. Le GPS traverse le passage puis revient dans la voie de droite. Les anciennes lignes centrales sont exclues de cette portion.
- **21 — Véhicule prioritaire en intervention** : une voiture de police arrive de gauche avec feux bleus clignotants et avertisseur deux tons synthétisé. Attendre avant le carrefour, hors de sa trajectoire ; l’entrée prématurée est éliminatoire. Les avertisseurs visuels restent visibles si SON est désactivé. Le son respecte SON et la pause ; il n’y a aucune obligation de franchir un feu rouge ou de monter sur le trottoir.
- **22 — Route prioritaire** : losange jaune AB6 à droite, cédez-le-passage sur la route latérale. La voiture latérale s’arrête exactement avant sa ligne, y compris entre deux mesures de télémétrie, puis repart seulement après dégagement du joueur. Le joueur n’attend pas son passage et aucun arrêt à l’approche n’est imposé. La priorité n’exonère pas de prudence.
- **23 — Cédez-le-passage libre** : véritable panneau et marquage, aucun acteur caché, pas de feu. Le joueur peut franchir l’étape en roulant prudemment ; ni arrêt systématique ni durée d’attente ne sont nécessaires. Un arrêt prudent reste autorisé. La limite légale urbaine reste 50 km/h ; l’allure conseillée n’est pas transformée en limite réglementaire et le regard n’est pas évalué.

Chaque situation dispose de sa miniature dédiée, sans bulle de texte. L’auto-école conserve les mêmes aides, commandes, rétroviseurs, pause, reprise et bilans ; les règles de conduite libre ne changent pas. Le contexte WebGL est explicitement libéré à la sortie d’une scène pour permettre l’enchaînement des missions sans conserver les anciens contextes graphiques.

Validation : **288 tests ciblés réussis**, dont dix tests pour les nouveaux scénarios, les fautes, la circulation réellement prioritaire, les collisions, l’arrêt précis du véhicule latéral et la préservation de la progression. Suite complémentaire ville/modèles/audio : **259 tests réussis**, avec recoupements. Les quatre missions ont été lancées et quittées successivement dans un même navigateur avec vrais rendus 3D et rétroviseurs en direct ; les 23 cartes et le catalogue mobile sont validés sans erreur JavaScript. Contrôle reproductible : `npm run check:road-code-interface`, avec `CHROMIUM_PATH`/`LD_LIBRARY_PATH` selon l’environnement ; `SCHOOL_SCENARIO=20`, `21`, `22` ou `23` permet un test isolé, et `SCHOOL_SCREENSHOTS=1` enregistre les captures dans `/tmp`.

## Conduite libre exclusivement au volant
La sortie/entrée de voiture et les tirs ont été supprimés, pas simplement masqués : plus de branche de déplacement à pied du joueur, d’embarquement dans un véhicule de circulation, de visée/réticule, de projectiles ni de vitrage cassé par balle. Les raccourcis **E**, **Z** et **clic gauche pour tirer**, les boutons tactiles correspondants et leurs indications d’aide sont retirés. Un clic sur la route peut toujours activer le son, sans autre action. Les commandes tactiles libres sont regroupées dans un pavé compact : accélération, frein/recul et saut déjà existant.

Le garage reste accessible par son panneau pour réparer/changer de voiture. Activités, son, cockpit, menu, conduite, collisions et sauts ne changent pas. Les piétons et cyclistes pédagogiques restent présents ; leur modèle est désormais créé sans arme cachée. La progression des 23 situations et celle de la conduite libre sont conservées.

Validation : six tests spécifiques de régression (entrée, armes, commandes, usagers pédagogiques, fonctions préservées et cycliste sans arme), **288 tests ciblés réussis**, compilation validée. Vérification réelle des interfaces de conduite libre et d’auto-école sur PC/mobile : contrôles retirés absents, E/Z/clic sans tir ni sortie, son/cockpit/menu fonctionnels, pause, volant/boutons, bilans et retour au parcours préservés, aucune erreur JavaScript.

## Assistance en temps réel dans le brief supérieur
En mode **Avec aide**, le brief reste une seule instruction courte, mais possède maintenant un repère illustré : **❌ Attendez encore un peu…** tant que les usagers prioritaires n’ont pas dégagé ; **✅ C’est bon, vous pouvez y aller prudemment** lorsque le passage est effectivement autorisé. Le piéton, le cycliste, la police, le taxi, le giratoire et le passage étroit disposent de formulations contextualisées. Les manœuvres conservent leur direction : tourner, s’insérer, changer de voie ou contourner.

La décision réutilise la même simulation que l’évaluation : temps de simulation, pauses/réactions des acteurs, arrêt STOP validé et vrais cycles des feux. Un feu rouge/orange reste bloquant avant la ligne, même si les véhicules ont dégagé ; le brief ne demande pas de s’arrêter au milieu d’un carrefour déjà engagé. Une route prioritaire ou un cédez-le-passage libre ne créent pas d’attente artificielle. Le repère rouge indique une attente, **pas une nouvelle faute** : le score et les messages d’erreur distincts ne changent pas.

Une transition horodatée par le modèle conserve l’autorisation pendant cinq secondes au changement d’étape, afin qu’elle ne disparaisse pas immédiatement à la validation du point d’attente. Les conditions de sécurité sont recalculées pendant ce relais ; l’approche de la zone d’arrêt finale reprend la consigne de freinage. En pause, le temps de simulation ne progresse pas. Le mode **Sans aide** conserve son instruction neutre, sans permission illustrée.

Validation : onze nouveaux tests (attente/permission, STOP, cycles de feux, acteurs ralentis, relais, autonomie, absence de faute ajoutée, textes ≤12 mots et ≤85 caractères), soit **299 tests ciblés réussis**. Test navigateur reproductible `npm run check:live-assistance` : vraie scène d’auto-école et rétroviseurs chargés, télémétrie simulée pour contrôler le passage ❌ → ✅ après dégagement, aucun faux message de faute et aucun chevauchement du brief sur mobile paysage.
