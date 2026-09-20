import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase, authRedirectUrl, supabaseConfigStatus } from '../lib/supabase';
import { syncDemoCommentsForUser, syncSupabaseProfileAndComments } from '../lib/comments';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { describeAuthError } from '../lib/authErrors';
import { useAchievementAction, useAchievements } from '../achievements/AchievementContext';
import { metricValue } from '../achievements/engine';
import { levelTitle } from '../achievements/catalog';
import AchievementsPanel from '../achievements/AchievementsPanel';
import DeleteAccount from '../components/DeleteAccount';

/* ------------------------------------------------------------------ */
/* Small inline icons (no external deps, inherits currentColor)        */
/* ------------------------------------------------------------------ */
function EyeIcon({ off = false, size = 18 }) {
  return (
    <svg
      className="auth-eye-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3.2" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}

function CameraIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8h3.2l1.8-2.8h6L16.8 8H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}

function CheckIcon({ size = 30 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  );
}

function PencilIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}

const copy = {
  en: {
    eyebrow: 'PLAYER ACCESS',
    title: 'JOIN THE GAME.',
    intro: 'Create your Let’s Play account and keep your community profile ready for what comes next.',
    email: 'Email address',
    password: 'Password',
    confirmPassword: 'Confirm password',
    passwordHint: 'Use at least 6 characters.',
    passwordMismatch: 'The two passwords don’t match.',
    gamertagRequired: 'Choose a gamertag to join.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    gamertag: 'Gamertag',
    gamertagPlaceholder: 'e.g. VORTEX_DZ',
    gamertagHint: 'This is how you’ll appear across the community.',
    signIn: 'SIGN IN',
    signUp: 'CREATE ACCOUNT',
    google: 'CONTINUE WITH GOOGLE',
    microsoft: 'CONTINUE WITH MICROSOFT',
    or: 'OR',
    noAccount: 'Don’t have an account yet?',
    registerHere: 'Register here',
    switchSignUp: 'New here? Create an account',
    switchSignIn: 'Already registered? Sign in',
    connectedPopup: 'You are connected',
    connectedPopupSub: 'Welcome to your player hub — good to have you, player!',
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
    errNetwork: 'Unable to reach the Supabase server — check that the project URL and key are correct and that the project is not paused.',
    errEmailNotConfirmed: 'Your email address is not confirmed yet — open the confirmation link we sent you, or resend it below.',
    errInvalidCredentials: 'Wrong email address or password.',
    errRateLimited: 'Too many attempts — wait a few minutes before trying again.',
    errProviderDisabled: 'This sign-in provider is not enabled on the Supabase project yet — enable it in Authentication → Providers, or sign in with your email address.',
    unavailable: 'Supabase authentication is not configured in this environment. You can use the Demo Preview below.',
    diagMissing: 'Missing configuration:',
    diagHelp: 'Build-time variables: Vercel → Settings → Environment Variables, GitHub Pages → Settings → Secrets and variables → Actions → Variables (both names above), or a local .env.local copied from .env.example. Redeploy after adding them.',
    demoOptionTitle: 'DEMO / PREVIEW ACCESS',
    demoOptionText: 'Want to preview how the player hub looks when connected? Enter with a simulated profile in one click.',
    demoBtnVortex: 'EXPLORE DEMO ACCOUNT (VORTEX_DZ · PRO)',
    demoBtnPixel: 'EXPLORE CREATOR ACCOUNT (PIXEL_QUEEN)',
    quickDemoLabel: 'INSTANT PREVIEW',

    // Connected profile view
    profileEyebrow: 'CONNECTED PLAYER PROFILE',
    profileTitle: 'PLAYER HUB & DASHBOARD',
    demoModeTag: 'DEMO PREVIEW ACTIVE',
    demoBannerDesc: 'You are viewing a simulated connected player session. You can preview profile stats, badges and bookmarks, and switch between demo personas.',
    switchDemoProfile: 'Switch persona',
    onlineStatus: 'ONLINE',
    verifiedPlayer: 'VERIFIED PLAYER',
    memberSince: 'MEMBER SINCE',
    levelLabel: 'LEVEL',
    tierLabel: 'TIER',
    xpLabel: 'PLAYER PROGRESSION',
    xpUnit: 'XP',
    xpEarnedLabel: 'XP earned',
    toNextLvl: 'XP to next rank',
    statsHeading: 'COMMUNITY ACTIVITY',
    statRead: 'Articles Read',
    statComments: 'Comments',
    statSaved: 'Saved Stories',
    statBadges: 'Achievements unlocked',
    platformsHeading: 'GAMING HARDWARE & PLATFORMS',
    noPlatformsYet: 'No platforms added yet.',
    badgesHeading: 'UNLOCKED ACHIEVEMENTS & BADGES',
    demoBadgesNote: 'Persona medals shown by the demo preview — your own achievements are listed above.',
    savedStoriesHeading: 'SAVED STORIES & BOOKMARKS',
    noSavedYet: 'No saved stories yet — explore the news feed and bookmark what you like.',
    readStory: 'READ STORY',
    profileActions: 'ACCOUNT ACTIONS',
    exploreNewsBtn: 'EXPLORE NEWS FEED ↗',
    returnHomeBtn: 'RETURN TO HOME',
    editProfilePrompt: 'Profile synced across Let’s Play network.',
    editProfile: 'EDIT PROFILE',
    editProfileTitle: 'EDIT YOUR PROFILE',
    avatarUrlLabel: 'Avatar image URL',
    avatarUrlPlaceholder: 'https://…',
    saveChanges: 'SAVE CHANGES',
    saving: 'SAVING…',
    cancelEdit: 'Cancel',
    profileSaved: 'Profile updated.',
    profileSaveError: 'Couldn’t save your profile. Please try again.',
    avatarUploadHint: 'Click your photo to upload your own image',
    avatarUpdated: 'Photo updated.',
    avatarUploadError: 'Couldn’t upload your photo. Please try again.',
    avatarInvalidType: 'Please choose an image file (JPG, PNG, WebP…)',
  },
  fr: {
    eyebrow: 'ACCÈS JOUEUR',
    title: 'REJOINS LE JEU.',
    intro: 'Crée ton compte Let’s Play et prépare ton profil pour la suite.',
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    passwordHint: 'Utilise au moins 6 caractères.',
    passwordMismatch: 'Les deux mots de passe ne correspondent pas.',
    gamertagRequired: 'Choisis un pseudo pour rejoindre.',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
    gamertag: 'Pseudo de joueur',
    gamertagPlaceholder: 'ex. VORTEX_DZ',
    gamertagHint: 'C’est ainsi que tu apparaîtras dans la communauté.',
    signIn: 'SE CONNECTER',
    signUp: 'CRÉER UN COMPTE',
    google: 'CONTINUER AVEC GOOGLE',
    microsoft: 'CONTINUER AVEC MICROSOFT',
    or: 'OU',
    noAccount: 'Tu n’as pas encore de compte ?',
    registerHere: 'Inscris-toi ici',
    switchSignUp: 'Nouveau ici ? Créer un compte',
    switchSignIn: 'Déjà inscrit ? Se connecter',
    connectedPopup: 'Tu es connecté',
    connectedPopupSub: 'Bienvenue dans ton hub joueur — content de te voir, joueur !',
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
    errNetwork: 'Impossible de joindre le serveur Supabase — vérifie l’URL et la clé du projet, et que le projet n’est pas en pause.',
    errEmailNotConfirmed: 'Ton adresse e-mail n’est pas encore confirmée — ouvre le lien de confirmation reçu, ou renvoie-le ci-dessous.',
    errInvalidCredentials: 'Adresse e-mail ou mot de passe incorrect.',
    errRateLimited: 'Trop de tentatives — patiente quelques minutes avant de réessayer.',
    errProviderDisabled: 'Ce fournisseur de connexion n’est pas encore activé sur le projet Supabase — active-le dans Authentication → Providers, ou connecte-toi avec ton adresse e-mail.',
    unavailable: "L'authentification Supabase n'est pas configurée dans cet environnement. Utilisez l'aperçu Démo ci-dessous.",
    diagMissing: 'Configuration manquante :',
    diagHelp: 'Variables lues à la compilation : Vercel → Settings → Environment Variables, GitHub Pages → Settings → Secrets and variables → Actions → Variables (les deux noms ci-dessus), ou un fichier .env.local copié depuis .env.example. Redéployez après les avoir ajoutées.',
    demoOptionTitle: 'ACCÈS DÉMO / APERÇU',
    demoOptionText: 'Envie de voir à quoi ressemble le profil connecté ? Testez instantanément en un clic.',
    demoBtnVortex: 'EXPLORER LE COMPTE DÉMO (VORTEX_DZ · PRO)',
    demoBtnPixel: 'EXPLORER LE COMPTE CRÉATRICE (PIXEL_QUEEN)',
    quickDemoLabel: 'APERÇU IMMÉDIAT',

    // Connected profile view
    profileEyebrow: 'PROFIL JOUEUR CONNECTÉ',
    profileTitle: 'HUB & TABLEAU DE BORD JOUEUR',
    demoModeTag: 'MODE DÉMO ACTIF',
    demoBannerDesc: 'Vous explorez une session joueur connectée simulée. Vous pouvez prévisualiser les statistiques, les badges et les favoris, et changer de profil démo.',
    switchDemoProfile: 'Changer de profil',
    onlineStatus: 'EN LIGNE',
    verifiedPlayer: 'JOUEUR VÉRIFIÉ',
    memberSince: 'MEMBRE DEPUIS',
    levelLabel: 'NIVEAU',
    tierLabel: 'RANG',
    xpLabel: 'PROGRESSION DU JOUEUR',
    xpUnit: 'XP',
    xpEarnedLabel: 'XP gagnés',
    toNextLvl: 'XP avant le prochain rang',
    statsHeading: 'ACTIVITÉ COMMUNAUTAIRE',
    statRead: 'Articles lus',
    statComments: 'Commentaires',
    statSaved: 'Articles sauvés',
    statBadges: 'Succès obtenus',
    platformsHeading: 'ÉQUIPEMENT & PLATEFORMES DE JEU',
    noPlatformsYet: 'Aucune plateforme ajoutée pour l’instant.',
    badgesHeading: 'SUCCÈS DÉBLOQUÉS & BADGES',
    demoBadgesNote: 'Médailles de la persona affichées par l’aperçu démo — tes propres succès sont listés plus haut.',
    savedStoriesHeading: 'FAVORIS & ARTICLES SAUVEGARDÉS',
    noSavedYet: 'Aucun article sauvegardé pour l’instant — explore le fil d’actus et mets en favori ce qui te plaît.',
    readStory: 'LIRE L’ARTICLE',
    profileActions: 'ACTIONS DU COMPTE',
    exploreNewsBtn: 'VOIR LE FIL D’ACTUS ↗',
    returnHomeBtn: 'RETOUR À L’ACCUEIL',
    editProfilePrompt: 'Profil synchronisé sur tout le réseau Let’s Play.',
    editProfile: 'MODIFIER LE PROFIL',
    editProfileTitle: 'MODIFIER TON PROFIL',
    avatarUrlLabel: 'URL de l’image d’avatar',
    avatarUrlPlaceholder: 'https://…',
    saveChanges: 'ENREGISTRER',
    saving: 'ENREGISTREMENT…',
    cancelEdit: 'Annuler',
    profileSaved: 'Profil mis à jour.',
    profileSaveError: 'Impossible d’enregistrer ton profil. Réessaie.',
    avatarUploadHint: 'Clique sur ta photo pour téléverser ta propre image',
    avatarUpdated: 'Photo mise à jour.',
    avatarUploadError: 'Impossible de téléverser ta photo. Réessaie.',
    avatarInvalidType: 'Choisis un fichier image (JPG, PNG, WebP…)',
  },
  ar: {
    eyebrow: 'دخول اللاعبين',
    title: 'انضم إلى اللعبة.',
    intro: 'أنشئ حسابك في Let’s Play واستعد لما هو قادم.',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    passwordHint: 'استخدم 6 أحرف على الأقل.',
    passwordMismatch: 'كلمتا المرور غير متطابقتين.',
    gamertagRequired: 'اختر اسم لاعب للانضمام.',
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
    gamertag: 'اسم اللاعب',
    gamertagPlaceholder: 'مثال: VORTEX_DZ',
    gamertagHint: 'هذا هو الاسم الذي سيظهر عبر المجتمع.',
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    google: 'المتابعة مع Google',
    microsoft: 'المتابعة مع Microsoft',
    or: 'أو',
    noAccount: 'ليس لديك حساب بعد؟',
    registerHere: 'سجّل هنا',
    switchSignUp: 'جديد هنا؟ أنشئ حساباً',
    switchSignIn: 'لديك حساب؟ سجّل الدخول',
    connectedPopup: 'تم الاتصال بحسابك',
    connectedPopupSub: 'مرحباً بك في مركز اللاعب — سعداء بوصولك، أيها اللاعب!',
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
    errNetwork: 'تعذّر الوصول إلى خادم Supabase — تحقق من رابط المشروع ومفتاحه، ومن أن المشروع غير متوقف مؤقتاً.',
    errEmailNotConfirmed: 'لم يتم تأكيد بريدك الإلكتروني بعد — افتح رابط التأكيد المُرسل إليك أو أعد إرساله أدناه.',
    errInvalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    errRateLimited: 'محاولات كثيرة — انتظر بضع دقائق ثم أعد المحاولة.',
    errProviderDisabled: 'مزوّد تسجيل الدخول هذا غير مُفعّل بعد في مشروع Supabase — فعّله من Authentication ← Providers أو سجّل الدخول ببريدك الإلكتروني.',
    unavailable: 'المصادقة عبر Supabase غير مهيأة في هذه البيئة. يمكنك استخدام الحساب التجريبي أدناه.',
    diagMissing: 'الإعدادات الناقصة:',
    diagHelp: 'المتغيرات تُقرأ وقت البناء: في Vercel ← Settings ← Environment Variables، وفي GitHub Pages ← Settings ← Secrets and variables ← Actions ← Variables (الاسمان أعلاه)، أو ملف .env.local محلي منسوخ من .env.example. أعد النشر بعد إضافتها.',
    demoOptionTitle: 'الوصول التجريبي / المعاينة',
    demoOptionText: 'هل تريد رؤية كيف يبدو حساب اللاعب عند الاتصال؟ ادخل بملف تجريبي بنقرة واحدة.',
    demoBtnVortex: 'استكشاف الحساب التجريبي (VORTEX_DZ · محترف)',
    demoBtnPixel: 'استكشاف حساب صانعة المحتوى (PIXEL_QUEEN)',
    quickDemoLabel: 'معاينة فورية',

    // Connected profile view
    profileEyebrow: 'الملف الشخصي للاعب المتصل',
    profileTitle: 'مركز ولوحة تحكم اللاعب',
    demoModeTag: 'وضع المعاينة التجريبي نشط',
    demoBannerDesc: 'أنت تتصفح جلسة لاعب متصلة تجريبية. يمكنك معاينة الإحصائيات والأوسمة والمقالات المحفوظة، والتبديل بين الشخصيات التجريبية.',
    switchDemoProfile: 'تبديل الشخصية',
    onlineStatus: 'متصل الآن',
    verifiedPlayer: 'لاعب موثق',
    memberSince: 'عضو منذ',
    levelLabel: 'المستوى',
    tierLabel: 'الفئة',
    xpLabel: 'تقدم اللاعب',
    xpUnit: 'نقطة خبرة',
    xpEarnedLabel: 'نقطة خبرة مكتسبة',
    toNextLvl: 'نقطة للمستوى القادم',
    statsHeading: 'نشاط المجتمع',
    statRead: 'المقالات المقروءة',
    statComments: 'التعليقات',
    statSaved: 'المقالات المحفوظة',
    statBadges: 'الإنجازات المفتوحة',
    platformsHeading: 'منصات وأجهزة اللعب',
    noPlatformsYet: 'لم تتم إضافة أي منصة بعد.',
    badgesHeading: 'الإنجازات والأوسمة المفتوحة',
    demoBadgesNote: 'أوسمة الشخصية في المعاينة التجريبية — إنجازاتك الخاصة معروضة في الأعلى.',
    savedStoriesHeading: 'المقالات المحفوظة للقراءة لاحقًا',
    noSavedYet: 'لا توجد مقالات محفوظة بعد — تصفح آخر الأخبار واحفظ ما يعجبك.',
    readStory: 'اقرأ المقال',
    profileActions: 'إجراءات الحساب',
    exploreNewsBtn: 'تصفح آخر الأخبار ↗',
    returnHomeBtn: 'العودة للرئيسية',
    editProfilePrompt: 'الملف الشخصي متزامن عبر شبكة Let’s Play.',
    editProfile: 'تعديل الملف',
    editProfileTitle: 'تعديل ملفك الشخصي',
    avatarUrlLabel: 'رابط صورة الأفاتار',
    avatarUrlPlaceholder: 'https://…',
    saveChanges: 'حفظ التغييرات',
    saving: 'جارٍ الحفظ…',
    cancelEdit: 'إلغاء',
    profileSaved: 'تم تحديث الملف الشخصي.',
    profileSaveError: 'تعذّر حفظ ملفك الشخصي. حاول مرة أخرى.',
    avatarUploadHint: 'انقر على صورتك لرفع صورة خاصة بك',
    avatarUpdated: 'تم تحديث الصورة.',
    avatarUploadError: 'تعذّر رفع صورتك. حاول مرة أخرى.',
    avatarInvalidType: 'الرجاء اختيار ملف صورة (JPG، PNG، WebP…)',
  },
};

