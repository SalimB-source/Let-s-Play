# 26 — Cinématique d'intro : « Que ton nom soit écrit »

> **Objet :** plan de la cinématique d'ouverture du Sablier — images 4K
> (quasi-statiques, travelling lent) + voix off, qui raconte l'histoire du
> jeu avant le premier duel.
> **Statut :** plan à valider (texte VO + 12 tableaux). Aucun asset produit.

---

## 1. Réflexion : ce que l'intro doit faire (et ne pas faire)

### Les 5 questions du joueur qui lance le jeu

1. **Où suis-je ?** → Bab El, ville verticale, désert qui monte.
2. **Qu'est-ce qui m'arrive ?** → L'Astrolabe sonne, les étages tombent.
3. **Qui décide de quoi ?** → La Chambre des Heures et sa Liste.
4. **Qui suis-je / qui m'accompagne ?** → Salem + 4 compagnons, présentés en
   une phrase chacun, pas plus.
5. **Que dois-je faire, et pourquoi avec des cartes ?** → Sauver 12 survivants
   « qui n'existent nulle part » via l'ancien droit de contestation par duel.

### La règle d'or : teaser, pas spoiler

L'intro **ne révèle jamais** :

- ❌ que le portail est **verrouillé de l'intérieur** (révélation de l'étage 7) ;
- ❌ que c'est une **quarantaine** et que « ce qu'il y a derrière est pire que le sable » ;
- ❌ la lignée des Grands Horlogers qui savent et se taisent ;
- ❌ les trois fins.

