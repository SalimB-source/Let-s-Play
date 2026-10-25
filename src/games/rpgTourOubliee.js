/**
 * La Tour Oubliée — le set secret du Sablier, joué par la seule IA.
 *
 * Onzième tour de Bab El, ajoutée **après** la Tour du Sablier renversé et
 * verrouillée tant que ses sept maîtres n'ont pas rendu les armes. La Chambre a
 * effacé cette tour du registre : ses gardiens ne figurent dans aucun acte du
 * récit, et ses cartes ne sont **pas au catalogue**.
 *
 * Règle d'or du module : ces cartes sont connues du moteur (`cardById`,
 * `duelCardById`, `magieById`, `armeById`, `jetonById` — voir `rpgCards.js`)
 * mais absentes de `RPG_DUEL_CARDS`. Elles ne peuvent donc être ni tirées au
 * Souk, ni collectionnées, ni mises dans un deck de joueur, ni jouées en PvP :
 * seul un étage de cette tour les aligne.
 *
 * Identité de jeu : **Ténèbres** pures. Trois tribus — la Horde (zombies), la
 * Cour de sang (vampires), les Cauchemars (le folklore démoniaque du Maghreb) —
 * et l'Encre du registre, qui efface les noms. Fiche de design :
 * `docs/rpg/23-tour-oubliee.md`.
 */

export const RPG_TOUR_OUBLIEE_SET_ID = 'tour-oubliee';

/** Chaque carte du set : Ténèbres, set dédié, illustration à son nom. */
const carte = (definition) => ({
  ...definition,
  element: 'tenebres',
  set: RPG_TOUR_OUBLIEE_SET_ID,
  art: definition.art ?? definition.id,
});

/** Les créatures-jetons de la tour — le Lambeau, tout ce qui reste des morts. */
export const RPG_TOUR_OUBLIEE_JETONS = [{
  id: 'lambeau',
  name: 'Lambeau',
  pluriel: 'lambeaux',
  kind: 'creature',
  jeton: true,
  element: 'tenebres',
  set: RPG_TOUR_OUBLIEE_SET_ID,
  // Le jeton n'a pas de peinture dédiée : il emprunte la dépouille du Portefaix
  // cousu, dont il est la pièce détachée. Aucun test de partage ne couvre les
  // jetons (ils ne sont pas des cartes du catalogue).
  art: 'portefaix-cousu',
  cost: 0,
  atk: 1,
  def: 1,
  rarity: 'commune',
  typeLine: 'Créature-jeton — Lambeau',
  text: 'Créé par la Horde et par L’Oublié. 1/1, sans coût.',
  flavor: 'Un nom, un bras, un morceau de mâchoire : la horde ne perd jamais tout.',
}];

// ── La Horde — les zombies, la mort qui revient en nombre ────────────────────

