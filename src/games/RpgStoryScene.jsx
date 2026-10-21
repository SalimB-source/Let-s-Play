import { useEffect, useRef, useState } from 'react';
import { cardById } from './rpgCards.js';
import { cartesReveleesParEtage } from './rpgCollection.js';
import { rpgSorcierPv } from './rpgDuel.js';
import { etageHistoireParId } from './rpgStoryTours.js';
import { acteCourantRecit, cleCurseurRecit } from './rpgStoryFlow.js';
import {
  MS_PAR_CARACTERE,
  chargerPreferencesLecture,
  delaiAutoLecture,
  mouvementReduit,
  preferencesLecture,
  sauverPreferencesLecture,
} from './rpgStoryLecture.js';
import { personnageEtage, personnageHistoire, placerPlateauHistoire, portraitHistoire, poseHistoire, standHistoire, RPG_STORY_DECORS } from './rpgStoryCast.js';
import {
  RPG_STORY_ALL_SCENES,
  acteHistoire,
  acteSuivantHistoire,
  questionChoix,
  sceneHistoire,
  scenesPourActe,
  texteEpilogueActe,
  texteReplique,
} from './rpgStoryScenes.js';

const BASE = import.meta.env.BASE_URL;

const LIBELLE_STYLE_IA = Object.freeze({
  equilibre: 'Équilibré',
  controle: 'Contrôle',
  prudent: 'Défensif',
  agressif: 'Offensif',
});

const LIBELLE_NIVEAU_IA = Object.freeze({
  recit: 'Initiation',
  normale: 'Gardien',
  veilleur: 'Veilleur',
});

export function StoryPortrait({ personnageId, cardArt, className = '' }) {
  const personnage = personnageHistoire(personnageId);
  const src = portraitHistoire(personnageId, BASE, cardArt);
  return src ? (
    <img className={`rpg-story-portrait ${className}`} src={src}
      alt={`Portrait de ${personnage.nom}`} data-personnage={personnage.id}
      style={{ objectPosition: personnage.position }} draggable="false" />
  ) : null;
}

export function StoryHeader({ onExit, onJournal, sonActif, onToggleSound }) {
  return (
    <header className="rpg-narrative__header">
      <button type="button" className="rpg-narrative__back" onClick={onExit} aria-label="Retour à l’histoire">
        <span aria-hidden="true">←</span> Histoire
      </button>
      <div className="rpg-narrative__brand"><span>LE SABLIER</span><small>LA DERNIÈRE LISTE</small></div>
      <nav className="rpg-narrative__tools" aria-label="Options du récit">
        {onJournal && <button type="button" onClick={onJournal}>Journal</button>}
        {onToggleSound && <button type="button" onClick={onToggleSound} aria-pressed={sonActif} aria-label={sonActif ? 'Couper le son' : 'Activer le son'}>{sonActif ? 'Son activé' : 'Son coupé'}</button>}
      </nav>
    </header>
  );
}

/**
 * Le personnage du plateau : son sprite détouré, **dans la pose de la
 * situation** (affrontement avant le duel, décision, après-duel), ou le
 * portrait encadré en repli. Le repli sert quand le sprite n'existe pas encore
 * **et** quand le fichier ne se décode pas : jamais de carré cassé, jamais de
 * fond de détourage visible dans la scène.
 */
export function StoryStand({ personnageId, situation = null, cardArt }) {
  const personnage = personnageHistoire(personnageId);
  const stand = poseHistoire(personnageId, situation, BASE);
  const pose = situation && personnage.poses?.[situation] ? situation : null;
  const [illisible, setIllisible] = useState(false);
  if (!stand || illisible) {
    return (
      <div className="rpg-narrative__stand-cadre">
        <StoryPortrait personnageId={personnageId} cardArt={cardArt} />
      </div>
    );
  }
  return (
    <img key={stand} className="rpg-narrative__stand-img" src={stand} alt=""
      data-personnage={personnageId} data-pose={pose ?? undefined}
      loading="eager" draggable="false" onError={() => setIllisible(true)} />
  );
}

