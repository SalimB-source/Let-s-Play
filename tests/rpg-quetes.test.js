import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JOURS_DE_LA_SERIE,
  PALIERS,
  QUETES,
  cachetDeLaSemaineDisponible,
  cachetDisponible,
  chargerGraine,
  cleJour,
  etatQuetesVide,
  fusionnerQuetes,
  jourCourant,
  jourPrecedent,
  normaliserEtatQuetes,
  ouvrirJournee,
  progresserQuete,
  queteParId,
  quetesAReclamer,
  quetesDisponibles,
  quetesDuJour,
  joursAvantLeCachetDeLaSemaine,
  reclamerCachetDeLaSemaine,
  reclamerCachetDuCycle,
  reclamerQuete,
  secondesAvantMinuit,
  serieComplete,
  vueDeLaQuete,
} from '../src/games/rpgQuetes.js';
import { GAINS } from '../src/games/rpgCredits.js';

const progression = (...etages) => ({ etagesVaincus: [...etages] });
const JOUR = '2026-10-14';

/** Un état de journée prêt : trois quêtes choisies à la main, rien d'accompli. */
function etatDuJour(quetes, progres = {}, reste = {}) {
  return {
    version: 1,
    jour: JOUR,
    quetes,
    progres: Object.fromEntries(quetes.map((id) => [id, progres[id] ?? 0])),
    reclamations: [],
    cachet: false,
    serie: 1,
    majLe: null,
    ...reste,
  };
}

// ── Le jour ──────────────────────────────────────────────────────────────────

test('la clé de jour suit le calendrier local, la veille se calcule sans piège', () => {
  assert.equal(cleJour(new Date(2026, 9, 14, 23, 59).getTime()), '2026-10-14');
  assert.equal(cleJour(new Date(2026, 0, 1, 0, 0).getTime()), '2026-01-01');
  assert.equal(jourPrecedent('2026-03-01'), '2026-02-28');
  assert.equal(jourPrecedent('2026-01-01'), '2025-12-31');
  assert.equal(jourPrecedent('2024-03-01'), '2024-02-29', 'les années bissextiles comptent');
  assert.equal(jourPrecedent('pas-une-date'), null);
});

test('le jour ne recule jamais, même si l’horloge de l’appareil recule', () => {
  const horloge = new Date(2026, 9, 14, 10, 0).getTime();
  const veille = new Date(2026, 9, 13, 10, 0).getTime();
  assert.equal(jourCourant(horloge, null), '2026-10-14');
  assert.equal(jourCourant(horloge, '2026-10-14'), '2026-10-14');
  assert.equal(jourCourant(veille, '2026-10-14'), '2026-10-14', 'l’horloge recule, le jour non');
  assert.equal(jourCourant(horloge, '2026-10-12'), '2026-10-14');
});

test('le compte à rebours du cycle se compte jusqu’à minuit', () => {
  assert.equal(secondesAvantMinuit(new Date(2026, 9, 14, 23, 0, 0).getTime()), 3600);
  assert.equal(secondesAvantMinuit(new Date(2026, 9, 14, 0, 0, 1).getTime()), 86399);
});

// ── Le tirage du jour ────────────────────────────────────────────────────────

test('le pool couvre les trois paliers, et chaque palier a de quoi tirer', () => {
  for (const palier of PALIERS) {
    const duPalier = QUETES.filter((quete) => quete.palier === palier);
    assert.ok(duPalier.length >= 3, `le palier ${palier} a au moins trois quêtes`);
  }
  assert.equal(new Set(QUETES.map((quete) => quete.id)).size, QUETES.length, 'aucun identifiant en double');
  for (const quete of QUETES) {
    assert.ok(quete.objectif > 0, `${quete.id} a un objectif`);
    assert.ok(quete.recompense > 0, `${quete.id} paie`);
    assert.ok(quete.ecoute?.type, `${quete.id} écoute un événement`);
  }
});

