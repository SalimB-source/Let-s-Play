# Invocations spéciales (Embuscade) — inventaire

Les cartes ci-dessous peuvent être posées **sans sacrifice ni quota** quand leur
condition est remplie à ton tour (phase principale) : c'est l'« Invocation
spéciale », appelée Embuscade en interne. Retirer une entrée d'un des trois
tableaux ci-dessous rend la carte **normale** : elle se joue alors uniquement
par l'invocation habituelle (coût, sacrifices, quota), et son texte perd la
puce Invocation spéciale.

Trois tableaux, une seule règle :

- **A** et **B** : la condition seule, aucun coût ;
- **C** : condition + parfois un coût supplémentaire (défausser une carte,
  exiler une créature du cimetière) ;

Les mêmes conditions valent dans **tous les modes** (duel classique, PvP, MOBA)
— `rpgEmbuscade.js` les relit à chaque annonce.

**50 cartes** au total.

## Embuscade simple (condition seule) — `src/games/rpgMobaEmbuscades.js` (9 cartes)

| N° | Carte | Coût | Stats | Set | Condition d’Invocation spéciale | Coût supplémentaire |
| --- | --- | --- | --- | --- | --- | --- |
| **1** | Ghul des cendres `ghul-des-cendres` | 1 | 1/1 | — | Vous contrôlez un autre Djinn. | — |
| **2** | Corbeau de givre `corbeau-de-givre` | 2 | 1/2 | corbeau-des-neuf-nuits | L’adversaire contrôle une créature de coût 3 ou moins. | — |
| **3** | Faiseur de passage `faiseur-de-passage` | 2 | 2/1 | — | Vous contrôlez une créature Sable. | — |
| **4** | Pilote de la Carreira `pilote-de-la-carreira` | 2 | 2/1 | lettres-de-marque | Vous n’avez aucun Navire en main. | — |
| **5** | Prêtre de la bouche `pretre-de-la-bouche` | 2 | 2/2 | balance-des-heures | Vous contrôlez une créature blessée et l’adversaire contrôle plus de créatures que vous. | — |
| **6** | FÉRIEL `feriel` | 3 | 3/2 | — | Vous contrôlez une créature Sable et une créature Braise distinctes, dont une blessée. | — |
| **7** | Kenshi de la forge `kenshi-de-la-forge` | 3 | 1/2 | serment-du-soleil-rouge | Vous contrôlez un autre Samouraï. | — |
| **8** | Veilleuse des citernes `veilleuse-des-citernes` | 3 | 1/2 | — | Vous contrôlez une créature blessée. | — |
| **9** | Völva soigneuse `volva-soigneuse` | 3 | 2/3 | serment-des-neuf-hivers | Vous contrôlez un Viking blessé. | — |

## Embuscade « Rapidité » (condition seule) — `src/games/rpgMobaRapidite.js` (26 cartes)

