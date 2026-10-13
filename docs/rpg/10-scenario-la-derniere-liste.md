# 10 — La Dernière Liste : scénario et plan de campagne

> **Campagne complète intégrée (Actes I à V) : 5 tours, 20 duels, 40 scènes, 5 choix, les 9 Registres et les 3 fins du Portail (*Ouvrir*, *Tenir*, *Prendre la place*).**
> État de réalisation et références de personnages :
> [`11-bible-visuelle.md`](11-bible-visuelle.md).
> Conception et intégration au 12 octobre 2026. Ce document adapte l'univers de
> [`02-histoire.md`](02-histoire.md) au **duel de cartes actuellement jouable**,
> et non à l'ancien prototype de RPG en équipe.

## 1. L'idée centrale

**Salem ramène douze habitants d'un quartier condamné. À leur arrivée, la
Chambre des Heures affirme que ce quartier a été entièrement évacué. Aucun de
ces habitants ne figure sur la Liste : ils sont vivants, mais personne ne peut
leur attribuer un abri dans les étages hauts.**

Yamina reconnaît la procédure d'effacement : c'est celle qu'elle avait
acceptée autrefois, en signant sa première Liste. Pour faire réinscrire les
survivants avant la prochaine reprise, le groupe doit contester le registre,
puis comprendre ce que protège réellement la Chambre.

Le mystère s'élargit progressivement : les omissions ne cachent pas seulement
une évacuation ratée. Elles masquent l'histoire de la quarantaine de Bab El.
Le portail n'est pas cassé ; il est verrouillé de l'intérieur. Cette révélation
vient du dossier narratif existant, pas d'un changement de cosmologie.

**Promesse au joueur :** commencer par sauver douze personnes identifiables,
puis décider de l'avenir d'une ville qui a appris à survivre en oubliant.

### Le ton

- Du mystère, de la chaleur entre les compagnons et une administration
  inquiétante parce qu'elle reste polie — pas un conseil de méchants caricaturaux.
- Des scènes courtes : deux à quatre répliques ordinaires, un peu plus pour
  l'ouverture et les rencontres avec Mahieddine.
- Le sable garde la mémoire ; il n'efface pas magiquement les personnes que
  la Chambre raye. L'effacement est administratif et ses conséquences sont concrètes.
- Aucun compte à rebours réel. La prochaine sonnerie est une échéance du récit :
  lire, attendre, fermer le jeu ou perdre un duel ne condamne personne.

### Un échange qui donne le ton

> **Salem :** « J'en ai remonté douze. »
>
> **La Scribe :** « Le registre n'en compte aucun. »
>
> **Salem :** « Ils sont derrière moi. »
>
> **La Scribe :** « Je ne vous demande pas où ils sont. Je vous demande où ils sont écrits. »

## 2. Pourquoi on se bat avec des cartes

**Ajout de lore proposé :** la Chambre reconnaît un ancien droit de
contestation par duel. Les cartes sont des fragments de mémoire et des pactes ;
un gardien qui perd doit ouvrir ses archives, restituer des cartes confisquées
ou accorder le passage.

Cela donne une raison aux duels existants sans imposer vingt combats à mort.
Fériel peut éprouver Salem avant de l'aider ; Mahieddine peut rester un
interlocuteur après sa défaite. Battre un sorcier fait tomber son opposition,
pas nécessairement son personnage.

Les compagnons existent dans les dialogues indépendamment de leur carte :
rencontrer Yamina ne débloque pas automatiquement la carte `yamina`. Les
récompenses restent celles de `rpgCollection.js`.

## 3. La campagne complète : cinq actes, les vingt duels existants

L'ordre narratif proposé est **Listes → Souk → Abysses → Fjord → Sables**.
C'est un parcours nouveau : le catalogue actuel présente les Sables avant les
Abysses et le Fjord, et les tours sont actuellement indépendantes.

Les cinq tours sont des lieux de Bab El, pas les cinq niveaux d'une ville qui
n'en aurait plus neuf. Les « étages » de duel sont des paliers internes à ces tours.

