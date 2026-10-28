# 25 — Les cartes liées (le Lien)

**Statut : prototype implémenté dans le moteur, le catalogue et l'IA.**
Cinq cartes du catalogue portent un **Lien** ; aucune carte n'a vu son coût
changer, et aucune carte n'est devenue injouable.

## 1. Le principe

Une carte **liée** se joue **toujours**, à son coût imprimé. Elle donne
simplement **plus** quand son **ancre** — la créature mythique dont elle porte
le nom, la lame, le masque ou le serment — tient une place sur la rangée du
même camp.

> **Sans l'ancre, la carte est une carte ordinaire. Avec elle, c'est une
> meilleure carte. Jamais une carte morte.**

C'est le point qui distingue le Lien d'une carte conditionnelle classique
(« jouable seulement si X est en jeu »). Avec 1 à 2 mythiques par deck de
30 cartes et **un seul exemplaire** par mythique (`cardCopyLimit`), une carte
strictement conditionnelle est une carte morte dans **55 à 70 % des parties** :
au tour 5, un deck a vu 8 cartes sur 30 (27 % de chances de tenir son ancre),
au tour 10, 13 cartes (43 %). Une dépendance stricte n'est pas un drawback,
c'est une loterie dans la main — et elle contredit la règle du dossier
(« aucune défaite ne doit être une surprise », `03-combat.md`). Le Lien
supprime la loterie et garde la tension : l'adversaire doit choisir entre
tuer l'ancre ou subir la version renforcée.

**Le Lien ne réduit jamais un coût.** Une carte liée se paie plein tarif dans
les deux cas ; c'est un **renfort**, pas une remise. Le disque de coût de la
main, de la table, du catalogue et de l'atelier reste donc la seule vérité
(contrat de `05-concept-cartes.md`), et rien n'est un coût caché.

## 2. La règle

