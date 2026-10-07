# L'ARCADE ÉTERNELLE — design détaillé

**Statut : v0.2 — décisions verrouillées, prêt à produire.**
Complément de `CONCEPT-PLATEFORME.md` (le concept) : ce document descend au
niveau de la salle, de la carte et du réglage.

**Décisions prises** (à ne plus rediscuter sauf raison forte) :

| Sujet | Choix |
| --- | --- |
| Histoire | **L'Arcade Éternelle** — un Brouilleur efface les jeux de la mémoire des joueurs |
| Direction artistique | **Cel-shadé animé** — aplats, contour d'encre, animation des personnages sur les deux (12 img/s), caméra et effets à 60 ips, trames de manga |
| Cartes | **Clés + collection + deck équipé** — 12 cartes-pouvoir (3 équipées), 33 cartes-légende (3 équipées) |
| Prochaine étape | Ce document, puis les maquettes visuelles, puis le prototype du *feel* |

---

## 1. Le monde en un coup d'œil

**La Grande Salle** (hub) — une salle d'arcade de quartier, fermée depuis des
années, où douze bornes dorment sous les housses. **Le Brouilleur**, entité de
neige cathodique et de bandes magnétiques, s'y nourrit des jeux oubliés : quand
plus personne ne se souvient d'un jeu, il est effacé pour toujours. Le héros
est le **Dernier Client** — le seul dont le nom est encore en haut de la table
des scores, et c'est exactement ce qui l'autorise à entrer dans les bornes.

Chaque monde est **un jeu d'arcade que l'on rejoue de l'intérieur**, avec sa
propre direction artistique ; ce qui les relie, c'est la Salle, le Brouilleur,
et **PIX** — un petit débris 8 bits qui parle par bleeps, sert de boîte de
dialogue, de journal… et de HUD.

| # | Monde | Genre du jeu d'origine | Gimmick de gameplay | Cartes-pouvoir | Boss |
| --- | --- | --- | --- | --- | --- |
| 1 | **LE DÉSERT DE BITS** | Aventure-exploration 8 bits | Vent de sable, plateformes invisibles révélées par leur ombre, sables mouvants | Vent, Encre, Souffle, **Écho** | **SABLE-ROI**, le Colosse |
| 2 | **LE DOJO AUX MILLE TRANCHANTS** | Jeu de sabre | Parer au bon moment ; le sabreur ne bouge que si tu bouges | Serpent, Masque, **Miroir** | **LE SABREUR MUET** |
| 3 | **NÉON HAUTE-FRÉQUENCE** | City-builder vertical / mecha 90s | Magnétisme (rails, murs aimantés), pluie, ville verticale | Racine, Ombre, **Temps** | **HAUTE-FRÉQUENCE**, le DJ-mécha |
| 4 | **LE RING DES ANNÉES 90** | Jeu de combat | Salles régies comme des combats : barres de vie, manches, cordes élastiques | Foudre | **LE CROUPIER** |
| 5 | **LE CHÂTEAU DE CARTRIDGES** | Le jeu final | Tous les gimmicks réunis, pièges « programmés » | Débogage | **LE BROUILLEUR** |

**Pourquoi cette structure :** chaque monde peut avoir sa palette, sa musique et
ses règles tout en restant relié par la Salle. C'est la seule structure qui
permet de livrer **un monde complet et finissable** (le désert) sans que le jeu
ait l'air inachevé : la Salle montre les quatre autres bornes, éteintes.

---

## 2. Narration : ce qu'on apprend, quand

Pas de mur de texte. Chaque monde porte **une idée** et la raconte par le décor.

1. **Prologue (La Grande Salle)** — 8 cases de manga, sans dialogue. Le héros
   pose la main sur une borne : l'écran s'allume, le sol se dérobe. PIX se
   dégage de la poussière et bégaye son nom.
2. **Désert de Bits** — *« un jeu dont il ne reste que le premier niveau »*.
   Les salles sont incohérentes, les décors se répètent, la fin du stage est
   arrachée. Le joueur comprend l'enjeu en le voyant : **le Brouilleur mange
   par le bord du monde**.
3. **Dojo** — *« un jeu d'honneur corrompu »* : le Sabreur Muet obéit à une
   règle absurde parce qu'il n'a plus de joueur 2.
4. **Néon** — *« une ville qui tourne au ralenti »* : le temps y est détraqué, le
   Brouilleur s'en sert de batterie.
5. **Ring** — *« un championnat truqué »* : le Croupier distribue les victoires ;
   c'est le monde qui explique que le Brouilleur a des **adjoints** — des
   Démagnétiseurs, un par monde.
6. **Château de Cartridges** — la pile de toutes les cartouches mangées. Le
   Brouilleur s'y présente comme **le gardien de ce qu'on a oublié** : il ne
   hait pas les jeux, il a peur qu'on les oublie — et il les efface pour que
   personne d'autre ne les oublie. Fin ambiguë assumée (voir §16, à trancher).

**Ton** : chaleureux, drôle par PIX, tendu par le Brouilleur. Zéro cynisme :
c'est un hommage.

---

## 3. Le hub — LA GRANDE SALLE

Une seule pièce large, en vue de côté, traversable en 20 secondes. Elle
**change avec la progression** — c'est la récompense visuelle la plus forte du jeu.

