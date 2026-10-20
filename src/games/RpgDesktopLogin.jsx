import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../auth/AuthContext';
import { supabase, supabaseConfigStatus, turnstileSiteKey } from '../lib/supabase';
import { describeAuthError } from '../lib/authErrors';
import SignupProtection from '../components/SignupProtection';
import './rpg-desktop-login.css';

/**
 * Écran de connexion PC — src/games/RpgDesktopLogin.jsx
 * -------------------------------------------------------
 * Premier écran de la version installée (`window.letsPlayDesktop`).
 * Le joueur se connecte avec ses identifiants Let's Play (Supabase) avant
 * de voir la table. S'il n'a pas de compte, « S'inscrire » l'envoie vers le
 * site — la fenêtre Electron ouvre le lien dans le navigateur du PC
 * (main.js :: setWindowOpenHandler → shell.openExternal).
 *
 * Hors coque PC, ce composant est transparent : il rend ses enfants tels quels.
 *
 * CAPTCHA : quand Supabase a la protection Turnstile activée, le site exige
 * un token à l'inscription/connexion. La coque embarque le même widget
 * (VITE_TURNSTILE_SITE_KEY) que le site ; sans clé le message
 * captchaNotConfigured s'affiche, exactement comme sur /auth.
 */

const SITE_INSCRIPTION_URL = 'https://let-s-play-nu.vercel.app/register';
const SITE_CONNEXION_URL = 'https://let-s-play-nu.vercel.app/auth';

/** Vrai seulement dans la coque Electron (preload.cjs → window.letsPlayDesktop). */
function estDansCoqueDesktop(win = typeof window === 'undefined' ? undefined : window) {
  return Boolean(win?.letsPlayDesktop);
}

/** Ouvre une URL dans le navigateur du PC (via Electron) ou en nouvel onglet. */
function ouvrirExterne(url) {
  try {
    if (typeof window !== 'undefined' && window.letsPlayDesktop?.ouvrirExterne) {
      window.letsPlayDesktop.ouvrirExterne(url);
      return;
    }
  } catch {}
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {}
}

