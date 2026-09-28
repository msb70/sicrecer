-- ─────────────────────────────────────────────────────────────
-- 0007 · Persistencia de configuración y agenda (2026-09-28)
--  - organizaciones.configuracion: datos generales (NIT, contacto,
--    dirección), preferencias de notificación y configuración regional.
--  - visitas.facilitador_id: quién agenda la visita de campo.
-- Las políticas RLS existentes ya cubren la escritura:
--  organizaciones/usuarios → administrador; prospectos, actividades_crm,
--  clientes y visitas → administrador, coordinador y facilitador.
-- ─────────────────────────────────────────────────────────────

alter table organizaciones
  add column if not exists configuracion jsonb not null default '{}'::jsonb;
comment on column organizaciones.configuracion is
  'Configuración editable desde la app: {general:{nit,email,telefono,direccion}, notificaciones:{...}, regional:{...}}';
comment on column organizaciones.logo is 'Logo como data URL (PNG/SVG/JPEG, ≤ 300 KB)';

alter table visitas
  add column if not exists facilitador_id text references usuarios(id);
create index if not exists idx_visitas_fecha on visitas (fecha);

-- Ubicación GPS del prospecto (capturada en el formulario)
alter table prospectos
  add column if not exists lat numeric,
  add column if not exists lng numeric;
