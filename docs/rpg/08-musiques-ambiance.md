# 08 — Musiques et ambiances du Sablier

## Thème principal hors parties

Hors des parties (`ecran !== 'partie'` : écran d'accueil, menus, atelier de
decks, catalogue, Souk, récit, journal, paramètres…), le thème principal du jeu
**`public/Desert Solitude with Percussion.mp3`** (`RPG_MAIN_THEME_FILE` /
`RpgMainThemeMusic` dans `src/games/rpgPlateauMusic.js`) tourne en boucle et
suit le réglage général du son (`sonActif`) ainsi que le curseur de volume des
musiques (`volumeMusique`). Dès qu'une partie démarre (`ecran === 'partie'`), il
s'interrompt immédiatement au profit de la musique du plateau ou de la tour,
puis reprend au retour dans les menus.

## Musiques d'ambiance des plateaux et des tours

En partie (`ecran === 'partie'`), les plateaux qui ont une piste dédiée
utilisent leur MP3 via `RpgPlateauMusic`. La Nécropole des dalles, le plateau
égyptien, joue `public/Egypt.mp3` ; **le Cercle des corbeaux**, la clairière
de la Tour du Corbeau, joue `public/raspberrymusic - A Vikings.mp3` (une seule
piste, en boucle). Les autres terrains peuvent rester sans piste propre ; les
boucles synthétisées en WebAudio des Tours de Bab El
(`src/games/rpgAmbientMusic.js`) prennent le relais en mode Histoire.

Chacune des **Tours de Bab El** dispose de sa propre boucle musicale
d'ambiance, intégralement **synthétisée en WebAudio** (`src/games/rpgAmbientMusic.js`).
Lorsqu'un plateau possède une piste dédiée, elle remplace la boucle de la Tour
pour éviter de faire jouer deux musiques en même temps : ainsi « La neige tombe
dans le noir » (Tour du Corbeau, 68 BPM) reste l'identité de la tour — on
l'écoute dans la salle d'écoute — mais se tait pendant les duels joués au
Cercle des corbeaux, où le MP3 viking prend la main.

La classe `RpgAmbientMusic` suit le même contrat de cycle de vie que la bande-son
de *Vice City Rush* (`cityRushAudio.js`) :

- `setTour(tourId)` sélectionne la tour (donc la boucle) ;
- `start()` / `stop()` / `pause()` / `resume()` pilotent la lecture ;
- `setMuted(muted)` coupe sans détruire les nœuds ;
- la musique est planifiée par une grille de 8 mesures × 16 pas (128 pas par boucle),
  entre 66 et 92 BPM — plus lent que la course, c'est une tension de duel,
  pas une poursuite.

