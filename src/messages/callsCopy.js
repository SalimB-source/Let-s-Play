/**
 * Textes des appels vocaux / vidéo (EN / FR / AR). L'anglais sert de repli,
 * comme partout sur le site. Les libellés d'appel vivent à côté de ceux de la
 * messagerie (`messagesCopy`) : les deux modules partagent la fenêtre sociale
 * et la page `/messages`.
 */
import { fill } from '../friends/friendsCopy';
import {
  classifyMediaError, END_BUSY, END_CANCELLED, END_DECLINED, END_FAILED, END_HUNG_UP, END_LOST, END_NO_ANSWER,
} from './callsCore';

export const callsCopy = {
  en: {
    callAudio: 'Voice call',
    callVideo: 'Video call',
    reasonOffline: '{name} is offline — calls only work between online friends.',
    reasonDemo: 'Calls are not available in the demo preview.',
    reasonSupabase: 'Calls need the Supabase project to be configured.',
    reasonInsecure: 'Calls need a secure connection (HTTPS).',
    reasonNoWebRTC: 'This browser does not support calls (microphone/camera API missing).',
    reasonBusy: 'You are already in a call.',
    reasonBlocked: 'Calls are blocked for this player.',
    reasonFriends: 'Become friends to call this player.',
    reasonAuth: 'Sign in to call your friends.',
    incomingAudio: 'Incoming voice call',
    incomingVideo: 'Incoming video call',
    accept: 'Answer',
    decline: 'Decline',
    outgoingAudio: 'Voice call…',
    outgoingVideo: 'Video call…',
    ringing: 'Ringing…',
    connecting: 'Connecting…',
    inCall: 'In call',
    micOn: 'Mute microphone',
    micOff: 'Unmute microphone',
    camOn: 'Turn camera off',
    camOff: 'Turn camera on',
    flipCamera: 'Switch camera',
    hangUp: 'Hang up',
    localYou: 'You',
    endDeclined: 'Call declined',
    endBusy: 'Busy',
    endNoAnswer: 'No answer',
    endCancelled: 'Call cancelled',
    endHungUp: 'Call ended',
    endLost: 'Connection lost',
    endFailed: 'The call could not start',
    errPermission: 'Microphone/camera access denied — allow it in your browser settings.',
    errPermissionIframe: 'Microphone blocked — the page is inside an iframe without microphone permission. Add allow=\"microphone\" to the iframe or open the site directly.',
    errPermissionBlocked: 'Microphone blocked for this site — allow it in your browser site settings (padlock → Site settings → Microphone → Allow), then reload.',
    errPermissionDenied: 'Microphone access denied — allow it when the browser asks, then try again.',
    errPermissionPolicy: 'Microphone allowed, but this page is not allowed to use it (site rules or third-party app). Your settings are already correct — open the site directly in your browser and try again.',
    errNodevice: 'No microphone or camera found.',
    errBusyDevice: 'Your microphone or camera is used by another app.',
    errGeneric: 'The call could not start.',
    hintTurn: 'The connection could not be established. On mobile networks or closed Wi-Fi, a TURN relay is required (VITE_TURN_URL).',
    kindAudio: 'Audio call',
    kindVideo: 'Video call',
    summaryConnected: '📞 {call} · {duration}',
    summaryDeclined: '📞 {call} declined',
    summaryMissed: '📞 {call} — no answer',
    summaryBusy: '📞 {call} — busy',
  },
  fr: {
    callAudio: 'Appel vocal',
    callVideo: 'Appel vidéo',
    reasonOffline: '{name} est hors ligne — les appels se font entre amis en ligne.',
    reasonDemo: 'Les appels ne sont pas disponibles dans l’aperçu démo.',
    reasonSupabase: 'Les appels exigent que le projet Supabase soit configuré.',
    reasonInsecure: 'Les appels exigent une connexion sécurisée (HTTPS).',
    reasonNoWebRTC: 'Ce navigateur ne prend pas en charge les appels (API micro/caméra absente).',
    reasonBusy: 'Tu es déjà en appel.',
    reasonBlocked: 'Les appels sont bloqués pour ce joueur.',
    reasonFriends: 'Deviens ami avec ce joueur pour l’appeler.',
    reasonAuth: 'Connecte-toi pour appeler tes amis.',
    incomingAudio: 'Appel vocal entrant',
    incomingVideo: 'Appel vidéo entrant',
    accept: 'Répondre',
    decline: 'Refuser',
    outgoingAudio: 'Appel vocal…',
    outgoingVideo: 'Appel vidéo…',
    ringing: 'Ça sonne…',
    connecting: 'Connexion…',
    inCall: 'En appel',
    micOn: 'Couper le micro',
    micOff: 'Réactiver le micro',
    camOn: 'Couper la caméra',
    camOff: 'Réactiver la caméra',
    flipCamera: 'Changer de caméra',
    hangUp: 'Raccrocher',
    localYou: 'Vous',
    endDeclined: 'Appel refusé',
    endBusy: 'Occupé',
    endNoAnswer: 'Sans réponse',
    endCancelled: 'Appel annulé',
    endHungUp: 'Appel terminé',
    endLost: 'Connexion perdue',
    endFailed: 'L’appel n’a pas pu démarrer',
    errPermission: 'Accès au micro/à la caméra refusé — autorise-le dans ton navigateur.',
    errPermissionIframe: 'Micro bloqué — la page est dans une iframe sans permission micro. Ajoute allow=\"microphone\" à l’iframe ou ouvre le site directement.',
    errPermissionBlocked: 'Micro bloqué pour ce site — autorise-le dans les paramètres du site (cadenas → Paramètres du site → Micro → Autoriser), puis recharge.',
    errPermissionDenied: 'Accès au micro refusé — autorise-le quand le navigateur le demande, puis réessaie.',
    errPermissionPolicy: 'Le micro est bien autorisé, mais cette page n’a pas le droit de l’utiliser (règles du site ou application tierce). Tes réglages sont déjà corrects : ouvre le site directement dans ton navigateur et réessaie.',
    errNodevice: 'Aucun micro ni caméra trouvé.',
    errBusyDevice: 'Ton micro ou ta caméra est utilisé par une autre application.',
    errGeneric: 'L’appel n’a pas pu démarrer.',
    hintTurn: 'La connexion n’a pas pu s’établir. Sur un réseau mobile ou un Wi-Fi fermé, un relais TURN est nécessaire (VITE_TURN_URL).',
    kindAudio: 'Appel audio',
    kindVideo: 'Appel vidéo',
    summaryConnected: '📞 {call} · {duration}',
    summaryDeclined: '📞 {call} refusé',
    summaryMissed: '📞 {call} sans réponse',
    summaryBusy: '📞 {call} — occupé',
  },
  ar: {
    callAudio: 'مكالمة صوتية',
    callVideo: 'مكالمة فيديو',
    reasonOffline: '{name} غير متصل — المكالمات تكون بين الأصدقاء المتصلين فقط.',
    reasonDemo: 'المكالمات غير متاحة في المعاينة التجريبية.',
    reasonSupabase: 'تتطلب المكالمات إعداد مشروع Supabase.',
    reasonInsecure: 'تتطلب المكالمات اتصالًا آمنًا (HTTPS).',
    reasonNoWebRTC: 'هذا المتصفح لا يدعم المكالمات (واجهة الميكروفون/الكاميرا غير موجودة).',
    reasonBusy: 'أنت في مكالمة بالفعل.',
    reasonBlocked: 'المكالمات محظورة مع هذا اللاعب.',
    reasonFriends: 'أصبحا صديقين لتتمكن من الاتصال بهذا اللاعب.',
    reasonAuth: 'سجّل الدخول للاتصال بأصدقائك.',
    incomingAudio: 'مكالمة صوتية واردة',
    incomingVideo: 'مكالمة فيديو واردة',
    accept: 'رد',
    decline: 'رفض',
    outgoingAudio: 'مكالمة صوتية…',
    outgoingVideo: 'مكالمة فيديو…',
    ringing: 'جارٍ الرنين…',
    connecting: 'جارٍ الاتصال…',
    inCall: 'في مكالمة',
    micOn: 'كتم الميكروفون',
    micOff: 'إلغاء كتم الميكروفون',
    camOn: 'إيقاف الكاميرا',
    camOff: 'تشغيل الكاميرا',
    flipCamera: 'تبديل الكاميرا',
    hangUp: 'إنهاء المكالمة',
    localYou: 'أنت',
    endDeclined: 'رُفضت المكالمة',
    endBusy: 'مشغول',
    endNoAnswer: 'بلا رد',
    endCancelled: 'أُلغيت المكالمة',
    endHungUp: 'انتهت المكالمة',
    endLost: 'انقطع الاتصال',
    endFailed: 'تعذّر بدء المكالمة',
    errPermission: 'رُفض الوصول إلى الميكروفون/الكاميرا — اسمح به من إعدادات المتصفح.',
    errPermissionIframe: 'الميكروفون محظور — الصفحة داخل iframe بدون إذن الميكروفون. أضف allow=\"microphone\" إلى الـ iframe أو افتح الموقع مباشرة.',
    errPermissionBlocked: 'الميكروفون محظور لهذا الموقع — اسمح به من إعدادات الموقع (القفل → إعدادات الموقع → الميكروفون → سماح)، ثم أعد التحميل.',
    errPermissionDenied: 'رُفض الوصول إلى الميكروفون — اسمح به عندما يطلبه المتصفح، ثم حاول مرة أخرى.',
    errPermissionPolicy: 'الميكروفون مسموح به، لكن هذه الصفحة لا يُسمح لها باستخدامه (قواعد الموقع أو تطبيق خارجي). إعداداتك صحيحة بالفعل: افتح الموقع مباشرة في المتصفح وحاول مجدّدًا.',
    errNodevice: 'لا يوجد ميكروفون أو كاميرا.',
    errBusyDevice: 'الميكروفون أو الكاميرا يستخدمه تطبيق آخر.',
    errGeneric: 'تعذّر بدء المكالمة.',
    hintTurn: 'تعذّر إقامة الاتصال. على شبكات الهاتف أو الواي فاي المغلق، يلزم وسيط TURN (VITE_TURN_URL).',
    kindAudio: 'مكالمة صوتية',
    kindVideo: 'مكالمة فيديو',
    summaryConnected: '📞 {call} · {duration}',
    summaryDeclined: '📞 {call} مرفوضة',
    summaryMissed: '📞 {call} بلا رد',
    summaryBusy: '📞 {call} — مشغول',
  },
};

