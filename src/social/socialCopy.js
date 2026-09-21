/**
 * Textes de la fenêtre sociale unifiée — amis + messagerie dans la même
 * fenêtre (EN / FR / AR). L'anglais sert de repli, comme partout sur le site.
 * Les libellés des onglets amis viennent de `friendsCopy`, et ceux de la
 * messagerie (aperçus, bulles…) de `messagesCopy`.
 */
export const socialCopy = {
  en: {
    title: 'SOCIAL',
    launcher: 'SOCIAL',
    launcherOpen: 'Open friends & messages',
    launcherClose: 'Close friends & messages',
    subtitle: '{online} online · {unread} unread',
    tabMessages: 'Messages',
    demoNote: 'Demo preview — simulated community and conversations, saved on this device only.',
  },
  fr: {
    title: 'SOCIAL',
    launcher: 'SOCIAL',
    launcherOpen: 'Ouvrir amis et messages',
    launcherClose: 'Fermer amis et messages',
    subtitle: '{online} en ligne · {unread} non lus',
    tabMessages: 'Messages',
    demoNote: 'Aperçu démo — communauté et conversations simulées, enregistrées sur cet appareil seulement.',
  },
  ar: {
    title: 'اجتماعي',
    launcher: 'اجتماعي',
    launcherOpen: 'فتح الأصدقاء والرسائل',
    launcherClose: 'إغلاق الأصدقاء والرسائل',
    subtitle: '{online} متصل · {unread} غير مقروءة',
    tabMessages: 'الرسائل',
    demoNote: 'معاينة تجريبية — مجتمع ومحادثات محاكاة، محفوظة على هذا الجهاز فقط.',
  },
};

export function socialText(lang) {
  return socialCopy[lang] || socialCopy.en;
}
