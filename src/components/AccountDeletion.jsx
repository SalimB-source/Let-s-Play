import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { deleteAccountWithPassword } from '../lib/account';

const COPY = {
  en: {
    eyebrow: 'DANGER ZONE',
    title: 'Delete your account',
    intro: 'This permanently deletes your Let’s Play profile, comments and achievements. This action cannot be undone.',
    open: 'DELETE MY ACCOUNT',
    passwordLabel: 'Current password',
    passwordPlaceholder: 'Enter your current password',
    passwordHint: 'Confirm your identity with the password you use to sign in.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    cancel: 'CANCEL',
    confirm: 'DELETE ACCOUNT',
    deleting: 'DELETING…',
    required: 'Enter your current password to continue.',
    wrongPassword: 'The password is incorrect.',
    unavailable: 'Account deletion is not available for this sign-in method. Use an email and password account.',
    notConfigured: 'Account deletion is not configured on this deployment yet. Run the latest supabase/schema.sql in the Supabase SQL Editor.',
    network: 'Unable to reach Supabase. Check your connection and try again.',
    error: 'Your account could not be deleted. Please try again.',
  },
  fr: {
    eyebrow: 'ZONE DANGEREUSE',
    title: 'Supprimer votre compte',
    intro: 'Cette action supprime définitivement votre profil Let’s Play, vos commentaires et vos succès. Elle est irréversible.',
    open: 'SUPPRIMER MON COMPTE',
    passwordLabel: 'Mot de passe actuel',
    passwordPlaceholder: 'Saisissez votre mot de passe actuel',
    passwordHint: 'Confirmez votre identité avec le mot de passe utilisé pour vous connecter.',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
    cancel: 'ANNULER',
    confirm: 'SUPPRIMER LE COMPTE',
    deleting: 'SUPPRESSION…',
    required: 'Saisissez votre mot de passe actuel pour continuer.',
    wrongPassword: 'Le mot de passe est incorrect.',
    unavailable: 'La suppression n’est pas disponible pour ce mode de connexion. Utilisez un compte avec e-mail et mot de passe.',
    notConfigured: 'La suppression du compte n’est pas encore configurée sur ce déploiement. Exécutez le dernier fichier supabase/schema.sql dans l’éditeur SQL de Supabase.',
    network: 'Impossible de joindre Supabase. Vérifiez votre connexion puis réessayez.',
    error: 'Votre compte n’a pas pu être supprimé. Réessayez.',
  },
  ar: {
    eyebrow: 'منطقة خطرة',
    title: 'حذف حسابك',
    intro: 'سيؤدي هذا إلى حذف ملفك وتعليقاتك وإنجازاتك في Let’s Play نهائيًا. لا يمكن التراجع عن هذا الإجراء.',
    open: 'حذف حسابي',
    passwordLabel: 'كلمة المرور الحالية',
    passwordPlaceholder: 'أدخل كلمة المرور الحالية',
    passwordHint: 'أكد هويتك باستخدام كلمة المرور التي تستعملها لتسجيل الدخول.',
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
    cancel: 'إلغاء',
    confirm: 'حذف الحساب',
    deleting: 'جارٍ الحذف…',
    required: 'أدخل كلمة المرور الحالية للمتابعة.',
    wrongPassword: 'كلمة المرور غير صحيحة.',
    unavailable: 'الحذف غير متاح لطريقة تسجيل الدخول هذه. استخدم حسابًا بالبريد الإلكتروني وكلمة المرور.',
    notConfigured: 'لم يُفعّل حذف الحساب في هذا النشر بعد. شغّل أحدث ملف supabase/schema.sql في محرر SQL في Supabase.',
    network: 'تعذّر الوصول إلى Supabase. تحقق من الاتصال وحاول مجددًا.',
    error: 'تعذّر حذف حسابك. حاول مجددًا.',
  },
};

function errorMessage(error, copy) {
  const code = error?.code || '';
  const message = error?.message || '';

  if (code === 'invalid_credentials' || /invalid login credentials|invalid.*password|password.*incorrect/i.test(message)) {
    return copy.wrongPassword;
  }
  if (code === 'password_reauthentication_unavailable' || code === 'account_changed') {
    return copy.unavailable;
  }
  if (code === 'supabase_not_configured') {
    return copy.network;
  }
  if (code === 'PGRST202' || code === '42883' || /delete_current_user|function .* does not exist|schema cache/i.test(message)) {
    return copy.notConfigured;
  }
  if (error?.status === 0 || /failed to fetch|load failed|networkerror|network request failed|fetch failed/i.test(message)) {
    return copy.network;
  }
  return copy.error;
}

/** Destructive account control shared by the connected hub and own profile. */
export default function AccountDeletion() {
  const { user, isDemo, signOut } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const copy = COPY[lang] || COPY.en;
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Demo personas are stored locally and are not real accounts. Hiding the
  // destructive control prevents suggesting that the preview can delete data.
  if (!user || isDemo) return null;

  const close = () => {
    if (busy) return;
    setOpen(false);
    setPassword('');
    setShowPassword(false);
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!password) {
      setError(copy.required);
      return;
    }

    setBusy(true);
    try {
      await deleteAccountWithPassword(user, password);
      // deleteAccountWithPassword has already invalidated the local Supabase
      // token. AuthContext also clears its in-memory session here, then the
      // player is returned to the public home page.
      await signOut();
      navigate('/', { replace: true });
    } catch (deleteError) {
      setError(errorMessage(deleteError, copy));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="account-delete-section" aria-labelledby="account-delete-title">
      <div className="account-delete-copy">
        <p className="account-delete-eyebrow">{copy.eyebrow}</p>
        <h2 id="account-delete-title">{copy.title}</h2>
        <p>{copy.intro}</p>
      </div>

      {!open ? (
        <button
          type="button"
          className="account-delete-button"
          onClick={() => {
            setError('');
            setOpen(true);
          }}
        >
          {copy.open}
        </button>
      ) : (
        <form className="account-delete-form" onSubmit={submit}>
          <label className="account-delete-field">
            {copy.passwordLabel}
            <span className="auth-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={copy.passwordPlaceholder}
                autoComplete="current-password"
                autoFocus
                required
                disabled={busy}
              />
              <button
                type="button"
                className="auth-eye-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                title={showPassword ? copy.hidePassword : copy.showPassword}
                disabled={busy}
              >
                {showPassword ? '◉' : '◌'}
              </button>
            </span>
          </label>
          <p className="account-delete-hint">{copy.passwordHint}</p>
          <div className="account-delete-actions">
            <button type="submit" className="account-delete-confirm" disabled={busy}>
              {busy ? copy.deleting : copy.confirm}
            </button>
            <button type="button" className="account-delete-cancel" onClick={close} disabled={busy}>
              {copy.cancel}
            </button>
          </div>
          {error && <p className="account-delete-error" role="alert">{error}</p>}
        </form>
      )}
    </section>
  );
}