/* ------------------------------------------------------------------ */
/* Avatar upload: resize client-side so the image stays small enough   */
/* to live in the auth user metadata (it is embedded in the JWT).      */
/* ------------------------------------------------------------------ */
const AVATAR_STEPS = [
  { size: 160, quality: 0.8 },
  { size: 128, quality: 0.75 },
  { size: 96, quality: 0.65 },
];
const AVATAR_MAX_BASE64 = 20000;

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('file-read-failed'));
    reader.readAsDataURL(file);
  });
}

// Cover-crop the image to a square and re-encode as JPEG, stepping down in
// size/quality until the base64 payload is small enough for user metadata.
function compressImageToDataUrl(file) {
  return fileToDataUrl(file).then((src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        if (!side) throw new Error('image-decode-failed');
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        let last = '';
        for (const step of AVATAR_STEPS) {
          const canvas = document.createElement('canvas');
          canvas.width = step.size;
          canvas.height = step.size;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, sx, sy, side, side, 0, 0, step.size, step.size);
          last = canvas.toDataURL('image/jpeg', step.quality);
          if (last.length <= AVATAR_MAX_BASE64) {
            resolve(last);
            return;
          }
        }
        resolve(last);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('image-decode-failed'));
    img.src = src;
  }));
}

// Where to send the player once signed in. The comment section links here
// with `state.from` (e.g. "/news/physint#comments"); the target is mirrored in
// sessionStorage so it survives the full-page round trip of an OAuth login.
// Only same-site paths are accepted and entries expire after 15 minutes.
const RETURN_STORAGE_KEY = 'letsplay_auth_return_to';
const RETURN_MAX_AGE_MS = 15 * 60 * 1000;

