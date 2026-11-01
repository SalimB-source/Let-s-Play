/**
 * L'assistant de création assistée — le wizard en trois pas de l'atelier.
 *
 * Le parcours commence par une **invite de texte** : le jeu demande quel type
 * de deck le joueur veut, et il répond comme il parlerait —
 *
 *   « un deck viking neige ténèbres, avec quelques sorts de contrôle »
 *
 * L'IA de l'atelier (`rpgDeckIntention.js`, lecture pure et hors ligne) traduit
 * la phrase en **intention** : les couleurs, le thème (les Vikings du
 * catalogue, donc leurs tribus et leurs cartes de goût), le style et son
 * intensité, les effets voulus, les familles dites, les refus, les cartes
 * nommées. L'assistant **montre sa lecture** — puces et alertes — avant de
 * rien générer : ce qui n'est pas reconnu est dit, jamais deviné en silence.
 *
 * Les trois étapes restent accessibles :
 *
 *   1. **Votre idée** — l'invite de texte, ses exemples cliquables, la lecture ;
 *   2. **Les couleurs** — 1 à 3 des cinq éléments, pré-remplies par la lecture ;
 *   3. **Le style de jeu** — aggro, contrôle ou mix (`RPG_STYLES_JEU`,
 *      `rpgDeckAuto.js`), pré-rempli lui aussi.
 *
 * « Générer le deck » appelle `onGenerer({ couleurs, style, intention })` : le
 * moteur (`genererDeckAssiste`) compose alors trente cartes — ou un brouillon
 * si la collection ne suffit pas — uniquement avec des cartes possédées, en
 * servant d'abord le thème demandé, puis les sorts et les armes qui vont avec.
 * Le deck généré atterrit dans l'atelier manuel, où chaque carte reste
 * retouchable. Qui préfère tout choisir à la main passe l'invite d'un clic
 * (« Choisir moi-même »).
 *
 * Composant présentationnel : pas de persistance ici. Il annonce en revanche
 * la taille maximale que la collection permet pour les couleurs retenues,
 * pour ne pas promettre un deck de 30 cartes qu'il ne pourrait pas tenir.
 */

import { useMemo, useState } from 'react';
import {
  RPG_DUEL_CARDS,
  RPG_ELEMENTS,
  cardColors,
  carteJouableSansTerrain,
} from './rpgCards.js';
import { plafondVisible } from './rpgCollection.js';
import { RPG_STYLES_JEU, profilStyle } from './rpgDeckAuto.js';
import {
  RPG_DEMANDES_EXEMPLES,
  RPG_LABELS_EFFETS,
  RPG_LABELS_FAMILLES,
  lireIntention,
  verifierIntention,
} from './rpgDeckIntention.js';

