// Tests de comportement de la modération des commentaires sur le VRAI schéma
// (supabase/schema.sql, exécuté dans PostgreSQL via PGlite). Les objets Supabase
// (rôles anon / authenticated, schéma auth, auth.uid()) sont simulés ci-dessous,
// avec les privilèges par défaut de Supabase pour que les « revoke » soient testés.
// Lancer avec `npm run check:comment-moderation`.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const SCHEMA_URL = new URL('../supabase/schema.sql', import.meta.url);

const SUPABASE_STUBS = `
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  encrypted_password text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant select on auth.users to authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

let db;
let schemaSql;

before(async () => {
  schemaSql = await readFile(SCHEMA_URL, 'utf8');
  db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  await db.exec(schemaSql);
});

after(async () => {
  await db?.close();
});

// Joue `fn` dans une transaction, avec le rôle API voulu et le JWT de la session.
// Les identités ci-dessous correspondent à celles que PostgREST fournit.
const ANON = { role: 'anon' };
const ADMIN = {}; // rôle postgres (SQL Editor) : pas de JWT
const player = (uid) => ({ role: 'authenticated', uid });

function as(who, fn) {
  return db.transaction(async (tx) => {
    if (who.role) await tx.query(`set local role ${who.role}`);
    if (who.uid) await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [who.uid]);
    return fn(tx);
  });
}

const isBlocked = (err) => err.code === 'P0001' && err.message === 'comment_blocked_terms';
const denied = (err) => err.code === '42501';
const withMessage = (message) => (err) => err.message === message;

async function newUser(label) {
  const { rows } = await db.query(
    'insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id',
    [`${label}-${randomUUID().slice(0, 8)}@test.local`, JSON.stringify({ gamertag: label })],
  );
  return rows[0].id;
}

// Commentaire d'article posté par un compte neuf (la limite est de 5 par minute et par compte).
async function seedComment(body = 'Commentaire de test') {
  const authorId = await newUser('auteur');
  const { rows } = await db.query(
    `insert into public.comments (article_id, user_id, body) values ('article-test', $1, $2) returning id`,
    [authorId, body],
  );
  return { commentId: rows[0].id, authorId };
}

const INSERT_REPORT = 'insert into public.comment_reports (comment_id, reason) values ($1, $2)';

function report(reporterId, commentId, reason = 'spam') {
  return as(player(reporterId), (tx) => tx.query(INSERT_REPORT, [commentId, reason]));
}

async function visibleCount(who, commentId) {
  const { rows } = await as(who, (tx) => tx.query(
    'select count(*)::int as n from public.comments where id = $1',
    [commentId],
  ));
  return rows[0].n;
}

async function hiddenAt(commentId) {
  const { rows } = await db.query('select hidden_at from public.comments where id = $1', [commentId]);
  return rows[0].hidden_at;
}

async function findTerm(text) {
  const { rows } = await db.query('select public.find_blocked_comment_term($1) as term', [text]);
  return rows[0].term;
}

test('liste de départ : formes normalisées, actives, racines assez longues', async () => {
  const { rows } = await db.query('select term, match_mode, enabled from public.comment_blocked_terms');
  assert.ok(rows.length >= 40, `${rows.length} mots seulement`);
  for (const row of rows) {
    const { rows: [{ n }] } = await db.query('select public.moderation_normalize($1) as n', [row.term]);
    assert.equal(n, row.term, `« ${row.term} » n’est pas stocké sous sa forme normalisée`);
    assert.equal(row.enabled, true, `« ${row.term} » désactivé par défaut`);
    if (row.term.includes(' ')) assert.equal(row.match_mode, 'phrase', row.term);
    if (row.match_mode === 'stem') assert.ok(row.term.length >= 4, row.term);
  }
});

test('normalisation : casse, accents, espaces invisibles, forme pleine chasse', async () => {
  const cases = [
    ['ÉCOLE', 'ecole'],
    ['Ça va', 'ca va'],
    ['œuf', 'oeuf'],
    ['  a-b  ', 'a b'],
    ['ＡＢＣ', 'abc'],
    ['enc\u200Bulé', 'encule'],
    ['قَحْبَةٌ', 'قحبه'],
  ];
  for (const [input, expected] of cases) {
    const { rows: [{ n }] } = await db.query('select public.moderation_normalize($1) as n', [input]);
    assert.equal(n, expected, `« ${input} »`);
  }
});

test('détection : variantes de contournement reconnues, mots ordinaires épargnés', async () => {
  const blocked = [
    'Va te faire enculé !', 'il est enculer', 'PUTE', 'Espèce de connard', 'quel connnnard',
    'c0nnard', 'c.o.n.n.a.r.d', 'p u t e s', 'f u u u c k this', 'Fuck', 'nique-ta-mère',
    'NIQUE TA MERE !!', 'espèce de fils-de-pute', 'tue-toi', 'NÈGRE', '9a7ba', 'sharmouta',
    'nikmok', 'كس', 'قَحْبَة', 'شَرْمُوطَة', 'منيوك', 'عـرص', 'ＰＵＴＥ', 'é n c u l é',
    'kill yourself lol',
  ];
  const allowed = [
    'Puteaux est une ville magnifique', 'Réputé pour ses jeux', 'Le retard de sortie est énorme',
    'Niger : actualité du Sahel', 'Pédale de frein cassée', 'Charmant et intelligent',
    'Sharm el-Sheikh en vacances', 'Computer science rocks', 'Merde, putain, shit, 2024 !',
    'Super jeu, merci beaucoup !', 'كل عام وأنتم بخير',
  ];
  for (const text of blocked) {
    assert.ok(await findTerm(text), `« ${text} » aurait dû être bloqué`);
  }
  for (const text of allowed) {
    assert.equal(await findTerm(text), null, `« ${text} » ne doit pas être bloqué`);
  }
});

test('article : un commentaire contenant un mot interdit est refusé, un commentaire propre est publié', async () => {
  const user = await newUser('alice');
  await assert.rejects(
    as(player(user), (tx) => tx.query(
      `insert into public.comments (article_id, body) values ('article-test', $1)`,
      ['Va te faire enculé !'],
    )),
    isBlocked,
  );
  const { rows: [{ n }] } = await db.query(
    'select count(*)::int as n from public.comments where user_id = $1',
    [user],
  );
  assert.equal(n, 0, 'le commentaire refusé ne doit pas être enregistré');

  const { rows: [row] } = await as(player(user), (tx) => tx.query(
    `insert into public.comments (article_id, body) values ('article-test', $1)
     returning user_id, author_name, body`,
    ['  Super jeu, merci !  '],
  ));
  assert.equal(row.user_id, user);
  assert.equal(row.author_name, 'alice');
  assert.equal(row.body, 'Super jeu, merci !');
});

test('article : une modification ne peut pas introduire un mot interdit', async () => {
  const { commentId, authorId } = await seedComment('Premier message');
  await assert.rejects(
    as(player(authorId), (tx) => tx.query(
      'update public.comments set body = $1 where id = $2',
      ['quel connard', commentId],
    )),
    isBlocked,
  );
  await as(player(authorId), (tx) => tx.query(
    'update public.comments set body = $1 where id = $2',
    ['Message corrigé', commentId],
  ));
  const { rows: [{ body }] } = await db.query('select body from public.comments where id = $1', [commentId]);
  assert.equal(body, 'Message corrigé');
});

test('fils communautaires : la même liste s’applique aux messages', async () => {
  const user = await newUser('carole');
  const { rows: [group] } = await db.query(
    `insert into public.community_groups (name, description, category, created_by)
     values ('Groupe de test', 'Une description assez longue pour passer', 'Autre', $1)
     returning id`,
    [user],
  );
  await assert.rejects(
    as(player(user), (tx) => tx.query(
      'insert into public.community_comments (group_id, body) values ($1, $2)',
      [group.id, 'espèce de fils de pute'],
    )),
    isBlocked,
  );
  const { rows } = await as(player(user), (tx) => tx.query(
    'insert into public.community_comments (group_id, body) values ($1, $2) returning body',
    [group.id, 'Bonne idée pour ce groupe'],
  ));
  assert.equal(rows[0].body, 'Bonne idée pour ce groupe');
});

test('administrateur : ajout, forme multi-mots, désactivation, racines trop courtes refusées', async () => {
  await db.query(`insert into public.comment_blocked_terms (term, match_mode) values ('Bidulon', 'word')`);
  const { rows: [added] } = await db.query(`select term, match_mode from public.comment_blocked_terms where term = 'bidulon'`);
  assert.deepEqual(added, { term: 'bidulon', match_mode: 'word' });

  const user = await newUser('dave');
  await assert.rejects(
    as(player(user), (tx) => tx.query(
      `insert into public.comments (article_id, body) values ('article-test', 'tu es un BIDULON')`,
    )),
    isBlocked,
  );

  await db.query(`update public.comment_blocked_terms set enabled = false where term = 'bidulon'`);
  await as(player(user), (tx) => tx.query(
    `insert into public.comments (article_id, body) values ('article-test', 'tu es un BIDULON')`,
  ));

  const { rows: [phrase] } = await db.query(
    `insert into public.comment_blocked_terms (term, match_mode) values ('Mot  à Mot', 'word') returning term, match_mode`,
  );
  assert.deepEqual(phrase, { term: 'mot a mot', match_mode: 'phrase' });

  await assert.rejects(
    db.query(`insert into public.comment_blocked_terms (term, match_mode) values ('abc', 'stem')`),
    (err) => err.code === '23514' && err.message === 'comment_blocked_term_too_short',
  );
});

test('la liste et les fonctions internes sont fermées aux visiteurs et aux joueurs', async () => {
  const user = await newUser('visiteur');
  await assert.rejects(as(ANON, (tx) => tx.query('select term from public.comment_blocked_terms')), denied);
  await assert.rejects(as(player(user), (tx) => tx.query('select term from public.comment_blocked_terms')), denied);
  await assert.rejects(as(ANON, (tx) => tx.query(`select public.find_blocked_comment_term('pute')`)), denied);
  await assert.rejects(as(player(user), (tx) => tx.query(`select public.moderation_normalize('pute')`)), denied);
  await assert.rejects(as(ANON, (tx) => tx.query('select id from public.comment_reports')), denied);
  await assert.rejects(
    as(ANON, (tx) => tx.query(INSERT_REPORT, [randomUUID(), 'spam'])),
    denied,
  );
});

test('signalement : pas de signalement de son propre commentaire, ni de commentaire inconnu, ni de doublon, ni de motif inconnu', async () => {
  const { commentId, authorId } = await seedComment('Commentaire à signaler');
  const other = await seedComment('Autre commentaire');
  const reporter = await newUser('signalant');

  await assert.rejects(
    as(player(authorId), (tx) => tx.query(INSERT_REPORT, [commentId, 'spam'])),
    withMessage('comment_report_own_comment'),
  );
  await assert.rejects(
    as(player(reporter), (tx) => tx.query(INSERT_REPORT, [randomUUID(), 'spam'])),
    withMessage('comment_report_not_found'),
  );
  await as(player(reporter), (tx) => tx.query(INSERT_REPORT, [commentId, 'spam']));
  await assert.rejects(
    as(player(reporter), (tx) => tx.query(INSERT_REPORT, [commentId, 'spam'])),
    (err) => err.code === '23505',
  );
  await assert.rejects(
    as(player(reporter), (tx) => tx.query(INSERT_REPORT, [other.commentId, 'nope'])),
    (err) => err.code === '23514',
  );
});

test('signalement : le compte signalant vient de la session ; chacun ne voit que ses signalements', async () => {
  const { commentId } = await seedComment('Commentaire signalé');
  const r1 = await newUser('r1');
  const r2 = await newUser('r2');

  // Tentative d'usurpation : le serveur remplace reporter_id par le compte connecté.
  await as(player(r1), (tx) => tx.query(
    'insert into public.comment_reports (comment_id, reason, reporter_id) values ($1, $2, $3)',
    [commentId, 'hate', r2],
  ));
  const { rows } = await db.query('select reporter_id from public.comment_reports where comment_id = $1', [commentId]);
  assert.deepEqual(rows.map((row) => row.reporter_id), [r1]);

  const mine = await as(player(r1), (tx) => tx.query('select comment_id from public.comment_reports'));
  assert.equal(mine.rows.length, 1);
  const theirs = await as(player(r2), (tx) => tx.query('select comment_id from public.comment_reports'));
  assert.equal(theirs.rows.length, 0);
});

test('masquage : à partir de 3 comptes distincts, le commentaire disparaît pour tout le monde', async () => {
  const { commentId, authorId } = await seedComment('Commentaire polémique');
  const r1 = await newUser('x1');
  const r2 = await newUser('x2');
  const r3 = await newUser('x3');

  await report(r1, commentId);
  await report(r2, commentId);
  assert.equal(await visibleCount(ANON, commentId), 1, 'deux signalements ne masquent pas encore');

  // Un même compte ne compte qu'une fois.
  await assert.rejects(report(r1, commentId), (err) => err.code === '23505');
  assert.equal(await visibleCount(ANON, commentId), 1);

  await report(r3, commentId);
  assert.equal(await visibleCount(ANON, commentId), 0, 'masqué pour les visiteurs');
  assert.equal(await visibleCount(player(authorId), commentId), 0, 'masqué aussi pour l’auteur');
  assert.notEqual(await hiddenAt(commentId), null);
});

test('masquage : un joueur ne peut ni démasquer ni masquer un commentaire', async () => {
  const { commentId, authorId } = await seedComment('Commentaire à masquer');
  for (const label of ['m1', 'm2', 'm3']) {
    await report(await newUser(label), commentId);
  }

  // L'auteur ne voit plus son commentaire : sa tentative ne touche aucune ligne.
  const res = await as(player(authorId), (tx) => tx.query(
    'update public.comments set hidden_at = null where id = $1',
    [commentId],
  ));
  assert.equal(res.affectedRows, 0);
  assert.notEqual(await hiddenAt(commentId), null);

  // Un commentaire visible ne peut pas être masqué par son auteur.
  const visible = await seedComment('Commentaire visible');
  await assert.rejects(
    as(player(visible.authorId), (tx) => tx.query(
      'update public.comments set hidden_at = now() where id = $1',
      [visible.commentId],
    )),
    (err) => err.code === '42501' && err.message === 'comment_moderation_forbidden',
  );
});

test('signalements : 5 par minute et par compte au maximum', async () => {
  const reporter = await newUser('rafale');
  const comments = [];
  for (let i = 0; i < 6; i += 1) {
    comments.push((await seedComment(`Commentaire numéro ${i}`)).commentId);
  }
  for (const commentId of comments.slice(0, 5)) {
    await report(reporter, commentId);
  }
  await assert.rejects(report(reporter, comments[5]), withMessage('comment_report_rate_limited'));
});

test('ré-exécuter schema.sql ne réinsère pas la liste et ne réactive pas un mot désactivé', async () => {
  const count = async () => (await db.query('select count(*)::int as n from public.comment_blocked_terms')).rows[0].n;
  const before = await count();
  await db.query(`update public.comment_blocked_terms set enabled = false where term = 'pute'`);

  await db.exec(schemaSql);

  assert.equal(await count(), before, 'la liste a été réinsérée');
  const { rows: [pute] } = await db.query(`select enabled from public.comment_blocked_terms where term = 'pute'`);
  assert.equal(pute.enabled, false, 'le mot désactivé a été réactivé');
  assert.equal(await findTerm('pute'), null);

  const { rows: triggers } = await db.query(
    `select tgname from pg_trigger where tgrelid = 'public.comments'::regclass and not tgisinternal`,
  );
  assert.equal(new Set(triggers.map((row) => row.tgname)).size, triggers.length, 'triggers dupliqués');

  await db.query(`update public.comment_blocked_terms set enabled = true where term = 'pute'`);
});