| Acte | Tour / duels existants | Ce que le joueur cherche et découvre | Traduction dans le duel |
| --- | --- | --- | --- |
| I — Les absents | Listes, `listes-1` à `listes-5` | Faire reconnaître les douze survivants. Obtenir un sursis et une copie du dossier auprès de Mahieddine. Comprendre que l'omission était une décision, pas une erreur de copie. | Initiation, retrait de la Scribe, défense du Puisatier, pression de Fériel, contrôle du Grand Horloger. |
| II — Le prix d'un nom | Souk, `souk-1` à `souk-4` | Trouver des abris et les témoins d'anciennes évacuations. La Reine des étals connaît une route abandonnée vers les citernes. Les personnes sauvées deviennent des acteurs du récit. | Négociation, patience puis pression : les decks et les profils actuels portent déjà ces personnalités. |
| III — Ce que l'eau conserve | Abysses, `abysses-1` à `abysses-4` | Récupérer les traces des quartiers engloutis. Boualem avoue avoir caché un ancien ordre de fermeture. Les souvenirs prouvent que le verrouillage précède la crise actuelle. | Contres, retours et créatures marines ; le Dévoreur garde les archives submergées. |
| IV — Le serment gelé | Fjord, `fjord-1` à `fjord-4` | Dans les archives froides de la Chambre, lire le pacte conservé par les gardiens du Nord. Yamina comprend : le portail protège aussi Bab El de ce qui attend derrière. | Boucliers, meute, Valkyrie et Maître des Neuf Hivers, sans changer leurs règles. |
| V — Qui signe ? | Sables, `sables-1` à `sables-3` | Atteindre le portail. L'Horloger du Zénith serait la défense du pacte originel, distincte de Mahieddine. Gagner donne le droit de choisir, pas une solution sans coût. | Les trois adversaires actuels, jusqu'au contrôle du Zénith. Pas de seconde phase cachée. |

Le rôle de défense du pacte attribué au Zénith et celui d'archives froides du
Fjord sont des propositions de mise en scène. Les adversaires, identifiants,
decks, puissances et récompenses n'ont pas besoin d'être remplacés.

### Les fins

Reprendre les directions de `02-histoire.md` plutôt que les contredire :

- **Ouvrir** : la ville échappe au sable mais doit affronter ce qui passe le
  portail. Les personnes que le joueur a aidées participent au départ et à la défense.
- **Tenir** : maintenir la quarantaine et organiser la montée de la ville.
  Les alliances construites rendent cette survie collective, sans promettre
  que tout est désormais résolu.
- **Prendre la place**, en extension : reprendre le rôle du Grand Horloger.
  Conserver les conditions du dossier original — neuf registres lus, aucune
  personne laissée sur la Liste sans être nommée, et la réplique de compassion
  à Mahieddine. Les neuf registres peuvent être répartis dans les cinq tours ;
  ils n'imposent pas neuf nouvelles tours. C'est la seule fin où l'Astrolabe s'arrête.

**Pas de score moral caché.** Ouvrir et tenir sont des décisions explicites en
fin de campagne. La fin cachée et les registres optionnels ne font pas partie
de la première livraison.

## 4. Première version recommandée : la Tour des Listes

Un épisode avec une vraie résolution locale, pas seulement un teaser :
**les douze personnes obtiennent un sursis et un hébergement provisoire**.
La question du portail reste ouverte pour les épisodes suivants.

Périmètre : cinq duels déjà présents, dix scènes courtes — une avant et une
après chaque duel. L'ouverture est intégrée à la première scène ; l'épilogue
à la dernière. Un seul choix à deux branches, qui se rejoignent avant le
combat suivant.

| Étage | Scène avant | Scène après / fonction narrative |
| --- | --- | --- |
| `listes-1` — Le Guetteur de palier | Salem arrive avec les survivants et Yamina. Le Guetteur ne peut laisser monter des personnes sans inscription. Yamina invoque le droit de contestation. | Accès au greffe. Première trace : le quartier est officiellement vide depuis la veille. |
| `listes-2` — La Scribe de la Liste | Confrontation de l'exemple ci-dessus. Yamina reconnaît la procédure qu'elle a jadis signée. | La Scribe ouvre le dossier. Le joueur décide comment utiliser la copie des noms ; le journal enregistre sa décision. |
| `listes-3` — Le Puisatier des Cendres | Il conserve le registre des passages et refuse de le confier au premier venu. | Le registre confirme qu'aucun convoi n'est remonté du quartier à la date annoncée. Ce n'est pas une évacuation oubliée. |
| `listes-4` — La Souffleuse de verre | Fériel connaît les survivants. Elle exige que Salem prouve qu'il saura tenir face au Grand Horloger avant de lui ouvrir le passage. | Elle propose son atelier comme premier abri et rejoint la démarche. La preuve a enfin une solution humaine, même provisoire. |
| `listes-5` — Le Grand Horloger | Mahieddine offre du thé. Il reconnaît le manque de places, mais refuse d'abord de modifier une Liste déjà signée. | Après le duel, il accorde un sursis. Les douze noms sont réinscrits. Il autorise l'accès au dossier ancien : « Vous avez trouvé ceux que ma Liste oublie. Cherchez maintenant ce qu'elle retient. » |

