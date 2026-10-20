// La progression vit dans Supabase, et elle appartient à UN joueur.
//
// Ce test exécute le VRAI schéma (supabase/schema.sql) puis la migration
// `supabase/progression-par-joueur.sql` dans PostgreSQL (PGlite), avec les
// rôles API de Supabase simulés, et vérifie les deux promesses :
//
//   1. chaque table de progression est accessible au rôle `authenticated`
//      (sans ce `grant`, le client reçoit « permission denied » et le jeu
//      reste silencieusement sur son cache local) ;
//   2. la RLS fait son travail : un joueur ne lit ni n'écrit la ligne d'un
//      autre, y compris depuis l'app PC qui parle à la même base.
//
// Lancer avec `npm run check:progression`.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const SCHEMA_URL = new URL('../supabase/schema.sql', import.meta.url);
const MIGRATION_URL = new URL('../supabase/progression-par-joueur.sql', import.meta.url);

// Mêmes objets que Supabase (rôles, schéma auth, auth.uid()) et mêmes
// privilèges par défaut, pour que les `revoke` / `grant` soient réellement
// testés.
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

/** Tables de progression, avec la colonne qui porte l'état et le rôle attendu. */
const TABLES = [
  { table: 'player_progress', etat: 'state' },
  { table: 'rpg_sablier_progress', etat: 'state' },
  { table: 'mirage_rush_progress', etat: 'progress' },
  { table: 'vice_city_rush_progress', etat: 'progress' },
];

let db;

before(async () => {
  const schema = await readFile(SCHEMA_URL, 'utf8');
  db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  await db.exec(schema);
});

after(async () => {
  await db?.close();
});

/** Joue `fn` dans une transaction avec le rôle API et le JWT du joueur. */
function as(who, fn) {
  return db.transaction(async (tx) => {
    if (who.role) await tx.query(`set local role ${who.role}`);
    if (who.uid) await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [who.uid]);
    return fn(tx);
  });
}

const ANON = { role: 'anon' };
const player = (uid) => ({ role: 'authenticated', uid });

async function newUser(label) {
  const { rows } = await db.query(
    'insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id',
    [`${label}-${randomUUID().slice(0, 8)}@test.local`, JSON.stringify({ gamertag: label })],
  );
  return rows[0].id;
}

test('les tables de progression sont accessibles au compte, et fermées au visiteur', async () => {
  for (const { table } of TABLES) {
    const { rows } = await db.query(
      `select
         has_table_privilege('authenticated', $1, 'select') as lecture,
         has_table_privilege('authenticated', $1, 'insert') as insertion,
         has_table_privilege('authenticated', $1, 'update') as mise_a_jour,
         has_table_privilege('anon', $1, 'select') as visiteur`,
      [`public.${table}`],
    );
    assert.equal(rows[0].lecture, true, `${table} : le compte doit pouvoir lire sa ligne`);
    assert.equal(rows[0].insertion, true, `${table} : le compte doit pouvoir créer sa ligne`);
    assert.equal(rows[0].mise_a_jour, true, `${table} : le compte doit pouvoir mettre à jour sa ligne`);
    assert.equal(rows[0].visiteur, false, `${table} : aucune lecture anonyme`);
  }

  const quiz = await db.query(
    `select has_table_privilege('authenticated', 'public.quiz_progress', 'insert') as insertion,
            has_table_privilege('anon', 'public.quiz_progress', 'select') as visiteur`,
  );
  assert.equal(quiz.rows[0].insertion, true, 'quiz_progress : un palier terminé doit pouvoir être écrit');
  assert.equal(quiz.rows[0].visiteur, false, 'quiz_progress : aucune lecture anonyme');
});

