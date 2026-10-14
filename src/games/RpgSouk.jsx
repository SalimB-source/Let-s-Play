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
import { GAINS } from './rpgCredits.js';
import { cachetDisponible, queteParId, secondesAvantMinuit } from './rpgQuetes.js';

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
  onReclamerQuete,
  onReclamerCachet,
  onExit,
  onPlaySfx,
}) {
  const restant = useResteDuCycle();
  const jour = jourLisible(quetes?.jour);
  const liste = Array.isArray(quetes?.quetes) ? quetes.quetes : [];
  const prises = liste.filter((id) => etatDeLaQuete(quetes, id)?.reclamee).length;
  const cachet = cachetDisponible(quetes) ? 'disponible' : quetes?.cachet ? 'pris' : 'attente';
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

      <section className="rpg-souk__rayons" aria-labelledby="souk-rayons-titre" data-souk-rayons="bientot">
        <div className="rpg-souk__section-tete">
          <h3 id="souk-rayons-titre">Les rayons</h3>
          <p>Pas encore ouverts.</p>
        </div>
        <p className="rpg-souk__vide">
          Le marchand range encore ses paquets. Les boosters s’achètent ici — le temps que vos crédits
          s’accumulent, ils ne seront pas perdus.
        </p>
      </section>
    </main>
  );
}
