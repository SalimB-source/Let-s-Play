/**
 * La règle d'un effet activé, écrite dans les mots du sort dont elle vient.
 *
 * Un seul texte pour trois lecteurs : l'aperçu au survol de la fiche (la ligne
 * ⚡ sous la carte), la lecture à voix haute de la carte posée (`aria-label`)
 * et le journal de la partie. Sans cette source unique, chaque lecture
 * recopiait la règle à sa façon — l'`aria-label` annonçait encore « inflige N
 * blessures à une créature au choix » pour un bouclier prêté, un soin de zone
 * ou un renvoi en main.
 *
 * Le module ne dépend que des objets qu'on lui donne (la carte, son effet) :
 * aucune importation du moteur, donc aucun cycle.
 */

import { zoneFormeCarte } from './rpgZoneCartes.js';

/** Les portées de zone, dans les mots de la table. */
const CIBLES_ZONE = Object.freeze({
  'toutes-creatures': 'toutes les créatures',
  'toutes-autres': 'toutes les autres créatures',
  'toutes-alliees': 'vos créatures',
  'creatures-adverses': 'toutes les créatures adverses',
});

const cartes = (nombre) => (nombre > 1 ? 's' : '');

const degats = (nombre) => (nombre > 1 ? 'dégâts' : 'dégât');

/** « une carte », « 2 cartes » : le 1 s'écrit en toutes lettres, comme les
 *  sorts imprimés (Papyrus, Brise-lame). */
function nombreCartes(nombre) {
  return nombre === 1 ? 'une carte' : `${nombre} carte${cartes(nombre)}`;
}

/** Un malus s'écrit tel quel, un gain garde son signe : « -2/+0 », « +0/+3 ». */
function signe(valeur) {
  const n = Number(valeur) || 0;
  return n < 0 ? String(n) : `+${n}`;
}