| N° | Carte | Coût | Stats | Set | Condition d’Invocation spéciale | Coût supplémentaire |
| --- | --- | --- | --- | --- | --- | --- |
| **10** | Chacal du seuil `chacal-du-seuil` | 1 | 2/1 | balance-des-heures | L’adversaire contrôle une créature de force 2 ou moins. | — |
| **11** | Djinn de la première étincelle `djinn-de-la-premiere-etincelle` | 1 | 2/1 | — | Vous contrôlez une créature Braise. | — |
| **12** | Messagère des cendres `messagere-des-cendres` | 1 | 1/1 | — | Vous contrôlez un Vampire indemne. | — |
| **13** | Bouchra, guerrière des crêtes `bouchra-guerriere-des-cretes` | 2 | 2/1 | — | Vous contrôlez une créature Sable blessée et avez une arme au cimetière. | — |
| **14** | Djinn de foudre `djinn-de-foudre` | 2 | 2/1 | — | Vous contrôlez un Djinn et l’adversaire une créature de force 3 ou plus. | — |
| **15** | Djinn des braises voilées `djinn-des-braises-voilees` | 2 | 2/1 | — | Vous contrôlez un autre Djinn et une créature Braise. | — |
| **16** | Fennec des décombres `fennec-des-decombres` | 2 | 3/1 | — | L’adversaire contrôle une créature blessée. | — |
| **17** | Gerboise des ruines `gerboise-des-ruines` | 2 | 2/1 | — | L’adversaire contrôle au moins deux créatures et vous avez au moins deux créatures en main. | — |
| **18** | Cotre de course `cotre-de-course` | 3 | 3/1 | lettres-de-marque | Vous contrôlez un autre Navire. | — |
| **19** | Danseuse des ombres de dune `danseuse-des-ombres-de-dune` | 3 | 2/2 | — | Vous contrôlez au moins deux autres Vampires. | — |
| **20** | Djinn de la flamme mourante `djinn-de-la-flamme-mourante` | 3 | 2/2 | — | Vous contrôlez un Djinn blessé. | — |
| **21** | Djinn de la flèche ardente `djinn-de-la-fleche-ardente` | 3 | 3/1 | — | Vous contrôlez un Djinn et l’adversaire une créature blessée. | — |
| **22** | Le Renégat `le-renegat` | 3 | 3/3 | lettres-de-marque | Vous contrôlez un Navire et l’adversaire contrôle une créature. | — |
| **23** | Rōnin du Soleil rouge `ronin-du-soleil-rouge` | 3 | 3/2 | serment-du-soleil-rouge | Vous contrôlez un Samouraï blessé. | — |
| **24** | Veilleuse au corbeau noir `veilleuse-au-corbeau-noir` | 3 | 2/3 | corbeau-des-neuf-nuits | Vous contrôlez un Vampire blessé. | — |
| **25** | Djinn des ailes de cendre `djinn-des-ailes-de-cendre` | 4 | 3/2 | — | Vous contrôlez un Djinn et l’adversaire une créature avec Envol. | — |
| **26** | Djinn du dernier brasier `djinn-du-dernier-brasier` | 4 | 4/3 | — | Vous contrôlez un Djinn et avez au moins deux magies dans votre cimetière. | — |
| **27** | SALEM `salem` | 4 | 3/4 | — | Vous contrôlez une créature, l’adversaire une créature de force 3 ou plus, et vous avez une Sorcellerie au cimetière. | — |
| **28** | Ifrit furtif `ifrit-des-ergs` | 5 | 5/3 | — | Vous contrôlez une créature Braise et l’adversaire une créature de force 3 ou plus. | — |
| **29** | Le cavalier du bûcher `le-cavalier-du-bucher` | 5 | 4/3 | — | Vous contrôlez une créature Braise blessée et l’adversaire une créature blessée. | — |
| **30** | Le roi Kusayla `kusayla-roi-des-imazighen` | 5 | 5/3 | — | Vous contrôlez une créature Sable et l’adversaire une créature de force 3 ou plus. | — |
| **31** | TAREK `tarek` | 5 | 4/5 | — | Vous contrôlez une créature Sable blessée. | — |
| **32** | Cavalier des deux sabres `cavalier-des-deux-sabres` | 6 | 5/4 | serment-du-soleil-rouge | Vous contrôlez un Samouraï équipé d’une arme. | — |
| **33** | La Lionne du midi ardent `lionne-du-midi-ardent` | 6 | 4/4 | balance-des-heures | Vous contrôlez une créature blessée et l’adversaire une créature de force 3 ou plus. | — |
| **34** | Le Chasseur d’Ocracoke `le-chasseur-d-ocracoke` | 6 | 3/6 | lettres-de-marque | Vous contrôlez un Navire et l’adversaire un Pirate ou une créature avec Abordage ou Butin. | — |
| **35** | Le Seigneur des mâchoires `seigneur-des-machoires` | 6 | 6/6 | balance-des-heures | Vous contrôlez deux créatures blessées et l’adversaire une créature de force 4 ou plus. | — |

## Embuscade imprimée (parfois avec un coût : défausse / exil) — `src/games/rpgMobaEmbuscadesImprimees.js` (15 cartes)

