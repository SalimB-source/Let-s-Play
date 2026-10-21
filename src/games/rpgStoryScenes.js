/** La Dernière Liste — Actes I à V. Données seules : aucun effet sur le duel. */
export const RPG_STORY_CAMPAIGN_ID = 'derniere-liste';
export const RPG_STORY_CAMPAIGN_TITLE = 'La Dernière Liste';
export const RPG_STORY_CAMPAIGN_MINIATURE = 'sablier-story/mode-histoire.jpg';
export const RPG_STORY_EPISODE_TITLE = 'Les absents';
export const RPG_STORY_CAMPAIGN_FLOORS = Object.freeze(['listes-1', 'listes-2', 'listes-3', 'listes-4', 'listes-5']);

export const RPG_STORY_CAMPAIGN = Object.freeze({
  id: RPG_STORY_CAMPAIGN_ID,
  titre: RPG_STORY_CAMPAIGN_TITLE,
  miniature: RPG_STORY_CAMPAIGN_MINIATURE,
  episode: RPG_STORY_EPISODE_TITLE,
  floors: RPG_STORY_CAMPAIGN_FLOORS,
});

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

export const RPG_STORY_CHOICES = Object.freeze({
  'diffusion-liste': RPG_STORY_LIST_CHOICE,
  'dette-souk': Object.freeze({
    id: 'dette-souk',
    question: 'Comment obtenir les manifestes retenus par les courtiers du Souk ?',
    options: Object.freeze([
      Object.freeze({
        id: 'racheter',
        titre: 'Partager les réserves de l’atelier',
        consequence: 'Acquitter la dette des témoins sans provoquer la Chambre.',
        journal: 'Vous avez partagé le verre et les provisions de l’atelier pour libérer les témoins du Souk sans attirer les inspecteurs.',
      }),
      Object.freeze({
        id: 'denoncer',
        titre: 'Afficher les faux bons de réquisition',
        consequence: 'Retourner les marchands contre la Chambre, au grand jour.',
        journal: 'Vous avez exposé les faux bons de réquisition au milieu des étals : le Souk sait désormais que la Chambre facturait des quartiers déjà rayés.',
      }),
    ]),
  }),
  'aveu-boualem': Object.freeze({
    id: 'aveu-boualem',
    question: 'Que faire de la confession de Boualem sur l’inondation de l’étage 2 ?',
    options: Object.freeze([
      Object.freeze({
        id: 'pardonner',
        titre: 'Garder Boualem à vos côtés sans l’accabler',
        consequence: 'Préserver l’unité du groupe pour ouvrir les écluses profondes.',
        journal: 'Vous avez choisi d’écouter Boualem sans le condamner : son savoir des citernes guide le groupe vers le fond de l’abîme.',
      }),
      Object.freeze({
        id: 'exiger-temoignage',
        titre: 'Exiger qu’il consigne tout dans le registre',
        consequence: 'Graver la preuve officielle, même si la vérité pèse sur lui.',
        journal: 'Boualem a signé sa déposition dans le carnet de Salem : l’ordre d’inondation de l’étage 2 porte désormais un témoin nommé.',
      }),
    ]),
  }),
  'serment-archives': Object.freeze({
    id: 'serment-archives',
    question: 'Face aux stèles des Neuf Hivers, jusqu’où lire les registres ?',
    options: Object.freeze([
      Object.freeze({
        id: 'lire-tout',
        titre: 'Lire chaque nom jusqu’au premier cycle',
        consequence: 'Porter toute la mémoire de la quarantaine avant d’atteindre le portail.',
        journal: 'Avec Yamina et Salem, vous avez lu les stèles gelées jusqu’au premier cycle : aucun étage sacrifié n’est resté sans nom.',
      }),
      Object.freeze({
        id: 'sceller',
        titre: 'Refermer la chambre froide et préparer la montée',
        consequence: 'Épargner les vivants et concentrer les forces sur la Tour des Sables.',
        journal: 'Vous avez refermé les stèles après avoir compris le verrouillage du portail, pour consacrer chaque heure restante aux vivants.',
      }),
    ]),
  }),
  'choix-portail': Object.freeze({
    id: 'choix-portail',
    question: 'Le portail de Bab El vous appartient. Que décidez-vous ?',
    options: Object.freeze([
      Object.freeze({
        id: 'ouvrir',
        titre: 'Ouvrir le portail',
        consequence: 'Briser la quarantaine : sauver Bab El du sable et affronter ensemble ce qui attend derrière.',
        journal: 'Vous avez ouvert le portail. Le sable est retombé ; Bab El, debout et rassemblée, fait face à ce qui franchit le seuil.',
      }),
      Object.freeze({
        id: 'tenir',
        titre: 'Tenir et faire monter la ville',
        consequence: 'Garder le portail fermé et organiser la montée collective des étages.',
        journal: 'Vous avez maintenu la quarantaine et organisé la montée de la ville avec le Souk, les citernes et l’atelier : personne n’est plus effacé en silence.',
      }),
      Object.freeze({
        id: 'prendre-la-place',
        titre: 'Prendre la place du Grand Horloger',
        consequence: 'Dire à Mahieddine : « Vous n’aviez pas à porter ça tout seul », nommer chacun et arrêter l’Astrolabe.',
        journal: 'Vous avez lu les neuf registres, nommé chaque absent et repris le stylo de Mahieddine. Pour la première fois, l’Astrolabe s’est arrêté.',
      }),
    ]),
  }),
});

