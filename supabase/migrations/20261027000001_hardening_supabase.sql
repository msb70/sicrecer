-- 20261027000001 · Endurecimiento específico de Supabase (aplicado 2026-10-27 vía pooler)
-- En Supabase la clave publicable viaja en el navegador y el rol `anon` existe sin sesión:
-- se le retira todo acceso a public (RLS ya lo impedía; esto es defensa en profundidad).
-- `authenticated` conserva EXECUTE sobre todas las funciones (antes lo tenía vía PUBLIC);
-- las funciones de dinero validan el rol internamente (fn_usuario_actual / fn_permiso_actual).
grant execute on all functions in schema public to authenticated;
revoke execute on all functions in schema public from anon, public;
alter default privileges for role postgres in schema public revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon;
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;

-- search_path fijo en las funciones que no lo declaraban (advisor function_search_path_mutable)
do $$ declare r record; begin
  for r in select p.oid::regprocedure::text f from pg_proc p where p.pronamespace='public'::regnamespace
           and not exists (select 1 from unnest(coalesce(p.proconfig,'{}')) c where c like 'search_path=%') loop
    execute format('alter function %s set search_path = public', r.f);
  end loop; end $$;

-- Jobs: sustituyen a las Neon Functions moradiaria/notificador y sus Function Triggers.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select cron.unschedule(jobid) from cron.job where jobname = 'mora-diaria';
select cron.schedule('mora-diaria', '15 5 * * *', $$select public.recalcular_mora()$$);
-- El job 'notificador-cada-5-min' se crea en 20261027000002 cuando exista el secreto en Vault.
