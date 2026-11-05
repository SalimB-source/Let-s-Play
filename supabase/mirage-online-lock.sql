-- Verrouille toutes les versions installées de la fonction de salon Mirage.
-- À exécuter manuellement sur chaque projet Supabase concerné, après avoir
-- relevé les privilèges existants. Ne modifie pas les sauvegardes solo.
begin;
set local search_path = pg_catalog;
do $$
declare
  fonction record;
  nombre integer := 0;
begin
  for fonction in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'mirage_room_action'
      and p.prokind = 'f'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fonction.signature);
    nombre := nombre + 1;
    raise notice 'Verrouillée : %', fonction.signature;
  end loop;
  if nombre = 0 then
    raise notice 'Aucune fonction public.mirage_room_action trouvée : rien à révoquer. Vérifiez le projet et les autres points d’accès multijoueur.';
  end if;
end $$;
commit;

-- Vérification : aucune ligne = aucune fonction trouvée dans ce projet.
-- Les colonnes anon_execute et authenticated_execute doivent être false.
select p.oid::regprocedure as fonction,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'mirage_room_action' and p.prokind = 'f';

-- Pour réactiver, restaurer les privilèges sauvegardés pour chaque signature
-- après audit et tests. Ne pas attribuer automatiquement des droits à toutes
-- les versions : certaines peuvent avoir été volontairement restreintes.
