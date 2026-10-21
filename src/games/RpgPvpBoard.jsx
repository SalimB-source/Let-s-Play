import { useMemo, useState } from 'react';
import './rpg-pvp.css';
import { cardById } from './rpgCards.js';
import { rpgPvpAutreCote } from './rpgPvp.js';

/**
 * Le plateau du duel en ligne — `src/games/RpgPvpBoard.jsx`
 * --------------------------------------------------------
 * Il n'a **aucun moteur** : il affiche la vue filtrée que l'arbitre renvoie et
 * transforme chaque geste en intention (`jouer-carte`, `attaquer`,
 * `fin-de-tour`, `mulligan`, `choix-mana`). C'est ce qui garantit qu'un client
 * modifié ne peut pas se donner une carte ou une victoire.
 *
 * La vue est déjà retournée par le serveur pour mon siège : `vue.joueur` est
 * TOUJOURS « moi », même quand l'arbitre m'appelle `sorcier`. L'écran ne
 * connaît donc pas la notion de camp.
 */

const COULEUR_LABEL = {
  braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige', tenebres: 'Ténèbres',
};

const ETAPES = {
  attaquer: 'Clique une de tes créatures pour l’envoyer au combat.',
};

function Pv({ camp, moi }) {
  const pv = Math.max(0, camp?.pv ?? 0);
  const max = Math.max(pv, camp?.pvMax ?? 25);
  return (
    <span className={`rpg-pvp-pv${moi ? ' is-moi' : ''}`}>
      <b>{pv}</b>
      <i>/{max}</i>
      {camp?.bouclier > 0 && <em title="Bouclier">🛡 {camp.bouclier}</em>}
    </span>
  );
}

function Mana({ camp }) {
  const sources = Array.isArray(camp?.manaSources) ? camp.manaSources : [];
  if (!sources.length) return <span className="rpg-pvp-mana rpg-pvp-mana--vide">Aucun mana</span>;
  // Les sources sont listées dans l'ordre où elles ont été gagnées ; une orbe
  // est allumée tant qu'il reste du mana de sa couleur à dépenser.
  const restant = { ...(camp?.mana ?? {}) };
  return (
    <span className="rpg-pvp-mana" aria-label={`Mana : ${sources.length} sources`}>
      {sources.map((couleur, index) => {
        const dispo = (restant[couleur] ?? 0) > 0;
        if (dispo) restant[couleur] -= 1;
        return (
          <i
            key={`${couleur}-${index}`}
            className={`rpg-pvp-mana__orbe rpg-pvp-mana__orbe--${couleur}${dispo ? '' : ' is-depense'}`}
            title={COULEUR_LABEL[couleur] ?? couleur}
          >
            {(COULEUR_LABEL[couleur] ?? couleur).slice(0, 1)}
          </i>
        );
      })}
    </span>
  );
}

function CarteMain({ carteId, jouable, onJouer, desactive }) {
  const carte = cardById(carteId);
  if (!carte) return null;
  return (
    <button
      type="button"
      className={`rpg-pvp-carte-main${jouable ? ' is-jouable' : ''}`}
      disabled={desactive}
      onClick={() => onJouer(carteId)}
      title={carte.text ?? carte.name}
    >
      <span className="rpg-pvp-carte-main__cout">{carte.cost ?? 0}</span>
      <strong>{carte.name}</strong>
      <small>
        {carte.kind === 'creature' ? `${carte.atk ?? 0}/${carte.def ?? 0}` : carte.kind}
        {' · '}{carte.element ? (COULEUR_LABEL[carte.element] ?? carte.element) : '—'}
      </small>
    </button>
  );
}