export function callsText(lang) {
  return callsCopy[lang] || callsCopy.en;
}

/** Libellé du bouton d'appel selon la raison d'indisponibilité (infobulle). */
export function callBlockLabel(reason, t, name = '') {
  switch (reason) {
    case null: return null; // appelable : le titre est le libellé de l'action
    case 'offline': return fill(t.reasonOffline, { name });
    case 'demo': return t.reasonDemo;
    case 'supabase': return t.reasonSupabase;
    case 'insecure': return t.reasonInsecure;
    case 'nowebrtc': return t.reasonNoWebRTC;
    case 'busy': return t.reasonBusy;
    case 'blocked': return t.reasonBlocked;
    case 'friends': return t.reasonFriends;
    case 'auth': return t.reasonAuth;
    default: return t.reasonSupabase;
  }
}

/**
 * Ligne d'état du panneau d'appel (aria-live) : ce qui se passe, en toutes
 * lettres, à chaque phase.
 */
export function callStatusLabel(t, { phase, kind, endReason }) {
  const isVideo = kind === 'video';
  switch (phase) {
    case 'incoming': return isVideo ? t.incomingVideo : t.incomingAudio;
    case 'outgoing': return isVideo ? t.outgoingVideo : t.outgoingAudio;
    case 'connecting': return t.connecting;
    case 'active': return t.inCall;
    case 'ended':
      switch (endReason) {
        case END_DECLINED: return t.endDeclined;
        case END_BUSY: return t.endBusy;
        case END_NO_ANSWER: return t.endNoAnswer;
        case END_CANCELLED: return t.endCancelled;
        case END_HUNG_UP: return t.endHungUp;
        case END_LOST: return t.endLost;
        case END_FAILED: return t.endFailed;
        default: return t.endHungUp;
      }
    default: return '';
  }
}

