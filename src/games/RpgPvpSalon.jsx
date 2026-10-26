import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import './rpg-pvp.css';
import { useAuth } from '../auth/AuthContext';
import { useFriends } from '../friends/FriendsContext';
import { sendMessage } from '../messages/messagesApi';
import { chargerDecksMaison } from './rpgDeckBuilder.js';
import { deckColors } from './rpgDeckFilter.js';
import { DeckBox, deckColorModifier, inclinerBoitier, redresserBoitier } from './RpgDeckBox.jsx';
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
import RpgMessagerieBouton from './RpgMessagerieBouton.jsx';
import RpgMessageriePanel from './RpgMessageriePanel.jsx';

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

/** « Sable · Braise » — la ligne de couleurs d'un deck, lisible telle quelle. */
function couleursDuDeck(deck) {
  if (!deck) return '';
  return deckColors(deck).map((couleur) => COULEURS_LISIBLES[couleur] ?? couleur).join(' · ');
}

/** Le key art de Bab El sous un voile sombre : le même décor que le hub du
 *  jeu, pour que le salon ne ressemble pas à une page du site. */
const FOND_EN_LIGNE = `linear-gradient(105deg, rgba(7, 6, 12, .93) 0%, rgba(7, 6, 12, .8) 46%, rgba(7, 6, 12, .64) 100%), url("${import.meta.env.BASE_URL}sablier-de-bab-el-keyart.jpg")`;

/**
 * Le cadre plein écran du Sablier en ligne.
 * -----------------------------------------
 * Le jeu est une couche `fixed` (z-index 1500) qui passe par-dessus la barre
 * du site ; le salon en ligne prend la même place, avec son propre liseré de
 * retour vers le hub. Le contenu défile dedans (`overscroll-behavior` coupe la
 * chaîne vers la page du site, verrouillée par `body.rpg-pvp-lock`).
 */
function Cadre({ code = '', retour = null, compact = false, children }) {
  // La messagerie s’ouvre en voile AU-DESSUS du salon (`RpgMessageriePanel`) :
  // sur mobile, la fenêtre sociale du site naviguerait vers `/messages` et
  // démonterait le salon — défi en création, deck choisi et attente de
  // l’adversaire perdus. Ici rien ne se démonte, le salon reprend à la
  // fermeture du voile.
  const [messagerieOuverte, setMessagerieOuverte] = useState(false);
  return (
    <div className={`rpg-pvp-page${compact ? ' rpg-pvp-page--compact' : ''}`} style={{ backgroundImage: FOND_EN_LIGNE }}>
      <header className="rpg-pvp-page__barre">
        <Link
          className="rpg-pvp-page__retour"
          to={retour?.href ?? '/jeu/sablier-de-bab-el'}
        >
          <span aria-hidden="true">←</span> {retour?.libelle ?? 'Le Sablier'}
        </Link>
        {/* La messagerie, dans la barre du salon : c’est par elle que les
            défis se lancent et se reçoivent. Elle reste joignable pendant
            l’attente d’un adversaire comme pendant le duel — le voile du jeu
            s’ouvre au-dessus du salon, rien ne quitte la partie. */}
        <span className="rpg-pvp-page__outils">
          <RpgMessagerieBouton variante="salon" onOuvrir={() => setMessagerieOuverte(true)} />
          {code ? (
            <span className="rpg-pvp-page__code" title="Code du défi">{code}</span>
          ) : (
            <span className="rpg-pvp-page__statut">
              <span className="rpg-pvp-page__point" aria-hidden="true" />
              Duel en ligne
            </span>
          )}
        </span>
      </header>
      <div className="rpg-pvp-page__contenu">{children}</div>
      {messagerieOuverte && (
        <RpgMessageriePanel variante="volet" onFermer={() => setMessagerieOuverte(false)} />
      )}
    </div>
  );
}

/**
 * Le choix du deck — les mêmes coffrets que l'onglet Deck.
 * -------------------------------------------------------
 * Un seul objet à reconnaître d'un écran à l'autre : le boîtier 3D de
 * `RpgDeckBox.jsx`, avec sa couleur, ses emblèmes et son inclinaison au
 * curseur. Le clic sur le boîtier *choisit* le deck (là où l'onglet Deck
 * l'ouvre) : c'est le seul geste du salon, et `aria-pressed` le dit.
 */
