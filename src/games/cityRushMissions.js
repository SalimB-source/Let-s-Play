// Missions Vice City Rush : une campagne séquentielle, distincte de l'Histoire
// et des courses libres. Chaque fiche porte le briefing, l'objectif vérifiable
// à l'arrivée et les règles propres transmises au monde 3D.

export const CITY_RUSH_MISSIONS = Object.freeze([
  Object.freeze({
    id: 'dealer-pursuit',
    number: '01',
    icon: '🚨',
    name: 'Opération filet rouge',
    subtitle: 'INTERCEPTION · OCEAN DRIVE',
    cityId: 'vice-city',
    laps: 3,
    briefing: 'Tu incarnes un officier de police de Vice City. Un dealer vient de forcer un barrage et fonce vers la sortie : prends le volant de ton intercepteur, reste dans sa voie, récupère les chargeurs rouges et neutralise sa compacte préparée, un peu plus rapide que ton intercepteur. Quinze tirs suffisent à percer sa coque.',
    objective: 'Ramasse au moins un chargeur rouge, neutralise le dealer et termine les 3 tours.',
    shortObjective: 'CHARGEURS ROUGES · DEALER IMMOBILISÉ · 3 TOURS',
    checklist: Object.freeze([
      'Récupère les chargeurs rouges d’AK-47 qui apparaissent sur ta voie.',
      'Le dealer démarre dans ta voie : garde-le dans ta mire et maintiens le bouton de tir ou Z.',
      'Tire dans sa coque vulnérable : quinze impacts la neutralisent. Termine ensuite les 3 tours.',
    ]),
    successText: 'Le dealer est immobilisé et la ligne d’arrivée est franchie. L’interception est validée.',
    failureText: 'Le dealer doit être neutralisé avant que tu franchisses la ligne.',
    targetId: 'dealer',
    targetHealth: 15,
    requiredPistolPickups: 1,
    rules: Object.freeze({
      weaponsEnabled: true,
      policeEnabled: false,
      policeTrafficEnabled: false,
      bazookaEnabled: false,
      policePlayerLook: true,
      playerRole: 'police',
      playerCarId: 'city-hatch',
      missionTargetId: 'dealer',
      missionTargetStartDistance: 34,
      rivalCarIds: Object.freeze({ dealer: 'nova-18-gt' }),
      rivalPace: Object.freeze({ dealer: 0.92 }),
      rivalHealth: Object.freeze({ dealer: 15 }),
      pistolPickupRowInterval: 12,
    }),
    evaluate(result) {
      const dealer = Array.isArray(result?.racers)
        ? result.racers.find((racer) => racer?.id === 'dealer')
        : null;
      return Number.isFinite(Number(dealer?.health))
        && Number(dealer.health) <= 0
        && Number(result?.pistolPickups) >= 1;
    },
  }),
  Object.freeze({
    id: 'clean-laps',
    number: '02',
    icon: '🛣️',
    name: 'Le tour propre',
    subtitle: 'PRÉCISION · LITTLE HAVANA',
    cityId: 'vice-city',
    laps: 3,
    briefing: 'Les rues sont encombrées, mais aucune patrouille ne sera sur le parcours. Prouve que tu sais lire la circulation : trois tours, aucune carrosserie touchée. Les voitures civiles roulent dans le même sens et arrivent aussi à contresens.',
    objective: 'Finis 3 tours sans toucher une seule voiture sur la route. Aucune police.',
    shortObjective: 'ZÉRO CONTACT · AUCUNE POLICE · 3 TOURS',
    checklist: Object.freeze([
      'Évite le trafic civil et les voitures qui arrivent en face.',
      'Un seul contact avec une voiture invalide la mission.',
      'Termine les 3 tours ; les patrouilles de police sont désactivées.',
    ]),
    successText: 'Trois tours impeccables : aucune voiture touchée, aucune patrouille en piste.',
    failureText: 'Une voiture a été touchée. Garde tes distances et termine les trois tours sans contact.',
    rules: Object.freeze({
      weaponsEnabled: false,
      policeEnabled: false,
      policeTrafficEnabled: false,
      bazookaEnabled: false,
    }),
    evaluate(result) {
      return Number.isFinite(Number(result?.vehicleContacts)) && Number(result.vehicleContacts) === 0;
    },
  }),
  Object.freeze({
    id: 'six-police-cars',
    number: '03',
    icon: '🚓',
    name: 'Six sirènes',
    subtitle: 'AFFRONTEMENT · VICE CITY',
    cityId: 'vice-city',
    laps: 3,
    policeFromStart: true,
    briefing: 'Trois voitures de police te prennent en chasse dès le départ. D’autres renforts arrivent quand une patrouille est détruite. Ramasse les chargeurs rouges — et les caisses jaunes de roquettes si tu les croises — pour faire tomber six voitures avant de terminer la course.',
    objective: 'Détruis au moins 6 voitures de police et termine les 3 tours.',
    shortObjective: '6 POLICES DÉTRUITES · 3 TOURS',
    checklist: Object.freeze([
      'La poursuite commence dès le feu vert.',
      'Ramasse les chargeurs rouges ; les roquettes jaunes détruisent toute la police dans leur souffle.',
      'Le compteur doit atteindre 6, puis termine les 3 tours.',
    ]),
    successText: 'Six voitures de police sont hors course. Tu as franchi la ligne : mission validée.',
    failureText: 'Il faut détruire six voitures de police et terminer la course.',
    requiredPoliceDestroyed: 6,
    rules: Object.freeze({
      weaponsEnabled: true,
      policeEnabled: true,
      policeTrafficEnabled: true,
      bazookaEnabled: true,
      pistolPickupRowInterval: 12,
    }),
    evaluate(result) {
      return Number.isFinite(Number(result?.policeDestroyed))
        && Number(result.policeDestroyed) >= 6;
    },
  }),
  Object.freeze({
    id: 'pickup-courier',
    number: '04',
    icon: '📦',
    name: 'La sacoche d’Ocean Drive',
    subtitle: 'LIVRAISON · OCEAN BEACH',
    cityId: 'vice-city',
    laps: 3,
    briefing: 'Une sacoche de preuves a été éparpillée le long du boulevard. Récupère douze bonus en route et ramène-les à bon port. Le parcours est débarrassé de la police : concentre-toi sur les voies et les anneaux de turbo.',
    objective: 'Ramasse au moins 12 bonus et termine les 3 tours.',
    shortObjective: '12 BONUS RAMASSÉS · 3 TOURS',
    checklist: Object.freeze([
      'Traverse les objets et les anneaux de bonus sur la route.',
      'Le compteur de butin doit atteindre 12.',
      'Franchis ensuite la ligne d’arrivée après 3 tours.',
    ]),
    successText: 'Douze bonus livrés : la sacoche de preuves est récupérée.',
    failureText: 'Il manque encore des bonus : ramasse-en douze avant de finir la course.',
    requiredPickups: 12,
    rules: Object.freeze({
      weaponsEnabled: false,
      policeEnabled: false,
      policeTrafficEnabled: false,
      bazookaEnabled: false,
    }),
    evaluate(result) {
      return Number.isFinite(Number(result?.pickups)) && Number(result.pickups) >= 12;
    },
  }),
  Object.freeze({
    id: 'cold-trigger',
    number: '05',
    icon: '🎯',
    name: 'Le doigt hors détente',
    subtitle: 'DISCIPLINE · VICE CITY',
    cityId: 'vice-city',
    laps: 3,
    briefing: 'Les chargeurs sont là, les rivaux aussi. Garde pourtant le doigt loin de la détente : prends la tête, évite les voitures et boucle les trois tours sans tirer une seule fois. Aucune police ne viendra brouiller le duel.',
    objective: 'Finis premier en 3 tours, sans tirer et avec au plus un contact.',
    shortObjective: '1er · 0 TIR · 1 CONTACT MAXIMUM',
    checklist: Object.freeze([
      'Prends la première place et termine les 3 tours.',
      'Ne tire aucun coup : ni Z, ni roquette.',
      'Un contact avec une voiture est toléré ; deux invalident le défi.',
    ]),
    successText: 'Victoire nette : aucun tir et pas plus d’un contact.',
    failureText: 'Pour réussir, il faut finir premier, tirer zéro fois et limiter les contacts à un maximum.',
    rules: Object.freeze({
      weaponsEnabled: true,
      policeEnabled: false,
      policeTrafficEnabled: false,
      bazookaEnabled: false,
    }),
    evaluate(result) {
      return Number(result?.rank) === 1
        && Number.isFinite(Number(result?.shotsFired))
        && Number(result.shotsFired) === 0
        && Number.isFinite(Number(result?.vehicleContacts))
        && Number(result.vehicleContacts) <= 1;
    },
  }),
]);

