import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PALIERS,
  QUETES,
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
  reclamerCachetDuCycle,
  reclamerQuete,
  secondesAvantMinuit,
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
