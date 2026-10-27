-- 20261027000005 · Invitación con contraseña: botón "Crear mi contraseña" con enlace de invitación de Supabase Auth
-- (placeholder {{ENLACE_CONTRASENA}}, lo genera el notificador al enviar; un solo uso). Si el correo es Gmail el botón
-- principal es "Entrar con Google"; si no, "Crear mi contraseña". Se quita la referencia a /registro (portal de solicitantes).
create or replace function public.fn_encolar_invitacion(p_usuario_id text) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  u usuarios%rowtype; v_rol text; v_rol_desc text; v_org text; v_quien text; v_id bigint;
  v_html text; v_texto text; v_asunto text; v_contexto text; v_google boolean; v_boton text; v_pasos text;
  v_login constant text := 'https://sicrecer.com/login';
  v_logo constant text := 'https://sicrecer.com/email/sicrecer-logo-blanco.png';
  c_num constant text := '<span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:11px;background:#16a34a;color:#fff;font-size:12px;font-weight:700;margin-right:8px;">';
  c_p constant text := '<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#374151;">';
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
  v_google := lower(split_part(u.email, '@', 2)) in ('gmail.com', 'googlemail.com');
  v_contexto := '<strong style="color:#14532d;">' || fn_html_esc(v_rol) || '</strong>'
    || coalesce(' en <strong style="color:#14532d;">' || fn_html_esc(v_org) || '</strong>', '')
    || coalesce(' · ' || fn_html_esc(u.zona), '');
  v_asunto := coalesce(v_quien || ' te dio acceso a SiCrecer', 'Ya tienes acceso a SiCrecer');

  v_boton := '<td align="center" bgcolor="#16a34a" style="background:#16a34a;border-radius:10px;"><a href="'
    || case when v_google then v_login else '{{ENLACE_CONTRASENA}}' end
    || '" style="display:inline-block;padding:14px 34px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">'
    || case when v_google then 'Entrar con Google' else 'Crear mi contraseña' end || '</a></td>';

  if v_google then
    v_pasos := c_p || c_num || '1</span>Pulsa <strong>Entrar con Google</strong>.</p>'
      || c_p || c_num || '2</span>Elige la cuenta <strong style="color:#14532d;">' || fn_html_esc(u.email) || '</strong>.</p>'
      || '<p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">¿Prefieres entrar con contraseña? <a href="{{ENLACE_CONTRASENA}}" style="color:#16a34a;font-weight:600;text-decoration:none;">Créala aquí</a>.</p>';
  else
    v_pasos := c_p || c_num || '1</span>Pulsa <strong>Crear mi contraseña</strong>.</p>'
      || c_p || c_num || '2</span>Escribe tu contraseña, confírmala y guárdala.</p>'
      || '<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;">' || c_num || '3</span>Entrarás directo. La próxima vez entra en sicrecer.com con <strong style="color:#14532d;">' || fn_html_esc(u.email) || '</strong> y tu contraseña.</p>'
      || '<p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">Si tu correo es de Google Workspace también puedes usar <a href="' || v_login || '" style="color:#16a34a;font-weight:600;text-decoration:none;">Continuar con Google</a>.</p>';
  end if;

  v_html := '<div style="margin:0;padding:0;background:#f0fdf4;">'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;padding:32px 12px;"><tr><td align="center">'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(20,83,45,.10);font-family:Inter,-apple-system,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">'
    || '<tr><td align="center" bgcolor="#166534" style="background:#166534;background-image:linear-gradient(135deg,#166534 0%,#15803d 100%);padding:32px 24px 28px;">'
    || '<img src="' || v_logo || '" width="190" alt="SiCrecer" style="display:block;width:190px;max-width:70%;height:auto;border:0;"></td></tr>'
    || '<tr><td style="padding:36px 36px 8px;">'
    || '<p style="margin:0 0 6px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#16a34a;font-weight:700;">Invitación</p>'
    || '<h1 style="margin:0 0 14px;font-size:24px;line-height:1.3;color:#14532d;font-weight:700;">Hola, ' || fn_html_esc(split_part(u.nombre, ' ', 1)) || '. Ya tienes acceso a SiCrecer</h1>'
    || '<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">'
    || coalesce(fn_html_esc(v_quien) || ' te dio acceso', 'Se te dio acceso') || ' al sistema de microcréditos como ' || v_contexto || '.</p>'
    || coalesce('<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#6b7280;">' || fn_html_esc(v_rol_desc) || '</p>', '')
    || '</td></tr>'
    || '<tr><td align="center" style="padding:4px 36px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' || v_boton || '</tr></table></td></tr>'
    || '<tr><td style="padding:0 36px 28px;">'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;"><tr><td style="padding:20px 22px;">'
    || '<p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#14532d;">Cómo entrar</p>' || v_pasos
    || '</td></tr></table>'
    || '<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">El enlace para crear la contraseña es personal y de un solo uso. Si vence, pide que te reenvíen la invitación.</p>'
    || '</td></tr>'
    || '<tr><td style="padding:18px 36px;border-top:1px solid #e5e7eb;">'
    || '<p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:#9ca3af;">Si no esperabas esta invitación, puedes ignorar este correo.</p>'
    || '<p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">SiCrecer · Sistema de microcréditos por convenios<br>Fundación Eugenio Mendoza · <a href="https://sicrecer.com" style="color:#16a34a;text-decoration:none;">sicrecer.com</a></p>'
    || '</td></tr></table></td></tr></table></div>';

  v_texto := 'Hola, ' || split_part(u.nombre, ' ', 1) || E'.\n\n'
    || coalesce(v_quien || ' te dio acceso', 'Se te dio acceso') || ' a SiCrecer como ' || v_rol
    || coalesce(' en ' || v_org, '') || coalesce(' (' || u.zona || ')', '') || E'.\n\n'
    || case when v_google
         then 'Entra en ' || v_login || ' con "Continuar con Google" y la cuenta ' || u.email || E'.\nSi prefieres contraseña, créala aquí: {{ENLACE_CONTRASENA}}\n\n'
         else E'Crea tu contraseña aquí (enlace personal, un solo uso): {{ENLACE_CONTRASENA}}\nLuego entra en ' || v_login || ' con ' || u.email || E' y tu contraseña.\n\n' end
    || E'Si no esperabas esta invitación, ignora este correo.\nSiCrecer · Fundación Eugenio Mendoza';

  insert into notificaciones (destinatario, asunto, cuerpo, html, tipo, referencia)
  values (lower(u.email), v_asunto, v_texto, v_html, 'invitacion_usuario', u.id)
  returning id into v_id;

  begin perform fn_invocar_notificador(); exception when others then null; end;
  return v_id;
end $$;
revoke all on function public.fn_encolar_invitacion(text) from public, anon, authenticated;