function Creature({ entite, moi, selection, onClick, desactive }) {
  const carte = cardById(entite.carteId);
  return (
    <button
      type="button"
      className={`rpg-pvp-creature${moi ? ' is-moi' : ''}${selection ? ' is-selectionnee' : ''}${entite.ready ? '' : ' is-engagee'}`}
      disabled={desactive}
      onClick={onClick}
      title={carte?.text ?? carte?.name ?? entite.carteId}
    >
      <strong>{carte?.name ?? entite.name ?? entite.carteId}</strong>
      <span className="rpg-pvp-creature__stats">
        <b>{entite.atk ?? 0}</b>/<i>{entite.def ?? 0}</i>
      </span>
      {entite.armeId && <em className="rpg-pvp-creature__arme">⚔ {cardById(entite.armeId)?.name ?? 'arme'}</em>}
    </button>
  );
}

export default function RpgPvpBoard({
  vue, siege, code, statut, seq, noms = {}, gagnantId = null, finRaison = null, resultat = null,
  occupe = false, onIntention, onAbandon, onQuitter,
}) {
  const [selection, setSelection] = useState(null);
  const [carteEnAttente, setCarteEnAttente] = useState(null);
  const [message, setMessage] = useState(null);
  // Cartes écartées au mulligan : état déclaré ici, jamais dans une branche
  // conditionnelle (règle des hooks).
  const [ecartes, setEcartes] = useState([]);

  const moi = vue?.joueur ?? {};
  const adverse = vue?.sorcier ?? {};
  const nomAdverse = noms[rpgPvpAutreCote(siege)] ?? 'Adversaire';
  const monNom = noms[siege] ?? 'Vous';
  const mulligansFaits = Boolean(vue?.mulliganFait?.joueur && vue?.mulliganFait?.sorcier);
  const choixMana = Boolean(vue?.manaEssaiDemarre && moi.manaChoixEnAttente);
  const monTour = vue?.tour === 'joueur';
  const finie = statut === 'terminee';
  const cartesMain = Array.isArray(moi.main) ? moi.main : [];
  const mesCreatures = Array.isArray(moi.creatures) ? moi.creatures : [];
  const creaturesAdverses = Array.isArray(adverse.creatures) ? adverse.creatures : [];
  const creaturesJouables = useMemo(
    () => mesCreatures.filter((entite) => entite.ready && !entite.attaquee),
    [mesCreatures],
  );

  const envoyer = async (intention, { silencieuxSurCible = false } = {}) => {
    setMessage(null);
    const reponse = await onIntention(intention);
    if (reponse && reponse.ok === false) {
      if (!(silencieuxSurCible && reponse.raison === 'cible')) {
        setMessage(`Action refusée : ${reponse.raison}.`);
      }
    }
    if (reponse?.ok !== false) {
      setSelection(null);
      setCarteEnAttente(null);
    }
    return reponse;
  };

  const jouerCarte = async (carteId, cibleId = null) => {
    const intention = cibleId
      ? { type: 'jouer-carte', carteId, cibleId }
      : { type: 'jouer-carte', carteId };
    const reponse = await envoyer(intention, { silencieuxSurCible: !cibleId });
    if (!cibleId && reponse?.ok === false && reponse.raison === 'cible') {
      setSelection(null);
      setCarteEnAttente(carteId);
      setMessage('Choisis une cible sur le plateau (créature ou adversaire) pour jouer cette carte.');
    }
    return reponse;
  };

  const attaquer = async (entiteId, cibleCreatureId = null) => {
    const attaquant = mesCreatures.find((entite) => entite.id === entiteId);
    const intention = {
      type: 'attaquer',
      attaquants: [entiteId],
      ...(cibleCreatureId && attaquant?.coupRapide
        ? { ciblesAttaque: { [entiteId]: cibleCreatureId } }
        : {}),
    };
    const reponse = await envoyer(intention);
    if (reponse?.ok === false && reponse.raison === 'cible') {
      setMessage('Cette créature doit désigner une cible : choisis une créature adverse.');
    }
  };

  /* ------------------------------ fin de partie ---------------------------- */

  if (finie) {
    const titre = resultat === 'gagne' ? 'Victoire' : resultat === 'perdu' ? 'Défaite' : 'Match nul';
    return (
      <main className="rpg-pvp rpg-pvp--fin">
        <p className="rpg-pvp__eyebrow">DUEL TERMINÉ · {code}</p>
        <h1>{titre}</h1>
        <p className="rpg-pvp__lead">
          {finRaison === 'abandon' ? 'Par abandon.' : finRaison === 'temps' ? 'Temps écoulé.' : finRaison === 'nul' ? 'Les deux camps sont tombés ensemble.' : 'Points de vie à zéro.'}
        </p>
        <p className="rpg-pvp__note">{gagnantId ? '' : 'Aucun vainqueur désigné.'}</p>
        <div className="rpg-pvp__actions">
          <button type="button" className="rpg-pvp__cta" onClick={onQuitter}>Nouveau défi</button>
        </div>
      </main>
    );
  }

  /* -------------------------------- mulligan ------------------------------- */

  if (!mulligansFaits) {
    const basculer = (index) => setEcartes((precedents) => (
      precedents.includes(index) ? precedents.filter((i) => i !== index) : [...precedents, index]
    ));
    return (
      <main className="rpg-pvp rpg-pvp--mulligan">
        <header className="rpg-pvp__header">
          <p className="rpg-pvp__eyebrow">{monNom} · {code}</p>
          <h1>Main de départ</h1>
          <p className="rpg-pvp__lead">
            Échange les cartes qui ne te conviennent pas : tu piocheras autant de cartes neuves.
          </p>
        </header>
        <ul className="rpg-pvp-mulligan" role="list">
          {cartesMain.map((carteId, index) => (
            <li key={`${carteId}-${index}`}>
              <button
                type="button"
                aria-pressed={ecartes.includes(index)}
                className={`rpg-pvp-mulligan__carte${ecartes.includes(index) ? ' is-ecartee' : ''}`}
                onClick={() => basculer(index)}
                disabled={occupe}
              >
                {cardById(carteId)?.name ?? carteId}
              </button>
            </li>
          ))}
        </ul>
        {message && <p className="rpg-pvp__erreur" role="alert">{message}</p>}
        <button
          type="button"
          className="rpg-pvp__cta"
          disabled={occupe}
          onClick={() => envoyer({ type: 'mulligan', index: ecartes })}
        >
          {ecartes.length ? `Échanger ${ecartes.length} carte${ecartes.length > 1 ? 's' : ''}` : 'Garder cette main'}
        </button>
        {moi.mulliganFait && (
          <p className="rpg-pvp__note">Main gardée. En attente de l’adversaire…</p>
        )}
      </main>
    );
  }

  /* ------------------------------ choix du mana ---------------------------- */

  if (choixMana) {
    const couleurs = Array.isArray(moi.couleurs) ? moi.couleurs : [];
    return (
      <main className="rpg-pvp rpg-pvp--mana">
        <p className="rpg-pvp__eyebrow">{code}</p>
        <h1>Choisis ton mana</h1>
        <p className="rpg-pvp__lead">Ce mana devient permanent : il revient à chaque tour, jusqu’à dix.</p>
        <div className="rpg-pvp__couleurs">
          {couleurs.map((couleur) => (
            <button
              key={couleur}
              type="button"
              className={`rpg-pvp__couleur rpg-pvp__couleur--${couleur}`}
              disabled={occupe}
              onClick={() => envoyer({ type: 'choix-mana', couleur })}
            >
              {COULEUR_LABEL[couleur] ?? couleur}
            </button>
          ))}
        </div>
        {message && <p className="rpg-pvp__erreur" role="alert">{message}</p>}
      </main>
    );
  }

  /* --------------------------------- plateau ------------------------------- */

  return (
    <main className="rpg-pvp rpg-pvp--duel" data-scene="pvp" data-seq={seq}>
      <header className="rpg-pvp-duel__entete">
        <div className="rpg-pvp-duel__camp">
          <strong>{nomAdverse}</strong>
          <Pv camp={adverse} />
          <Mana camp={adverse} />
        </div>
        <div className="rpg-pvp-duel__tour">
          <span className={`rpg-pvp-duel__badge${monTour ? ' is-moi' : ''}`}>
            {monTour ? 'À toi de jouer' : `Au tour de ${nomAdverse}`}
          </span>
          <small>{code}</small>
        </div>
        <div className="rpg-pvp-duel__camp rpg-pvp-duel__camp--moi">
          <strong>{monNom}</strong>
          <Pv camp={moi} moi />
          <Mana camp={moi} />
        </div>
      </header>

      <section className="rpg-pvp-duel__adverse" aria-label="Camp adverse">
        {creaturesAdverses.length
          ? creaturesAdverses.map((entite) => (
            <Creature
              key={entite.id}
              entite={entite}
              desactive={occupe}
              onClick={() => {
                if (carteEnAttente) {
                  jouerCarte(carteEnAttente, entite.id);
                  return;
                }
                if (selection) {
                  attaquer(selection, entite.id);
                  return;
                }
                setMessage('Sélectionne d’abord une de tes créatures ou une carte ciblée.');
              }}
            />
          ))
          : <p className="rpg-pvp__note">Aucune créature en face.</p>}
      </section>

      <section className="rpg-pvp-duel__journal" aria-label="Journal du duel">
        {(vue.log ?? []).slice(-6).map((entree, index) => (
          <p key={`${index}-${entree.slice(0, 12)}`}>{entree}</p>
        ))}
      </section>

      <section className="rpg-pvp-duel__moi" aria-label="Mon camp">
        {mesCreatures.length
          ? mesCreatures.map((entite) => (
            <Creature
              key={entite.id}
              entite={entite}
              moi
              selection={selection === entite.id}
              desactive={occupe || !monTour}
              onClick={() => {
                if (carteEnAttente) {
                  jouerCarte(carteEnAttente, entite.id);
                  return;
                }
                if (selection === entite.id) { setSelection(null); return; }
                if (entite.ready && !entite.attaquee) { setSelection(entite.id); setMessage(ETAPES.attaquer); }
              }}
            />
          ))
          : <p className="rpg-pvp__note">Ton plateau est vide.</p>}
      </section>

      {(selection || carteEnAttente) && monTour && (
        <div className="rpg-pvp-duel__cible">
          {carteEnAttente ? (
            <button
              type="button"
              className="rpg-pvp__cta"
              disabled={occupe}
              onClick={() => jouerCarte(carteEnAttente, 'sorcier')}
            >
              Viser {nomAdverse}
            </button>
          ) : (
            <button
              type="button"
              className="rpg-pvp__cta"
              disabled={occupe}
              onClick={() => attaquer(selection)}
            >
              Attaquer {nomAdverse} directement
            </button>
          )}
          <button
            type="button"
            className="rpg-pvp__ghost"
            onClick={() => { setSelection(null); setCarteEnAttente(null); setMessage(null); }}
          >
            Annuler
          </button>
        </div>
      )}

      {message && <p className="rpg-pvp__note" role="status">{message}</p>}
      {!monTour && <p className="rpg-pvp__note">L’adversaire réfléchit…</p>}

      <section className="rpg-pvp-duel__main" aria-label="Ma main">
        {cartesMain.map((carteId, index) => (
          <CarteMain
            key={`${carteId}-${index}`}
            carteId={carteId}
            jouable={monTour}
            desactive={occupe || !monTour}
            onJouer={jouerCarte}
          />
        ))}
        {!cartesMain.length && <p className="rpg-pvp__note">Main vide.</p>}
      </section>

      <footer className="rpg-pvp-duel__pied">
        <span className="rpg-pvp__note">
          Pioche : {moi.deckCount ?? 0} · Défausse : {moi.cimetiere?.length ?? 0} · Adversaire : {adverse.mainCount ?? 0} cartes en main
        </span>
        <div className="rpg-pvp__actions">
          <button type="button" className="rpg-pvp__ghost" disabled={occupe || !monTour} onClick={() => envoyer({ type: 'fin-de-tour' })}>
            Fin de tour
          </button>
          <button type="button" className="rpg-pvp__ghost rpg-pvp__ghost--danger" disabled={occupe} onClick={onAbandon}>
            Abandonner
          </button>
        </div>
      </footer>
    </main>
  );
}
