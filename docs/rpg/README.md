# RPG tour par tour — dossier de conception

Dossier de conception pour le premier RPG de la maison :
**« Le Sablier de Bab El »**, un jeu de rôle **tour par tour** dans la lignée
de *Final Fantasy* et *Dragon Quest* — et explicitement **sans** le système
réactif de *Clair Obscur*.

| Fichier | Contenu |
| --- | --- |
| [`01-concepts.md`](01-concepts.md) | Les trois propositions d'univers, le comparatif, **la décision prise** |
| [`02-histoire.md`](02-histoire.md) | L'histoire de Bab El : la ville, l'équipe, les sept chapitres, les trois fins |
| [`03-combat.md`](03-combat.md) | Le système de combat **sans réflexes**, chiffre par chiffre (formules incluses) |
| [`04-progression-da.md`](04-progression-da.md) | Progression, économie du sable, direction artistique, son |
| [`05-production.md`](05-production.md) | Roadmap, vertical slice, équipe, budget, risques |

## La décision de conception

Deux choix structurent tout le dossier :

1. **L'univers** : *Le Sablier de Bab El* — une ville verticale de neuf étages
   au-dessus d'un désert qui monte, une horloge céleste qui égrène les cycles,
   et une administration qui décide qui est évacuable.
2. **Le combat** : **aucun réflexe**. Pas de parade, pas d'esquive, pas de
   barre qui se referme. Chaque ennemi annonce son coup un round à l'avance et
   le joueur répond en choisissant. Le jeu doit être jouable en une main, dans
   un bus, et il attend le joueur indéfiniment.

## Le prototype jouable

Le système de combat décrit dans `03-combat.md` est **codé et jouable** dans ce
dépôt, pour trancher sur du concret plutôt que sur du texte :

- `src/games/rpgCombat.js` — le moteur (règles pures, sans rendu)
- `src/games/rpgContent.js` — les données de la démo (équipe, ennemis, vagues)
- `src/games/RpgBattlePage.jsx` — la page jouable, route `/jeu/sablier-de-bab-el`
- `tests/rpg-combat.test.js` — les règles vérifiées (`npm run check:rpg`)
- `scripts/rpg-battle-ui-check.mjs` — la page montée dans jsdom (`npm run check:rpg-ui`)

Le moteur est volontairement **agnostique** : il ne connaît ni les noms ni
l'univers. Changer de concept ne demande qu'un nouveau fichier de contenu.

## Ce que l'on cherche à faire ressentir

Deux références, deux leçons :

- **Dragon Quest** → la **lisibilité**. Une action = un effet compréhensible.
  Aucun système ne doit exiger un tableur.
- **Final Fantasy** → la **fantasie et l'échelle**. Des boss immenses, une
  musique qui porte, des moments où l'on se sent puissant.

De *Clair Obscur*, on ne garde qu'une seule idée, débarrassée du temps réel :
**l'ennemi annonce ce qu'il va faire.** Ce qu'on en fait est de la décision.

La règle qui départage toutes les décisions de design de ce dossier :

> **Le joueur doit pouvoir expliquer pourquoi il a gagné. Un tour doit se jouer
> en moins de 12 secondes, et aucune défaite ne doit être une surprise.**
