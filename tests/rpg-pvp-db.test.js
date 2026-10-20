// Le Sablier en ligne — le schéma PvP sur le VRAI PostgreSQL (PGlite).
//
// `supabase/rpg-pvp.sql` est exécuté après `supabase/schema.sql`, avec les
// objets Supabase simulés (rôles anon / authenticated, schéma auth,
// auth.uid()), comme `tests/comment-moderation-db.test.js`. Ce que l'on
// vérifie ici ne peut pas l'être en JavaScript : la RLS, les privilèges, la
// contrainte d'invitation unique et l'appariement transactionnel de la file.
//
// Lancer avec `npm run check:rpg-pvp`.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const SCHEMA_URL = new URL('../supabase/schema.sql', import.meta.url);
const PVP_URL = new URL('../supabase/rpg-pvp.sql', import.meta.url);

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

before(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  await db.exec(await readFile(SCHEMA_URL, 'utf8'));
  await db.exec(await readFile(PVP_URL, 'utf8'));
});

after(async () => {
  await db?.close();
});

// Joue `fn` dans une transaction avec le rôle API et le JWT de la session.
function as(who, fn) {
  return db.transaction(async (tx) => {
    if (who.role) await tx.query(`set local role ${who.role}`);
    if (who.uid) await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [who.uid]);
    return fn(tx);
  });
}

const SERVICE = {}; // clé service : rôle postgres, pas de JWT (comme l'arbitre)
const player = (uid) => ({ role: 'authenticated', uid });

/** Deck valide au sens du schéma : 30 identifiants. */
const deck = () => JSON.stringify(Array.from({ length: 30 }, (_, i) => `carte-${i}`));

async function newUser(label) {
  const { rows } = await db.query(
    'insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id',
    [`${label}-${randomUUID().slice(0, 8)}@test.local`, JSON.stringify({ gamertag: label })],
  );
  return rows[0].id;
}

const rejoindre = (uid, { deck: cartes = deck(), mode = 'live', classe = false, note = 1200 } = {}) => as(
  player(uid),
  async (tx) => (await tx.query(
    'select public.rpg_sablier_file_rejoindre($1::jsonb, $2, $3, $4) as r',
    [cartes, mode, classe, note],
  )).rows[0].r,
);

test('l’état d’un duel est invisible au client, même participant', async () => {
  const hote = await newUser('hote');
  await db.query(
    `insert into public.rpg_sablier_duels (code, hote_id, hote_deck, statut)
     values ('AAAAAAAA', $1, $2::jsonb, 'invitation')`,
    [hote, deck()],
  );
  await assert.rejects(
    () => as(player(hote), (tx) => tx.query('select etat, graine from public.rpg_sablier_duels')),
    (err) => err.code === '42501',
    'un joueur ne doit jamais pouvoir lire etat / graine',
  );
  // Le journal d'actions non plus : il contient les intentions de l'adversaire.
  await assert.rejects(
    () => as(player(hote), (tx) => tx.query('select * from public.rpg_sablier_duel_actions')),
    (err) => err.code === '42501',
  );
});

test('la file apparie deux joueurs et crée le duel, sans passer par l’arbitre', async () => {
  const a = await newUser('a');
  const b = await newUser('b');

  assert.deepEqual(await rejoindre(a), { statut: 'attente', mode: 'live' });
  const seconde = await rejoindre(b, { note: 1215 });
  assert.equal(seconde.statut, 'apparie');
  assert.equal(seconde.siege, 'sorcier', 'le premier arrivé est hôte, donc siège joueur');
  assert.equal(seconde.adversaire_id, a);
  assert.match(seconde.code, /^[A-F0-9]{8}$/);

  const { rows } = await db.query(
    'select hote_id, invite_id, statut, tour, mode from public.rpg_sablier_duels where code = $1',
    [seconde.code],
  );
  assert.deepEqual(rows[0], {
    hote_id: a, invite_id: b, statut: 'en_cours', tour: 'joueur', mode: 'live',
  });
  // La file est vidée des deux côtés.
  const restants = await db.query('select count(*)::int as n from public.rpg_sablier_file');
  assert.equal(restants.rows[0].n, 0);
});

