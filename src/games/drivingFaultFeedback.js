export function drivingFaultFeedback(label, { limit, speed, exercise } = {}) {
  if (label === 'Vitesse maximale autorisée dépassée') return {
    reason: `Vous rouliez à ${Number(speed).toFixed(1)} km/h dans une section limitée à ${limit} km/h.`,
    advice: 'Anticipez les panneaux et ralentissez avant la section limitée.',
  };
  if (label === 'Passage étroit engagé sans céder en face') return {
    reason:'Vous avez franchi l’entrée du passage étroit alors que le véhicule venant en face n’avait pas dégagé.',
    advice:'Au panneau B15, attendez avant le rétrécissement puis engagez-vous à faible allure.',
  };
  if (label === 'Passage refusé au véhicule prioritaire en intervention') return {
    reason:'Vous vous êtes engagé avant le passage de la police annoncée par ses avertisseurs spéciaux.',
    advice:'Ralentissez et attendez hors de sa trajectoire, sans franchir de feu rouge ni monter sur le trottoir.',
  };
  if (label === 'STOP non marqué') return {
    reason: 'La ligne du STOP a été franchie sans arrêt complet validé avant la ligne.',
    advice: 'Immobilisez la voiture avant la ligne, observez puis cédez le passage.',
  };
  if (label === 'Feu rouge franchi') return {
    reason: 'Vous avez franchi la ligne de contrôle alors que votre feu était rouge.',
    advice: 'Arrêtez-vous avant la ligne et attendez le vert.',
  };
  if (label === 'Priorité refusée au piéton') return {
    reason: 'Vous êtes entré sur le passage avant que le piéton ait dégagé la chaussée.',
    advice: 'Attendez avant les bandes et laissez le piéton terminer sa traversée.',
  };
  if (label === 'Voie opposée engagée avant le passage du véhicule') return {
    reason: 'Vous avez commencé le contournement alors que le véhicule venant en face approchait encore.',
    advice: 'Attendez dans votre voie. Contournez seulement après son passage.',
  };
  if (label.includes('contresens')) return {
    reason: 'Vous avez parcouru une partie de l’anneau dans le sens des aiguilles d’une montre.',
    advice: 'Suivez l’anneau dans le sens inverse des aiguilles d’une montre, sans couper l’îlot.',
  };
  if (label === 'Priorité refusée au cycliste') return {
    reason: 'Vous avez commencé à tourner alors que le cycliste arrivait encore sur votre droite.',
    advice: 'Attendez qu’il dépasse la zone du virage avant de tourner à droite.',
  };
  if (label === 'Sortie de stationnement sans céder le passage') return {
    reason: 'Vous avez quitté la place alors qu’un véhicule arrivait encore dans la voie à rejoindre.',
    advice: 'Restez dans la place, contrôlez l’arrière et l’angle mort, puis attendez un espace suffisant.',
  };
  if (label === 'Changement de voie sans créneau suffisant') return {
    reason: 'Vous avez commencé à franchir la séparation alors qu’un véhicule occupait encore la voie visée.',
    advice: 'Le clignotant ne donne pas la priorité : laissez passer la voiture avant de vous déporter.',
  };
  if (label.includes('priorité') || label.startsWith('Priorité')) return {
    reason: exercise?.rule === 'giratory' ? 'Vous avez franchi l’entrée alors qu’un véhicule prioritaire circulait encore dans l’anneau.'
      : 'Vous avez franchi la ligne d’engagement avant le passage des véhicules prioritaires.',
    advice: 'Restez avant la ligne tant que la voie n’est pas dégagée.',
  };
  if (label === 'Carrefour engagé avec sortie bloquée') return {
    reason: 'Vous êtes entré alors que le véhicule devant vous empêchait de dégager la sortie.',
    advice: 'Même au vert, attendez avant la ligne si la sortie n’est pas libre.',
  };
  if (label === 'Virage à gauche engagé devant un véhicule en face') return {
    reason: 'Vous avez commencé le virage avant le passage du véhicule venant en sens inverse.',
    advice: 'Laissez passer les véhicules en face avant de traverser leur voie.',
  };
  if (label === 'Stationnement dans la zone interdite') return {
    reason: 'Vous avez tenté de stationner dans la première zone, signalée par le disque bleu barré de rouge.',
    advice: 'Continuez au-delà de la zone interdite et garez-vous dans la deuxième place blanche, au panneau P.',
  };
  if (label === 'Collision') return {
    reason: 'Un contact a endommagé votre voiture à cet endroit du parcours.',
    advice: 'Réduisez votre allure et gardez davantage de distance avec les obstacles.',
  };
  return { reason: label, advice: 'Consultez la consigne de cette étape avant de recommencer.' };
}
