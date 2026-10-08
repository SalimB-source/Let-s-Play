// Règles de modération des commentaires côté interface.
//
// Le filtrage réel (mots interdits, signalements, masquage automatique) se
// fait dans supabase/schema.sql, section 3f. Ce module ne fait que traduire les
// erreurs renvoyées par la base vers une clé de texte de `t.news.comments`.
// Il ne dépend d'aucun import Supabase, pour être testé directement sous Node.

// Doit rester identique à la contrainte `comment_reports_reason_check` du schéma
// (vérifié par tests/comment-moderation.test.js).
export const COMMENT_REPORT_REASONS = ['harassment', 'hate', 'sexual', 'violence', 'spam', 'other'];

// Clé du texte à afficher pour une erreur de modération, ou null si l'erreur
// n'en est pas une. Les messages sont ceux levés par les triggers du schéma.
export function commentModerationCopyKey(error) {
  const message = String(error?.message || '');
  const code = String(error?.code || '');

  if (/comment_blocked_terms/i.test(message)) return 'errBlocked';
  if (/comment_report_requires_auth/i.test(message)) return 'errSignedOut';
  if (/comment_report_own_comment/i.test(message)) return 'reportOwn';
  if (/comment_report_not_found/i.test(message)) return 'reportMissing';
  if (/comment_report_rate_limited/i.test(message)) return 'reportRateLimited';
  if (code === '23505' || /comment_reports_comment_id_reporter_id_key/i.test(message)) return 'reportDuplicate';
  if (/comment_reports_reason_check/i.test(message)) return 'reportFailed';
  return null;
}
