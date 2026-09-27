/**
 * Textes de la fenêtre sociale unifiée — amis + messagerie dans la même
 * fenêtre (EN / FR / AR). L'anglais sert de repli, comme partout sur le site.
 * Les libellés des onglets amis viennent de `friendsCopy`, et ceux de la
 * messagerie (aperçus, bulles…) de `messagesCopy`.
 */
export const socialCopy = {
  en: {
    title: "Let's Talk",
    launcher: "Let's Talk",
    launcherOpen: 'Open friends & messages',
    launcherClose: 'Close friends & messages',
    subtitle: '{online} online · {unread} unread',
    tabMessages: "Let's Talk",
    demoNote: 'Demo preview — simulated community and conversations, saved on this device only.',
  },
  fr: {
    title: "Let's Talk",
    launcher: "Let's Talk",
    launcherOpen: 'Ouvrir amis et messages',
    launcherClose: 'Fermer amis et messages',
    subtitle: '{online} en ligne · {unread} non lus',
    tabMessages: "Let's Talk",
    demoNote: 'Aperçu démo — communauté et conversations simulées, enregistrées sur cet appareil seulement.',
  },
  ar: {
    title: "Let's Talk",
    launcher: "Let's Talk",
    launcherOpen: 'فتح الأصدقاء والرسائل',
    launcherClose: 'إغلاق الأصدقاء والرسائل',
    subtitle: '{online} متصل · {unread} غير مقروءة',
    tabMessages: "Let's Talk",
    demoNote: 'معاينة تجريبية — مجتمع ومحادثات محاكاة، محفوظة على هذا الجهاز فقط.',
  },
};

export function socialText(lang) {
  return socialCopy[lang] || socialCopy.en;
}
