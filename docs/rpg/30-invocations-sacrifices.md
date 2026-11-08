# Sacrifices d’invocation

Le sacrifice de remplacement d’une petite créature lorsque le champ est plein
est supprimé. Pour jouer une créature ou un héros **depuis la main**, le prix
est désormais déterminé par son coût imprimé :

| Coût | Sacrifices requis |
| --- | --- |
| 0 à 4 | Aucun |
| 5 ou 6 | Une créature alliée |
| 7 ou plus | Deux créatures alliées distinctes |

Le mana reste dû **en plus** de ces sacrifices. La règle s’applique même quand
le champ n’est pas plein. Les sites ne demandent pas de sacrifices et ne
peuvent pas servir de victimes ; les jetons-créatures peuvent être sacrifiés.
Les invocations depuis la main du duel classique suivent aussi ces seuils.
Le MOBA conserve ses règles propres. Les réanimations et créations de jetons
par effet ne paient pas ce prix.

## Choix et validation

Le joueur confirme le prix puis sélectionne ses victimes sur la table. Pour
deux victimes, la première reste en jeu et sélectionnée ; recliquer dessus la
désélectionne. Échap ou Renoncer annule sans payer ni sacrifier. La seconde
sélection complète le prix et déclenche la pose.

Le moteur revalide avant paiement : nombre exact de victimes, identifiants
distincts, présence dans le camp, absence de sites, case choisie, cible et mana.
Une pose refusée ne détruit aucune victime. Comme auparavant, un contresort IA
résolu avant l’entrée en jeu ne déclenche pas les sacrifices de la pose.
Le moteur conserve les vrais événements de mort, équipements détachés et
capacités de destruction des victimes.

En mode sans terrains, la limite reste cinq cartes sur le champ. Une petite
créature ne peut pas remplacer une carte occupant une case. Une invocation
coûteuse libère les cases de ses sacrifices, puis occupe la case choisie ou
celle de sa première victime.

L’IA ne propose une invocation que si elle possède assez de victimes ; elle
choisit les plus faibles à la résolution. En JcJ, `sacrificeIds` accompagne
l’intention `jouer-carte` et est revalidé par le moteur côté arbitre. Aucun
choix automatique n’est fait à la place d’un adversaire humain. L’alias
historique `sacrificeId` reste lisible pour une seule victime.

## Espacement

La gouttière commune aux cartes et aux emplacements passe de 16–26 à 20–30 px
sur PC. Au doigt, elle passe de `max(8px, .16 carte)` à
`max(10px, .19 carte)`. La grille de cases hérite toujours de la même gouttière
que les cartes, sans changer leur taille.

## Animation d’invocation

Toutes les victimes choisies portent simultanément un cercle doré, avec deux
anneaux tournant en sens contraires. Le cercle s’allume d’abord ; la déchirure
commence après 400 ms et dure 820 ms. Le cercle et ses derniers glyphes
s’éteignent à 1 400 ms. La nouvelle créature ne se pose qu’après la fin de
**tous** les cercles et une pause de 180 ms ; sa voix commence alors, pas
pendant le sacrifice. Ces durées suivent le réglage de vitesse du jeu.

La vraie carte est masquée pendant sa copie animée, en conservant sa case.
Un minuteur de secours, plus long que la séquence complète, évite un blocage
si `animationend` n’est pas émis. Un identifiant de séquence empêche un ancien
minuteur de terminer une nouvelle invocation. En mouvement réduit, la rotation
est désactivée et l’attente est ramenée à 80 ms. Aucun suivi du curseur ni boucle
de mesures géométriques n’est ajouté.