Elle **plante** ces mystères comme des questions (le portail fermé, l'homme
poli qui signe, l'Astrolabe qui compte) pour donner envie de jouer.

### Ton

- Solennel et chaud, jamais explicatif-encyclopédique : **on raconte une
  histoire, pas un manuel**.
- Voix off omnisciente au présent, qui tutoie le joueur **une seule fois**,
  sur le dernier plan (« c'est toi qui tiens les cartes ») — c'est le
  déclic joueur-spectateur → joueur-acteur.
- L'échange culte Salem / Scribe (« Ils sont derrière moi. / Je ne vous
  demande pas où ils sont. Je vous demande où ils sont écrits. ») est
  **joué en dialogue** au tableau 8, pas narré : c'est l'hameçon émotionnel.

### Format retenu (proposition)

| Paramètre | Choix | Pourquoi |
| --- | --- | --- |
| Durée | **≈ 3 min 30 – 4 min** | Assez pour le monde + les héros + l'enjeu ; assez court pour être revue |
| Tableaux | **12 images 16:9** | Un lieu/idée par image, rythme de ~18–20 s chacune |
| Mouvement | **Ken Burns lent** (zoom 1.0 → 1.08, pan ≤ 5 %) + voile de sable + grain | « Plus ou moins statique », vivant sans être du full-motion |
| Transitions | Fondus au noir courts (8–12 images), **cut sec** uniquement sur la sonnerie | Le cut = le choc du cycle |
| Voix | **1 voix off** (recommandation §5) + 2 répliques dialoguées (tableau 8) | Lisible, pas cher, doublable en AR/EN ensuite |
| Musique | Nappe + percussion + **cloche de l'Astrolabe** (leitmotiv) | La cloche devient le logo sonore du jeu |
| Sous-titres | **Oui, FR/AR/EN** (WebVTT), activés par défaut | Accessibilité + joueurs en muet |
| Contrôles | Passer (bouton + Échap), pause, rejouer depuis Histoire | Jamais de cinématique imposée sans skip |
| `prefers-reduced-motion` | Images fixes, fondus supprimés, texte d'un bloc | Cohérent avec le lecteur du récit (dossier 11) |

### Poids / livraison (important)

12 images sources en **3840×2160**, mais le jeu embarque des dérivés
**1920×1080 WebP/AVIF (~300–500 Ko chacun)** en chargement progressif :
l'intro doit démarrer en < 2 s même en 4G. Les 4K servent au trailer
YouTube et au mode desktop/TV.

**État livré (octobre 2026).** Les 12 tableaux existent en deux versions :
`public/sablier-cinematic/cine-t*.png` (masters HD 1672×941, ~3–4 Mo) et
`public/sablier-cinematic/4k/cine-t*-4k.jpg` (3840×2160, JPEG q93,
~1–2,5 Mo chacun, 19,8 Mo au total). L'upscale est produit par
`tools/upscale-cinematic.py` : débruitage doux → Lanczos 4K → micro-contraste
sur L → grain fin (contrôle à 100 % sur visages, mains et architecture :
net, sans halos). Piste d'amélioration ultérieure : repasser les masters HD
dans un super-échantillonneur IA externe (Topaz, Magnific) puis remplacer les
JPG 4K — les noms de fichiers restent les mêmes.

**Montage EN livré (octobre 2026).** `tools/monter-cinematique.py` assemble
`public/sablier-cinematic/montage/cine-intro-en-1080p.mp4` (3 min 27,
1920×1080, 24 i/s, ~44 Mo) : Ken Burns par tableau (zoom, pans, cut sec T2→T3,
fondus au noir), carton titre « LE SABLIER — May your name be written. »,
15 prises VO ElevenLabs (`audio/en/T01–T12.mp3`), nappe *Desert Solitude with
Percussion* en boucle crossfadée duckée sous la voix (sidechain), 3 cloches
d'Astrolabe synthétisées (0,2 s / cut T2 / titre final). Sous-titres EN
recalés sur la VO définitive : `montage/sous-titres-en.vtt`. Relancer le
script régénère tout (monter une prise VO = remplacer son MP3 et relancer).

**Intégration jeu livrée (octobre 2026).** `src/games/RpgIntroCinematic.jsx`
(+ `rpg-intro-cinematic.css`) : overlay plein écran avec la vidéo, ses
sous-titres EN, lecture/pause, son, progression cliquable et bouton
« Passer » (Échap aussi) ; le thème du menu se tait pendant la lecture.
Déclencheurs : première entrée dans le navigateur via `RpgEntryChoice`
(marqué vu en `letsplay_sablier_cine_v1`, fin ou skip), lien « Regarder la
cinématique d'intro » sur l'écran d'entrée, et bouton « ▶ Revoir la
cinématique d'intro » dans le pied du mode Histoire (`RpgDuelPage`).
Vérifié : `check:rpg-entry-choice` vert, `npm run build` vert, MP4 + VTT
présents dans `dist/`.

**V2 dark-fantasy (en cours, octobre 2026).** Direction revue : style
« Dark Souls / Elden Ring » (noir profond, clair-obscur, brume, braise),
un plan par personnage synchronisé avec la narration, visages verrouillés
sur les portraits canoniques via références. Lecteur simplifié : plus de
barre de lecture, un seul bouton « Passer » (toucher l'écran = lecture si
l'autoplay est bloqué). Nouveaux plans : `cine-t07a-yamina`,
`t07b-feriel`, `t07c-boualem`, `t07d-tarek`, `t08b-salem`, `t08c-scribe`,
`t08d-registre`, `t10b-mahieddine` + refonte des 12 tableaux. V1 conservée
dans l'historique git.

**Montage V2 livré (octobre 2026).** 20 plans : T7 = groupe + 4 portraits
calés au prorata du texte, T8 = greffe / Salem / Scribe / registre calés
sur les attaques VO, T10 = thé puis visage sur « He never lies » (coupe
détectée par le silence, ≈ 9 s). Cuts secs intra-bloc, fondus aux
frontières. MP4 3 min 27, ~36 Mo. Sous-titres : fond supprimé, 20 px,
`line:-4`. Vérifié : 4 frames de calage (Yamina, Scribe, Mahieddine,
titre), build vert.

**Montage V3 livré (octobre 2026).** 24 plans : T1 = panoramique puis
montée sur « a desert that rises », T5 = creux + macro du sable
(`cine-t05b-sable`), T9 = duel / cartes (`cine-t09b-cartes`) / punch-in
sur « So we will fight ». Langage caméra varié (16 mouvements :
poussées, panos, diagonales, montées). Post : voile de sable procédural
en boucle (majorité tombante + grains qui montent — exception volontaire
au garde-fou, demandée : pluie de mémoire), 4 pulses de lumière (glas
T2, « So we will fight », portail, halo du titre), étalonnage chaud,
vignette, grain film. Son : whooshes de transition synthétiques (11),
slots d'ambiances prêts (`audio/amb/`, ignorés si absents : vent,
scintillement, salon de thé, bourdon, coup de cloche réel). MP4
3 min 27, ~71 Mo (CRF25/slow). Vérifié : contact sheet 5 moments
(pulses, macro sable, halo titre) + crop voile de sable, niveaux
−23,1/−4,4 dB, build vert.

**Montage V4 livré (octobre 2026).** 33 plans, 30 tableaux : inserts
cloche du glas (T2), rue vivante AVANT / reprise APRES (T3),
affichage de la Liste (T4), visage de Salem (T6), mains de Yamina
(T7), rue vide APRES « exist nowhere » (T8), regard de Mahieddine sur
« He omits » (T10, coupe au silence ≈ 13,1 s), sceau du portail (T11).
Micro-respiration (±0,4 %, 4 s) sur les gros plans de visages.
MP4 3 min 27, ~76 Mo (CRF25/slow). Vérifié : contact sheet 8 inserts
+ likeness Salem/Mahieddine vs refs, build vert.

**Son V4.1 (octobre 2026).** Téléchargement impossible depuis le
sandbox : 5 nappes 100 % procédurales (`tools/synth-ambiances.py`,
boucles parfaites par crossfade) — vent 60 s, scintillement 24 s,
salon de thé 48 s, bourdon 48 s, cloche 7 partiels. Mode
`--audio-only` (mix + mux sans re-rendre la vidéo). Niveaux
inchangés (−23,1/−4,4 dB). Remplaçables par de vrais enregistrements
(mêmes noms de fichiers).

**Montage V5 livré (octobre 2026).** 39 plans, 37 tableaux : cohérence
tour (étages-balcons, fin des rues « village » : T3 AVANT/APRES et T8
rue vide refondus), sable qui monte montré (nouveau T1b sous la tour +
colonne T5), T01 sans répétition. T7 = 10 facettes (profil Yamina,
fournaise de Fériel, puits de Boualem, fardeau de Tarek), T8 =
confrontation Salem/Scribe sur « where they are written ». Pulses
reprise + confrontation. MP4 3 min 27, ~80 Mo (CRF25/slow). Vérifié :
contact sheet 8 nouveaux plans + likeness, build vert.

**Montage V5.1 (octobre 2026).** Rythme : têtes/queues resserrées
(3 min 20 au lieu de 3 min 27), 38 stingers d'impact synthétisés
(thump + snap, gain réduit sur les plans < 3 s) sur tous les cuts
durs, mix borné à la durée exacte (`atrim`, la cloche 8 s dépassait).
Vérifié : énergie/niveaux (−22,8/−4,5 dB), transitions T10/T11 à la
frame près (dump + diff numpy), build vert. Note méthode : le `-ss`
avant `-i` de ce build ffmpeg cherche vers l'AVANT (keyframes) —
toujours vérifier les timings par dump numéroté ou `-ss` après `-i`.

**Montage V7 livré (octobre 2026).** 40 plans, 38 tableaux, 3 min 20,
~50 Mo (CRF27/slow) : synchro personnages (T07 ancré sur les 8
respirations réelles de la VO — chaque nom tombe sur le bon visage —,
autres découpes recalées sur les silences détectés), nouveau tableau
Tarek espiègle sur « and its secrets », rythme apaisé (pas de
recadrages internes), travellings eased + suréchantillonnage 4K→1080p,
étalonnage par acte, essuyages sable (T2/T8/T10), flashs glas + duel,
booms d'actes, dynamique creusée (T10/T12). Vérifié : contact synchro
(4/4 noms + Salem + regard Mahieddine), espiègle, 3 dips, 2 flashs,
carton, −19,6 LUFS, build vert. Notes méthode : (1) un filtre `fps`
redondant après l'étalonnage avalait 1 image/segment (V6 : 46 images
perdues, dérive progressive) — le zoompan sort déjà du CFR exact +
gate de comptage après concat ; (2) les graphes vidéo multi-entrées
(`blend`) figent ce build ffmpeg vers 70 % du film (3 essais, entrées
saines) — fusion screen en numpy + vignette/grain en graphe simple.