function isInternalPath(path) {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');
}

function rememberReturnTo(path) {
  if (typeof window === 'undefined' || !isInternalPath(path)) return;
  try {
    window.sessionStorage.setItem(RETURN_STORAGE_KEY, JSON.stringify({ to: path, at: Date.now() }));
  } catch (e) { /* private mode — the in-memory ref still covers this tab */ }
}

function peekReturnTo() {
  if (typeof window === 'undefined') return '';
  try {
    const raw = window.sessionStorage.getItem(RETURN_STORAGE_KEY);
    if (!raw) return '';
    const { to, at } = JSON.parse(raw);
    if (!isInternalPath(to) || typeof at !== 'number' || Date.now() - at > RETURN_MAX_AGE_MS) return '';
    return to;
  } catch (e) {
    return '';
  }
}

function forgetReturnTo() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(RETURN_STORAGE_KEY);
  } catch (e) { /* ignore */ }
}

// Format a Supabase ISO timestamp as "Month YYYY" for the member-since line.
function formatJoined(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  } catch (e) {
    return String(date.getFullYear());
  }
}

export default function Auth({ initialMode = 'signin' }) {
  const {
    user,
    isDemo,
    demoProfileKey,
    configured,
    loginAsDemo,
    updateDemoProfile,
    signOut,
  } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { summary, state: achievementState } = useAchievements();
  const track = useAchievementAction();
  const t = copy[lang] || copy.en;
  const returnToRef = useRef('');

  const [mode, setMode] = useState(initialMode === 'update' ? 'signin' : initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [gamertag, setGamertag] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [connectedPopup, setConnectedPopup] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarNote, setAvatarNote] = useState(null); // { text, isError }
  const fileInputRef = useRef(null);

  // The "You are connected" popup stays on screen briefly, then fades.
  useEffect(() => {
    if (!connectedPopup) return undefined;
    const id = window.setTimeout(() => setConnectedPopup(false), 3000);
    return () => window.clearTimeout(id);
  }, [connectedPopup]);

  // Arriving from a "sign in to comment" link: remember where to go back to
  // and open the requested form (sign-in instead of the default sign-up).
  useEffect(() => {
    const from = location.state?.from;
    if (isInternalPath(from)) {
      rememberReturnTo(from);
      returnToRef.current = from;
    } else {
      returnToRef.current = peekReturnTo();
    }
    const requested = location.state?.mode;
    if (requested === 'signin' || requested === 'signup') {
      setMode(requested);
    }
  }, [location.state]);

  // Real accounts: the "comments" stat counts the player's rows in
  // public.comments (demo profiles ship their own numbers).
  const [commentCount, setCommentCount] = useState(null);
  useEffect(() => {
    if (!user || isDemo || !supabase) {
      setCommentCount(null);
      return undefined;
    }
    let active = true;
    supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count, error: countError }) => {
        if (active && !countError && typeof count === 'number') setCommentCount(count);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [user?.id, isDemo]);

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

  // Once a session exists (email/password, OAuth round trip, demo profile),
  // send the player back to the article they came from.
  useEffect(() => {
    if (!user || isRecovery) return;
    const target = returnToRef.current || peekReturnTo();
    forgetReturnTo();
    if (target) navigate(target, { replace: true });
  }, [user, isRecovery, navigate]);

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setMessage('');
    setShowResend(false);
    setConfirmPassword('');
  };

  // Handle Form Submission (signup / signin / forgot / update)
  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setShowResend(false);

    // Client-side validation before hitting Supabase.
    if ((mode === 'signup' || mode === 'update') && confirmPassword !== password) {
      setError(t.passwordMismatch);
      return;
    }
    if (mode === 'signup' && !gamertag.trim()) {
      setError(t.gamertagRequired);
      return;
    }

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
          setError(describeAuthError(signUpError, t, t.error));
        } else if (data.session) {
          track('account_created');
          // Email confirmation disabled → already signed in.
          setConnectedPopup(true);
          navigate(returnToRef.current || '/auth', { replace: Boolean(returnToRef.current) });
          return;
        } else if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          // Supabase hides duplicate registrations: no identities = email taken.
          setMode('signin');
          setError(t.alreadyRegistered);
        } else {
          // Compte créé, en attente de confirmation par e-mail.
          track('account_created');
          setMessage(t.confirmation);
          setShowResend(true);
        }
      } else if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(describeAuthError(signInError, t, t.error));
        } else {
          track('signed_in');
          setConnectedPopup(true);
          navigate(returnToRef.current || '/auth', { replace: Boolean(returnToRef.current) });
          return;
        }
      } else if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: authRedirectUrl(),
        });
        if (resetError) {
          setError(describeAuthError(resetError, t, t.error));
        } else {
          setMessage(t.resetSent);
        }
      } else if (mode === 'update') {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
          setError(describeAuthError(updateError, t, t.error));
        } else {
          setIsRecovery(false);
          setPassword('');
          setConfirmPassword('');
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
          setConnectedPopup(true);
          setMessage(t.passwordUpdated);
        }
      }
    } catch (e) {
      setError(describeAuthError(e, t, t.error));
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
      setError(describeAuthError(resendError, t, t.error));
    } else {
      setMessage(t.resendSent);
    }
  };

  // Handle Demo Login
  const handleDemoLogin = (profileKey) => {
    setError('');
    setMessage('');
    loginAsDemo(profileKey);
    setConnectedPopup(true);
  };

  // Avatar upload: the user clicks the profile picture, picks an image file,
  // we compress it client-side and store it in the user metadata (real
  // accounts) or the demo profile (simulated sessions).
  const onAvatarFilePicked = async (event) => {
    const input = event.target;
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      setAvatarNote({ text: t.avatarInvalidType, isError: true });
      return;
    }
    setAvatarBusy(true);
    setAvatarNote(null);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      if (isDemo) {
        updateDemoProfile((prev) => {
          const next = { ...prev, user_metadata: { ...prev.user_metadata, avatar: dataUrl } };
          try { syncDemoCommentsForUser(next); } catch {}
          return next;
        });
      } else if (supabase) {
        const { data: updData, error: uploadError } = await supabase.auth.updateUser({ data: { avatar: dataUrl } });
        if (uploadError) throw uploadError;
        const uid = updData?.user?.id;
        try {
          if (uid) await syncSupabaseProfileAndComments(uid, { avatar: dataUrl });
        } catch {}
        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('letsplay:profile-synced', { detail: { avatar: dataUrl } })); } catch {}
      } else {
        throw new Error(t.unavailable);
      }
      setAvatarNote({ text: t.avatarUpdated, isError: false });
      window.setTimeout(() => setAvatarNote(null), 3500);
    } catch (e) {
      setAvatarNote({ text: describeAuthError(e, t, t.avatarUploadError), isError: true });
    } finally {
      setAvatarBusy(false);
    }
  };

  // Reusable password field with a show/hide toggle.
  const renderPasswordField = (labelText, value, onChange, autoComplete, autoCompleteExtra) => (
    <label>
      {labelText}
      <span className="auth-input-wrap">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required
          minLength={6}
          autoComplete={autoComplete}
          className={autoCompleteExtra}
        />
        <button
          type="button"
          className="auth-eye-toggle"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? t.hidePassword : t.showPassword}
          title={showPassword ? t.hidePassword : t.showPassword}
        >
          <EyeIcon off={showPassword} />
        </button>
      </span>
    </label>
  );

  // "You are connected" popup — rendered above whichever view is active so it
  // lands on top of the player hub right after a successful sign-in.
  const connectedOverlay = connectedPopup ? (
    <div
      className="auth-connected-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-label={t.connectedPopup}
      onClick={() => setConnectedPopup(false)}
    >
      <div className="auth-connected-card">
        <span className="auth-connected-check"><CheckIcon /></span>
        <h2>{t.connectedPopup}</h2>
        <p>{t.connectedPopupSub}</p>
      </div>
    </div>
  ) : null;

  // --------------------------------------------------------------------------
  // CONNECTED ACCOUNT / PLAYER DASHBOARD VIEW
  // (skipped while a password recovery is in progress — the new-password
  // form below takes precedence even though a session already exists)
  // --------------------------------------------------------------------------
  if (user && !isRecovery) {
    const meta = user.user_metadata || {};
    const gamertag = meta.gamertag || user.email?.split('@')[0] || 'Player_DZ';
    const fullName = meta.fullName || meta.full_name || user.email || 'Let’s Play Player';
    const role = meta.role || 'COMMUNITY PLAYER';
    const tier = meta.tier || 'TIER I · MEMBER';
    // Niveau, rang et XP du hub : pour un compte réel ils viennent du moteur de
    // succès (`summary`), la seule source d'XP du site — les métadonnées
    // Supabase ne portent ni XP ni niveau, donc les lire laissait la barre
    // principale à 0 % alors que celle de la section « succès » avançait. Les
    // personas de démonstration gardent leurs chiffres scriptés : l'aperçu doit
    // rester prévisualisable « rempli », sans backend.
    const progression = summary.level; // { level, xpInLevel, xpForNextLevel, percent }
    const level = isDemo ? (meta.level || 1) : progression.level;
    const rankTitle = isDemo ? (meta.rankTitle || 'Novice Gamer') : levelTitle(level, lang);
    const xp = isDemo ? (meta.xp || 0) : progression.xpInLevel;
    const nextLevelXp = isDemo ? (meta.nextLevelXp || 100) : progression.xpForNextLevel;
    const xpPercentage = nextLevelXp > 0 ? Math.min(100, Math.round((xp / nextLevelXp) * 100)) : 0;
    // XP gagné depuis le début (somme des succès débloqués) : c'est le chiffre
    // que montre aussi la section « succès ».
    const xpEarned = summary.xp;
    const joinedDate = meta.joinedDate || formatJoined(user.created_at) || '—';
    const location = meta.location || (isDemo ? 'Algeria' : '');
    const bio = meta.bio || (isDemo ? 'Exploring new gaming horizons with the Let’s Play community.' : '');
    const avatar = meta.avatar;

    // Real accounts start from nothing — no badges, no stats — and grow from
    // real activity; their XP and level are read from the achievements engine
    // above. Demo profiles ship fully populated so the hub can be previewed
    // without a backend.
    const stats = meta.stats || {
      articlesRead: 0,
      commentsPosted: 0,
      savedArticles: 0,
      badgesUnlocked: 0,
    };

    // "Verified" is a curated tag: simulated demo personas carry it, real
    // accounts only if explicitly flagged in their metadata.
    const isVerified = isDemo || meta.verified === true;

    const platforms = meta.platforms || [];
    // Les badges de la persona n'existent que dans l'aperçu de démonstration :
    // les succès réels d'un compte connecté sont ceux suivis par le site
    // (section « succès » ci-dessous, alimentée par src/achievements).
    const personaBadges = isDemo ? (meta.badges || []) : [];

    const savedArticles = meta.savedArticlesList || [];

    return (
      <section className="auth-page wrap">
        <div className="player-hub">
          {connectedOverlay}
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
              {/* Click the profile picture to upload your own image */}
              <div className="player-avatar-col">
                <div
                  className="player-avatar-wrap"
                  role="button"
                  tabIndex={0}
                  aria-label={t.avatarUploadHint}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (fileInputRef.current) fileInputRef.current.click();
                    }
                  }}
                >
                  {avatar ? (
                    <img src={avatar} alt={gamertag} className="player-avatar-img" />
                  ) : (
                    <div className="player-avatar-fallback">{gamertag.slice(0, 2).toUpperCase()}</div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="player-avatar-file"
                    onChange={onAvatarFilePicked}
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  <span className="player-avatar-camera" aria-hidden="true"><CameraIcon /></span>
                  {avatarBusy && (
                    <span className="player-avatar-busy" aria-hidden="true">
                      <span className="auth-btn-spinner" />
                    </span>
                  )}
                  <span className="player-status-badge">
                    <span className="player-status-dot" aria-hidden="true" />
                    {t.onlineStatus}
                  </span>
                </div>
                {avatarNote && (
                  <p className={`player-avatar-note${avatarNote.isError ? ' player-avatar-note-error' : ''}`}>
                    {avatarNote.text}
                  </p>
                )}
              </div>

              <div className="player-identity">
                <div className="player-tags-row">
                  <span className="player-badge-tier">{tier}</span>
                  {isVerified && <span className="player-badge-verified">⚡ {t.verifiedPlayer}</span>}
                  {meta.rankTag && <span className="player-badge-tier">{meta.rankTag}</span>}
                </div>

                <h1 className="player-gamertag">{gamertag}</h1>

                <div className="player-meta-line">
                  <span><strong>{fullName}</strong></span>
                  <span>•</span>
                  <span>{user.email}</span>
                  {location && (<><span>•</span><span>{location}</span></>)}
                  <span>•</span>
                  <span>{t.memberSince}: {joinedDate}</span>
                </div>

                {bio && <p className="player-bio">{bio}</p>}
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
                  {/* Les chiffres scriptés d'une persona n'ont pas d'XP « réel »
                      à additionner : on ne l'affiche que pour un vrai compte. */}
                  {!isDemo && (
                    <>
                      {' · '}
                      {xpEarned.toLocaleString()} {t.xpEarnedLabel}
                    </>
                  )}
                </span>
              </div>
              <div className="player-xp-bar-bg">
                <div
                  className="player-xp-bar-fill"
                  style={{ width: `${xpPercentage}%` }}
                  role="progressbar"
                  aria-valuenow={xpPercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${t.levelLabel} ${level} — ${rankTitle}`}
                />
              </div>
            </div>

            {/* EDIT PROFILE — persists to Supabase (real) or demo storage */}
            <ProfileEditor
              t={t}
              isDemo={isDemo}
              gamertag={gamertag}
              avatar={avatar}
              updateDemoProfile={updateDemoProfile}
            />
          </div>

          {/* COMMUNITY STATS GRID */}
          <div className="player-stats-grid">
            <div className="player-stat-card">
              <div className="player-stat-value">
                {isDemo ? stats.articlesRead : metricValue(achievementState, 'articlesRead')}
              </div>
              <div className="player-stat-label">{t.statRead}</div>
            </div>
            <div className="player-stat-card">
              <div className="player-stat-value">
                {isDemo ? stats.commentsPosted : (commentCount ?? metricValue(achievementState, 'commentsPosted'))}
              </div>
              <div className="player-stat-label">{t.statComments}</div>
            </div>
            <div className="player-stat-card">
              <div className="player-stat-value">{stats.savedArticles}</div>
              <div className="player-stat-label">{t.statSaved}</div>
            </div>
            <div className="player-stat-card">
              <div className="player-stat-value">{summary.unlockedCount}</div>
              <div className="player-stat-label">{t.statBadges}</div>
            </div>
          </div>

          {/* SUCCÈS DU SITE — progression réelle du joueur (lecture, vidéos,
              commentaires, recherche, fidélité, compte) */}
          <div className="player-section">
            <AchievementsPanel variant="compact" />
          </div>

          {/* GAMING PLATFORMS */}
          <div className="player-section">
            <div className="player-section-header">
              <h2>{t.platformsHeading}</h2>
            </div>
            {platforms.length > 0 ? (
              <div className="player-platforms-row">
                {platforms.map((platform) => (
                  <span key={platform} className="player-platform-pill">
                    🎮 {platform}
                  </span>
                ))}
              </div>
            ) : (
              <p className="player-empty-note">{t.noPlatformsYet}</p>
            )}
          </div>

          {/* MÉDAILLES DE LA PERSONA DE DÉMONSTRATION (aperçu uniquement) —
              les succès du joueur ont leur propre section plus haut */}
          {personaBadges.length > 0 && (
            <div className="player-section">
              <div className="player-section-header">
                <h2>{t.badgesHeading}</h2>
                <p>{t.demoBadgesNote}</p>
              </div>
              <div className="player-badges-grid">
                {personaBadges.map((badge) => (
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
          )}

          {/* SAVED STORIES & BOOKMARKS */}
          <div className="player-section">
            <div className="player-section-header">
              <h2>{t.savedStoriesHeading}</h2>
            </div>
            {savedArticles.length > 0 ? (
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
            ) : (
              <p className="player-empty-note">{t.noSavedYet}</p>
            )}
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
            <div className="player-actions-right">
              <DeleteAccount />
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
        </div>
      </section>
    );
  }

  // --------------------------------------------------------------------------
  // UNAUTHENTICATED / LOGIN & SIGNUP VIEW
  // --------------------------------------------------------------------------
  const showDemoBox = mode === 'signup' || mode === 'signin';
  const showConfirm = mode === 'signup' || mode === 'update';
  const missingConfig = [
    supabaseConfigStatus.hasUrl ? null : 'VITE_SUPABASE_URL',
    supabaseConfigStatus.hasKey ? null : 'VITE_SUPABASE_PUBLISHABLE_KEY',
  ].filter(Boolean);

  return (
    <section className="auth-page wrap">
      {connectedOverlay}
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
                required
                autoComplete="nickname"
              />
              <span className="auth-field-hint">{t.gamertagHint}</span>
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
          {mode !== 'forgot' && renderPasswordField(
            mode === 'update' ? t.newPassword : t.password,
            password,
            (e) => setPassword(e.target.value),
            mode === 'signin' ? 'current-password' : 'new-password',
          )}
          {showConfirm && renderPasswordField(
            t.confirmPassword,
            confirmPassword,
            (e) => setConfirmPassword(e.target.value),
            'new-password',
          )}
          {showConfirm && <p className="auth-field-hint auth-pw-hint">{t.passwordHint}</p>}
          <button className="button button-yellow" disabled={busy}>
            {busy && <span className="auth-btn-spinner" aria-hidden="true" />}
            {mode === 'signup' ? t.signUp : mode === 'signin' ? t.signIn : mode === 'forgot' ? t.sendReset : t.updatePassword}
            {!busy && <span>↗</span>}
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

        {/* DEMO / PREVIEW ACCESS CARD */}
        {showDemoBox && <div className="auth-demo-box">
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
            {mode === 'signup' ? t.switchSignIn : (
              <>{t.noAccount} <span className="auth-switch-link">{t.registerHere}</span></>
            )}
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

/* ------------------------------------------------------------------ */
/* Inline profile editor (gamertag + avatar URL)                       */
/* ------------------------------------------------------------------ */
function ProfileEditor({ t, isDemo, gamertag, avatar, updateDemoProfile }) {
  const track = useAchievementAction();
  const [editing, setEditing] = useState(false);
  const [tag, setTag] = useState(gamertag);
  const [avatarUrl, setAvatarUrl] = useState(avatar || '');
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const open = () => {
    setTag(gamertag);
    setAvatarUrl(avatar || '');
    setNote('');
    setErr('');
    setEditing(true);
  };

  const save = async (event) => {
    event.preventDefault();
    const nextTag = tag.trim();
    if (!nextTag) {
      setErr(t.gamertagRequired);
      return;
    }
    setSaving(true);
    setErr('');
    setNote('');
    try {
      if (isDemo) {
        updateDemoProfile((prev) => {
          const next = {
            ...prev,
            user_metadata: {
              ...prev.user_metadata,
              gamertag: nextTag,
              fullName: nextTag,
              avatar: avatarUrl.trim() || undefined,
            },
          };
          // sync handled in AuthContext, but ensure demo comments reflect the new gamertag immediately
          try { syncDemoCommentsForUser(next); } catch {}
          return next;
        });
      } else if (supabase) {
        const trimmedAvatar = avatarUrl.trim() || null;
        const { data: updData, error: updateError } = await supabase.auth.updateUser({
          data: { gamertag: nextTag, full_name: nextTag, fullName: nextTag, name: nextTag, avatar: trimmedAvatar },
        });
        if (updateError) throw updateError;
        // Keep public profile and all past comments in sync so other viewers see the new name/photo
        const uid = updData?.user?.id;
        try {
          // profiles + comments sync (best-effort, non bloquant)
          if (uid) await syncSupabaseProfileAndComments(uid, { name: nextTag, avatar: trimmedAvatar });
          else await syncSupabaseProfileAndComments((typeof window !== 'undefined' && window.__letsPlayUserId) || null, { name: nextTag, avatar: trimmedAvatar });
        } catch {}
        // Optimistic local update for immediate feedback even before the auth event propagates
        try {
          if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('letsplay:profile-synced', { detail: { name: nextTag, avatar: trimmedAvatar } }));
        } catch {}
      }
      track('profile_updated');
      setNote(t.profileSaved);
      setEditing(false);
    } catch (e) {
      setErr(e?.message || t.profileSaveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="player-edit-block">
      {!editing ? (
        <div className="player-edit-row">
          <span className="player-edit-prompt">{t.editProfilePrompt}</span>
          <button type="button" className="player-edit-btn" onClick={open}>
            <PencilIcon /> {t.editProfile}
          </button>
        </div>
      ) : (
        <form className="player-edit-form" onSubmit={save}>
          <div className="player-edit-form-head">
            <h3>{t.editProfileTitle}</h3>
          </div>
          <label className="player-edit-field">
            {t.gamertag}
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              maxLength={24}
              required
            />
          </label>
          <label className="player-edit-field">
            {t.avatarUrlLabel}
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder={t.avatarUrlPlaceholder}
            />
          </label>
          <div className="player-edit-actions">
            <button type="submit" className="button button-yellow" disabled={saving}>
              {saving ? t.saving : t.saveChanges}
            </button>
            <button
              type="button"
              className="player-edit-cancel"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              {t.cancelEdit}
            </button>
          </div>
          {note && <p className="player-edit-note">{note}</p>}
          {err && <p className="player-edit-note player-edit-error">{err}</p>}
        </form>
      )}
    </div>
  );
}
