import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';

const copy = {
  en: { eyebrow: 'PLAYER ACCESS', title: 'JOIN THE GAME.', intro: 'Create your Let’s Play account and keep your community profile ready for what comes next.', email: 'Email address', password: 'Password', signIn: 'SIGN IN', signUp: 'CREATE ACCOUNT', google: 'CONTINUE WITH GOOGLE', microsoft: 'CONTINUE WITH MICROSOFT', switchSignUp: 'New here? Create an account', switchSignIn: 'Already registered? Sign in', signOut: 'Sign out', back: 'Back to home', confirmation: 'Check your inbox to confirm your email address.', error: 'Something went wrong. Please try again.', unavailable: 'Authentication is not configured yet. Add the Supabase variables to the deployment.' },
  fr: { eyebrow: 'ACCÈS JOUEUR', title: 'REJOINS LE JEU.', intro: 'Crée ton compte Let’s Play et prépare ton profil pour la suite.', email: 'Adresse e-mail', password: 'Mot de passe', signIn: 'SE CONNECTER', signUp: 'CRÉER UN COMPTE', google: 'CONTINUER AVEC GOOGLE', microsoft: 'CONTINUER AVEC MICROSOFT', switchSignUp: 'Nouveau ici ? Créer un compte', switchSignIn: 'Déjà inscrit ? Se connecter', signOut: 'Se déconnecter', back: "Retour à l'accueil", confirmation: 'Vérifie ta boîte mail pour confirmer ton adresse.', error: 'Une erreur est survenue. Réessaie.', unavailable: "L'authentification n'est pas encore configurée. Ajoute les variables Supabase au déploiement." },
  ar: { eyebrow: 'دخول اللاعبين', title: 'انضم إلى اللعبة.', intro: 'أنشئ حسابك في Let’s Play واستعد لما هو قادم.', email: 'البريد الإلكتروني', password: 'كلمة المرور', signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب', google: 'المتابعة مع Google', microsoft: 'المتابعة مع Microsoft', switchSignUp: 'جديد هنا؟ أنشئ حساباً', switchSignIn: 'لديك حساب؟ سجّل الدخول', signOut: 'تسجيل الخروج', back: 'العودة إلى الرئيسية', confirmation: 'تحقق من بريدك الإلكتروني لتأكيد العنوان.', error: 'حدث خطأ. حاول مرة أخرى.', unavailable: 'المصادقة غير مهيأة بعد. أضف متغيرات Supabase إلى النشر.' },
};

export default function Auth() {
  const { user, configured } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const t = copy[lang] || copy.en;
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) {
    return <section className="auth-page wrap"><p className="eyebrow">{t.eyebrow}</p><h1>{user.email}</h1><button className="button button-yellow" onClick={async () => { await supabase.auth.signOut(); navigate('/'); }}>{t.signOut}</button></section>;
  }

  const submit = async (event) => {
    event.preventDefault();
    setMessage(''); setError(''); setBusy(true);
    const result = mode === 'signup'
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setError(result.error.message || t.error);
    else if (mode === 'signup') setMessage(t.confirmation);
    else navigate('/');
  };

  const oauth = async (provider) => {
    setError(''); setBusy(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
    if (oauthError) { setError(oauthError.message || t.error); setBusy(false); }
  };

  return <section className="auth-page wrap">
    <div className="auth-panel">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1>{t.title}</h1>
      <p className="auth-intro">{t.intro}</p>
      {!configured ? <p className="auth-message auth-error">{t.unavailable}</p> : <>
        <form className="auth-form" onSubmit={submit}>
          <label>{t.email}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
          <label>{t.password}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></label>
          <button className="button button-yellow" disabled={busy}>{mode === 'signup' ? t.signUp : t.signIn} <span>↗</span></button>
        </form>
        <div className="auth-divider"><span>OR</span></div>
        <div className="auth-socials"><button className="button button-ghost" onClick={() => oauth('google')} disabled={busy}>{t.google}</button><button className="button button-ghost" onClick={() => oauth('azure')} disabled={busy}>{t.microsoft}</button></div>
        {message && <p className="auth-message">{message}</p>}
        {error && <p className="auth-message auth-error">{error}</p>}
        <button className="auth-switch" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setMessage(''); }}>{mode === 'signup' ? t.switchSignIn : t.switchSignUp}</button>
      </>}
      <Link className="auth-back" to="/">← {t.back}</Link>
    </div>
  </section>;
}