| Élément | Rôle | Évolution |
| --- | --- | --- |
| **12 bornes** | 5 jouables (1 par monde) + 7 carcasses | Chaque monde nettoyé rallume une machine, redresse une enseigne, fait revenir un PNJ |
| **Le Comptoir** | Classeur, deck, carnets, statistiques | S'ouvre progressivement (le Comptoir est derrière une grille au départ) |
| **L'Atelier d'encre** | Recyclage des doublons (10 → 1 carte choisie), fabrique d'autocollants de borne | Débloqué au monde 2 |
| **Le Jukebox** | Choix de musique (débloque les thèmes des mondes finis) | Un titre par boss vaincu |
| **Le Mur des scores** | Temps, sans-dégâts, cartes, défis du jour | Rempli par les records du joueur, par appareil/compte |
| **La Borne du défi du jour** | Salle chronométrée du jour, classement léger | S'allume à la connexion du compte |
| **Le Tableau à punaises** | Carte du monde en planches de manga, indice de carte manquante | Se remplit salle par salle |

Aucun menu imbriqué à plus de deux niveaux. Tout s'ouvre **sur place**, dans la
Salle, en surimpression manga (le jeu ne se coupe jamais).

---

## 4. Le moveset complet

**De base dès la première minute** : courir, sauter (hauteur variable), saut
mural, accrochage de rebord, traverser les plateformes fines (bas + saut),
attaque 3 coups (le 3ᵉ projette), attaque en l'air, esquive roulade (0,15 s
d'invincibilité), se relever vite après une chute.

| # | Carte-pouvoir | Capacité | Verrous ouverts | Trouvée |
| --- | --- | --- | --- | --- |
| 1 | **VENT** | Double saut | Gouffres larges, corniches hautes, vides verticaux | Désert 1-1 |
| 2 | **ENCRE** | Dash (sol et air) | Herses, barrières fragiles, franchissement de pics | Désert 1-2 |
| 3 | **SOUFFLE** | Tir d'encre projeté | Braseros, cibles, cordes, murs d'encre | Désert 1-3 |
| 4 | **ÉCHO** | Onde sonore : révèle les faux murs, étourdit 1,5 s | Secrets du 3ᵉ niveau, ennemis à coque | Désert — boss |
| 5 | **SERPENT** | Grappin : ancrage aux corniches, ruisselle | Précipices, plafonds, balancement | Dojo 2-2 |
| 6 | **MASQUE** | Bombe : casse, pousse, allume | Murs fissurés, caisses-poids, plaques | Dojo 2-3 |
| 7 | **MIROIR** | Parade renvoyant projectiles, dévie un faisceau | Ennemis tireurs, énigmes de lumière | Dojo — boss |
| 8 | **RACINE** | Planer, prendre les courants ascendants | Descentes longues, cheminées d'air | Néon 3-1 |
| 9 | **OMBRE** | Phase : traverser les grilles fines 0,4 s | Sas, cages, coffres | Néon 3-2 |
| 10 | **TEMPS** | Ralentir le monde 3 s (recharge 20 s) | Engrenages, pales, ponts de scie, boss mobiles | Néon — boss |
| 11 | **FOUDRE** | Charge électrique : super saut chargé, surcharge les machines | Ascenseurs morts, portes automatiques, blindés | Ring 4-3 |
| 12 | **DÉBOGAGE** | Révèle pièges et chemins cachés, désamorce les faux murs | Le Château entier | Château 5-2 |

**Deck équipé** : **3 cartes-pouvoir actives** + **3 cartes-légende passives**.
Huit capacités, trois emplacements : le joueur compose son style (le vertical,
le fonceur, le collectionneur). Changement de deck **au hub et à chaque borne
d'arcade** — jamais au milieu d'une salle.

**Règle de gating** (non négociable) : *on ne peut jamais être bloqué par un
pouvoir qu'on n'a pas encore pu trouver.* Une porte fermée est toujours
**lisible** : le mur fissuré a des fissures, la grille fine est translucide, le
brasero est plein de bois sec. Le Carnet note automatiquement ce qu'on a vu sans
pouvoir le passer.

---

## 5. Les six familles d'ennemis

Six comportements, cinq peaux : le joueur réapprend une variante, jamais un
système. **Un ennemi = un verbe clair.**

| Famille | Comportement | Faiblesse | Désert | Dojo | Néon | Ring | Château |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Rôdeur** | Va-et-vient au sol, s'accélère s'il te voit | Se projette d'un coup | Scarabée de sable | Moine novice | Rat-câble | Perche à ressort | Bit rongeur |
| **Sentinelle** | Immobile, tire à vue (ligne droite) | Attaque dans le dos, Miroir | Idole de pierre | Archer-bambou | Antenne-relais | Chronométreur | Bouton « pause » |
| **Volatile** | Attend au plafond, plonge en piqué | Attaque en l'air | Vautour de pixels | Hirondelle d'acier | Drone de pluie | Panneau publicitaire | Curseur |
| **Chargeur** | Fonça droit dès qu'il te voit, s'écrase contre le mur | Esquive, parade, Foudre | Bélier de grès | Sanglier de lame | Moto-aimant | Lutteur masqué | Ram de disquette |
| **Blindé** | Coque : les coups normaux ricochent | Bombe, attaque par le dessous, Écho | Golem de grès | Samouraï carapace | Mécha de service | Catcheur cuirassé | Copie protégée |
| **Mirage / Fantôme** | Invisible sauf dans un cône de lumière ou sous Écho | Tir d'encre, Écho | Mirage de sable | Esprit du dojo | Fantôme de néon | Ombre du public | Fragment d'écran |