export function StoryStorageNotice({ sauvegardeOk }) {
  return sauvegardeOk ? null : <p className="rpg-narrative__warning" role="status">La sauvegarde sur cet appareil est indisponible. Vous pouvez continuer, mais cette progression ne sera pas conservée après fermeture.</p>;
}

function StoryRewards({ etageId, label = 'CE QUE L’ÉTAGE RÉVÈLE — À PRENDRE AU SOUK' }) {
  const cartes = cartesReveleesParEtage(etageId);
  if (!cartes.length) return null;
  return (
    <aside className="rpg-narrative__rewards" aria-label="Cartes révélées par l’étage">
      <span>{label}</span>
      <ul>{cartes.map((id) => <li key={id}>{cardById(id)?.name}</li>)}</ul>
    </aside>
  );
}

/** Le petit sablier de la scène : le sable du haut est ce qui reste à lire. */
function SablierScene({ total, consomme, enCours }) {
  if (!(total > 0)) return null;
  const chambre = 10.4;
  const niveau = Math.min(1, Math.max(0, consomme / total));
  return (
    <svg className="rpg-narrative__sablier" viewBox="0 0 24 32" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="rpg-sablier-haut"><polygon points="7,4.4 17,4.4 12.4,14.8 11.6,14.8" /></clipPath>
        <clipPath id="rpg-sablier-bas"><polygon points="11.6,17.2 12.4,17.2 17,27.6 7,27.6" /></clipPath>
      </defs>
      <rect x="4.8" y="2" width="14.4" height="1.7" rx=".85" fill="#8c7954" />
      <rect x="4.8" y="28.3" width="14.4" height="1.7" rx=".85" fill="#8c7954" />
      <g clipPath="url(#rpg-sablier-haut)">
        <rect className="rpg-narrative__sablier-sable" x="6" width="12"
          y={4.4 + chambre * niveau} height={Math.max(0, chambre * (1 - niveau))} />
      </g>
      <g clipPath="url(#rpg-sablier-bas)">
        <rect className="rpg-narrative__sablier-sable" x="6" width="12"
          y={27.6 - chambre * niveau} height={chambre * niveau} />
      </g>
      <path d="M6.5 3.7 L6.5 8 C6.5 11.6 10.9 13.8 10.9 16 C10.9 18.2 6.5 20.4 6.5 24 L6.5 28.3 L17.5 28.3 L17.5 24 C17.5 20.4 13.1 18.2 13.1 16 C13.1 13.8 17.5 11.6 17.5 8 L17.5 3.7 Z"
        fill="none" stroke="#8c7954" strokeWidth="1.1" strokeLinejoin="round" />
      {enCours && <rect className="rpg-narrative__sablier-grain" x="11.7" y="15.2" width=".7" height="1.6" rx=".35" />}
    </svg>
  );
}

/**
 * Le fil du récit : les répliques déjà lues de la scène, relisibles sans
 * toucher au curseur (une relecture n'est jamais une décision).
 */