export const RPG_TOUR_OUBLIEE_CREATURES = [
  carte({
    id: 'rodeur-des-fosses',
    name: 'Rôdeur des fosses',
    cost: 1,
    atk: 2,
    def: 1,
    rarity: 'commune',
    rapidite: true,
    typeLine: 'Créature — Zombie · Horde',
    text: 'Rapidité — Peut attaquer le tour où il arrive.',
    flavor: 'Il est sorti de la fosse avant qu’on ait fini de le compter parmi les morts.',
  }),
  carte({
    id: 'portefaix-cousu',
    name: 'Portefaix cousu',
    cost: 2,
    atk: 1,
    def: 3,
    rarity: 'commune',
    destruction: { type: 'jetons', jeton: 'lambeau', nombre: 1 },
    typeLine: 'Créature — Zombie · Horde',
    text: 'Quand Portefaix cousu meurt, créez une créature-jeton « Lambeau » 1/1.',
    flavor: 'Il portait les pierres de la tour. Il en porte encore les coutures.',
  }),
  carte({
    id: 'charognard-du-puits',
    name: 'Charognard du puits',
    cost: 2,
    atk: 2,
    def: 2,
    rarity: 'commune',
    destruction: { type: 'defaussePaquet', amount: 1 },
    typeLine: 'Créature — Zombie · Horde',
    text: 'Quand Charognard du puits meurt, la carte du dessus du paquet adverse part au cimetière.',
    flavor: 'Il fouille le puits à la recherche de son propre nom.',
  }),
  carte({
    id: 'mange-souvenirs',
    name: 'Mange-souvenirs',
    cost: 3,
    atk: 3,
    def: 2,
    rarity: 'inhabituelle',
    arrivee: { type: 'defaussePaquet', amount: 2 },
    typeLine: 'Créature — Zombie · Horde',
    text: 'Quand Mange-souvenirs arrive, les deux cartes du dessus du paquet adverse partent au cimetière.',
    flavor: 'Il ne mange pas les morts : il mange ce qu’on se rappelait d’eux.',
  }),
  carte({
    id: 'noye-du-puits',
    name: 'Noyé du puits',
    cost: 4,
    atk: 4,
    def: 4,
    rarity: 'inhabituelle',
    arrivee: { type: 'gel', cible: 'creature' },
    typeLine: 'Créature — Zombie · Horde',
    text: 'Quand Noyé du puits arrive, une créature adverse ciblée est gelée : ni attaque ni blocage jusqu’à la fin de son prochain tour.',
    flavor: 'L’eau de la tour ne rend pas les corps — elle les retient.',
  }),
  carte({
    id: 'colosse-des-charognes',
    name: 'Colosse des charognes',
    cost: 5,
    atk: 5,
    def: 5,
    rarity: 'rare',
    destruction: { type: 'jetons', jeton: 'lambeau', nombre: 2 },
    typeLine: 'Créature — Zombie · Horde',
    text: 'Quand Colosse des charognes meurt, créez deux créatures-jeton « Lambeau » 1/1.',
    flavor: 'Il marche avec les jambes des autres, et personne ne réclame.',
  }),

  // ── La Cour de sang — les vampires, le vol de vie ────────────────────────

  carte({
    id: 'chauve-souris-du-seuil',
    name: 'Chauve-souris du seuil',
    cost: 1,
    atk: 1,
    def: 1,
    rarity: 'commune',
    envol: true,
    rapidite: true,
    typeLine: 'Créature — Animal · Cour de sang',
    text: 'Envol — Ne peut être bloquée que par une créature avec Envol. Rapidité — Peut attaquer le tour où elle arrive.',
    flavor: 'Elle sort du linteau comme une langue.',
  }),
  carte({
    id: 'buveur-de-nuits',
    name: 'Buveur de nuits',
    cost: 2,
    atk: 2,
    def: 2,
    rarity: 'inhabituelle',
    rapidite: true,
    tribut: 1,
    typeLine: 'Créature — Vampire · Cour de sang',
    text: 'Rapidité — Peut attaquer le tour où il arrive. Tribut 1 — Quand cette créature touche le sorcier adverse, il perd 1 PV et vous en gagnez 1.',
    flavor: 'Il ne tue pas la nuit : il la boit.',
  }),
  carte({
    id: 'dame-aux-crocs-longs',
    name: 'Dame aux crocs longs',
    cost: 4,
    atk: 3,
    def: 3,
    rarity: 'inhabituelle',
    envol: true,
    tribut: 2,
    typeLine: 'Créature légendaire — Vampire · Cour de sang',
    text: 'Envol — Ne peut être bloquée que par une créature avec Envol. Tribut 2 — Quand cette créature touche le sorcier adverse, il perd 2 PV et vous en gagnez 2.',
    flavor: 'Sa robe descend jusqu’aux dalles ; ses dents, jusqu’au cœur.',
  }),
  carte({
    id: 'comte-des-mille-dents',
    name: 'Comte des mille dents',
    cost: 6,
    atk: 5,
    def: 5,
    rarity: 'mythique',
    envol: true,
    tribut: 3,
    arrivee: { type: 'transfert', amount: 2 },
    typeLine: 'Créature légendaire — Vampire · Cour de sang',
    text: 'Envol — Ne peut être bloqué que par une créature avec Envol. Tribut 3 — Quand cette créature touche le sorcier adverse, il perd 3 PV et vous en gagnez 3. Quand le Comte arrive : le sorcier adverse perd 2 PV et vous en gagnez 2.',
    flavor: 'Mille dents, mille dettes : il tient le registre des vies qu’on lui doit.',
  }),

  // ── Les Cauchemars — le folklore démoniaque du Maghreb ────────────────────

  carte({
    id: 'chacal-sans-maitre',
    name: 'Chacal sans maître',
    cost: 2,
    atk: 2,
    def: 2,
    rarity: 'commune',
    arrivee: { type: 'pioche-defausse', pioche: 1, defausse: 1 },
    typeLine: 'Créature — Goule · Cauchemars',
    text: 'Quand Chacal sans maître arrive : piochez une carte puis défaussez une carte.',
    flavor: 'Il rôde entre les deux registres, celui des vivants et celui des oubliés.',
  }),
  carte({
    id: 'goule-des-cimetieres',
    name: 'Goule des cimetières',
    cost: 2,
    atk: 2,
    def: 1,
    rarity: 'commune',
    arrivee: { type: 'debuff', atk: -1, def: -1, cible: 'creature', minimum: 1 },
    typeLine: 'Créature — Goule · Cauchemars',
    text: 'Quand Goule des cimetières arrive : une créature adverse ciblée perd 1 attaque et 1 défense (sans descendre sous 1).',
    flavor: 'Elle ne dévore pas les corps : elle dévore ce qui les tenait debout.',
  }),
  carte({
    id: 'ifrit-d-encre',
    name: 'Ifrit d’encre',
    cost: 3,
    atk: 3,
    def: 2,
    rarity: 'inhabituelle',
    rapidite: true,
    furie: 1,
    typeLine: 'Créature — Ifrit · Cauchemars',
    text: 'Rapidité — Peut attaquer le tour où il arrive. Furie 1 — Chaque blessure le rend plus fort.',
    flavor: 'Il sort de l’encrier comme d’une lampe, et brûle le nom qu’on y avait trempé.',
  }),
  carte({
    id: 'goule-affamee',
    name: 'Goule affamée',
    cost: 3,
    atk: 3,
    def: 1,
    rarity: 'rare',
    arrivee: { type: 'destruction-coutmax', coutMax: 1, cible: 'creatures-adverses' },
    typeLine: 'Créature — Goule · Cauchemars',
    text: 'Quand Goule affamée arrive : détruisez les créatures adverses de coût 1 ou moins.',
    flavor: 'Elle commence par les petits noms, ceux qu’aucun registre ne défend.',
  }),
  carte({
    id: 'bou-jeloud',
    name: 'Bou Jeloud',
    cost: 5,
    atk: 3,
    def: 4,
    rarity: 'rare',
    aura: { type: 'buff-autres', atk: 1, def: 0, saufSoi: true, camps: 'camp' },
    typeLine: 'Créature légendaire — Cauchemar · Père des peaux',
    text: 'Tant que Bou Jeloud est en jeu, toutes vos autres créatures gagnent +1/+0.',
    flavor: 'Il danse devant la horde avec sa peau de chèvre, et la horde suit le rythme.',
  }),
  carte({
    id: 'aicha-kandicha',
    name: 'Aïcha Kandicha',
    cost: 5,
    atk: 4,
    def: 4,
    rarity: 'mythique',
    envol: true,
    arrivee: { type: 'empeche-blocage' },
    typeLine: 'Créature légendaire — Cauchemar · Celle aux pattes de chameau',
    text: 'Envol — Ne peut être bloquée que par une créature avec Envol. Quand Aïcha Kandicha arrive : une créature adverse ciblée ne peut pas bloquer avant la fin de son prochain tour.',
    flavor: 'On entend ses bijoux avant de voir ses pattes ; après, on ne se souvient plus de rien.',
  }),
  carte({
    id: 'teryel-aux-sept-cornes',
    name: 'Teryel aux sept cornes',
    cost: 6,
    atk: 6,
    def: 6,
    rarity: 'mythique',
    furie: 2,
    arrivee: { type: 'exil', cible: 'creature', coutMax: 3 },
    typeLine: 'Créature légendaire — Ogresse · Cauchemars',
    text: 'Furie 2 — Chaque blessure la rend plus forte. Quand Teryel arrive : retirez de la partie une créature adverse de coût 3 ou moins.',
    flavor: 'L’ogresse des montagnes compte ses cornes : il en manque toujours une, et c’est vous.',
  }),
  carte({
    id: 'l-oublie',
    name: 'L’OUBLIÉ',
    role: 'Le Roi sans nom',
    kind: 'hero',
    cost: 7,
    atk: 7,
    def: 7,
    rarity: 'mythique',
    protectionSorts: true,
    tenacite: true,
    tribut: 2,
    arrivee: { type: 'destruction-coutmax', coutMax: 2, cible: 'creatures-adverses' },
    destruction: { type: 'jetons', jeton: 'lambeau', nombre: 2 },
    typeLine: 'Créature légendaire — Roi oublié',
    text: 'Protection contre les magies — Aucune magie ne peut le viser ni le toucher. Tenacité — La première fois qu’il devrait mourir, il survit. Tribut 2 — Quand il touche le sorcier adverse, il perd 2 PV et vous en gagnez 2. Quand il arrive : détruisez les créatures adverses de coût 2 ou moins. Quand il meurt : créez deux créatures-jeton « Lambeau » 1/1.',
    flavor: 'On a effacé son nom de la Liste. Il a effacé la Liste.',
  }),
];