---

## 2. Texte de la voix off (version FR de travail)

> ~520 mots ≈ 3 min 40 de narration posée (130–140 mots/min) + silences.
> Chaque bloc correspond à un tableau. Les didascalies `[…]` ne sont pas lues.

**[Noir. Vent. Puis, au loin, une cloche.]**

**T1 — Bab El.** « Il y a des villes bâties sur la pierre. Bab El est bâtie
sur le temps. Neuf étages de cuivre et de calcaire, dressés autour d'un
portail qui ne s'est jamais ouvert. Et sous elle… un désert qui monte. »

**T2 — L'Astrolabe.** « Au-dessus du neuvième étage tourne l'Astrolabe. Il ne
compte pas les heures. Il compte les cycles qu'il nous reste. Et quand il
sonne… l'étage le plus bas est repris par le sable. Avec tout ce qui s'y
trouvait. »

**T3 — Les étages perdus.** « Le premier étage est déjà perdu. Puis le
deuxième. Puis le troisième. Aujourd'hui, nous vivons au quatrième. Tout le
monde le sait. Et tout le monde continue de vivre. »

**T4 — La Chambre des Heures.** « Ce qui tient la ville n'est pas un roi, ni
un dieu. C'est une administration : la Chambre des Heures. À chaque cycle,
elle publie la Liste — ceux que l'on évacue en priorité… et les autres. Ses
agents ne portent pas d'armes. Ils portent des registres. »

