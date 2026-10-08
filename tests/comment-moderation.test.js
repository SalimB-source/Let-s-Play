// Règles de modération des commentaires : cohérence entre la base (schema.sql,
// section 3f), la couche d'erreurs de l'interface et les textes FR / EN / AR.
// Lancer avec `npm run check:comment-moderation`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COMMENT_REPORT_REASONS, commentModerationCopyKey } from '../src/lib/commentModeration.js';
import { translations } from '../src/i18n/translations.js';

const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
const commentsComponent = readFileSync(new URL('../src/components/Comments.jsx', import.meta.url), 'utf8');

// Section « 3f. Modération des commentaires » du schéma.
const section3f = schema.slice(
  schema.indexOf('-- 3f. Modération des commentaires'),
  schema.indexOf('-- 4. Suppression du compte'),
);

test('les motifs de signalement sont identiques à la contrainte SQL', () => {
  const check = section3f.match(/reason in \(([^)]*)\)/);
  assert.ok(check, 'contrainte comment_reports.reason introuvable');
  const sqlReasons = [...check[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  assert.deepEqual([...COMMENT_REPORT_REASONS].sort(), [...sqlReasons].sort());
});

test('chaque erreur levée par le schéma a un texte, sauf les cas réservés à l’administrateur', () => {
  // Messages volontairement sans texte dans l'interface : ils ne peuvent venir
  // que de l'administrateur (SQL Editor) ou d'une requête forgée à la main.
  const notUserFacing = new Set(['comment_moderation_forbidden', 'comment_blocked_term_too_short']);
  const raised = [...new Set([...section3f.matchAll(/raise exception '([a-z_]+)'/g)].map((m) => m[1]))];
  assert.ok(raised.length >= 7, `messages trouvés : ${raised.join(', ')}`);
  for (const message of raised) {
    const key = commentModerationCopyKey({ code: 'P0001', message });
    if (notUserFacing.has(message)) {
      assert.equal(key, null, `${message} ne doit pas avoir de texte côté joueur`);
    } else {
      assert.ok(key, `aucun texte pour l’erreur « ${message} »`);
    }
  }
});

test('les erreurs de modération sont reconnues à partir de leur message et de leur code', () => {
  assert.equal(commentModerationCopyKey({ code: 'P0001', message: 'comment_blocked_terms' }), 'errBlocked');
  assert.equal(commentModerationCopyKey({ code: '42501', message: 'comment_report_requires_auth' }), 'errSignedOut');
  assert.equal(commentModerationCopyKey({ code: 'P0001', message: 'comment_report_own_comment' }), 'reportOwn');
  assert.equal(commentModerationCopyKey({ code: 'P0002', message: 'comment_report_not_found' }), 'reportMissing');
  assert.equal(commentModerationCopyKey({ code: 'P0001', message: 'comment_report_rate_limited' }), 'reportRateLimited');
  assert.equal(
    commentModerationCopyKey({
      code: '23505',
      message: 'duplicate key value violates unique constraint "comment_reports_comment_id_reporter_id_key"',
    }),
    'reportDuplicate',
  );
  assert.equal(
    commentModerationCopyKey({
      code: '23514',
      message: 'new row for relation "comment_reports" violates check constraint "comment_reports_reason_check"',
    }),
    'reportFailed',
  );
});

test('une erreur de longueur ou de droits ordinaire n’est jamais prise pour de la modération', () => {
  assert.equal(
    commentModerationCopyKey({
      code: '23514',
      message: 'new row for relation "comments" violates check constraint "comments_body_check"',
    }),
    null,
  );
  assert.equal(commentModerationCopyKey({ code: '42501', message: 'permission denied for table comments' }), null);
  assert.equal(commentModerationCopyKey({ code: 'P0001', message: 'comment_rate_limited' }), null);
  assert.equal(commentModerationCopyKey(null), null);
  assert.equal(commentModerationCopyKey(undefined), null);
});

test('chaque texte utilisé par le composant existe en français, anglais et arabe', () => {
  const used = [...new Set([...commentsComponent.matchAll(/copy\.([A-Za-z]+)/g)].map((m) => m[1]))];
  assert.ok(used.includes('report') && used.includes('reportSent'), 'le composant doit afficher le signalement');
  for (const lang of ['en', 'fr', 'ar']) {
    const copy = translations[lang].news.comments;
    for (const key of used) {
      assert.ok(copy[key] !== undefined && copy[key] !== '', `${lang} : « news.comments.${key} » manquant`);
    }
  }
});

test('chaque texte d’erreur de modération existe en français, anglais et arabe', () => {
  // Ces clés sont choisies par commentModerationCopyKey() puis lues dans describeCommentsError().
  const keys = ['errBlocked', 'errSignedOut', 'reportOwn', 'reportMissing', 'reportRateLimited', 'reportDuplicate', 'reportFailed'];
  for (const lang of ['en', 'fr', 'ar']) {
    for (const key of keys) {
      const text = translations[lang].news.comments[key];
      assert.ok(typeof text === 'string' && text.trim() !== '', `${lang} : « news.comments.${key} » manquant`);
    }
  }
});

test('les libellés des motifs existent dans chaque langue', () => {
  for (const lang of ['en', 'fr', 'ar']) {
    const labels = translations[lang].news.comments.reportReasons;
    assert.deepEqual(Object.keys(labels).sort(), [...COMMENT_REPORT_REASONS].sort(), `${lang} : motifs`);
    for (const reason of COMMENT_REPORT_REASONS) {
      assert.ok(String(labels[reason]).trim(), `${lang} : libellé vide pour ${reason}`);
    }
  }
});