### Le choix de la Scribe : même parcours, conséquences visibles

**A — Rendre la copie publique.**

- Le bouton annonce : « Mobiliser le Souk ; exposer les témoins. »
- Dans l'épilogue de la tour, des habitants viennent chercher les survivants
  à l'atelier de Fériel ; la Chambre convoque la Scribe pour une déposition.
- Dans le Souk, l'accueil est collectif et les témoins parlent ouvertement.

**B — Confier la copie à Tarek, discrètement.**

- Le bouton annonce : « Protéger les témoins ; renoncer au soutien public immédiat. »
- Dans l'épilogue, Tarek conduit les survivants jusqu'à l'atelier par un accès
  de service ; la Scribe conserve sa position mais aucun rassemblement ne les attend.
- Dans le Souk, les témoignages passent par un réseau discret, sans accueil public.

Dans les deux cas, les douze personnes sont mises à l'abri, les mêmes étages
restent accessibles et les mêmes cartes sont gagnables. Le choix change les
scènes, les relations et l'épilogue, **pas les PV ni une difficulté invisible**.
Une relecture depuis le journal ne remplace pas le choix enregistré.

## 5. Ce que le code permet déjà

| Élément vérifié | Point d'appui |
| --- | --- |
| Cinq tours, vingt étages et les paramètres de chaque adversaire | `src/games/rpgStoryTours.js` |
| Déblocage dans chaque tour, victoire et stockage local tolérant | `src/games/rpgStory.js` |
| Galerie, lancement via `demarrerEtage`, création via `nouvellePartie`, écran de résultat | `src/games/RpgDuelPage.jsx` |
| Récompenses des vingt étages, collection et cartes déjà possédées | `src/games/rpgCollection.js` |
| Mise à jour de collection après victoire | `noterVictoireEtage` dans `src/games/useDecksSablier.js` |
| Illustrations des cinq tours, portraits de Salem, Yamina, Fériel, Boualem et Tarek | `public/sablier-tours/`, `public/cards/` |
| Musique d'ambiance selon la tour | `src/games/rpgAmbientMusic.js` |

Important : **la progression Histoire n'est pas encore synchronisée avec le
compte**. La table `rpg_sablier_progress` transporte actuellement les decks
maison et la collection, pas les choix ni les scènes du récit.

Certains passages des anciens documents parlent encore de combats en équipe
ou de boss en deux manches. Le socle à préserver ici est bien le duel actuel :
PV pleins et deck complet à chaque étage, aucun report de ressources.

## 6. Implémentation proposée

### A. Des données narratives, séparées des règles de combat

Créer `src/games/rpgStoryScenes.js` pour le casting, les répliques, les choix et
les liaisons vers les identifiants d'étages existants. Créer
`src/games/rpgStoryFlow.js` pour les transitions pures et l'ordre de campagne.
Ces fichiers existent désormais ; leur contenu est la référence de l’épisode livré.

Extrait de contenu indicatif, **pas du code déjà branché** :

```js
{
  id: 'listes-2-apres',
  etageId: 'listes-2',
  moment: 'apres',
  repliques: [
    { personnage: 'scribe', texte: 'Voici les noms. Que comptez-vous en faire ?' },
  ],
  choix: {
    id: 'diffusion-liste',
    options: [
      { id: 'publique', texte: 'Rendre la copie publique' },
      { id: 'confiee', texte: 'Confier la copie à Tarek' },
    ],
  },
  suite: 'listes-3-avant',
}
```

Les effets possibles sont une petite liste explicite : enregistrer un choix,
valider une scène, ouvrir une entrée du journal. Pas de script arbitraire,
`eval`, modification de deck ou changement des règles dans une réplique.

### B. Un lecteur de scène et un contrôleur dédiés

- `RpgStoryScene.jsx` : décor, portrait facultatif, nom, réplique, progression
  et boutons « Continuer », « Résumer » et « Retour à l'histoire ».
- `useRpgStory.js` : point unique des transitions et de la persistance, alimenté
  par les fonctions pures de `rpgStoryFlow.js`.
- Styles dans `rpg-story.css`, avec les jetons sombres locaux déjà employés
  par le jeu, y compris quand le site est en thème clair.
- Miniatures et portraits existants pour le prototype. Un personnage sans
  portrait dispose d'un cartouche typographique ; pas d'image arbitraire
  présentée comme son portrait définitif. Aucun nouvel asset n'est indispensable.

