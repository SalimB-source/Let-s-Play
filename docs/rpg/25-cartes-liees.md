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
| **Sort** | Les champs de `lien.effet` **remplacent** ceux de l'effet imprimé (`2` dégâts → `4`) ; le reste de l'effet est inchangé (cible, durée, mots-clés). |
| **Coût** | **Inchangé.** Ni remise, ni surcoût, ni mana détruit. |
| **Texte** | La règle s'imprime sur la carte (« Lien de Tin Hinan — … »), comme Abordage, Harakiri ou Malédiction. Un test vérifie que chaque Lien nomme une ancre mythique **qui existe** et que le texte la nomme : aucune fiche ne peut dériver de sa mécanique. |

## 3. Les cinq paires du prototype

Toutes existaient déjà par leur nom ; le prototype ne fait que brancher la
mécanique sur des cartes du catalogue.

| Carte liée | Coût | Sans l'ancre | Avec l'ancre | Ancre |
| --- | --- | --- | --- | --- |
| **Takouba des pistes** (arme, commune) | 3 | +2/+0 · Infiltration | **+4/+2** · Infiltration | Tin Hinan, mère des pistes (Sable, mythique, 5) |
| **Masque du guetteur** (arme, rare) | 2 | +1/+1 · pioche sur blessure | **+3/+3** · pioche sur blessure | Le Passeur au masque de chacal (Ténèbres, mythique, 6) |
| **Eau de la source** (magie, commune) | 1 | soigne **4** PV | soigne **8** PV | La Source de Bimini (Site mythique, Eau + Sable, 3) |
| **Vent rouge** (magie, rare) | 3 | **2** dégâts à toutes les créatures adverses | **4** dégâts | Daimyō du Soleil rouge (Braise, mythique, 5) |
| **Serment de la forge** (magie, mythique) | 4 | +2/+1 · Attaque ciblée | **+3/+2** · Attaque ciblée | Eirik du Premier Serment (Braise, mythique, 1) |

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
| `src/games/rpgCards.js` | La fiche `lien: { ancre, bonus?, effet? }` sur les cinq cartes, et les helpers purs : `lienDeCarte`, `lienSatisfait`, `effetLie`, `bonusArmeLie` |
| `src/games/rpgDuel.js` | `appliquerLiensArmes` (recalculé avec les auras par `rafraichirAuras`), l'application dans `rpgJouerArme` et `rpgLancerMagie`, le retrait dans `retirerArme` |
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