test('un joueur écrit sa progression, et personne d’autre ne la lit', async () => {
  const joueurA = await newUser('Amina');
  const joueurB = await newUser('Bilal');
  const etatA = { bourse: { credits: 420 }, histoire: { etagesVaincus: ['listes-1'] }, majLe: '2026-10-20T10:00:00.000Z' };

  await as(player(joueurA), (tx) => tx.query(
    'insert into public.rpg_sablier_progress (user_id, state) values ($1, $2::jsonb)',
    [joueurA, JSON.stringify(etatA)],
  ));

  // A relit sa ligne : c'est la référence de sa progression.
  const reluA = await as(player(joueurA), (tx) => tx.query(
    'select state from public.rpg_sablier_progress where user_id = $1', [joueurA],
  ));
  assert.deepEqual(reluA.rows[0].state, etatA);

  // B ne voit rien, même en demandant explicitement la ligne de A.
  const vuParB = await as(player(joueurB), (tx) => tx.query(
    'select state from public.rpg_sablier_progress where user_id = $1', [joueurA],
  ));
  assert.equal(vuParB.rows.length, 0, 'la RLS masque la ligne d’un autre joueur');

  // B ne peut pas écrire dans la ligne de A…
  const modifieParB = await as(player(joueurB), (tx) => tx.query(
    "update public.rpg_sablier_progress set state = '{\"bourse\":{\"credits\":9999}}'::jsonb where user_id = $1",
    [joueurA],
  ));
  assert.equal(modifieParB.affectedRows, 0, 'aucune ligne d’un autre joueur n’est modifiable');

  // …et ne peut pas créer une ligne à son nom en usurpant l'identité de A.
  await assert.rejects(
    as(player(joueurB), (tx) => tx.query(
      'insert into public.rpg_sablier_progress (user_id, state) values ($1, $2::jsonb)',
      [joueurA, '{}'],
    )),
    (erreur) => erreur.code === '42501' || /row-level security|policy/i.test(erreur.message),
    'écrire sous l’identité d’un autre est refusé',
  );

  // Le visiteur n'a aucun accès, ni lecture ni écriture.
  await assert.rejects(
    as(ANON, (tx) => tx.query('select * from public.rpg_sablier_progress')),
    (erreur) => erreur.code === '42501',
    'anon n’a pas accès à la table',
  );

  // Chacun sa ligne : B crée la sienne sans toucher à celle de A.
  await as(player(joueurB), (tx) => tx.query(
    'insert into public.rpg_sablier_progress (user_id, state) values ($1, $2::jsonb)',
    [joueurB, JSON.stringify({ bourse: { credits: 15 } })],
  ));
  const lignes = await db.query('select user_id, state from public.rpg_sablier_progress order by user_id');
  assert.equal(lignes.rows.length, 2, 'une ligne par joueur');
  const ligneA = lignes.rows.find((ligne) => ligne.user_id === joueurA);
  assert.deepEqual(ligneA.state, etatA, 'la partie de A est intacte');
});

test('la migration « progression par joueur » est rejouable sans rien perdre', async () => {
  const migration = await readFile(MIGRATION_URL, 'utf8');
  const joueur = await newUser('Yasmine');
  await as(player(joueur), (tx) => tx.query(
    'insert into public.player_progress (user_id, state, level, xp) values ($1, $2::jsonb, 4, 120)',
    [joueur, JSON.stringify({ succes: ['premier-pas'] })],
  ));

  await db.exec(migration);
  await db.exec(migration);

  const apres = await as(player(joueur), (tx) => tx.query(
    'select level, xp from public.player_progress where user_id = $1', [joueur],
  ));
  assert.equal(apres.rows[0].level, 4, 'rejouer la migration ne touche pas aux données');
  assert.equal(apres.rows[0].xp, 120);

  // Et le Sablier reste accessible après la migration.
  const privilegies = await db.query(
    `select has_table_privilege('authenticated', 'public.rpg_sablier_progress', 'update') as maj,
            has_table_privilege('anon', 'public.rpg_sablier_progress', 'select') as visiteur`,
  );
  assert.equal(privilegies.rows[0].maj, true);
  assert.equal(privilegies.rows[0].visiteur, false);
});
