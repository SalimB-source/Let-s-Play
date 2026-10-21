import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './rpg-pvp.css';
import { useAuth } from '../auth/AuthContext';
import { useFriends } from '../friends/FriendsContext';
import { sendMessage } from '../messages/messagesApi';
import { RPG_DECKS } from './rpgCards.js';
import { deckColors } from './rpgDeckFilter.js';
import {
  abandonnerDefi,
  cadenceSondage,
  cheminDefi,
  etatDefi,
  jouerIntention,
  lienDefi,
  ouvrirDefi,
  refuserDefi,
  rejoindreDefi,
  sablierPvpDisponible,
} from './rpgPvpApi.js';
import {
  SALON_TEXTES,
  cheminSalon,
  decksPourDefi,
  etatSalon,
  messageDefi,
  payloadDefi,
  resultatSalon,
  tempsRestant,
} from './rpgPvpSalon.js';
import RpgPvpBoard from './RpgPvpBoard.jsx';

/**
 * Le salon du Sablier en ligne — `src/games/RpgPvpSalon.jsx`
 * ---------------------------------------------------------
 * Deux rôles dans un seul écran :
 *
 *   - **sans code** (`/jeu/sablier-de-bab-el/defi`) : choisir un deck, créer
 *     un défi à partager par lien, défier un ami (le message part dans la
 *     messagerie), ou entrer un code reçu ;
 *   - **avec code** (`…/defi/AB12CD34`) : rejoindre l'invitation, attendre que
 *     l'adversaire arrive (l'hôte), puis jouer — c'est `RpgPvpBoard` qui prend
 *     la main dès que la partie est en cours.
 *
 * L'état de la partie n'est jamais calculé ici : chaque action est une
 * **intention** envoyée à l'arbitre, et l'écran se contente d'afficher la vue
 * filtrée qu'il renvoie (`rpgPvpApi.js`).
 */

const COULEURS_LISIBLES = {
  braise: 'Braise', eau: 'Eau', sable: 'Sable', neige: 'Neige', tenebres: 'Ténèbres',
};

function nomDuDeck(deck) {
  if (!deck) return 'Deck du catalogue';
  const couleurs = deckColors(deck).map((couleur) => COULEURS_LISIBLES[couleur] ?? couleur).join(' · ');
  return couleurs ? `${deck.name} — ${couleurs}` : deck.name;
}

