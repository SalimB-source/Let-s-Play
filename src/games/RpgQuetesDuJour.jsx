/**
 * Rampe inférieure des quêtes du jour dans l'accueil « Jouer ».
 *
 * Inspirée des médaillons alignés au bas de l'écran d'accueil : chaque quête
 * affiche sa fraction d'avancement au-dessus d'un médaillon doré circulaire
 * frappé de sa récompense, prolongé d'une capsule sombre donnant l'objectif
 * précis (ou le bouton d'encaissement dès qu'elle est prête). À droite sur la
 * même ligne vivent le Cachet du cycle, la série hebdomadaire et l'accès au
 * Souk avec le solde courant.
 *
 * Aucune arithmétique de quête ne vit ici : le composant lit `vueDeLaQuete` et
 * les barèmes partagés, et relaie les gestes du portefeuille.
 */
import { GAINS, creditsLisible } from './rpgCredits.js';
import {
  JOURS_DE_LA_SERIE, PALIERS, cachetDeLaSemaineDisponible, cachetDisponible,
  joursAvantLeCachetDeLaSemaine, quetesAReclamer, serieComplete, vueDeLaQuete,
} from './rpgQuetes.js';
import RpgCreditIcon from './RpgCreditIcon.jsx';
import RpgCoffreDore from './RpgCoffreDore.jsx';
import RpgMarketIcon from './RpgMarketIcon.jsx';
import './rpg-quetes-jour.css';

