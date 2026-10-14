/**
 * Le Souk de Bab El — l'écran de la bourse et des quêtes du jour.
 *
 * C'est le sixième onglet du menu (dossier `13-souk-credits-quetes-boosters.md`,
 * §7). Il répond à trois questions, dans cet ordre :
 *
 *   1. **combien j'ai** — le solde ◈, la série de jours, et le compte à rebours
 *      du cycle (« le cycle se referme dans 7 h 12 ») ;
 *   2. **ce qui m'attend** — les trois quêtes du jour, une barre de progression
 *      chacune, leur récompense, et le bouton **Réclamer** — désactivé tant que
 *      l'objectif n'est pas atteint, et jamais muet sur ce qu'il reste à faire ;
 *   3. **le Cachet du cycle** — +80 ◈ quand les trois sont réclamées.
 *
 * Le composant est **purement présentationnel** : la persistance, la fusion de
 * compte et l'encaissement vivent dans `useSablierBourse.js`, appelé par la
 * page. Il ne connaît que des états normalisés (`rpgQuetes.js`,
 * `rpgCredits.js`) et rend toujours quelque chose, quel que soit l'état reçu :
 * un Souk vide doit dire pourquoi il est vide, pas casser l'écran.
 *
 * Les rayons (les boosters en étagère) arrivent au lot suivant : la section est
 * déjà là, elle dit simplement que le marchand range encore ses paquets.
 */

import { useEffect, useState } from 'react';
import './rpg-souk.css';
import { GAINS, paquetsAvantMythique } from './rpgCredits.js';
import { cachetDisponible, queteParId, secondesAvantMinuit } from './rpgQuetes.js';
import { COFFRET, TAUX, etatRayons, tourQuiGarde } from './rpgBoosters.js';
import RpgBoosterOuverture from './RpgBoosterOuverture.jsx';

/** Les paliers, tels que le joueur les lit (le module les nomme en interne). */
const PALIERS = Object.freeze({ facile: 'Facile', moyenne: 'Moyenne', difficile: 'Difficile' });

/**
 * Les crédits s'écrivent avec une espace fine insécable tous les trois chiffres :
 * « 1 240 ◈ » se lit, « 1240 ◈ » se déchiffre.
 */