function EyeIcon({ off = false }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3.2" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}

function DesktopAccountBar() {
  let auth = null;
  try { auth = useContext(AuthContext); } catch { return null; }
  const user = auth?.user;
  const signOut = auth?.signOut;
  if (!user || !signOut) return null;
  const meta = user.user_metadata || {};
  const gamertag = meta.gamertag || meta.fullName || meta.full_name || user.email?.split('@')[0] || 'Joueur';
  const handleLogout = async () => {
    try {
      await signOut();
    } catch {}
    // Recharger l'URL du jeu pour revenir à l'écran de connexion
    try { window.location.reload(); } catch {}
  };
  return (
    <div className="rpg-desktop-compte" role="status" aria-label={`Connecté en tant que ${gamertag}`}>
      <span>Connecté : <strong className="rpg-desktop-compte__nom">{gamertag}</strong></span>
      <button type="button" className="rpg-desktop-compte__btn" onClick={handleLogout}>Se déconnecter</button>
    </div>
  );
}

function LoginForm({ onOffline }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const handleCaptchaToken = useCallback((token) => setCaptchaToken(token || ''), []);

  // Même règle que Auth.jsx : en prod on est fail-closed si CAPTCHA activé côté Supabase
  // mais clé manquante côté build. En dev sans clé on reste utilisable.
  const captchaRequiredForBuild = Boolean(turnstileSiteKey) || Boolean(import.meta.env?.PROD);
  const captchaActive = Boolean(turnstileSiteKey);

  const t = {
    errNetwork: 'Impossible de joindre le serveur — vérifiez votre connexion Internet.',
    errEmailNotConfirmed: 'Ton adresse n’est pas confirmée — ouvre le lien reçu par e-mail.',
    errInvalidCredentials: 'E-mail ou mot de passe incorrect.',
    errRateLimited: 'Trop de tentatives — patiente quelques minutes.',
    errProviderDisabled: 'Connexion indisponible côté serveur.',
    captchaError: 'Vérification anti-robot échouée.',
    captchaLabel: 'VÉRIFICATION DE SÉCURITÉ',
    captchaInstructions: 'Complète la vérification avant de continuer.',
    captchaLoading: 'Chargement de la vérification…',
    captchaErrorLabel: 'La vérification n’a pas pu charger. Désactive les bloqueurs ou réessaie.',
    captchaNotConfigured: 'La protection anti-robot n’est pas configurée pour cette installation. Ajoute VITE_TURNSTILE_SITE_KEY et reconstruis.',
    captchaRequired: 'Complète la vérification pour continuer.',
    unavailable: 'Authentification non configurée sur cette installation.',
  };
  const fallback = 'Une erreur est survenue. Réessaie.';

  const submit = useCallback(async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');

    const mail = email.trim();
    if (!mail || !password) {
      setError('Renseigne ton e-mail et ton mot de passe.');
      return;
    }
    if (!supabase || !supabaseConfigStatus.configured) {
      setError(t.unavailable);
      return;
    }
    if (captchaRequiredForBuild && !turnstileSiteKey) {
      setError(t.captchaNotConfigured);
      return;
    }
    if (captchaRequiredForBuild && captchaActive && !captchaToken) {
      setError(t.captchaRequired);
      return;
    }

    setBusy(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: mail,
        password,
        options: {
          ...(captchaToken ? { captchaToken } : {}),
        },
      });
      // Token single-use : on le jette après chaque tentative
      setCaptchaToken('');
      setCaptchaResetSignal((v) => v + 1);
      if (signInError) {
        setError(describeAuthError(signInError, t, fallback));
      } else {
        setInfo('Connexion réussie — chargement de la table…');
        // AuthContext mettra à jour la session → le gate disparaît
      }
    } catch (e) {
      setCaptchaToken('');
      setCaptchaResetSignal((v) => v + 1);
      setError(describeAuthError(e, t, fallback));
    } finally {
      setBusy(false);
    }
  }, [email, password, captchaToken, captchaRequiredForBuild, captchaActive]);

  const nonConfigure = !supabaseConfigStatus.configured;

  return (
    <div className="rpg-desktop-login">
      <div className="rpg-desktop-login__carte">
        <p className="rpg-desktop-login__surtitre">Let's Play · Le Sablier de Bab El · PC</p>
        <h1 className="rpg-desktop-login__titre">Connexion</h1>
        <p className="rpg-desktop-login__accroche">
          Connecte-toi avec ton compte Let's Play pour retrouver tes decks, ta collection et ta progression.
          Pas encore de compte ? Crée-le sur le site en un clic.
        </p>

        {nonConfigure && (
          <div className="rpg-desktop-login__offline" role="note">
            <p>
              L’authentification n’est pas configurée sur cette installation (clé Supabase manquante).
              Le jeu reste jouable hors ligne, sans synchronisation.
            </p>
          </div>
        )}

        <form className="rpg-desktop-login__form" onSubmit={submit} noValidate>
          <label className="rpg-desktop-login__label">
            Adresse e-mail
            <span className="rpg-desktop-login__input-wrap">
              <input
                className="rpg-desktop-login__input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toi@exemple.com"
                autoComplete="email"
                required
                disabled={busy}
              />
            </span>
          </label>

          <label className="rpg-desktop-login__label">
            Mot de passe
            <span className="rpg-desktop-login__input-wrap">
              <input
                className="rpg-desktop-login__input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                minLength={6}
                disabled={busy}
              />
              <button
                type="button"
                className="rpg-desktop-login__eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                title={showPassword ? 'Masquer' : 'Afficher'}
                tabIndex={-1}
              >
                <EyeIcon off={showPassword} />
              </button>
            </span>
          </label>

          {captchaActive && (
            <SignupProtection
              siteKey={turnstileSiteKey}
              label={t.captchaLabel}
              instructions={t.captchaInstructions}
              loadingLabel={t.captchaLoading}
              errorLabel={t.captchaErrorLabel}
              resetSignal={captchaResetSignal}
              onTokenChange={handleCaptchaToken}
            />
          )}
          {captchaRequiredForBuild && !turnstileSiteKey && (
            <p className="rpg-desktop-login__error" role="alert">{t.captchaNotConfigured}</p>
          )}

          {error && <p className="rpg-desktop-login__error" role="alert">{error}</p>}
          {info && <p className="rpg-desktop-login__info" role="status">{info}</p>}

          <div className="rpg-desktop-login__actions">
            <button
              type="submit"
              className="rpg-desktop-login__btn rpg-desktop-login__btn--primary"
              disabled={busy || (captchaRequiredForBuild && (!turnstileSiteKey || !captchaToken))}
            >
              {busy && <span className="rpg-desktop-login__spinner" aria-hidden="true" />}
              {busy ? 'Connexion…' : 'Se connecter'}
              {!busy && <span aria-hidden="true"> →</span>}
            </button>

            <button
              type="button"
              className="rpg-desktop-login__btn rpg-desktop-login__btn--secondary"
              onClick={() => ouvrirExterne(SITE_INSCRIPTION_URL)}
              disabled={busy}
            >
              S’inscrire sur le site Let's Play
              <span aria-hidden="true"> ↗</span>
            </button>
          </div>

          <div className="rpg-desktop-login__liens">
            <button
              type="button"
              className="rpg-desktop-login__lien"
              onClick={() => ouvrirExterne(`${SITE_CONNEXION_URL}?mode=forgot`)}
            >
              Mot de passe oublié ?
            </button>
            <button
              type="button"
              className="rpg-desktop-login__lien"
              onClick={onOffline}
            >
              Continuer sans compte (hors ligne) →
            </button>
          </div>
        </form>

        <p className="rpg-desktop-login__pied">
          Tes identifiants sont ceux du site Let's Play. En t’inscrivant tu quittes l’app et
          reviens te connecter ici une fois ton compte confirmé.
          {' · '}
          <a href={SITE_INSCRIPTION_URL} target="_blank" rel="noopener noreferrer">S’inscrire</a>
          {' · '}
          <a href={SITE_CONNEXION_URL} target="_blank" rel="noopener noreferrer">Aller sur le site</a>
        </p>
      </div>
    </div>
  );
}

