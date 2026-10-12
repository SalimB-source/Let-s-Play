/** La Dernière Liste — épisode I. Données seules : aucun effet sur le duel. */
export const RPG_STORY_CAMPAIGN_ID = 'derniere-liste';
export const RPG_STORY_CAMPAIGN_TITLE = 'La Dernière Liste';
export const RPG_STORY_EPISODE_TITLE = 'Les absents';
export const RPG_STORY_CAMPAIGN_FLOORS = Object.freeze(['listes-1', 'listes-2', 'listes-3', 'listes-4', 'listes-5']);

export const RPG_STORY_SURVIVANTS = Object.freeze([
  'Aïcha, l’institutrice', 'Nassim, le réparateur', 'Lila, la tisseuse',
  'Idris, l’apprenti', 'Zohra, la cuisinière', 'Sofiane, le porteur d’eau',
  'Meriem, l’herboriste', 'Rachid, le menuisier', 'Inès, l’écolière',
  'Walid, l’écolier', 'Djamila, la brodeuse', 'Ali, le veilleur',
]);

export const RPG_STORY_LIST_CHOICE = Object.freeze({
  id: 'diffusion-liste',
  question: 'À qui confier les douze noms ?',
  options: Object.freeze([
    Object.freeze({ id: 'publique', titre: 'Rendre la copie publique', consequence: 'Mobiliser le Souk, mais exposer les témoins.', journal: 'Vous avez rendu les noms publics. Le Souk peut se mobiliser ; la Scribe devra répondre de la divulgation.' }),
    Object.freeze({ id: 'confiee', titre: 'La confier à Tarek', consequence: 'Protéger les témoins, sans soutien public immédiat.', journal: 'Vous avez confié les noms à Tarek. Il protège les témoins et prépare une arrivée discrète au souk.' }),
  ]),
});

