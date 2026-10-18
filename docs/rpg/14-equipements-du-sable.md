# 14 — Le lot d'équipements du Sable

**Dix cartes Arme** pour l'élément **Sable**, dessinées dans l'esprit des
*Equipment* de Magic the Gathering et traduites dans la grammaire du Sablier.

**État : lot codé.** Les dix fiches vivent dans `RPG_ARME_CARDS`
(`src/games/rpgCards.js`), les six briques moteur dans `src/games/rpgDuel.js`
et `src/games/rpgAI.js`, les contrôles dans `tests/rpg-equipements-sable.test.js`.
Ce document reste la référence de *design* : il dit pourquoi chaque carte
existe, ce que le code ne dit pas.

Rappel du cadre qui contraint tout le lot (§ 9 de `05-concept-cartes.md`) :

- l'arme **s'attache** depuis la main, en payant son coût, à **une créature
  alliée** (héros et jetons compris) ;
- **une seule arme par créature** ; attacher la seconde envoie la première au
  cimetière ;
- l'arme **tombe au cimetière avec son porteur** (destruction, renvoi en main,
  exil) ;
- contrée à la pose, comme n'importe quelle carte.

Ces trois règles sont le vrai sujet du design : une arme du Sablier est un
**investissement qui meurt avec son porteur**, pas un buff gratuit. Toutes les
idées ci-dessous jouent avec ce prix — le lot est construit pour que la
question « sur qui je la mets ? » soit toujours douloureuse.

## 1. Ce que Magic nous apprend (et ce qu'on en garde)

| Leçon MTG | Traduction Sable |
|---|---|
| *Umezawa's Jitte* — l'arme qui accumule des compteurs au combat | La Jitte d'Amayas (depuis simplifiée : +2/+1 et protection contre les Ténèbres) |
| *Skullclamp* — +1/−1 et « quand le porteur meurt, piochez 2 » | Le Licou du chien de sable : l'arme qui **tue ce qu'elle équipe** pour le transformer en cartes |
| *Sword of Fire and Ice* — deux déclencheurs de dégâts de combat | La Takouba de Tin Hinan (mythique) : pioche sur une créature, chien de sable sur le sorcier |
| *Mask of Memory* — blesser le joueur, piocher 2, défausser 1 | Le Masque du guetteur : l'information comme butin de guerre |
| *Living Weapon* (Batterskull) — l'arme apporte son propre porteur | La Lame des ergs : jouable **sans créature**, elle crée son chien de sable et s'y attache |
| *Lightning Greaves / Swiftfoot Boots* — hâte et protection | Les Sandales de Tislit : la Rapidité qui réveille les jetons de Tarek le tour même |
| *Explorer's Scope* — attaquer pour trouver un terrain | La Boussole du Hoggar : le désert se lit, il ne se pioche pas |
| *Sword of Feast and Famine* — dégager les terrains en attaquant | Le Harnais du méhari : un mana de sable rendu à chaque charge |

L'identité Sable du set (pioche, pistes, éclaireurs, jetons de Tarek, auras
défensives, protection ciblée) fait que **six des dix cartes produisent de
l'information ou des jetons** : le Sable n'a pas les plus gros bonus, il a les
meilleures raisons d'attaquer.

## 2. Le lot en un coup d'œil

| # | Carte | Rareté | Coût | Bonus | L'idée |
|---|---|---|---|---|---|
| 1 | Sandales de Tislit | commune | 1 | +0/+1 | Rapidité |
| 2 | Cuirasse de sel | commune | 2 | +0/+3 | Esquive 1 |
| 3 | Javelot du beffroi | commune | 2 | +2/+0 | Coup rapide |
| 4 | Licou du chien de sable | inhabituelle | 1 | **+1/−1** | Quand le porteur meurt : piochez 2 |
| 5 | Boussole du Hoggar | inhabituelle | 2 | +1/+1 | Attaque → lit le dessus du deck, garde les terrains |
| 6 | Harnais du méhari | inhabituelle | 3 | +2/+2 | Attaque → 1 mana de sable |
| 7 | Masque du guetteur | rare | 2 | +1/+1 | Blesse le sorcier → pioche 2, défausse 1 |
| 8 | Jitte d'Amayas | rare | 4 | +2/+1 | Protection contre les Ténèbres |
| 9 | Lame des ergs | rare | 4 | +3/+1 | Arme vivante : apporte son propre porteur |
| 10 | Takouba de Tin Hinan | **mythique** | 4 | +3/+2 | Coup rapide + deux déclencheurs de combat |