| Point | Règle |
| --- | --- |
| **Ancre** | Une carte **mythique** du même camp, présente sur le champ : créature, héros ou Site (tout ce qui tient une place de la rangée). L'ancre **adverse** ne compte pas. |
| **Moment** | Le Lien se lit **à la résolution** : pour un sort, l'ancre doit être en jeu quand le sort se résout (la tuer en réponse le laisse se résoudre au tarif imprimé) ; pour une arme, il se lit **en continu**. |
| **Arme** | Le bonus du Lien **remplace** le bonus imprimé (`+2/+0` → `+4/+2`). Il se lève à l'arrivée de l'ancre, **retombe** à sa mort, et ne descend jamais sous 1 PV. |
| **Sort** | Les champs de `lien.effet` **remplacent** ceux de l'effet imprimé (`2` dégâts → `3`) ; le reste de l'effet est inchangé (cible, durée, mots-clés). |
| **Déclencheur** | `lien.remplace` réécrit un déclencheur de l'arme, pas seulement ses chiffres : le Masque du guetteur pioche alors **sans défausser** (`defausse: 0`). La fiche imprimée n'est jamais mutée. |
| **Arme-sort** | Une magie de type `arme` (Braise et sable, Sabre maudit) s'attache à l'**imprimé** puis vit son Lien en continu, comme une arme du prototype : le renfort retombe quand l'ancre s'en va, et il part avec l'arme si on la brise. Le registre `lienArmesBonus` retient la part de **chaque** arme séparément. |
| **Deux modes** | Un sort à cible double a deux montants : `amount` (une cible) et `secondAmount` (chacune des deux, 2 par défaut). Le Lien peut relever les deux, l'invite de ciblage annonce alors les chiffres du moteur au lieu des chiffres imprimés. |
| **Lien de nom** | `nominal: true` : la paire n'ajoute **aucun** chiffre, parce qu'une autre règle la fait déjà exister. Le drapeau est **obligatoire** pour un Lien sans effet : un Lien de nom doit être un choix dit, jamais un bonus oublié (le test du catalogue le vérifie). |
| **Lien de porteur** | `porteur: true` : l'ancre ne suffit pas à être **en jeu**, c'est **elle** qui doit tenir l'arme. Le Sabre maudit ne mord que la force entre les mains de la Flamme originelle — sur tout autre porteur, même avec Kagutsuchi sur la rangée, le `−2` reste. Et ce `−2` reste **mortel** : un 1/1 qui s'attache le sabre tombe sur-le-champ (la défense n'est pas planchée à l'attachement d'une arme). C'est le sens de la carte — le sabre est maudit, il coûte des porteurs. |
| **Coût** | **Inchangé.** Ni remise, ni surcoût, ni mana détruit. |
| **Texte** | La règle s'imprime sur la carte (« Lien de Tin Hinan — … »), comme Abordage, Harakiri ou Malédiction. Un test vérifie que chaque Lien nomme une ancre mythique **qui existe** et que le texte la nomme : aucune fiche ne peut dériver de sa mécanique. |

## 3. Les cinq paires du prototype

Toutes existaient déjà par leur nom ; le prototype ne fait que brancher la
mécanique sur des cartes du catalogue.

| Carte liée | Coût | Sans l'ancre | Avec l'ancre | Écart | Ancre |
| --- | --- | --- | --- | --- | --- |
| **Takouba des pistes** (arme, commune) | 3 | +2/+0 · Infiltration | **+3/+1** · Infiltration | +1/+1 | Tin Hinan, mère des pistes (Sable, mythique, 5) |
| **Masque du guetteur** (arme, rare) | 2 | +1/+1 · pioche **puis défausse** | **+2/+2** · pioche **sans défausse** | +1/+1 et la défausse tombe | Le Passeur au masque de chacal (Ténèbres, mythique, 6) |
| **Eau de la source** (magie, commune) | 1 | soigne **4** PV | soigne **6** PV | +2 PV | La Source de Bimini (Site mythique, Eau + Sable, 3) |
| **Vent rouge** (magie, rare) | 3 | **2** dégâts à toutes les créatures adverses | **3** dégâts | +1 dégât | Daimyō du Soleil rouge (Braise, mythique, 5) |
| **Serment de la forge** (magie, mythique) | 4 | +2/+1 · Attaque ciblée | **+3/+1** · Attaque ciblée | +1/+0 | Daimyō du Soleil rouge (Braise, mythique, 5) |
| **Nuage de cendres** (magie, rare) | 5 | **2** dégâts à toutes + 1 d'écho | **3** dégâts à toutes + **1** d'écho | +1, écho inchangé | Susanoo (Braise, mythique, 6) |
| **Brise-lame** (magie rapide, inhabituelle) | 3 | brise une arme adverse · pioche **1** | brise l'arme · pioche **2** | +1 carte | Orochi (Braise, mythique, 8) |
| **Braise et sable** (arme-sort, rare) | 3 | +1/+0 · Attaque ciblée · critique 25 % | **+2/+0**, le reste intact | +1 ATQ | Cavalier des deux sabres (Braise, mythique, 6) |
| **Feux de kitsune** (magie, rare) | 5 | **4** dégâts à une créature, ou **2** à chacune de deux | **5** dégâts, ou **3** et **3** | +1 sur les deux modes | Oni de la fournaise (Braise, mythique, 5) |
| **Sabre maudit** (arme-sort, rare) | 4 | +2/**−2** · critique **25 % ×2** | **+2/+0** · critique **50 % ×4** | le poison tombe, le critique se cumule | Kagutsuchi, Flamme originelle (Braise, mythique, 6) — **Lien de porteur** |
| **Frappe d'iaijutsu** (magie rapide, rare) | 1 | **2** dégâts à une créature | **3** dégâts | un cran, et la carte la plus jouable du set | Tojiro, le pourfendeur (Braise, mythique, 6) |
| **Poigne de givre** (magie rapide, commune) | 2 | **2** dégâts + gel | **3** dégâts, gel inchangé | le gel ne s'achète pas au détail | Valkyrie des glaces (Neige, mythique, 6) |
| **La Grande Pesée** (sorcellerie, rare) | 5 | −3 PV adverse / +3 / pioche 2 | **−4 / +4** | le même verbe : peser, c'est déjà manger | La Dévoreuse (Ténèbres, mythique, 6) |
| **Les feuillets** (sorcellerie, rare) | 4 | **3** cartes du paquet adverse au cimetière | **4** cartes | le greffier tient le registre | Le Maître des hiéroglyphes (Ténèbres, mythique, 5) |
| **Tempête de sable** (sorcellerie, rare) | 5 | **3** dégâts à toutes les créatures adverses | **4** dégâts | le zénith a l'échelle d'une déesse | Le Faucon du zénith (Sable, mythique, 5) |
| **Trait de braise** (magie rapide, commune) | 3 | **3** dégâts à une créature ou un sorcier | **4** dégâts | le chiffre de son propre souffle | La Lionne du midi ardent (Braise, mythique, 6) |
| **Rempart de dunes** (magie rapide, commune) | 2 | +0/+3 jusqu'à la fin du tour | +0/+3 **et un bouclier** | la Dame prête sa lumière | La Dame aux ailes d'or (Sable, mythique, 5) |
| **Lame de mer** (sorcellerie, commune) | 3 | **−3/−3**, exil si la défense tombe | **−4/−4**, exil inchangé | une morsure qui tue par la structure | Le Seigneur des mâchoires (Eau, mythique, 6) |
| **Lettre de marque** (sorcellerie, commune) | 2 | Abordage de la prochaine créature, **seuil coût − 1** | Abordage **au seuil du coût plein** | la lettre du Chasseur ouvre un coût de plus | Le Chasseur d'Ocracoke (Sable, mythique, 6) |
| **Le Grand Débarquement** (sorcellerie, rare) | 5 | cales pleines : **+2/+2** et Overkill | **+3/+2** et Overkill | l'assaut mord, il ne tient pas | La Barbe-Rousse, amiral des deux mers (Sable, mythique, 6) |
| **Lame des ergs** (arme vivante, rare) | 4 | chien de sable 1/1, porteur **+3/+1** | +3/+1 **et un bouclier** | sous le berger, la lame couvre au lieu de grandir | TAREK (Sable, mythique, 5) |
| **Javelot du beffroi** (arme, commune) | 2 | porteur **+2/+0** et Attaque ciblée | **+3/+0** et Attaque ciblée | la riposte du Contre-attaquant mord plus fort | Le roi Kusayla (Sable, mythique, 5) |
| **Cuirasse de sel** (arme, commune) | 2 | porteur **+0/+3** et Esquive | **+0/+4** au lieu de +0/+3 | un cran de défense, rien de plus — le cumul d'Esquive est une règle générale | Bouchra, guerrière des crêtes (Sable, mythique, 2) |
| **Festin des vaillants** (sorcellerie, commune) | 3 | soigne **2** aux créatures et **2** au sorcier | **3** et **3** | le banquet du Premier Serment | Eirik du Premier Serment (Neige, mythique, 1) |
| **Hurlement du blizzard** (sorcellerie, rare) | 4 | **2** dégâts à toutes les créatures adverses, gel 25 % | **3** dégâts, gel inchangé | le souffle grandit, pas le froid | Le Géant des banquises (Neige, mythique, 6) |
| **Le Poids** (magie rapide, commune) | 3 | −**2** PV au sorcier, +2 pour vous | identique **+ −2/−2 à une créature ciblée** | le sort ne change pas, il frappe en plus | La Barbe Noire, la malédiction (Ténèbres, mythique, 5) |
| **Haut-fond** (magie rapide, commune) | 1 | −**1/−2** jusqu'à la fin du tour | **−2/−3** | la marée monte d'un cran | Le Kraken (Eau, mythique, 8) |
| **Le Routier** (sorcellerie, inhabituelle) | 3 | pioche **2**, défausse 1 | pioche **3**, défausse 1 | la carte marine porte plus loin | Bakunawa (Eau, mythique, 4) |
| **Courant de retour** (sorcellerie, rare) | 3 | renvoie une créature adverse, pioche **1** | renvoie, pioche **2** | le petit frère de la grande marée | Le Léviathan (Eau, mythique, 8) |
| **Déflection** (magie rapide, rare, id `maree-contraire`) | 3 | contre un sort annoncé, pioche **1** | contre, pioche **2** | le serpent remonte le courant | Jörmungandr (Eau, mythique, 8) |

**La mesure du Lien : un cran, jamais un dédoublement.** C'est la règle de
calibrage : le Lien ne doit pas transformer une carte en bombe, seulement
récompenser la construction. Les premiers chiffres essayés (+4/+2 pour la
Takouba, 8 PV pour l'Eau, 4 dégâts pour le Vent rouge) étaient trop généreux —
un Lien se juge à l'écart, pas au total.

Les formes que prend ce cran :

- **les chiffres** d'une arme (`bonus`) ou d'un sort (`effet.amount`) ;
- **le déclencheur** d'une arme (`remplace`) : le Masque du guetteur pioche
  sans défausser, ce qui change la carte sans changer un seul nombre ;
- **la dette annulée** (`effet: { def: 0 }`, Lien de porteur) : le Sabre
  maudit ne mord que la force quand la Flamme le tient ;
- **une règle déplacée d'un cran** (`effet: { seuilPlein: true }`) : la Lettre
  de marque du Chasseur arme l'Abordage au **coût plein** au lieu de coût − 1.
  Ce drapeau est lu en **instantané** par `seuilAbordage`, comme le sceau du
  Pilote : le sceau est consommé par la pose avant que la prise ne soit tirée,
  donc le relire sur le camp donnerait toujours `false` ;
- **une cible supplémentaire** (`lien.cible` + `lien.debuff`) : le Poids de la
  Barbe Noire garde **exactement** son transfert de 2 PV et désigne **en plus**
  une créature adverse qui encaisse −2/−2. La fiche imprimée ne change pas de cibles ; c'est la
  table qui s'allume sur la créature quand l'ancre est en jeu, et le sort
  refuse de partir s'il ne reste aucune proie légale ;
- **le cumul d'un mot-clé à jet** : l'Esquive et le coup critique s'**additionnent**.
  L'Esquive vaut **25 %** par source ; une créature qui l'imprime et porte la
  Cuirasse de sel esquive donc à 50 %. Le calcul vit dans `recalculerEsquive`,
  le même patron que `recalculerCoupCritique` : il relit la fiche imprimée,
  les armes-sorts attachées et l'arme du prototype, et pose
  `entite.esquiveChance` que `tenterEsquive` jette réellement ;
- **le mot-clé prêté à une arme** (`lien.donne: { bouclier: 1 }`) : la Lame
  des ergs ne change aucun chiffre sous TAREK, elle couvre son porteur de la
  parade anti-sort. Fusionné avec le `donne` imprimé à l'attachement ;
- **le mot-clé prêté** (`effet: { bouclier: 1 }`) : le Rempart de dunes garde
  sa taille et pose en plus la parade anti-sort, comme le ferait une arme.
  Comme c'est une **Magie Rapide**, on peut le jouer **en réponse** : le
  sorcier annonce un sort de dégâts sur une de vos créatures, vous posez le
  Rempart pendant la fenêtre de réponse, et le bouclier arrive **avant** la
  résolution — le sort est bloqué et la créature gagne même les 3 PV. Sous la
  Dame, un Rempart à 2 manas vaut donc un contre, et il le fait sans rien
  changer au coût de la carte ;
- **la portée** d'un renfort (`effet.atk/def`) pour le Serment.

**Le Serment de la forge est une carte de Samouraïs** : son ancre est donc le
**Daimyō du Soleil rouge**, pas Eirik — le viking du Premier Serment prêtait à
confusion avec le mot « serment » de la carte, alors qu'aucun de ses effets ne
touche un Samouraï. Le Daimyō porte la bannière qui grandit les Samouraïs :
c'est lui, thématiquement, qui fait serment à la forge.

Deux remarques de conception, tirées de ces paires :

- **L'ancre chère n'est pas la seule bonne ancre.** Eirik coûte **1 mana** :
  c'est la mythique la plus jouable du catalogue, et elle devient le centre de
  gravité d'un sort à 4 manas. À l'inverse, le Passeur (6 manas) demande un
  vrai deck construit — le Lien paie alors la patience.
- **Une arme liée récompense le porteur, pas l'ancre.** La Takouba ne rend pas
  Tin Hinan meilleure : elle rend meilleure la créature qu'elle équipe, ce qui
  laisse le choix du porteur intact.

## 4. Où vit la mécanique

| Fichier | Rôle |
| --- | --- |
| `src/games/rpgCards.js` | La fiche `lien: { ancre, bonus?, effet?, remplace? }` sur les cinq cartes, et les helpers purs : `lienDeCarte`, `lienSatisfait`, `effetLie`, `bonusArmeLie`, `carteLiee` |
| `src/games/rpgDuel.js` | `appliquerLiensArmes` (recalculé avec les auras par `rafraichirAuras`), l'application dans `rpgJouerArme` et `rpgLancerMagie`, le retrait dans `retirerArme`, et les déclencheurs de porteur dans `declencherArmesAttaquants` |
| `src/games/rpgAI.js` | Le sorcier lit l'effet **réellement résolu** (`effetLie`) pour scorer son sort et choisir sa cible |
| `tests/rpg-liens.test.js` | Le catalogue, les helpers, et les cinq paires jouées des deux côtés (avec et sans ancre) |

Le contrat de calcul est celui des Auras : chaque entité ne retient que
l'écart qu'elle a déjà reçu (`lienArmeBonus`), pour qu'une arrivée, une mort ou
un renfort ne fasse jamais dériver les statistiques gagnées par ailleurs
(Furie, Résonance, bannière, autres auras).

## 5. Ce que le prototype ne fait pas encore

- **Aucune marque visuelle dédiée.** Le Lien se lit dans le texte imprimé de la
  carte, comme les autres mots-clés. L'étape suivante serait une pastille
  « Lien » dans `effetIcons.js` et un liseré sur la carte quand l'ancre est en
  jeu (il faut alors passer l'état du duel au rendu de la face).
- **Pas de tutorat.** Aucune ancre ne va chercher sa carte liée : c'est la
  variante « D » du dossier de conception, qui reste à trancher.
- **Pas de décote de puissance.** `puissanceCarte` ne sait pas encore qu'une
  carte liée vaut mieux avec son ancre et autant sans elle : la laisser au
  score imprimé est le choix conservateur (les decks automatiques et les
  recettes ne bougent pas). Une prime mesurée est à définir si le Lien se
  généralise.
- **Pas de validation PvP dédiée.** Le Lien ne change aucun coût et n'ouvre
  aucune action : le protocole du salon (doc 17) n'a rien de nouveau à refuser.

## 6. Vérifier

```bash
node --test tests/rpg-liens.test.js   # les cinq paires, catalogue et moteur
npm run check:rpg                     # régressions des règles classiques
npm run build
```

## 7. La règle de design, en une phrase

> **Le Lien ne prend jamais rien au joueur : il ne fait que rendre sa carte
> meilleure quand son mythe est là.**


## 8. Le menu — ce qui reste à trancher

Rien de cette section n'est codé : ce sont les choix à faire avant de figer le
Lien. Chaque proposition respecte la règle de calibrage (**un cran**).

### A. Trois arbitrages sur les paires actuelles

| # | Question | Options |
| --- | --- | --- |
| A1 | **Quelle Takouba ?** La `takouba-de-tin-hinan` (mythique, 4, +3/+2) porte littéralement le nom de son ancre — mais une arme mythique liée à une créature mythique ne se réunit que rarement. | 1. garder la **Takouba des pistes** (actuel, commune) · 2. la remplacer par la **Takouba de Tin Hinan** (+3/+2 → +4/+3) |
| A2 | **L'ancre du Serment de la forge.** Trois mythiques Samouraïs existent : le Daimyō (bannière), Tojiro le pourfendeur (duelliste), le Cavalier des deux sabres. | 1. **Daimyō** (actuel) · 2. **Tojiro** · 3. **Cavalier des deux sabres** |
| A3 | **Le Daimyō porte deux Liens** (Serment + Vent rouge). C'est un « cycle du Daimyō », assumé — ou on répartit ? | 1. garder les deux (cycle) · 2. déplacer Vent rouge sur la **Lionne du midi ardent** ou l'**Ifrit des ergs** |
| A4 | **L'ancre du Masque du guetteur** : le Passeur (actuel) ou le Maître des hiéroglyphes, l'autre mythique du set Ténèbres ? | 1. Passeur (actuel) · 2. Maître des hiéroglyphes |

### B. Douze nouvelles paires candidates

Toutes existent déjà dans le catalogue ; aucune n'est branchée. L'écart est
donné à titre de proposition.

| Carte non liée | Coût | Aujourd'hui | Lien proposé | Ancre (mythique) |
| --- | --- | --- | --- | --- |
| **Éclair du marteau** | 2 | 3 dégâts à une créature | **4 dégâts** | LE MAÎTRE DU MARTEAU (Neige, 7) |
| **Frappe d'iaijutsu** | 1 | 2 dégâts à une créature | **3 dégâts** | Tojiro, le pourfendeur (Braise, 6) |
| **Poigne de givre** | 2 | 2 dégâts + gel | **3 dégâts**, gel inchangé | Valkyrie des glaces (Neige, 6) |
| **Hurlement du blizzard** | 4 | 2 dégâts à toutes + 25 % de gel | **3 dégâts** | Géant des banquises (Neige, 6) |
| **Tempête de sable** | 5 | 3 dégâts à toutes les créatures adverses | **4 dégâts** | Le Faucon du zénith (Sable, 5) |
| **Feux de kitsune** | 5 | 4 dégâts, ou 2 à deux créatures | **5 dégâts / 3 et 3** | Kagutsuchi, Flamme originelle (Braise, 6) |
| **Nuage de cendres** | 5 | 2 dégâts à toutes + 1 d'écho | **3 + 1 d'écho** | Ifrit al-Ahmar, seigneur des braises (Braise, 5) |
| **Les feuillets** | 4 | 3 cartes du paquet adverse au cimetière | **4 cartes** | Le Maître des hiéroglyphes (Ténèbres, 5) |
| **La Grande Pesée** | 5 | transfert 3, pioche 2 | **transfert 4** | La Dévoreuse (Ténèbres, 6) |
| **Bâton des citernes** | 4 | +1/+2, serpents 1/1 | **serpents 2/2** | Le Serpent du monde (Neige, 8) |
| **Lame des ergs** | 4 | +3/+1, fait naître son chien de sable | **chien de sable 2/2** | Bouchra, guerrière des crêtes (Sable, 2) |
| **Neige noire** ⚠ | 6 | détruit les créatures de coût ≤ 3, gèle les survivantes | **seuil ≤ 4** — *hors calibrage* | Le Maître des corbeaux (Neige + Ténèbres, 7) |

Deux garde-fous, si ces paires sont retenues :

- **rester sous quinze cartes liées** sur 170 : le Lien est une signature, pas
  une couche de règles. Au-delà, il faudrait une pastille et un filtre dédiés ;
- **une ancre par carte, deux cartes par ancre au maximum** — c'est ce qui fait
  d'une mythique un centre de gravité sans en faire une pièce obligatoire.

Le Lien marqué ⚠ est le seul qui sorte de la règle de calibrage : passer un
**seuil de coût** de 3 à 4 n'est pas « un cran », c'est un palier — et un
palier, ça tue des cartes que le sort ne tuait pas. Il n'est là que pour
montrer où se trouve la limite.

### C. Ce qu'il reste à décider, en une ligne

1. A1 à A4 : les quatre arbitrages ci-dessus.
2. B : lesquelles des trente paires entrent dans le prototype.
3. Et si le Lien se généralise : pastille « Lien » dans `effetIcons.js` et
   liseré sur la carte quand l'ancre est en jeu.

---

## Le Lien se voit : la lueur dorée

Trente paires sont en jeu. Une carte liée reste lisible sans elles — mais au
moment où son ancre mythique tient une place sur la rangée du joueur, il faut
que ça se voie **avant** de la jouer.

- **En main** : la carte porte `is-lien-actif` (et `data-lien-actif="true"`) —
  un **filet d'or** (`#f2c94c`) peint **à l'intérieur** de la face, qui respire
  lentement, **et seulement si la carte est jouable maintenant**. Le filet dit
  « renforcée *et* disponible » ; sur une carte éteinte, il promettrait une
  action impossible.
- **Sur la table** : une arme liée déjà posée porte le même filet tant que son
  ancre tient sa rangée (`lienActifSurTable`), et le perd dès qu'elle part.
- **Trois signaux, jamais confondus** : le **halo blanc** dit « cette carte peut
  partir » ; le halo prend l'**or** sur une mythique (la rareté) ; le **filet
  doré du Lien** (intérieur) dit « elle est renforcée ». Le filet est posé en
  `outline` plutôt qu'en `box-shadow` justement pour cohabiter avec le halo :
  une carte liée et jouable garde son halo *et* son filet.
- **Mouvement** : `prefers-reduced-motion` fige la respiration, le filet reste.
- **La phrase elle-même** : « Avec <ancre> en jeu : … » ne porte **aucune
  icône d'effet** (le pictogramme d'un effet mentirait sur une phrase
  conditionnelle). Elle s'écrit **grisée** tant que le renfort n'est pas réel,
  et prend l'**or du Lien en gras** quand l'ancre tient la rangée **et** que la
  carte peut partir — les deux conditions du filet, dites dans le texte.
  Le découpage vit dans `rpgLienTexte.js` (une seule définition de la phrase),
  le rendu dans `RpgCardRules.jsx`, le style dans `rpg-card-rules.css`.
  Contrôles : `tests/rpg-lien-texte.test.js`.

Contrôles : `tests/rpg-lien-lueur.test.js`.