function SelecteurDeck({ decks, valeur, onChange, desactive }) {
  return (
    <ul className="rpg-pvp-decks" role="list">
      {decks.map((deck, index) => {
        const choisie = valeur === deck.id;
        return (
          <li
            key={deck.id}
            className={`rpg-deck-choice rpg-pvp-deckbox rpg-deck-choice--${deckColorModifier(deck)}${choisie ? ' is-selected' : ''}`}
            onPointerMove={inclinerBoitier}
            onPointerLeave={redresserBoitier}
          >
            <DeckBox deck={deck} index={index} size="shelf" />
            <button
              type="button"
              className="rpg-deck-choice__button"
              aria-pressed={choisie}
              disabled={desactive}
              onClick={() => onChange(deck.id)}
            >
              <span className="rpg-deck-choice__text">
                <strong>{deck.name}</strong>
                <em>{couleursDuDeck(deck) || 'Catalogue'}</em>
                <span className="rpg-deck-choice__meta">
                  <span className="rpg-deck-choice__cta">{choisie ? '✓ Choisi' : 'Choisir'}</span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
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
  // Le joueur n'aligne que ses propres decks : celui du coffret, puis ceux de
  // l'atelier. Sans deck jouable, le salon le dit au lieu d'en inventer un.
  const decks = useMemo(() => decksPourDefi(chargerDecksMaison()), []);
  const [deckId, setDeckId] = useState(() => decks[0]?.id ?? '');
  const [amiId, setAmiId] = useState('');
  const [mode, setMode] = useState('live');
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const seqRef = useRef(0);
  const fileActionRef = useRef(Promise.resolve());
  const nbEnVolRef = useRef(0);
  useEffect(() => {
    if (typeof vue?.seq === 'number') seqRef.current = vue.seq;
  }, [vue?.seq]);

  // Sans code, on est à l'accueil : il n'y a rien à charger, donc pas d'écran
  // « ouverture du salon » qui tournerait dans le vide.
  const ecran = !code
    ? 'accueil'
    : etatSalon(vue, { disponible: Boolean(uid) && disponible, chargement: chargement && !vue });
  const deck = decks.find((candidat) => candidat.id === deckId) ?? decks[0] ?? null;

  /* ------------------------------- chargement ------------------------------ */

  useEffect(() => {
    const prochain = String(codeParam ?? '').toUpperCase();
    setCode(prochain);
    if (!prochain) {
      seqRef.current = 0;
      setVue(null);
      setErreur(null);
      setChargement(false);
    }
  }, [codeParam]);

  const charger = useCallback(async (silencieux = false) => {
    if (!code || !uid) return;
    if (!silencieux) setChargement(true);
    const reponse = await etatDefi(code);
    if (nbEnVolRef.current === 0 || !silencieux) {
      if (typeof reponse?.seq === 'number') seqRef.current = reponse.seq;
      setVue(reponse);
    }
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
    const timer = setInterval(() => {
      if (nbEnVolRef.current === 0) charger(true);
    }, cadenceSondage(cache));
    return () => clearInterval(timer);
  }, [code, uid, vue?.ok, vue?.statut, charger]);

  // Compte à rebours du tour (mode direct).
  useEffect(() => {
    if (!vue?.echeance) return undefined;
    const timer = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [vue?.echeance]);

  // Le cadre est plein écran : la page du site ne doit pas défiler derrière.
  useEffect(() => {
    document.body.classList.add('rpg-pvp-lock');
    return () => document.body.classList.remove('rpg-pvp-lock');
  }, []);

  /* -------------------------------- actions ------------------------------- */

  const agir = (action) => {
    const tache = fileActionRef.current.then(async () => {
      nbEnVolRef.current += 1;
      setBusy(true);
      setErreur(null);
      try {
        const reponse = await action();
        if (reponse) {
          if (!reponse.ok) {
            setErreur(reponse.raison ?? null);
            if (reponse.raison === 'sequence' || reponse.raison === 'pas-votre-tour' || reponse.raison === 'phase') {
              await charger(true);
            }
          } else if (reponse.code) {
            if (typeof reponse.seq === 'number') seqRef.current = reponse.seq;
            setVue((precedent) => ({
              ...(precedent?.code === reponse.code ? precedent : null),
              ...reponse,
              etat: reponse.etat ?? precedent?.etat ?? null,
            }));
            setCode(reponse.code);
          } else if (reponse.seq !== undefined) {
            await charger(true);
          }
        }
        return reponse;
      } finally {
        nbEnVolRef.current = Math.max(0, nbEnVolRef.current - 1);
        if (nbEnVolRef.current === 0) setBusy(false);
      }
    });
    fileActionRef.current = tache.catch(() => null);
    return tache;
  };

  const creerDefi = (visibilite) => agir(async () => {
    if (!deck) return { ok: false, raison: 'deck-requis' };
    const reponse = await ouvrirDefi({
      deck: deck.cardIds,
      visibilite,
      inviteId: visibilite === 'amis' ? amiId : null,
      mode,
    });
    const reprise = !reponse.ok && reponse.raison === 'invitation-en-attente' && reponse.code
      ? { ...reponse, ok: true }
      : reponse;
    if (!reprise.ok) return reprise;
    // Le défi nominatif part aussi dans la messagerie : la carte cliquable.
    if (visibilite === 'amis' && amiId && uid) {
      const payload = payloadDefi({ code: reprise.code, mode: reprise.mode ?? mode, deckNom: deck.name });
      try {
        await sendMessage(uid, amiId, messageDefi({ nom: user?.name ?? 'Un joueur', mode: reprise.mode ?? mode }), {
          kind: 'defi-sablier',
          payload,
        });
      } catch { /* le défi existe : le lien reste copiable même si le message échoue */ }
    }
    navigate(cheminDefi(reprise.code));
    return reprise;
  });

  const rejoindre = () => agir(async () => {
    if (!deck) return { ok: false, raison: 'deck-requis' };
    return rejoindreDefi({ code, deck: deck.cardIds });
  });

  const jouer = (intention) => agir(() => jouerIntention({ code, seq: seqRef.current, intention }));

  const copier = async () => {
    const prefixeBase = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
    const origine = typeof window === 'undefined' ? '' : `${window.location.origin}${prefixeBase}`;
    const lien = lienDefi(code, origine);
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
      <Cadre>
        <main className="rpg-pvp rpg-pvp--connexion">
          <header className="rpg-pvp__header">
            <p className="rpg-pvp__eyebrow">LE SABLIER · EN LIGNE</p>
            <h1>Duel en ligne</h1>
            <p className="rpg-pvp__lead">
              Le Sablier en ligne demande un compte : c’est lui qui garde ta main secrète.
            </p>
          </header>
          <a className="rpg-pvp__cta" href={`${import.meta.env.BASE_URL}auth`}>Se connecter pour jouer</a>
        </main>
      </Cadre>
    );
  }

  // Partie en cours : la vraie table plein écran (`RpgDuelPage`) prend toute la place.
  if (vue?.ok && (vue.statut === 'en_cours' || vue.statut === 'terminee') && vue.etat) {
    return (
      <RpgPvpBoard
        vue={vue.etat}
        siege={vue.siege}
        code={vue.code}
        statut={vue.statut}
        mode={vue.mode}
        echeance={vue.echeance}
        seq={vue.seq}
        noms={vue.noms}
        decks={vue.decks}
        gagnantId={vue.gagnant_id}
        finRaison={vue.fin_raison}
        resultat={resultatSalon(vue, uid)}
        erreur={erreur}
        occupe={busy}
        onIntention={jouer}
        onRafraichir={() => charger(true)}
        onAbandon={() => agir(() => abandonnerDefi(code))}
        onQuitter={() => navigate(cheminSalon())}
      />
    );
  }

  return (
    <Cadre code={code} retour={code ? { href: cheminSalon(), libelle: 'Salon' } : null}>
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
                      : erreur === 'arbitre-indisponible' || erreur === 'reseau' || erreur === 'reponse' ? 'Le serveur d’arbitrage est momentanément injoignable. Réessaie dans un instant.'
                        : `Action refusée : ${erreur}.`}
          </p>
        )}

        {ecran === 'inconnu' || ecran === 'refuse' || ecran === 'expire' ? (
          <div className="rpg-pvp__panneau">
            <Link className="rpg-pvp__cta" to={cheminSalon()}>Créer un nouveau défi</Link>
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
                <p className="rpg-pvp__note" role="status">
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
            <Link className="rpg-pvp__cta" to={cheminSalon()}>Nouveau défi</Link>
          </div>
        )}

        {ecran === 'accueil' && (
          <div className="rpg-pvp__grille">
            <section className="rpg-pvp__panneau" aria-labelledby="pvp-etape-deck">
              <h2 id="pvp-etape-deck"><span className="rpg-pvp__etape" aria-hidden="true">1</span> Ton deck</h2>
              <SelecteurDeck decks={decks} valeur={deckId} onChange={setDeckId} desactive={busy} />
              <div className="rpg-pvp__mode" role="radiogroup" aria-label="Cadence de la partie">
                <label className={`rpg-pvp__mode-option${mode === 'live' ? ' is-active' : ''}`}>
                  <input type="radio" name="pvp-mode" checked={mode === 'live'} onChange={() => setMode('live')} />
                  <span className="rpg-pvp__mode-titre">Direct</span>
                  <span className="rpg-pvp__mode-desc">Les deux joueurs sont là, 90 s par tour.</span>
                </label>
              </div>
            </section>

            <div className="rpg-pvp__colonne">
              <section className="rpg-pvp__panneau" aria-labelledby="pvp-etape-creer">
                <h2 id="pvp-etape-creer"><span className="rpg-pvp__etape" aria-hidden="true">2</span> Créer un défi</h2>
                <button type="button" className="rpg-pvp__cta rpg-pvp__cta--large" onClick={() => creerDefi('lien')} disabled={busy || !deck}>
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
              </section>

              <section className="rpg-pvp__panneau" aria-labelledby="pvp-etape-rejoindre">
                <h2 id="pvp-etape-rejoindre"><span className="rpg-pvp__etape" aria-hidden="true">3</span> Rejoindre avec un code</h2>
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
                <p className="rpg-pvp__note">Le code à huit caractères du défi que tu as reçu, dans le salon ou par message.</p>
              </section>
            </div>
          </div>
        )}

        {code && vue?.echeance && ecran === 'en-cours' && (
          <p className="rpg-pvp__note">Temps restant : {tempsRestant(vue.echeance, maintenant)}</p>
        )}
      </main>
    </Cadre>
  );
}