function SelecteurDeck({ decks, valeur, onChange, desactive }) {
  return (
    <ul className="rpg-pvp-decks" role="list">
      {decks.map((deck) => (
        <li key={deck.id}>
          <button
            type="button"
            role="listitem"
            className={`rpg-pvp-deck${valeur === deck.id ? ' is-selected' : ''}`}
            aria-pressed={valeur === deck.id}
            disabled={desactive}
            onClick={() => onChange(deck.id)}
          >
            <strong>{deck.name}</strong>
            <small>{nomDuDeck({ ...deck, name: '' }).replace(' — ', '') || 'Catalogue'}</small>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function RpgPvpSalon() {
  const { code: codeParam } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { friends = [] } = useFriends() ?? {};

  const disponible = sablierPvpDisponible();
  const uid = user?.id ?? null;
  const [code, setCode] = useState(() => String(codeParam ?? '').toUpperCase());
  const [vue, setVue] = useState(null);
  const [chargement, setChargement] = useState(Boolean(codeParam));
  const [erreur, setErreur] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copie, setCopie] = useState(false);
  const [saisie, setSaisie] = useState('');
  const decks = useMemo(() => decksPourDefi(RPG_DECKS), []);
  const [deckId, setDeckId] = useState(() => decks[0]?.id ?? '');
  const [amiId, setAmiId] = useState('');
  const [mode, setMode] = useState('live');
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const enVolRef = useRef(false);

  // Sans code, on est à l'accueil : il n'y a rien à charger, donc pas d'écran
  // « ouverture du salon » qui tournerait dans le vide.
  const ecran = !code
    ? 'accueil'
    : etatSalon(vue, { disponible: Boolean(uid) && disponible, chargement: chargement && !vue });
  const deck = decks.find((candidat) => candidat.id === deckId) ?? decks[0] ?? null;

  /* ------------------------------- chargement ------------------------------ */

  const charger = useCallback(async (silencieux = false) => {
    if (!code || !uid) return;
    if (!silencieux) setChargement(true);
    const reponse = await etatDefi(code);
    setVue(reponse);
    setChargement(false);
    if (!reponse.ok && reponse.raison === 'duel-inconnu') setErreur(SALON_TEXTES.inconnu);
    return reponse;
  }, [code, uid]);

  useEffect(() => {
    if (!code || !uid) { setVue(null); return; }
    charger();
  }, [code, uid, charger]);

  // Sondage : 2 s quand on attend un adversaire ou son tour, 10 s onglet caché.
  useEffect(() => {
    if (!code || !uid || !vue?.ok) return undefined;
    const utile = vue.statut === 'invitation' || vue.statut === 'en_cours';
    if (!utile) return undefined;
    const cache = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    const timer = setInterval(() => { charger(true); }, cadenceSondage(cache));
    return () => clearInterval(timer);
  }, [code, uid, vue?.ok, vue?.statut, charger]);

  // Compte à rebours du tour (mode direct).
  useEffect(() => {
    if (!vue?.echeance) return undefined;
    const timer = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [vue?.echeance]);

  /* -------------------------------- actions ------------------------------- */

  const agir = async (action) => {
    if (enVolRef.current) return null;
    enVolRef.current = true;
    setBusy(true);
    setErreur(null);
    try {
      const reponse = await action();
      if (reponse) {
        if (!reponse.ok) setErreur(reponse.raison ?? null);
        else if (reponse.code) { setVue(reponse); setCode(reponse.code); }
        else if (reponse.seq !== undefined) await charger(true);
      }
      return reponse;
    } finally {
      enVolRef.current = false;
      setBusy(false);
    }
  };

  const creerDefi = (visibilite) => agir(async () => {
    if (!deck) return { ok: false, raison: 'deck-requis' };
    const reponse = await ouvrirDefi({
      deck: deck.cardIds,
      visibilite,
      inviteId: visibilite === 'amis' ? amiId : null,
      mode,
    });
    if (!reponse.ok) return reponse;
    // Le défi nominatif part aussi dans la messagerie : la carte cliquable.
    if (visibilite === 'amis' && amiId && uid) {
      const payload = payloadDefi({ code: reponse.code, mode, deckNom: deck.name });
      try {
        await sendMessage(uid, amiId, messageDefi({ nom: user?.name ?? 'Un joueur', mode }), {
          kind: 'defi-sablier',
          payload,
        });
      } catch { /* le défi existe : le lien reste copiable même si le message échoue */ }
    }
    if (visibilite === 'lien') navigate(cheminDefi(reponse.code));
    return reponse;
  });

  const rejoindre = () => agir(async () => {
    if (!deck) return { ok: false, raison: 'deck-requis' };
    return rejoindreDefi({ code, deck: deck.cardIds });
  });

  const jouer = (intention) => agir(() => jouerIntention({ code, seq: vue?.seq ?? 0, intention }));

  const copier = async () => {
    const lien = lienDefi(code, typeof window === 'undefined' ? '' : window.location.origin);
    try {
      await navigator.clipboard.writeText(`${messageDefi({ nom: user?.name ?? 'Un joueur', mode: vue?.mode ?? mode })}\n${lien}`);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      setErreur('copie');
    }
  };

  const entrerCode = (event) => {
    event.preventDefault();
    const propre = saisie.trim().toUpperCase().replace(/[^A-F0-9]/g, '');
    if (propre.length === 8) navigate(cheminDefi(propre));
    else setErreur('code-invalide');
  };

  /* -------------------------------- rendu -------------------------------- */

  if (ecran === 'connexion') {
    return (
      <main className="rpg-pvp">
        <h1>Duel en ligne</h1>
        <p className="rpg-pvp__lead">Le Sablier en ligne demande un compte : c’est lui qui garde ta main secrète.</p>
        <a className="rpg-pvp__cta" href={`${import.meta.env.BASE_URL}auth`}>Se connecter pour jouer</a>
      </main>
    );
  }

  // Partie en cours : le plateau prend tout l'écran du jeu.
  if (vue?.ok && (vue.statut === 'en_cours' || vue.statut === 'terminee') && vue.etat) {
    return (
      <RpgPvpBoard
        vue={vue.etat}
        siege={vue.siege}
        code={vue.code}
        statut={vue.statut}
        seq={vue.seq}
        noms={vue.noms}
        gagnantId={vue.gagnant_id}
        finRaison={vue.fin_raison}
        resultat={resultatSalon(vue, uid)}
        occupe={busy}
        onIntention={jouer}
        onAbandon={() => agir(() => abandonnerDefi(code))}
        onQuitter={() => navigate(cheminSalon())}
      />
    );
  }

  return (
    <main className="rpg-pvp">
      <header className="rpg-pvp__header">
        <p className="rpg-pvp__eyebrow">LE SABLIER · EN LIGNE</p>
        <h1>{code ? 'Salon du défi' : 'Duel en ligne'}</h1>
        <p className="rpg-pvp__lead">
          {ecran === 'accueil'
            ? 'Défie un ami avec un lien, ou rejoins un défi avec son code. Le duel se joue quand vous êtes deux.'
            : (SALON_TEXTES[ecran] ?? SALON_TEXTES.erreur)}
        </p>
      </header>

      {erreur && (
        <p className="rpg-pvp__erreur" role="alert">
          {erreur === 'copie' ? 'Le presse-papiers est indisponible : copie le code à la main.'
            : erreur === 'code-invalide' ? 'Un code fait 8 caractères (chiffres et lettres A–F).'
              : erreur === 'deck-non-possede' ? 'Ce deck contient des cartes que tu ne possèdes pas encore.'
                : erreur === 'pas-amis' ? 'Les défis nominatifs sont réservés aux amis — envoie plutôt un lien.'
                  : erreur === 'invitation-en-attente' ? 'Tu as déjà un défi en attente avec ce joueur.'
                    : `Action refusée : ${erreur}.`}
        </p>
      )}

      {ecran === 'inconnu' || ecran === 'refuse' || ecran === 'expire' ? (
        <div className="rpg-pvp__panneau">
          <a className="rpg-pvp__cta" href={cheminSalon()}>Créer un nouveau défi</a>
        </div>
      ) : null}

      {ecran === 'chargement' ? <p className="rpg-pvp__note" aria-busy="true">Ouverture du salon…</p> : null}

      {(ecran === 'attente' || ecran === 'a-rejoindre') && (
        <div className="rpg-pvp__panneau">
          <div className="rpg-pvp__code">
            <span>Code du défi</span>
            <strong>{code}</strong>
          </div>
          {ecran === 'attente' ? (
            <>
              <p className="rpg-pvp__note">
                En attente de ton adversaire… Partage le lien, ou envoie-le par la messagerie.
              </p>
              <div className="rpg-pvp__actions">
                <button type="button" className="rpg-pvp__cta" onClick={copier}>
                  {copie ? 'Lien copié ✓' : 'Copier le lien du défi'}
                </button>
                <button type="button" className="rpg-pvp__ghost" onClick={() => agir(() => refuserDefi(code))} disabled={busy}>
                  Annuler le défi
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>Choisis ton deck</h2>
              <SelecteurDeck decks={decks} valeur={deckId} onChange={setDeckId} desactive={busy} />
              <button type="button" className="rpg-pvp__cta" onClick={rejoindre} disabled={busy || !deck}>
                Rejoindre le duel
              </button>
            </>
          )}
        </div>
      )}

      {ecran === 'termine' && (
        <div className="rpg-pvp__panneau">
          <p className="rpg-pvp__note">{SALON_TEXTES.termine}</p>
          <a className="rpg-pvp__cta" href={cheminSalon()}>Nouveau défi</a>
        </div>
      )}

      {!code && ecran !== 'connexion' && (
        <>
          <div className="rpg-pvp__panneau">
            <h2>1. Ton deck</h2>
            <SelecteurDeck decks={decks} valeur={deckId} onChange={setDeckId} desactive={busy} />
            <div className="rpg-pvp__mode">
              <label>
                <input type="radio" name="pvp-mode" checked={mode === 'live'} onChange={() => setMode('live')} />
                <span><strong>Direct</strong> — les deux joueurs sont là, 90 s par tour</span>
              </label>
              <label>
                <input type="radio" name="pvp-mode" checked={mode === 'async'} onChange={() => setMode('async')} />
                <span><strong>À la correspondance</strong> — chacun joue quand il peut</span>
              </label>
            </div>
          </div>

          <div className="rpg-pvp__panneau">
            <h2>2. Créer un défi</h2>
            <button type="button" className="rpg-pvp__cta" onClick={() => creerDefi('lien')} disabled={busy || !deck}>
              Créer un lien de défi
            </button>
            <p className="rpg-pvp__note">
              Le lien marche partout : messagerie du site, WhatsApp, Discord. Le premier à l’ouvrir prend la place.
            </p>
            {friends.length > 0 && (
              <div className="rpg-pvp__amis">
                <label htmlFor="pvp-ami">Défier un ami directement</label>
                <select id="pvp-ami" value={amiId} onChange={(event) => setAmiId(event.target.value)}>
                  <option value="">Choisir un ami…</option>
                  {friends.map((ami) => (
                    <option key={ami.id} value={ami.id}>{ami.name}{ami.online ? ' · en ligne' : ''}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rpg-pvp__ghost"
                  onClick={() => creerDefi('amis')}
                  disabled={busy || !amiId || !deck}
                >
                  Envoyer l’invitation
                </button>
              </div>
            )}
          </div>

          <div className="rpg-pvp__panneau">
            <h2>3. Rejoindre avec un code</h2>
            <form className="rpg-pvp__form" onSubmit={entrerCode}>
              <input
                value={saisie}
                onChange={(event) => setSaisie(event.target.value.toUpperCase().slice(0, 8))}
                placeholder="AB12CD34"
                aria-label="Code du défi (8 caractères)"
                autoComplete="off"
                spellCheck="false"
              />
              <button type="submit" className="rpg-pvp__cta">Rejoindre</button>
            </form>
          </div>
        </>
      )}

      {code && vue?.echeance && ecran === 'en-cours' && (
        <p className="rpg-pvp__note">Temps restant : {tempsRestant(vue.echeance, maintenant)}</p>
      )}
    </main>
  );
}
