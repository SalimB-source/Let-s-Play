import { fitsAllowedParking } from './parkingChoiceExercise.js';
import { priorityRoadIsClear } from './frenchPriorityExercises.js';
import { viceCityTrafficSignalState } from './viceCityTraffic.js';

// One short actionable instruction, from the same state used by assessment.
export function drivingLiveInstruction(session, sample) {
  const stage = session.route[session.checkpoint];
  if (!stage) return '';
  const time = sample?.time ?? 0;
  if (stage.kind === 'park') {
    if (sample && fitsAllowedParking(session.exercise, sample)) {
      if (sample.speed >= 1) return 'Freinez. Immobilisez-vous dans la place.';
      return `Restez garé encore ${Math.max(0, (stage.hold ?? 2) - (session.hold ?? 0)).toFixed(1)} s.`;
    }
    if (sample && Math.hypot(sample.x - stage.x, sample.z - stage.z) < 5) return 'Alignez toute la voiture dans la deuxième place.';
    return stage.instruction;
  }
  if (stage.kind === 'priority' && session.exercise.rule === 'blocked-junction') {
    const { axis, ix, iz } = stage.signal;
    const green = viceCityTrafficSignalState(axis, ix, iz, time) === 'green';
    const clear = priorityRoadIsClear(session.exercise, time, session.priorityState);
    if (clear) return green ? 'Sortie libre et feu vert : traversez.' : 'Sortie libre. Attendez le feu vert.';
    return green ? 'Feu vert : attendez que le taxi libère la sortie.' : 'Restez avant la ligne. Attendez le feu vert.';
  }
  if (stage.kind === 'priority') {
    if (session.exercise.rule === 'priority-road') return 'Route prioritaire : avancez prudemment, sans forcer le passage.';
    if (session.exercise.id === 'yield-clear') return 'Ralentissez. Voie libre : passez sans arrêt obligatoire.';
    if (stage.signal) {
      const { axis, ix, iz } = stage.signal;
      const signal = viceCityTrafficSignalState(axis, ix, iz, time);
      if (signal !== 'green') return signal === 'yellow' ? 'Feu orange. Attendez avant la ligne.' : 'Feu rouge. Attendez avant la ligne.';
    }
    if (session.priorityState?.faulted && session.priorityState?.reactingActors?.length) return 'Danger : un véhicule freine. Arrêtez-vous.';
    if (session.exercise.priority.stopRequired && !session.priorityState?.stopped) return 'STOP : arrêt complet avant la ligne.';
    if (priorityRoadIsClear(session.exercise, time, session.priorityState)) {
      if (session.exercise.rule === 'pedestrian' && session.exercise.priority.keepTrafficLights) {
        const signal = session.exercise.stages.find((item) => item.signal)?.signal;
        if (signal && viceCityTrafficSignalState(signal.axis, signal.ix, signal.iz, time) !== 'green') return 'Piéton passé. Attendez le feu vert.';
      }
      return 'Voie libre. Avancez prudemment.';
    }
    if (session.exercise.rule === 'blocked-junction') return 'Sortie bloquée. Attendez, même au vert.';
    if (session.priorityState?.triggerTime == null) return 'Approchez doucement. Observez la circulation.';
    if (session.exercise.rule === 'parking-exit') return 'Laissez passer la voiture avant de quitter le stationnement.';
    if (session.exercise.rule === 'lane-change') return 'Attendez. La voie de gauche est occupée.';
    if (session.exercise.rule === 'cyclist-turn') return 'Laissez passer le cycliste à droite avant de tourner.';
    if (session.exercise.rule === 'left-turn') return 'Laissez passer la voiture en face avant de tourner.';
    if (session.exercise.rule === 'pedestrian') return 'Laissez traverser le piéton. Restez avant les bandes.';
    if (session.exercise.rule === 'narrow-passage') return 'Attendez avant le passage étroit. Laissez passer en face.';
    if (session.exercise.rule === 'emergency-vehicle') return 'Attendez. Laissez passer la police en intervention.';
    if (session.exercise.rule === 'obstacle') return 'Attendez le passage de la voiture en face.';
    if (session.exercise.rule === 'giratory') return 'Laissez passer la voiture dans l’anneau.';
    return 'Attendez. Laissez passer les véhicules prioritaires.';
  }
  if (stage.kind === 'signal' && stage.signal) {
    const { axis, ix, iz } = stage.signal;
    const signal = viceCityTrafficSignalState(axis, ix, iz, time);
    if (signal === 'green') return 'Feu vert. Avancez si la voie est libre.';
    if (signal === 'yellow') return 'Feu orange. Arrêtez-vous avant la ligne.';
    return 'Feu rouge. Arrêtez-vous avant la ligne.';
  }
  if (stage.kind === 'stop' && sample) {
    const distance = Math.hypot(sample.x - stage.x, sample.z - stage.z);
    if (distance <= (stage.radius ?? 4) && sample.speed < 1) {
      const remaining = Math.max(0, (stage.hold ?? 1) - (session.hold ?? 0));
      return `Gardez l’arrêt encore ${remaining.toFixed(1)} s.`;
    }
    if (distance <= (stage.radius ?? 4) + 5) return 'Freinez. Arrêtez-vous dans le cercle.';
  }
  return stage.instruction;
}