**Ennemis porteurs** : certains portent une lueur (2 % puis 8 % avec les cartes
légende « Porte-Bonheur » équipées) → une carte-légende tombe à leur mort.
C'est le canal qui récompense le combat plutôt que la fuite.

**Densité** : 3 à 7 ennemis par salle, jamais plus de 4 actifs à l'écran sans
que le joueur ait un endroit sûr où respirer.

---

## 6. MONDE 1 — LE DÉSERT DE BITS (la tranche verticale)

**Le pitch** : un jeu d'aventure 8 bits dont le Brouilleur a déjà mangé la fin.
Les dunes mangent les décors par plaques ; la borne éteinte dans la Salle en
montre encore la première image.

**Palette** : ocre brûlé, sable clair, ombres bleu-cendre, or des glyphes.
Contours d'encre noirs, **ombres en 2 tons**, trames de manga sur les dunes.

**Gimmicks du monde**
1. **Vent de sable** — pousse le joueur (force horizontale), s'inverse toutes les
   3 s en tempête (signalé par des drapeaux qui claquent). Jamais pendant un saut
   obligatoire : le vent modifie la trajectoire, il ne la subit pas.
2. **Plateformes invisibles révélées par leur ombre** — au sol, une ombre nette
   dessine le bloc qui flotte au-dessus. Lisible, spectaculaire, et c'est *le*
   plan signature du monde.
3. **Sables mouvants** — le joueur s'enfonce en 1,5 s ; on en sort par un saut
   mural voisin ou un dash. Étouffoir, pas tueur.
4. **Dalles de pierre 8 bits** — s'effritent 0,6 s après le contact (le compte se
   lit sur une fissure qui s'ouvre).
5. **Glyphes** — des fresques donnent des indices pour les énigmes à distance
   (ordre des leviers, code des poids).

### 6.1 Carte du monde 1

```
 [1-1 LE PUITS SEC] → [1-2 LES RUINES DE SABLE] → [1-3 LA CITÉ ENFOUIE] → [1-4 LE PORTAIL DU COLOSSE] → [ANTRE : LE CŒUR DU PUITS]
        ↑ retour possible par la borne d'arcade à tout moment ↑
```

Chaque stage se termine par une **borne d'arcade** = checkpoint + retour au hub
+ tableau de score. On ne traverse jamais deux stages pour changer de deck.

### 6.2 Stage 1-1 — LE PUITS SEC (10 salles, ~6 min)

Rôle : **tutoriel sans texte**. Chaque salle enseigne une chose et la fait
immédiatement utiliser.

| # | Salle | Contenu | Ce qu'on apprend |
| --- | --- | --- | --- |
| 1 | **L'ENTRÉE DU PUITS** | Plan large, borne allumée (checkpoint), PIX se présente en 3 bulles. Un mur de 3 tuiles, une corniche haute inatteignable (teasing) | Courir, sauter haut/bas |
| 2 | **LA DESCENTE DU VENT** | Puits vertical de 20 tuiles, plateformes en quinconce, 2 scarabées | Saut mural, accrochage de rebord |
| 3 | **LA SALLE DES DALLES** | 6 dalles qui s'effritent au-dessus d'un ravin. *Secret n1* : corniche à gauche → 25 jetons | Saut court, précision |
| 4 | **LE COULOIR DES IDOLES** | 2 idoles qui tirent des éclats de pierre, couverts verticaux | Esquive, se mettre à couvert |
| 5 | **LA FONTAINE SÈCHE** | Levier A ouvre la trappe ; levier B cède sous un poids (bombe, plus tard) → « on reviendra » | Les énigmes d'objet existent |
| 6 | **LES SABLES MOUVANTS** | Deux fosses d'enlisement, traversée par dalles | Lire le danger du sol |
| 7 | **LA CORNICHE CACHÉE** | *Secret n2* : faux mur qui ne s'ouvre qu'au tir d'encre → 1 carte-légende commune | Rien n'est perdu, tout se reprend |
| 8 | **LE PUITS AUX TROIS ISSUES** | Droite = suite ; haut = 40 jetons ; bas = chambre d'élite (2 scarabées + 1 vautour) | Choisir, risquer |
| 9 | **L'ANTRE DU SCARABÉE** | Élite : apparition en 2 cases de manga → **CARTE DU VENT (double saut)** sur un socle | La carte est un personnage, pas un item |
| 10 | **LA BORNE DE SORTIE** | Borne : retour au hub, records du stage | La boucle hub ↔ monde |

**Boucle pédagogique** : la corniche de la salle 1 est atteignable avec le double
saut — le joueur **revient de lui-même** et comprend tout le système du jeu.

### 6.3 Stage 1-2 — LES RUINES DE SABLE (11 salles, ~7 min)

Rôle : le vent, les caisses, le premier **objet local**, puis le **dash**.

