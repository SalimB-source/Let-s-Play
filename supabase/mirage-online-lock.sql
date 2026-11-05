-- À exécuter manuellement sur chaque projet Supabase concerné, après sauvegarde
-- des privilèges existants. Bloque l'accès RPC direct aux salons Mirage.
begin;
revoke execute on function public.mirage_room_action(text, text, text, numeric, integer, numeric, integer, text, text, boolean, text, integer, uuid, boolean, text) from public, anon, authenticated;
commit;

-- Pour réactiver après validation (conforme aux droits de mirage-rooms.sql) :
-- grant execute on function public.mirage_room_action(text, text, text, numeric, integer, numeric, integer, text, text, boolean, text, integer, uuid, boolean, text) to anon, authenticated;