/** La phrase qui dit ce que fait l'effet, sans la fréquence ni le coût. */
export function texteEffetActivation(effet = {}) {
  const montant = Math.max(0, Number(effet.amount) || 0);
  const zone = CIBLES_ZONE[effet.cible];
  switch (effet.type) {
    case 'degats': {
      if (effet.choixDegats) return `Inflige ${montant} dégâts à une créature adverse ou ${effet.secondAmount ?? 2} dégâts à chacune de deux créatures adverses ciblées.`;
      const gel = effet.gel ? (zone ? ' et les gèle' : ' et la gèle') : '';
      const gelProbable = !effet.gel && Number(effet.gelChance) > 0
        ? `, avec ${Math.round(Number(effet.gelChance) * 100)} % de chances de ${zone ? 'les geler' : 'la geler'}`
        : '';
      if (zone) return `Inflige ${montant} ${degats(montant)} à ${zone}${gelProbable}${gel}.`;
      return `Inflige ${montant} ${degats(montant)} à une créature${effet.adversaireSeulement ? ' adverse' : ''} ciblée${gelProbable}${gel}.`;
    }
    case 'bouclier-tour':
      return 'La créature alliée ciblée gagne un bouclier jusqu’à la fin du tour.';
    case 'bouclier':
    case 'bouclier-lumiere':
      return effet.cible === 'creature-amie'
        ? 'Une créature alliée ciblée reçoit un bouclier : le prochain effet de créature adverse qui l’atteint est bloqué.'
        : 'Vous recevez un bouclier : les prochains dégâts qui vous atteignent sont bloqués.';
    case 'renvoi-main':
      return 'Renvoie une créature ciblée dans la main de son propriétaire.';
    case 'retour-main':
      return `Renvoyez une créature adverse ciblée dans la main de son propriétaire${effet.pioche ? `, puis piochez ${nombreCartes(Number(effet.pioche))}` : ''}.`;
    case 'retour-apres-tours':
    case 'exil-temporaire':
      return 'Renvoyez une créature ciblée dans la main de son propriétaire.';
    case 'soin-tout':
      return `Soigne vos créatures et vous de ${montant} PV.`;
    case 'soin-creatures':
      return effet.cible === 'creature-amie'
        ? `Une créature alliée ciblée récupère ${montant} PV.`
        : `Soigne chacune de vos créatures de ${montant} PV${Number(effet.etJoueur) > 0 ? ` et vous de ${effet.etJoueur}` : ''}.`;
    case 'soin':
      return `Vous récupérez ${montant} point${cartes(montant)} de vie.`;
    case 'buff-allies-tour':
      return `Vos créatures gagnent +${Number(effet.atk) || 0}/+${Number(effet.pv ?? effet.def) || 0}.`;
    case 'buff': {
      // `creatures-adverses` (l'Embuscade) retourne le renfort en maléfice :
      // c'est la table adverse qui maigrit, jamais la vôtre.
      const sujet = effet.cible === 'porteur' ? null
        : effet.cible === 'creature-amie' ? 'Une créature alliée ciblée'
          : effet.cible === 'creatures-adverses' ? 'Les créatures adverses'
            : 'Vos créatures';
      const duree = Number(effet.tours) > 0 ? ' jusqu’à la fin du tour' : '';
      const stats = `${signe(effet.atk)}/${signe(effet.def)}`;
      if (effet.caleOccupeeSeulement) return `Vos créatures dont la cale est occupée gagnent ${stats} et Overkill${duree}.`;
      const motsCles = `${effet.coupCritique ? ` et Coup critique (${Math.round(effet.coupCritique * 100)} %)` : ''}${effet.tribut ? ` et Tribut ${effet.tribut}` : ''}${effet.overkill ? ' et Overkill' : ''}`;
      const plancher = Number.isFinite(effet.minimum) ? `, aucune ne tombe sous ${effet.minimum}` : '';
      if (!sujet) return `Elle gagne ${stats}${duree}.`;
      return `${sujet} gagne${sujet.startsWith('Une') ? '' : 'nt'} ${stats}${motsCles}${duree}${plancher}.`;
    }
    case 'debuff': {
      const plancher = Number.isFinite(effet.minimum) ? `, son attaque ne descend pas sous ${effet.minimum}` : '';
      const duree = effet.jusquaFinTourAdverse
        ? ' jusqu’à la fin du tour de l’adversaire'
        : (Number(effet.tours) > 0 ? ' jusqu’à la fin du tour' : '');
      return `La créature ciblée gagne ${signe(effet.atk)}/${signe(effet.def)}${duree}${plancher}${effet.exilEnMourant ? ' ; si sa défense tombe sous 1, elle est exilée' : ''}.`;
    }
    case 'exil-cimetiere-adverse':
      return 'Exile une créature au hasard du cimetière adverse.';
    case 'combat-cible':
      return 'Affronte une créature adverse ciblée.';
    case 'pioche':
      return `Piochez ${nombreCartes(montant)}.`;
    case 'pioche-defausse':
      return `Piochez ${Number(effet.pioche) || 0} carte${cartes(Number(effet.pioche) || 0)}, puis défaussez-en ${Number(effet.defausse) || 0}.`;
    case 'transfert':
      return `Le sorcier adverse perd ${montant} PV et vous en gagnez ${montant}${effet.pioche ? `, puis piochez ${nombreCartes(Number(effet.pioche))}` : ''}.`;
    case 'defausse-adverse':
      return 'L’adversaire défausse une carte.';
    case 'defaussePaquet':
      return `Les ${montant} cartes du dessus du paquet adverse partent au cimetière.`;
    case 'renfort-ascension':
      if (effet.zone === 'deck') return 'Invoquez spécialement le premier Élémental Sable de coût 4 depuis le dessus de votre pioche.';
      return 'Invoquez spécialement depuis votre main jusqu’à deux Djinns Braise : le premier de coût 1, puis le premier de coût 3.';
    case 'renfort-choisi':
      if (effet.dessus) return 'Parmi les trois cartes du dessus du deck, invoquez spécialement une créature Eau de coût 3 ou moins choisie ; placez les autres dessous, dans l’ordre.';
      if (effet.ephemere) return 'Invoquez spécialement une créature Braise de coût 3 choisie dans votre main ; détruisez-la à la fin du tour.';
      return 'Invoquez spécialement une créature de coût 5 choisie dans votre main.';
    case 'reanimation':
      if (effet.typeImprime === 'Djinn') return `Invoquez spécialement un Djinn de coût ${effet.coutMax} ou moins choisi dans votre cimetière.`;
      return effet.sansAscension ? 'Réanimez une créature Ténèbres non-Ascension de coût 3 ou moins choisie dans votre cimetière.' : 'Réanimez une créature choisie dans votre cimetière.';
    case 'destruction-totale':
      return 'Détruisez toutes les créatures des deux camps.';
    case 'prochaine-arrivee-abordage':
      return 'La prochaine créature jouée ce tour gagne Abordage au seuil de son coût moins un. Piochez une carte.';
    case 'destruction-cible':
      if (Number.isFinite(effet.coutMax)) return `Détruisez une créature ciblée de coût ${effet.coutMax} ou moins.`;
      if (Number.isFinite(effet.coutMin)) return `Détruisez une créature ciblée de coût ${effet.coutMin} ou plus.`;
      return 'Détruisez une créature ciblée.';
    case 'combat':
      return effet.sourceCible === 'creature-amie' ? 'Une créature alliée choisie se bat avec une créature adverse choisie : chacune subit des dégâts égaux à l’attaque de l’autre.' : 'Cette créature se bat contre une créature adverse ciblée : chacune inflige à l’autre des dégâts égaux à son attaque.';
    case 'equiper-cimetiere':
      return 'Équipez une créature alliée ciblée avec une arme choisie dans votre cimetière.';
    case 'destruction-arme':
      return `Détruisez une arme équipée à une créature ciblée${Number(effet.pioche) > 0 ? `, puis piochez ${nombreCartes(Number(effet.pioche))}` : ''}.`;
    case 'exil':
      return Number.isFinite(effet.coutMax)
        ? `Exilez une créature ciblée de coût ${effet.coutMax} ou moins.`
        : 'Exilez une créature ciblée.';
    case 'brouillard':
      return 'Aucune créature ne peut infliger de dégâts de combat ce tour.';
    default:
      return 'Active son effet.';
  }
}

