# Borne Mega Drive — provenance et licences

Page : `/games/megadrive` (`src/games/megadrive/`).

**Règle** : on n'héberge que des jeux dont les auteurs autorisent la
diffusion gratuite. Jamais de ROM commerciale. Chaque ajout se vérifie à la
source (page de l'auteur), et la preuve est notée dans `roms/<jeu>/INFO.txt`.

## Moteur

`core/` — RetroArch 1.22.2 + Genesis Plus GX, compilation web officielle non
modifiée. Détails, sources et licences : `core/SOURCE.txt`.
⚠ Licence Genesis Plus GX **non commerciale** : pas de pub, d'abonnement ni de
vente sur cette page.

## Jeux hébergés

| Jeu | Auteurs | Statut | Preuve |
|---|---|---|---|
| Oh Mummy Genesis | 1985 Alternativo / Pocket Lucho | Freeware (libéré par les auteurs en 2013) | `roms/oh-mummy/INFO.txt` |
| Irmãos Aratu | Mangangá Team (Laudelino, Amaweks) | Distribution gratuite déclarée par les auteurs | `roms/irmaos-aratu/INFO.txt` |
| Shaolin Carcará | Mangangá Team (Laudelino, Amaweks) | Distribution gratuite déclarée par les auteurs | `roms/shaolin-carcara/INFO.txt` |
| Minesweeper MD | Nightwolf-47 | MIT | `roms/minesweeper/LICENSE.txt` |
| KłełeAtoms MD | Nightwolf-47 | MIT | `roms/kleleatoms/LICENSE.txt` |

Un jeu dont le dossier ne contient pas encore la ROM est marqué `pending`
dans `src/games/megadrive/catalog.js` et s'affiche « Bientôt » sur la borne.

## Jeux présentés sans être hébergés (lien vers l'auteur)

| Jeu | Raison |
|---|---|
| 30 Years of Nintendon't, Break An Egg (Dr. Ludos) | Gratuits, mais aucune autorisation de redistribution ; 30 Years est vendu en cartouche |
| Bio Evil | Adaptation non officielle de Resident Evil (propriété de Capcom) |
| Barbarian (Z-Team) | Portage qui réutilise les graphismes et sons originaux (Psygnosis) |

Jaquettes : illustrations originales Let's Play (`cover.webp`).