// ── Les magies et l'arme du registre ────────────────────────────────────────

export const RPG_TOUR_OUBLIEE_MAGIES = [
  carte({
    id: 'encre-du-registre',
    name: 'Encre du registre',
    kind: 'magie',
    cost: 1,
    rarity: 'commune',
    instant: true,
    cibles: ['creature-amie'],
    effet: { type: 'buff', atk: 1, def: 2, cible: 'creature-amie' },
    typeLine: 'Magie Rapide — Encre · Ténèbres',
    text: 'Une créature alliée ciblée gagne +1/+2.',
    flavor: 'Une goutte d’encre, et le nom tient debout une heure de plus.',
  }),
  carte({
    id: 'aiguille-du-sabbat',
    name: 'Aiguille du sabbat',
    kind: 'magie',
    cost: 2,
    rarity: 'inhabituelle',
    cibles: ['creature'],
    effet: { type: 'debuff', atk: -2, def: -2, cible: 'creature', minimum: 1 },
    typeLine: 'Sorcellerie — Sabbat · Ténèbres',
    text: 'Une créature adverse ciblée perd 2 attaque et 2 défense (sans descendre sous 1).',
    flavor: 'On pique le nom, pas la poupée : le corps suit.',
  }),
  carte({
    id: 'soif-du-sabbat',
    name: 'Soif du sabbat',
    kind: 'magie',
    cost: 3,
    rarity: 'inhabituelle',
    instant: true,
    cibles: ['sorcier'],
    effet: { type: 'transfert', amount: 2 },
    typeLine: 'Magie Rapide — Cour de sang · Ténèbres',
    text: 'Le sorcier adverse perd 2 PV et vous en gagnez 2.',
    flavor: 'La coupe circule ; personne ne demande ce qu’elle contient.',
  }),
  carte({
    id: 'pacte-de-l-oubliee',
    name: 'Pacte de l’Oubliée',
    kind: 'magie',
    cost: 2,
    rarity: 'rare',
    prixPv: 3,
    cibles: ['soi'],
    effet: { type: 'pioche', amount: 2 },
    typeLine: 'Sorcellerie — Pacte · Ténèbres',
    text: 'Payez 3 PV : piochez deux cartes.',
    flavor: 'L’Oubliée prête toujours deux pages. La troisième, c’est vous qui l’écrivez.',
  }),
  carte({
    id: 'reveil-de-la-horde',
    name: 'Réveil de la horde',
    kind: 'magie',
    cost: 5,
    rarity: 'rare',
    cibles: ['soi'],
    effet: { type: 'reanimation' },
    typeLine: 'Sorcellerie — Horde · Ténèbres',
    text: 'La dernière créature de votre cimetière revient en jeu.',
    flavor: 'On ne ressuscite pas un nom : on le remet au travail.',
  }),
];