test('les quêtes du jour sont les mêmes pour un même couple (jour, graine)', () => {
  const premier = quetesDuJour(JOUR, 'appareil-abc');
  assert.deepEqual(quetesDuJour(JOUR, 'appareil-abc'), premier);
  assert.equal(premier.length, 3);
  const paliers = premier.map((id) => queteParId(id).palier);
  assert.deepEqual(paliers, PALIERS, 'une quête par palier, dans l’ordre');
  assert.notDeepEqual(quetesDuJour('2026-10-15', 'appareil-abc'), premier, 'le lendemain ne ressert pas la même journée');
  assert.notDeepEqual(quetesDuJour(JOUR, 'appareil-xyz'), premier, 'deux joueurs ne tirent pas la même journée');
  const journees = new Set(Array.from({ length: 60 }, (_, index) => quetesDuJour(`2026-11-${String((index % 28) + 1).padStart(2, '0')}`, 'appareil-abc').join(',')));
  assert.ok(journees.size > 20, `le tirage varie (${journees.size} journées distinctes sur 28)`);
});

test('la quête du comptoir n’est tirée que si un rayon du Souk est ouvert', () => {
  assert.equal(quetesDisponibles(progression()).some((quete) => quete.id === 'booster-1'), false);
  assert.equal(quetesDisponibles(progression('listes-1')).some((quete) => quete.id === 'booster-1'), true);
  const jours = Array.from({ length: 400 }, (_, index) => `2026-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`);
  assert.equal(jours.some((jour) => quetesDuJour(jour, 'g', progression()).includes('booster-1')), false, 'jamais avant la première victoire');
  assert.equal(jours.some((jour) => quetesDuJour(jour, 'g', progression('listes-1')).includes('booster-1')), true, 'un jour sur les autres après');
});

// ── La journée : ouverture, série, progression ────────────────────────────────

test('ouvrir une journée tire les quêtes, remet la progression à zéro et suit la série', () => {
  const vide = etatQuetesVide();
  const premier = ouvrirJournee({ etat: vide, jour: JOUR, graine: 'g', progression: progression() });
  assert.equal(premier.nouveau, true);
  assert.equal(premier.etat.jour, JOUR);
  assert.equal(premier.etat.quetes.length, 3);
  assert.equal(premier.etat.serie, 1);
  assert.deepEqual(premier.etat.progres, Object.fromEntries(premier.etat.quetes.map((id) => [id, 0])));

  const meme = ouvrirJournee({ etat: premier.etat, jour: JOUR, graine: 'g', progression: progression() });
  assert.equal(meme.nouveau, false);
  assert.deepEqual(meme.etat, premier.etat, 'le même jour ne retouche rien');

  const suite = ouvrirJournee({ etat: premier.etat, jour: '2026-10-15', graine: 'g', progression: progression() });
  assert.equal(suite.nouveau, true);
  assert.equal(suite.etat.serie, 2, 'deux jours de suite : la série continue');

  const trou = ouvrirJournee({ etat: suite.etat, jour: '2026-10-18', graine: 'g', progression: progression() });
  assert.equal(trou.etat.serie, 1, 'un jour manqué repart la série à un');

  const recule = ouvrirJournee({ etat: trou.etat, jour: '2026-10-10', graine: 'g', progression: progression() });
  assert.equal(recule.nouveau, false);
  assert.equal(recule.etat.jour, '2026-10-18', 'un jour antérieur est ignoré');
});

test('la progression d’une quête se plafonne, ne compte pas deux fois et respecte la couleur', () => {
  const etat = etatDuJour(['terrains-12', 'cartes-sable-8', 'degats-40']);
  let suite = progresserQuete(etat, { type: 'terrain-pose' });
  assert.equal(suite.progres['terrains-12'], 1);
  suite = progresserQuete(suite, { type: 'terrain-pose' });
  assert.equal(suite.progres['terrains-12'], 2);
  assert.equal(progresserQuete(suite, { type: 'evenement-inconnu' }), suite, 'un événement inconnu ne touche à rien');

  suite = progresserQuete(suite, { type: 'carte-jouee', couleurs: ['braise'] });
  assert.equal(suite.progres['cartes-sable-8'], 0, 'une carte de Braise ne fait pas une quête de Sable');
  suite = progresserQuete(suite, { type: 'carte-jouee', couleurs: ['sable'] });
  assert.equal(suite.progres['cartes-sable-8'], 1);

  suite = progresserQuete(suite, { type: 'degats-infliges', montant: 25 });
  assert.equal(suite.progres['degats-40'], 25, 'les dégâts comptent leur montant');
  suite = progresserQuete(suite, { type: 'degats-infliges', montant: 25 });
  assert.equal(suite.progres['degats-40'], 40, 'l’objectif est un plafond');

  for (let index = 0; index < 20; index += 1) suite = progresserQuete(suite, { type: 'terrain-pose' });
  assert.equal(suite.progres['terrains-12'], 12);
});