---

## 3. Les fiches

### 1. Sandales de Tislit — commune — 1

> **Arme — Bottes.** Le porteur gagne +0/+1 et **Rapidité**.
>
> *« Elle part avant la question. »*

`donne: { rapidite: true }`. Aucune brique moteur : `attacherArme` gère déjà la
Rapidité (elle désactive le mal d'invocation).

Pourquoi c'est intéressant : à 1 mana, c'est l'arme des **jetons**. Le chien de
sable 1/1 de Tarek arrive avec le mal d'invocation ; chaussé, il frappe le tour
même. La carte a l'air faible et elle est le meilleur tour 1 du set après une
arrivée de Tarek.

### 2. Cuirasse de sel — commune — 2

> **Arme — Armure.** Le porteur gagne +0/+3 et **Esquive 1**.
>
> *« Le sel tient mieux que le fer quand le fer chauffe. »*

`donne: { esquive: 1 }`. Aucune brique moteur (`attacherArme` additionne déjà
l'Esquive). La première **armure** Sable : le pendant défensif de la Takouba des
pistes, qui rend une Amani des ksour (2/5) ou une Dune marchante (2/5) quasi
intuable au combat — et donne enfin une cible d'équipement aux créatures à
forte défense du Sable, qui n'avaient rien à porter.

### 3. Javelot du beffroi — commune — 2

> **Arme — Javelot.** Le porteur gagne +2/+0 et **Coup rapide**.
>
> *« Il ne vise pas l'homme. Il vise la fenêtre derrière lui. »*

`donne: { coupRapide: true }` — **brique moteur minuscule** : `attacherArme` ne
pose que `esquive`, `envol`, `infiltration` et `rapidite` ; il faut lui ajouter
`coupRapide` (et le retirer dans `retirerArme`). Le reste du moteur lit déjà
`entite.coupRapide` (`rpgChoisirAttaquants`, `rpgAttaquerSorcier`).

Pourquoi c'est intéressant : le Sable n'avait accès au Coup rapide que par le
Djinn de foudre. Le Javelot pose la question à chaque attaque : **frapper la
créature de votre choix** — ses dégâts d'attaque, sans riposte, et l'attaque
s'arrête là — **ou viser le sorcier**, en acceptant les bloqueurs. C'est la
carte qui oblige l'adversaire à choisir entre garder sa créature et garder ses
points de vie.

### 4. Licou du chien de sable — inhabituelle — 1 — **la carte du lot**

> **Arme — Licou.** Le porteur gagne **+1/−1**. **Quand le porteur meurt,
> piochez deux cartes.**
>
> *« Il tirait bien. Il tire encore, d'une certaine façon. »*

Le *Skullclamp* du Sablier. Le bonus négatif n'est pas une punition : c'est le
déclencheur.

- sur un **chien de sable 1/1** (ou n'importe quelle 1/X), le Licou la fait
  passer à X/0 : `rpgActionsEtat` la retire immédiatement, le déclencheur part,
  **deux cartes pour 1 mana** — le meilleur taux de pioche du set… à condition
  de disposer de chair à canon ;
- sur une créature à 3+ de défense, c'est au contraire une arme offensive
  honnête (+1 attaque) qui punit la mort de son porteur : l'adversaire hésite à
  dépenser une Tempête de sable ou un Effondrement ;
- **elle se retourne contre vous** : l'arme tombant au cimetière avec son
  porteur, vous payez deux cartes (le Licou + la victime) pour deux cartes. Le
  gain réel est la **qualité** : vous convertissez un jeton jetable en deux
  vraies cartes de deck.

**Brique moteur** : un déclencheur « quand le porteur meurt ». Le point
d'accroche existe — `enterrer()` appelle `armeAuCimetiere()` **avant** de
déclencher `carte.destruction`. Il suffit d'y lire `carteArme.porteurMeurt` et
de l'`appliquer` avec le camp du porteur. À noter : la **Tenacité** et l'exil
doivent, logiquement, ne pas le déclencher (la créature n'est pas « morte » au
sens du cimetière).

### 5. Boussole du Hoggar — inhabituelle — 2

> **Arme — Boussole.** Le porteur gagne +1/+1. **Quand le porteur attaque :
> regardez la première carte de votre deck. Si c'est un terrain, révélez-le et
> ajoutez-le à votre main.**
>
> *« Amayas ne cherche pas l'eau. Il se souvient de l'endroit. »*

L'*Explorer's Scope*, traduit en « le désert se lit ». Deux intérêts :

1. elle **défend le porteur** : la menace implicite (« si vous le bloquez et le
   tuez, j'ai quand même avancé ») rend les petits porteurs attachants ;
2. elle **lisse la courbe** d'un deck qui joue 16 terrains sur 40 sans jamais
   casser la règle « un terrain par tour » — le terrain va en main, il n'est pas
   posé.

**Brique moteur** : un déclencheur « quand le porteur attaque » (au moment de la
déclaration, dans `rpgLancerAttaque`, pas après les bloqueurs — sinon l'info
arrive trop tard) + une lecture du dessus du deck (`duel[cote].deck[0]`), donc
une interface de révélation.

### 6. Harnais du méhari — inhabituelle — 3

> **Arme — Harnais.** Le porteur gagne +2/+2. **Quand le porteur attaque :
> gagnez 1 mana de sable.**
>
> *« Le méhari connaît le puits d'avant la soif. »*

Le *Sword of Feast and Famine* du pauvre, et la seule rampe du Sable. Le bonus
est gros pour le coût, mais il est payé par le **risque** : le porteur doit
survivre à l'attaque pour que la manne continue — et le mana de sable
non dépensé s'évapore à la fin du tour, ce qui oblige à garder une carte
jouable en main.

**Brique moteur** : le déclencheur d'attaque ci-dessus ; l'effet lui-même est
déjà écrit (`case 'sable'` de `appliquer`, qui incrémente `duel[cote].sable`).

### 7. Masque du guetteur — rare — 2

> **Arme — Masque.** Le porteur gagne +1/+1. **Quand le porteur inflige des
> blessures de combat au sorcier adverse, piochez deux cartes, puis défaussez
> une carte.**
>
> *« Il ne rapporte pas ce qu'il a vu. Il rapporte ce qui manquait. »*

Le *Mask of Memory*, au service de l'identité informationnelle du Sable. Le
lot a déjà un moteur de pioche-défausse complet (`pioche-defausse` +
`defausseEnAttente` pour le joueur, défausse automatique pour le sorcier) : la
brique se limite au déclencheur **« blesse le sorcier »**, dans
`rpgAttaquerSorcier`.

C'est la carte qui fait gagner les parties longues : une créature Infiltrable
(Takouba des pistes) équipée du Masque est une usine à cartes, et l'adversaire
a une raison de plus de garder un mur devant lui.

### 8. Jitte d'Amayas — rare — 4

> **Arme — Jitte.** Le porteur gagne +2/+1 et une **protection contre les
> Ténèbres** : les attaques, blocages et effets des Ténèbres ne peuvent ni le
> cibler ni le blesser.
>
> *« Le guide pare d'un geste ce que la nuit envoie. »*

La version d'origine portait les compteurs de sable et les trois modes de
l'*Umezawa's Jitte* ; elle a été **simplifiée** en une arme de garde : un bonus
honnête, et la protection permanente de couleur d'Amayas étendue à son porteur
tant que l'arme reste attachée.

**Briques moteur** : `donne.protection` sur l'arme — `attacherArme` couvre le
porteur (`entite.protection`, permanente), `retirerArme` rend la protection
imprimée de la fiche s'il y en avait une (Amayas garde la sienne).

### 9. Lame des ergs — rare — 4

> **Arme — Khopesh.** **Arme vivante :** vous pouvez jouer la Lame des ergs
> sans créature. Dans ce cas, elle crée un **chien de sable 1/1** et s'y
> attache. Le porteur gagne +3/+1.
>
> *« Le désert n'attend pas qu'on lui trouve un bras. »*

Le *Living Weapon*. Deux effets très agréables :

- elle rend le lot **jouable à vide** : plus personne ne se retrouve avec une
  main d'armes et une table vide (le cauchemar de tout set d'équipements) ;
- elle se combine avec Tarek : la Lame posée sur son propre chien donne un
  1/1 → 4/2 (+1/+1 de l'aura de Tarek compris), pour 4 manas et **sans rien
  sacrifier**.

**Brique moteur** : `rpgJouerArme` exige aujourd'hui une cible en jeu
(`si pas de cible → raison: 'cible'`). Il faut autoriser `cibleId: null` quand
la carte porte `armeVivante`, créer le jeton (`case 'jetons'` existe) puis
l'attacher. À noter : le jeton créé **n'est pas** une cible au sens de Boualem —
même traitement que les jetons de Tarek.

### 10. Takouba de Tin Hinan — mythique (1 par deck) — 4

> **Arme — Takouba.** Le porteur gagne +3/+2 et **Coup rapide**. **Quand le
> porteur inflige des blessures de combat à une créature, piochez une carte.
> Quand il en inflige au sorcier adverse, créez un jeton chien de sable 1/1.**
>
> *« La mère des pistes ne ferme jamais la porte : elle la laisse derrière
> elle. »*

Le cycle des *Swords of X and Y*, en une seule carte-matière : la pioche
(l'information) et le jeton (la lignée), les deux obsessions du Sable, sur le
même déclencheur.

**Pourquoi le Coup rapide et pas l'Infiltration.** La première version donnait
l'Infiltration : c'était une erreur. Un porteur inbloquable ne blesse **jamais**
une créature au combat, donc la moitié de la carte — la pioche — ne partait
jamais. Le Coup rapide, lui, ouvre les deux : la frappe précoce pique la
créature désignée (pioche) et **arrête là** l'attaque du porteur ; l'attaque
ordinaire, elle, passe par les bloqueurs et frappe le sorcier (chien de sable).
Les deux effets demandent donc deux attaques — deux tours —, jamais le même : la
Takouba laisse choisir lequel des deux déclencheurs on veut voir partir
aujourd'hui, ce qui est exactement ce qu'on attend d'une mythique. Le Javelot du
beffroi partage donc son mot-clé avec la mythique du lot : assumé, le Sable est
la couleur qui frappe avant le combat, comme la Neige est celle qui frappe en
l'air.

Le lien avec Tarek est délibéré : les chiens de sable créés par la Takouba
**sont** des créatures Sable, donc ils profitent de son aura s'il est en jeu.
La Takouba est la carte qui transforme un deck jetons en deck valeur.

---

## 4. Les illustrations

Les dix peintures vivent dans `public/cards/<identifiant>.jpg`, plein art au
ratio exact de la face (1024×1280). Elles suivent la dérogation documentée dans
`src/games/RPG-CARD-ART.md` : un **nihonga coloré** — contours de sumi,
pigments minéraux, feuille d'or — trempé dans une palette algérienne saturée
(indigo, safran, henné, turquoise, or du sable).

**L'équipement seul, rien d'autre** : ni porteur, ni animal, ni main. C'est
l'objet qui est la carte, posé, planté ou pendu sur un support sobre (dalle de
grès, seuil de pierre, piquet de bois, monticule de sable), entièrement dans le
cadre, composition centrée pour un 4:5 sans recadrage destructeur.

| Carte | L'objet peint |
|---|---|
| Sandales de Tislit | la paire de sandales posée sur le seuil de pierre d'une maison du ksar |
| Cuirasse de sel | la cuirasse de cuir incrustée de sel, dressée sur un support de bois |
| Javelot du beffroi | le javelot planté en biais dans un monticule de sable |
| Licou du chien de sable | le collier et le harnais tressés posés à plat sur une dalle de grès |
| Boussole du Hoggar | la boussole de laiton ouverte, posée à plat sur un rocher |
| Harnais du méhari | le harnais pendu à un piquet de bois, glands rouges et disques de laiton |
| Masque du guetteur | le masque de cuir et ses cordons indigo, posé sur une dalle de grès |
| Jitte d'Amayas | le bâton fourchu de fer posé sur une dalle de grès |
| Lame des ergs | le khopesh de bronze planté dans le sable |
| Takouba de Tin Hinan | la takouba dressée, la pointe sur une dalle de pierre |

## 5. Les briques moteur

Six briques, du plus petit au plus gros — **toutes sont écrites** et couvertes
par `tests/rpg-equipements-sable.test.js`. Le lot avait été calibré pour que
six cartes sur dix n'exigent aucune brique ; voici ce qu'elles coûtent :

| Brique | Cartes servies | Taille estimée |
|---|---|---|
| `donne.coupRapide` dans `attacherArme` / `retirerArme` | Javelot du beffroi | 2 lignes |
| Déclencheur « quand le porteur meurt » (dans `enterrer`, avant `armeAuCimetiere`) | Licou du chien de sable | ~10 lignes |
| Déclencheur « quand le porteur attaque » (déclaration) + lecture du dessus du deck | Boussole du Hoggar, Harnais du méhari | ~25 lignes + UI de révélation |
| Déclencheur « quand le porteur blesse le sorcier » (dans `rpgAttaquerSorcier`) | Masque du guetteur, Takouba de Tin Hinan | ~15 lignes |
| Compteurs sur l'arme + activation à coût de compteur | Jitte d'Amayas | ~30 lignes + UI de choix de mode |
| `armeVivante` : jouable sans cible, attachée au jeton créé | Lame des ergs | ~15 lignes |

Chaque brique a son contrôle dans `tests/rpg-equipements-sable.test.js`, à côté
de `rpg-armes.test.js` qui tient le prototype. Côté interface
(`RpgDuelPage.jsx`) : un bouton par mode d'arme — un seul pour le Bâton, trois
pour la Jitte, payés en compteurs —, la désignation de la proie du Trait de
sable au clic, une pastille de compteurs sur la carte équipée, et l'arme vivante
qui se joue la table vide sans rien désigner.

## 6. Réserve (quatre idées gardées au chaud)

- **Collier du fennec** (rare, 3, +1/+1) — *Basilisk Collar* : **Contact
  mortel** (toute blessure infligée par le porteur détruit la créature
  blessée) + Esquive 1. Mécanique nouvelle, énorme sur une créature
  Infiltrable ; à réserver pour une extension.
- **Cape de la dune** (inhabituelle, 2, +1/+1) — *Trailblazer's Boots* : le
  porteur gagne Infiltration **tant que vous contrôlez un Désert**. La
  condition terrains, un classique MTG que le set n'exploite pas encore.
- **Hache des ksour** (rare, 4, +4/+2) — *Argentum Armor* : quand le porteur
  attaque, détruisez un terrain adverse. Le moteur a déjà
  `detruire-terrain-aleatoire` : on garde l'aléatoire (l'information d'abord,
  jamais les réflexes) ou on écrit le ciblage.
- **Cotte du Ténéré** (mythique, 4, +0/+5, **Arme — Armure**) — *Darksteel
  Plate* : le porteur est **immunisé contre l'Eau**. L'eau ne mord pas le sable,
  et le Sable n'a toujours aucune réponse à la Vipère de verre.

## 7. Ce que le lot ne fait pas

- **Pas de « flash » :** aucune arme ne se joue pendant le tour adverse. Le
  jeu assume l'information plutôt que le réflexe (`05-concept-cartes.md` § 3) ;
  une arme à flash briserait cette règle pour un gain minime.
- **Pas de copie d'arme** (*Bloodforged Battle-Axe*) : l'emplacement unique
  « une arme par créature » est la colonne vertébrale du type ; la contourner
  diluerait le choix.
- **Pas de bonus négatif ailleurs que sur le Licou** : un +X/−Y gratuit sur
  plusieurs cartes rendrait le Sable trop punitif pour ses propres créatures,
  qui sont justement petites et nombreuses.
