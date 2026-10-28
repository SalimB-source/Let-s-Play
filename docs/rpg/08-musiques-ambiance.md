# 08 — Musiques et ambiances du Sablier

## Thème principal hors parties

Hors des parties (`ecran !== 'partie'` : écran d'accueil, menus, atelier de
decks, catalogue, Souk, récit, journal, paramètres…), le thème principal du jeu
**`public/Desert Solitude with Percussion.mp3`** (`RPG_MAIN_THEME_FILE` /
`RpgMainThemeMusic` dans `src/games/rpgPlateauMusic.js`) tourne en boucle et
suit le réglage général du son (`sonActif`) ainsi que le curseur de volume des
musiques (`volumeMusique`). Dès qu'une partie démarre (`ecran === 'partie'`), il
s'interrompt immédiatement au profit de la musique du plateau, puis reprend au
retour dans les menus. Il revient aussi comme morceau du **Sablier renversé**,
la dernière table du jeu (voir plus bas).

## Le niveau d'écoute commun des sons

Les échantillons du duel viennent de sources très différentes : la pioche
enregistrée très bas (`card-draw.wav`, -32 LUFS), un coup d'épée saturé
(`player-attack-hit.wav`, -6 LUFS), un cri viking, les 60 voix d'arrivée. Les
anciennes constantes réglées à la main (0,5 à 0,64) laissaient **trente-deux
décibels** d'écart entre la pioche — inaudible — et la frappe —
assourdissante.

`src/games/rpgNiveauxSons.js` porte désormais **la mesure de chaque fichier**
(niveau intégré LUFS selon ITU-R BS.1770, et crête en dBFS), et le gain en
découle :

    gain = 10 ** ((RPG_NIVEAU_CIBLE_LUFS - lufs_mesure) / 20)

Tout le jeu écoute donc au même niveau, **-20 LUFS** — soit 6 dB au-dessus des
musiques de plateau (~-26 LUFS une fois le gain 0,16 appliqué), et loin
au-dessus du thème principal hors parties. Le tableau des niveaux n'est jamais
réglé à la main :

    python3 tools/mesure-sons-sablier.py            # mesure, gains et écart obtenu
    python3 tools/mesure-sons-sablier.py --js       # le littéral à recopier après un ajout
    python3 tools/mesure-sons-sablier.py --egaliser # remonte les WAV trop pointus

Le geste tient en deux temps :

1. **les fichiers trop pointus sont remontés dans le fichier** — la pioche
   demandait +12 dB quand sa crête ne laissait pas la marge. On
   lance `python3 tools/mesure-sons-sablier.py --egaliser` : l'outil applique le
   gain puis un **limiteur à pré-lecture** (fenêtre de 5 ms, relâchement de
   120 ms) qui écrête à -1 dBFS, itère jusqu'à ce que la cible soit atteinte,
   et réécrit le WAV (PCM 16 bits, mêmes canaux, même fréquence). Deux
   fichiers : `card-draw.wav` (-32,5 → -20,2 LUFS) et la voix du Tengu
   (-29,5 → -20,5). Les MP3 fournis ne sont pas réécrits ;
2. **le gain de lecture** ramène chaque fichier au niveau commun, par un
   **nœud WebAudio** (`createMediaElementSource` + `GainNode`), dans un bus
   commun qui finit sur un limiteur de secours (-0,3 dBFS) pour les sons qui se
   superposent. Chaque gain reste borné par la marge de crête
   (`RPG_PLAFOND_CRETE_DBFS`, -0,5 dBFS) : les deux voix MP3 sans marge —
   « Celle qui pèse » (-24,1 LUFS) et « Le Maître des hiéroglyphes » (-21,4) —
   restent 4,1 dB et 1,4 dB sous la cible. Sans routage des médias (navigateur
   ancien), le gain retombe sur `audio.volume`, borné à 1.