export const RPG_TOUR_OUBLIEE_ARMES = [
  carte({
    id: 'pilon-du-fossoyeur',
    name: 'Pilon du fossoyeur',
    kind: 'arme',
    cost: 2,
    rarity: 'commune',
    typeLine: 'Arme — Pilon',
    bonus: { atk: 1, def: 1 },
    donne: { tribut: 1 },
    text: 'Arme — Le porteur gagne +1/+1 et Tribut 1.',
    flavor: 'Le manche est une planche de cercueil ; la tête, ce qui restait dessous.',
  }),
];

/** Toutes les cartes du set, dans l'ordre des lookups du moteur. */
export const RPG_TOUR_OUBLIEE_CARTES = [
  ...RPG_TOUR_OUBLIEE_CREATURES,
  ...RPG_TOUR_OUBLIEE_MAGIES,
  ...RPG_TOUR_OUBLIEE_ARMES,
];

/** Index rapide des cartes du set (identifiant → carte), jetons exclus. */
const CARTES_PAR_ID = new Map(RPG_TOUR_OUBLIEE_CARTES.map((entry) => [entry.id, entry]));

/** Une carte du set de l'Oubliée, ou `null`. */
export function carteOublieeParId(id) {
  return CARTES_PAR_ID.get(id) ?? null;
}