export function creditsLisible(montant) {
  const nombre = Math.max(0, Math.floor(Number(montant) || 0));
  return String(nombre).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

/** « 7 h 12 », « 43 min », « moins d'une minute » — le temps qui reste au cycle. */
export function dureeAvantMinuit(secondes) {
  const total = Math.max(0, Math.floor(Number(secondes) || 0));
  if (total < 60) return 'moins d’une minute';
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  return `${heures} h ${String(minutes % 60).padStart(2, '0')}`;
}

/** La journée se lit en français, ou se taît si l'état n'a pas de jour. */
function jourLisible(cle) {
  const [annee, mois, jour] = String(cle ?? '').split('-').map(Number);
  if (!annee || !mois || !jour) return null;
  const date = new Date(annee, mois - 1, jour);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * Le compte à rebours du cycle, rafraîchi à la minute. Il ne passe pas par une
 * animation : c'est du texte, et il doit rester juste même sur un appareil lent.
 */
function useResteDuCycle() {
  const [secondes, setSecondes] = useState(() => secondesAvantMinuit());
  useEffect(() => {
    const battement = setInterval(() => setSecondes(secondesAvantMinuit()), 30000);
    return () => clearInterval(battement);
  }, []);
  return secondes;
}

/**
 * La ligne de taux d'un rayon : ce qu'on y trouve, et la promesse des
 * mythiques. Le chiffre de pitié est celui du portefeuille — il ne se promet
 * que sur un rayon qui a encore une mythique à donner.
 */
function ligneDeTaux(etat, portefeuille) {
  const chance = Math.round((etat.rayon.chanceMythique ?? TAUX.mythique) * 100);
  const avant = paquetsAvantMythique(portefeuille, {
    aDesMythiques: etat.mythiques > 0,
    seuil: TAUX.pitie,
  });
  const morceaux = [
    `${TAUX.cartes} cartes`,
    etat.mythiques
      ? (avant === 0 ? 'mythique au prochain paquet' : `${chance} % de mythique · assurée dans ${avant}`)
      : `aucune mythique ici`,
  ];
  return morceaux.join(' · ');
}

/** Le message d'un rayon fermé : qui le garde, et où l'ouvrir. */
function raisonFermeture(etat) {
  if (etat.ouvert) return null;
  const garde = etat.rayon.couleur ? tourQuiGarde(etat.rayon.couleur) : null;
  return garde
    ? `Fermé — la ${garde.nom} le garde encore. Montez sa tour pour l’ouvrir.`
    : 'Fermé — aucune couleur n’est encore entrée dans la ville.';
}

/** L'état d'une quête, tel que la carte le raconte. */
function etatDeLaQuete(etatQuetes, queteId) {
  const quete = queteParId(queteId);
  if (!quete) return null;
  const progres = Math.min(quete.objectif, Math.max(0, Math.floor(Number(etatQuetes?.progres?.[queteId]) || 0)));
  const reclamee = Array.isArray(etatQuetes?.reclamations) && etatQuetes.reclamations.includes(queteId);
  const terminee = progres >= quete.objectif;
  return {
    quete,
    progres,
    reclamee,
    terminee,
    etat: reclamee ? 'reclamee' : terminee ? 'terminee' : 'encours',
  };
}

/** Une quête du jour : son palier, sa barre, sa récompense, son bouton. */
function CarteQuete({ id, etatQuetes, onReclamer, onPlaySfx }) {
  const tout = etatDeLaQuete(etatQuetes, id);
  if (!tout) return null;
  const { quete, progres, reclamee, terminee, etat } = tout;
  const pourcent = Math.round((progres / quete.objectif) * 100);
  const reste = quete.objectif - progres;
  const reclamer = () => {
    const gagne = onReclamer?.(id);
    onPlaySfx?.(gagne ? 'bell' : 'erreur');
  };
  return (
    <li className={`rpg-souk__quete is-${etat}`} data-souk-quete={id} data-souk-quete-etat={etat}>
      <header className="rpg-souk__quete-tete">
        <span className="rpg-souk__palier">{PALIERS[quete.palier] ?? quete.palier}</span>
        <h4>{quete.titre}</h4>
      </header>
      <p className="rpg-souk__quete-texte">{quete.texte}</p>
      <div
        className="rpg-souk__jauge"
        role="progressbar"
        aria-label={`${quete.titre} : ${progres} sur ${quete.objectif}`}
        aria-valuenow={progres}
        aria-valuemin={0}
        aria-valuemax={quete.objectif}
        data-souk-progres={`${progres}/${quete.objectif}`}
      >
        <span className="rpg-souk__jauge-remplie" style={{ width: `${pourcent}%` }} aria-hidden="true" />
        <span className="rpg-souk__jauge-texte">{progres} / {quete.objectif}</span>
      </div>
      <footer className="rpg-souk__quete-pied">
        <span className="rpg-souk__recompense">+{quete.recompense} ◈</span>
        {reclamee ? (
          <span className="rpg-souk__pris">Réclamée</span>
        ) : (
          <button
            type="button"
            className="rpg-menu-button rpg-menu-button--primary"
            data-souk-reclamer={id}
            disabled={!terminee}
            title={terminee ? `Encaisser ${quete.recompense} crédits` : `Il reste ${reste} à faire`}
            onClick={reclamer}
          >
            Réclamer{terminee ? ` ${quete.recompense} ◈` : ''}
          </button>
        )}
      </footer>
      {!reclamee && !terminee && (
        <p className="rpg-souk__quete-note" data-souk-reste={reste}>
          {reste === 1 ? 'Encore 1 et c’est dans la poche.' : `Encore ${reste}.`}
        </p>
      )}
    </li>
  );
}

export default function RpgSouk({
  quetes = null,
  credits = 0,
  aReclamer = 0,
  statutSync = 'local',
  portefeuille = null,
  progression = null,
  collection = null,
  ouverture = null,
  onReclamerQuete,
  onReclamerCachet,
  onOuvrirBooster,
  onOuvrirCoffret,
  onFermerOuverture,
  onExit,
  onPlaySfx,
  cardArt,
}) {
  const restant = useResteDuCycle();
  const jour = jourLisible(quetes?.jour);
  const liste = Array.isArray(quetes?.quetes) ? quetes.quetes : [];
  const prises = liste.filter((id) => etatDeLaQuete(quetes, id)?.reclamee).length;
  const cachet = cachetDisponible(quetes) ? 'disponible' : quetes?.cachet ? 'pris' : 'attente';
  // L'étagère : les cinq rayons et ce qu'ils gardent. `etatRayons` est une
  // lecture pure — elle ne réserve rien et ne débite rien.
  const rayons = etatRayons(progression, collection);
  const ouverts = rayons.filter((etat) => etat.ouvert).length;
  const sync = statutSync === 'synchronise'
    ? '☁ Synchronisé avec votre compte'
    : statutSync === 'attente'
      ? '☁ Synchronisation du compte…'
      : statutSync === 'horsligne'
        ? '☁ Compte non rejoint : la bourse reste sur cet appareil'
        : 'Bourse gardée sur cet appareil';

  const reclamerCachet = () => {
    const gagne = onReclamerCachet?.();
    onPlaySfx?.(gagne ? 'victoire' : 'erreur');
  };

  return (
    <main className="rpg-souk" aria-label="Le Souk de Bab El" data-souk>
      {ouverture && (
        <RpgBoosterOuverture
          ouverture={ouverture}
          cardArt={cardArt}
          onFermer={onFermerOuverture}
          onPlaySfx={onPlaySfx}
        />
      )}
      <header className="rpg-souk__header">
        <div className="rpg-souk__titre">
          <span className="rpg-mode-menu__eyebrow">LE SABLIER · LE SOUK DE BAB EL</span>
          <h2>Le Souk</h2>
          <p>Les étals paient en crédits ce que les Tours paient en histoires. Vos cartes s’y achètent désormais.</p>
          <p className="rpg-souk__sync" role="status">{sync}</p>
        </div>
        <div className="rpg-souk__bourse">
          <p className="rpg-souk__solde" data-souk-solde={credits} aria-label={`Bourse : ${credits} crédits`}>
            <span className="rpg-souk__solde-signe" aria-hidden="true">◈</span>
            <strong>{creditsLisible(credits)}</strong>
            <em>crédits</em>
          </p>
          <p className="rpg-souk__cycle" data-souk-cycle={restant}>
            Le cycle se referme dans <strong>{dureeAvantMinuit(restant)}</strong>
          </p>
          <p className="rpg-souk__serie">
            {quetes?.serie > 1 ? `${quetes.serie} jours d’affilée` : 'Premier jour du cycle'}
          </p>
        </div>
        <button type="button" className="rpg-menu-button rpg-souk__retour" data-souk-retour onClick={() => { onPlaySfx?.('menu'); onExit?.(); }}>
          <span aria-hidden="true">←</span> Menu
        </button>
      </header>

      {aReclamer > 0 && (
        <p className="rpg-souk__attente" role="status" data-souk-attente={aReclamer}>
          <span aria-hidden="true">◈</span>{' '}
          {aReclamer === 1 ? 'Une récompense vous attend' : `${aReclamer} récompenses vous attendent`} — elles sont plus bas.
        </p>
      )}

      <section className="rpg-souk__section" aria-labelledby="souk-quetes-titre">
        <div className="rpg-souk__section-tete">
          <h3 id="souk-quetes-titre">Les quêtes du jour</h3>
          <p>{jour ? `Journée du ${jour}` : 'La journée s’ouvre au premier duel.'}</p>
        </div>
        {liste.length ? (
          <ul className="rpg-souk__quetes" data-souk-quetes={liste.length}>
            {liste.map((id) => (
              <CarteQuete key={id} id={id} etatQuetes={quetes} onReclamer={onReclamerQuete} onPlaySfx={onPlaySfx} />
            ))}
          </ul>
        ) : (
          <p className="rpg-souk__vide" data-souk-quetes="vide">
            Le marchand prépare la journée. Elle s’ouvrira au prochain retour dans le jeu.
          </p>
        )}
      </section>

      <section className="rpg-souk__cachet" data-souk-cachet={cachet}>
        <div className="rpg-souk__cachet-texte">
          <span className="rpg-mode-menu__eyebrow">LE CACHET DU CYCLE</span>
          <h3>Les trois quêtes du jour, réclamées d’affilée</h3>
          <p>
            {cachet === 'disponible'
              ? 'Votre journée est pleine : le Cachet est à vous.'
              : cachet === 'pris'
                ? 'Cachet du jour encaissé. Revenez demain pour le suivant.'
                : `${prises} / 3 réclamées — le Cachet s’ouvre quand les trois y sont passées.`}
          </p>
        </div>
        {cachet === 'disponible' ? (
          <button
            type="button"
            className="rpg-menu-button rpg-menu-button--primary"
            data-souk-cachet-reclamer
            onClick={reclamerCachet}
          >
            Réclamer le Cachet · +{GAINS.cachetDuCycle} ◈
          </button>
        ) : (
          <span className="rpg-souk__pris">{cachet === 'pris' ? 'Cachet réclamé' : 'Cachet scellé'}</span>
        )}
      </section>

      <section className="rpg-souk__section" aria-labelledby="souk-rayons-titre">
        <div className="rpg-souk__section-tete">
          <h3 id="souk-rayons-titre">Les rayons</h3>
          <p data-souk-rayons={ouverts > 0 ? 'ouverts' : 'fermes'}>
            {ouverts > 0
              ? `${ouverts} rayon${ouverts > 1 ? 's' : ''} ouvert${ouverts > 1 ? 's' : ''} · le Souk suit les marches que vous avez montées`
              : 'le Souk suivra les marches que vous montez'}
          </p>
        </div>
        <ul className="rpg-souk__rayons" data-souk-rayons-nombre={rayons.length}>
          {rayons.map((etat) => {
            const ferme = raisonFermeture(etat);
            const assez = credits >= etat.prix;
            const refus = ferme ?? (assez ? null : `Il manque ${creditsLisible(etat.prix - credits)} ◈.`);
            return (
              <li
                key={etat.rayon.id}
                className={`rpg-souk__rayon${etat.ouvert ? '' : ' is-ferme'}${etat.complet ? ' is-complet' : ''}`}
                data-souk-rayon={etat.rayon.id}
                data-souk-rayon-etat={ferme ? 'ferme' : refus ? 'sans-solde' : 'ouvert'}
              >
                <header>
                  <h4>{etat.rayon.nom}</h4>
                  <span className="rpg-souk__rayon-prix">{creditsLisible(etat.prix)} ◈</span>
                </header>
                <p className="rpg-souk__rayon-texte">{etat.rayon.texte}</p>
                <p className="rpg-souk__rayon-taux" data-souk-rayon-taux>{ligneDeTaux(etat, portefeuille)}</p>
                <p className="rpg-souk__rayon-reste" data-souk-rayon-reste={etat.nouvelles}>
                  {etat.complet
                    ? `Aucune des ${etat.taille} cartes de ce rayon ne vous manque — les doublons y paient encore.`
                    : `${etat.nouvelles} carte${etat.nouvelles > 1 ? 's' : ''} sur ${etat.taille} vous manque${etat.nouvelles > 1 ? 'nt' : ''} encore.`}
                </p>
                <footer>
                  {refus && <p className="rpg-souk__rayon-refus" data-souk-rayon-refus>{refus}</p>}
                  <button
                    type="button"
                    className="rpg-menu-button rpg-menu-button--primary"
                    data-souk-ouvrir={etat.rayon.id}
                    disabled={Boolean(refus)}
                    title={refus ?? `Acheter et ouvrir pour ${etat.prix} crédits`}
                    onClick={() => { onOuvrirBooster?.(etat.rayon.id); }}
                  >
                    Ouvrir · {creditsLisible(etat.prix)} ◈
                  </button>
                  {etat.ouvert && etat.mythiques > 0 && (
                    <button
                      type="button"
                      className="rpg-menu-button"
                      data-souk-coffret={etat.rayon.id}
                      disabled={Boolean(ferme) || credits < etat.prixCoffret}
                      title={credits < etat.prixCoffret
                        ? `Le coffret coûte ${etat.prixCoffret} crédits`
                        : `Dix paquets pour ${etat.prixCoffret} crédits — une mythique assurée`}
                      onClick={() => { onOuvrirCoffret?.(etat.rayon.id); }}
                    >
                      Coffret · {creditsLisible(etat.prixCoffret)} ◈
                      <span className="rpg-souk__rayon-remise">−{Math.round(COFFRET.remise * 100)} %</span>
                    </button>
                  )}
                </footer>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
