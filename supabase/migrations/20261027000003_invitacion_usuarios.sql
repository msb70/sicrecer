-- 20261027000003 · Invitación por correo a usuarios internos
-- 1) notificaciones.html: cuerpo HTML opcional (el notificador lo envía junto al texto)
-- 2) fn_encolar_invitacion(): arma el correo (español, marca SiCrecer) y lo encola
-- 3) trigger en usuarios: invitación automática al dar de alta (primer_acceso = true)
-- 4) RPC reenviar_invitacion(): para administradores (permiso usuarios/editar)
-- 5) primer_acceso pasa a false en el primer inicio de sesión (trigger en auth.users)

alter table public.notificaciones add column if not exists html text;

create or replace function public.fn_html_esc(p text) returns text
language sql immutable set search_path = public as $$
  select replace(replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;')
$$;

create or replace function public.fn_encolar_invitacion(p_usuario_id text) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  u usuarios%rowtype; v_rol text; v_rol_desc text; v_org text; v_quien text; v_id bigint;
  v_html text; v_texto text; v_asunto text; v_contexto text;
  v_url constant text := 'https://sicrecer.com/login';
  v_logo constant text := 'https://sicrecer.com/email/sicrecer-logo-blanco.png';
begin
  select * into u from usuarios where id = p_usuario_id;
  if u.id is null then raise exception 'Usuario % no existe', p_usuario_id; end if;
  select nombre, descripcion into v_rol, v_rol_desc from roles where id = coalesce(u.rol_id, 'rol-' || u.rol);
  select nombre into v_org from organizaciones where id = u.organizacion_id;
  begin
    select nombre into v_quien from usuarios where id = (fn_usuario_actual()).id and id <> u.id;
  exception when others then v_quien := null;
  end;
  v_rol := coalesce(v_rol, initcap(u.rol));
  v_contexto := '<strong style="color:#14532d;">' || fn_html_esc(v_rol) || '</strong>'
    || coalesce(' en <strong style="color:#14532d;">' || fn_html_esc(v_org) || '</strong>', '')
    || coalesce(' · ' || fn_html_esc(u.zona), '');
  v_asunto := coalesce(v_quien || ' te dio acceso a SiCrecer', 'Ya tienes acceso a SiCrecer');

  v_html := $h$<div style="margin:0;padding:0;background:#f0fdf4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(20,83,45,.10);font-family:Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <tr><td align="center" bgcolor="#166534" style="background:#166534;background-image:linear-gradient(135deg,#166534 0%,#15803d 100%);padding:32px 24px 28px;">
        <img src="$h$ || v_logo || $h$" width="190" alt="SiCrecer" style="display:block;width:190px;max-width:70%;height:auto;border:0;">
      </td></tr>
      <tr><td style="padding:36px 36px 8px;">
        <p style="margin:0 0 6px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#16a34a;font-weight:700;">Invitación</p>
        <h1 style="margin:0 0 14px;font-size:24px;line-height:1.3;color:#14532d;font-weight:700;">Hola, $h$ || fn_html_esc(split_part(u.nombre, ' ', 1)) || $h$. Ya tienes acceso a SiCrecer</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">$h$
          || coalesce(fn_html_esc(v_quien) || ' te dio acceso', 'Se te dio acceso')
          || $h$ al sistema de microcréditos como $h$ || v_contexto || $h$.</p>$h$
          || coalesce('<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#6b7280;">' || fn_html_esc(v_rol_desc) || '</p>', '')
          || $h$
      </td></tr>
      <tr><td align="center" style="padding:4px 36px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td align="center" bgcolor="#16a34a" style="background:#16a34a;border-radius:10px;">
            <a href="$h$ || v_url || $h$" style="display:inline-block;padding:14px 34px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Entrar a SiCrecer</a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:0 36px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
          <tr><td style="padding:20px 22px;">
            <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#14532d;">Cómo entrar</p>
            <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#374151;"><span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:11px;background:#16a34a;color:#fff;font-size:12px;font-weight:700;margin-right:8px;">1</span>Pulsa <strong>Entrar a SiCrecer</strong>.</p>
            <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#374151;"><span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:11px;background:#16a34a;color:#fff;font-size:12px;font-weight:700;margin-right:8px;">2</span>Elige <strong>Continuar con Google</strong> con la cuenta <strong style="color:#14532d;">$h$ || fn_html_esc(u.email) || $h$</strong>.</p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;"><span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:11px;background:#16a34a;color:#fff;font-size:12px;font-weight:700;margin-right:8px;">3</span>¡Listo! Verás los módulos de tu rol.</p>
          </td></tr>
        </table>
        <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">¿Tu correo no es de Google? Regístrate en <a href="https://sicrecer.com/registro" style="color:#16a34a;text-decoration:none;font-weight:600;">sicrecer.com/registro</a> con este mismo correo y crea tu contraseña.</p>
      </td></tr>
      <tr><td style="padding:18px 36px;border-top:1px solid #e5e7eb;">
        <p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:#9ca3af;">Si no esperabas esta invitación, puedes ignorar este correo.</p>
        <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">SiCrecer · Sistema de microcréditos por convenios<br>Fundación Eugenio Mendoza · <a href="https://sicrecer.com" style="color:#16a34a;text-decoration:none;">sicrecer.com</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</div>$h$;

  v_texto := 'Hola, ' || split_part(u.nombre, ' ', 1) || E'.\n\n'
    || coalesce(v_quien || ' te dio acceso', 'Se te dio acceso') || ' a SiCrecer como ' || v_rol
    || coalesce(' en ' || v_org, '') || coalesce(' (' || u.zona || ')', '') || E'.\n\n'
    || E'Cómo entrar:\n1. Ve a ' || v_url || E'\n2. Elige "Continuar con Google" con la cuenta ' || u.email
    || E'\n\n¿Tu correo no es de Google? Regístrate en https://sicrecer.com/registro con este mismo correo y crea tu contraseña.\n\n'
    || E'Si no esperabas esta invitación, ignora este correo.\nSiCrecer · Fundación Eugenio Mendoza';

  insert into notificaciones (destinatario, asunto, cuerpo, html, tipo, referencia)
  values (lower(u.email), v_asunto, v_texto, v_html, 'invitacion_usuario', u.id)
  returning id into v_id;

  -- Envío inmediato (pg_net es asíncrono y se ejecuta tras el commit); si falla, lo recoge el cron de 5 min.
  begin perform fn_invocar_notificador(); exception when others then null; end;
  return v_id;
end $$;
revoke all on function public.fn_encolar_invitacion(text) from public, anon, authenticated;

create or replace function public.fn_trg_invitacion_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.primer_acceso and new.email is not null then
    begin perform fn_encolar_invitacion(new.id);
    exception when others then raise warning 'invitación no encolada para %: %', new.id, sqlerrm;
    end;
  end if;
  return new;
end $$;
revoke all on function public.fn_trg_invitacion_usuario() from public, anon, authenticated;
drop trigger if exists trg_invitacion_usuario on public.usuarios;
create trigger trg_invitacion_usuario after insert on public.usuarios
  for each row execute function public.fn_trg_invitacion_usuario();

create or replace function public.reenviar_invitacion(p_usuario_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u usuarios%rowtype; v_id bigint;
begin
  if not fn_permiso_actual('usuarios', 'editar') then raise exception 'No tienes permiso para invitar usuarios'; end if;
  select * into u from usuarios where id = p_usuario_id and organizacion_id = fn_org_actual();
  if u.id is null then raise exception 'Usuario no encontrado'; end if;
  if not u.primer_acceso then raise exception 'Este usuario ya activó su acceso'; end if;
  if exists (select 1 from notificaciones where tipo = 'invitacion_usuario' and referencia = u.id
             and creado_en > now() - interval '2 minutes') then
    raise exception 'Ya se envió una invitación hace menos de 2 minutos';
  end if;
  v_id := fn_encolar_invitacion(u.id);
  return jsonb_build_object('ok', true, 'notificacion_id', v_id, 'destinatario', lower(u.email));
end $$;
revoke all on function public.reenviar_invitacion(text) from public, anon;
grant execute on function public.reenviar_invitacion(text) to authenticated;

-- Activación: primer inicio de sesión → primer_acceso = false (nunca bloquea el login)
create or replace function public.fn_trg_activar_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.last_sign_in_at is not null and new.email is not null then
    begin
      update public.usuarios set primer_acceso = false where lower(email) = lower(new.email) and primer_acceso;
    exception when others then raise warning 'activación de usuario: %', sqlerrm;
    end;
  end if;
  return new;
end $$;
revoke all on function public.fn_trg_activar_usuario() from public, anon, authenticated;
drop trigger if exists trg_activar_usuario on auth.users;
create trigger trg_activar_usuario after insert or update of last_sign_in_at on auth.users
  for each row execute function public.fn_trg_activar_usuario();

-- Usuarios que ya entraron alguna vez
update public.usuarios us set primer_acceso = false
from auth.users au where lower(au.email) = lower(us.email) and au.last_sign_in_at is not null and us.primer_acceso;

notify pgrst, 'reload schema';
