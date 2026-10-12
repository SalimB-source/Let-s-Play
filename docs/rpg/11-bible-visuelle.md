# 11 — La Dernière Liste : bible visuelle et intégration

## Règle absolue : un personnage, un portrait de référence

Les personnages récurrents **ne sont pas générés de nouveau pour chaque scène**.
La première version utilise des peintures fixes, composées avec des décors
séparés et du texte DOM. La même illustration est réutilisée dans le dialogue,
le briefing, le journal et la plaque adverse du duel.

Le registre unique est `src/games/rpgStoryCast.js` :

- `RPG_STORY_CAST` : identité, rôle, couleur de cartouche, fichier et cadrage ;
- `RPG_STORY_OPPONENT_CAST` : correspondance étage → personnage ;
- `portraitHistoire` : résolution commune des images ; pour une carte existante,
  délégation au résolveur `cardArt` de la page, avec la même révision de cache ;
- `RPG_STORY_DECORS` : décors indépendants, sans nouvelle incarnation des héros.

**Les répliques ne contiennent que l'identifiant du personnage, jamais une
image alternative.** Les objets du registre sont figés et les tests vérifient
les références, les fichiers livrés et la continuité de leurs URL dans l'interface.

## Les références conservées

| Personnage | Illustration canonique | Règle |
| --- | --- | --- |
| Salem | `public/cards/salem.jpg` | Illustration existante, inchangée |
| Yamina | `public/cards/yamina.jpg` | Illustration existante, inchangée |
| Fériel | `public/cards/feriel.jpg` | Illustration existante, inchangée, y compris comme adversaire à `listes-4` |
| Tarek | `public/cards/tarek.jpg` | Illustration existante, inchangée |
| Boualem | `public/cards/boualem.jpg` | Réservé pour les actes suivants, illustration inchangée |
| Le Guetteur de palier | `public/cards/guetteur-du-beffroi.jpg` | Portrait existant adopté comme référence de ce gardien |
| La Scribe | `public/sablier-story/scribe.jpg` | Portrait dédié au personnage féminin du récit ; ne remplace pas l'illustration de la carte générique `scribe-de-la-liste` |
| Le Puisatier des Cendres | `public/sablier-story/puisatier.jpg` | Personnage distinct de Boualem |
| Mahieddine | `public/sablier-story/mahieddine.jpg` | Le Grand Horloger de `listes-5`, pas l'Horloger du Zénith |

Les quatre nouveaux fichiers de `public/sablier-story/` sont des illustrations
IA réalisées pour cet épisode : trois portraits et un décor vide (`greffe.jpg`).
Les peintures de la Tour des Listes et les cartes existantes ont servi de
références de style. Les anciennes illustrations n'ont pas été retouchées.

### Repères des nouveaux personnages

- **La Scribe** : cheveux noirs tressés, robe vert profond, manches ivoire,
  sceau-sablier au cou, plume et tache d'encre à la main. Attitude attentive,
  tenue d'administration, pas une sorcière caricaturale.
- **Le Puisatier des Cendres** : visage buriné, barbe poivre et sel, turban
  ocre, vêtement de travail indigo, corde et clef de citerne.
- **Mahieddine** : cheveux courts argentés, barbe courte, lunettes rondes de
  laiton, caftan bordeaux, col ivoire, broche-sablier et verre de thé. Courtois
  et fatigué plutôt que menaçant.

Pour les futurs chapitres, les **fichiers eux-mêmes** priment sur une simple
description textuelle. Une nouvelle pose devra être produite avec ce portrait
comme référence, puis contrôlée et validée avant intégration : visage, cheveux,
tenue, bijoux et accessoires. Pas de variante aléatoire ni de portrait provenant
d'une autre carte pour meubler une réplique. La version livrée n'utilise aucune
variante et garantit donc la continuité par réemploi du même fichier.

## Mise en scène

- Décor atmosphérique indépendant, portrait encadré et cartouche de dialogue.
- Décors : extérieur des Listes, greffe, citernes et atelier du Souk. Les
  miniatures existantes servent de vues d'ambiance ; le nouveau greffe est vide.