Le niveau de la musique reste en dessous des bruitages du duel
(`rpgAudio.js`) : le duel reste lisible, la musique ne couvre jamais les
indications de cartes (soin, zone, cloche de l'Astrolabe). Nappes et cloches
reçoivent une réverbération stéréo très légère, générée à la volée ; les
attaques triangulaires filtrées restent douces sur les haut-parleurs mobiles.

## Les voix d'arrivée des créatures

Un troisième étage sonore, indépendant des boucles : **chaque créature entre en
jeu avec sa voix**. Le lot « Game voices » a livré 37 MP3 courts (0,65 s à
3,06 s, 80 kbps) à la racine de `public/`, et `src/games/rpgArrivalVoices.js`
les rattache carte par carte — le nom du fichier n'est presque jamais celui de
la carte (« Damiyo » pour le Daimyō du Soleil rouge, « Shogun » pour le
Samouraï du Torii, « Serpent de verre » pour la Vipère de verre, « Viking des
trois hivers » pour le Berserk des trois hivers…).

- **Déclencheur** : une entrée en jeu depuis la main, jamais un aperçu, une
  pioche, une réanimation, un jeton ni un retour de cale. Le moteur journalise
  toute arrivée (`rpgConsommerArriveesCreature`) et la page lit la voix.
- **Priorité** : la voix de la carte **remplace** les accueils génériques (cri
  pirate « Ahoy ! »/« Alright », quai des navires, réplique naine). Les cartes
  sans fichier gardent ces trois accueils.
- **Mixage** : gain de base 0,5 (`RPG_CARD_VOICE_VOLUME`), une seule voix à la
  fois (la précédente se met en pause), trois au plus par relevé, décalées de
  140 ms. Le son coupé et le curseur de volume s'appliquent comme aux autres
  échantillons (`syncOutputGain`), et `destroy()` coupe les départs en attente.
- **Écoute** : `sons-du-sablier.html` liste les 37 voix dans la section « Voix
  d'arrivée des créatures ».
- **La fiche parle** : ouvrir une carte en grand — le clic du catalogue, le
  clic droit ou l'appui long ailleurs dans le jeu — joue la voix de la créature
  ouverte (`jouerSonFiche`, `RpgDuelPage.jsx`). Une voix à la fois : feuilleter
  le catalogue ne superpose pas les répliques, chaque fiche coupe la
  précédente. Les cartes sans échantillon (terrains, magies, armes, créatures
  du lot silencieux) gardent l'effleurement `hover`, pour que l'ouverture reste
  audible.

Les fichiers plus longs de `public/` ne sont **pas** des voix : ce sont les
pistes de plateau ci-dessus, plus deux bruitages déjà branchés
(`viking warrior battle cry with horn.mp3` → `victoire`,
`26509 Thunder spark transition-full.mp3` → `foudre_marteau`).

## Les deux frappes de créature

Le duel n'a que **deux** sons de frappe pour les créatures, et ils ne se
superposent jamais pour un même attaquant (`src/games/rpgAttackAudio.js`) :

- **Attaque ciblée** → `fleche` (`src/games/assets/arrow-shot.wav`, 0,55 s,
  gain 0,6). La créature désigne sa proie avant le combat : son attaque est un
  tir, elle s'arrête sur sa frappe et le sorcier ne perd rien. Le fichier est
  généré par `tools/make-arrow-shot.mjs` (corde lâchée, claquement d'encoche,
  souffle de bande et sifflement d'empennage descendant), reproductible à
  l'octet près, aucun aléatoire.
- **Corps à corps** → `player_attack_hit` (`player-attack-hit.wav`), ou le
  souffle de l'élément quand une capacité de combat qui blesse se déclenche
  (`rpgCombatSound`). C'est le cas d'une créature bloquée et de la plaque du
  sorcier.

`rpgSonsResolutionCombat(resume, { sonMelee, sonFleche, delai })` lit le résumé
du moteur et rend les sons dans l'ordre d'écoute : la flèche d'abord (décalée de
15 ms pour ne pas s'écraser sur le choc), le corps à corps ensuite. Une
résolution peut demander les deux — deux attaquants différents — mais **une
frappe ciblée seule ne joue jamais le coup d'épée**, même quand l'attaquante est
la seule à attaquer. C'est le reproche d'origine : le son commun, perçu comme
un sabre, couvrait la flèche.

`tests/rpg-fleche-audio.test.js` vérifie le catalogue, le filtrage des frappes
ratées ou annulées et le routage du lecteur ; `tests/rpg-fleche-audio-ui.test.js`
joue la vraie page du duel (jsdom) sur une Attaque ciblée seule et contrôle le
`<audio>` réellement alimenté.

## Comment elle se déclenche

La page du duel (`src/games/RpgDuelPage.jsx`) tient une instance de
`RpgAmbientMusic` pour toute sa vie :

- lancer un étage (`demarrerEtage`) choisit la tour de cet étage et démarre
  sa boucle **dans le geste joueur** — les navigateurs n'accordent un contexte
  audio qu'à un tel geste ;
- rentrer au menu, lancer un duel libre ou couper le son arrête la boucle
  (`stop()`), sans détruire les nœuds ;
- un onglet mis de côté met la boucle en pause (`pause()`), elle reprend au
  retour (`resume()`) ;
- le bouton ♫ de la barre du duel — ou la touche `M` — coupe et rend la
  musique et les bruitages. La préférence est mémorisée sur l'appareil
  (`letsplay_sablier_sound_v1`), comme celle de Vice City Rush, et le son
  revient par défaut.

Le mode Histoire est la seule scène qui fait jouer de la musique : un duel
libre n'a pas de tour, donc pas de boucle. Le rendu est vérifié par
`npm run check:rpg-ambient-ui`, qui rend la page et compte les nœuds audio
réellement planifiés.

## Les cinq ambiances d'origine

Les cinq premières tours ont leur fiche ci-dessous. Les tours ouvertes depuis
(les Corsaires, le Soleil rouge, la Nécropole, le Corbeau, le Sablier renversé)
suivent le même contrat — une boucle par tour, un thème déclaré dans
`RPG_AMBIENT_THEMES` — et se lisent dans le code ; celle du **Corbeau** est
détaillée au dossier 22, §5.

### 1. La Tour des Listes — *Le Grand Horloger compte ses noms*
- **BPM** : 78
- **Tonalité** : Dm · Bb · F · Am (mineure administrative, descendante)
- **Textures** : tic-tac métronomique de bois, clochettes hautes qui tintent
  toutes les quatre mesures, gratte de plume sur le registre.
- **Métaphore sonore** : la Chambre des Heures classe les quartiers
  évacuables ; chaque tic-tac est un nom de plus sur la liste.

### 2. La Tour du Souk — *Les étals ne ferment jamais*
- **BPM** : 92
- **Tonalité** : Em9 · F · Am · G7 (accords orientaux avec secondes)
- **Textures** : darbouka sur les temps 1/3, claquements secs sur 2/4,
  ouds et zurna/nay qui vous hèlent du fond des étals ; une rumeur
  chuchotée et continue pour la foule lointaine, basse bondissante du
  guitarrón.
- **Métaphore sonore** : trente étals suspendus, trente marchands qui
  négocient — rien ne se vend à perte.

### 3. La Tour des Sables — *Le zénith sur le portail*
- **BPM** : 70
- **Tonalité** : Dm7 · Gm7 · Bb · A (grave, solennelle, large)
- **Textures** : gongs profonds tous les deux temps, cordes très lentes
  en dessous, vent de sable qui couvre tout en permanence, tintements
  métalliques sporadiques (clous dans la porte, éclats de verre sous le
  sable), crépitement aigu des grains du sablier. Le cor du zénith
  n'entre qu'à la seconde moitié de la boucle.
- **Métaphore sonore** : la dernière tour au-dessus du portail. Ce qui
  s'y joue décide de ce que Bab El devient.

### 4. La Tour des Abysses — *Les cloches du fond répondent*
- **BPM** : 66
- **Tonalité** : Cm7 · Abmaj7 · Ebm7 · Bb7 (flottante, renversée)
- **Textures** : nappe sinusoïdale étouffée par l'eau, ressac grave et
  continu au ralenti, cloches sous-marines toutes les deux mesures
  (partiels aigus atténués), bulles et gouttes d'eau au hasard, chants
  de baleine lointains à la seconde moitié de la boucle.
- **Métaphore sonore** : une tour d'eau sans un grain de sable. L'abîme
  répond à chaque carte, rien ne passe sans contre.

### 5. La Tour du Fjord — *Neuf hivers de mémoire et de glace*
- **BPM** : 84
- **Tonalité** : Dm · F · C · Gm7 (mineure nordique), bourdon de quinte
  ouverte (D/A) tenu en permanence comme une tampagne.
- **Textures** : grosse caisse sourde sur 1/3 (pas de la garde), chocs
  de boucliers sur 2/4, vent froid aigu en permanence sur les hautes
  fréquences, cri aigu du cor (Gjallarhorn) une fois par boucle,
  crissements de neige sous les pieds, complainte des scaldes en
  seconde moitié.
- **Métaphore sonore** : neuf hivers de mémoire et de glace, tenus par
  des serments qu'on ne prononce pas deux fois.
