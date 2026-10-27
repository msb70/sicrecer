-- 20261027000002 · service_role sobre public (Edge Functions) y job del notificador (aplicado 2026-10-27 vía pooler)
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges for role postgres in schema public grant all on tables to service_role;
alter default privileges for role postgres in schema public grant all on sequences to service_role;
alter default privileges for role postgres in schema public grant execute on functions to service_role;

-- El secreto `notificador_secret` se guarda en Vault (vault.create_secret) fuera de este archivo.
-- Invoca la Edge Function `notificador` cada 5 minutos (sustituye al Function Trigger de Neon).
create or replace function public.fn_invocar_notificador() returns bigint
language plpgsql security definer set search_path = public, net, vault as $$
declare v_secreto text; v_id bigint;
begin
  select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'notificador_secret';
  if v_secreto is null then raise exception 'Falta el secreto notificador_secret en Vault'; end if;
  select net.http_post(
    url := 'https://lvarzwnrreiqwflhooul.supabase.co/functions/v1/notificador',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secreto),
    body := '{}'::jsonb, timeout_milliseconds := 20000) into v_id;
  return v_id;
end $$;
revoke all on function public.fn_invocar_notificador() from public, anon, authenticated;
select cron.unschedule(jobid) from cron.job where jobname = 'notificador-cada-5-min';
select cron.schedule('notificador-cada-5-min', '*/5 * * * *', $$select public.fn_invocar_notificador()$$);
