# 34 — Frappe directe, Envol et « Attaquer avec tous »

## La règle

Une créature qui **n'a plus aucune cible atteignable** n'a qu'une action légale :
frapper le sorcier adverse. C'est vrai dans les trois formats — duel classique,
duel PvP et Conquête (MOBA) — et c'est vrai **quelle que soit la raison** pour
laquelle les créatures d'en face sont hors de portée :

- le champ adverse est vide ;
- il ne porte qu'une créature avec **Infiltration** (règle d'origine) ;
- il ne porte qu'une créature avec **Envol** face à un attaquant au sol ;
- il ne porte que des créatures protégées par leur couleur, ou trop éloignées
  dans une autre voie du MOBA.

Autrement dit : **Envol ne protège plus le sorcier, il protège la créature qui
le porte**. Une volante hors de portée ne « bloque » plus la frappe directe,
elle est simplement ignorée — et elle survit à l'attaque.

Le cas mixte garde la priorité de l'ancienne règle : **dès qu'une créature
adverse reste atteignable, on combat l'atteignable**. Un Envol à côté d'une
créature au sol ne dégage pas la voie.

### Où la règle vit

- `src/games/rpgDefenseur.js` — `attaqueDirectePermise(attaquant, adversaires, ciblesAtteignables)`.
  Le troisième argument est la liste des créatures réellement visables par cet
  attaquant, tous filtres appliqués (Envol, Infiltration, protection de
  couleur). Fournie et **vide**, elle rend la frappe directe légale malgré un
  champ peuplé ; **absente**, le comportement historique reprend (appelants qui
  n'ont pas calculé l'atteignabilité).
- `src/games/rpgCombatIndividuelClassique.js` — `rpgCiblesIndividuellesClassique`
  et `rpgCibleIndividuelleClassiqueEncoreLegale` : la cible annoncée est
  revérifiée à la résolution, avec **la même** liste d'atteignables. Corriger
  l'un sans l'autre ferait annuler l'attaque au moment de frapper.
- `src/games/rpgMobaAttaqueIndividuelle.js` — mêmes deux points, **voie par
  voie**. Au centre conquis, la frappe directe exige toujours une voie
  explicite ; chaque voie applique sa propre règle.
- `src/games/rpgDuel.js` — `rpgAttaquerSorcier`, le raccourci sans interface,
  calcule les atteignables avec les mêmes prédicats.

L'IA ne demande rien : elle lit `rpgCiblesIndividuellesClassique`, donc elle
profite de la règle (elle frappe directement quand plus rien n'est atteignable).

## Le bouton « Attaquer avec tous »

Il apparaît dans le **rail de tour**, à côté de « Fin du tour » (et dans les
commandes du MOBA), uniquement quand **le champ adverse est vide ou qu'aucune
créature adverse n'est atteignable** — c'est-à-dire quand *toutes* les créatures
prêtes sont dans le cas ci-dessus. Une seule créature atteignable le fait
disparaître : la vague n'a plus lieu d'être.

- `src/games/rpgAttaqueTous.js` — `rpgVagueDirecteClassique`,
  `rpgAttaqueTousDisponible` (duel et PvP), `rpgVagueDirecteMoba`,
  `rpgAttaqueTousMobaDisponible` (Conquête).
- `src/games/RpgDuelPage.jsx` — `lancerVagueDirecte` pose la file,
  `poursuivreVagueDirecte` enchaîne. Chaque frappe garde **sa** déclaration et
  **sa** résolution : la vague n'ouvre jamais un combat de groupe, et chaque
  créature peut être interrompue (morte, engagée, cible redevenue atteignable)
  sans emporter les suivantes. En PvP, la suite attend que la table soit au
  repos (aucune intention en vol, aucune fenêtre de réponse ouverte).
- `src/games/RpgMobaBoard.jsx` — même principe : `lancerAttaqueTous` déclare la
  première frappe directe de la vague, `poursuivreAttaqueTous` déclare la
  suivante une fois la précédente résolue, avec la voie mémorisée.
- Le raccourci clavier **A** clique le bouton rendu (aucun cas particulier).

## Ce que l'on garde intact

- La vague ne frappe **jamais** une créature : elle ne vise que le sorcier.
- Une créature volante infiltrée, engagée ou protégée reste sur le champ.
- Le bouton ne remplace pas « Confirmer l'attaque » : hors du cas « rien
  d'atteignable », le combat individuel habituel reprend la main.

## Vérifications

- `node --test tests/rpg-attaque-directe-nouvelle-regle.test.js`
- `node --test tests/rpg-attaque-tous.test.js`
- `node --test tests/rpg-classique-combat-individuel.test.js`
- `node --test tests/rpg-moba-defenseur-voie.test.js`
