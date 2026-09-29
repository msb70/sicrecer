// SiCrecer — autocorrección de versiones en caché.
// Si el navegador guardó una portada vieja, esta pide un bundle que ya no existe.
// El servidor (.htaccess) responde con este script: refresca la portada en la caché
// del navegador y recarga una sola vez. Si aun así falla, explica qué hacer.
(async () => {
  const CLAVE = 'sicrecer-recarga'
  let yaIntentado = false
  try { yaIntentado = sessionStorage.getItem(CLAVE) === '1'; sessionStorage.setItem(CLAVE, '1') } catch { /* sin storage */ }
  if (yaIntentado) {
    document.body.innerHTML = '<div style="font-family:system-ui,sans-serif;max-width:420px;margin:15vh auto;padding:24px;text-align:center;color:#374151">'
      + '<p style="font-size:18px;font-weight:600">Hay una versión nueva de SiCrecer</p>'
      + '<p>Recarga la página sin caché: <b>Cmd + Shift + R</b> en Mac o <b>Ctrl + F5</b> en Windows.</p></div>'
    return
  }
  try {
    await fetch('/', { cache: 'reload', credentials: 'same-origin' })
    if (location.pathname !== '/') await fetch(location.pathname, { cache: 'reload', credentials: 'same-origin' })
  } catch { /* se recarga igual */ }
  location.reload()
})()