export default function RpgDesktopLogin({ children }) {
  const [horsLigne, setHorsLigne] = useState(false);

  // Hors coque PC (navigateur, APK) : aucun gate
  const [estDesktop, setEstDesktop] = useState(() => estDansCoqueDesktop());
  // Sur certains chargements, window.letsPlayDesktop arrive après le premier rendu
  // (preload) — on revérifie une fois monté.
  useEffect(() => {
    if (!estDesktop && typeof window !== 'undefined' && window.letsPlayDesktop) {
      setEstDesktop(true);
    }
  }, [estDesktop]);

  // Lecture défensive du contexte d'auth : hors provider (tests jsdom), pas de gate
  let auth = null;
  try { auth = useContext(AuthContext); } catch { return children; }
  if (!auth) return children;
  const { session, user, loading, isDemo } = auth;

  // Non-desktop : laisser passer
  if (!estDesktop) return children;

  // Choix “hors ligne” : ne plus demander
  if (horsLigne) {
    return (
      <>
        {children}
        <div className="rpg-desktop-compte" role="note">
          <span>Mode hors ligne — progression locale uniquement</span>
          <button type="button" className="rpg-desktop-compte__btn" onClick={() => setHorsLigne(false)}>Se connecter</button>
        </div>
      </>
    );
  }

  // Chargement de la session Supabase
  if (loading) {
    return <div className="rpg-desktop-login__chargement">Chargement du compte…</div>;
  }

  // Connecté avec un vrai compte Supabase → laisser entrer
  // isDemo = true signifie qu'on n'a qu'un profil démo (pas de session Supabase) → pas considéré connecté sur PC
  const connecte = Boolean(session?.user) || (Boolean(user) && !isDemo && Boolean(session));
  // Alternative : certains builds utilisent session seule
  const connecteStrict = Boolean(session?.user);
  const estConnecte = connecteStrict || connecte;

  if (estConnecte) {
    return (
      <>
        {children}
        <DesktopAccountBar />
      </>
    );
  }

  // Non connecté : écran de login
  return <LoginForm onOffline={() => setHorsLigne(true)} />;
}

/** Exposé pour les tests : la détection desktop est la seule branche testable sans Electron. */
export { estDansCoqueDesktop, SITE_INSCRIPTION_URL, SITE_CONNEXION_URL };