test('la file refuse un deck incomplet et ne garde pas de fantôme', async () => {
  const c = await newUser('c');
  await assert.rejects(
    () => rejoindre(c, { deck: JSON.stringify(['une', 'deux', 'trois']) }),
    (err) => err.code === '22023' && err.message === 'deck_invalide',
  );
  await rejoindre(c, { mode: 'async' });
  await as(player(c), (tx) => tx.query('select public.rpg_sablier_file_quitter()'));
  const restants = await db.query('select count(*)::int as n from public.rpg_sablier_file where joueur_id = $1', [c]);
  assert.equal(restants.rows[0].n, 0);
});

test('les deux modes ne s’apparient pas entre eux', async () => {
  const d = await newUser('d');
  const e = await newUser('e');
  assert.equal((await rejoindre(d, { mode: 'live' })).statut, 'attente');
  assert.equal((await rejoindre(e, { mode: 'async' })).statut, 'attente');
  await db.query('delete from public.rpg_sablier_file');
});

test('une seule invitation en attente par couple de joueurs', async () => {
  const hote = await newUser('hote2');
  const ami = await newUser('ami2');
  const inserer = () => db.query(
    `insert into public.rpg_sablier_duels (code, hote_id, invite_id, hote_deck, statut)
     values (upper(left(md5(random()::text), 8)), $1, $2, $3::jsonb, 'invitation')`,
    [hote, ami, deck()],
  );
  await inserer();
  await assert.rejects(inserer, (err) => err.code === '23505');
  // Un autre ami reste possible, et le même couple peut rejouer une fois la
  // première invitation refusée.
  await db.query(
    `update public.rpg_sablier_duels set statut = 'refusee' where hote_id = $1 and invite_id = $2`,
    [hote, ami],
  );
  await inserer();
});

test('les messages typés : un défi est un message, une valeur inconnue est refusée', async () => {
  const a = await newUser('msg-a');
  const b = await newUser('msg-b');
  // Un défi nominatif est un message : il exige donc l'amitié, comme le reste
  // du fil. Le mode « lien » (visibilite = 'lien') est la porte des inconnus.
  // La demande croisée accepte la première (`prepare_friendship`) : c'est le
  // chemin réel d'une amitié, pas un statut forcé.
  await db.query('insert into public.friendships (requester_id, addressee_id) values ($1, $2)', [a, b]);
  await db.query('insert into public.friendships (requester_id, addressee_id) values ($1, $2)', [b, a]);
  const insert = (kind, payload = null) => db.query(
    `insert into public.direct_messages (conversation_key, sender_id, recipient_id, body, kind, payload)
     values ('k', $1, $2, 'Yasmine te défie au Sablier', $3, $4::jsonb)`,
    [a, b, kind, payload ? JSON.stringify(payload) : null],
  );
  await insert('defi-sablier', { code: 'ABCDEF12', mode: 'live' });
  const { rows } = await db.query(
    `select body, kind, payload from public.direct_messages where sender_id = $1`,
    [a],
  );
  assert.equal(rows[0].kind, 'defi-sablier');
  assert.equal(rows[0].payload.code, 'ABCDEF12');
  // Le texte lisible reste là : un ancien client affiche encore un message.
  assert.match(rows[0].body, /défie au Sablier/);
  await assert.rejects(() => insert('defi-invente'), (err) => err.code === '23514');
});

test('la purge expire les invitations et nettoie les parties de correspondance', async () => {
  const hote = await newUser('vieux');
  await db.query(
    `insert into public.rpg_sablier_duels (code, hote_id, hote_deck, statut, cree_le)
     values ('BBBBBBBB', $1, $2::jsonb, 'invitation', now() - interval '8 days')`,
    [hote, deck()],
  );
  await db.query(
    `insert into public.rpg_sablier_duels (code, hote_id, hote_deck, statut, mode, maj_le)
     values ('CCCCCCCC', $1, $2::jsonb, 'terminee', 'async', now() - interval '31 days')`,
    [hote, deck()],
  );
  await as(SERVICE, (tx) => tx.query('select public.rpg_sablier_purge()'));
  const { rows } = await db.query(
    `select code, statut from public.rpg_sablier_duels where code in ('BBBBBBBB', 'CCCCCCCC')`,
  );
  assert.deepEqual(rows, [{ code: 'BBBBBBBB', statut: 'expiree' }]);
});
