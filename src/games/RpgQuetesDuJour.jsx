/**
 * Les quêtes du jour, dans l'onglet Jouer — la colonne de droite du menu.
 *
 * C'est l'écran où le joueur décide de jouer : les trois quêtes du jour y sont
 * donc affichées **avant** la partie, avec leur barre, leur montant et leur
 * bouton. Réclamer ici paie exactement ce que paie le Souk — même geste du hook
 * (`reclamerUneQuete`), mêmes règles (`vueDeLaQuete`), même montant (le barème
 * de `rpgQuetes.js`). Le panneau ne calcule **rien** : il lit la vue partagée et
 * rend des gestes.
 *
 * Il complète la boucle au lieu de la résumer : le solde en bas avec sa pièce,
 * et le chemin vers le Souk (« ce que ces crédits achètent ») — parce qu'une
 * récompense qu'on ne peut pas dépenser ne donne envie de rien.
 *
 * Tactile d'abord : les boutons font 44 px, aucune information ne dépend d'un
 * survol, et le panneau passe sous le menu quand l'écran se resserre (la grille
 * de `.rpg-mode-menu__play` s'en charge — rien à faire ici).
 */
import { GAINS, creditsLisible } from './rpgCredits.js';
import {
  JOURS_DE_LA_SERIE, PALIERS, cachetDeLaSemaineDisponible, cachetDisponible,
  joursAvantLeCachetDeLaSemaine, quetesAReclamer, serieComplete, vueDeLaQuete,
} from './rpgQuetes.js';
import RpgCreditIcon from './RpgCreditIcon.jsx';
import RpgMarketIcon from './RpgMarketIcon.jsx';
import './rpg-quetes-jour.css';

/** Une quête du jour, telle que le panneau la montre : barre, montant, geste. */
function LigneQuete({ id, etatQuetes, onReclamer, onPlaySfx }) {
  const vue = vueDeLaQuete(etatQuetes, id);
  if (!vue) return null;
  const { quete, progres, reste, pourcent, reclamee, terminee, etat } = vue;
  const reclamer = () => {
    const gagne = onReclamer?.(id);
    onPlaySfx?.(gagne ? 'bell' : 'erreur');
  };
  return (
    <li className={`rpg-quests-jour__quete is-${etat}`} data-jouer-quete={id} data-jouer-quete-etat={etat}>
      <div className="rpg-quests-jour__quete-tete">
        <span className="rpg-quests-jour__palier">{PALIERS[quete.palier] ?? quete.palier}</span>
        <strong>{quete.titre}</strong>
        <span className="rpg-quests-jour__gain">
          +{quete.recompense} <RpgCreditIcon />
          <span className="sr-only">crédits</span>
        </span>
      </div>
      <p className="rpg-quests-jour__quete-texte">
        <span className="rpg-quests-jour__quete-texte-icone" aria-hidden="true">▶</span>
        {quete.texte}
      </p>
      <div
        className="rpg-quests-jour__jauge"
        role="progressbar"
        aria-label={`${quete.titre} : ${progres} sur ${quete.objectif}`}
        aria-valuenow={progres}
        aria-valuemin={0}
        aria-valuemax={quete.objectif}
        data-jouer-progres={`${progres}/${quete.objectif}`}
      >
        <span className="rpg-quests-jour__jauge-remplie" style={{ width: `${pourcent}%` }} aria-hidden="true" />
        <span className="rpg-quests-jour__jauge-texte">{progres} / {quete.objectif}</span>
      </div>
      {reclamee ? (
        <p className="rpg-quests-jour__pris" data-jouer-pris>Réclamée</p>
      ) : terminee ? (
        <button
          type="button"
          className="rpg-menu-button rpg-menu-button--primary rpg-quests-jour__reclamer"
          data-jouer-reclamer={id}
          title={`Encaisser ${quete.recompense} crédits`}
          onClick={reclamer}
        >
          Réclamer {quete.recompense} <RpgCreditIcon />
          <span className="sr-only">crédits</span>
        </button>
      ) : (
        <p className="rpg-quests-jour__encore" data-jouer-reste={reste}>
          {reste === 1 ? 'Encore 1 et c’est dans la poche.' : `Encore ${reste}.`}
        </p>
      )}
    </li>
  );
}

