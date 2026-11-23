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
      const gel = effet.gel ? (zone ? ' et les gèle' : ' et la gèle') : '';
      const gelProbable = !effet.gel && Number(effet.gelChance) > 0
        ? `, avec ${Math.round(Number(effet.gelChance) * 100)} % de chances de ${zone ? 'les geler' : 'la geler'}`
        : '';
      if (zone) return `Inflige ${montant} ${degats(montant)} à ${zone}${gelProbable}${gel}.`;
      return `Inflige ${montant} ${degats(montant)} à une créature ciblée${gelProbable}${gel}.`;
    }
    case 'bouclier-tour':
      return 'La créature alliée ciblée gagne un bouclier jusqu’à la fin du tour.';
    case 'bouclier':
    case 'bouclier-lumiere':
      return effet.cible === 'creature-amie'
        ? 'Une créature alliée ciblée reçoit un bouclier : le prochain sort ou effet de créature adverse qui l’atteint est bloqué.'
        : 'Vous recevez un bouclier : les prochains dégâts qui vous atteignent sont bloqués.';
    case 'renvoi-main':
      return 'Renvoie une créature ciblée dans la main de son propriétaire.';
    case 'retour-main':
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
      const plancher = Number.isFinite(effet.minimum) ? `, aucune ne tombe sous ${effet.minimum}` : '';
      if (!sujet) return `Elle gagne ${stats}${duree}.`;
      return `${sujet} gagne${sujet.startsWith('Une') ? '' : 'nt'} ${stats}${duree}${plancher}.`;
    }
    case 'debuff': {
      const plancher = Number.isFinite(effet.minimum) ? `, son attaque ne descend pas sous ${effet.minimum}` : '';
      return `La créature ciblée gagne ${signe(effet.atk)}/${signe(effet.def)}${Number(effet.tours) > 0 ? ' jusqu’à la fin du tour' : ''}${plancher}.`;
    }
    case 'pioche':
      return `Piochez ${nombreCartes(montant)}.`;
    case 'pioche-defausse':
      return `Piochez ${Number(effet.pioche) || 0} carte${cartes(Number(effet.pioche) || 0)}, puis défaussez-en ${Number(effet.defausse) || 0}.`;
    case 'transfert':
      return `Le sorcier adverse perd ${montant} PV et vous en gagnez ${montant}.`;
    case 'defausse-adverse':
      return 'L’adversaire défausse une carte.';
    case 'defaussePaquet':
      return `Les ${montant} cartes du dessus du paquet adverse partent au cimetière.`;
    case 'destruction-cible':
      if (Number.isFinite(effet.coutMax)) return `Détruisez une créature ciblée de coût ${effet.coutMax} ou moins.`;
      if (Number.isFinite(effet.coutMin)) return `Détruisez une créature ciblée de coût ${effet.coutMin} ou plus.`;
      return 'Détruisez une créature ciblée.';
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

/** La ligne entière : la fréquence d'abord, puis la règle. C'est ce qu'imprime
 *  l'aperçu au survol, après l'éclair ⚡. */
export function texteActivation(carte) {
  const activation = carte?.activation;
  if (!activation) return null;
  const frequence = activation.uneFoisParTour ? '1/tour — ' : '';
  return `${frequence}${texteEffetActivation(activation.effet)}`;
}
