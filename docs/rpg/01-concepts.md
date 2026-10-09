# 01 — Trois propositions d'univers

> ## Décision prise
>
> **Concept B — « Le Sablier de Bab El »** est retenu, avec une contrainte de
> conception fixée par le créateur : **pas de système réactif à la Clair
> Obscur**. Ni parade, ni esquive, aucun minutage : le tour par tour reste du
> tour par tour. Le système qui en résulte est décrit dans
> [`03-combat.md`](03-combat.md) — tout y est annoncé à l'avance, et l'on
> contre par la décision.
>
> Le concept A (Veilleurs d'Ahaggar) est conservé ci-dessous : deux de ses
> idées ont été reprises dans B (la monnaie de sable/souvenirs, les compagnons
> perdus qui laissent une empreinte utile). Le concept C est recyclé comme
> structure d'évacuation entre les chapitres.
>
> **Ce dossier décrit l'état des lieux au moment de la décision** : le
> prototype codé dans `src/games/` implémente désormais B et son combat sans
> réflexes.

Trois concepts complets, jouables dans le même moteur. Chacun a son pitch, son
ton, son méchant, sa mécanique signature et son coût de production. Le
comparatif et la recommandation sont en fin de fichier.

---

## Concept A — « LES VEILLEURS D'AHAGGAR » ⭐ (recommandé)

**Pitch en une ligne.** Le soleil meurt d'un degré chaque matin ; sept flammes
tiennent encore le monde allumé ; vous êtes la dernière équipe à pouvoir les
rallumer — et chacun de vos compagnons porte au front le nombre de jours qu'il
lui reste.

**X rencontre Y.** *Clair Obscur* rencontre *Le Désert des Tartares*, joué sur
les parois peintes du Tassili.

**L'univers.** Une fantasy **maghrébine** assumée : Numidie, Ahaggar, Tassili
n'Ajjer, Timgad, les ports puniques de Tanit, les palmeraies de sel du Touat.
Pas de châteaux européens, pas de chevaliers en plaques — des takoubas, des
voiles indigo, des ksour, des caravanes, des djinns, des bibliothèques de
parchemins, des peintures rupestres qui *sont* le monde (littéralement : le
monde a été dessiné sur la roche, et quelque chose est en train de le
blanchir).

**La menace.** Le **Blanc** : une pâleur qui avance et n'efface pas les corps
mais les **noms**. D'abord la couleur, puis le son, puis le souvenir, puis le
nom. Ce qui n'a plus de nom n'existe plus, et personne ne s'en aperçoit — c'est
le plus effrayant. Son héraut est **Amellal, le Scribe Blanc** : le premier
Veilleur, celui qui a vu sept générations mourir à rallumer les flammes et qui
a conclu que la seule pitié possible était d'effacer proprement la page.

**Le méchant a raison, c'est tout le drame.** Amellal ne hait pas le monde. Il
veut arrêter sa douleur. Le choix final n'est pas « bien contre mal », c'est
« continuer à souffrir en se souvenant, ou ne plus souffrir en oubliant ».

**Mécanique signature — le Dernier Matin.** Chaque compagnon affiche un
nombre : les jours qu'il lui reste avant d'être blanchi. À chaque aube
(f = fin de chapitre), tous les nombres descendent. À zéro, le personnage est
perdu **pour toujours**. On peut acheter des jours — mais la seule monnaie qui
achète du temps, ce sont les **Souvenirs** : on oublie volontairement un visage,
un lieu, un nom, pour vivre un jour de plus. La progression et la survie
puisent dans la même poche. Le thème *est* la mécanique.

**Mécanique sœur — la Veillée.** Un compagnon perdu devient une étoile dans la
Carte du Ciel. Chaque étoile donne un passif permanent à toute l'équipe et une
technique héritée, utilisable une fois par combat. Les morts ne sont pas un
écran de défaite, ce sont des cicatrices qui rendent plus fort. Personne ne
recharge une sauvegarde pour « réparer » une mort : on la garde.

**Ton.** Solennel, chaud, humain. Beaucoup d'humour dans les dialogues entre
compagnons (c'est ce qui rend les pertes insupportables), une gravité qui monte
chapitre après chapitre.

**Pourquoi c'est le bon choix pour nous.** Personne n'a fait un JRPG maghrébin.
Ce n'est pas un habillage exotique sur un moule japonais : la mythologie
amazighe et saharienne apporte des choses qu'on ne trouve nulle part ailleurs
(le nom comme substance, l'oralité comme magie, le désert comme personnage, la
veille comme devoir). Et c'est cohérent avec la maison : Let's Play est
algérien, nos deux premiers jeux se passent chez nous.

---

## Concept B — « LE SABLIER DE BAB EL »

**Pitch en une ligne.** Une cité-portail suspendue au-dessus du désert, une
horloge céleste qui égrène les cycles, et à chaque cycle un étage de la ville
tombe dans le sable avec tous ceux qui y vivaient.

**X rencontre Y.** *Clair Obscur* rencontre *Persona*, dans une métropole art
déco mauresque.

**L'univers.** Bab El, ville verticale de 9 étages, bâtie sur un portail
fermé. Cosmopolite, bourgeoise, pleine de tramways de cuivre, de cours
intérieures, de souks suspendus, de néons calligraphiés. L'horloge du ciel
(comme une astrolabe géante) indique le **cycle courant** ; quand il s'achève,
l'étage le plus bas est « repris » par le sable. Tout le monde le sait. Tout le
monde continue de vivre. L'étage 1 est déjà perdu ; on en est au 4.

**La menace.** **La Chambre des Heures**, une administration qui gère
l'effondrement : elle décide quels quartiers sont évacuables et lesquels sont
« non prioritaires ». Le méchant n'est pas un dieu, c'est un **fonctionnaire**
— le Grand Horloger, un homme doux, poli, absolument convaincu que compter les
morts est la seule façon d'en sauver quelques-uns.

**Mécanique signature — le Sable.** Les points de vie *sont* du sable : chaque
coup en fait couler de la cible, et le sable qui tombe au sol reste sur le
champ de bataille. On peut le ramasser (soin), le souffler vers un allié
(bouclier) ou l'accumuler pour des sorts de fin de combat. Un combat se joue
donc aussi au sol : les mêmes 500 PV peuvent être perdus pour tout le monde ou
partiellement récupérés, selon comment on se bat.

**Deuxième mécanique — l'Étage.** Le champ de bataille s'incline. Chaque tour,
la gravité du niveau pousse les combattants vers le bas de l'écran : les
positionnements changent, les sorts de zone touchent différemment, et on peut
faire tomber un ennemi d'un étage (dégâts massifs, mais il revient).

**Ton.** Mélancolique, urbain, bavard. Beaucoup de dialogues de groupe, de
liens, de « dernières nuits » avant l'effondrement. Plus proche d'un RPG
narratif à la Persona : calendrier, relations, choix de qui passer du temps
avec.

**Coût.** Le plus cher des trois : une ville entière à construire, beaucoup de
PNJ, beaucoup d'écrit, une direction artistique art déco très précise.

---

## Concept C — « LA CARAVANE DES LANTERNES »

**Pitch en une ligne.** Le soleil s'est brisé en sept lanternes tombées aux
quatre coins du monde ; une caravane part les ramasser, et chaque ville du
chemin a un problème que seule une lanterne peut régler.

**X rencontre Y.** *Dragon Quest* rencontre *Le Voyage de Chihiro*, en
caravane.

**L'univers.** Un monde lumineux et coloré, volontairement simple : des
villages accrochés à des falaises, des marchés flottants, des oasis-bibliothèques,
des géants endormis sous des dunes. Chaque région a une culture, un plat, une
musique, une superstition.

**La structure.** Épisodique, à la Dragon Quest : on arrive, on comprend le
souci du village, on descend dans le donjon, on règle ça, on repart avec une
lanterne. Chaque chapitre se termine bien — jusqu'au moment où ce n'est plus le
cas, vers le chapitre 5, et le jeu devient autre chose sans prévenir.

**La menace.** **Le Souffleur**, une entité enfantine qui éteint les lanternes
« parce que la lumière fait du bruit la nuit ». Un méchant qu'on finit par
plaindre : c'est un enfant qui a peur du noir et qui a les moyens d'un dieu.

**Mécanique signature — le Chant de Caravane.** Le groupe chante en marchant :
les mélodies apprises en ville deviennent des **hymnes** (buffs de combat,
soins hors combat, ouverture de passages). On compose sa propre setlist de 3
hymnes. C'est simple, lisible, et ça donne une identité sonore au jeu.

**Combat.** Le plus accessible des trois : pas de réactions en temps réel,
3 PA par tour, des sorts qui se comprennent en une lecture. Pensé pour le
mobile et pour des sessions de 15 minutes.

**Ton.** Chaleureux, drôle, réconfortant. Le jeu qu'on fait jouer à quelqu'un
qui n'aime pas les RPG.

**Coût.** Le moins cher. Idéal pour un premier RPG : il apprend l'équipe à
faire un RPG sans risquer le projet.

---

## Comparatif

| Critère | A — Veilleurs d'Ahaggar | B — Sablier de Bab El | C — Caravane des Lanternes |
| --- | --- | --- | --- |
| Identité / originalité | ★★★★★ | ★★★★ | ★★★ |
| Force émotionnelle | ★★★★★ | ★★★★★ | ★★★ |
| Accessibilité grand public | ★★★ | ★★★ | ★★★★★ |
| Combat (excitation) | ★★★★★ | ★★★★ | ★★★ |
| Quantité d'écriture | Moyenne (≈ 250 k mots) | Lourde (≈ 400 k mots) | Légère (≈ 180 k mots) |
| Coût de production | Moyen | Élevé | Faible |
| Faisabilité « jouable dans le navigateur » | **Très bonne** | Bonne | Excellente |
| Cohérence avec Let's Play | **Parfaite** | Bonne | Bonne |

## Recommandation

**Faire le concept A — « Les Veilleurs d'Ahaggar »** — et garder le concept C
comme *mode* : la Caravane peut devenir la structure d'exploration des
chapitres 1 à 3 du concept A (l'équipe voyage en caravane entre les veilles),
ce qui récupère son accessibilité sans renoncer à l'identité du A.

Trois raisons :

1. **Différenciation.** Sur un marché où les RPG indépendants ressemblent à des
   hommages, un JRPG enraciné dans le Sahara et la Numidie est immédiatement
   reconnaissable en une capture d'écran — ce qui compte autant que la qualité
   pour un premier jeu.
2. **Une mécanique qui porte le thème.** « Acheter du temps en oubliant » est
   compréhensible en cinq secondes et ne s'épuise pas en trente heures.
3. **Faisable ici.** Le concept A tient en 2D peinte / HD-2D, donc il peut
   tourner dans un navigateur et vivre dans la page Jeux de Let's Play — comme
   Mirage Rush et Vice City Rush — avant même d'exister ailleurs.

## Titres de travail (à trancher)

| Titre | Sous-titre | Ce qu'il dit |
| --- | --- | --- |
| **Les Veilleurs d'Ahaggar** | *Le Dernier Matin* | le lieu + la promesse |
| Cendres d'Ahaggar | *Sept Veilles* | plus sombre, plus court |
| Le Blanc | *Chroniques du Dernier Matin* | le méchant comme titre (fort, intrigant) |
| Tanit | *La Flamme et le Nom* | mythologique, exportable |
| Ahaggar | *Ce que le sable oublie* | sobre, une ligne |
| Noms | *Les Veilleurs, livre I* | concept pur, risqué mais mémorable |

Retenu pour le dossier : **Les Veilleurs d'Ahaggar — Le Dernier Matin**.

## Taglines (une par langue, pour la fiche produit)

- FR — *« Rallume la flamme. N'oublie pas les noms. »*
- EN — *"Keep the flame. Remember the names."*
- AR — *« أشعل الشعلة. ولا تنسَ الأسماء. »*