function StoryFil({ scene, curseurActif, recit, onFermer }) {
  if (!scene) return null;
  const jusquA = curseurActif.resume ? scene.repliques.length : curseurActif.replique + 1;
  return (
    <div className="rpg-narrative__fil" role="dialog" aria-label="Fil du récit" data-story-fil>
      <button type="button" className="rpg-narrative__fil-fond" onClick={onFermer} aria-label="Fermer le fil du récit" tabIndex={-1} />
      <aside className="rpg-narrative__fil-panneau">
        <header className="rpg-narrative__fil-entete">
          <div className="rpg-narrative__fil-titre">
            <span>Fil du récit</span>
            <strong>{scene.titre}</strong>
          </div>
          <button type="button" className="rpg-narrative__fil-fermer" data-story-fil-close
            onClick={onFermer} aria-label="Fermer le fil du récit">✕</button>
        </header>
        <div className="rpg-narrative__fil-liste">
          <p className="rpg-narrative__fil-lieu">{scene.lieu}</p>
          {curseurActif.resume && (
            <div className="rpg-narrative__fil-item rpg-narrative__fil-item--actuel">
              <span style={{ color: personnageHistoire(scene.figure).couleur }}>Le fil du récit</span>
              <p>{scene.resume}</p>
            </div>
          )}
          {scene.repliques.slice(0, jusquA).map((ligne, index) => {
            const personnage = personnageHistoire(ligne.personnage);
            const actuel = !curseurActif.resume && index === curseurActif.replique;
            return (
              <div key={`${index}-${ligne.personnage}`}
                className={`rpg-narrative__fil-item${actuel ? ' rpg-narrative__fil-item--actuel' : ''}`}>
                <span style={{ color: personnage.couleur }}>{personnage.nom}</span>
                <p>{texteReplique(ligne, recit.choix)}</p>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

/**
 * La machine à écrire : présentation seule, jamais un verrou. Le texte complet
 * reste dans le DOM (la partie à venir est masquée) ; un clic ou une touche
 * l'affiche d'un bloc, et les commandes du récit restent actives pendant
 * l'écriture. `prefers-reduced-motion` reçoit toujours le texte d'un bloc.
 */
function useMachineAEcrire(cleLecture, texte, actif) {
  const [visibles, setVisibles] = useState(() => (actif ? 0 : texte.length));
  useEffect(() => {
    if (!actif || texte.length === 0) {
      setVisibles(texte.length);
      return undefined;
    }
    setVisibles(0);
    const debut = Date.now();
    const minuteur = setInterval(() => {
      const n = Math.min(texte.length, Math.ceil((Date.now() - debut) / MS_PAR_CARACTERE));
      setVisibles(n);
      if (n >= texte.length) clearInterval(minuteur);
    }, 30);
    return () => clearInterval(minuteur);
  }, [cleLecture, texte, actif]);
  const termine = visibles >= texte.length;
  return {
    visibles,
    termine,
    toutAfficher: () => setVisibles(texte.length),
  };
}

/** Lecteur du récit et briefing : ne crée jamais de duel à son montage. */
export default function RpgStoryScene({
  recit,
  etagesVaincus,
  deckNom,
  deckActifId = null,
  decksJouables = [],
  onSelectDeck = null,
  cardArt,
  onEvent,
  onStartDuel,
  onExit,
  onJournal,
  sauvegardeOk,
  sonActif,
  onToggleSound,
  onSfx = null,
}) {
  const lectureRef = useRef(null);
  const lecteurRef = useRef(null);
  const [relectureIntro, setRelectureIntro] = useState(null);
  const [lecture, setLecture] = useState(chargerPreferencesLecture);
  const [filOuvert, setFilOuvert] = useState(false);
  const [reduitMouvement] = useState(mouvementReduit);
  const cleScenePrecedente = useRef(null);
  const curseur = recit?.curseur;
  const cle = cleCurseurRecit(curseur);

  // Dérivés du confort de lecture — calculés avant tout retour, car la machine
  // à écrire, l'auto-lecture et le clavier ont besoin d'eux à chaque rendu.
  const sceneActive = curseur?.type === 'scene' ? sceneHistoire(curseur.id)
    : curseur?.type === 'duel' && relectureIntro ? sceneHistoire(`${curseur.etageId}-avant`) : null;
  const enRelecture = Boolean(sceneActive) && curseur?.type === 'duel';
  const curseurActifLecture = enRelecture ? relectureIntro : curseur;
  const ligneActive = sceneActive?.repliques[curseurActifLecture?.replique ?? 0];
  const texteLigne = sceneActive && !curseurActifLecture?.resume && curseur
    ? texteReplique(ligneActive, recit.choix) : null;
  const texteAffiche = curseurActifLecture?.resume ? sceneActive?.resume ?? '' : texteLigne ?? '';
  const machineActive = Boolean(texteLigne) && lecture.machine && !reduitMouvement;
  const cleLecture = `${sceneActive?.id ?? 'sans'}:${curseurActifLecture?.resume ? 'resume' : curseurActifLecture?.replique ?? 0}:${enRelecture ? 'relecture' : 'recit'}`;
  const cleScene = `${curseur?.type ?? 'vide'}:${sceneActive?.id ?? curseur?.etageId ?? curseur?.acteId ?? 'fin'}:${enRelecture ? 'relecture' : ''}`;
  const machine = useMachineAEcrire(cleLecture, texteAffiche, machineActive);
  const dansScene = Boolean(sceneActive) && !enRelecture;
  const derniereLecture = Boolean(sceneActive
    && (curseurActifLecture?.resume || curseurActifLecture?.replique === sceneActive.repliques.length - 1));
  const choixEnAttente = Boolean(dansScene && derniereLecture && sceneActive.choix);

  useEffect(() => { setRelectureIntro(null); }, [cle]);
  useEffect(() => { if (lecteurRef.current) lecteurRef.current.scrollTop = 0; }, [curseur?.type, curseur?.id, curseur?.etageId, curseur?.acteId, Boolean(relectureIntro)]);
  useEffect(() => { lectureRef.current?.focus({ preventScroll: true }); }, [cle, relectureIntro?.replique, relectureIntro?.resume]);

  const son = (nom) => { try { onSfx?.(nom); } catch { /* audio indisponible */ } };

  // Un page-turn quand on change de scène — pas à l'arrivée dans le lecteur.
  useEffect(() => {
    const precedente = cleScenePrecedente.current;
    cleScenePrecedente.current = cleScene;
    if (precedente !== null && precedente !== cleScene) son('page_turn');
  }, [cleScene]);

  // Auto-lecture : avance seule entre répliques d'une même scène — jamais vers
  // un duel, jamais dans un choix, jamais quand le fil est ouvert ou l'onglet caché.
  useEffect(() => {
    if (!lecture.auto || !dansScene || filOuvert || !machine.termine) return undefined;
    if (derniereLecture || choixEnAttente) return undefined;
    if (typeof document !== 'undefined' && document.hidden) return undefined;
    const minuteur = setTimeout(() => envoyer('continuer'), delaiAutoLecture(texteAffiche));
    return () => clearTimeout(minuteur);
  }, [lecture.auto, cleLecture, machine.termine, derniereLecture, choixEnAttente, filOuvert, cleScene]);

  // Clavier : Espace / Entrée / → révèlent le texte ou tournent la page ;
  // Échap referme le fil du récit. Les commandes focusées gardent la main.
  useEffect(() => {
    const surTouche = (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Escape') {
        if (filOuvert) setFilOuvert(false);
        return;
      }
      if (filOuvert) return;
      const cible = event.target;
      if (cible && typeof cible.closest === 'function'
        && cible.closest('button, select, input, textarea, a, summary, [contenteditable]')) return;
      if (![' ', 'Enter', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      if (machineActive && !machine.termine) {
        machine.toutAfficher();
        return;
      }
      if (dansScene && !choixEnAttente) envoyer('continuer');
    };
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [cle, filOuvert, machineActive, machine.termine, dansScene, choixEnAttente]);

  if (!recit) return null;
  const acteId = acteCourantRecit(recit);
  const acte = acteHistoire(acteId) ?? acteHistoire('acte-1');
  const acteSuivant = curseur.type === 'fin' ? acteSuivantHistoire(acte.id) : null;
  const scenesActe = scenesPourActe(acte.id);
  const scenesLuesActe = scenesActe.filter((item) => recit.scenesVues.includes(item.id)).length;
  const sceneIntroDuel = enRelecture ? sceneActive : null;
  const scene = sceneActive;
  const curseurActif = curseurActifLecture;
  const etageId = scene?.etageId ?? curseur.etageId;
  const etage = etageHistoireParId(etageId)?.etage;
  const ligne = scene?.repliques[curseurActif.replique];
  const personnageId = curseur.type === 'fin' ? 'salem'
    : !scene && curseur.type === 'duel' ? personnageEtage(etageId)
      : curseurActif.resume ? scene.figure : ligne?.personnage === 'narrateur' ? scene.figure : ligne?.personnage;
  const personnage = personnageHistoire(personnageId);
  const decorFin = acte.id === 'acte-2' ? 'souk' : acte.id === 'acte-3' ? 'abysses' : acte.id === 'acte-4' ? 'fjord' : acte.id === 'acte-5' ? 'sables' : 'atelier';
  const decor = RPG_STORY_DECORS[scene?.decor ?? (curseur.type === 'fin' ? decorFin : 'greffe')] ?? RPG_STORY_DECORS.greffe;
  const estDerniereSceneActe = Boolean(scene && scenesActe[scenesActe.length - 1]?.id === scene.id);
  const derniere = derniereLecture;
  const choixDef = choixEnAttente ? questionChoix(scene.choix) : null;
  const envoyer = (type, extra = {}) => onEvent({ type, curseur, ...extra });
  const epilogue = curseur.type === 'fin' ? texteEpilogueActe(acte.id, recit.choix) : null;
  const pvAdversaire = rpgSorcierPv(etage?.puissance ?? 0);
  const styleAdversaire = LIBELLE_STYLE_IA[etage?.ia?.style] ?? 'Équilibré';
  const niveauAdversaire = LIBELLE_NIVEAU_IA[etage?.ia?.niveau] ?? 'Gardien';

  const basculerPreference = (clePreference) => {
    son('blip');
    setLecture((avant) => {
      const apres = preferencesLecture({ ...avant, [clePreference]: !avant[clePreference] });
      sauverPreferencesLecture(apres);
      return apres;
    });
  };
  const tournerPage = () => {
    son('blip');
    envoyer('continuer');
  };
  const curseursReveles = machineActive ? Math.min(machine.visibles, texteAffiche.length) : texteAffiche.length;
  const partieVu = texteAffiche.slice(0, curseursReveles);
  const partieRestante = texteAffiche.slice(curseursReveles);
  const auParle = !curseurActif.resume && ligne?.personnage !== 'narrateur' && Boolean(texteLigne);
  // Mise en scène de roman visuel : DEUX personnages maximum par plan, ancrés
  // en bas de l'écran au premier plan — à gauche l'hôte de la scène, à droite
  // celui qui parle (ou son interlocuteur attitré quand l'hôte parle).
  const standActif = !scene ? null
    : curseurActif.resume ? scene.figure
      : ligne?.personnage && ligne.personnage !== 'narrateur' ? ligne.personnage : scene.figure;
  // L'ordre du récit (l'hôte, puis celui qui parle) donne les deux figures du
  // plan ; `placerPlateauHistoire` les échange si leurs regards peints les
  // tourneraient tous les deux vers le même bord de l'écran.
  const plateauScene = scene ? placerPlateauHistoire((() => {
    const presents = [...new Set([scene.figure, ...scene.repliques.map((item) => item.personnage)])]
      .filter((id) => id !== 'narrateur' && (portraitHistoire(id, BASE, cardArt) || standHistoire(id, BASE)));
    const actif = presents.includes(standActif) ? standActif : scene.figure;
    const interlocuteur = presents.find((id) => id !== actif) ?? actif;
    return actif === scene.figure ? [scene.figure, interlocuteur] : [scene.figure, actif];
  })()) : [];
  const flecheSuite = Boolean(scene && (machine.termine || !machineActive) && !derniere);
  // La situation du plateau : une décision posée au lecteur, le dernier
  // échange d'une scène d'avant-duel (on se met en garde), ou celui d'une
  // scène d'après-duel (les épaules redescendent). Hors de ces trois cas, les
  // personnages gardent leur pose de référence.
  const situationPose = !dansScene ? null
    : choixEnAttente ? 'choix'
      : derniereLecture ? (scene.moment === 'apres' ? 'apres' : 'duel') : null;

  return (
    <section ref={lecteurRef} className="rpg-narrative" data-story-cursor={curseur.id ?? curseur.etageId ?? curseur.acteId ?? 'fin'}
      data-story-act={acte.id}
      style={{ '--rpg-story-decor': `url("${BASE}${decor.fichier}")`, '--rpg-story-position': decor.position }}>
      <div className="rpg-narrative__decor" aria-hidden="true" />
      <div className="rpg-narrative__sable" aria-hidden="true" />
      <StoryHeader onExit={onExit} onJournal={onJournal} sonActif={sonActif} onToggleSound={onToggleSound} />
      <StoryStorageNotice sauvegardeOk={sauvegardeOk} />
      {scene ? (
        <main className="rpg-narrative__scene" style={{ '--rpg-story-speaker': personnage.couleur }}>
          <div className="rpg-narrative__cartouche">
            <p className="rpg-narrative__eyebrow">ACTE {acte.romain} <span aria-hidden="true">/</span> {acte.titre.toUpperCase()}</p>
            <div key={cleScene} className="rpg-narrative__entete">
              <p className="rpg-narrative__location">{sceneIntroDuel ? `${scene.lieu} · Relecture d’introduction` : scene.lieu}</p>
              <h1>{scene.titre}</h1>
            </div>
            <div className="rpg-narrative__lecture" role="group" aria-label="Confort de lecture">
              <button type="button" className="rpg-narrative__lecture-btn" data-story-fil-open
                aria-haspopup="dialog" onClick={() => { son('menu'); setFilOuvert(true); }}>
                Fil du récit
              </button>
              <button type="button" className="rpg-narrative__lecture-btn" data-story-toggle-machine
                aria-pressed={lecture.machine} onClick={() => basculerPreference('machine')}>
                Texte animé
              </button>
              <button type="button" className="rpg-narrative__lecture-btn" data-story-toggle-auto
                aria-pressed={lecture.auto} onClick={() => basculerPreference('auto')}>
                Auto-lecture
              </button>
            </div>
          </div>
          <div className="rpg-narrative__fenetre" aria-hidden="true">
            <div className="rpg-narrative__plateau">
              {plateauScene.map((id) => {
                const figurant = personnageHistoire(id);
                const stand = standHistoire(id, BASE);
                return (
                  <div key={id} data-personnage-stand={id}
                    className={`rpg-narrative__stand${id === standActif ? ' rpg-narrative__stand--actif' : ''}${stand ? ' rpg-narrative__stand--decoupe' : ''}`}
                    style={{ '--stand-couleur': figurant.couleur }}>
                    <StoryStand personnageId={id} situation={situationPose} cardArt={cardArt} />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rpg-narrative__boite">
            <div key={cleLecture} ref={lectureRef} tabIndex={-1}
              className={`rpg-narrative__dialogue${machineActive && !machine.termine ? ' rpg-narrative__dialogue--en-cours' : ''}`}
              onClick={machineActive && !machine.termine ? machine.toutAfficher : undefined}>
              <span className="rpg-narrative__speaker" style={{ color: personnage.couleur }}>{curseurActif.resume ? 'LE FIL DU RÉCIT' : personnageHistoire(ligne?.personnage).nom}</span>
              <p className={curseurActif.resume ? 'is-summary' : ''}>
                {partieVu}
                {partieRestante && <span aria-hidden="true">{partieRestante}</span>}
                {machineActive && !machine.termine && <span className="rpg-narrative__caret" aria-hidden="true">▍</span>}
              </p>
              {flecheSuite && <span className="rpg-narrative__suite" aria-hidden="true">▼</span>}
              <p className="rpg-narrative__sr" role="status">{personnageHistoire(curseurActif.resume ? scene.figure : ligne?.personnage).nom}. {texteAffiche}</p>
            </div>
          </div>
          {choixEnAttente && choixDef ? (
            <fieldset className="rpg-narrative__choices" data-story-choice-group={choixDef.id}>
              <legend>{choixDef.question}</legend>
              {choixDef.options.map((choix) => (
                <button key={choix.id} type="button" data-story-choice={choix.id}
                  onClick={() => { son('select'); envoyer('choisir', { optionId: choix.id }); }}>
                  <strong>{choix.titre}<span aria-hidden="true">↗</span></strong><small>{choix.consequence}</small>
                </button>
              ))}
              <p>Mêmes duels et récompenses. Ce choix change les scènes et l’épilogue.</p>
            </fieldset>
          ) : (
            <div className="rpg-narrative__actions rpg-narrative__actions--scene">
              {sceneIntroDuel ? (
                <>
                  <button
                    type="button"
                    className="rpg-narrative-button"
                    data-story-replay-next
                    onClick={() => {
                      son('blip');
                      if (derniere) setRelectureIntro(null);
                      else setRelectureIntro((etat) => ({ ...etat, replique: etat.replique + 1 }));
                    }}
                  >
                    {derniere ? 'Revenir au briefing' : 'Continuer'} <span aria-hidden="true">→</span>
                  </button>
                  {!curseurActif.resume && !derniere && (
                    <button
                      type="button"
                      className="rpg-narrative-button rpg-narrative-button--quiet"
                      onClick={() => setRelectureIntro((etat) => ({ ...etat, resume: true }))}
                    >
                      Lire le résumé
                    </button>
                  )}
                  <button
                    type="button"
                    className="rpg-narrative-button rpg-narrative-button--quiet"
                    data-story-close-replay
                    onClick={() => setRelectureIntro(null)}
                  >
                    Fermer la relecture
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="rpg-narrative-button" data-story-next onClick={tournerPage}>
                    {derniere ? scene.moment === 'avant' ? 'Préparer le duel' : estDerniereSceneActe ? (acte.id === 'acte-5' ? 'Conclure le récit' : 'Terminer l’acte') : 'Poursuivre le récit' : 'Continuer'} <span aria-hidden="true">→</span>
                  </button>
                  {!curseur.resume && !derniere && <button type="button" className="rpg-narrative-button rpg-narrative-button--quiet" data-story-summary onClick={() => envoyer('resumer')}>Lire le résumé</button>}
                </>
              )}
            </div>
          )}
          {scene?.moment === 'apres' && <StoryRewards etageId={scene.etageId} />}
          <footer className="rpg-narrative__footer">
            <span className="rpg-narrative__footer-groupe">
              <SablierScene
                total={scene.repliques.length}
                consomme={curseurActif.resume ? scene.repliques.length : curseurActif.replique + 1}
                enCours={Boolean(dansScene && !derniere)}
              />
              {curseurActif.resume ? 'RÉSUMÉ DE LA SCÈNE' : `RÉPLIQUE ${curseurActif.replique + 1} / ${scene.repliques.length}`}
            </span>
            <span>{scenesLuesActe} / {scenesActe.length} SCÈNES LUES{acte.id !== 'acte-1' ? ` · ${recit.scenesVues.length} / ${RPG_STORY_ALL_SCENES.length} AU TOTAL` : ''}</span>
            <div className="rpg-narrative__progress" aria-hidden="true"><span style={{ width: `${100 * scenesLuesActe / scenesActe.length}%` }} /></div>
          </footer>
        </main>
      ) : (
        <main className="rpg-narrative__stage">
          <figure className={`rpg-narrative__portrait ${auParle ? 'rpg-narrative__portrait--parle' : 'rpg-narrative__portrait--ecoute'}`}
            style={{ '--rpg-story-speaker': personnage.couleur }}>
            <StoryPortrait key={personnageId} personnageId={personnageId} cardArt={cardArt} />
            <figcaption><span>{personnage.nom}</span><small>{personnage.fonction}</small></figcaption>
          </figure>
          <div className="rpg-narrative__page">
            <p className="rpg-narrative__eyebrow">ACTE {acte.romain} <span aria-hidden="true">/</span> {acte.titre.toUpperCase()}</p>
            <div ref={lectureRef} tabIndex={-1} className="rpg-narrative__reading" aria-label="Texte du récit">
              {curseur.type === 'duel' ? (
                <>
                  <p className="rpg-narrative__location">{acte.lieu} · Duel {acte.etages.indexOf(etageId) + 1} sur {acte.etages.length}</p>
                  <h1>Un droit à défendre.</h1>
                  <p className="rpg-narrative__lead">Affrontez {etage?.nom}. Une victoire ouvre la suite du récit.</p>
                  {etage?.note && <p className="rpg-narrative__tactic" data-story-tactic>{etage.note}</p>}
                  <dl className="rpg-narrative__duel-stats">
                    <div><dt>Adversaire</dt><dd data-story-duel-hp>{pvAdversaire} PV · puissance {etage?.puissance}</dd></div>
                    <div><dt>Profil tactique</dt><dd data-story-duel-profile>{styleAdversaire} · {niveauAdversaire}</dd></div>
                    <div>
                      <dt>Votre deck</dt>
                      <dd>
                        {decksJouables.length > 1 && onSelectDeck ? (
                          <select
                            className="rpg-narrative__deck-select"
                            data-story-deck-select
                            aria-label="Choisir votre deck pour ce duel"
                            value={deckActifId ?? decksJouables[0]?.id ?? ''}
                            onChange={(event) => onSelectDeck(event.target.value)}
                          >
                            {decksJouables.map((deck) => (
                              <option key={deck.id} value={deck.id}>{deck.name ?? deck.nom}</option>
                            ))}
                          </select>
                        ) : deckNom}
                      </dd>
                    </div>
                  </dl>
                  <p className="rpg-narrative__note">Deck complet, PV pleins. Aucune limite de temps. Un duel interrompu par la fermeture de la page recommence ; votre récit reste sauvegardé.</p>
                  {etagesVaincus.includes(etageId) && <p className="rpg-narrative__acquired">Vous avez déjà remporté ce duel. Vous pouvez continuer le récit sans le rejouer.</p>}
                </>
              ) : (
                <>
                  <p className="rpg-narrative__location">{epilogue?.lieu}</p>
                  <h1>{acte.id === 'acte-1' ? (<>Douze noms.<br />Une porte ouverte.</>) : epilogue?.titre}</h1>
                  <p className="rpg-narrative__lead">{epilogue?.chapeau}</p>
                  <p className="rpg-narrative__outcome">{epilogue?.conclusion}</p>
                  <p className="rpg-narrative__note">{epilogue?.note}</p>
                </>
              )}
            </div>

            <div className="rpg-narrative__actions">
              {curseur.type === 'duel' ? (
                <>
                  <button type="button" className="rpg-narrative-button" data-story-start-duel onClick={() => onStartDuel(etageId)}>{etagesVaincus.includes(etageId) ? 'Rejouer le duel' : 'Commencer le duel'} <span aria-hidden="true">→</span></button>
                  {etagesVaincus.includes(etageId) && <button type="button" className="rpg-narrative-button rpg-narrative-button--quiet" data-story-skip-duel onClick={() => envoyer('deja-vaincu', { etageId })}>Déjà remporté — continuer le récit</button>}
                  <button type="button" className="rpg-narrative-button rpg-narrative-button--quiet" data-story-replay-intro onClick={() => setRelectureIntro({ replique: 0, resume: false })}>Revoir la scène</button>
                </>
              ) : (
                <>
                  {acteSuivant && (
                    <button
                      type="button"
                      className="rpg-narrative-button"
                      data-story-next-act={acteSuivant.id}
                      onClick={() => envoyer('ouvrir-acte', { acteId: acteSuivant.id })}
                    >
                      Acte {acteSuivant.romain} — {acteSuivant.titre} <span aria-hidden="true">→</span>
                    </button>
                  )}
                  <button type="button" className={`rpg-narrative-button ${acteSuivant ? 'rpg-narrative-button--quiet' : ''}`} onClick={onJournal}>Ouvrir le journal {!acteSuivant && <span aria-hidden="true">→</span>}</button>
                  <button type="button" className="rpg-narrative-button rpg-narrative-button--quiet" onClick={onExit}>Retour aux tours</button>
                </>
              )}
            </div>
            {!scene && curseur.type === 'duel' && (
              <StoryRewards
                etageId={etageId}
                label={etagesVaincus.includes(etageId) ? 'CES CARTES SONT DÉJÀ AU SOUK' : 'ENJEU DU DUEL · CARTES À OUVRIR AU SOUK'}
              />
            )}
            <footer className="rpg-narrative__footer">
              <span>{curseur.type === 'fin' ? (acte.id === 'acte-1' ? 'FIN DE L’ÉPISODE I' : `FIN DE L’ACTE ${acte.romain}`) : 'AVANT LE DUEL'}</span>
              <span>{scenesLuesActe} / {scenesActe.length} SCÈNES LUES{acte.id !== 'acte-1' ? ` · ${recit.scenesVues.length} / ${RPG_STORY_ALL_SCENES.length} AU TOTAL` : ''}</span>
              <div className="rpg-narrative__progress" aria-hidden="true"><span style={{ width: `${100 * scenesLuesActe / scenesActe.length}%` }} /></div>
            </footer>
          </div>
        </main>
      )}
      {filOuvert && (
        <StoryFil scene={scene} curseurActif={curseurActif} recit={recit} onFermer={() => setFilOuvert(false)} />
      )}
    </section>
  );
}