| # | Salle | Contenu | Enjeu |
| --- | --- | --- | --- |
| 1 | **LE VIEUX PORTAIL** | Fresque-glyphe : 3 symboles dans un ordre (indice pour S9) | Mémoriser |
| 2 | **LE COULOIR DU VENT** | Vent latéral, plateformes fines, 1 scarabée | Incliner ses sauts |
| 3 | **LA TOUR PENCHÉE** | Ascension verticale, 3 vautours de pixels | Combat en l'air, double saut |
| 4 | **LA SALLE DES SCARABÉES** | 2 plaques de pression : poser un caisson sur chacune | Pousser, comprendre |
| 5 | **LE PUITS DU VENT** | Courant ascendant, 1 secret tout en haut (Racine requise → retour) | Télégraphier l'avenir |
| 6 | **LA CHAMBRE DU FIL** | **BOBINE DE FIL** derrière une dalle à repousser | Premier objet-clé |
| 7 | **LE COULOIR FRACTURÉ** | Un bélier de grès ; au fond, **CARTE DE L'ENCRE (dash)** | Le dash arrive *après* la difficulté qu'il résout |
| 8 | **LE MUR FISSURÉ** | Mur qui cède au dash, raccourci vers S2 | Récompense immédiate |
| 9 | **LA COURBE DES BRASEROS** | 3 braseros à allumer dans l'ordre de la fresque ; sans tir → retour plus tard (1 légende brillante) | Énigme à distance |
| 10 | **LA GRILLE À CONTREPOIDS** | Fixer la bobine de fil : la grille de la salle 11 tombe | Utiliser l'objet |
| 11 | **LA SALLE DES TROIS PORTES** | A = 1-3, B = retour 1-1, C = chambre de jetons gardée par un blindé | Clore le stage par un choix |

### 6.4 Stage 1-3 — LA CITÉ ENFOUIE (12 salles, ~9 min)

Rôle : la verticalité, la tempête alternée, les **ombres**, la **salle-défi**,
puis le **tir d'encre**.

| # | Salle | Contenu | Enjeu |
| --- | --- | --- | --- |
| 1 | **LE SEUIL ENSEVELI** | Tempête qui s'inverse toutes les 3 s, drapeaux indicateurs | Lire le vent |
| 2 | **LA PLACE DES OMBRES** | 8 plateformes invisibles révélées par leur ombre, au-dessus du vide | Le plan signature |
| 3 | **LES TOITS DE LA CITÉ** | Course-poursuite, 2 idoles perchées | Rythme, vitesse |
| 4 | **LA TOUR DE GUET** | Escalier en tire-bouchon, 2 mirages visibles seulement en cône de lumière | Lumière = information |
| 5 | **LA CHAMBRE DU FUSIBLE** | **FUSIBLE DE CUIVRE** sous un tapis de sable + 1 dalle | Chercher sous le décor |
| 6 | **LE PUITS AUX ÉCLATS** | Pics au plafond, enchaînement de dash imposé | Maîtrise du dash |
| 7 | **LA SALLE-DÉFI « 60 SECONDES »** | 3 vagues d'ennemis, porte qui se referme ; **1 carte-légende rare** | Combat pur |
| 8 | **LA MACHINE AU FUSIBLE** | Insérer le fusible → l'ascenseur fonctionne | Objet → mécanique |
| 9 | **L'ASCENSEUR DES DUNES** | Plateforme mouvante verticale, vol de vautours | Timing |
| 10 | **LE SANCTUAIRE DU SOUFFLE** | **CARTE DU SOUFFLE (tir)** ; à la sortie, 3 cibles imposées | Le tir est enseigné en 15 secondes |
| 11 | **LE RETOUR DES BRASEROS** | Porte latérale vers 1-2 : allumer les 3 braseros → légende brillante + raccourci permanent | La boucle Metroidvania |
| 12 | **LA BORNE DU HAUT** | Borne, sortie | — |

### 6.5 Stage 1-4 — LE PORTAIL DU COLOSSE (12 salles, ~10 min)

Rôle : l'examen. Rien de neuf, tout est mélangé, et deux élites gardent la
**Clé de Sable** du boss.

Salles : **1** Les Escaliers Mangeoires (vent + dalles) · **2** Le Guet de Sable
(idoles ×3, tir requis) · **3** La Carrière (caissons, plaques, bombe à venir) ·
**4** L'Échoppe du Cartographe (PNJ : vend une légende rare contre 150 jetons) ·
**5** La Salle des Ombres Longues (invisibles + mirages) · **6** Mirage
Faussaire — *élite* : un mirage qui copie vos mouvements · **7** Le Puits Sans
Fond (descente, 0 tolérance) · **8** La Chambre des Blindés — *élite* : 2 golems ·
**9** La Fontaine Retrouvée (retour à 1-1 : le poids de la salle 5, enfin
soluble) · **10** La Salle des Douze Colonnes (salle-défi d'esquive, 0 dégât
imposé) · **11** Le Gardien Adjoint — *mini-boss* : un Démagnétiseur adjoint,
3 manches courtes, il tombe et laisse la **CLÉ DE SABLE** · **12** Le Portail
(porte du boss, hub possible).

### 6.6 Antre du boss — LE CŒUR DU PUITS