| N° | Carte | Coût | Stats | Set | Condition d’Invocation spéciale | Coût supplémentaire |
| --- | --- | --- | --- | --- | --- | --- |
| **36** | Ouvrier du natron `ouvrier-du-natron` | 1 | 1/1 | balance-des-heures | Défaussez une autre carte de créature de votre main, au choix. | défausse 1 carte de la main |
| **37** | Éclipse silencieuse `eclipse-silencieuse` | 3 | 2/1 | soldats-de-la-lune | L’adversaire contrôle une créature de force 2 ou plus. | — |
| **38** | Garde du trône givré `garde-du-trone-givre` | 3 | 2/4 | soldats-de-la-lune | Vous contrôlez une créature blessée et l’adversaire contrôle une créature. | — |
| **39** | Momie de lin `momie-de-lin` | 3 | 2/4 | balance-des-heures | Vous avez au moins deux cartes de créature dans votre cimetière. | — |
| **40** | Sanguinaire des dunes `sanguinaire-des-dunes` | 3 | 3/2 | soldats-de-la-lune | L’adversaire contrôle au moins deux créatures blessées. | — |
| **41** | Sentinelle des sables `sentinelle-des-sables` | 3 | 3/2 | — | L’adversaire contrôle une créature. | — |
| **42** | Veilleuse de la lune givrée `veilleuse-de-la-lune-givree` | 3 | 2/3 | soldats-de-la-lune | L’adversaire contrôle une créature de force 3 ou plus. | — |
| **43** | Veuve des urnes `veuve-des-urnes` | 3 | 2/3 | balance-des-heures | Défaussez une carte de magie de votre main, au choix. | défausse 1 carte de la main |
| **44** | Gardien au croissant `gardienne-du-croissant` | 4 | 3/1 | soldats-de-la-lune | Vous contrôlez une créature blessée sans bouclier. | — |
| **45** | Gardien des sept sceaux `gardien-des-sept-sceaux` | 4 | 3/4 | balance-des-heures | Vous avez au moins trois cartes dans votre cimetière. | — |
| **46** | Porte-étendard de l’éclipse `porte-etendard-de-leclipse` | 4 | 2/3 | soldats-de-la-lune | Vous contrôlez deux Vampires, dont un blessé. | — |
| **47** | Sorcier du ressac noir `sorcier-du-ressac-noir` | 4 | 2/2 | soldats-de-la-lune | Vous contrôlez un Vampire, avez une Magie Rapide au cimetière et l’adversaire une créature non-jeton de coût 3 ou moins. | — |
| **48** | Traqueur des nuits sans lune `traqueur-des-nuits-sans-lune` | 4 | 2/2 | soldats-de-la-lune | L’adversaire contrôle au moins deux créatures. | — |
| **49** | Lecteur du dernier nom `lecteur-du-dernier-nom` | 5 | 3/4 | balance-des-heures | Exilez une carte de créature de votre cimetière, au choix. | exile 1 créature du cimetière |
| **50** | Tojiro, le pourfendeur `tojiro-le-pourfendeur` | 6 | 5/5 | serment-du-soleil-rouge | L’adversaire contrôle un Djinn et vous contrôlez une créature blessée. | — |

## Décisions appliquées (ménage des Invocations spéciales)

Le ménage a retiré **27 cartes** des trois tableaux : elles sont redevenues des
créatures normales, sans puce ni encadré, et leur texte perd la phrase
d'Invocation spéciale. Il reste **23 invocations** (dont la Sentinelle des
sables, seule carte à réaction pure, hors tableaux).

Conditions réécrites :

| Carte | Nouvelle condition |
| --- | --- |
| Prêtre de la bouche | au moins 2 créatures au cimetière |
| Kenshi de la forge | vous contrôlez 2 autres Samouraïs |
| Bouchra, guerrière des crêtes | une arme au cimetière |
| Danseuse des ombres de dune | une créature blessée en face |
| Djinn de la flèche ardente | au moins 3 Djinns au cimetière |
| Le Renégat | une carte Trésor au cimetière |
| Rōnin du Soleil rouge | vous contrôlez Onna-musha des cendres |
| Veilleuse au corbeau noir | aucune créature en face |
| Djinn des ailes de cendre | une créature avec Envol en face |
| Lionne du midi ardent | une créature Eau **et** une créature Neige en face |
| Le Chasseur d'Ocracoke | un Pirate ou un Navire en face |
| Garde du trône givré | au moins un Viking au cimetière |
| Momie de lin | exilez une créature de votre cimetière, au choix (coût) |
| Sanguinaire des dunes | l'adversaire a au moins deux créatures blessées |
| Sentinelle des sables | aucune créature chez vous **et** une attaque directe (réaction) |
| Gardienne du croissant | vous contrôlez une créature blessée |
| Porte-étendard de l'éclipse | vous contrôlez au moins 3 créatures |
| Sorcier du ressac noir | exilez une Magie Rapide du cimetière, au choix (coût) |
| Tojiro, le pourfendeur | défaussez un Sabre maudit de votre main, au choix (coût) |

Inchangées : Pilote de la Carreira, Veilleuse des citernes, Völva soigneuse,
Chacal du seuil. La Gerboise des ruines devient une 1/1 et perd son Invocation
spéciale.