test('une quête réclamée ne progresse plus', () => {
  const etat = etatDuJour(['terrains-12'], { 'terrains-12': 12 });
  const prise = reclamerQuete(etat, 'terrains-12');
  assert.equal(prise.ok, true);
  assert.equal(progresserQuete(prise.etat, { type: 'terrain-pose' }), prise.etat);
});

// ── La réclamation ───────────────────────────────────────────────────────────

test('réclamer demande une quête connue, terminée, et ne paie qu’une fois', () => {
  const etat = etatDuJour(['terrains-12']);
  assert.equal(reclamerQuete(etat, 'terrains-12').raison, 'objectif-incomplet');
  assert.equal(reclamerQuete(etat, 'duels-2').raison, 'quete-inconnue');
  const fini = etatDuJour(['terrains-12'], { 'terrains-12': 12 });
  const prise = reclamerQuete(fini, 'terrains-12');
  assert.equal(prise.ok, true);
  assert.equal(prise.credits, queteParId('terrains-12').recompense);
  assert.deepEqual(prise.etat.reclamations, ['terrains-12']);
  assert.equal(reclamerQuete(prise.etat, 'terrains-12').raison, 'deja-reclamee');
  assert.equal(queteParId('duels-2').recompense, 70);
});

test('la pastille compte les quêtes à réclamer, et le Cachet attend les trois', () => {
  const jour = ['terrains-12', 'duels-2', 'etage-1'];
  let etat = etatDuJour(jour);
  assert.deepEqual(quetesAReclamer(etat), []);
  assert.equal(cachetDisponible(etat), false);
  assert.equal(reclamerCachetDuCycle(etat).raison, 'cycle-incomplet');

  etat = etatDuJour(jour, { 'terrains-12': 12, 'duels-2': 2, 'etage-1': 1 });
  assert.deepEqual(quetesAReclamer(etat).sort(), [...jour].sort());
  for (const id of jour) etat = reclamerQuete(etat, id).etat;
  assert.deepEqual(quetesAReclamer(etat), []);
  assert.equal(cachetDisponible(etat), true);

  const cachet = reclamerCachetDuCycle(etat);
  assert.equal(cachet.ok, true);
  assert.equal(cachet.credits, GAINS.cachetDuCycle);
  assert.equal(reclamerCachetDuCycle(cachet.etat).raison, 'deja-reclame');
});

// ── La normalisation et la fusion ────────────────────────────────────────────

test('un état de quêtes corrompu se relit proprement', () => {
  const lu = normaliserEtatQuetes({ jour: 'hier', quetes: ['terrains-12', 'inconnue', 'terrains-12'], progres: { 'terrains-12': 999 }, reclamations: ['inconnue', 'terrains-12'], serie: -5 });
  assert.equal(lu.jour, null);
  assert.deepEqual(lu.quetes, ['terrains-12']);
  assert.equal(lu.progres['terrains-12'], 12, 'la progression est plafonnée à l’objectif');
  assert.deepEqual(lu.reclamations, ['terrains-12']);
  assert.equal(lu.serie, 0);
  assert.deepEqual(normaliserEtatQuetes(null), etatQuetesVide());
});

