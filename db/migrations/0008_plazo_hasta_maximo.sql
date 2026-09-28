-- 0008 — Plazo libre hasta el máximo de cuotas (acuerdo 2026-09-28)
-- El solicitante elige cualquier número entero de cuotas entre 1 y el
-- máximo del producto. Se deja de usar la lista cerrada de plazos
-- (plazos_permitidos) y el plazo mínimo: la columna se conserva por
-- compatibilidad, pero si trae valores solo aporta su mayor valor como tope.

create or replace function public.fn_max_cuotas(p productos_credito) returns int
language sql immutable as $$
  select greatest(coalesce(p.plazo_max, 0),
                  coalesce((select max(x) from unnest(p.plazos_permitidos) x), 0),
                  1)
$$;

create or replace function public.fn_plazo_valido(p productos_credito, p_plazo int) returns boolean
language sql immutable as $$
  select p_plazo between 1 and public.fn_max_cuotas(p)
$$;

-- El trigger ya no fija plazo_min/plazo_max a partir de la lista
create or replace function public.fn_sync_plazos_producto() returns trigger
language plpgsql as $$
begin
  if cardinality(coalesce(new.plazos_permitidos, '{}')) > 0 then
    new.plazo_max := greatest(coalesce(new.plazo_max, 0), (select max(x) from unnest(new.plazos_permitidos) x));
  end if;
  new.plazo_min := 1;
  return new;
end $$;

create or replace function public.fn_validar_plazo_solicitud() returns trigger
language plpgsql security definer set search_path = public as $$
declare p productos_credito%rowtype;
begin
  select * into p from productos_credito where id = new.producto_id;
  if not found then return new; end if;
  if (tg_op = 'INSERT' or new.plazo is distinct from old.plazo) and not public.fn_plazo_valido(p, new.plazo) then
    raise exception 'Plazo de % cuotas no permitido para el producto % (de 1 a % cuotas)', new.plazo, p.nombre, public.fn_max_cuotas(p);
  end if;
  if new.plazo_aprobado is not null and (tg_op = 'INSERT' or new.plazo_aprobado is distinct from old.plazo_aprobado)
     and not public.fn_plazo_valido(p, new.plazo_aprobado) then
    raise exception 'Plazo aprobado de % cuotas no permitido para el producto % (de 1 a % cuotas)', new.plazo_aprobado, p.nombre, public.fn_max_cuotas(p);
  end if;
  return new;
end $$;

comment on column productos_credito.plazo_max is 'Número máximo de cuotas; el solicitante elige de 1 a este valor';
comment on column productos_credito.plazos_permitidos is 'Obsoleto desde 0008: solo aporta su mayor valor como tope';
