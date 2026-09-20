import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, authRedirectUrl, supabaseConfigStatus } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { GoogleLogo, MicrosoftLogo } from '../components/SocialLogos';
import { DEMO_PROFILES } from '../auth/demoProfiles';

const copy = {
  en: {
    eyebrow: 'PLAYER ACCESS',
    title: 'JOIN THE GAME.',
    intro: 'Create your Let’s Play account and keep your community profile ready for what comes next.',
    email: 'Email address',
    password: 'Password',
    gamertag: 'Gamertag',
    gamertagPlaceholder: 'e.g. VORTEX_DZ',
    signIn: 'SIGN IN',
    signUp: 'CREATE ACCOUNT',
    google: 'CONTINUE WITH GOOGLE',
    microsoft: 'CONTINUE WITH MICROSOFT',
    switchSignUp: 'New here? Create an account',
    switchSignIn: 'Already registered? Sign in',
    signOut: 'SIGN OUT',
    back: 'Back to home',
    confirmation: 'Check your inbox to confirm your email address.',
    alreadyRegistered: 'An account with this email already exists — try signing in instead.',
    resend: 'RESEND CONFIRMATION EMAIL',
    resendSent: 'Confirmation email sent — check your inbox.',
    forgot: 'Forgot password?',
    forgotTitle: 'RESET PASSWORD.',
    forgotIntro: 'Enter your account email and we’ll send you a reset link.',
    sendReset: 'SEND RESET LINK',
    resetSent: 'Check your inbox for the password reset link.',
    updateTitle: 'NEW PASSWORD.',
    updateIntro: 'Choose a new password for your account.',
    newPassword: 'New password',
    updatePassword: 'UPDATE PASSWORD',
    passwordUpdated: 'Password updated — you’re signed in.',
    backToSignIn: 'Back to sign in',
    error: 'Something went wrong. Please try again.',
    unavailable: 'Supabase authentication is not configured in this environment. You can use the Demo Preview below.',
    diagMissing: 'Missing configuration:',
    diagHelp: 'Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Vercel → Settings → Environment Variables (or connect the Supabase integration), then redeploy.',
    demoOptionTitle: 'DEMO / PREVIEW ACCESS',
    demoOptionText: 'Want to preview how the player hub looks when connected? Enter with a simulated profile in one click.',
    demoBtnVortex: 'EXPLORE DEMO ACCOUNT (VORTEX_DZ · PRO)',
    demoBtnPixel: 'EXPLORE CREATOR ACCOUNT (PIXEL_QUEEN)',
    quickDemoLabel: 'INSTANT PREVIEW',

    // Connected profile view
    profileEyebrow: 'CONNECTED PLAYER PROFILE',
    profileTitle: 'PLAYER HUB & DASHBOARD',
    demoModeTag: 'DEMO PREVIEW ACTIVE',
    demoBannerDesc: 'You are viewing a simulated connected player session. You can test connected SSO providers, profile stats, bookmarks, and switch between demo personas.',
    switchDemoProfile: 'Switch persona',
    onlineStatus: 'ONLINE',
    verifiedPlayer: 'VERIFIED PLAYER',
    memberSince: 'MEMBER SINCE',
    levelLabel: 'LEVEL',
    tierLabel: 'TIER',
    xpLabel: 'PLAYER PROGRESSION',
    xpUnit: 'XP',
    toNextLvl: 'XP to next rank',
    statsHeading: 'COMMUNITY ACTIVITY',
    statRead: 'Articles Read',
    statComments: 'Comments',
    statSaved: 'Saved Stories',
    statBadges: 'Badges Earned',
    ssoHeading: 'LINKED ACCOUNTS & SSO',
    ssoSub: 'Manage your connected third-party gaming and social logins',
    googleAccount: 'Google Account',
    microsoftAccount: 'Microsoft Xbox Live',
    statusConnected: 'CONNECTED',
    statusNotConnected: 'NOT LINKED',
    actionDisconnect: 'Simulate Unlink',
    actionConnect: 'Simulate Link',
    linkedOn: 'Linked on',
    notLinkedDesc: 'No account linked yet',
    platformsHeading: 'GAMING HARDWARE & PLATFORMS',
    badgesHeading: 'UNLOCKED ACHIEVEMENTS & BADGES',
    savedStoriesHeading: 'SAVED STORIES & BOOKMARKS',
    readStory: 'READ STORY',
    profileActions: 'ACCOUNT ACTIONS',
    exploreNewsBtn: 'EXPLORE NEWS FEED ↗',
    returnHomeBtn: 'RETURN TO HOME',
    editProfilePrompt: 'Profile synced across Let’s Play network.',
  },
  fr: {
    eyebrow: 'ACCÈS JOUEUR',
    title: 'REJOINS LE JEU.',
    intro: 'Crée ton compte Let’s Play et prépare ton profil pour la suite.',
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    gamertag: 'Pseudo de joueur',
    gamertagPlaceholder: 'ex. VORTEX_DZ',
    signIn: 'SE CONNECTER',
    signUp: 'CRÉER UN COMPTE',
    google: 'CONTINUER AVEC GOOGLE',
    microsoft: 'CONTINUER AVEC MICROSOFT',
    switchSignUp: 'Nouveau ici ? Créer un compte',
    switchSignIn: 'Déjà inscrit ? Se connecter',
    signOut: 'SE DÉCONNECTER',
    back: "Retour à l'accueil",
    confirmation: 'Vérifie ta boîte mail pour confirmer ton adresse.',
    alreadyRegistered: 'Un compte existe déjà avec cet e-mail — connecte-toi plutôt.',
    resend: 'RENVYER L’E-MAIL DE CONFIRMATION',
    resendSent: 'E-mail de confirmation envoyé — vérifie ta boîte mail.',
    forgot: 'Mot de passe oublié ?',
    forgotTitle: 'RÉINITIALISER LE MOT DE PASSE.',
    forgotIntro: 'Entre ton e-mail et on t’envoie un lien de réinitialisation.',
    sendReset: 'ENVOYER LE LIEN',
    resetSent: 'Vérifie ta boîte mail pour le lien de réinitialisation.',
    updateTitle: 'NOUVEAU MOT DE PASSE.',
    updateIntro: 'Choisis un nouveau mot de passe pour ton compte.',
    newPassword: 'Nouveau mot de passe',
    updatePassword: 'METTRE À JOUR',
    passwordUpdated: 'Mot de passe mis à jour — tu es connecté.',
    backToSignIn: 'Retour à la connexion',
    error: 'Une erreur est survenue. Réessaie.',
    unavailable: "L'authentification Supabase n'est pas configurée dans cet environnement. Utilisez l'aperçu Démo ci-dessous.",
    diagMissing: 'Configuration manquante :',
    diagHelp: 'Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY dans Vercel → Settings → Environment Variables (ou connectez l’intégration Supabase), puis redéployez.',
    demoOptionTitle: 'ACCÈS DÉMO / APERÇU',
    demoOptionText: 'Envie de voir à quoi ressemble le profil connecté ? Testez instantanément en un clic.',
    demoBtnVortex: 'EXPLORER LE COMPTE DÉMO (VORTEX_DZ · PRO)',
    demoBtnPixel: 'EXPLORER LE COMPTE CRÉATRICE (PIXEL_QUEEN)',
    quickDemoLabel: 'APERÇU IMMÉDIAT',

    // Connected profile view
    profileEyebrow: 'PROFIL JOUEUR CONNECTÉ',
    profileTitle: 'HUB & TABLEAU DE BORD JOUEUR',
    demoModeTag: 'MODE DÉMO ACTIF',
    demoBannerDesc: 'Vous explorez une session joueur connectée simulée. Vous pouvez tester les comptes SSO liés, les statistiques, les favoris et changer de profil démo.',
    switchDemoProfile: 'Changer de profil',
    onlineStatus: 'EN LIGNE',
    verifiedPlayer: 'JOUEUR VÉRIFIÉ',
    memberSince: 'MEMBRE DEPUIS',
    levelLabel: 'NIVEAU',
    tierLabel: 'RANG',
    xpLabel: 'PROGRESSION DU JOUEUR',
    xpUnit: 'XP',
    toNextLvl: 'XP avant le prochain rang',
    statsHeading: 'ACTIVITÉ COMMUNAUTAIRE',
    statRead: 'Articles lus',
    statComments: 'Commentaires',
    statSaved: 'Articles sauvés',
    statBadges: 'Badges obtenus',
    ssoHeading: 'COMPTES CONNECTÉS & SSO',
    ssoSub: 'Gérez vos connexions tierces de jeu et réseaux',
    googleAccount: 'Compte Google',
    microsoftAccount: 'Microsoft Xbox Live',
    statusConnected: 'CONNECTÉ',
    statusNotConnected: 'NON ASSOCIÉ',
    actionDisconnect: 'Simuler déconnexion',
    actionConnect: 'Simuler liaison',
    linkedOn: 'Associé le',
    notLinkedDesc: 'Aucun compte associé pour l’instant',
    platformsHeading: 'ÉQUIPEMENT & PLATEFORMES DE JEU',
    badgesHeading: 'SUCCÈS DÉBLOQUÉS & BADGES',
    savedStoriesHeading: 'FAVORIS & ARTICLES SAUVEGARDÉS',
    readStory: 'LIRE L’ARTICLE',
    profileActions: 'ACTIONS DU COMPTE',
    exploreNewsBtn: 'VOIR LE FIL D’ACTUS ↗',
    returnHomeBtn: 'RETOUR À L’ACCUEIL',
    editProfilePrompt: 'Profil synchronisé sur tout le réseau Let’s Play.',
  },
  ar: {
    eyebrow: 'دخول اللاعبين',
    title: 'انضم إلى اللعبة.',
    intro: 'أنشئ حسابك في Let’s Play واستعد لما هو قادم.',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    gamertag: 'اسم اللاعب',
    gamertagPlaceholder: 'مثال: VORTEX_DZ',
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    google: 'المتابعة مع Google',
    microsoft: 'المتابعة مع Microsoft',
    switchSignUp: 'جديد هنا؟ أنشئ حساباً',
    switchSignIn: 'لديك حساب؟ سجّل الدخول',
    signOut: 'تسجيل الخروج',
    back: 'العودة إلى الرئيسية',
    confirmation: 'تحقق من بريدك الإلكتروني لتأكيد العنوان.',
    alreadyRegistered: 'يوجد حساب بهذا البريد بالفعل — جرّب تسجيل الدخول.',
    resend: 'إعادة إرسال بريد التأكيد',
    resendSent: 'تم إرسال بريد التأكيد — تحقق من صندوق الوارد.',
    forgot: 'نسيت كلمة المرور؟',
    forgotTitle: 'إعادة تعيين كلمة المرور.',
    forgotIntro: 'أدخل بريد حسابك وسنرسل لك رابط إعادة التعيين.',
    sendReset: 'إرسال رابط التعيين',
    resetSent: 'تحقق من بريدك للحصول على رابط إعادة التعيين.',
    updateTitle: 'كلمة مرور جديدة.',
    updateIntro: 'اختر كلمة مرور جديدة لحسابك.',
    newPassword: 'كلمة المرور الجديدة',
    updatePassword: 'تحديث كلمة المرور',
    passwordUpdated: 'تم تحديث كلمة المرور — أنت مسجل الدخول الآن.',
    backToSignIn: 'العودة إلى تسجيل الدخول',
    error: 'حدث خطأ. حاول مرة أخرى.',
    unavailable: 'المصادقة عبر Supabase غير مهيأة في هذه البيئة. يمكنك استخدام الحساب التجريبي أدناه.',
    diagMissing: 'الإعدادات الناقصة:',
    diagHelp: 'أضف VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY في Vercel ← Settings ← Environment Variables (أو اربط تكامل Supabase)، ثم أعد النشر.',
    demoOptionTitle: 'الوصول التجريبي / المعاينة',
    demoOptionText: 'هل تريد رؤية كيف يبدو حساب اللاعب عند الاتصال؟ ادخل بملف تجريبي بنقرة واحدة.',
    demoBtnVortex: 'استكشاف الحساب التجريبي (VORTEX_DZ · محترف)',
    demoBtnPixel: 'استكشاف حساب صانعة المحتوى (PIXEL_QUEEN)',
    quickDemoLabel: 'معاينة فورية',

    // Connected profile view
    profileEyebrow: 'الملف الشخصي للاعب المتصل',
    profileTitle: 'مركز ولوحة تحكم اللاعب',
    demoModeTag: 'وضع المعاينة التجريبي نشط',
    demoBannerDesc: 'أنت تتصفح جلسة لاعب متصلة تجريبية. يمكنك معاينة حسابات الدخول المرتبطة، الإحصائيات، المحفوظات والتبديل بين الشخصيات التجريبية.',
    switchDemoProfile: 'تبديل الشخصية',
    onlineStatus: 'متصل الآن',
    verifiedPlayer: 'لاعب موثق',
    memberSince: 'عضو منذ',
    levelLabel: 'المستوى',
    tierLabel: 'الفئة',
    xpLabel: 'تقدم اللاعب',
    xpUnit: 'نقطة خبرة',
    toNextLvl: 'نقطة للمستوى القادم',
    statsHeading: 'نشاط المجتمع',
    statRead: 'المقالات المقروءة',
    statComments: 'التعليقات',
    statSaved: 'المقالات المحفوظة',
    statBadges: 'الأوسمة المكتسبة',
    ssoHeading: 'الحسابات المتصلة وتسجيل الدخول',
    ssoSub: 'إدارة حسابات تسجيل الدخول المرتبطة بالألعاب والخدمات الخارجية',
    googleAccount: 'حساب Google',
    microsoftAccount: 'حساب Microsoft Xbox Live',
    statusConnected: 'متصل',
    statusNotConnected: 'غير مربوط',
    actionDisconnect: 'محاكاة الفصل',
    actionConnect: 'محاكاة الربط',
    linkedOn: 'مرتبط بتاريخ',
    notLinkedDesc: 'لم يتم ربط حساب بعد',
    platformsHeading: 'منصات وأجهزة اللعب',
    badgesHeading: 'الإنجازات والأوسمة المفتوحة',
    savedStoriesHeading: 'المقالات المحفوظة للقراءة لاحقًا',
    readStory: 'اقرأ المقال',
    profileActions: 'إجراءات الحساب',
    exploreNewsBtn: 'تصفح آخر الأخبار ↗',
    returnHomeBtn: 'العودة للرئيسية',
    editProfilePrompt: 'الملف الشخصي متزامن عبر شبكة Let’s Play.',
  },
};