/** Cet identifiant est-il une carte (ou un jeton) de la Tour Oubliée ? */
export function estCarteOubliee(id) {
  return CARTES_PAR_ID.has(id) || RPG_TOUR_OUBLIEE_JETONS.some((jeton) => jeton.id === id);
}

// ── Les paquets de la tour ──────────────────────────────────────────────────
//
// Format commun des paquets de campagne : 30 cartes, aucune carte de terrain,
// deux exemplaires au plus (un seul pour les mythiques). La rampe se lit dans
// la composition : les premiers étages n'alignent que des communes et des
// inhabituelles, le sommet aligne les quatre mythiques du set.

export const RPG_TOUR_OUBLIEE_DECKS = {
  // Étage 1 — la Horde seule : rien que des communes et des inhabituelles.
  'horde-des-fosses': [
    'rodeur-des-fosses', 'rodeur-des-fosses',
    'portefaix-cousu', 'portefaix-cousu',
    'charognard-du-puits', 'charognard-du-puits',
    'chauve-souris-du-seuil', 'chauve-souris-du-seuil',
    'chacal-sans-maitre', 'chacal-sans-maitre',
    'goule-des-cimetieres', 'goule-des-cimetieres',
    'encre-du-registre', 'encre-du-registre',
    'pilon-du-fossoyeur', 'pilon-du-fossoyeur',
    'mange-souvenirs', 'mange-souvenirs',
    'noye-du-puits', 'noye-du-puits',
    'buveur-de-nuits', 'buveur-de-nuits',
    'ifrit-d-encre', 'ifrit-d-encre',
    'aiguille-du-sabbat', 'aiguille-du-sabbat',
    'dame-aux-crocs-longs', 'dame-aux-crocs-longs',
    'soif-du-sabbat', 'soif-du-sabbat',
  ],
  // Étage 2 — la Cour de sang : le vol de vie, et le Comte en unique figure.
  'cour-de-sang': [
    'chauve-souris-du-seuil', 'chauve-souris-du-seuil',
    'rodeur-des-fosses', 'rodeur-des-fosses',
    'portefaix-cousu', 'portefaix-cousu',
    'chacal-sans-maitre', 'chacal-sans-maitre',
    'encre-du-registre', 'encre-du-registre',
    'goule-des-cimetieres', 'goule-des-cimetieres',
    'pilon-du-fossoyeur', 'pilon-du-fossoyeur',
    'buveur-de-nuits', 'buveur-de-nuits',
    'dame-aux-crocs-longs', 'dame-aux-crocs-longs',
    'soif-du-sabbat', 'soif-du-sabbat',
    'ifrit-d-encre', 'ifrit-d-encre',
    'noye-du-puits', 'noye-du-puits',
    'aiguille-du-sabbat', 'aiguille-du-sabbat',
    'mange-souvenirs', 'mange-souvenirs',
    'pacte-de-l-oubliee',
    // Une seule rare pour ce palier encore équilibré : le premier avant-goût
    // de la Goule, qui efface les petites créatures.
    'goule-affamee',
  ],
  // Étage 3 — les Cauchemars du Gourara : les rares entrent, Bou Jeloud mène.
  'cauchemars-du-gourara': [
    'chacal-sans-maitre', 'chacal-sans-maitre',
    'goule-des-cimetieres', 'goule-des-cimetieres',
    'rodeur-des-fosses', 'rodeur-des-fosses',
    'portefaix-cousu', 'portefaix-cousu',
    'chauve-souris-du-seuil',
    'encre-du-registre', 'encre-du-registre',
    'pilon-du-fossoyeur',
    'ifrit-d-encre', 'ifrit-d-encre',
    'aiguille-du-sabbat', 'aiguille-du-sabbat',
    'buveur-de-nuits',
    'mange-souvenirs', 'mange-souvenirs',
    'noye-du-puits',
    'goule-affamee', 'goule-affamee',
    'bou-jeloud', 'bou-jeloud',
    'colosse-des-charognes', 'colosse-des-charognes',
    'reveil-de-la-horde', 'reveil-de-la-horde',
    'pacte-de-l-oubliee',
    'aicha-kandicha',
  ],
  // Étage 4 — le registre : la goule ouvre, Aïcha Kandicha ferme les blocages.
  'cauchemars-du-registre': [
    'goule-des-cimetieres', 'goule-des-cimetieres',
    'chacal-sans-maitre', 'chacal-sans-maitre',
    'chauve-souris-du-seuil', 'chauve-souris-du-seuil',
    'rodeur-des-fosses',
    'encre-du-registre', 'encre-du-registre',
    'pilon-du-fossoyeur', 'pilon-du-fossoyeur',
    'ifrit-d-encre', 'ifrit-d-encre',
    'aiguille-du-sabbat', 'aiguille-du-sabbat',
    'soif-du-sabbat', 'soif-du-sabbat',
    'mange-souvenirs', 'mange-souvenirs',
    'noye-du-puits', 'noye-du-puits',
    'buveur-de-nuits', 'buveur-de-nuits',
    'goule-affamee', 'goule-affamee',
    'bou-jeloud',
    'reveil-de-la-horde', 'reveil-de-la-horde',
    'aicha-kandicha',
    'teryel-aux-sept-cornes',
  ],
  // Étage 5 — le bestiaire réuni : trois mythiques, toutes les réponses.
  'bestiaire-oublie': [
    'rodeur-des-fosses', 'rodeur-des-fosses',
    'chauve-souris-du-seuil', 'chauve-souris-du-seuil',
    'chacal-sans-maitre',
    'encre-du-registre', 'encre-du-registre',
    'pilon-du-fossoyeur',
    'buveur-de-nuits', 'buveur-de-nuits',
    'ifrit-d-encre', 'ifrit-d-encre',
    'aiguille-du-sabbat', 'aiguille-du-sabbat',
    'soif-du-sabbat', 'soif-du-sabbat',
    'mange-souvenirs', 'mange-souvenirs',
    'noye-du-puits', 'noye-du-puits',
    'goule-affamee', 'goule-affamee',
    'bou-jeloud', 'bou-jeloud',
    'colosse-des-charognes', 'colosse-des-charognes',
    'reveil-de-la-horde',
    'aicha-kandicha',
    'teryel-aux-sept-cornes',
    'comte-des-mille-dents',
  ],
  // Étage 6 — le Roi sans nom : les quatre mythiques, et le registre effacé.
  'le-roi-sans-nom': [
    'rodeur-des-fosses', 'rodeur-des-fosses',
    'chauve-souris-du-seuil', 'chauve-souris-du-seuil',
    'chacal-sans-maitre',
    'encre-du-registre', 'encre-du-registre',
    'pilon-du-fossoyeur',
    'buveur-de-nuits', 'buveur-de-nuits',
    'ifrit-d-encre', 'ifrit-d-encre',
    'aiguille-du-sabbat',
    'soif-du-sabbat', 'soif-du-sabbat',
    'noye-du-puits', 'noye-du-puits',
    'goule-affamee', 'goule-affamee',
    'bou-jeloud', 'bou-jeloud',
    'colosse-des-charognes', 'colosse-des-charognes',
    'reveil-de-la-horde', 'reveil-de-la-horde',
    'pacte-de-l-oubliee',
    'aicha-kandicha',
    'teryel-aux-sept-cornes',
    'comte-des-mille-dents',
    'l-oublie',
  ],
};