export default function RpgQuetesDuJour({
  quetes, credits = 0,
  onReclamerQuete, onReclamerCachet, onReclamerSemaine, onOuvrirSouk, onPlaySfx,
}) {
  const liste = Array.isArray(quetes?.quetes) ? quetes.quetes : [];
  const prises = liste.filter((id) => vueDeLaQuete(quetes, id)?.reclamee).length;
  const cachetPris = Boolean(quetes?.cachet);
  const cachetPret = cachetDisponible(quetes);
  const semainePrete = cachetDeLaSemaineDisponible(quetes);
  const serie = Math.max(0, Math.floor(Number(quetes?.serie) || 0));
  const joursRestants = joursAvantLeCachetDeLaSemaine(quetes);
  const aReclamer = quetesAReclamer(quetes).length;

  return (
    <aside className="rpg-quests-jour" aria-labelledby="jouer-quetes-titre" data-jouer-quetes={liste.length}>
      <header className="rpg-quests-jour__tete">
        <span className="rpg-mode-menu__eyebrow">LE SABLIER · AUJOURD’HUI</span>
        <div className="rpg-quests-jour__tete-ligne">
          <h3 id="jouer-quetes-titre">Quêtes du jour</h3>
          <p className="rpg-quests-jour__solde-mini" data-jouer-solde={credits} aria-label={`Bourse : ${credits} crédits`}>
            <RpgCreditIcon anime /> <strong>{creditsLisible(credits)}</strong>
            <em>crédits</em>
          </p>
        </div>
        <p className="rpg-quests-jour__compte" data-jouer-compte={`${prises}/${liste.length}`}>
          {liste.length === 0
            ? 'Le marchand prépare la journée — elle s’ouvre au premier duel.'
            : `${prises} sur ${liste.length} réclamée${prises > 1 ? 's' : ''}`}
          {aReclamer > 0
            ? ` · ${aReclamer} à encaisser`
            : ''}
        </p>
      </header>

      {liste.length > 0 && (
        <ul className="rpg-quests-jour__liste">
          {liste.map((id) => (
            <LigneQuete
              key={id}
              id={id}
              etatQuetes={quetes}
              onReclamer={onReclamerQuete}
              onPlaySfx={onPlaySfx}
            />
          ))}
        </ul>
      )}

      {/* Le Cachet du cycle : la quatrième récompense, celle des trois autres. */}
      {liste.length > 0 && (
        <div className={`rpg-quests-jour__cachet${cachetPret ? ' is-pret' : ''}`} data-jouer-cachet={cachetPris ? 'pris' : cachetPret ? 'disponible' : 'attente'}>
          <p className="rpg-quests-jour__cachet-texte">
            <span className="rpg-mode-menu__eyebrow">LE CACHET DU CYCLE</span>
            {cachetPris
              ? 'Cachet du jour encaissé — le prochain demain.'
              : cachetPret
                ? 'Les trois quêtes y sont passées : le Cachet est à vous.'
                : `Il s’ouvre quand les ${liste.length} quêtes sont réclamées.`}
          </p>
          {cachetPret ? (
            <button
              type="button"
              className="rpg-menu-button rpg-menu-button--primary rpg-quests-jour__reclamer"
              data-jouer-cachet-reclamer
              onClick={() => {
                const gagne = onReclamerCachet?.();
                onPlaySfx?.(gagne ? 'victoire' : 'erreur');
              }}
            >
              Réclamer · +{GAINS.cachetDuCycle} <RpgCreditIcon />
              <span className="sr-only">crédits</span>
            </button>
          ) : (
            <span className="rpg-quests-jour__cachet-gain" aria-hidden="true">
              +{GAINS.cachetDuCycle} <RpgCreditIcon />
            </span>
          )}
        </div>
      )}

      {/* La série : sept jours d'affilée valent un second Cachet. C'est ce qui
          fait revenir demain — donc ça se dit ici, sobrement. */}
      {liste.length > 0 && (
        <p className="rpg-quests-jour__serie" data-jouer-serie={serie}>
          {serie === 0
            ? 'Aujourd’hui compte pour le premier jour de la série.'
            : `${serie} jour${serie > 1 ? 's' : ''} d’affilée`}
          {serieComplete(quetes) || serie === 0
            ? ''
            : ` — Cachet de la semaine dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''}`}
          {semainePrete && (
            <>
              {' · '}
              <button
                type="button"
                className="rpg-menu-button rpg-quests-jour__semaine"
                data-jouer-semaine-reclamer
                onClick={() => {
                  const gagne = onReclamerSemaine?.();
                  onPlaySfx?.(gagne ? 'victoire' : 'erreur');
                }}
              >
                Réclamer {JOURS_DE_LA_SERIE} jours · +{GAINS.cachetDeLaSemaine} <RpgCreditIcon />
                <span className="sr-only">crédits</span>
              </button>
            </>
          )}
        </p>
      )}

      {/* Le solde et le chemin vers ce qu'il achète : sans le Souk, une
          récompense n'est qu'un chiffre. */}
      <footer className="rpg-quests-jour__pied">
        <button
          type="button"
          className="rpg-menu-button rpg-quests-jour__souk"
          data-jouer-souk
          onClick={() => { onPlaySfx?.('menu'); onOuvrirSouk?.(); }}
        >
          <RpgMarketIcon /> Aller au Souk <span aria-hidden="true">→</span>
        </button>
      </footer>
    </aside>
  );
}