const scenes = [
  {
    id: 'listes-1-avant', etageId: 'listes-1', moment: 'avant', titre: 'Douze ombres au seuil', lieu: 'Bab El · Au pied de la Tour des Listes', decor: 'tour', figure: 'salem',
    resume: 'Salem a remonté douze habitants d’un quartier condamné. Le Guetteur refuse de les laisser entrer : leur quartier est déclaré vide. Yamina invoque le droit de contestation par duel. Gagner ouvrira le greffe, pas encore les portes de la ville haute.',
    repliques: [
      { personnage: 'salem', texte: 'Douze. Aïcha, Nassim, Lila… Ils sont tous remontés. Ouvrez la porte, ils n’ont plus de maison.' },
      { personnage: 'guetteur', texte: 'Votre quartier a été évacué hier. La Liste est close. Je n’ai aucune place à leur attribuer.' },
      { personnage: 'yamina', texte: 'L’article neuf autorise la contestation par duel. Si nous gagnons, vous nous ouvrez le greffe. Je connais ce règlement : je l’ai signé.' },
      { personnage: 'guetteur', texte: 'Alors posez vos cartes. Pas leurs noms. Les vôtres.' },
    ],
  },
  {
    id: 'listes-1-apres', etageId: 'listes-1', moment: 'apres', titre: 'Le quartier vide', lieu: 'La Tour des Listes · Premier palier', decor: 'tour', figure: 'guetteur',
    resume: 'Le Guetteur accorde le passage jusqu’au greffe. Les survivants attendront à l’abri sous la voûte. Sur le dossier, Yamina lit « quartier vide, évacuation achevée ». La Scribe détient le registre original.',
    repliques: [
      { personnage: 'guetteur', texte: 'Le passage est à vous. Ils peuvent attendre sous la voûte. Je n’ai pas le droit de leur donner une place… mais je peux leur donner de l’eau.' },
      { personnage: 'yamina', texte: '« Quartier vide. Évacuation achevée. » La date est celle d’hier. Ce n’est pas une liste d’attente, Salem. Quelqu’un a fermé le dossier.' },
      { personnage: 'salem', texte: 'Alors nous allons le rouvrir. Gardez-les ensemble. Je reviendrai avec douze places.' },
    ],
  },
  {
    id: 'listes-2-avant', etageId: 'listes-2', moment: 'avant', titre: 'Ce qui n’est pas écrit', lieu: 'La Tour des Listes · Le greffe', decor: 'greffe', figure: 'scribe',
    resume: 'La Scribe oppose le registre aux survivants. Yamina reconnaît la procédure d’effacement qu’elle avait signée des années auparavant. Un second duel leur donnera le droit de consulter le dossier et de copier les noms.',
    repliques: [
      { personnage: 'salem', texte: 'J’en ai remonté douze.' },
      { personnage: 'scribe', texte: 'Le registre n’en compte aucun.' },
      { personnage: 'salem', texte: 'Ils sont derrière moi.' },
      { personnage: 'scribe', texte: 'Je ne vous demande pas où ils sont. Je vous demande où ils sont écrits.' },
      { personnage: 'yamina', texte: 'Cette procédure… À dix-neuf ans, je l’ai signée sans lire les noms. Aujourd’hui, je vais les lire. Ouvrez le duel.' },
    ],
  },
  {
    id: 'listes-2-apres', etageId: 'listes-2', moment: 'apres', titre: 'L’encre a un prix', lieu: 'La Tour des Listes · Le greffe', decor: 'greffe', figure: 'scribe', choix: RPG_STORY_LIST_CHOICE.id,
    resume: 'La Scribe remet une copie des douze noms. La publier permettra de mobiliser le Souk, mais exposera les témoins. La confier à Tarek les protégera, sans soutien public immédiat. Les deux voies gardent les mêmes duels et récompenses.',
    repliques: [
      { personnage: 'scribe', texte: 'Voici la copie. Je ne les ai pas oubliés. J’ai reçu l’ordre de classer le quartier comme évacué. C’est ma signature en bas, pourtant.' },
      { personnage: 'yamina', texte: 'Une signature n’efface pas la personne qui la tient. Nous aurons besoin de votre témoignage.' },
      { personnage: 'tarek', texte: 'Je peux emporter ces noms sans qu’on voie le dossier sortir. Ou les gens du Souk peuvent les afficher. Ils aideront, mais la Chambre saura qui a parlé.' },
      { personnage: 'salem', texte: 'Ils ont déjà perdu leur quartier. Je ne veux pas décider à la légère de ce qu’ils risquent encore.' },
    ],
  },
  {
    id: 'listes-3-avant', etageId: 'listes-3', moment: 'avant', titre: 'Le poids des passages', lieu: 'La Tour des Listes · Archives des citernes', decor: 'citerne', figure: 'puisatier',
    resume: 'Le Puisatier conserve le registre des passages. Il est le seul à pouvoir prouver qu’aucun convoi n’est remonté du quartier. Il éprouve ceux qui veulent emporter cette preuve, car sa disparition livrerait les déplacés au silence.',
    repliques: [
      { personnage: 'puisatier', texte: 'Chaque convoi puise ici. Une cruche par personne, un trait dans mon livre. Vous cherchez douze traits qui n’existent pas.' },
      { personnage: 'salem', texte: 'Nous cherchons la preuve que personne n’est venu les chercher.' },
      { personnage: 'puisatier', texte: 'Ce livre est tout ce qui reste de certains quartiers. Je ne le remets pas à quelqu’un qui lâchera prise au prochain palier.' },
      { personnage: 'yamina', texte: 'Alors vérifiez nos cartes. Ensuite, nous vérifierons les comptes.' },
    ],
  },
  {
    id: 'listes-3-apres', etageId: 'listes-3', moment: 'apres', titre: 'Pas un seul convoi', lieu: 'La Tour des Listes · Archives des citernes', decor: 'citerne', figure: 'puisatier',
    resume: 'Aucun convoi n’a quitté le quartier à la date annoncée. La Chambre a déclaré l’évacuation terminée sans l’effectuer. Fériel peut offrir un premier abri : la preuve seule ne donnera pas un toit aux survivants.',
    repliques: [
      { personnage: 'puisatier', texte: 'Regardez. Hier : rien. Avant-hier : rien. La Chambre n’a pas perdu un convoi. Elle ne l’a jamais envoyé.' },
      { personnage: 'salem', texte: 'Douze personnes devenues une ligne vide. Comment leur dire ça ?' },
      { personnage: 'yamina', texte: 'En commençant par leur trouver un toit. Fériel tient encore son atelier au souk haut. Elle connaît ces familles.' },
    ],
  },
  {
    id: 'listes-4-avant', etageId: 'listes-4', moment: 'avant', titre: 'Le verre ne promet rien', lieu: 'La Tour des Listes · La passerelle du Souk', decor: 'atelier', figure: 'feriel',
    resume: 'Fériel accepte d’ouvrir son atelier aux survivants. Avant de laisser Salem affronter le Grand Horloger, elle l’éprouve en duel : il faudra tenir face à un homme qui sait attendre. Ce combat est une mise à l’épreuve, pas une querelle.',
    repliques: [
      { personnage: 'feriel', texte: 'Aïcha m’a appris à lire. Et vous pensez que je vais la laisser dormir dans un escalier ? Mon atelier sera leur abri.' },
      { personnage: 'salem', texte: 'Sans autorisation, la Chambre peut vous le fermer.' },
      { personnage: 'feriel', texte: 'Alors obtenez-la. Mais Mahieddine ne crie pas, ne s’énerve pas. Il attend que vous n’ayez plus rien à jouer. Asseyez-vous : on va voir si vous tenez.' },
    ],
  },
  {
    id: 'listes-4-apres', etageId: 'listes-4', moment: 'apres', titre: 'Une porte qui s’ouvre', lieu: 'La Tour des Listes · L’atelier de Fériel', decor: 'atelier', figure: 'feriel',
    resume: 'Fériel donne la clé de l’atelier. Selon votre choix, le Souk prépare un accueil public ou Tarek organise une arrivée discrète. Il manque encore le sursis signé par Mahieddine pour que cet abri soit protégé.',
    repliques: [
      { personnage: 'feriel', texte: 'Bien. Prenez la clé. Et ne lui demandez pas la permission de vous soucier des gens.' },
      { personnage: 'tarek', variantes: {
        publique: 'Les noms sont affichés. Au Souk, on rassemble des couvertures. La Scribe a reçu une convocation ; elle dit qu’elle témoignera quand même.',
        confiee: 'J’ai prévenu les familles une par une. Personne ne les attendra en public. Je passerai par l’escalier de service ; la Scribe gardera sa place au greffe.',
      } },
      { personnage: 'salem', texte: 'Nous avons la preuve et un toit. Il ne manque plus que le droit d’y rester.' },
    ],
  },
  {
    id: 'listes-5-avant', etageId: 'listes-5', moment: 'avant', titre: 'Le thé du Grand Horloger', lieu: 'La Tour des Listes · La Chambre des Heures', decor: 'greffe', figure: 'mahieddine',
    resume: 'Mahieddine reconnaît le manque de places et assume l’ordre de classement. Salem et Yamina lui présentent une solution : l’atelier de Fériel peut accueillir les douze personnes. Le dernier duel décidera de la réouverture de leur dossier.',
    repliques: [
      { personnage: 'mahieddine', texte: 'Salem. Yamina. Le thé est encore chaud. Je sais pourquoi vous êtes venus.' },
      { personnage: 'yamina', texte: 'Vous avez déclaré un quartier vide. Sans envoyer de convoi. Votre registre est faux.' },
      { personnage: 'mahieddine', texte: 'Le manque de places, lui, est exact. J’ai refusé de promettre un refuge qui n’existait pas. L’ordre porte mon nom.' },
      { personnage: 'salem', texte: 'Fériel ouvre son atelier. Nous ne vous demandons pas de créer une place. Nous vous demandons de ne pas effacer ceux qui vont l’occuper.' },
      { personnage: 'mahieddine', texte: 'Vous avez apporté autre chose qu’une objection. Très bien. Exercez votre droit. Si je perds, le dossier sera rouvert.' },
    ],
  },
  {
    id: 'listes-5-apres', etageId: 'listes-5', moment: 'apres', titre: 'Douze noms, une porte', lieu: 'Bab El · Le premier soir du sursis', decor: 'atelier', figure: 'salem',
    resume: 'Mahieddine signe le sursis : les douze habitants sont réinscrits et l’atelier est reconnu comme abri provisoire. Ils y arrivent entourés du Souk ou guidés discrètement par Tarek. Salem les compte, tous vivants. Le dossier ancien de la Chambre reste à découvrir.',
    repliques: [
      { personnage: 'mahieddine', texte: 'Douze inscriptions rétablies. L’atelier est reconnu comme abri jusqu’à la prochaine révision. Voilà le sursis. Et une autorisation de consulter nos anciens dossiers.' },
      { personnage: 'yamina', texte: 'Aïcha. Nassim. Lila. Idris. Zohra. Sofiane. Meriem. Rachid. Inès. Walid. Djamila. Ali. Cette fois, je les ai tous lus.' },
      { personnage: 'feriel', variantes: {
        publique: 'Regardez la passerelle. Tout le Souk les accompagne. Des couvertures, des marmites… et assez de témoins pour qu’on ne les efface plus en silence.',
        confiee: 'Tarek vient d’ouvrir la porte de service. Ils sont entrés sans attirer les regards. Pas de foule pour les accueillir, mais douze lits et personne sur leurs traces.',
      } },
      { personnage: 'salem', texte: 'Douze. Ils sont tous là. Ce soir, je n’ai pas besoin de compter autrement.' },
      { personnage: 'mahieddine', texte: 'Vous avez trouvé ceux que ma Liste oublie. Cherchez maintenant ce qu’elle retient.' },
    ],
  },
];

export const RPG_STORY_SCENES = Object.freeze(scenes.map((scene) => Object.freeze({
  ...scene,
  repliques: Object.freeze(scene.repliques.map((ligne) => Object.freeze({
    ...ligne, ...(ligne.variantes ? { variantes: Object.freeze(ligne.variantes) } : {}),
  }))),
})));

export function sceneHistoire(id) {
  return RPG_STORY_SCENES.find((scene) => scene.id === id) ?? null;
}

export function texteReplique(replique, choix = {}) {
  return replique?.texte ?? replique?.variantes?.[choix['diffusion-liste']] ?? '';
}

export function choixListe(optionId) {
  return RPG_STORY_LIST_CHOICE.options.find((option) => option.id === optionId) ?? null;
}