export const CITY_RUSH_MISSION_IDS = Object.freeze(CITY_RUSH_MISSIONS.map((mission) => mission.id));
export const CITY_RUSH_MISSION_COUNT = CITY_RUSH_MISSIONS.length;

export function getCityRushMission(missionId) {
  return CITY_RUSH_MISSIONS.find((mission) => mission.id === missionId) || null;
}

/** Réduit toute sauvegarde à la chaîne de missions réellement terminées. */
export function normalizeCompletedCityRushMissionIds(value) {
  const raw = new Set(Array.isArray(value)
    ? value.filter((id) => CITY_RUSH_MISSION_IDS.includes(id))
    : []);
  const completed = [];
  for (const missionId of CITY_RUSH_MISSION_IDS) {
    if (!raw.has(missionId)) break;
    completed.push(missionId);
  }
  return completed;
}

/** Seule la première mission, ou celle qui suit la chaîne validée, est ouverte. */
export function isCityRushMissionUnlocked(missionId, completedMissionIds = []) {
  const index = CITY_RUSH_MISSION_IDS.indexOf(missionId);
  if (index < 0) return false;
  if (index === 0) return true;
  return normalizeCompletedCityRushMissionIds(completedMissionIds).includes(CITY_RUSH_MISSION_IDS[index - 1]);
}