Texte immédiatement lisible, pas de défilement automatique imposé. Boutons
accessibles au clavier, focus explicite lors du changement de scène, cibles
tactiles confortables, respect de `prefers-reduced-motion`. Un choix ne doit
jamais être sélectionné automatiquement par « Résumer ».

Garder la même coque `.rpg-battle` et son `shellRef` pour ne pas casser le
plein écran. Les scènes restent utilisables en portrait ; le duel conserve
son comportement paysage. La musique suit le contexte de la scène ou du duel,
avec le réglage de son existant.

### C. Brancher le récit aux deux endroits utiles

```text
Campagne → scène avant → bouton Commencer le duel → duel existant
                                                   │
                                 ┌─────────────────┴──────────────────┐
                                 │                                    │
                           victoire sauvegardée                 défaite / égalité
                                 │                                    │
                         scène après + choix                    résultat / réessayer
                                 │                              aucun progrès narratif
                         bilan / scène suivante
```

1. Intercepter l'entrée de campagne **avant** `demarrerEtage`. Ne créer le
   duel avec `nouvellePartie` qu'après la scène d'introduction : pas de
   mulligan caché derrière le dialogue, pas d'IA active pendant la lecture.
2. À la victoire, remplacer l'orchestration actuelle par une transition
   unique qui conserve `marquerEtageVaincu` et `noterVictoireEtage`, puis
   programme la scène de sortie. Ne pas ajouter un second effet concurrent
   qui distribuerait les récompenses séparément.
3. Les boutons « Étage suivant », « Rejouer » et « Retour aux tours » passent
   par ce contrôleur en campagne. Le résultat générique ne doit pas couvrir
   la scène ni permettre de sauter un choix non résolu.
4. Les transitions vérifient l'étage et la session de duel attendus ; un
   callback tardif d'un ancien combat ne peut pas avancer un nouveau récit.
   Annuler les minuteries du tour quand on quitte son contexte, en réutilisant
   le mécanisme de session déjà présent dans la page.
5. En cas de défaite, recommencer le combat sans imposer de relire la scène.
   Une option permet néanmoins de la revoir.

Pas de modification nécessaire de `rpgDuel.js` ni de `rpgAI.js` pour cet épisode.
Le journal et les scènes sont du récit, pas des effets de cartes.

### D. Sauvegarde : préserver les acquis et reprendre au bon endroit

La sauvegarde v1 ne conservait que `{ etagesVaincus: [...] }`.
**Ajouter simplement un champ de dialogue ne suffit pas :**
`normaliserProgressionHistoire` et `marquerEtageVaincu` reconstruisent cet
objet et supprimeraient ces nouveaux champs.

Proposition : faire évoluer ensemble le chargeur, le normaliseur et les
mutations vers une version 2 qui garde `etagesVaincus` au même endroit :

```js
{
  version: 2,
  etagesVaincus: ['listes-1', 'listes-2'],
  recit: {
    campagneId: 'derniere-liste',
    curseur: { type: 'scene', id: 'listes-2-apres', replique: 0, resume: false },
    scenesVues: ['listes-1-avant', 'listes-1-apres', 'listes-2-avant'],
    choix: {},
  },
}
```

- Nouvelle clé proposée : `letsplay_sablier_histoire_v2`. Lire la v2 si elle
  est valide ; sinon importer les étages connus de la clé v1. Ne jamais
  inventer des choix à partir d'anciennes victoires.
- Garder la v1 comme secours pendant la migration. Une réinitialisation
  complète confirmée devra effacer les deux clés, sinon le chargeur pourrait
  ressusciter l'ancienne partie.
- Sauvegarder la victoire **et** le curseur de scène après-duel dans le même
  objet. Recharger après une victoire doit ouvrir la scène en attente, pas
  exiger de regagner le duel ni oublier sa récompense.
- Marquer une scène vue à sa validation, pas à son ouverture. Conserver le
  choix et la position avant de passer à la scène suivante. Normaliser aussi
  les identifiants de scènes/options et les positions hors limites.
- La reprise d'un dialogue est persistante. **La sauvegarde du plateau de
  duel n'entre pas dans ce périmètre** : un duel interrompu par fermeture de
  page recommence, comme aujourd'hui.
- Stockage indisponible : la session reste jouable et un message indique que
  la progression n'est pas conservée. Aucun compte n'est nécessaire.
- Les transitions restent idempotentes : double clic, remontage React ou
  relecture d'une scène ne redistribuent rien et n'écrasent pas un choix validé.