const GLYPHS = { braise: '🔥', eau: '💧', sable: '⏳', neige: '❄️', tenebres: '💀' };
const COULEUR_LABELS = { braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige', tenebres: 'Ténèbres' };

/** Étapes du wizard, dans l'ordre — l'en-tête les montre comme un fil. */
const ETAPES = [
  { id: 'idee', label: 'Votre idée', titre: 'Quel type de deck voulez-vous ?' },
  { id: 'couleurs', label: 'Couleurs', titre: 'Vos couleurs' },
  { id: 'style', label: 'Style de jeu', titre: 'Votre style de jeu' },
];

/**
 * Le catalogue lu par l'IA : les cartes jouables du duel et leurs couleurs.
 * Constant, parce que la lecture ne dépend ni du compte ni de la partie.
 */
const CATALOGUE = {
  cartes: RPG_DUEL_CARDS.filter((carte) => carteJouableSansTerrain(carte)),
  couleursDe: cardColors,
};

/** La demande la plus courte qui vaille d'être lue. */
const DEMANDE_MINIMALE = 3;

/** L'invite de texte, en une ligne de consigne. */
export const RPG_ASSISTANT_INVITE = 'Décrivez le deck que vous voulez — je cherche les cartes pour vous.';

export function RpgDeckAssistant({
  collection = [],
  exemplaires = null,
  onGenerer,
  onFermer,
  surSfx = () => {},
}) {
  const [etape, setEtape] = useState('idee');
  const [demande, setDemande] = useState('');
  const [lecture, setLecture] = useState(null);
  const [couleurs, setCouleurs] = useState(() => new Set());
  const [style, setStyle] = useState('');
  const [message, setMessage] = useState('');

  const rangEtape = ETAPES.findIndex((entree) => entree.id === etape);

  /**
   * Le potentiel de génération des couleurs retenues : le nombre de
   * références possédées et le total d'exemplaires alignables (le stock
   * payé borne chaque carte, pas le seul quota de rareté).
   */
  const potentiel = useMemo(() => {
    if (!couleurs.size) return { references: 0, copies: 0 };
    const retenues = CATALOGUE.cartes.filter((carte) => {
      if (!collection.includes(carte.id)) return false;
      return cardColors(carte).every((couleur) => couleurs.has(couleur));
    });
    const copies = retenues.reduce(
      (total, carte) => total + plafondVisible(collection, carte.id, exemplaires),
      0,
    );
    return { references: retenues.length, copies };
  }, [couleurs, collection, exemplaires]);

  /**
   * L'IA lit la demande : `lireIntention` traduit les mots, puis
   * `verifierIntention` les confronte au catalogue et à la collection — c'est
   * elle qui déduit les couleurs manquantes, écarte un thème impossible et
   * rend les `alertes` affichées sous les puces.
   */
  const interroger = () => {
    const texte = demande.trim();
    if (texte.length < DEMANDE_MINIMALE) {
      surSfx('erreur');
      setMessage('Décrivez votre deck en quelques mots — par exemple « un deck viking neige ténèbres, avec quelques sorts de contrôle ».');
      return;
    }
    setMessage('');
    const { intention, alertes } = verifierIntention(lireIntention(texte, CATALOGUE), {
      catalogue: CATALOGUE,
      collection,
    });
    setLecture({ intention, alertes });
    setCouleurs(new Set(intention.couleurs));
    setStyle(intention.style || '');
    surSfx('apparition');
  };

  /**
   * L'intention au moment de générer : les couleurs et le style retenus à
   * l'écran gagnent sur la lecture (le joueur peut les avoir retouchés), et la
   * vérification repasse — un thème qui ne tient plus dans les couleurs
   * choisies tombe, plutôt que de peser sur un deck qui n'en a pas.
   */
  const intentionCourante = () => {
    if (!lecture) return null;
    const { intention } = verifierIntention(
      { ...lecture.intention, couleurs: [...couleurs], style: style || lecture.intention.style },
      { catalogue: CATALOGUE, collection },
    );
    return intention;
  };

  const basculerCouleur = (couleur) => {
    setMessage('');
    setCouleurs((actuelles) => {
      const suivant = new Set(actuelles);
      if (suivant.has(couleur)) suivant.delete(couleur);
      else if (suivant.size >= 3) {
        surSfx('erreur');
        setMessage('Trois couleurs au plus : le format du duel n’en autorise pas davantage.');
        return actuelles;
      } else suivant.add(couleur);
      return suivant;
    });
  };

  const choisirStyle = (id) => {
    surSfx('menu');
    setMessage('');
    setStyle(id);
  };

  const versCouleurs = () => {
    surSfx('menu');
    setMessage('');
    setEtape('couleurs');
  };

  const versStyle = () => {
    if (!couleurs.size) {
      surSfx('erreur');
      setMessage('Choisissez d’abord au moins une couleur.');
      return;
    }
    surSfx('menu');
    setEtape('style');
  };

  const generer = () => {
    if (!couleurs.size) {
      surSfx('erreur');
      setMessage('Choisissez au moins une couleur pour lancer la génération.');
      return;
    }
    if (!style) {
      surSfx('erreur');
      setMessage('Choisissez un style de jeu pour lancer la génération.');
      return;
    }
    surSfx('apparition');
    onGenerer({ couleurs: [...couleurs], style, intention: intentionCourante() });
  };

  /** Générer depuis l'invite : la lecture suffit, le style absent retombe sur `mix`. */
  const genererDepuisIdee = () => {
    if (!lecture) return;
    if (!lecture.intention.couleurs.length) {
      surSfx('erreur');
      setMessage('Je n’ai reconnu aucune couleur : précisez-les dans votre demande, ou choisissez-les à l’étape suivante.');
      return;
    }
    surSfx('apparition');
    onGenerer({
      couleurs: [...lecture.intention.couleurs],
      style: lecture.intention.style || 'mix',
      intention: lecture.intention,
    });
  };

  const collectionTropJuste = couleurs.size > 0 && potentiel.copies < 30;

  return (
    <section className="rpg-assistant" aria-label="Création assistée de deck">
      <header className="rpg-assistant__header">
        <div>
          <span className="rpg-mode-menu__eyebrow">ATELIER · CRÉATION ASSISTÉE</span>
          <h3>{ETAPES[rangEtape].titre}</h3>
          <p className="rpg-assistant__aide">
            {etape === 'idee' && 'Répondez en une phrase : l’atelier lit les couleurs, le thème et le plan de jeu, puis compose avec vos cartes.'}
            {etape === 'couleurs' && 'Une à trois couleurs : le deck ne sortira jamais de cette identité.'}
            {etape === 'style' && 'Choisissez un plan de jeu : le moteur compose ensuite avec les cartes que vous possédez.'}
          </p>
        </div>
        <button type="button" className="rpg-menu-link" onClick={() => { surSfx('annuler'); onFermer(); }}>
          ✕ Annuler
        </button>
      </header>

      <ol className="rpg-assistant__fil" aria-label="Étapes de la création assistée">
        {ETAPES.map((entree, index) => (
          <li
            key={entree.id}
            className={index === rangEtape ? 'is-courante' : index < rangEtape ? 'is-faite' : ''}
            aria-current={index === rangEtape ? 'step' : undefined}
          >
            <i aria-hidden="true">{index < rangEtape ? '✓' : index + 1}</i>
            {entree.label}
          </li>
        ))}
      </ol>

      {message && <p className="rpg-assistant__message" role="status" aria-live="polite">{message}</p>}

      {etape === 'idee' && (
        <div className="rpg-assistant__idee">
          <label className="rpg-assistant__invite-titre" htmlFor="rpg-assistant-demande">
            {RPG_ASSISTANT_INVITE}
          </label>
          <textarea
            id="rpg-assistant-demande"
            className="rpg-assistant__invite"
            rows={3}
            maxLength={240}
            value={demande}
            placeholder="Ex. : un deck viking neige ténèbres, avec quelques sorts de contrôle"
            onChange={(evenement) => {
              setDemande(evenement.target.value);
              setMessage('');
              // Une demande retouchée n'est plus celle qui a été lue.
              if (lecture) setLecture(null);
            }}
            onKeyDown={(evenement) => {
              if (evenement.key === 'Enter' && (evenement.ctrlKey || evenement.metaKey)) interroger();
            }}
          />
          <div className="rpg-assistant__exemples">
            <span>Essayez :</span>
            {RPG_DEMANDES_EXEMPLES.map((exemple) => (
              <button
                key={exemple.id}
                type="button"
                className="rpg-assistant__exemple"
                title={exemple.texte}
                onClick={() => {
                  surSfx('menu');
                  setMessage('');
                  setLecture(null);
                  setDemande(exemple.texte);
                }}
              >
                {exemple.accroche}
              </button>
            ))}
          </div>

          {lecture && (
            <div className="rpg-assistant__lecture" aria-live="polite">
              <p className="rpg-assistant__lecture-titre">✦ Ce que j’ai compris</p>
              <ul className="rpg-assistant__puces">
                {lecture.intention.couleurs.map((couleur) => (
                  <li key={couleur} className={`rpg-assistant__puce rpg-assistant__puce--${couleur}`}>
                    <i aria-hidden="true">{GLYPHS[couleur] ?? '◇'}</i>
                    {COULEUR_LABELS[couleur]}
                  </li>
                ))}
                {lecture.intention.themes.map((theme) => (
                  <li key={theme.id} className="rpg-assistant__puce rpg-assistant__puce--theme">
                    <i aria-hidden="true">⚑</i>
                    {theme.label}
                    <small>{theme.possedees} possédée{theme.possedees > 1 ? 's' : ''}</small>
                  </li>
                ))}
                {lecture.intention.style && (
                  <li className="rpg-assistant__puce rpg-assistant__puce--style">
                    <i aria-hidden="true">{profilStyle(lecture.intention.style).icone}</i>
                    {profilStyle(lecture.intention.style).label}
                    <small>
                      {lecture.intention.poidsStyle < 1 ? 'léger' : lecture.intention.poidsStyle > 1 ? 'franc' : 'simple'}
                    </small>
                  </li>
                )}
                {lecture.intention.effets.map((effet) => (
                  <li key={effet} className="rpg-assistant__puce">
                    <i aria-hidden="true">✧</i>
                    {RPG_LABELS_EFFETS[effet] ?? effet}
                  </li>
                ))}
                {lecture.intention.familles.map((famille) => (
                  <li key={famille} className="rpg-assistant__puce">
                    <i aria-hidden="true">✧</i>
                    avec {RPG_LABELS_FAMILLES[famille] ?? famille}
                  </li>
                ))}
                {lecture.intention.exclusions.familles.map((famille) => (
                  <li key={`sans-${famille}`} className="rpg-assistant__puce rpg-assistant__puce--refus">
                    <i aria-hidden="true">✕</i>
                    sans {RPG_LABELS_FAMILLES[famille] ?? famille}
                  </li>
                ))}
                {lecture.intention.courbe && (
                  <li className="rpg-assistant__puce">
                    <i aria-hidden="true">⌒</i>
                    {lecture.intention.courbe === 'basse' ? 'courbe basse' : 'courbe haute'}
                  </li>
                )}
                {lecture.intention.signature.length > 0 && (
                  <li className="rpg-assistant__puce rpg-assistant__puce--signature">
                    <i aria-hidden="true">★</i>
                    {lecture.intention.signature.length} carte{lecture.intention.signature.length > 1 ? 's' : ''} nommée{lecture.intention.signature.length > 1 ? 's' : ''}
                  </li>
                )}
              </ul>
              {lecture.alertes.map((alerte) => (
                <p
                  key={alerte.texte}
                  className={`rpg-assistant__message rpg-assistant__message--${alerte.ton === 'alerte' ? 'alerte' : 'info'}`}
                >
                  {alerte.texte}
                </p>
              ))}
            </div>
          )}

          <p className="rpg-assistant__astuce">
            La lecture se fait sur cet appareil, sans réseau : le vocabulaire du jeu est connu du moteur, et ce qu’il
            ne reconnaît pas vous est dit plutôt que deviné.
          </p>
        </div>
      )}

      {etape === 'couleurs' && (
        <div className="rpg-assistant__couleurs" role="group" aria-label="Couleurs du deck">
          {RPG_ELEMENTS.map((couleur) => (
            <button
              key={couleur}
              type="button"
              className={`rpg-assistant__couleur rpg-assistant__couleur--${couleur}${couleurs.has(couleur) ? ' is-on' : ''}`}
              aria-pressed={couleurs.has(couleur)}
              aria-label={`Couleur ${COULEUR_LABELS[couleur]}`}
              onClick={() => { surSfx('menu'); basculerCouleur(couleur); }}
            >
              <i aria-hidden="true">{GLYPHS[couleur] ?? '◇'}</i>
              <strong>{COULEUR_LABELS[couleur]}</strong>
              <small>{couleurs.has(couleur) ? 'retenue' : 'choisir'}</small>
            </button>
          ))}
          <p className="rpg-assistant__astuce">Mono, duo ou tri : les cartes hybrides de vos couleurs sont aussi retenues.</p>
        </div>
      )}

      {etape === 'style' && (
        <>
          <p className="rpg-assistant__compteur" aria-live="polite">
            Couleurs retenues :{' '}
            <b>{[...couleurs].map((couleur) => COULEUR_LABELS[couleur]).join(' · ')}</b>
            {' · '}{potentiel.references} carte{potentiel.references > 1 ? 's' : ''} possédée{potentiel.references > 1 ? 's' : ''}
          </p>
          {lecture && (
            <p className="rpg-assistant__compteur">
              Demande lue : <b>{lecture.intention.resume}</b>
            </p>
          )}
          {collectionTropJuste && (
            <p className="rpg-assistant__message rpg-assistant__message--alerte" role="status">
              Votre collection de ces couleurs permet {potentiel.copies} cartes au plus : le deck généré sera un
              brouillon incomplet. Élargissez vos couleurs ou débloquez des cartes au Souk pour atteindre 30.
            </p>
          )}
          <div className="rpg-assistant__styles" role="group" aria-label="Style de jeu">
            {RPG_STYLES_JEU.map((profil) => (
              <button
                key={profil.id}
                type="button"
                className={`rpg-assistant__style rpg-assistant__style--${profil.id}${style === profil.id ? ' is-on' : ''}`}
                aria-pressed={style === profil.id}
                onClick={() => choisirStyle(profil.id)}
              >
                <i className="rpg-assistant__style-icone" aria-hidden="true">{profil.icone}</i>
                <strong>{profil.label}</strong>
                <small>{profil.accroche}</small>
                <span>{profil.description}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {collectionTropJuste && etape !== 'style' && (
        <p className="rpg-assistant__message rpg-assistant__message--alerte" role="status">
          Votre collection de ces couleurs permet {potentiel.copies} cartes au plus : le deck généré sera un
          brouillon incomplet. Élargissez vos couleurs ou débloquez des cartes au Souk pour atteindre 30.
        </p>
      )}

      <footer className="rpg-assistant__actions">
        {etape === 'idee' && !lecture && (
          <>
            <button type="button" className="rpg-menu-button" onClick={versCouleurs}>
              Choisir moi-même →
            </button>
            <button
              type="button"
              className="rpg-menu-button rpg-menu-button--primary"
              disabled={demande.trim().length < DEMANDE_MINIMALE}
              onClick={interroger}
            >
              ✦ Interroger l’IA
            </button>
          </>
        )}
        {etape === 'idee' && lecture && (
          <>
            <button
              type="button"
              className="rpg-menu-button"
              onClick={() => { surSfx('annuler'); setMessage(''); setLecture(null); }}
            >
              ↺ Changer la demande
            </button>
            <button type="button" className="rpg-menu-button" onClick={versCouleurs}>
              Ajuster →
            </button>
            <button
              type="button"
              className="rpg-menu-button rpg-menu-button--primary"
              disabled={!lecture.intention.couleurs.length}
              onClick={genererDepuisIdee}
            >
              ✦ Générer le deck
            </button>
          </>
        )}
        {etape === 'couleurs' && (
          <>
            <button
              type="button"
              className="rpg-menu-button"
              onClick={() => { surSfx('annuler'); setMessage(''); setEtape('idee'); }}
            >
              ← Retour
            </button>
            <button type="button" className="rpg-menu-button rpg-menu-button--primary" onClick={versStyle}>
              Continuer →
            </button>
          </>
        )}
        {etape === 'style' && (
          <>
            <button
              type="button"
              className="rpg-menu-button"
              onClick={() => { surSfx('annuler'); setMessage(''); setEtape('couleurs'); }}
            >
              ← Retour
            </button>
            <button
              type="button"
              className="rpg-menu-button rpg-menu-button--primary"
              disabled={!style}
              onClick={generer}
            >
              ✦ Générer le deck
            </button>
          </>
        )}
        <p className="rpg-atelier__statut" role="status">
          Le moteur n’emploie que vos cartes possédées, dans la limite de vos exemplaires. Rien n’est joué avant l’enregistrement.
        </p>
      </footer>
    </section>
  );
}

export default RpgDeckAssistant;