**T5 — Le sable-mémoire.** « Ici, le sable ne tombe pas du ciel : il monte du
sol. Et il garde la trace. Là où quelqu'un est tombé, le sable garde son
poids en creux. Les pauvres vendent du sable chargé de souvenirs. Les riches
paient pour qu'on le tamise. Rien de ce qui tombe n'est perdu… pour tout le
monde. »

**T6 — Salem.** « Salem descend dans les étages condamnés avant la reprise,
pour vérifier qu'il ne reste personne. Perche à crochet, corde, carnet. Il en
remonte toujours quelqu'un. Et toujours pas assez. »

**T7 — Les compagnons.** « À ses côtés : Yamina, l'horlogère, qui a signé une
Liste à dix-neuf ans — et qui depuis, essaie de réparer l'irréparable.
Fériel, la souffleuse de verre, qui transforme le sable en boucliers.
Boualem, le puisatier, qui a trouvé quelque chose sous la ville… et qui n'en
parle pas. Et Tarek, le porteur, qui transporte les cartons de la Chambre —
et ses secrets. »

**T8 — Les douze absents.** « Cette fois, Salem est remonté avec douze
habitants d'un quartier condamné. Douze vivants.
[Un temps. Deux voix, jouées, pas narrées :]
— **Salem :** Ils sont derrière moi.
— **La Scribe :** Je ne vous demande pas où ils sont. Je vous demande où
ils sont écrits.
[Narration :] Le quartier est officiellement vide depuis la veille. Sans
inscription, aucun abri dans les étages hauts. Douze vivants… qui n'existent
nulle part. »

**T9 — Le droit de contestation.** « Il reste un recours. Un droit ancien, que
même la Chambre reconnaît : la contestation par le duel. Les cartes sont des
fragments de mémoire et des pactes. Un gardien qui perd doit ouvrir ses
archives… ou accorder le passage. Alors on se battra. Pas pour tuer. Pour
être écrits. »

**T10 — Mahieddine.** « Au sommet de la Tour des Listes attend le Grand
Horloger Mahieddine. Un homme doux, poli, qui offre le thé… et qui signe la
Liste depuis quarante ans. Il ne ment jamais. [Un temps.] Il omet. »

**T11 — Le portail.** « Et derrière tout cela, le portail fermé. Personne ne
sait qui l'a construit. Personne ne sait ce qu'il retient. Mais l'Astrolabe
va sonner de nouveau. Et cette fois… »

