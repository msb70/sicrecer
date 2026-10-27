-- 20261027000004 · fn_html_esc devuelve NULL con entrada NULL (strict): evitaba que los coalesce de la
-- invitación descartaran las partes vacías (" te dio acceso", " · " sin zona).
create or replace function public.fn_html_esc(p text) returns text
language sql immutable strict set search_path = public as $$
  select replace(replace(replace(replace(p, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;')
$$;
