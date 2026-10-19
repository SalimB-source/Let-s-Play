## 📋 Description

Ajout de 5 nouvelles cartes **Tours de défense** pour le jeu Le Sablier, une pour chaque couleur (Braise, Eau, Sable, Neige, Ténèbres).

## 🃏 Nouvelles Cartes

| Carte | Élément | Rareté | Coût | ATK/DEF | Effet spécial |
|-------|---------|--------|------|---------|---------------|
| Tour de Braise | Braise | Commune | 3 | 0/5 | 1 dégât à une créature adverse à l'arrivée |
| Tour des Flots | Eau | Commune | 3 | 0/5 | Soin de 2 PV à l'arrivée |
| Tour de Sable | Sable | Inhabituelle | 4 | 1/6 | Bouclier +1 à une créature alliée à l'arrivée |
| Tour de Neige | Neige | Rare | 4 | 0/6 | Gel d'une créature adverse à l'arrivée |
| Tour des Ténèbres | Ténèbres | Mythique | 5 | 0/7 | 2 dégâts à toutes les créatures adverses à l'arrivée |

## Mécaniques Implémentées

### Propriétés spéciales
- doitBloquer: true - La tour DOIT bloquer une créature attaquante adverse chaque tour si possible
- prioriteAttaqueRapide: true - Les créatures adverses avec Attaque rapide/Coup rapide DOIVENT attaquer cette tour en priorité

### Modifications du moteur
- rpgDuel.js: Initialisation des propriétés + logique de blocage forcé + validation
- rpgAI.js: Priorité d'attaque pour les créatures rapides + blocage automatique des tours

## Visuels

5 nouvelles images générées dans public/cards/:
- tour-de-braise.jpg
- tour-des-flots.jpg
- tour-de-sable.jpg
- tour-de-neige.jpg
- tour-des-tenebres.jpg

Chaque image représente une tour de défense massive avec architecture militaire (créneaux, fentes de tir) adaptée à son élément.

## Validation
- Syntax JavaScript valide pour tous les fichiers modifiés
- Intégration complète avec le système de cartes existant
- Mécaniques testées dans le moteur de duel

## Objectif
Renforcer les options défensives dans le jeu avec des cartes qui:
- Ont une défense élevée et une attaque faible
- Obligent le blocage chaque tour
- Forcent les créatures rapides adverses à les cibler en priorité
- Offrent des effets supplémentaires selon leur rareté