test('la fusion garde le jour le plus récent et ne paie jamais deux fois', () => {
  const ici = etatDuJour(['terrains-12', 'duels-2'], { 'terrains-12': 5, 'duels-2': 2 }, { serie: 3, majLe: '2026-10-14T10:00:00.000Z' });
  const la = etatDuJour(['terrains-12', 'duels-2'], { 'terrains-12': 9, 'duels-2': 0 }, { reclamations: ['duels-2'], cachet: false, serie: 5, majLe: '2026-10-14T11:00:00.000Z' });
  const meme = fusionnerQuetes(ici, la);
  assert.equal(meme.etat.jour, JOUR);
  assert.equal(meme.etat.progres['terrains-12'], 9, 'la progression la plus avancée');
  assert.equal(meme.etat.progres['duels-2'], 2);
  assert.deepEqual(meme.etat.reclamations, ['duels-2']);
  assert.equal(meme.etat.serie, 5);
  assert.equal(meme.modifie, true);

  const hier = { ...etatDuJour(['terrains-12']), jour: '2026-10-13', serie: 2 };
  const aujourdhui = { ...etatDuJour(['duels-2'], { 'duels-2': 1 }), jour: JOUR, serie: 4 };
  const melange = fusionnerQuetes(hier, aujourdhui);
  assert.equal(melange.etat.jour, JOUR);
  assert.deepEqual(melange.etat.quetes, ['duels-2'], 'les quêtes du jour le plus récent');
  assert.equal(fusionnerQuetes(aujourdhui, aujourdhui).modifie, false);
});

// ── La graine de l'appareil ──────────────────────────────────────────────────

test('la graine de l’appareil est créée une fois et se relit', () => {
  const donnees = new Map();
  const precedent = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (cle) => donnees.get(cle) ?? null,
      setItem: (cle, valeur) => donnees.set(cle, valeur),
      removeItem: (cle) => donnees.delete(cle),
    },
  });
  try {
    const premiere = chargerGraine();
    assert.ok(premiere.startsWith('appareil-'));
    assert.equal(chargerGraine(), premiere, 'la même graine à chaque visite');
  } finally {
    if (precedent) Object.defineProperty(globalThis, 'localStorage', precedent);
    else delete globalThis.localStorage;
  }
  assert.equal(chargerGraine(), 'sans-compte', 'hors stockage, les quêtes restent jouables');
});

// ── Le Cachet de la semaine (lot 5) ─────────────────────────────────────────

test('la série ne se complète qu’au septième jour, et jamais deux fois', () => {
  let etat = etatQuetesVide();
  const payees = [];
  // Quinze jours d'affilée, jour après jour : c'est la seule façon honnête de
  // vérifier une série — la forcer à la main ne prouverait que l'arithmétique.
  for (let index = 1; index <= 15; index += 1) {
    const jour = cleJour(new Date(2026, 2, index).getTime());
    etat = ouvrirJournee({ etat, jour, graine: 'graine-de-serie' }).etat;
    assert.equal(etat.serie, index, `jour ${index} : la série suit`);
    if (!cachetDeLaSemaineDisponible(etat)) continue;
    payees.push(index);
    const paie = reclamerCachetDeLaSemaine({ etat });
    assert.equal(paie.ok, true, `jour ${index} : sept jours d’affilée paient`);
    assert.equal(paie.credits, GAINS.cachetDeLaSemaine);
    etat = paie.etat;
    assert.equal(reclamerCachetDeLaSemaine({ etat }).raison, 'deja-reclame', 'et une seule fois');
  }
  assert.deepEqual(payees, [7, 14], 'la semaine paie au septième et au quatorzième jour, pas entre');

  const six = { ...etatQuetesVide(), jour: '2026-03-06', serie: 6 };
  assert.equal(serieComplete(six), false, 'six jours, rien à réclamer');
  assert.equal(cachetDeLaSemaineDisponible(six), false);
  assert.equal(joursAvantLeCachetDeLaSemaine(six), 1, 'il en reste un à tenir');
  assert.equal(joursAvantLeCachetDeLaSemaine({ ...six, serie: 7 }), JOURS_DE_LA_SERIE,
    'le compte repart au jour suivant');
});

test('une série incomplète ne paie rien, même en trichant sur la série', () => {
  const quatre = { ...etatQuetesVide(), jour: '2026-03-04', serie: 4 };
  assert.equal(reclamerCachetDeLaSemaine({ etat: quatre }).ok, false);
  assert.equal(reclamerCachetDeLaSemaine({ etat: quatre }).raison, 'serie-incomplete');
  assert.equal(reclamerCachetDeLaSemaine({ etat: quatre, serie: 4 }).credits, 0,
    'un état de quatre jours ne se réclame pas en annonçant sept');
  // La série visée fait foi quand l'état est en retard : le garde de jour l'a
  // comptée avant que l'état ne soit écrit.
  const retard = reclamerCachetDeLaSemaine({ etat: quatre, serie: 7 });
  assert.equal(retard.ok, true, 'un état écrit avant la réouverture du jour se rattrape');
  assert.equal(retard.etat.serie, 7, 'et la série annoncée est écrite au passage');
  assert.equal(reclamerCachetDeLaSemaine({}).ok, false, 'sans état, rien à réclamer');
});