- Pas de texte imprimé dans les images : les noms et répliques restent nets,
  sélectionnables et accessibles aux lecteurs d'écran.
- Un changement d'interlocuteur remplace le portrait par **sa** référence.
  Aucun retournement horizontal, recoloration de costume ou nouvel âge.
- Lecteur utilisable en portrait sur téléphone, en paysage et au clavier.
  Le plein écran conserve la même coque que le duel.
- Texte immédiat, progression manuelle, son désactivable, transitions supprimées
  si `prefers-reduced-motion` est demandé. Aucun compte à rebours.

## Ce qui est livré

Accès : **Le Sablier → Histoire → Commencer le récit**.

- Épisode I, **Les absents** : 5 duels existants et 10 scènes.
- Décision de la Scribe : publication ou copie confiée à Tarek ; reprise dans
  la scène de Fériel et l'épilogue. Les deux voies préservent les mêmes cartes.
- Journal en lecture seule : scènes terminées, décision, les douze noms et
  portraits des personnages rencontrés, sans dévoiler les scènes futures.
- Les cinq tours libres restent accessibles, sans verrou narratif supplémentaire.
- Un duel déjà remporté peut être passé pour découvrir l'histoire sans grind.
- Une défaite ne fait pas avancer le récit et ne réimpose pas l'introduction.
- Ouvrir une lecture depuis un duel en cours demande confirmation avant de
  l'interrompre. « Continuer le récit » reprend directement un duel de campagne
  encore en mémoire.
- « Recommencer le récit » conserve les victoires, cartes et decks ; l'effacement
  complet des victoires se confirme séparément et met d'abord les cartes acquises
  en cache pour ne pas les retirer de la collection.

### Sauvegarde

`letsplay_sablier_histoire_v2` porte les victoires et le récit dans un même objet :
`version`, `etagesVaincus`, `recit` (`campagneId`, `curseur`, `scenesVues`, `choix`).
Le curseur peut être une scène avec sa réplique / son résumé, un briefing de
duel, ou la fin d'épisode.

Migration depuis la v1 sans perte de victoire ni décision inventée ; v1 gardée
en secours. Victoire et scène après-duel enregistrées ensemble. Un stockage
refusé est signalé sans empêcher la session. La progression narrative reste
**locale** : la synchronisation du compte porte toujours sur les decks et la
collection, pas sur le récit. Le plateau d'un duel n'est pas sauvegardé après
fermeture de page.

### Limites assumées

Les quatre actes suivants, les fins du portail, les neuf registres optionnels,
le doublage et la synchronisation du récit sont hors de cette livraison.
Le moteur `rpgDuel.js`, l'IA et les récompenses d'étage ne sont pas modifiés.

## Vérifications

- `npm run check:rpg` : 293 tests, dont 17 nouveaux sur le récit et les portraits.
- `npm run check:rpg-story-ui` : tours libres et lecteur réellement montés ;
  victoire/défaite du moteur sur fixtures accélérées, reprise, décisions,
  journal, réinitialisation, stockage refusé, contrôle de l'interruption d'un duel.
- `npm run check:rpg-story-browser` : les deux branches dans Chromium, en tactile
  et sur ordinateur ; migration, clavier, rechargement, images décodées,
  portraits identiques, journal sans effet, 320 à 1440 px, thèmes clair/sombre.
- `npm run check:rpg-ui`, `check:rpg-fullscreen`, `check:rpg-ambient-ui`,
  `check:rpg-deck-ui`, `check:rpg-tutorial-ui` et `npm run build` réussis.

**Point préexistant relevé :** `npm run check:rpg-mobile` échoue sur son assertion
« terrain stacks … and hand stats fit » à **568 px**, avec le Chromium de cet
environnement. Le même échec a été reproduit sur les sources du commit de départ
`65664ea4`, sans ces changements. Le test n'a pas été assoupli et le CSS du
plateau mobile n'a pas été modifié. Les vérifications mobiles du nouveau lecteur
passent. Le build conserve également les avertissements de taille des gros
chunks du site.