Une arène unique, ronde, dont le sol est un tambour de pierre. **Plaque de nom**
à l'entrée : « SABLE-ROI — DERNIER BOSS DU DÉSERT DE BITS ». Trois phases, une
barre de vie unique en trois segments, un checkpoint juste avant.

| Phase | Ce qu'il fait | Ce que le joueur utilise |
| --- | --- | --- |
| **1. Les poings** | Double coup de poing au sol (secousse + onde de sable à sauter), jet de rochers (2 projectiles télégraphiés) | Double saut, esquive |
| **2. La tempête** | S'enterre, la tempête s'inverse en continu, des plaques de plafond tombent du haut, des scarabées sortent du sol | Lire les ombres (rappel de la salle 2), dash |
| **3. Le cœur** | La coque s'ouvre : un cœur d'écran clignote par intermittence ; il balaie l'arène de rayons et rappelle ses scarabées | Tout : sauter, dasher, tirer dans la fenêtre |

**Récompenses** : **CARTE-ÉCHO** (onde sonore), la carte-légende **animée
« SABLE-ROI »**, la porte du monde 2 qui s'allume dans la Salle, un titre de
jukebox et la vignette « monde nettoyé » sur le tableau à punaises.

**Après le boss**, la Salle change visiblement : les néons du plafond
s'allument par moitié, un PNJ (le Vieux Cartographe) s'installe au comptoir,
la borne 2 sort de sa housse.

### 6.7 Objets-clés du monde 1

| Objet | Où on le trouve | Où il sert | Indice donné |
| --- | --- | --- | --- |
| **Bobine de fil** | 1-2, S6 | 1-2, S10 (grille) | Le fil qui pend de la grille |
| **Fusible de cuivre** | 1-3, S5 | 1-3, S8 (ascenseur) | Le boîtier vide et la fumée |
| **Clé de Sable** | Mini-boss, 1-4 S11 | 1-4, S12 (portail du boss) | Le trou de serrure en forme de croissant |
| **Caissons** (×3) | Sur place | Plaques de pression (1-2 S4, 1-4 S3) | Le poids qui les fait cliqueter |

Le **Carnet** écrit tout seul, en français, ce qui manque :
*« Grande herse de pierre — un mécanisme, plus haut. »*

### 6.8 Où sont les 12 cartes du monde 1

| Carte | Type | Salle | Condition |
| --- | --- | --- | --- |
| VENT (double saut) | Pouvoir | 1-1 S9 | Vaincre l'élite scarabée |
| ENCRE (dash) | Pouvoir | 1-2 S7 | Fin du couloir fracturé |
| SOUFFLE (tir) | Pouvoir | 1-3 S10 | Sanctuaire |
| ÉCHO (onde) | Pouvoir | Boss | Phase finale du Sable-Roi |
| Scarabée d'Or | Légende commune | 1-1 S7 | Secret n2 (faux mur, tir requis) |
| Le Puits Sans Fond | Légende commune | 1-2 S11 | Chambre de jetons (blindé) |
| Le Cartographe Aveugle | Légende rare | 1-3 S7 | Salle-défi sans dégâts |
| La Dune qui Chante | Légende rare | 1-4 S5 | 3 ombres longues enchaînées |
| Gardien de la Fontaine | Légende brillante | 1-4 S9 | Retour à 1-1 avec la bombe |
| Sable-Roi | Légende animée | Boss | Sans perdre de vie (revanche possible) |
| Le Fil qui Ne Casse Pas | Légende commune | 1-2 S9 | 3 braseros dans l'ordre de la fresque |
| Porteur de Sable | Légende commune | 1-3 S3 | Ennemi porteur (hasard, 8 %) |

**Total monde 1 : 12 cartes** (4 pouvoirs + 8 légendes). Deux d'entre elles ne
sont atteignables qu'en revenant avec des pouvoirs d'ailleurs : c'est voulu, et
c'est signalé en silhouette dans le Classeur.

### 6.9 Réglage de difficulté du monde 1

- Cœurs de départ : **4** (+1 par légende « cœur » équipée, maximum 7).
- Dégâts : 1 cœur par contact simple, 2 pour un coup de charge ou une chute dans
  les pics. Rien n'enlève plus de 2 cœurs dans le monde 1.
- Bornes : une par stage (salles 1 et 10 de 1-1, etc.) + une avant chaque boss.
- Mort : retour à la borne, ennemis simples repopés, **cartes et objets
  conservés**, jetons conservés à 100 % (aucune punition monétaire).