Le **survol** de l'interface reste un murmure volontaire, mais c'est désormais
un **fichier** : `src/games/assets/hover.wav`, un extrait de 80 ms de la
glissière de `card-draw.wav`, découpé par `tools/make-son-survol.py`. Il
remplace la sinusoïde de 55 ms qui était le dernier son fabriqué par du code —
sur une carte qu'on s'apprête à poser, ce bip se confondait avec le geste et
donnait à la pose une couleur d'interface. Sa **dose** de 0,05 le garde 17,4 dB
sous le niveau commun (son fichier mesure -11,4 LUFS, il joue vers -37,4) : sur
une main de cartes qu'on balaie du regard, 0,22 s'entendait encore comme un
clic. Il n'a pas d'entrée dans la table des niveaux — un effleurement n'est pas
un événement, et
`tools/mesure-sons-sablier.py` l'écarte de la mesure (`SANS_NIVEAU_COMMUN`). Les **musiques** ont leur propre chaîne et leur propre curseur ;
elles ne sont pas dans cette table.

**Aucun son du jeu n'est synthétisé** : le moteur de synthèse (oscillateurs,
bruit blanc, réverbération de convolution, `hz()`) a été supprimé avec lui. Un
nom absent du catalogue se joue en silence — il n'y a pas de repli synthétique
pour masquer un fichier manquant.

## La pose de carte ne sonne plus

`card_place` a été **retiré du catalogue, du registre et du disque**
(`src/games/assets/card-place.wav` n'existe plus). Un duel pose des dizaines de
cartes : le bruit de pose était le son le plus répété du jeu, et son fichier
d'origine, enregistré à -37 LUFS, avait dû être remonté de 15,6 dB **dans le
fichier** pour être audible — un enregistrement faible ainsi gonflé fait
remonter son bruit de fond et ses artéfacts, d'où le timbre synthétique qu'on
entendait sous les créatures.

Ce qui reste à l'arrivée d'une carte :

| Gestes | Ce qu'on entend |
|---|---|
| Créature (les deux camps) | sa voix d'arrivée (`rpgArrivalVoices.js`), sinon le souffle de son élément, sinon **rien** |
| Créature à arrivée **ciblée** | le souffle part au clic qui désigne la victime, pas à la pose (`rpgArriveeAudio.js`) |
| Sort | **rien** à l'annonce — plus de souffle d'élément (`rpgSortAudio.js`) |
| Terrain, arme équipée | rien — le geste se lit à l'écran |

Un sort ne joue donc plus le souffle de son élément : ni le vent de Braise
(`flame_gust`), ni la vague d'Eau, qui tombait sur quatorze magies — jusqu'aux
cartes hybrides Sable comme la Lettre de marque ou le Grand Débarquement. Ces
deux nappes de bruit passaient pour un son d'interface synthétique posé sur le
sort avant même que son effet se lise. Seul l'Éclair du marteau garde son
tonnerre : il *est* le sort. La vague d'Eau a quitté le catalogue avec son
fichier (`water-wave.wav`, `rpgWaterAudio.js`).

**Le souffle appartient à l'effet, pas à la carte.** Une arrivée qui désigne
encore sa cible — la Tour de Braise et ses 1 dégât, l'Oni de la fournaise, la
Lionne du Midi ardent, le Maître du marteau — ne fait rien brûler au moment où
elle se pose : la victime n'existe pas encore, et le joueur peut encore
renoncer à la désignation. `sonArriveeAuPose` se tait donc tant que
`duel.arriveeEnAttente` est ouvert, et `sonArriveeALaDesignation` joue le
souffle sur la créature choisie (ou sur le visage adverse). PvP compris :
l'arrivée différée de l'adversaire sonne quand sa cible tombe, et seulement si
elle encaisse.

Les bruitages d'**événement** (frappes, destructions, contres, victoire,
défaite, pioche, pages) restent inchangés : ce sont eux qui portent le rythme
d'un duel, pas le claquement de chaque carte posée.

## Le son du duel vient du plateau

**Tout plateau a son morceau.** En partie (`ecran === 'partie'`), la musique
est celle de la table : `RPG_PLATEAU_MUSIC_FILES` (`src/games/rpgPlateauMusic.js`)
associe chaque `plateauId` à un MP3 de `public/`, joué en boucle par
`RpgPlateauMusic`. Il n'existe **plus de boucle d'ambiance par tour** : le
module `rpgAmbientMusic.js` et ses dix thèmes synthétisés ont été retirés, pour
que la musique d'un duel ne double jamais celle du plateau qui l'accueille.

Quelques tables, pour mémoire :