**T12 — Titre.** [Silence total, 2 secondes. Puis, plus bas, presque à
l'oreille :] « …c'est toi qui tiens les cartes. »
[Logo : **LE SABLIER**. Sous-titre : *Que ton nom soit écrit.*]

---

## 3. Les 12 tableaux (images 4K)

### Charte commune (à rappeler dans chaque prompt)

- **Style :** peinture cinématographique épique, ville mauresque art déco
  verticale, cohérente avec `tour-des-listes.jpg` et `mode-histoire.jpg`.
- **Palette algérienne :** indigo touareg, safran, ocre, cuivre, henné, or —
  ciel nuit/crépuscule, sable chaud en bas, bleu profond en haut.
- **Interdits :** aucun texte/lettre/chiffre lisible dans l'image, aucun
  filigrane, aucune anamorphose, pas de style cartoon/manga/sci-fi.
- **Format :** 16:9, 3840×2160, zone de sécurité centrale (pas d'élément clé
  à moins de 10 % des bords — recadrage mobile).
- **Personnages :** de dos, de loin ou en silhouette, **sauf** Salem et
  Mahieddine (références : `public/cards/salem.jpg`,
  `public/sablier-story/mahieddine.jpg`) — continuité « un personnage, un
  portrait » (dossier 11).

| # | Titre / timing | Composition | Prompt EN (base génération) | Mouvement |
| --- | --- | --- | --- | --- |
| T1 | **Bab El la verticale** · 0:00–0:22 | Vue panoramique de nuit : cité verticale de 9 niveaux accrochée à un piton, pont en arches au premier plan, dunes en bas, ciel étoilé. Minuscules lumières aux fenêtres. | `epic cinematic matte painting, vertical moorish art-deco city of nine tiers built around a sealed portal, stone arch bridge foreground, desert dunes below, starry night sky, warm window lights, indigo and gold palette, no text, no watermark, 16:9` | Lent zoom avant 1.0→1.06 + pan droite |
| T2 | **L'Astrolabe** · 0:22–0:42 | Contre-plongée : immense astrolabe céleste doré tournant au-dessus des toits, anneaux gravés, halo turquoise, étoiles filantes. | `giant celestial brass astrolabe rotating above oriental city rooftops, glowing turquoise halo, engraved rings, night sky, low angle view, epic scale, indigo and gold, no text, no watermark, 16:9` | Zoom avant très lent vers le centre + rotation suggérée par le voile de sable |
| T3 | **La reprise** · 0:42–1:00 | Un étage bas à moitié englouti : façades inclinées, sable qui monte comme une marée, objets et lanternes à demi enterrés, ciel cendreux. Aucun humain visible. | `drowned lower district of a desert city, tilted moorish facades half-buried in rising sand, sand tide swallowing lanterns and arches, ashen sky, melancholic, no people, no text, 16:9` | Pan vertical descendant (le sable « monte » dans le cadre) |
| T4 | **La Liste** · 1:00–1:20 | Grande place : foule de dos face à un mur d'affichage monumental couvert de longs registres vierges (sans écriture lisible), agents en robes sombres aux sceaux-sabliers, tramway de cuivre. | `crowd seen from behind facing a monumental wall covered with long blank hanging scrolls, stern robed clerks with hourglass seals, copper tramway, moorish square at dusk, no readable text, 16:9` | Pan horizontal lent de la foule vers le mur |
| T5 | **Les Creux** · 1:20–1:38 | Gros plan au sol : empreinte d'un corps dans le sable qui garde sa forme (le « creux »), mains qui tamisent le sable doré, grains lumineux en suspension. | `close-up of a human-shaped hollow imprinted in golden sand, hands sifting luminous sand grains floating in the air, shallow depth of field, warm light, poetic, no text, 16:9` | Zoom arrière lent (le creux se révèle) |
| T6 | **Le Sondeur** · 1:38–1:56 | Salem (réf. portrait : 31 ans, qachabia bleue à broderies, perche à crochet, corde, carnet) descendant un escalier noyé de sable, lanterne, de trois quarts dos. | `lone sounder descending a sand-flooded stone staircase with a hooked pole and lantern, blue algerian cloak with embroidery, seen from behind three-quarter view, dramatic light shaft, no text, 16:9` | Descente verticale lente + halo de lanterne |
| T7 | **Les cinq** · 1:56–2:18 | Les 5 compagnons en silhouette sur le pont (rappel `mode-histoire.jpg`) : sondeur à la perche, horlogère, archère/souffleuse, vieux puisatier, porteur chargé — ville en arrière-plan. | `five adventurers silhouettes on a stone bridge at night, hooked pole, satchel, bow, water-pulley rope, heavy crate on back, vertical illuminated city behind, epic wide shot, no text, 16:9` | Zoom avant lent vers le groupe |
| T8 | **Où ils sont écrits** · 2:18–2:40 | Greffe de la Chambre : long comptoir, la Scribe (robe vert profond, sceau-sablier) tendant un registre fermé ; face à elle, douze silhouettes floues de survivants (familles, enfants) ; Salem entre eux. Lumière froide administrative. | `chamber clerk office, female scribe in deep green robe with hourglass seal holding a closed ledger across a long counter, twelve blurred survivor silhouettes including children, man with hooked pole between them, cold bureaucratic light, no readable text, 16:9` | Léger push-in sur le registre fermé |
| T9 | **Le duel** · 2:40–2:58 | Table de duel vue du dessus en plongée : cartes éparpillées qui brillent comme des fragments de mémoire, sable doré en spirale au centre, deux mains face à face (une jeune, une gantée de la Chambre). | `top-down view of a card duel table, glowing cards scattered like memory fragments, golden sand spiral in the center, two hands facing each other, dramatic chiaroscuro, no readable text, 16:9` | Rotation lente 3–4° + zoom avant |
| T10 | **Le thé du Grand Horloger** · 2:58–3:14 | Intérieur feutré : table basse, deux verres de thé fumants, main âgée au sceau-sablier posant un tampon près d'une Liste ; en arrière-plan flou, silhouette courtoise en caftan bordeaux (Mahieddine, réf. portrait). Fenêtre sur l'Astrolabe. | `intimate interior, low table with two steaming tea glasses, old hand with hourglass seal stamp near blank scrolls, blurred courteous silhouette in burgundy caftan, window showing a celestial astrolabe, warm and unsettling, no readable text, 16:9` | Zoom avant très lent vers le tampon |
| T11 | **Le portail fermé** · 3:14–3:30 | Porte monumentale scellée au cœur de la roche, runes/sceaux éteints (formes abstraites, pas de lettres), deux gardiens minuscules, faisceau de lumière turquoise qui fuit par le joint central. | `monumental sealed gate in dark rock, dormant abstract seals, two tiny guards, thin turquoise light leaking through the central seam, oppressive silence, epic scale, no readable text, 16:9` | Zoom avant + la fuite de lumière pulse doucement |
| T12 | **Titre** · 3:30–3:50 | Ciel étoilé pur + Astrolabe lointain flou + pluie de sable doré montant (inversée). Espace négatif central pour le logo **LE SABLIER** (texte ajouté en DOM, pas dans l'image). | `pure starry night sky, distant blurred celestial astrolabe, golden sand grains rising upward like reversed rain, large empty dark center, minimal, no text, 16:9` | Sable montant (particules), quasi-fixe |

---

## 4. Son : musique, bruitages, mixage

### Leitmotiv : la cloche de l'Astrolabe

Un son de cloche grave (bronze, ~110 Hz + harmoniques) qui apparaît 3 fois :
ouverture (noir), fin du T2 (« quand il sonne… », **cut sec** image+son),
et sous le titre final. C'est le **logo sonore** du jeu — à réutiliser dans
les trailers et la sonnerie inter-chapitres (dossier 02, §5).

### Musique (piste continue, ~4 min)

1. **0:00–1:00** — drone grave + vent du désert + bendir lointain (pulsation
   68 BPM, comme `playCorbeau`) ;
2. **1:00–2:20** — entrée d'une flûte ney (thème des compagnons, 4 notes) +
   cordes pincées (guembri/koto selon acte) ;
3. **2:20–3:14** — tension : ostinato de cordes + percussion qui monte,
   silence brutal sur « Il omet. » ;
4. **3:14–3:50** — retombée : drone + cloche + thème ney en majeur-fragile,
   fin sur une nappe qui s'éteint.

Pistes existantes réutilisables en maquette : `Desert Solitude with
Percussion.mp3`, `Egypt.mp3`. Version définitive : commande à un compositeur
ou boucle synthétisée maison (comme `playSoleilRouge` / `playNecropole`).

### Bruits (sous la VO, −18 dB)

Vent, pas dans le sable (T3, T6), murmure de foule + tampon (T4, T8),
sable qui coule (T5, T12), cloche (T1/T2/T12), tintement de verre à thé (T10).

### Mixage VO

Voix au centre, −3 dB sous zéro ; musique en sidechain léger (−4 dB quand la
voix parle) ; version M&E (musique+effets sans voix) conservée pour les
doublages AR/EN.

---

## 5. Voix : casting et recommandations

| Piste | Avantages | Inconvénients |
| --- | --- | --- |
| **A. Femme grave, 40–50 ans, français → RECOMMANDÉE** | Originalité (narratrices rares en fantasy FR), chaleur + autorité, colle au personnage de la Scribe âgée | Trouver la perle |
| B. Homme mûr, 50–60 ans | Codes classiques du genre, rassurant | Déjà entendu partout |
| C. Voix IA (maquette puis définitive ?) | Rapide, pas cher, AR/EN faciles | Émotion plafonnée, risque « robot » sur 4 min |

**Recommandation :** maquette en voix IA pour caler le montage, puis
enregistrement humain définitif (FR d'abord, AR/EN ensuite). Les 2 répliques
du T8 sont jouées par deux comédiens différents (Salem : homme 30 ans, grave
et fatigué ; Scribe : femme 35 ans, polie et inflexible).

Direction : débit posé (130 mots/min), silences assumés, **jamais** de
« voix de bande-annonce » qui hurle — l'horreur ici est administrative, pas
démoniaque.

---

## 6. Production : étapes et ordre

1. **Valider ce plan** (texte VO, 12 tableaux, voix A/B/C) ← on est ici.
2. **Générer les 12 images 4K** (IA avec les prompts §3 + retouche humaine :
   mains, sceaux, continuité Salem/Mahieddine) ; contrôle « pas de texte
   lisible » sur chaque image.
3. **Maquette voix IA** du texte §2 → calage des timings exacts par tableau.
4. **Enregistrement définitif** FR (+ M&E), puis doublages AR/EN.
5. **Montage** : assemblage image + Ken Burns + sable + grain + mix (Premiere /
   DaVinci, ou `ffmpeg` + player maison `RpgIntroCinematic.jsx`).
6. **Intégration** : écran Histoire → lecture auto au premier lancement
   (skip + « Revoir l'intro » dans le journal), sous-titres WebVTT,
   `prefers-reduced-motion`, préchargement progressif.
7. **Déclinaisons** : trailer 45 s (T1/T2/T8-répliques/T12), miniature
   YouTube (T1), fond d'écran T12.

---

## 7. Garde-fous lore (relecture obligatoire avant génération)

- [ ] Le portail ne s'est **jamais ouvert** (T1 le dit, T11 le montre fermé).
- [ ] Le sable **monte**, il ne tombe pas (T1, T3, T5, T12 : jamais de dunes
      qui tombent du ciel, jamais de pluie de sable vers le bas sauf T5-tamis).
- [ ] L'Astrolabe compte les **cycles restants**, pas les heures (T2).
- [ ] On est au **4e étage**, les étages 1–3 sont perdus (T3) — cohérent avec
      le dossier 02.
- [ ] La Chambre est **polie, pas méchante** (T4, T8, T10 : pas d'uniformes
      menaçants, pas d'armes).
- [ ] Les cartes sont des **mémoires/pactes**, le duel un **droit** (T9) —
      jamais un combat à mort.
- [ ] Salem 31 ans, perche/carnet/corde ; Mahieddine caftan bordeaux, thé,
      lunettes de laiton (dossier 11) — vérifier chaque image les montrant.
- [ ] **Aucun texte lisible** dans les images (registres, sceaux, cartes :
      formes abstraites uniquement) — les noms et le logo vivent en DOM.