const liveCue = (state, text) => ({ state, text, symbol: { wait:'❌', go:'✅', observe:'👀', stop:'🛑', instruction:'' }[state] });
// The upper brief uses the exact same clearance, stop and signal state as grading.
// A short hand-off keeps permission visible when a waiting checkpoint completes.
export function drivingLiveAssistance(session, sample) {
  const stage=session.route[session.checkpoint];
  if(!stage)return liveCue('instruction','');
  if(session.exercise.teachingAssistance==='autonomous') return liveCue('instruction','Suivez le parcours. Décidez selon la signalisation et les usagers.');
  const text=drivingLiveInstruction(session,sample), time=sample?.time??0;
  const previous=session.route[session.checkpoint-1];
  const handoff=previous && ['priority','signal'].includes(previous.kind)
    && session.lastCheckpointAt!=null && session.elapsed-session.lastCheckpointAt>=0 && session.elapsed-session.lastCheckpointAt<=5;
  const nearArrival=stage.kind==='stop' && sample && Math.hypot(sample.x-stage.x,sample.z-stage.z)<=(stage.radius??4)+5;
  const priorityStep=stage.kind==='priority';
  const priority= session.exercise.priority;
  const signal=stage.signal??(handoff?previous.signal:null)
    ??((priorityStep||handoff)&&priority?.keepTrafficLights?session.route.find(item=>item.signal)?.signal:null);
  // Once past the approach's control line, never demand a stop inside a junction.
  const signalStage=stage.signal?stage:previous?.signal?previous:session.route.find(item=>item.signal);
  const center=signal?(signal.axis==='x'?signal.ix:signal.iz)*100:0;
  const approachSide=signalStage&&signal?Math.sign(signalStage[signal.axis]-center):0;
  const beforeSignal=signal && (!sample||sample[signal.axis]==null||(sample[signal.axis]-center)*approachSide-2.6>=18);
  const phase=signal?viceCityTrafficSignalState(signal.axis,signal.ix,signal.iz,time):null;
  if(priorityStep||handoff&&!nearArrival){
    if(session.priorityState?.faulted&&session.priorityState?.reactingActors?.length) return liveCue('wait','Danger : restez arrêté, un véhicule freine.');
    if(priorityStep&&priority?.stopRequired&&!session.priorityState?.stopped) return liveCue('stop','Marquez l’arrêt complet avant de repartir.');
    if(beforeSignal&&phase!=='green') return liveCue('wait',phase==='red'?'Attendez encore un peu : le feu est rouge.':'Attendez encore un peu : le feu est orange.');
    if(priority){
      if(session.priorityState?.triggerTime==null&&priority.actors.some(actor=>!actor.yieldsToPlayer)) return liveCue('observe','Approchez doucement. Observez la circulation.');
      if(!priority.actors.every(actor=>actor.yieldsToPlayer)&&!priorityRoadIsClear(session.exercise,time,session.priorityState)){
        const who={pedestrian:'le piéton', 'cyclist-turn':'le cycliste', 'emergency-vehicle':'la police en intervention', 'blocked-junction':'le taxi', giratory:'le véhicule dans l’anneau', 'narrow-passage':'le véhicule en face'}[session.exercise.rule]??'les véhicules prioritaires';
        return liveCue('wait',`Attendez encore un peu. Laissez passer ${who}.`);
      }
    }
    if(session.exercise.rule==='priority-road') return liveCue('go','Route prioritaire : avancez prudemment, sans forcer le passage.');
    if(session.exercise.id==='yield-clear') return liveCue('go','Voie libre : ralentissez, puis passez sans arrêt obligatoire.');
    if(stage.kind==='drive') {
      const manoeuvre={ 'parking-exit':'Sortez doucement et rejoignez votre voie.', 'lane-change':'Rejoignez progressivement la voie de gauche.', obstacle:'Contournez, puis revenez dans votre voie.', giratory:'Entrez à droite, sans couper l’îlot.', 'narrow-passage':'Avancez doucement dans le passage étroit.' }[session.exercise.rule];
      if(manoeuvre)return liveCue('go',`C’est bon ! ${manoeuvre}`);
      if(session.exercise.id==='right-turn')return liveCue('go','C’est bon : tournez à droite, suivez le bleu.');
    }
    if(stage.kind==='drive'&&session.exercise.rule==='cyclist-turn') return liveCue('go','C’est bon : tournez à droite, sans couper la route.');
    if(stage.kind==='drive'&&session.exercise.rule==='left-turn') return liveCue('go','C’est bon : tournez à gauche, la voie est libre.');
    return liveCue('go','C’est bon, vous pouvez y aller prudemment.');
  }
  if(stage.kind==='signal'&&signal){
    if(phase!=='green') return liveCue('wait',phase==='red'?'Attendez encore un peu : le feu est rouge.':'Attendez encore un peu : le feu est orange.');
    if(priority&&!priorityRoadIsClear(session.exercise,time,session.priorityState)) return liveCue('observe','Feu vert : avancez au repère, sans couper la priorité.');
    return liveCue('go','C’est bon, le feu est vert. Avancez prudemment.');
  }
  if((stage.kind==='stop'||stage.kind==='park')&&sample&&sample.speed<1&&Math.hypot(sample.x-stage.x,sample.z-stage.z)<=(stage.radius??4)) return liveCue('stop',text);
  return liveCue('instruction',text);
}
