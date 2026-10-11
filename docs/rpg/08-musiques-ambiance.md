# 08 — Musiques d'ambiance du mode Histoire

Chacune des cinq **Tours de Bab El** dispose de sa propre boucle musicale
d'ambiance, intégralement **synthétisée en WebAudio** (`src/games/rpgAmbientMusic.js`).
Aucun fichier audio n'est chargé : zéro poids dans le bundle, aucune latence,
silence impossible au premier geste joueur.

La classe `RpgAmbientMusic` suit le même contrat de cycle de vie que la bande-son
de *Vice City Rush* (`cityRushAudio.js`) :

- `setTour(tourId)` sélectionne la tour (donc la boucle) ;
- `start()` / `stop()` / `pause()` / `resume()` pilotent la lecture ;
- `setMuted(muted)` coupe sans détruire les nœuds ;
- la musique est planifiée par une grille de 8 mesures × 16 pas (128 pas par boucle),
  entre 66 et 92 BPM — plus lent que la course, c'est une tension de duel,
  pas une poursuite.

Le niveau de la musique reste en dessous des bruitages du duel
(`rpg-audio.js`) : le duel reste lisible, la musique ne couvre jamais les
indications de cartes (soin, zone, cloche de l'astrolabe).

## Les cinq ambiances

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