/** Message lisible pour une erreur de micro / caméra (`getUserMedia`). */
export function describeCallError(error, t, failureKind = null) {
  switch (classifyMediaError(error)) {
    case 'permission': {
      if (failureKind === 'iframe') return t.errPermissionIframe || t.errPermission;
      if (failureKind === 'blocked') return t.errPermissionBlocked || t.errPermission;
      if (failureKind === 'policy') return t.errPermissionPolicy || t.errPermission;
      if (failureKind === 'denied') return t.errPermissionDenied || t.errPermission;
      return t.errPermission;
    }
    case 'nodevice': return t.errNodevice;
    case 'busy': return t.errBusyDevice;
    default: return t.errGeneric;
  }
}

/**
 * Message « trace d'appel » inséré dans la discussion par l'appelant à la fin
 * d'un appel (comme un message normal : non-lus, temps réel et suppression
 * fonctionnent d'eux-mêmes). `{call}` porte la sorte d'appel, `{duration}` la
 * durée formatée pour les appels aboutis.
 */
export function callSummaryText(t, kind, outcome, duration = '') {
  const call = kind === 'video' ? t.kindVideo : t.kindAudio;
  switch (outcome) {
    case 'connected': return fill(t.summaryConnected, { call, duration });
    case 'declined': return fill(t.summaryDeclined, { call });
    case 'busy': return fill(t.summaryBusy, { call });
    case 'missed':
    default: return fill(t.summaryMissed, { call });
  }
}