/**
 * La tour — six étages, du plus doux au presque impossible.
 *
 * - `puissance` suit l'échelle du Sablier renversé (8 → 14) et la dépasse : 16
 *   au sommet. Elle n'influe pas sur les PV — ce sont les `atouts` qui pèsent.
 * - `atouts` est le pacte de l'étage, lu par `rpgNouveauDuel` : PV de départ,
 *   sources de mana offertes, cartes de départ supplémentaires et bouclier
 *   initial. Tout est affiché sur la fiche d'étage — aucune triche cachée.
 * - `recompense` remplace le barème global pour cet étage : la première
 *   victoire contre L'Oublié paie 1 500 crédits, le rejeu 80.
 */
export const RPG_TOUR_OUBLIEE = {
  id: 'tour-oubliee',
  nom: 'La Tour Oubliée',
  miniature: 'tour-oubliee.jpg',
  resume: 'La Chambre a effacé cette tour du registre — son nom, ses gardiens, ses cartes. Six étages de morts sans sépulture : la Horde, la Cour de sang, les Cauchemars, puis Celui dont on ne dit plus le nom. Personne ne collectionne ces cartes : elles ne veulent être jouées que contre vous.',
  // La tour ne s'ouvre qu'à qui a renversé le Sablier : ses sept maîtres
  // doivent être vaincus (voir `etageEstDebloque` dans `rpgStory.js`).
  deblocage: { tour: 'tour-du-sablier-renverse' },
  // Le butin de la tour, versé une seule fois quand les six étages sont conquis.
  butin: 600,
  etages: [
    {
      id: 'oubliee-1',
      nom: 'Le Fossoyeur sans nom',
      fonction: 'Celui qui enterre ce qu’on oublie',
      deck: 'horde-des-fosses',
      avatar: null,
      puissance: 4,
      ia: { niveau: 'normale', style: 'prudent' },
      atouts: null,
      recompense: { premiere: 60, rejoue: 10 },
      note: 'La Horde à l’état pur : des communes et des inhabituelles, aucune figure. Étage d’entrée — on y apprend que ces morts reviennent en nombre.',
    },
    {
      id: 'oubliee-2',
      nom: 'La Dame aux crocs',
      fonction: 'Maîtresse de la Cour de sang',
      deck: 'cour-de-sang',
      avatar: 'dame-aux-crocs-longs',
      puissance: 5,
      ia: { niveau: 'normale', style: 'agressif' },
      atouts: { main: 1 },
      recompense: { premiere: 70, rejoue: 10 },
      note: 'Le vol de vie commence à punir chaque échange manqué. Elle arrive avec une carte de plus en main : le premier contact se paie.',
    },
    {
      id: 'oubliee-3',
      nom: 'Bou Jeloud',
      fonction: 'Le père des peaux',
      deck: 'cauchemars-du-gourara',
      avatar: 'bou-jeloud',
      puissance: 7,
      ia: { niveau: 'veilleur', style: 'agressif' },
      atouts: null,
      recompense: { premiere: 90, rejoue: 15 },
      note: 'Les rares entrent. Bou Jeloud donne +1/+0 à toute la meute : laisser une créature en vie un tour de trop coûte la table. L’IA passe en Veilleur.',
    },
    {
      id: 'oubliee-4',
      nom: 'Aïcha Kandicha',
      fonction: 'Celle aux pattes de chameau',
      deck: 'cauchemars-du-registre',
      avatar: 'aicha-kandicha',
      puissance: 9,
      ia: { niveau: 'veilleur', style: 'controle' },
      atouts: { mana: 1 },
      recompense: { premiere: 120, rejoue: 20 },
      note: 'Elle ouvre avec un mana d’avance, gèle et empêche les blocages, puis exile ce qui dépasse. Le contrôle est total : il faudra tuer avant de poser.',
    },
    {
      id: 'oubliee-5',
      nom: 'Teryel aux sept cornes',
      fonction: 'L’ogresse des montagnes',
      deck: 'bestiaire-oublie',
      avatar: 'teryel-aux-sept-cornes',
      puissance: 12,
      ia: { niveau: 'sablier', style: 'equilibre' },
      atouts: { pv: 4, mana: 1 },
      recompense: { premiere: 180, rejoue: 30 },
      note: 'Les trois tribus réunies et le meilleur cerveau du jeu. Quatre PV et un mana d’avance : la course est perdue d’avance si vous jouez petit.',
    },
    {
      id: 'oubliee-6',
      nom: 'L’OUBLIÉ',
      fonction: 'Le roi sans nom',
      deck: 'le-roi-sans-nom',
      avatar: 'l-oublie',
      puissance: 16,
      ia: { niveau: 'oubliee', style: 'controle' },
      atouts: { pv: 12, mana: 1, main: 1, bouclier: 6 },
      recompense: { premiere: 1500, rejoue: 80 },
      note: '**boss** — quasi imbattable. 37 PV, un mana d’avance dès le premier tour, une carte de plus en main et un bouclier de 6 à briser avant de le toucher. Ses quatre mythiques effacent la table, exilent et reviennent en lambeaux. On ne le bat pas avec un bon deck : on le bat avec un deck parfait, et souvent au second essai. Prime : **1 500 crédits**, une seule fois.',
    },
  ],
};