Une extension serveur viendra ensuite. Il ne suffirait pas d'ajouter `recit`
au JSON de la table : `fusionnerEtatsSablier` et le hook de decks ne le
préservent pas aujourd'hui. Prévoir une écriture dédiée ou une fusion commune
non destructive, et une règle de conflit explicite pour deux choix opposés
sur deux appareils. Une union convient aux cartes, pas aux décisions.

### E. Ne pas verrouiller rétroactivement les tours actuelles

Dans Histoire, proposer **« Suivre la campagne »** et conserver la galerie
existante sous **« Tours libres »**.

- La campagne suit les scènes et l'ordre narratif défini dans `rpgStoryFlow.js`.
  Pour la première livraison, elle s'arrête proprement après les Listes.
- Les tours libres gardent leurs règles actuelles : premier étage accessible,
  puis déblocage interne. Leurs victoires donnent les cartes habituelles mais
  ne déclenchent pas la fin de campagne hors contexte.
- Les victoires sont partagées via `etagesVaincus`, pas les décisions : un
  ancien joueur peut lire les scènes dans l'ordre et choisir « Duel déjà
  remporté — continuer le récit », sans devoir refaire vingt combats.
- Ne pas marquer tous les dialogues vus en migrant une ancienne partie.
- « Recommencer le récit » remet seulement `recit` à zéro. Il ne supprime ni
  `etagesVaincus`, ni decks, ni cartes acquises. Ne pas réutiliser aveuglément
  l'actuelle réinitialisation complète : la collection locale dépend des
  victoires sauvegardées.

## 7. Découpage de réalisation et critères d'acceptation

### Lot 1 — Un trajet complet sur le Guetteur

Écrire les deux premières scènes, le lecteur, le contrôleur et la migration.
Vérifier : entrée → lecture → duel → victoire → lecture → retour/reprise.
Tester aussi la défaite et le chargement d'une sauvegarde antérieure.

### Lot 2 — L'épisode des Listes complet

Écrire les huit autres scènes, intégrer le choix de la Scribe et ses deux
variantes d'épilogue, ajouter le journal minimal et les récompenses au bilan.

**L'épisode est validable quand :**

- les cinq duels existants sont jouables sans règle supplémentaire ;
- le choix reçoit une conséquence visible avant la fin de la tour ;
- les survivants obtiennent réellement leur sursis ;
- une fermeture après victoire ne perd ni scène, ni carte, ni décision ;
- l'ancienne progression et les tours libres restent utilisables ;
- les scènes se lisent sur téléphone et au clavier sans minuteur.

### Lot 3 — Étendre, après validation du rythme

Écrire les quatre autres actes, leurs reprises du choix initial et les fins
Ouvrir/Tenir. Ajouter ensuite seulement les neuf registres et la fin cachée,
puis la synchronisation de récit entre appareils si elle est souhaitée.

**Hors première version :** nouvelles règles de boss, combat en deux manches,
doublage, exploration 3D, économie de ressources entre duels, décompte réel,
nouvelles cartes et génération dynamique de dialogues. Aucun n'est nécessaire
pour vérifier que l'histoire fonctionne.

### Vérifications à ajouter lors de l'implémentation

- Tests purs du graphe : références valides, choix à sorties atteignables,
  aucune impasse involontaire, deux branches rejoignant le bon étage.
- Tests de sauvegarde : v1 → v2 sans perte, JSON corrompu, stockage refusé,
  réinitialisation partielle/complète, conservation de `recit` après victoire.
- Tests de flux : victoire, défaite, égalité, double événement, ancien callback,
  scène quittée puis reprise, relecture sans effet, duel déjà gagné.
- Tests de collection : récompenses identiques à l'existant, aucune nouvelle
  condition de dialogue pour posséder une carte.
- Étendre `tests/rpg-story.test.js` et créer les tests purs du récit ; adapter
  `scripts/rpg-story-smoke.jsx` pour les deux entrées Campagne/Tours libres et
  ajouter un trajet réel avec choix, victoire et remontage de page.
- Exécuter `npm run check:rpg`, `npm run check:rpg-story-ui`,
  `npm run check:rpg-fullscreen`, `npm run check:rpg-mobile` et `npm run build`.

**Réalisation de la campagne complète :** les lots 1, 2 et 3 sont intégrés.
Le lecteur, le contrôleur, la migration, le journal, les cinq actes (40 scènes sur
les 20 duels des cinq tours), les cinq choix, les Neuf Registres et les trois fins
du Portail (*Ouvrir*, *Tenir*, *Prendre la place*) sont en place. Les vérifications
effectuées sont consignées dans la [bible visuelle](11-bible-visuelle.md).