| Table | Piste |
|---|---|
| Nécropole des dalles | `public/Egypt.mp3` |
| Palais du Pharaon | `public/Egypt.mp3` (même Égypte, la salle du trône des Juges) |
| Cercle des corbeaux | `public/raspberrymusic - A Vikings.mp3` |
| Village Viking, Îles Célestes | `Viking Howl.mp3`, `Viking Howl (Take 2).mp3`, `audio/full-track.mp3` (tirage au lancement du duel) |
| Cour de l'Empereur | `audio/WayOfTheBushidoWithGeishaVocals.mp3`, `CherryBlossomStrings(Extended).mp3` |
| Cimetière des noms effacés / Fosse de l'Oubliée | `Le Sceau de Sang (Instrumental).mp3` et sa variante |
| Abysses phosphorescentes | `audio/deep-sea-underwater-ambience.mp3` |
| Sablier renversé | `Desert Solitude with Percussion.mp3` — le thème principal, pour la dernière table du jeu |

Les plateaux d'une même famille partagent parfois un fichier (la route
caravanière, le Souk et le Désert de verre jouent `arabian-travel.mp3`) : le
lecteur de conquête ne redémarre alors pas la piste au passage d'un terrain à
l'autre. `tests/rpg-plateaux.test.js` vérifie que **chaque** table du jeu a son
morceau et que le fichier est livré.

## Deux lecteurs, trois usages

- **`RpgMainThemeMusic`** (`rpgPlateauMusic.js`) — le thème principal, hors
  parties : menus, atelier, catalogue, Souk, récit, journal, paramètres.
- **`RpgPlateauMusic`** — un plateau, une piste, en boucle, avec sa propre
  reprise en pause et son volume (`BASE_PLATEAU_VOLUME`, 0,16 avant le curseur
  du joueur).
- **`RpgConqueteMusic`** (`rpgConqueteMusic.js`) — le relais des duels : il
  choisit la piste du camp qui mène au territoire (`campMusicalDuTerritoire`,
  60/40 avec hystérésis) et fond de l'une à l'autre en 1,2 s. Un lecteur par
  fichier garde la position pendant les allers-retours ; un fondu ne démarre
  qu'après un `play()` accepté, donc une politique d'autoplay refuse le fondu
  plutôt que de laisser le silence.

Le niveau de la musique reste en dessous des bruitages du duel (`rpgAudio.js`,
-20 LUFS) : le duel reste lisible, la musique ne couvre jamais les indications
de cartes (soin, zone, cloche de l'Astrolabe).

## Les voix d'arrivée des créatures

Un troisième étage sonore, indépendant des boucles : **chaque créature entre en
jeu avec sa voix**. Trois lots ont livré 60 fichiers courts (de 0,65 s à 3,97 s)
à la racine de `public/` — 50 MP3 et un WAV, le Tengu, ramené en PCM 16 bits
mono — et `src/games/rpgArrivalVoices.js`
les rattache carte par carte — le nom du fichier n'est presque jamais celui de
la carte (« Damiyo » pour le Daimyō du Soleil rouge, « Shogun » pour le
Samouraï du Torii, « Serpent de verre » pour la Vipère de verre, « Viking des
trois hivers » pour le Berserk des trois hivers…).

- **Déclencheur** : une entrée en jeu depuis la main, jamais un aperçu, une
  pioche, une réanimation, un jeton ni un retour de cale. Le moteur journalise
  toute arrivée (`rpgConsommerArriveesCreature`) et la page lit la voix.
- **Timing — la voix précède le plateau.** La réplique ne se joue plus *après*
  la pose : la page l'annonce avec le geste, **avant** que la créature ne
  touche sa rangée — au départ du vol de la carte depuis la main (720 ms de
  vol), à l'instant où la carte annoncée par l'adversaire se résout, ou pendant
  la déchirure du sacrifice (860 ms) qui fait la place. Le relevé d'arrivée
  consomme ensuite ces annonces (`voixAvanceesRef`) pour ne pas faire parler la
  carte deux fois. Les voix de la main — et celle de la carte annoncée — sont
  **préchargées** en silence (`RpgAudioPlayer.prechargerVoix`) : sans cela, le
  premier geste téléchargerait le MP3 et la réplique n'arriverait qu'une fois la
  créature posée. Si la créature est contrée ou la pose refusée, la voix déjà
  partie se tait (`couperVoix`).
- **Priorité** : la voix de la carte **remplace** les accueils génériques (cri
  pirate « Ahoy ! »/« Alright », quai des navires, réplique naine). Les cartes
  sans fichier gardent ces trois accueils.
- **Mixage** : le niveau commun des sons du jeu (voir plus bas), mesuré
  fichier par fichier ; une seule voix à la fois (la précédente se met en
  pause), trois au plus par relevé, décalées de 140 ms. Le son coupé et le
  curseur de volume s'appliquent comme aux autres échantillons
  (`syncOutputGain`), et `destroy()` coupe les départs en attente.
- **Écoute** : `sons-du-sablier.html` liste les 60 voix dans la section « Voix
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
  ramenée au niveau commun). La créature désigne sa proie avant le combat :
  son attaque est un
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

