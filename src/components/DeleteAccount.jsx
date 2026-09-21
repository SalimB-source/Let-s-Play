import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { supabase } from '../lib/supabase';
import { clearStorage, scopeForUser } from '../achievements/storage';

const copy = {
  en: {
    delete: 'DELETE MY ACCOUNT',
    title: 'Delete your account?',
    warning: 'This action is permanent. Your profile, comments and achievements will be deleted.',
    passwordLabel: 'Confirm with your password',
    passwordPlaceholder: 'Enter your current password',
    cancel: 'CANCEL',
    confirm: 'DELETE ACCOUNT',
    deleting: 'DELETING…',
    invalidPassword: 'The password is incorrect. Your account has not been deleted.',
    unavailable: 'Account deletion is temporarily unavailable because authentication is not configured.',
    missingEmail: 'This account has no email address to verify the password.',
    setup: 'Account deletion is not available yet. The Supabase delete_my_account function must be installed from supabase/schema.sql.',
    failed: 'Unable to delete your account. Please try again.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
  fr: {
    delete: 'SUPPRIMER MON COMPTE',
    title: 'Supprimer ton compte ?',
    warning: 'Cette action est définitive. Ton profil, tes commentaires et tes succès seront supprimés.',
    passwordLabel: 'Confirme avec ton mot de passe',
    passwordPlaceholder: 'Saisis ton mot de passe actuel',
    cancel: 'ANNULER',
    confirm: 'SUPPRIMER LE COMPTE',
    deleting: 'SUPPRESSION…',
    invalidPassword: 'Le mot de passe est incorrect. Ton compte n’a pas été supprimé.',
    unavailable: 'La suppression du compte est indisponible car l’authentification n’est pas configurée.',
    missingEmail: 'Ce compte ne possède pas d’adresse e-mail pour vérifier le mot de passe.',
    setup: 'La suppression du compte n’est pas encore activée. Installe la fonction Supabase delete_my_account depuis supabase/schema.sql.',
    failed: 'Impossible de supprimer ton compte. Réessaie.',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
  },
  ar: {
    delete: 'حذف حسابي',
    title: 'هل تريد حذف حسابك؟',
    warning: 'هذا الإجراء نهائي. سيتم حذف ملفك وتعليقاتك وإنجازاتك.',
    passwordLabel: 'أكد باستخدام كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور الحالية',
    cancel: 'إلغاء',
    confirm: 'حذف الحساب',
    deleting: 'جارٍ الحذف…',
    invalidPassword: 'كلمة المرور غير صحيحة. لم يتم حذف حسابك.',
    unavailable: 'حذف الحساب غير متاح لأن المصادقة غير مهيأة.',
    missingEmail: 'لا يملك هذا الحساب بريداً إلكترونياً للتحقق من كلمة المرور.',
    setup: 'حذف الحساب غير متاح بعد. ثبّت دالة Supabase delete_my_account من supabase/schema.sql.',
    failed: 'تعذّر حذف حسابك. حاول مرة أخرى.',
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
  },
};

function isMissingDeleteFunction(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42883'
    || message.includes('delete_my_account')
    || message.includes('could not find the function');
}

/**
 * Destructive account action shared by the connected hub and the public
 * profile page. The password is checked by Supabase before the database RPC is
 * called; it is never stored or sent anywhere else.
 */
export default function DeleteAccount() {
  const { user, isDemo, signOut } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const t = copy[lang] || copy.en;
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    if (busy) return;
    setOpen(false);
    setPassword('');
    setError('');
    setShowPassword(false);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    // Bloque le scroll du fond tant que la modale est ouverte.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, busy]);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError('');

    if (!supabase) {
      setError(t.unavailable);
      return;
    }
    if (!user?.email) {
      setError(t.missingEmail);
      return;
    }

    setBusy(true);
    try {
      // Re-authenticate first. This confirms possession of the current
      // password immediately before the irreversible database operation.
      const { error: passwordError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (passwordError) {
        setError(t.invalidPassword);
        return;
      }

      const { error: deleteError } = await supabase.rpc('delete_my_account');
      if (deleteError) {
        if (isMissingDeleteFunction(deleteError)) {
          setError(t.setup);
        } else {
          setError(deleteError.message || t.failed);
        }
        return;
      }

      // Remove the local cache for this account as well as the server record.
      clearStorage(scopeForUser(user.id));
      try {
        await signOut();
      } catch {
        // The user row may already be gone, so a second server-side sign-out
        // can legitimately fail. The local session is still cleared by the
        // auth state transition, and navigation must not be blocked by it.
      }
      setPassword('');
      navigate('/', { replace: true });
    } catch (deleteError) {
      setError(deleteError?.message || t.failed);
    } finally {
      setBusy(false);
    }
  };

  // Demo personas are local previews, not real accounts and cannot be deleted.
  if (!user || isDemo) return null;

  return (
    <div className="delete-account-wrap">
      <button
        type="button"
        className="delete-account-btn"
        onClick={() => {
          setError('');
          setPassword('');
          setOpen(true);
        }}
      >
        {t.delete}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div className="delete-account-overlay" role="presentation" onMouseDown={close}>
          <div
            className="delete-account-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="delete-account-icon" aria-hidden="true">!</div>
            <h2 id="delete-account-title">{t.title}</h2>
            <p className="delete-account-warning">{t.warning}</p>
            <form className="delete-account-form" onSubmit={submit}>
              <label className="delete-account-field">
                {t.passwordLabel}
                <span className="delete-account-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t.passwordPlaceholder}
                    autoComplete="current-password"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="delete-account-eye"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? t.hidePassword : t.showPassword}
                    title={showPassword ? t.hidePassword : t.showPassword}
                  >
                    {showPassword ? '◉' : '◌'}
                  </button>
                </span>
              </label>
              {error && <p className="delete-account-error" role="alert">{error}</p>}
              <div className="delete-account-actions">
                <button type="button" className="player-edit-cancel" onClick={close} disabled={busy}>
                  {t.cancel}
                </button>
                <button type="submit" className="delete-account-confirm" disabled={busy || !password}>
                  {busy ? t.deleting : t.confirm}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