- Le mode assisté (invincibilité, ralenti 0,75×, double saut offert d'emblée)
  est disponible depuis le menu du jeu, sans jugement, et **n'empêche pas les
  succès** — il les marque d'un petit signe sur la carte du stage.

---

## 7. Les autres mondes (fiches courtes)

### 7.1 LE DOJO AUX MILLE TRANCHANTS (jeu de sabre)
- **Décor** : forêt de bambous sous la lune, dojo en bois, cerisiers, brume.
- **Gimmick** : **le sabreur ne bouge que si tu bouges**. Les Sentinelle-archers
  tirent en rythme ; les plateformes de bambou plient puis se détendent.
- **Pouvoirs** : SERPENT (2-2), MASQUE (2-3), MIROIR (boss).
- **Boss — LE SABREUR MUET** : combat-parade en 3 phases ; il copie vos
  déplacements (phase 2) puis n'attaque qu'à l'instant d'un mouvement d'attaque
  (phase 3). **Le Miroir transforme le combat** : parer renvoie ses lames.
- Cartes-légende : 6 (dont « La Règle du Joueur 2 », animée).

### 7.2 NÉON HAUTE-FRÉQUENCE (ville verticale, mecha 90s)
- **Décor** : pluie, néons, dalle humide, autoroute suspendue, 30 étages.
- **Gimmick** : **magnétisme** — rails à aimanter (Foudre et Miroir modifient le
  champ), plateformes qui collent puis lâchent ; la pluie révèle les circuits.
- **Pouvoirs** : RACINE (3-1), OMBRE (3-2), TEMPS (boss).
- **Boss — HAUTE-FRÉQUENCE** : un DJ-mécha qui attaque **en rythme** ; les
  plateformes pulsent sur le tempo, les projectiles suivent la mesure. La phase 3
  coupe la musique — le silence devient le signal (rappel d'un classique du
  genre, assumé et détourné).
- Cartes-légende : 6.

### 7.3 LE RING DES ANNÉES 90 (jeu de combat)
- **Décor** : salle de catch/fighting-game, écran géant, foule en pixels,
  cordes élastiques, projecteurs.
- **Gimmick** : **les salles sont des combats** — barres de vie affichées,
  manches au meilleur des trois, la foule jette des objets, les cordes
  renvoient (on peut même s'en servir comme propulseur).
- **Pouvoir** : FOUDRE (4-3).
- **Boss — LE CROUPIER** : arbitre truqueur ; il « compte » les coups, et la
  triche s'accélère (phase 2 : il éteint les lumières ; phase 3 : il arbitre pour
  lui-même et invoque les champions des mondes déjà battus).
- Cartes-légende : 6. Mode **Tournoi** débloqué après le boss.

### 7.4 LE CHÂTEAU DE CARTRIDGES (final)
- **Décor** : une tour de cartouches et de cassettes empilées, salles qui
  rejouent les décors des quatre mondes en version corrompue.
- **Gimmick** : **DÉBOGAGE** — les pièges du château sont « programmés » : ils
  affichent leur trajectoire comme un code, et on peut les désamorcer.
- **Boss final — LE BROUILLEUR**, en trois phases qui **retirent des cartes du
  deck du joueur** (phase 1 : il efface un pouvoir équipé ; phase 2 : deux ;
  phase 3 : tous — on se bat à mains nues, et c'est la foule de la Salle qui
  rend les cartes une à une). C'est la seule fois où le jeu touche au deck, et
  c'est le sommet émotionnel.
- Cartes-légende : 3 ; « LE BROUILLEUR » reste hors collection (carte mémoire).

---

## 8. Catalogue des cartes

### 8.1 Les 12 cartes-pouvoir
(Voir §4 — ce sont les clés. Illustration : une carte à cadre doré, portrait du
génie du lieu, fond à motif du monde. Cinématique de 2 à 4 cases à l'obtention.)

### 8.2 Les 33 cartes-légende

**Raretés** : commune (C) · rare (R) · brillante (B, cadre métallisé) ·
**animée** (A, illustration animée en 8 images — la récompense du monde).

| Carte | Rar. | Monde | Effet passif équipé |
| --- | --- | --- | --- |
| Scarabée d'Or | C | 1 | +10 % de jetons |
| Le Puits Sans Fond | C | 1 | La première chute fatale laisse 1 cœur |
| Le Fil qui Ne Casse Pas | C | 1 | Recharge du grappin/dash −15 % |
| Porteur de Sable | C | 1 | Les ennemis porteurs brillent plus fort (8 % → 12 %) |
| Le Cartographe Aveugle | R | 1 | Les salles adjacentes non visitées s'affichent sur la carte |
| La Dune qui Chante | R | 1 | Secousses d'écran réduites, +5 % de vitesse en course |
| Gardien de la Fontaine | B | 1 | +1 cœur |
| **Sable-Roi** | **A** | 1 | +1 cœur et aimant à jetons (rayon 4 tuiles) |
| La Règle du Joueur 2 | C | 2 | Le premier coup reçu par manche ne compte pas |
| Le Sabre sans Nom | C | 2 | Dégâts du 3ᵉ coup +25 % |
| Le Bambou qui Plie | R | 2 | Chute de plus de 6 tuiles : aucune dégât |
| L'Hirondelle d'Acier | R | 2 | Attaque en piqué plus rapide |
| Gardien du Portail | B | 2 | +1 cœur |
| **Le Sabreur Muet** | **A** | 2 | Parade automatique une fois toutes les 8 s |
| Pluie sur les Néons | C | 3 | Les projectiles ennemis sont 10 % plus lents |
| Le Rat-Câble | C | 3 | Les pièges électriques infligent 1 dégât au lieu de 2 |
| Aimant de Poche | R | 3 | Les rails magnétiques se collent 2 tuiles plus loin |
| Le Dernier Étage | R | 3 | Vision dans le noir dans les salles non éclairées |
| Horloge de la Ville | B | 3 | Recharge du ralenti −25 % |
| **Haute-Fréquence** | **A** | 3 | Immunité aux dégâts de chute et aux sons assourdissants |
| Chronométreur | C | 4 | +15 % de vitesse de déplacement hors combat |
| Le Lutteur Masqué | C | 4 | Esquive 0,05 s plus longue |
| Corde Élastique | R | 4 | Rebond sur les cordes deux fois plus haut |
| Le Public des Années 90 | R | 4 | Les objets lancés par la foule ne vous touchent plus |
| Gardien du Ring | B | 4 | +2 cœurs pendant les salles-défi |
| **Le Croupier** | **A** | 4 | Une relance gratuite par stage après une mort |
| Fragment de Cassette | C | 5 | Révèle les faux murs dans un rayon de 3 tuiles |
| Cartouche Vierge | R | 5 | Une carte manquante du monde 1 apparaît en silhouette précise |
| Le Dernier Client | B | 5 | Toutes les bornes du jeu deviennent des points de retour |
| PIX (édition spéciale) | A | — | +1 carte-légende active (donc 4 soutiens) |
| Le Vieux Cartographe | R | — | Double les jetons gagnés dans les salles déjà visitées |
| L'Afficheur à Sept Segments | C | — | Affiche les points de vie des boss en chiffres |
| La Salle | B | — | Réduit de moitié le coût de l'atelier d'encre |

**Deux cartes mémoire, hors collection** (données par le scénario) : « LE
BROUILLEUR » et « LA VHS SANS ÉTIQUETTE » — elles se consultent depuis le
Comptoir, racontent le passé de la Salle et n'ont aucun effet.

**Extension possible (v2)** : des cartes-légende qui renvoient, via un lien, à
un test ou un article du site (chaque carte référence alors un jeu réel) —
le pont naturel entre le jeu et la rédaction de Let's Play.

---

## 9. Économie

| Monnaie | Où | À quoi |
| --- | --- | --- |
| **Jetons** | Ennemis, salles, secrets, temps de stage | Achats chez le Cartographe, autocollants de borne, jukebox |
| **Poussière d'encre** | Doublons de cartes, sans-dégâts, boss | 10 → 1 carte choisie (atelier), soit environ 6 h de jeu pour la collection complète |
| **Records** | Temps par stage, sans-dégâts, sans-carte-perdue | Aucun effet de puissance, purement affiché (Mur des scores) |

Pas de monnaie premium, pas de tirage payant, pas d'énergie. Le jeu ne
monétise rien : c'est une vitrine, elle doit rester généreuse.

---

## 10. HUD, contrôles, accessibilité

**HUD** (tracé au pinceau, discret, coins de l'écran) : cœurs, pions de dash,
carte(s) équipée(s) avec recharge, jetons, et — à la demande — la pastille PIX
qui rappelle la dernière info du Carnet.

**Contrôles**

| Action | Clavier | Manette | Tactile |
| --- | --- | --- | --- |
| Déplacement | ←→ / A D (ZQSD compatible) | Stick / croix | Pouce gauche : croix ou glissé |
| Saut / double saut | Espace ou Z | A / Croix | Bouton droit bas (grand) |
| Attaque | X / J | X / Carré | Bouton droit haut |
| Dash | C / K | B / Rond | Glissé gauche-droite |
| Pouvoir équipé | V / L | Y / Triangle | Bouton au-dessus du pouce droit |
| Esquive | Maj ou ↓+saut | Gâchette | Double tap arrière |
| Classeur / Carte | Tab | Select | Bouton PIX |

**Accessibilité** : remap complet, mode assisté (invincibilité, ralenti, double
saut offert), secousses et flashs réduits (obligatoire : le cel-shadé est
lumineux), sous-titres sur les cinématiques, taille de police du carnet,
contraste renforcé des contours, et **aucun QTE** (donc jouable à une main).

---

## 11. Carte du monde, carnet, journal

- **Carte du monde** : une planche de manga. Chaque salle visitée devient une
  case encrée ; les cases manquantes restent blanches avec un liseré. Icônes :
  carte obtenue (étoile), carte manquante (silhouette), objet (carré), boss
  (crâne), secret non résolu (point d'interrogation), borne (rond plein).
- **Le Carnet de PIX** : ce que j'ai vu et pas pu passer, en une phrase, avec la
  pastille du pouvoir probable. S'efface quand la salle est résolue.
- **Le Classeur** : pages par monde, pourcentage par page et global, filtre
  « manquantes », tri par rareté, lecture plein écran avec le lore.
- **Le Journal** : ennemis rencontrés, techniques apprises, records, succès.

## 12. Audio

- **Musique** : chiptune-orchestral par monde, en couches (basse + mélodie +
  percussions) qui s'ajoutent quand le joueur progresse dans un stage ; un thème
  de boss par monde, avec une intro de 4 secondes **plaque de nom**.
- **Silence** : coupé avant chaque boss, avant la phase 3 du final, et pendant
  la phase « sans cartes » du Brouilleur. Le silence est un instrument.
- **Bruitages** : courts, secs, façon dessin animé (pas de réalisme) — le coup
  de dash est un « fwoosh » d'encre, l'impact un « tak » de bois.
- **Réverbération par salle** (extérieur/caverne/salle close) : donne la
  profondeur que le rendu 2D ne donne pas.

## 13. Succès et métriques (branchement sur `src/achievements/catalog.js`)

Nouvelles métriques à ajouter au moteur (`engine.js`, `METRICS`) :
`arcadeRuns`, `arcadeStagesCleared`, `arcadeRoomsVisited`, `arcadeCardsFound`,
`arcadePowerCards`, `arcadeLegendCards`, `arcadeBossesBeaten`,
`arcadeNoHitStages`, `arcadePerfectRooms`, `arcadeDailyChallenges`,
`arcadeBestRoomTime`, `arcadeTokensEarned`.

Exemples de succès : *« Premier Jeton »* (1 carte trouvée, bronze) ·
*« Chasseur de cartes »* (12 cartes, argent) · *« Sans une égratignure »*
(boss sans dégât, or) · *« Collectionneur de la Salle »* (45/45, platine) ·
*« Le Dernier Client »* (terminer le monde 1 sans mourir, platine).

---

## 14. Technique

### 14.1 Moteur
**Canvas 2D maison, simulation déterministe à pas fixe (60 Hz)**. Raisons : les
collisions au pixel sont exactes, le cel-shadé est fait d'aplats (pas de
3D), et surtout **la simulation est testable sans navigateur** avec
`node --test` — la convention du dépôt (`cityRushRules.js` est de la donnée
pure testée ainsi). three.js orthographique reste l'alternative si on veut du
post-traitement lourd (trames en shader, profondeur de champ).

### 14.2 Fichiers prévus
```
src/games/
  plateformerRules.js      simulation pure : physique, collisions AABB, IA des
                           6 familles, portes, dégâts, ramassage des cartes
  plateformerStages.js     données des stages du monde 1 : salles, tuiles,
                           entités, portes, secrets, glyphes
  plateformerCards.js      catalogue des 45 cartes : id, nom, rareté, pouvoir,
                           effet passif, paramètres d'illustration, lore
  plateformerProgress.js   sauvegarde (localStorage + copie serveur, sur le
                           modèle de cityRushProgress.js)
  plateformerArt.js        dessin par le code : héros, ennemis, décors, trames
  plateformerAudio.js      musique en couches et bruitages (WebAudio)
  PlateformerWorld.jsx     canvas, boucle de jeu, HUD, entrées
  PlateformerPage.jsx      page du jeu : vignette, intro, commandes, plein écran
tests/plateformer-*.test.js       physique, gating des portes, cartes, sauvegarde
scripts/plateformer-*-check.mjs   parcours automatique de stages, UI en jsdom
```
Vignette `public/arcade-eternelle-thumb.jpg`, entrée dans la navigation « Jeux »,
chapitre dans `README.md` : mêmes rails que Mirage Rush et Vice City Rush.

### 14.3 Performance
60 ips sur un téléphone de milieu de gamme : 1 canvas, rendu en couches (décor →
entités → effets → HUD), décors cuits une fois dans des canvas hors écran,
**aucune allocation dans la boucle** (tableaux d'entités réutilisés), facteur
d'échelle interne plafonné à 2 sur les écrans haute densité, et le pas de
simulation découplé du rendu (un téléphone lent perd des images, pas de la
physique).

---

## 15. Tranche verticale (étape suivante) — critères d'acceptation

**Livrable** : La Salle (hub simplifié) + les 4 stages du désert + le boss +
12 cartes + une énigme complète (fil → grille → braseros).

Ça se termine si, et seulement si :

1. Un joueur qui n'a jamais vu le jeu **franchit la salle 1 de 1-1 sans
   explication écrite**.
2. Courir, sauter, attaquer et dasher sont **agréables à vide**, dans une salle
   sans ennemis (c'est le juge de paix de l'étape 2).
3. On peut **finir le monde 1 en 45 minutes** et **ne pas l'avoir fini à 100 %**
   (il reste des cartes, c'est voulu).
4. Aucun blocage définitif : chaque porte non franchissable est notée au Carnet.
5. 60 ips constants sur un écran de 390 × 844 (téléphone) et sur 1920 × 1080.
6. La sauvegarde survit à la fermeture de l'onglet **au milieu d'une salle**.
7. `npm run check:arcade` passe : parcours automatique du monde 1 de bout en bout,
   sans exception, plus les tests unitaires de physique et de gating.

---

## 16. Ce qui reste à trancher

1. **Nom du héros** : « le Dernier Client » (anonyme, fort) / **NOUR**
   (« lumière ») / un nom choisi par le joueur au prologue. — *recommandation :
   anonyme au départ, nommé par PIX après le monde 1.*
2. **Fin** : le Brouilleur vaincu s'efface (fin simple) / il se révèle être
   l'ancien meilleur joueur de la Salle, oublié de tous (fin qui serre la gorge)
   / la Salle s'ouvre au quartier et le jeu continue (fin chaleureuse).
3. **Repop des ennemis** après une mort : oui (classique, tension) / non
   (plus doux, plus rapide — recommandé pour un jeu web joué par sessions de
   10 minutes).
4. **Défi du jour** dès la v1, ou après le monde 1 fini et validé ?
5. **Langues** : le site est en fr/en/ar — les cinématiques manga se prêtent bien
   au sans-texte ; combien de dialogues à traduire (PIX muet = zéro) ?
6. **Portée musicale** : thème par monde en v1 (5 morceaux) ou chiptune unique
   déclinée tant que le monde 1 n'est pas joué de bout en bout ?