const scenesActe1 = [
  {
    id: 'listes-1-avant', acteId: 'acte-1', etageId: 'listes-1', moment: 'avant', titre: 'Douze ombres au seuil', lieu: 'Bab El · Au pied de la Tour des Listes', decor: 'tour', figure: 'salem',
    resume: 'Salem a remonté douze habitants d’un quartier condamné. Le Guetteur refuse de les laisser entrer : leur quartier est déclaré vide. Yamina invoque le droit de contestation par duel. Gagner ouvrira le greffe, pas encore les portes de la ville haute.',
    repliques: [
      { personnage: 'salem', texte: 'Douze. Aïcha, Nassim, Lila… Ils sont tous remontés. Ouvrez la porte, ils n’ont plus de maison.' },
      { personnage: 'guetteur', texte: 'Votre quartier a été évacué hier. La Liste est close. Je n’ai aucune place à leur attribuer.' },
      { personnage: 'yamina', texte: 'L’article neuf autorise la contestation par duel. Si nous gagnons, vous nous ouvrez le greffe. Je connais ce règlement : je l’ai signé.' },
      { personnage: 'guetteur', texte: 'Alors posez vos cartes. Pas leurs noms. Les vôtres.' },
    ],
  },
  {
    id: 'listes-1-apres', acteId: 'acte-1', etageId: 'listes-1', moment: 'apres', titre: 'Le quartier vide', lieu: 'La Tour des Listes · Premier palier', decor: 'tour', figure: 'guetteur',
    resume: 'Le Guetteur accorde le passage jusqu’au greffe. Les survivants attendront à l’abri sous la voûte. Sur le dossier, Yamina lit « quartier vide, évacuation achevée ». La Scribe détient le registre original.',
    repliques: [
      { personnage: 'guetteur', texte: 'Le passage est à vous. Ils peuvent attendre sous la voûte. Je n’ai pas le droit de leur donner une place… mais je peux leur donner de l’eau.' },
      { personnage: 'yamina', texte: '« Quartier vide. Évacuation achevée. » La date est celle d’hier. Ce n’est pas une liste d’attente, Salem. Quelqu’un a fermé le dossier.' },
      { personnage: 'salem', texte: 'Alors nous allons le rouvrir. Gardez-les ensemble. Je reviendrai avec douze places.' },
    ],
  },
  {
    id: 'listes-2-avant', acteId: 'acte-1', etageId: 'listes-2', moment: 'avant', titre: 'Ce qui n’est pas écrit', lieu: 'La Tour des Listes · Le greffe', decor: 'greffe', figure: 'scribe',
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
    id: 'listes-2-apres', acteId: 'acte-1', etageId: 'listes-2', moment: 'apres', titre: 'L’encre a un prix', lieu: 'La Tour des Listes · Le greffe', decor: 'greffe', figure: 'scribe', choix: RPG_STORY_LIST_CHOICE.id,
    resume: 'La Scribe remet une copie des douze noms. La publier permettra de mobiliser le Souk, mais exposera les témoins. La confier à Tarek les protégera, sans soutien public immédiat. Les deux voies gardent les mêmes duels et récompenses.',
    repliques: [
      { personnage: 'scribe', texte: 'Voici la copie. Je ne les ai pas oubliés. J’ai reçu l’ordre de classer le quartier comme évacué. C’est ma signature en bas, pourtant.' },
      { personnage: 'yamina', texte: 'Une signature n’efface pas la personne qui la tient. Nous aurons besoin de votre témoignage.' },
      { personnage: 'tarek', texte: 'Je peux emporter ces noms sans qu’on voie le dossier sortir. Ou les gens du Souk peuvent les afficher. Ils aideront, mais la Chambre saura qui a parlé.' },
      { personnage: 'salem', texte: 'Ils ont déjà perdu leur quartier. Je ne veux pas décider à la légère de ce qu’ils risquent encore.' },
    ],
  },
  {
    id: 'listes-3-avant', acteId: 'acte-1', etageId: 'listes-3', moment: 'avant', titre: 'Le poids des passages', lieu: 'La Tour des Listes · Archives des citernes', decor: 'citerne', figure: 'puisatier',
    resume: 'Le Puisatier conserve le registre des passages. Il est le seul à pouvoir prouver qu’aucun convoi n’est remonté du quartier. Il éprouve ceux qui veulent emporter cette preuve, car sa disparition livrerait les déplacés au silence.',
    repliques: [
      { personnage: 'puisatier', texte: 'Chaque convoi puise ici. Une cruche par personne, un trait dans mon livre. Vous cherchez douze traits qui n’existent pas.' },
      { personnage: 'salem', texte: 'Nous cherchons la preuve que personne n’est venu les chercher.' },
      { personnage: 'puisatier', texte: 'Ce livre est tout ce qui reste de certains quartiers. Je ne le remets pas à quelqu’un qui lâchera prise au prochain palier.' },
      { personnage: 'yamina', texte: 'Alors vérifiez nos cartes. Ensuite, nous vérifierons les comptes.' },
    ],
  },
  {
    id: 'listes-3-apres', acteId: 'acte-1', etageId: 'listes-3', moment: 'apres', titre: 'Pas un seul convoi', lieu: 'La Tour des Listes · Archives des citernes', decor: 'citerne', figure: 'puisatier',
    resume: 'Aucun convoi n’a quitté le quartier à la date annoncée. La Chambre a déclaré l’évacuation terminée sans l’effectuer. Fériel peut offrir un premier abri : la preuve seule ne donnera pas un toit aux survivants.',
    repliques: [
      { personnage: 'puisatier', texte: 'Regardez. Hier : rien. Avant-hier : rien. La Chambre n’a pas perdu un convoi. Elle ne l’a jamais envoyé.' },
      { personnage: 'salem', texte: 'Douze personnes devenues une ligne vide. Comment leur dire ça ?' },
      { personnage: 'yamina', texte: 'En commençant par leur trouver un toit. Fériel tient encore son atelier au souk haut. Elle connaît ces familles.' },
    ],
  },
  {
    id: 'listes-4-avant', acteId: 'acte-1', etageId: 'listes-4', moment: 'avant', titre: 'Le verre ne promet rien', lieu: 'La Tour des Listes · La passerelle du Souk', decor: 'atelier', figure: 'feriel',
    resume: 'Fériel accepte d’ouvrir son atelier aux survivants. Avant de laisser Salem affronter le Grand Horloger, elle l’éprouve en duel : il faudra tenir face à un homme qui sait attendre. Ce combat est une mise à l’épreuve, pas une querelle.',
    repliques: [
      { personnage: 'feriel', texte: 'Aïcha m’a appris à lire. Et vous pensez que je vais la laisser dormir dans un escalier ? Mon atelier sera leur abri.' },
      { personnage: 'salem', texte: 'Sans autorisation, la Chambre peut vous le fermer.' },
      { personnage: 'feriel', texte: 'Alors obtenez-la. Mais Mahieddine ne crie pas, ne s’énerve pas. Il attend que vous n’ayez plus rien à jouer. Asseyez-vous : on va voir si vous tenez.' },
    ],
  },
  {
    id: 'listes-4-apres', acteId: 'acte-1', etageId: 'listes-4', moment: 'apres', titre: 'Une porte qui s’ouvre', lieu: 'La Tour des Listes · L’atelier de Fériel', decor: 'atelier', figure: 'feriel',
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
    id: 'listes-5-avant', acteId: 'acte-1', etageId: 'listes-5', moment: 'avant', titre: 'Le thé du Grand Horloger', lieu: 'La Tour des Listes · La Chambre des Heures', decor: 'tour', figure: 'mahieddine',
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
    id: 'listes-5-apres', acteId: 'acte-1', etageId: 'listes-5', moment: 'apres', titre: 'Douze noms, une porte', lieu: 'Bab El · Le premier soir du sursis', decor: 'atelier', figure: 'salem',
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

const scenesActe2 = [
  {
    id: 'souk-1-avant', acteId: 'acte-2', etageId: 'souk-1', moment: 'avant', titre: 'La rumeur des auvents', lieu: 'La Tour du Souk · Les étals suspendus', decor: 'souk', figure: 'marchand',
    resume: 'Les douze habitants dorment sous le toit de Fériel, mais le laissez-passer de Mahieddine mentionne d’autres convois jamais arrivés. Au Souk, le Marchand de sable détient les bordereaux de vivres des étages bas.',
    repliques: [
      { personnage: 'feriel', variantes: {
        publique: 'Depuis qu’on a affiché les douze noms sur la passerelle, chaque étal vérifie ses propres carnets. Les marchands nous attendaient.',
        confiee: 'Tarek nous a fait entrer avant la criée. Personne ne sait encore pour l’atelier, mais les courtiers sentent que la Chambre fouille ses archives.',
      } },
      { personnage: 'marchand', texte: 'Un nom sur une Liste ne nourrit personne, Sondeur. Ici on pèse le grain, l’huile et la corde. Vous cherchez les cargaisons du quatrième ?' },
      { personnage: 'salem', texte: 'Nous cherchons pourquoi vos registres facturent des vivres pour trois quartiers que la Chambre déclarait déjà engloutis.' },
      { personnage: 'marchand', texte: 'Les comptes d’un facteur ne s’ouvrent pas sur parole. Montrez-moi que vous tenez la table.' },
    ],
  },
  {
    id: 'souk-1-apres', acteId: 'acte-2', etageId: 'souk-1', moment: 'apres', titre: 'Des vivres pour des fantômes', lieu: 'La Tour du Souk · Comptoir des facteurs', decor: 'souk', figure: 'marchand',
    resume: 'Le Marchand ouvre ses livres : les rations des quartiers rayés n’ont pas été annulées, elles ont été descendues vers les entrepôts des ksour.',
    repliques: [
      { personnage: 'marchand', texte: 'Vous avez l’œil. Ces caisses d’orge et d’huile n’ont jamais monté les escaliers. La Chambre les a fait livrer derrière les portes des ksour.' },
      { personnage: 'yamina', texte: 'On ne ravitaille pas des ruines. Ces vivres servaient à une équipe qui travaillait plus bas, après la fermeture officielle.' },
      { personnage: 'tarek', texte: 'Amani garde les portes de pierre du souk haut. Aucune caisse ne descend sans sa clef.' },
    ],
  },
  {
    id: 'souk-2-avant', acteId: 'acte-2', etageId: 'souk-2', moment: 'avant', titre: 'Les portes de pierre', lieu: 'La Tour du Souk · Seuil des ksour', decor: 'souk', figure: 'amani',
    resume: 'Amani, gardienne des ksour, protège les galeries de stockage où se réfugient d’anciens déplacés sans inscription. Elle refuse d’ouvrir avant d’avoir éprouvé Salem.',
    repliques: [
      { personnage: 'amani', texte: 'Halte. Derrière cette arche dorment des familles qui n’ont ni sursis ni tampon. Je ne laisse entrer aucun agent de la Chambre.' },
      { personnage: 'yamina', texte: 'Je ne travaille plus pour eux, Amani. Et Aïcha, qui loge chez Fériel, nous a donné votre nom : vous avez caché deux de ses anciens élèves.' },
      { personnage: 'amani', texte: 'Aïcha est vivante ? Alors prouvez-moi que vous ne reculerez pas quand les inspecteurs monteront jusqu’ici.' },
    ],
  },
  {
    id: 'souk-2-apres', acteId: 'acte-2', etageId: 'souk-2', moment: 'apres', titre: 'La route des cordes', lieu: 'La Tour du Souk · Galerie des greniers', decor: 'souk', figure: 'amani',
    resume: 'Amani reconnaît la démarche du groupe. Elle leur indique que les convois secrets prenaient la galerie du tournant, tenue par le Djinn des épices.',
    repliques: [
      { personnage: 'amani', texte: 'Vos cartes disent vrai. Dites à Aïcha que ses élèves lisent chaque soir sous nos lampes. Quant aux caisses de la Chambre, elles descendaient vers les citernes par le tournant aux épices.' },
      { personnage: 'salem', texte: 'Pourquoi faire passer des convois de la Chambre par les galeries des marchands ?' },
      { personnage: 'amani', texte: 'Parce que le greffe ne devait garder aucune trace. Allez au tournant, mais méfiez-vous : là-bas, toute information rachète une dette.' },
    ],
  },
  {
    id: 'souk-3-avant', acteId: 'acte-2', etageId: 'souk-3', moment: 'avant', titre: 'La dette du tournant', lieu: 'La Tour du Souk · Carrefour des épices', decor: 'souk', figure: 'djinn-souk',
    resume: 'Le Djinn du tournant détient les bons de transport signés par d’anciens porteurs. Il réclame un duel avant de céder les noms des témoins.',
    repliques: [
      { personnage: 'djinn-souk', texte: 'Du safran, du verre soufflé et des secrets d’administration ! Vous voilà enfin, les défenseurs des douze noms.' },
      { personnage: 'tarek', texte: 'Tu tiens les bons de descente de l’an dernier. Ceux que les porteurs ont signés sous contrainte.' },
      { personnage: 'djinn-souk', texte: 'Une dette est une dette, Tarek ! Si vous voulez leurs témoignages, gagnez-les à la flamme.' },
    ],
  },
  {
    id: 'souk-3-apres', acteId: 'acte-2', etageId: 'souk-3', moment: 'apres', titre: 'Le prix des témoins', lieu: 'La Tour du Souk · Carrefour des épices', decor: 'souk', figure: 'djinn-souk', choix: 'dette-souk',
    resume: 'Le Djinn remet les bons de transport. Vous devez choisir comment libérer les porteurs de leur dette : partager les réserves de l’atelier ou dénoncer publiquement les faux bons de la Chambre.',
    repliques: [
      { personnage: 'djinn-souk', texte: 'Beau jeu ! Voilà vos bons. Mais si j’efface l’ardoise des porteurs, qui couvre ma perte devant la Doyenne ?' },
      { personnage: 'feriel', texte: 'Mon atelier a des pièces de verre et des provisions. On peut payer leur tranquillité sans faire de bruit.' },
      { personnage: 'yamina', texte: 'Ou nous affichons ces bons falsifiés devant toute la criée : les marchands verront que la Chambre les payait avec des créances sur des quartiers condamnés.' },
    ],
  },
  {
    id: 'souk-4-avant', acteId: 'acte-2', etageId: 'souk-4', moment: 'avant', titre: 'Celle qui a vu trois étages tomber', lieu: 'La Tour du Souk · La haute terrasse', decor: 'souk', figure: 'reine-etals',
    resume: 'La Reine des étals garde l’ancienne écluse qui relie le Souk aux citernes englouties. Elle met Salem au défi de prouver que sa quête ne condamnera pas le Souk.',
    repliques: [
      { personnage: 'reine-etals', choixCle: 'dette-souk', variantes: {
        racheter: 'Vous avez payé de votre poche pour protéger des porteurs. C’est rare, en haut des tours.',
        denoncer: 'Vos affiches ont mis mes courtiers en ébullition. Au moins, plus personne ici ne croit aux promesses de la Chambre.',
      } },
      { personnage: 'salem', texte: 'Vous gardez la trappe de l’ancienne écluse. Nous devons descendre aux citernes basses retrouver Boualem.' },
      { personnage: 'reine-etals', texte: 'J’ai vu tomber le premier, le deuxième et le troisième étage. Avant que je vous ouvre les eaux, montrez-moi que vous savez encaisser le prix d’une ville.' },
    ],
  },
  {
    id: 'souk-4-apres', acteId: 'acte-2', etageId: 'souk-4', moment: 'apres', titre: 'La clef de l’écluse', lieu: 'La Tour du Souk · Escalier des citernes', decor: 'souk', figure: 'reine-etals',
    resume: 'La Reine des étals remet la clef de l’écluse et scelle l’alliance du Souk avec l’atelier de Fériel. La route vers la Tour des Abysses et Boualem est ouverte.',
    repliques: [
      { personnage: 'reine-etals', texte: 'Prenez la clef de bronze. Tant que le Souk tiendra debout, vos douze survivants auront du pain et des témoins.' },
      { personnage: 'feriel', texte: 'Je reste veiller sur l’atelier et les étals avec Aïcha et Nassim. Descendez avec Yamina et Tarek : l’eau garde ce que le papier efface.' },
      { personnage: 'salem', texte: 'Boualem nous attend aux citernes basses. Il est temps de savoir ce que la Chambre a noyé.' },
    ],
  },
];

const scenesActe3 = [
  {
    id: 'abysses-1-avant', acteId: 'acte-3', etageId: 'abysses-1', moment: 'avant', titre: 'Ce qui dort sous les dalles', lieu: 'La Tour des Abysses · Bassin d’entrée', decor: 'citerne', figure: 'boualem',
    resume: 'Dans la Tour des Abysses, Salem et Yamina retrouvent Boualem. Le Pêcheur de perles remonte des coffres lestés que la Chambre avait fait jeter dans les puits.',
    repliques: [
      { personnage: 'boualem', texte: 'Salem… Yamina. Je savais que vous finiriez par descendre jusqu’ici. L’eau monte plus lentement que le sable, mais elle n’oublie rien.' },
      { personnage: 'pecheur', texte: 'On ne pêche plus de perles dans ce bassin, mais des caisses de plomb marquées du sceau des Heures. Vous venez les réclamer ?' },
      { personnage: 'yamina', texte: 'Nous venons les ouvrir. En garde.' },
    ],
  },
  {
    id: 'abysses-1-apres', acteId: 'acte-3', etageId: 'abysses-1', moment: 'apres', titre: 'Les caisses de plomb', lieu: 'La Tour des Abysses · Bassin d’entrée', decor: 'citerne', figure: 'pecheur',
    resume: 'Le Pêcheur cède les coffres repêchés : ils contiennent les plans d’évacuation du deuxième étage, datés de vingt ans avant la reprise officielle.',
    repliques: [
      { personnage: 'pecheur', texte: 'Les coffres sont à vous. Mais plus bas, l’eau répond coup pour coup. Ne laissez aucune vague sans garde.' },
      { personnage: 'yamina', texte: 'Ces plans portent le timbre du deuxième étage… Boualem, pourquoi les vannes principales sont-elles cochées comme ouvertes de l’intérieur ?' },
      { personnage: 'boualem', texte: 'Pas ici. Descendons jusqu’aux puits médians. Je vous montrerai tout.' },
    ],
  },
  {
    id: 'abysses-2-avant', acteId: 'acte-3', etageId: 'abysses-2', moment: 'avant', titre: 'Le silence des puits', lieu: 'La Tour des Abysses · Galeries submergées', decor: 'citerne', figure: 'nageuse',
    resume: 'La Nageuse des puits défend la vanne du réservoir de l’étage 2. Elle interdit qu’on trouble les eaux scellées.',
    repliques: [
      { personnage: 'nageuse', texte: 'Cette galerie est close par décret. Ceux qui cherchent à remuer le fond réveillent ce que l’eau maintient endormi.' },
      { personnage: 'salem', texte: 'Vous ne gardez pas un tombeau, vous gardez une preuve. Laissez-nous passer.' },
      { personnage: 'nageuse', texte: 'Chaque sort que vous lancerez trouvera son contre dans l’eau noire. Voyons si votre voix porte sous la surface.' },
    ],
  },
  {
    id: 'abysses-2-apres', acteId: 'acte-3', etageId: 'abysses-2', moment: 'apres', titre: 'Ce que Boualem a tu', lieu: 'La Tour des Abysses · Vanne de l’étage 2', decor: 'citerne', figure: 'boualem',
    resume: 'Devant la vanne scellée, Boualem avoue ce qu’il cachait depuis vingt ans : la Chambre a volontairement noyé le réservoir de l’étage 2 pour condamner un tunnel menant sous le portail.',
    repliques: [
      { personnage: 'boualem', texte: 'C’est moi qui ai trouvé cette vanne il y a vingt ans. Le deuxième étage n’a pas été surpris par une crue. La Chambre a ouvert les bassins pour noyer la galerie inférieure.' },
      { personnage: 'salem', texte: 'Tu le savais depuis vingt ans, Boualem ? Pendant que je descendais compter les disparus ?' },
      { personnage: 'boualem', texte: 'Les habitants avaient été évacués la veille, Salem, je l’ai vérifié moi-même ! Mais j’ai signé la clause de silence. Ils voulaient murer quelque chose qui grattait sous le portail.' },
    ],
  },
  {
    id: 'abysses-3-avant', acteId: 'acte-3', etageId: 'abysses-3', moment: 'avant', titre: 'La cloche engloutie', lieu: 'La Tour des Abysses · Beffroi noyé', decor: 'citerne', figure: 'sonneur',
    resume: 'Le Sonneur d’écume garde la cloche des ports engloutis et le registre original de l’ordre d’inondation.',
    repliques: [
      { personnage: 'sonneur', texte: 'Quand ma cloche sonne sous la voûte, les vannes se ferment. Qui ose réclamer le journal d’immersion ?' },
      { personnage: 'boualem', texte: 'C’est mon nom qui figure au bas de la page de garde, Sonneur. Je viens reprendre ma parole.' },
      { personnage: 'sonneur', texte: 'Alors défendez-la devant l’écume !' },
    ],
  },
  {
    id: 'abysses-3-apres', acteId: 'acte-3', etageId: 'abysses-3', moment: 'apres', titre: 'Le poids d’un mensonge', lieu: 'La Tour des Abysses · Beffroi noyé', decor: 'citerne', figure: 'boualem', choix: 'aveu-boualem',
    resume: 'Le registre d’inondation est entre vos mains. Vous devez décider comment traiter l’aveu de Boualem avant d’affronter le gardien du fond.',
    repliques: [
      { personnage: 'yamina', texte: 'L’ordre d’inondation précède Mahieddine. Il remonte au septième Grand Horloger : « Sceller par l’eau toute brèche sous le seuil ».' },
      { personnage: 'boualem', texte: 'Je vous ai menti par omission, avec le sourire, pendant des années. Si vous voulez m’écarter ou me faire juger par le Souk, je ne dirai pas un mot.' },
      { personnage: 'salem', texte: 'À nous de décider ce que vaut sa parole maintenant.' },
    ],
  },
  {
    id: 'abysses-4-avant', acteId: 'acte-3', etageId: 'abysses-4', moment: 'avant', titre: 'Au fond de l’abîme', lieu: 'La Tour des Abysses · La fosse du Léviathan', decor: 'citerne', figure: 'devoreur',
    resume: 'Au plus profond des citernes, le Dévoreur de l’abîme veille sur le coffre de laiton du premier Horloger.',
    repliques: [
      { personnage: 'boualem', choixCle: 'aveu-boualem', variantes: {
        pardonner: 'Merci de me garder à vos côtés, Salem. Je connais les courants du fond : je ne vous laisserai pas sombrer.',
        'exiger-temoignage': 'Ma déposition est écrite et signée dans ton carnet, Salem. J’ai le cœur plus léger pour affronter le fond.',
      } },
      { personnage: 'devoreur', texte: 'Rien ne remonte de la fosse sans l’accord des profondeurs. Posez vos cartes sur la pierre humide.' },
      { personnage: 'yamina', texte: 'Le coffre du premier Horloger est juste derrière lui. Tenons bon !' },
    ],
  },
  {
    id: 'abysses-4-apres', acteId: 'acte-3', etageId: 'abysses-4', moment: 'apres', titre: 'L’astrolabe de cuivre', lieu: 'La Tour des Abysses · Chambre du coffre', decor: 'citerne', figure: 'yamina',
    resume: 'Dans le coffre du fond, Yamina découvre une plaque de laiton gravée de runes nordiques : le traité originel du portail est conservé dans la glace de la Tour du Fjord.',
    repliques: [
      { personnage: 'yamina', texte: 'Ce n’est pas un registre de papier… C’est une plaque d’astrolabe gravée dans la glace. « Que les Neuf Hivers tiennent la porte de l’intérieur. »' },
      { personnage: 'boualem', texte: 'La Tour du Fjord. Les archives froides de la Chambre, là où l’encre ne sèche ni ne pourrit.' },
      { personnage: 'salem', texte: 'Montons vers la glace. Nous saurons enfin contre quoi Bab El se barricade.' },
    ],
  },
];

const scenesActe4 = [
  {
    id: 'fjord-1-avant', acteId: 'acte-4', etageId: 'fjord-1', moment: 'avant', titre: 'Le mur de boucliers', lieu: 'La Tour du Fjord · Corniche du givre', decor: 'fjord', figure: 'garde-fjord',
    resume: 'Au-dessus du portail, la Tour du Fjord conserve les traités de fondation dans la glace. La Garde du fjord oppose son mur de boucliers.',
    repliques: [
      { personnage: 'garde-fjord', texte: 'Ici commencent les Neuf Hivers. Nul ne franchit le mur de boucliers sans prouver qu’il sait endurer le froid.' },
      { personnage: 'tarek', texte: 'Même les inspecteurs de la Chambre ne montent jamais jusqu’ici. Leurs boucliers sont taillés pour épuiser l’adversaire.' },
      { personnage: 'salem', texte: 'Nous avons le laissez-passer des Archives et la plaque des Abysses. Ouvrez la herse.' },
    ],
  },
  {
    id: 'fjord-1-apres', acteId: 'acte-4', etageId: 'fjord-1', moment: 'apres', titre: 'La première stèle', lieu: 'La Tour du Fjord · Galerie des boucliers', decor: 'fjord', figure: 'garde-fjord',
    resume: 'La Garde s’écarte. Sur la première stèle de glace, Yamina lit que l’Astrolabe n’est pas une horloge naturelle, mais le compteur d’un verrou.',
    repliques: [
      { personnage: 'garde-fjord', texte: 'Vous avez tenu sans rompre. Passez la herse, mais lisez sans trembler.' },
      { personnage: 'yamina', texte: '« Cycle après cycle, le poids du sable scelle le seuil. » L’Astrolabe ne prédit pas l’ensevelissement… il mesure la pression qui garde le portail fermé !' },
      { personnage: 'salem', texte: 'Continuons. Les stèles suivantes sont sur le plateau de glace.' },
    ],
  },
  {
    id: 'fjord-2-avant', acteId: 'acte-4', etageId: 'fjord-2', moment: 'avant', titre: 'La course sur la croûte gelée', lieu: 'La Tour du Fjord · Plateau de glace', decor: 'fjord', figure: 'meute-neiges',
    resume: 'La Meute des neiges fond sur le groupe pour l’empêcher d’atteindre la salle des serments.',
    repliques: [
      { personnage: 'meute-neiges', texte: 'La glace cède sous ceux qui hésitent ! Courez ou restez pris dans le givre !' },
      { personnage: 'feriel', texte: 'Après la muraille, la ruée ! Ne les laissez pas prendre la vitesse, Salem !' },
      { personnage: 'salem', texte: 'Je tiens la ligne. Préparez vos cartes !' },
    ],
  },
  {
    id: 'fjord-2-apres', acteId: 'acte-4', etageId: 'fjord-2', moment: 'apres', titre: 'Les neuf encoches', lieu: 'La Tour du Fjord · Pont du drakkar', decor: 'fjord', figure: 'yamina',
    resume: 'La Meute repoussée, le groupe découvre neuf encoches taillées dans la proue du drakkar de pierre : une par étage de Bab El.',
    repliques: [
      { personnage: 'yamina', texte: 'Neuf encoches. Trois sont déjà remplies de sable vitrifié. La ville entière a été bâtie comme un contrepoids au-dessus du portail.' },
      { personnage: 'tarek', texte: 'Et chaque fois qu’un étage est repris, son poids verrouille la porte pour un cycle de plus…' },
      { personnage: 'salem', texte: 'Alors les omissions de la Liste servaient à cacher la vitesse à laquelle le verrou s’use.' },
    ],
  },
  {
    id: 'fjord-3-avant', acteId: 'acte-4', etageId: 'fjord-3', moment: 'avant', titre: 'Celle qui choisit', lieu: 'La Tour du Fjord · Arche des corbeaux', decor: 'fjord', figure: 'valkyrie-fjord',
    resume: 'La Valkyrie du fjord garde la chambre où reposent les neuf registres originaux des étages perdus.',
    repliques: [
      { personnage: 'valkyrie-fjord', texte: 'Je porte le corbeau qui compte ceux qui montent et ceux qui restent. Voulez-vous vraiment savoir ce qui attend derrière le portail ?' },
      { personnage: 'yamina', texte: 'Le mensonge nous a déjà coûté trois étages et failli coûter douze vies hier. Nous avons le devoir de savoir.' },
      { personnage: 'valkyrie-fjord', texte: 'Alors gagnez le droit d’entrer dans la salle des Neuf Hivers.' },
    ],
  },
  {
    id: 'fjord-3-apres', acteId: 'acte-4', etageId: 'fjord-3', moment: 'apres', titre: 'Les registres de givre', lieu: 'La Tour du Fjord · Chambre des Neuf Hivers', decor: 'fjord', figure: 'valkyrie-fjord', choix: 'serment-archives',
    resume: 'Devant les tables de givre qui recensent tous les sacrifiés depuis la fondation de Bab El, vous devez choisir entre lire chaque nom jusqu’au bout ou refermer la chambre pour hâter la défense.',
    repliques: [
      { personnage: 'valkyrie-fjord', texte: 'Voici les tables depuis le premier cycle. Ce qui attend derrière le portail dévore la mémoire même des villes : c’est une tempête sans forme que les fondateurs ont enfermée de l’intérieur.' },
      { personnage: 'salem', texte: 'Des centaines de noms gravés dans le givre… Ceux des étages 1, 2 et 3 que personne n’avait relus.' },
      { personnage: 'yamina', texte: 'L’Astrolabe va bientôt sonner au sommet des Sables. Prenons-nous le temps de lire chaque registre jusqu’au dernier nom, ou courons-nous immédiatement au portail ?' },
    ],
  },
  {
    id: 'fjord-4-avant', acteId: 'acte-4', etageId: 'fjord-4', moment: 'avant', titre: 'Celui qui tient le serment', lieu: 'La Tour du Fjord · Trône des Neuf Hivers', decor: 'fjord', figure: 'maitre-hivers',
    resume: 'Le Maître des Neuf Hivers exige un dernier duel avant de remettre le sceau boréal qui commande la serrure du portail.',
    repliques: [
      { personnage: 'maitre-hivers', choixCle: 'serment-archives', variantes: {
        'lire-tout': 'Vous avez lu tous les noms sans détourner les yeux. Même les Grands Horlogers n’avaient plus ce courage.',
        sceller: 'Vous protégez les vivants avant les pierres. Voyons si votre bouclier vaut votre parole.',
      } },
      { personnage: 'salem', texte: 'Donnez-nous le sceau du Nord. C’est à Bab El de choisir son destin, pas à une porte fermée en secret.' },
      { personnage: 'maitre-hivers', texte: 'Mes deux corbeaux comptent vos cartes, Sondeur. Que le marteau décide si vous êtes prêts pour le Zénith.' },
    ],
  },
  {
    id: 'fjord-4-apres', acteId: 'acte-4', etageId: 'fjord-4', moment: 'apres', titre: 'Le secret de la quarantaine', lieu: 'La Tour du Fjord · Belvédère du Nord', decor: 'fjord', figure: 'yamina',
    resume: 'Le Maître des Neuf Hivers remet le sceau boréal. La vérité est complète : le portail est verrouillé de l’intérieur. Il ne reste plus qu’à gravir la Tour des Sables pour décider de l’avenir de Bab El.',
    repliques: [
      { personnage: 'maitre-hivers', texte: 'Le serment des Neuf Hivers est accompli. Prenez le sceau. Au sommet de la Tour des Sables, l’Horloger du Zénith garde la clef du portail.' },
      { personnage: 'yamina', texte: 'Nous avons tout le dossier : l’omission du greffe, les convois du Souk, la vanne des Abysses et le traité de quarantaine.' },
      { personnage: 'salem', texte: 'Et les douze habitants nous attendent en bas. Montons à la Tour des Sables : cette fois, personne ne signera à notre place.' },
    ],
  },
];

const scenesActe5 = [
  {
    id: 'sables-1-avant', acteId: 'acte-5', etageId: 'sables-1', moment: 'avant', titre: 'Là où le vent rouge commence', lieu: 'La Tour des Sables · Marches du portail', decor: 'sables', figure: 'dernier-fennec',
    resume: 'Réunis au pied de la Tour des Sables, Salem, Yamina, Fériel, Boualem et Tarek entament la dernière ascension au-dessus du portail. Le Dernier Fennec garde la première volée de marches.',
    repliques: [
      { personnage: 'salem', texte: 'L’Astrolabe ralentit au-dessus de nous. Vous êtes tous là : Yamina, Fériel, Boualem, Tarek.' },
      { personnage: 'dernier-fennec', texte: 'Plus personne ne descend d’ici, Sondeur ! Le vent rouge emporte les ordres et les registres. Seuls les plus vifs franchissent la brèche !' },
      { personnage: 'feriel', texte: 'Laisse-le-moi, Salem : on a appris à courir plus vite que le sable !' },
    ],
  },
  {
    id: 'sables-1-apres', acteId: 'acte-5', etageId: 'sables-1', moment: 'apres', titre: 'Au-dessus des dunes', lieu: 'La Tour des Sables · Palier des éclats', decor: 'sables', figure: 'dernier-fennec',
    resume: 'Le Dernier Fennec s’incline et ouvre la piste vers le sanctuaire intérieur du portail.',
    repliques: [
      { personnage: 'dernier-fennec', texte: 'Vous avez le pas sûr. Montez : là-haut, le feu garde encore le seuil originel.' },
      { personnage: 'tarek', texte: 'Regardez en bas : les lanternes du Souk et de l’atelier sont toutes allumées. La ville nous regarde monter.' },
      { personnage: 'salem', texte: 'Alors ne les faisons pas attendre.' },
    ],
  },
  {
    id: 'sables-2-avant', acteId: 'acte-5', etageId: 'sables-2', moment: 'avant', titre: 'Le gardien de braise', lieu: 'La Tour des Sables · Seuil du portail', decor: 'sables', figure: 'ifrit-ergs',
    resume: 'Devant les battants scellés du portail, l’Ifrit des ergs dresse un rideau de flammes pour éprouver ceux qui portent les sceaux.',
    repliques: [
      { personnage: 'ifrit-ergs', texte: 'Neuf cycles j’ai veillé sur la serrure de braise ! Qui apporte le fer, l’eau et la glace devant ma porte ?' },
      { personnage: 'boualem', texte: 'Ceux qui ont réparé ce que vos maîtres avaient caché sous l’eau et l’encre.' },
      { personnage: 'ifrit-ergs', texte: 'Alors traversez ma fournaise sans baisser les yeux !' },
    ],
  },
  {
    id: 'sables-2-apres', acteId: 'acte-5', etageId: 'sables-2', moment: 'apres', titre: 'Mahieddine au seuil', lieu: 'La Tour des Sables · Parvis de l’Astrolabe', decor: 'sables', figure: 'mahieddine',
    resume: 'L’Ifrit vaincu, Mahieddine rejoint le groupe sur le parvis, sans escorte. Il leur révèle que le dernier duel les opposera à l’Horloger du Zénith, gardien du mécanisme céleste.',
    repliques: [
      { personnage: 'mahieddine', texte: 'Vous avez lu ce que huit Grands Horlogers avant moi ont gardé sous clef. Je n’ai plus rien à vous omettre.' },
      { personnage: 'salem', texte: 'Vous auriez pu nous arrêter dès la Tour des Listes. Pourquoi nous avoir donné la clef des archives ?' },
      { personnage: 'mahieddine', texte: 'Parce que quarante ans à signer seul m’ont appris une chose : une survie que personne ne choisit finit par ressembler à l’oubli. Franchissez la dernière arche.' },
    ],
  },
  {
    id: 'sables-3-avant', acteId: 'acte-5', etageId: 'sables-3', moment: 'avant', titre: 'La voix de l’horloge du ciel', lieu: 'La Tour des Sables · Sous l’Astrolabe', decor: 'sables', figure: 'horloger-zenith',
    resume: 'Au sommet de Bab El, l’Horloger du Zénith incarne le pacte originel qui maintient l’Astrolabe en marche. Le vaincre donnera le droit de choisir l’avenir de la ville.',
    repliques: [
      { personnage: 'horloger-zenith', texte: 'Je suis la première signature et le dernier balancier. Tant que je tiens la table, le cycle recommence et le portail reste clos.' },
      { personnage: 'yamina', texte: 'L’article neuf vaut aussi pour le ciel : nous contestons le registre jusqu’à sa première ligne !' },
      { personnage: 'salem', texte: 'Pour Aïcha, Nassim, Lila et tous les étages de Bab El. Posons nos cartes !' },
    ],
  },
  {
    id: 'sables-3-apres', acteId: 'acte-5', etageId: 'sables-3', moment: 'apres', titre: 'Qui signe ?', lieu: 'La Tour des Sables · Le mécanisme du Portail', decor: 'sables', figure: 'mahieddine', choix: 'choix-portail',
    resume: 'L’Horloger du Zénith s’efface devant vous. Le mécanisme de l’Astrolabe et les battants du portail attendent votre décision : Ouvrir le portail, Tenir et faire monter la ville, ou Prendre la place du Grand Horloger.',
    repliques: [
      { personnage: 'horloger-zenith', texte: 'Le balancier s’incline. Pour la première fois depuis neuf cycles, le droit de signer appartient à ceux qui sont montés.' },
      { personnage: 'feriel', texte: 'Si nous ouvrons le portail, le sable retombe pour toujours… et Bab El affrontera debout, les yeux ouverts, ce qui passe le seuil.' },
      { personnage: 'boualem', texte: 'Si nous tenons le portail fermé, nous pouvons faire monter la ville ensemble, au grand jour, avec le Souk et les citernes.' },
      { personnage: 'mahieddine', texte: 'Et si quelqu’un s’assoit à cette table après avoir lu les neuf registres et retenu chaque nom… l’Astrolabe peut enfin s’arrêter. Le stylo est devant vous, Salem.' },
    ],
  },
];

function figerScenes(liste) {
  return Object.freeze(liste.map((scene) => Object.freeze({
    ...scene,
    repliques: Object.freeze(scene.repliques.map((ligne) => Object.freeze({
      ...ligne, ...(ligne.variantes ? { variantes: Object.freeze(ligne.variantes) } : {}),
    }))),
  })));
}

/** Les 10 scènes de l’Acte I (référence historique conservée pour les tests de l’épisode I). */
export const RPG_STORY_SCENES = figerScenes(scenesActe1);

/** Toutes les scènes de la campagne complète (Actes I à V : 40 scènes sur les 20 duels). */
export const RPG_STORY_ALL_SCENES = figerScenes([
  ...scenesActe1,
  ...scenesActe2,
  ...scenesActe3,
  ...scenesActe4,
  ...scenesActe5,
]);

export const RPG_STORY_ACTES = Object.freeze([
  Object.freeze({
    id: 'acte-1',
    numero: 1,
    romain: 'I',
    titre: 'Les absents',
    tourId: 'tour-des-listes',
    lieu: 'La Tour des Listes',
    resume: 'Faire reconnaître les douze survivants, obtenir un sursis auprès de Mahieddine et prouver que l’omission était un ordre.',
    etages: Object.freeze(['listes-1', 'listes-2', 'listes-3', 'listes-4', 'listes-5']),
    choixId: 'diffusion-liste',
    decor: 'atelier',
    figureFin: 'salem',
    epilogueTitre: 'Douze noms.\nUne porte ouverte.',
    epilogueLead: 'Ils ont un abri. Ils ont un sursis. Et leurs noms sont de nouveau sur la Liste.',
  }),
  Object.freeze({
    id: 'acte-2',
    numero: 2,
    romain: 'II',
    titre: 'Le prix d’un nom',
    tourId: 'tour-du-souk',
    lieu: 'La Tour du Souk',
    resume: 'Remonter la piste des convois détournés à travers les trente étals suspendus et gagner l’accès à l’ancienne écluse.',
    etages: Object.freeze(['souk-1', 'souk-2', 'souk-3', 'souk-4']),
    choixId: 'dette-souk',
    decor: 'souk',
    figureFin: 'reine-etals',
    epilogueTitre: 'Le Souk tient parole.\nL’écluse est ouverte.',
    epilogueLead: 'Les marchands protègent l’atelier de Fériel et la trappe de bronze s’ouvre vers les citernes basses.',
  }),
  Object.freeze({
    id: 'acte-3',
    numero: 3,
    romain: 'III',
    titre: 'Ce que l’eau conserve',
    tourId: 'tour-des-abysses',
    lieu: 'La Tour des Abysses',
    resume: 'Plonger dans les citernes englouties avec Boualem, entendre son aveu sur l’étage 2 et repêcher l’astrolabe du premier Horloger.',
    etages: Object.freeze(['abysses-1', 'abysses-2', 'abysses-3', 'abysses-4']),
    choixId: 'aveu-boualem',
    decor: 'citerne',
    figureFin: 'boualem',
    epilogueTitre: 'L’eau a parlé.\nCap vers le Nord.',
    epilogueLead: 'Le coffre du fond a livré sa plaque gravée : les traités originaux du portail reposent dans la glace.',
  }),
  Object.freeze({
    id: 'acte-4',
    numero: 4,
    romain: 'IV',
    titre: 'Le serment gelé',
    tourId: 'tour-du-fjord',
    lieu: 'La Tour du Fjord',
    resume: 'Franchir les boucliers du Nord et déchiffrer dans les stèles des Neuf Hivers la vérité sur la quarantaine de Bab El.',
    etages: Object.freeze(['fjord-1', 'fjord-2', 'fjord-3', 'fjord-4']),
    choixId: 'serment-archives',
    decor: 'fjord',
    figureFin: 'yamina',
    epilogueTitre: 'Verrouillé de l’intérieur.\nLe sceau est à vous.',
    epilogueLead: 'Yamina et Salem détiennent le sceau boréal et la vérité complète sur l’Astrolabe. La Tour des Sables attend.',
  }),
  Object.freeze({
    id: 'acte-5',
    numero: 5,
    romain: 'V',
    titre: 'Qui signe ?',
    tourId: 'tour-des-sables',
    lieu: 'La Tour des Sables',
    resume: 'Gravissez les marches du portail avec tous vos compagnons, affrontez l’Horloger du Zénith et choisissez l’avenir de Bab El.',
    etages: Object.freeze(['sables-1', 'sables-2', 'sables-3']),
    choixId: 'choix-portail',
    decor: 'sables',
    figureFin: 'mahieddine',
    epilogueTitre: 'La Dernière Liste.\nBab El a choisi.',
    epilogueLead: 'Le droit de contestation a été mené jusqu’au sommet. Le destin du portail et de la ville est désormais scellé.',
  }),
]);

export function acteHistoire(acteId) {
  return RPG_STORY_ACTES.find((acte) => acte.id === acteId) ?? null;
}

export function acteSuivantHistoire(acteId) {
  const index = RPG_STORY_ACTES.findIndex((acte) => acte.id === acteId);
  return index >= 0 && index < RPG_STORY_ACTES.length - 1 ? RPG_STORY_ACTES[index + 1] : null;
}

export function scenesPourActe(acteId) {
  return RPG_STORY_ALL_SCENES.filter((scene) => scene.acteId === acteId);
}

export function sceneHistoire(id) {
  return RPG_STORY_ALL_SCENES.find((scene) => scene.id === id) ?? null;
}

export function questionChoix(choixId) {
  return RPG_STORY_CHOICES[choixId] ?? null;
}

export function optionChoix(choixId, optionId) {
  return RPG_STORY_CHOICES[choixId]?.options.find((option) => option.id === optionId) ?? null;
}

export function texteReplique(replique, choix = {}) {
  if (replique?.texte) return replique.texte;
  if (!replique?.variantes) return '';
  const cle = replique.choixCle ?? 'diffusion-liste';
  const choisie = choix?.[cle];
  if (choisie && replique.variantes[choisie]) return replique.variantes[choisie];
  if (choix?.['diffusion-liste'] && replique.variantes[choix['diffusion-liste']]) {
    return replique.variantes[choix['diffusion-liste']];
  }
  return Object.values(replique.variantes)[0] ?? '';
}

export function choixListe(optionId) {
  return RPG_STORY_LIST_CHOICE.options.find((option) => option.id === optionId) ?? null;
}

export function texteEpilogueActe(acteId, choix = {}) {
  const acte = acteHistoire(acteId) ?? acteHistoire('acte-1');
  if (acteId === 'acte-2') {
    return {
      lieu: `Acte II terminé · ${acte.lieu}`,
      titre: acte.epilogueTitre,
      chapeau: acte.epilogueLead,
      conclusion: choix['dette-souk'] === 'denoncer'
        ? 'Les faux bons de réquisition ont été affichés dans tout le Souk. Les courtiers ont ouvert leurs réserves et la Reine des étals vous a confié la clef des citernes.'
        : 'Les réserves partagées par l’atelier de Fériel ont libéré les porteurs de leur dette. La Reine des étals vous a remis la clef de l’écluse vers les Abysses.',
      note: 'L’Acte III vous attend dans la Tour des Abysses : descendez avec Boualem sous le Réservoir.',
    };
  }
  if (acteId === 'acte-3') {
    return {
      lieu: `Acte III terminé · ${acte.lieu}`,
      titre: acte.epilogueTitre,
      chapeau: acte.epilogueLead,
      conclusion: choix['aveu-boualem'] === 'exiger-temoignage'
        ? 'Boualem a signé sa confession officielle dans le carnet de Salem : l’ordre d’inondation de l’étage 2 et la plaque du fond sont désormais irréfutables.'
        : 'Entouré de la confiance du groupe, Boualem a guidé l’expédition jusqu’au coffre du Léviathan et remonté la plaque gravée des Neuf Hivers.',
      note: 'L’Acte IV s’ouvre dans la Tour du Fjord : déchiffrez le serment gelé des premiers Horlogers.',
    };
  }
  if (acteId === 'acte-4') {
    return {
      lieu: `Acte IV terminé · ${acte.lieu}`,
      titre: acte.epilogueTitre,
      chapeau: acte.epilogueLead,
      conclusion: choix['serment-archives'] === 'sceller'
        ? 'Vous avez refermé la chambre froide après avoir compris le verrouillage intérieur du portail, gardant toutes vos forces pour l’ascension finale des Sables.'
        : 'Vous avez lu les tables de givre jusqu’au tout premier cycle : aucun habitant sacrifié pour maintenir la quarantaine n’est resté sans nom.',
      note: 'L’Acte V vous mène au sommet de la Tour des Sables, devant le portail et le Grand Horloger.',
    };
  }
  if (acteId === 'acte-5') {
    if (choix['choix-portail'] === 'ouvrir') {
      return {
        lieu: 'Campagne terminée · Le Portail de Bab El',
        titre: 'Fin I — Ouvrir le portail.',
        chapeau: acte.epilogueLead,
        conclusion: 'Vous avez ouvert le portail. Le sable a cessé de monter ; Bab El, debout, armée et rassemblée autour de Salem, Yamina et Fériel, fait face à ce qui franchit le seuil.',
        note: 'Les neuf registres sont complets dans votre journal. Vous pouvez relire chaque scène ou explorer librement les cinq tours.',
      };
    }
    if (choix['choix-portail'] === 'prendre-la-place') {
      return {
        lieu: 'Campagne terminée · La Chambre des Heures',
        titre: 'Fin III — Prendre la place.',
        chapeau: acte.epilogueLead,
        conclusion: '« Vous n’aviez pas à porter ça tout seul. » Assis à la table du Grand Horloger, le stylo en main et chaque absent nommé, vous avez arrêté l’Astrolabe.',
        note: 'Les neuf registres sont complets dans votre journal. Vous pouvez relire chaque scène ou explorer librement les cinq tours.',
      };
    }
    return {
      lieu: 'Campagne terminée · Les Terrasses de Bab El',
      titre: 'Fin II — Tenir ensemble.',
      chapeau: acte.epilogueLead,
      conclusion: 'Vous avez maintenu le portail fermé et organisé la montée collective de Bab El avec le Souk, l’atelier et les citernes : on ne gagne pas d’un coup, mais la ville dure ensemble.',
      note: 'Les neuf registres sont complets dans votre journal. Vous pouvez relire chaque scène ou explorer librement les cinq tours.',
    };
  }
  return {
    lieu: 'Épisode I terminé · La Tour des Listes',
    titre: 'Douze noms. Une porte ouverte.',
    chapeau: 'Ils ont un abri. Ils ont un sursis. Et leurs noms sont de nouveau sur la Liste.',
    conclusion: choix['diffusion-liste'] === 'publique'
      ? 'Le Souk les a accueillis à découvert. La Scribe témoignera devant la Chambre : les noms ont désormais des témoins.'
      : 'Tarek les a conduits à l’atelier par l’escalier de service. Les témoins sont protégés, même si la ville ignore encore leur histoire.',
    note: 'La suite du dossier s’ouvre dans l’Acte II (La Tour du Souk). Les cinq tours restent également accessibles en duels libres.',
  };
}

export const RPG_STORY_REGISTRES = Object.freeze([
  Object.freeze({
    id: 'registre-ecrou-4sud',
    acteId: 'acte-1',
    sceneId: 'listes-1-apres',
    etageId: 'listes-1',
    cote: 'REG-I · CH-IV-09',
    titre: 'Extrait d’écrou · Secteur 4-Sud',
    lieu: 'Greffe du premier palier',
    texte: '« Quartier 4-Sud : évacuation achevée la veille au soir, dossier clos. » Aucune des douze personnes remontées par Salem ne figure au manifeste de sortie.',
  }),
  Object.freeze({
    id: 'registre-bordereau-article9',
    acteId: 'acte-1',
    sceneId: 'listes-2-apres',
    etageId: 'listes-2',
    cote: 'REG-II · CH-GREFFE-12',
    titre: 'Bordereau de contestation · Article 9',
    lieu: 'Greffe des évacuations',
    texte: 'Copie certifiée des douze noms omis, obtenue par droit de contestation auprès de la Scribe de la Liste.',
    variantes: Object.freeze({
      publique: 'Copie certifiée par la Scribe et affichée aux piliers du Souk. Les douze noms sont désormais connus de la ville haute ; la Chambre a convoqué la greffière.',
      confiee: 'Copie certifiée par la Scribe et remise sous pli scellé à Tarek. Les témoins sont avertis en secret sans exposer la greffière.',
    }),
  }),
  Object.freeze({
    id: 'registre-cruches-citerne',
    acteId: 'acte-1',
    sceneId: 'listes-3-apres',
    etageId: 'listes-3',
    cote: 'REG-III · CIT-III-00',
    titre: 'Livre des cruches · Citernes basses',
    lieu: 'Archives des citernes',
    texte: 'Relevé du Puisatier des Cendres : zéro cruche tirée, zéro convoi enregistré pour le secteur 4-Sud. La Chambre n’a pas égaré l’évacuation : elle ne l’a jamais envoyée.',
  }),
  Object.freeze({
    id: 'registre-clef-atelier',
    acteId: 'acte-1',
    sceneId: 'listes-4-apres',
    etageId: 'listes-4',
    cote: 'REG-IV · SOUK-HAUT-04',
    titre: 'Acte d’abri · Verrerie de Fériel',
    lieu: 'Atelier du Souk haut',
    texte: 'Fériel ouvre son atelier de soufflage aux douze habitants du secteur 4-Sud. Un toit réel existe désormais pour appuyer la demande de réinscription.',
  }),
  Object.freeze({
    id: 'registre-sursis-horloger',
    acteId: 'acte-1',
    sceneId: 'listes-5-apres',
    etageId: 'listes-5',
    cote: 'REG-V · CH-SOMMET-01',
    titre: 'Sursis & Laissez-passer des Archives',
    lieu: 'Chambre des Heures',
    texte: 'Signé de la main de Mahieddine : les douze inscriptions sont rétablies jusqu’à la prochaine révision, l’atelier de Fériel est reconnu comme refuge et les anciens dossiers de Bab El sont ouverts.',
  }),
  Object.freeze({
    id: 'registre-manifeste-souk',
    acteId: 'acte-2',
    sceneId: 'souk-4-apres',
    etageId: 'souk-4',
    cote: 'REG-VI · SOUK-ECLUSE-02',
    titre: 'Manifeste des convois & Clef de l’écluse',
    lieu: 'Haute terrasse du Souk',
    texte: 'Les bordereaux des facteurs prouvent que des rations continuaient de descendre vers les galeries scellées. La Reine des étals ouvre la trappe des citernes.',
  }),
  Object.freeze({
    id: 'registre-ordre-noyade',
    acteId: 'acte-3',
    sceneId: 'abysses-4-apres',
    etageId: 'abysses-4',
    cote: 'REG-VII · ABY-VANNE-02',
    titre: 'Ordre d’immersion du Réservoir · Étage 2',
    lieu: 'Fosse du Léviathan',
    texte: 'Décret du septième Grand Horloger contresigné par Boualem : l’étage 2 a été inondé volontairement pour sceller une brèche sous le portail.',
  }),
  Object.freeze({
    id: 'registre-pacte-neuf-hivers',
    acteId: 'acte-4',
    sceneId: 'fjord-4-apres',
    etageId: 'fjord-4',
    cote: 'REG-VIII · FJORD-STELE-09',
    titre: 'Traité de quarantaine des Neuf Hivers',
    lieu: 'Trône des Neuf Hivers',
    texte: 'Gravé dans la glace boréale : le portail n’est pas brisé, il est verrouillé de l’intérieur. Chaque étage repris par le sable sert de contrepoids à la serrure.',
  }),
  Object.freeze({
    id: 'registre-sceau-portail',
    acteId: 'acte-5',
    sceneId: 'sables-3-apres',
    etageId: 'sables-3',
    cote: 'REG-IX · ZENITH-00',
    titre: 'Registre du Premier Horloger & Sceau du Zénith',
    lieu: 'Sous l’Astrolabe',
    texte: 'Le neuvième et dernier registre de Bab El : il consigne les noms de tous les étages et remet le balancier de l’Astrolabe entre les mains de ceux qui ont contesté la Liste.',
  }),
]);

export function texteRegistre(registre, choix = {}) {
  const cle = registre?.choixCle ?? 'diffusion-liste';
  return registre?.variantes?.[choix?.[cle]] ?? registre?.texte ?? '';
}

export function registresDebloques(recit) {
  const vues = new Set(recit?.scenesVues ?? []);
  return RPG_STORY_REGISTRES.filter((registre) => vues.has(registre.sceneId));
}

export function statutSurvivantsHistoire(recit) {
  const vues = new Set(recit?.scenesVues ?? []);
  const voie = recit?.choix?.['diffusion-liste'];
  const portail = recit?.choix?.['choix-portail'];
  if (vues.has('sables-3-apres')) {
    return {
      etape: portail === 'ouvrir'
        ? 'Portail ouvert · Citoyens libres de Bab El'
        : portail === 'prendre-la-place'
          ? 'Astrolabe arrêté · Protégés par le nouveau Grand Horloger'
          : 'Montée collective · Logés dans les étages hauts',
      resume: 'Aïcha, Nassim, Lila et les neuf autres habitants participent désormais à l’avenir choisi pour Bab El.',
    };
  }
  if (vues.has('souk-4-apres')) {
    return {
      etape: 'Protégés par l’alliance du Souk et de l’atelier',
      resume: 'La Reine des étals et Amani fournissent pain, lampes et école aux douze survivants pendant votre descente.',
    };
  }
  if (vues.has('listes-5-apres')) {
    return {
      etape: 'Sursis signé · À l’abri chez Fériel',
      resume: voie === 'publique'
        ? 'Les douze noms sont réinscrits sur la Liste et le Souk veille sur l’atelier.'
        : 'Les douze noms sont réinscrits sur la Liste et Tarek a sécurisé leur refuge.',
    };
  }
  if (vues.has('listes-4-apres')) {
    return {
      etape: 'Refuge ouvert · En attente du sursis',
      resume: 'Fériel a confié la clé de son atelier ; il reste à obtenir la signature de Mahieddine.',
    };
  }
  if (vues.has('listes-1-apres')) {
    return {
      etape: 'Sous la voûte du premier palier',
      resume: 'Le Guetteur leur a donné de l’eau en attendant la réouverture du dossier.',
    };
  }
  return {
    etape: 'Au seuil de la Tour des Listes',
    resume: 'Sans inscription au registre, les portes de la ville haute leur restent fermées.',
  };
}
