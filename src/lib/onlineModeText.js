// Le site publié est en français ; EN/AR servent aussi aux rendus SSR.
const texts = {
  fr: {
    soon: 'Bientôt disponible', onlineDuel: 'Duel en ligne', online: 'En ligne', playDuel: 'Jouer en duel en ligne',
    unavailable: 'Mode en ligne temporairement désactivé.', afterTests: 'Réactivation après tests de charge',
    sablierTitle: 'LE SABLIER · EN LIGNE', sablierIntro: 'Le mode en ligne du Sablier est temporairement désactivé pour préparer le lancement public. Les duels solo, la Conquête et le mode Histoire restent accessibles.',
    sablierDetails: 'Les défis, les salons et les invitations seront réactivés après les tests de charge. Vous pouvez continuer à jouer en solo.', backSablier: 'Retour au Sablier',
    mirageTitle: 'MISE À JOUR EN COURS', mirageIntro: 'Les salons multijoueurs de Mirage Rush sont temporairement désactivés. Les modes solo Ruée, Duel et Coupe restent accessibles et conservent votre progression.', backSolo: '← Retour aux modes solo',
  },
  en: {
    soon: 'Coming soon', onlineDuel: 'Online duel', online: 'Online', playDuel: 'Play an online duel',
    unavailable: 'Online mode is temporarily unavailable.', afterTests: 'Returning after load testing',
    sablierTitle: 'THE HOURGLASS · ONLINE', sablierIntro: 'The Hourglass online mode is temporarily unavailable while we prepare for public launch. Solo duels, Conquest and Story remain available.',
    sablierDetails: 'Challenges, rooms and invitations will return after load testing. You can continue playing solo.', backSablier: 'Back to The Hourglass',
    mirageTitle: 'UPDATE IN PROGRESS', mirageIntro: 'Mirage Rush multiplayer rooms are temporarily unavailable. The solo Rush, Duel and Cup modes remain available and retain your progress.', backSolo: '← Back to solo modes',
  },
  ar: {
    soon: 'قريباً', onlineDuel: 'مبارزة عبر الإنترنت', online: 'عبر الإنترنت', playDuel: 'العب مبارزة عبر الإنترنت',
    unavailable: 'اللعب عبر الإنترنت متوقف مؤقتاً.', afterTests: 'ستعود بعد اختبارات الضغط',
    sablierTitle: 'الساعة الرملية · عبر الإنترنت', sablierIntro: 'اللعب عبر الإنترنت متوقف مؤقتاً استعداداً للإطلاق العام. تظل المبارزات الفردية والفتح والقصة متاحة.',
    sablierDetails: 'ستعود التحديات والغرف والدعوات بعد اختبارات الضغط. يمكنك مواصلة اللعب الفردي.', backSablier: 'العودة إلى الساعة الرملية',
    mirageTitle: 'التحديث جارٍ', mirageIntro: 'غرف اللعب الجماعي في ميراج راش متوقفة مؤقتاً. تظل أطوار اللعب الفردي متاحة مع الحفاظ على تقدمك.', backSolo: '→ العودة إلى الأطوار الفردية',
  },
};
export function onlineModeText(lang) { return texts[lang] || texts.fr; }