/** La ligne entière : le nom, le prix éventuel, puis la règle. */
export function texteActivation(carte) {
  const activation = carte?.activation;
  if (!activation) return null;
  const nom = `${activation.nom ?? 'Effet activé'} — `;
  const prix = activation.prixPv > 0 ? `Payez ${activation.prixPv} PV : ` : '';
  const forme = zoneFormeCarte(activation.zoneCarteId ?? activation.sortAssocie);
  const effet = activation.effet;
  if (effet?.type === 'contresort') {
    const quoi = effet.cible === 'creature' ? 'une créature adverse annoncée' : effet.cible === 'sort' ? 'un sort adverse annoncé' : effet.cible === 'effet-creature' ? 'un effet d’arrivée, de mort ou activé adverse annoncé' : 'une carte adverse annoncée';
    const bonus = effet.pioche > 0 ? `, puis piochez ${effet.pioche} carte${effet.pioche > 1 ? 's' : ''}` : '';
    return `Effet-réponse (${activation.nom}) — Contrez ${quoi}${bonus}. Activez en réponse : la créature s’engage (1 fois par présence, pas à son arrivée ni après avoir attaqué).`;
  }
  if (forme && effet?.type === 'retour-main' && effet.exclutType === 'Vampire') {
    return `${nom}${prix}Dans une rangée choisie, renvoyez les créatures sauf les Vampires dans la main de leur propriétaire.`;
  }
  if (forme && effet?.type === 'destruction-coutmax' && effet.gel) {
    return `${nom}${prix}Dans un carré, détruisez les créatures de coût ${effet.coutMax} ou moins, puis gelez les survivantes de ce carré.`;
  }
  if (forme && effet?.type === 'buff' && effet.cible === 'creatures-adverses') {
    return `${nom}${prix}Dans un carré adverse, les créatures gagnent ${signe(effet.atk)}/${signe(effet.def)} jusqu’à la fin du tour, sans descendre sous ${effet.minimum}/1.`;
  }
  if (forme && effet?.type === 'degats') {
    const zone = forme === 'rangee' ? 'une rangée' : forme === 'colonne' ? 'une colonne' : 'un carré';
    const cibles = effet.cible === 'toutes-autres' || effet.inclutAllies ? 'à toutes les créatures' : 'aux créatures adverses';
    const gel = effet.gel ? ' et les gèle' : effet.gelChance ? `, avec ${Math.round(effet.gelChance * 100)} % de chances de geler chacune` : '';
    const echo = effet.echo ? ` ; ${effet.echo.amount} dégât supplémentaire aux créatures adverses au début de votre prochain tour` : '';
    return `${nom}${prix}Inflige ${effet.amount} ${degats(effet.amount)} ${cibles} dans ${zone}${gel}${effet.etSorcier ? ` et ${effet.etSorcier} dégât au sorcier adverse` : ''}${echo}.`;
  }
  return `${nom}${prix}${texteEffetActivation(effet)}`;
}