/** Une quête du jour présentée en médaillon circulaire + capsule d'objectif. */
function LigneQuete({ id, etatQuetes, onReclamer, onPlaySfx }) {
  const vue = vueDeLaQuete(etatQuetes, id);
  if (!vue) return null;
  const { quete, progres, reste, pourcent, reclamee, terminee, etat } = vue;
  const palierLibelle = PALIERS[quete.palier] ?? quete.palier;
  const reclamer = () => {
    const gagne = onReclamer?.(id);
    onPlaySfx?.(gagne ? 'bell' : 'erreur');
  };

  return (
    <li
      className={`rpg-quests-jour__quete is-${etat}`}
      style={{ '--q-pct': `${pourcent}%` }}
      data-jouer-quete={id}
      data-jouer-quete-etat={etat}
    >
      <div
        className="rpg-quests-jour__jauge"
        role="progressbar"
        aria-label={`${quete.titre} (${palierLibelle}) : ${progres} sur ${quete.objectif}`}
        aria-valuenow={progres}
        aria-valuemin={0}
        aria-valuemax={quete.objectif}
        data-jouer-progres={`${progres}/${quete.objectif}`}
      >
        <span className="rpg-quests-jour__jauge-texte">{progres}/{quete.objectif}</span>
        <span className="rpg-quests-jour__jauge-piste" aria-hidden="true">
          <span className="rpg-quests-jour__jauge-remplie" style={{ width: `${pourcent}%` }} />
        </span>
      </div>

      <div className="rpg-quests-jour__corps">
        {/* Le butin se présente comme un coffre à ouvrir, plus comme un
            médaillon de compte : même récompense, même geste. */}
        <RpgCoffreDore
          etat={reclamee ? 'ouvert' : terminee ? 'pret' : 'encours'}
          montant={quete.recompense}
          onClick={terminee && !reclamee ? reclamer : null}
          title={
            reclamee
              ? `${quete.titre} — coffre ouvert, ${quete.recompense} crédits en bourse.`
              : terminee
                ? `Ouvrir le coffre : +${quete.recompense} crédits`
                : `${quete.titre} (${palierLibelle}) — encore ${reste} pour ouvrir le coffre de ${quete.recompense} crédits.`
          }
          aria-label={`${quete.titre} (${palierLibelle}) — ${quete.recompense} crédits${terminee && !reclamee ? ', coffre à ouvrir' : ''}`}
          {...(terminee && !reclamee ? { 'data-jouer-reclamer': id } : {})}
        />

        <div className="rpg-quests-jour__capsule">
          <span className="sr-only">
            {quete.titre} ({palierLibelle}) — +{quete.recompense} crédits :
          </span>
          <p className="rpg-quests-jour__quete-texte">{quete.texte}</p>
          {reclamee ? (
            <p className="rpg-quests-jour__pris" data-jouer-pris>Coffre ouvert</p>
          ) : terminee ? (
            <p className="rpg-quests-jour__ouvre">Ouvrez le coffre&nbsp;!</p>
          ) : (
            <span className="rpg-quests-jour__encore sr-only" data-jouer-reste={reste}>
              {reste === 1 ? 'Encore 1.' : `Encore ${reste}.`}
            </span>
          )}
        </div>
      </div>
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
  const pctCycle = liste.length > 0 ? Math.round((prises / liste.length) * 100) : 0;
  const pctSerie = Math.min(100, Math.round((serie / JOURS_DE_LA_SERIE) * 100));

  return (
    <aside className="rpg-quests-jour" aria-labelledby="jouer-quetes-titre" data-jouer-quetes={liste.length}>
      <h3 id="jouer-quetes-titre" className="sr-only">
        Quêtes du jour{aReclamer > 0 ? ` (${aReclamer} à encaisser)` : ''}
      </h3>

      <div className="rpg-quests-jour__rail">
        {liste.length > 0 ? (
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
        ) : (
          <p className="rpg-quests-jour__vide">
            Le marchand prépare les quêtes du jour — elles s’ouvrent dès le premier duel.
          </p>
        )}

        <div className="rpg-quests-jour__jalons">
          {/* Médaillon 4 : Le Cachet du cycle (récompense des 3 quêtes réclamées) */}
          <div
            className={`rpg-quests-jour__cachet${cachetPret ? ' is-pret' : ''}${cachetPris ? ' is-pris' : ''}`}
            style={{ '--q-pct': `${pctCycle}%` }}
            data-jouer-cachet={cachetPris ? 'pris' : cachetPret ? 'disponible' : 'attente'}
          >
            <span className="rpg-quests-jour__compte" data-jouer-compte={`${prises}/${liste.length}`}>
              {prises}/{liste.length}
            </span>
            <RpgCoffreDore
              etat={cachetPris ? 'ouvert' : cachetPret ? 'pret' : 'encours'}
              montant={GAINS.cachetDuCycle}
              sousTitre="Cachet"
              onClick={cachetPret ? () => {
                const gagne = onReclamerCachet?.();
                onPlaySfx?.(gagne ? 'victoire' : 'erreur');
              } : null}
              title={
                cachetPris
                  ? 'Cachet du jour encaissé — le prochain demain.'
                  : cachetPret
                    ? `Les ${liste.length} quêtes sont réclamées : ouvrir le Coffre du cycle (+${GAINS.cachetDuCycle} crédits)`
                    : `Cachet du cycle (+${GAINS.cachetDuCycle}) : réclamez les ${liste.length} quêtes du jour.`
              }
              aria-label={`Cachet du cycle — ${GAINS.cachetDuCycle} crédits${cachetPret ? ', coffre à ouvrir' : ''}`}
              {...(cachetPret ? { 'data-jouer-cachet-reclamer': true } : {})}
            />
          </div>

          {/* Médaillon 5 : Série hebdomadaire + Bourse & accès direct au Souk */}
          <div className="rpg-quests-jour__etape-souk" style={{ '--q-pct': `${pctSerie}%` }}>
            <span
              className="rpg-quests-jour__serie"
              data-jouer-serie={serie}
              title={
                serieComplete(quetes) || serie === 0
                  ? `${serie} jour(s) d’affilée`
                  : `${serie} jour(s) d’affilée — Cachet de la semaine dans ${joursRestants} jour(s)`
              }
            >
              {serie}/{JOURS_DE_LA_SERIE} j
            </span>

            <RpgCoffreDore
              etat={semainePrete ? 'pret' : 'encours'}
              montant={GAINS.cachetDeLaSemaine}
              sousTitre="Semaine"
              onClick={semainePrete ? () => {
                const gagne = onReclamerSemaine?.();
                onPlaySfx?.(gagne ? 'victoire' : 'erreur');
              } : null}
              title={
                semainePrete
                  ? `Ouvrir le Coffre de la semaine : +${GAINS.cachetDeLaSemaine} crédits`
                  : `Coffre de la semaine (+${GAINS.cachetDeLaSemaine}) : ${joursRestants} jour(s) de série encore.`
              }
              aria-label={`Coffre de la semaine — ${GAINS.cachetDeLaSemaine} crédits${semainePrete ? ', à ouvrir' : ''}`}
              {...(semainePrete ? { 'data-jouer-semaine-reclamer': true } : {})}
            />

            <button
              type="button"
              className="rpg-menu-button rpg-quests-jour__souk"
              data-jouer-souk
              title="Aller au Souk dépenser vos crédits"
              onClick={() => { onPlaySfx?.('menu'); onOuvrirSouk?.(); }}
            >
              <span className="rpg-quests-jour__souk-sceau" aria-hidden="true">
                <RpgMarketIcon />
              </span>
              <span className="rpg-quests-jour__souk-texte">
                <span
                  className="rpg-quests-jour__solde-mini"
                  data-jouer-solde={credits}
                  aria-label={`Bourse : ${credits} crédits`}
                >
                  <RpgCreditIcon anime /> <strong>{creditsLisible(credits)}</strong>
                  <em className="sr-only">crédits</em>
                </span>
                <span className="rpg-quests-jour__souk-lien">
                  Souk <span aria-hidden="true">→</span>
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