export default function Auth({ initialMode = 'signup' }) {
  const {
    user,
    isDemo,
    demoProfileKey,
    configured,
    loginAsDemo,
    toggleDemoProvider,
    signOut,
  } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const t = copy[lang] || copy.en;

  const [mode, setMode] = useState(initialMode === 'update' ? 'signin' : initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gamertag, setGamertag] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  // Password-recovery links land here with `#access_token=…&type=recovery`.
  // Supabase signs the user in from that hash, so without this guard the
  // player hub would render before a new password is chosen. The hash check
  // is deterministic (no race with the auth event), the listener is a backup.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      setIsRecovery(true);
      setMode('update');
    }
    if (!supabase) return undefined;
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        setMode('update');
        setMessage('');
        setError('');
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setMessage('');
    setShowResend(false);
  };

  // Handle Form Submission (signup / signin / forgot / update)
  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setShowResend(false);
    setBusy(true);

    if (!configured || !supabase) {
      setBusy(false);
      setError(t.unavailable);
      return;
    }

    try {
      if (mode === 'signup') {
        const tag = gamertag.trim() || email.split('@')[0] || 'Player_DZ';
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { gamertag: tag, full_name: tag, fullName: tag, name: tag },
            emailRedirectTo: authRedirectUrl(),
          },
        });
        if (signUpError) {
          setError(signUpError.message || t.error);
        } else if (data.session) {
          // Email confirmation disabled → already signed in.
          navigate('/');
          return;
        } else if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          // Supabase hides duplicate registrations: no identities = email taken.
          setMode('signin');
          setError(t.alreadyRegistered);
        } else {
          setMessage(t.confirmation);
          setShowResend(true);
        }
      } else if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(signInError.message || t.error);
        } else {
          navigate('/');
          return;
        }
      } else if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: authRedirectUrl(),
        });
        if (resetError) {
          setError(resetError.message || t.error);
        } else {
          setMessage(t.resetSent);
        }
      } else if (mode === 'update') {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
          setError(updateError.message || t.error);
        } else {
          setIsRecovery(false);
          setPassword('');
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
          setMessage(t.passwordUpdated);
        }
      }
    } catch (e) {
      setError(e?.message || t.error);
    } finally {
      setBusy(false);
    }
  };

  // Resend the signup confirmation email.
  const resendConfirmation = async () => {
    setError('');
    setMessage('');
    setBusy(true);
    if (!configured || !supabase) {
      setBusy(false);
      setError(t.unavailable);
      return;
    }
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });
    setBusy(false);
    if (resendError) {
      setError(resendError.message || t.error);
    } else {
      setMessage(t.resendSent);
    }
  };

  // Handle OAuth Provider Login
  const oauth = async (provider) => {
    setError('');
    setBusy(true);
    if (!configured || !supabase) {
      setBusy(false);
      setError(t.unavailable);
      return;
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: authRedirectUrl() },
    });
    if (oauthError) {
      setError(oauthError.message || t.error);
      setBusy(false);
    }
  };

  // Handle Demo Login
  const handleDemoLogin = (profileKey) => {
    setError('');
    setMessage('');
    loginAsDemo(profileKey);
  };

  // --------------------------------------------------------------------------
  // CONNECTED ACCOUNT / PLAYER DASHBOARD VIEW
  // (skipped while a password recovery is in progress — the new-password
  // form below takes precedence even though a session already exists)
  // --------------------------------------------------------------------------
  if (user && !isRecovery) {
    const meta = user.user_metadata || {};
    const gamertag = meta.gamertag || user.email?.split('@')[0] || 'Player_DZ';
    const fullName = meta.fullName || user.email || 'Let’s Play Player';
    const role = meta.role || 'COMMUNITY PLAYER';
    const tier = meta.tier || 'TIER I · MEMBER';
    const rankTitle = meta.rankTitle || 'Novice Gamer';
    const level = meta.level || 25;
    const xp = meta.xp || 2400;
    const nextLevelXp = meta.nextLevelXp || 3000;
    const xpPercentage = Math.min(100, Math.round((xp / nextLevelXp) * 100));
    const joinedDate = meta.joinedDate || 'September 2026';
    const location = meta.location || 'Algeria';
    const bio = meta.bio || 'Exploring new gaming horizons with the Let’s Play community.';
    const avatar = meta.avatar;

    const stats = meta.stats || {
      articlesRead: 14,
      commentsPosted: 6,
      savedArticles: 2,
      badgesUnlocked: 3,
    };

    const isGoogleConnected = meta.googleConnected !== undefined ? meta.googleConnected : true;
    const googleEmail = meta.googleEmail || user.email || 'player@gmail.com';
    const googleLinkedDate = meta.googleLinkedDate || '12 Oct 2024';

    const isMicrosoftConnected = meta.microsoftConnected !== undefined ? meta.microsoftConnected : true;
    const microsoftGamertag = meta.microsoftGamertag || `${gamertag}#9901`;
    const microsoftLinkedDate = meta.microsoftLinkedDate || '04 Nov 2024';

    const platforms = meta.platforms || ['PS5', 'PC', 'SWITCH 2', 'XBOX SERIES X'];
    const badges = meta.badges || [
      { id: 'early', icon: '⚡', name: 'Community Pioneer', desc: 'Registered on Let’s Play', rarity: 'Rare' },
      { id: 'critic', icon: '✍️', name: 'Engaged Reader', desc: 'Active reader on news & reviews', rarity: 'Rare' },
      { id: 'comiccon', icon: '🎟️', name: 'GCC Dzaïr Pass', desc: 'Convention 2026 registered', rarity: 'Epic' },
    ];

    const savedArticles = meta.savedArticlesList || [
      { id: 'gta6', title: 'GTA VI & DualSense: Haptic Feedback Deep Dive', category: 'TECH / HARDWARE', readTime: '5 MIN READ', link: '/news/gta6-dualsense' },
      { id: 'onimusha', title: 'Onimusha: Way of the Sword — Review (8.5/10)', category: 'TEST / ACTION', readTime: '6 MIN READ', link: '/reviews/onimusha' },
      { id: 'zelda', title: 'Zelda: Ocarina of Time Remake on Switch 2', category: 'NEWS / FIRST LOOK', readTime: '4 MIN READ', link: '/news/zelda-ocarina' },
      { id: 'physint', title: 'Physint Moves to Xbox: Kojima’s Next Big Leap', category: 'INDUSTRY SHIFT', readTime: '6 MIN READ', link: '/news/physint' },
    ];

    return (
      <section className="auth-page wrap">
        <div className="player-hub">
          {/* DEMO MODE NOTICE BANNER */}
          {isDemo && (
            <div className="player-demo-banner">
              <div className="player-demo-banner-left">
                <span className="player-demo-pill">{t.demoModeTag}</span>
                <span className="player-demo-text">{t.demoBannerDesc}</span>
              </div>
              <button
                type="button"
                className="player-demo-switch-btn"
                onClick={() => handleDemoLogin(demoProfileKey === 'vortex' ? 'pixel' : 'vortex')}
              >
                ⇄ {t.switchDemoProfile} ({demoProfileKey === 'vortex' ? 'PIXEL_QUEEN' : 'VORTEX_DZ'})
              </button>
            </div>
          )}

          {/* PLAYER PROFILE HERO CARD */}
          <div className="player-profile-card">
            <div className="player-header-layout">
              <div className="player-avatar-wrap">
                {avatar ? (
                  <img src={avatar} alt={gamertag} className="player-avatar-img" />
                ) : (
                  <div className="player-avatar-fallback">{gamertag.slice(0, 2).toUpperCase()}</div>
                )}
                <span className="player-status-badge">
                  <span className="player-status-dot" aria-hidden="true" />
                  {t.onlineStatus}
                </span>
              </div>

              <div className="player-identity">
                <div className="player-tags-row">
                  <span className="player-badge-tier">{tier}</span>
                  <span className="player-badge-verified">⚡ {t.verifiedPlayer}</span>
                  {meta.rankTag && <span className="player-badge-tier">{meta.rankTag}</span>}
                </div>

                <h1 className="player-gamertag">{gamertag}</h1>

                <div className="player-meta-line">
                  <span><strong>{fullName}</strong></span>
                  <span>•</span>
                  <span>{user.email}</span>
                  <span>•</span>
                  <span>{location}</span>
                  <span>•</span>
                  <span>{t.memberSince}: {joinedDate}</span>
                </div>

                <p className="player-bio">{bio}</p>
              </div>
            </div>

            {/* XP PROGRESSION BAR */}
            <div className="player-xp-section">
              <div className="player-xp-header">
                <span className="player-xp-level-tag">
                  {t.levelLabel} {level} — {rankTitle}
                </span>
                <span className="player-xp-count">
                  {xp.toLocaleString()} / {nextLevelXp.toLocaleString()} {t.xpUnit} ({xpPercentage}%)
                </span>
              </div>
              <div className="player-xp-bar-bg">
                <div className="player-xp-bar-fill" style={{ width: `${xpPercentage}%` }} />
              </div>
            </div>
          </div>

          {/* COMMUNITY STATS GRID */}
          <div className="player-stats-grid">
            <div className="player-stat-card">
              <div className="player-stat-value">{stats.articlesRead}</div>
              <div className="player-stat-label">{t.statRead}</div>
            </div>
            <div className="player-stat-card">
              <div className="player-stat-value">{stats.commentsPosted}</div>
              <div className="player-stat-label">{t.statComments}</div>
            </div>
            <div className="player-stat-card">
              <div className="player-stat-value">{stats.savedArticles}</div>
              <div className="player-stat-label">{t.statSaved}</div>
            </div>
            <div className="player-stat-card">
              <div className="player-stat-value">{stats.badgesUnlocked}</div>
              <div className="player-stat-label">{t.statBadges}</div>
            </div>
          </div>

          {/* LINKED ACCOUNTS & SSO SECTION */}
          <div className="player-section">
            <div className="player-section-header">
              <h2>{t.ssoHeading}</h2>
              <p>{t.ssoSub}</p>
            </div>

            <div className="sso-providers-grid">
              {/* GOOGLE ACCOUNT CARD */}
              <div className={`sso-provider-card ${isGoogleConnected ? 'connected' : 'disconnected'}`}>
                <div className="sso-provider-top">
                  <div className="sso-provider-identity">
                    <div className="sso-provider-icon-frame">
                      <GoogleLogo size={22} />
                    </div>
                    <div>
                      <div className="sso-provider-name">{t.googleAccount}</div>
                      <div className="sso-provider-account">
                        {isGoogleConnected ? googleEmail : t.notLinkedDesc}
                      </div>
                    </div>
                  </div>
                  <span className={`sso-badge-status ${isGoogleConnected ? 'connected' : 'disconnected'}`}>
                    {isGoogleConnected ? `✓ ${t.statusConnected}` : t.statusNotConnected}
                  </span>
                </div>

                <div className="sso-provider-footer">
                  <span className="sso-linked-date">
                    {isGoogleConnected ? `${t.linkedOn} ${googleLinkedDate}` : t.notLinkedDesc}
                  </span>
                  {isDemo && (
                    <button
                      type="button"
                      className="sso-toggle-btn"
                      onClick={() => toggleDemoProvider('google')}
                    >
                      {isGoogleConnected ? t.actionDisconnect : t.actionConnect}
                    </button>
                  )}
                </div>
              </div>

              {/* MICROSOFT ACCOUNT CARD */}
              <div className={`sso-provider-card ${isMicrosoftConnected ? 'connected' : 'disconnected'}`}>
                <div className="sso-provider-top">
                  <div className="sso-provider-identity">
                    <div className="sso-provider-icon-frame">
                      <MicrosoftLogo size={20} />
                    </div>
                    <div>
                      <div className="sso-provider-name">{t.microsoftAccount}</div>
                      <div className="sso-provider-account">
                        {isMicrosoftConnected ? microsoftGamertag : t.notLinkedDesc}
                      </div>
                    </div>
                  </div>
                  <span className={`sso-badge-status ${isMicrosoftConnected ? 'connected' : 'disconnected'}`}>
                    {isMicrosoftConnected ? `✓ ${t.statusConnected}` : t.statusNotConnected}
                  </span>
                </div>

                <div className="sso-provider-footer">
                  <span className="sso-linked-date">
                    {isMicrosoftConnected ? `${t.linkedOn} ${microsoftLinkedDate}` : t.notLinkedDesc}
                  </span>
                  {isDemo && (
                    <button
                      type="button"
                      className="sso-toggle-btn"
                      onClick={() => toggleDemoProvider('microsoft')}
                    >
                      {isMicrosoftConnected ? t.actionDisconnect : t.actionConnect}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* GAMING PLATFORMS */}
          <div className="player-section">
            <div className="player-section-header">
              <h2>{t.platformsHeading}</h2>
            </div>
            <div className="player-platforms-row">
              {platforms.map((platform) => (
                <span key={platform} className="player-platform-pill">
                  🎮 {platform}
                </span>
              ))}
            </div>
          </div>

          {/* UNLOCKED BADGES & ACHIEVEMENTS */}
          <div className="player-section">
            <div className="player-section-header">
              <h2>{t.badgesHeading}</h2>
            </div>
            <div className="player-badges-grid">
              {badges.map((badge) => (
                <div key={badge.id} className="player-badge-item">
                  <span className="player-badge-icon">{badge.icon}</span>
                  <div className="player-badge-info">
                    <h4>{badge.name}</h4>
                    <p>{badge.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SAVED STORIES & BOOKMARKS */}
          <div className="player-section">
            <div className="player-section-header">
              <h2>{t.savedStoriesHeading}</h2>
            </div>
            <div className="player-saved-grid">
              {savedArticles.map((story) => (
                <Link to={story.link} key={story.id} className="player-saved-card">
                  <div>
                    <div className="player-saved-meta">
                      <span>{story.category}</span>
                      <span>{story.readTime}</span>
                    </div>
                    <h3 className="player-saved-title">{story.title}</h3>
                  </div>
                  <span className="player-saved-link">
                    {t.readStory} ↗
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* ACCOUNT ACTIONS CARD */}
          <div className="player-actions-card">
            <div className="player-actions-left">
              <Link to="/news" className="button button-yellow">
                {t.exploreNewsBtn}
              </Link>
              <Link to="/" className="button button-ghost">
                {t.returnHomeBtn}
              </Link>
            </div>
            <button
              type="button"
              className="player-signout-btn"
              onClick={async () => {
                await signOut();
                navigate('/auth');
              }}
            >
              ⏻ {t.signOut}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // --------------------------------------------------------------------------
  // UNAUTHENTICATED / LOGIN & SIGNUP VIEW
  // --------------------------------------------------------------------------
  const showSocials = mode === 'signup' || mode === 'signin';
  const missingConfig = [
    supabaseConfigStatus.hasUrl ? null : 'VITE_SUPABASE_URL',
    supabaseConfigStatus.hasKey ? null : 'VITE_SUPABASE_PUBLISHABLE_KEY',
  ].filter(Boolean);

  return (
    <section className="auth-page wrap">
      <div className="auth-panel">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{mode === 'forgot' ? t.forgotTitle : mode === 'update' ? t.updateTitle : t.title}</h1>
        <p className="auth-intro">{mode === 'forgot' ? t.forgotIntro : mode === 'update' ? t.updateIntro : t.intro}</p>

        {/* EMAIL / PASSWORD FORM */}
        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <label>
              {t.gamertag}
              <input
                type="text"
                value={gamertag}
                onChange={(e) => setGamertag(e.target.value)}
                placeholder={t.gamertagPlaceholder}
                maxLength={24}
                autoComplete="nickname"
              />
            </label>
          )}
          {mode !== 'update' && (
            <label>
              {t.email}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
          )}
          {mode !== 'forgot' && (
            <label>
              {mode === 'update' ? t.newPassword : t.password}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </label>
          )}
          <button className="button button-yellow" disabled={busy}>
            {mode === 'signup' ? t.signUp : mode === 'signin' ? t.signIn : mode === 'forgot' ? t.sendReset : t.updatePassword} <span>↗</span>
          </button>
        </form>

        {mode === 'signin' && (
          <div className="auth-aux-row">
            <button type="button" className="auth-link" onClick={() => switchMode('forgot')}>
              {t.forgot}
            </button>
          </div>
        )}

        {showResend && mode === 'signup' && (
          <button
            type="button"
            className="auth-resend"
            onClick={resendConfirmation}
            disabled={busy || !email.trim()}
          >
            {t.resend} ↻
          </button>
        )}

        {showSocials && (
          <>
            {/* OR DIVIDER */}
            <div className="auth-divider">
              <span>OR</span>
            </div>

            {/* SOCIAL AUTH BUTTONS WITH LOGOS */}
            <div className="auth-socials">
              <button
                type="button"
                className="button button-ghost auth-social-btn"
                onClick={() => oauth('google')}
                disabled={busy}
              >
                <GoogleLogo size={18} />
                <span>{t.google}</span>
              </button>
              <button
                type="button"
                className="button button-ghost auth-social-btn"
                onClick={() => oauth('azure')}
                disabled={busy}
              >
                <MicrosoftLogo size={18} />
                <span>{t.microsoft}</span>
              </button>
            </div>
          </>
        )}

        {/* FAKE CONNECTED ACCOUNT PREVIEW CARD */}
        {showSocials && <div className="auth-demo-box">
          <div className="auth-demo-header">
            <span className="auth-demo-kicker">🎮 {t.demoOptionTitle}</span>
            <span className="auth-demo-tag">{t.quickDemoLabel}</span>
          </div>
          <p>{t.demoOptionText}</p>
          <div className="auth-demo-actions">
            <button
              type="button"
              className="button-demo-primary"
              onClick={() => handleDemoLogin('vortex')}
            >
              <span>⚡</span> {t.demoBtnVortex}
            </button>
            <button
              type="button"
              className="button-demo-secondary"
              onClick={() => handleDemoLogin('pixel')}
            >
              <span>🎥</span> {t.demoBtnPixel}
            </button>
          </div>
        </div>}

        {!configured && (
          <div className="auth-message auth-config-box">
            <span>{t.unavailable}</span>
            {missingConfig.length > 0 && (
              <span className="auth-diag-line">{t.diagMissing} {missingConfig.join(' · ')}</span>
            )}
            <span className="auth-diag-help">{t.diagHelp}</span>
          </div>
        )}
        {message && <p className="auth-message">{message}</p>}
        {error && <p className="auth-message auth-error">{error}</p>}

        {(mode === 'signup' || mode === 'signin') ? (
          <button
            type="button"
            className="auth-switch"
            onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
          >
            {mode === 'signup' ? t.switchSignIn : t.switchSignUp}
          </button>
        ) : (
          <button
            type="button"
            className="auth-switch"
            onClick={() => switchMode('signin')}
          >
            {t.backToSignIn}
          </button>
        )}

        <Link className="auth-back" to="/">
          ← {t.back}
        </Link>
      </div>
    </section>
  );
}
