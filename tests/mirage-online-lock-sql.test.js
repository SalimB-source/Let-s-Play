import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const sql = await readFile(new URL('../supabase/mirage-online-lock.sql', import.meta.url), 'utf8');

test('verrouille toutes les signatures existantes sans toucher aux autres fonctions', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create function public.mirage_room_action(text) returns int language sql as 'select 1';
      create function public.mirage_room_action(text, integer) returns int language sql as 'select 2';
      create function public.autre_fonction(text) returns int language sql as 'select 3';
      grant execute on all functions in schema public to anon, authenticated;`);
    await db.exec(sql);
    const { rows } = await db.query(`select p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname in ('mirage_room_action', 'autre_fonction') order by p.proname`);
    assert.equal(rows.length, 3);
    for (const row of rows.filter((r) => r.proname === 'mirage_room_action')) {
      assert.equal(row.anon_execute, false);
      assert.equal(row.authenticated_execute, false);
    }
    assert.equal(rows.find((r) => r.proname === 'autre_fonction').anon_execute, true);
  } finally { await db.close(); }
});

test('ne plante pas quand la fonction est absente', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated;');
    await db.exec(sql);
  } finally { await db.close(); }
});