export function getNextCityRushMissionId(completedMissionIds = []) {
  const completed = normalizeCompletedCityRushMissionIds(completedMissionIds);
  return CITY_RUSH_MISSION_IDS[completed.length] || null;
}

/** Une mission ne se valide qu’à l’arrivée, jamais sur une épave ou un chrono écoulé. */
export function evaluateCityRushMission(missionOrId, result) {
  const mission = typeof missionOrId === 'string' ? getCityRushMission(missionOrId) : missionOrId;
  if (!mission || !result || result.destroyed || result.timedOut || result.sabotaged) return false;
  return Boolean(mission.evaluate?.(result));
}

/** Explication courte du verdict, conservée avec les règles de chaque mission. */
export function cityRushMissionResultText(missionOrId, result, objectiveMet = evaluateCityRushMission(missionOrId, result)) {
  const mission = typeof missionOrId === 'string' ? getCityRushMission(missionOrId) : missionOrId;
  if (!mission) return '';
  if (objectiveMet) return mission.successText;
  if (result?.destroyed || result?.timedOut || result?.sabotaged) {
    return result.sabotaged
      ? 'Le moteur a calé avant la ligne : la mission reste à refaire.'
      : result.timedOut
        ? 'Le chrono est tombé à zéro avant l’arrivée : mission non validée.'
        : 'Ta voiture est hors course : recommence la mission pour valider son objectif.';
  }
  return mission.failureText;
}

export function completeCityRushMission(progress, missionId) {
  const completedMissionIds = normalizeCompletedCityRushMissionIds(progress?.completedMissionIds);
  if (!isCityRushMissionUnlocked(missionId, completedMissionIds)) {
    return { completed: false, newlyCompleted: false, reason: 'mission-locked', completedMissionIds };
  }
  const alreadyCompleted = completedMissionIds.includes(missionId);
  const nextCompletedMissionIds = alreadyCompleted
    ? completedMissionIds
    : normalizeCompletedCityRushMissionIds([...completedMissionIds, missionId]);
  return {
    completed: true,
    newlyCompleted: !alreadyCompleted,
    reason: null,
    completedMissionIds: nextCompletedMissionIds,
    nextMissionId: getNextCityRushMissionId(nextCompletedMissionIds),
  };
}