La flèche part **aussi quand le tir manque** (les 30 % du coup rapide) : un tir
raté reste un tir, son sifflement est le seul retour sonore du raté. Seule la
frappe `annule` — la proie avait déjà disparu avant que l'arc ne se bande — ne
tire rien. La page n'a donc aucun repli métallique derrière une Attaque ciblée :
l'ancien `block_impact` joué sur un raté (`RpgDuelPage.jsx`) était exactement
l'acier que le joueur entendait encore. `block_impact` ne sert plus qu'à la
sélection d'un bloqueur, où il annonce un choix et non une frappe.

**L'acier ne s'annonce que s'il va frapper.** La validation de la vague
d'attaque jouait `attackers_confirm` (`attackers-confirm.mp3`), un choc de
lames — y compris pour une vague d'archers qui n'allumera aucune épée. C'était
le dernier acier d'une Attaque ciblée : on l'entendait au clic sur
« Confirmer l'attaque », juste avant la flèche. `rpgVagueAnnonceAcier(ids,
ciblesCoupRapide)` ne le laisse jouer que s'il reste un attaquant qui frappera
au corps à corps ; une vague entièrement composée d'archers se valide en
silence, et « Attaquer avec tous » ne lève les lames que si la vague contient
autre chose qu'eux. Conséquence : **le geste d'une Attaque ciblée ne fait
entendre que la flèche** — `tests/rpg-fleche-audio-ui.test.js` le vérifie sur le
`<audio>` réellement alimenté, `attackers-confirm.mp3` compris.

`tests/rpg-fleche-audio.test.js` vérifie le catalogue, le partage
tir/toucher (`rpgFrappesCibleesTirees`, `rpgFrappesCibleesReussies`), le cas
figé d'une frappe `rate: true` — flèche seule, aucun acier — et le routage du
lecteur ; `tests/rpg-fleche-audio-ui.test.js` joue la vraie page du duel (jsdom)
sur une Attaque ciblée seule et contrôle le `<audio>` réellement alimenté.

## Comment elle se déclenche

La page du duel (`src/games/RpgDuelPage.jsx`) tient les deux lecteurs pour
toute sa vie : `RpgMainThemeMusic` hors parties, `RpgConqueteMusic` en partie.

- entrer dans un duel démarre la piste du plateau **dans le geste joueur** —
  les navigateurs n'accordent un contexte audio qu'à un tel geste ;
- rentrer au menu, quitter le duel ou couper le son arrête la lecture
  (`stop()` / `pause()`), sans détruire les nœuds ;
- un onglet mis de côté met la piste en pause (`pause()`), elle reprend au
  retour — le duel libre comme celui du récit ;
- le bouton ♫ de la barre du duel — ou la touche `M` — coupe et rend la
  musique et les bruitages. La préférence est mémorisée sur l'appareil
  (`letsplay_sablier_sound_v1`), comme celle de Vice City Rush, et le son
  revient par défaut.

La table suit le camp qui mène au territoire : un duel libre comme un étage du
récit joue la piste du plateau du camp dominant, et le changement de camp fait
un fondu plutôt qu'une coupure.

## Ce qui a été retiré

Les dix boucles d'ambiance par tour (« Le Grand Horloger compte ses noms »,
« Les étals ne ferment jamais » … « Le retournement du Sablier ») étaient
synthétisées en WebAudio par `rpgAmbientMusic.js`. Elles ont été **supprimées
avec le module**, leurs tests (`tests/rpg-ambient-music.test.js`) et leur
vérification d'interface (`check:rpg-ambient-ui`) : la musique d'un duel vient
de sa table, un point c'est tout. L'historique Git garde les thèmes, leurs
tempos et leurs textures, si l'un d'eux doit revenir un jour sous forme de
fichier.