test('le jour nouveau reprend le Cachet de la semaine, la série continue', () => {
  const sept = { ...etatQuetesVide(), jour: '2026-03-07', serie: 7, semaine: true };
  const lendemain = ouvrirJournee({ etat: sept, jour: '2026-03-08', graine: 'graine' });
  assert.equal(lendemain.nouveau, true);
  assert.equal(lendemain.etat.semaine, false, 'la nouvelle journée rouvre le Cachet de la semaine');
  assert.equal(lendemain.etat.serie, 8, 'et la série, elle, continue');
  // Le champ se lit comme le Cachet du cycle : ce qui est franc compte.
  assert.equal(normaliserEtatQuetes({ ...sept, semaine: 1 }).semaine, true);
  assert.equal(normaliserEtatQuetes({ ...sept, semaine: 0 }).semaine, false);
  assert.equal(normaliserEtatQuetes({ ...sept, semaine: undefined }).semaine, false);
  assert.equal(fusionnerQuetes(sept, { ...sept, semaine: false }).etat.semaine, true,
    'la fusion garde la semaine réclamée dès qu’un appareil la porte');
  assert.equal(fusionnerQuetes({ ...sept, jour: '2026-03-01', semaine: false }, sept).etat.semaine, true,
    'et le jour le plus récent décide du reste');
});

test('la vue d’une quête est la même pour tous les écrans', () => {
  const jour = cleJour(new Date(2026, 5, 10));
  const graine = 'vue-partagee';
  const etat = ouvrirJournee({ etat: etatQuetesVide(), jour, graine, progression: null });
  const premiere = etat.quetes[0];

  // Avant de jouer : en cours, zéro, rien à réclamer.
  const vide = vueDeLaQuete(etat, premiere);
  assert.equal(vide.etat, 'encours', 'la quête commence en cours');
  assert.equal(vide.progres, 0);
  assert.equal(vide.reste, vide.quete.objectif, 'il reste tout à faire');
  assert.equal(vide.pourcent, 0, 'la barre est vide');
  assert.equal(vide.terminee, false);
  assert.equal(vide.reclamee, false);

  // Une quête inconnue n'a pas de vue du tout — les écrans n'inventent rien.
  assert.equal(vueDeLaQuete(etat, 'quete-qui-nexiste-pas'), null);

  // Une progression au-delà de l'objectif est bornée, comme partout ailleurs.
  const plein = vueDeLaQuete({ ...etat, progres: { [premiere]: 99 } }, premiere);
  assert.equal(plein.progres, plein.quete.objectif, 'la progression plafonne à l’objectif');
  assert.equal(plein.pourcent, 100, 'la barre est pleine');
  assert.equal(plein.reste, 0);
  assert.equal(plein.etat, 'terminee', 'et la quête se dit terminée, pas encore réclamée');

  // Réclamée : le mot change, le montant ne bouge plus.
  const prise = reclamerQuete({ ...etat, progres: { [premiere]: 99 } }, premiere);
  assert.equal(prise.ok, true, 'la quête pleine se réclame');
  const vuePrise = vueDeLaQuete(prise.etat, premiere);
  assert.equal(vuePrise.etat, 'reclamee');
  assert.equal(vuePrise.terminee, true, 'une quête réclamée reste terminée');

  // Des compteurs illisibles valent zéro, jamais NaN à l'écran.
  for (const cassé of [undefined, null, 'beaucoup', -5, NaN]) {
    const vue = vueDeLaQuete({ ...etat, progres: { [premiere]: cassé } }, premiere);
    assert.equal(vue.progres, 0, `${String(cassé)} se lit comme zéro`);
    assert.equal(vue.etat, 'encours');
  }
});
