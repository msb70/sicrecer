// ─── Términos, política de datos y autorización (habeas data) ────
// Fuente única: cualquier pantalla que muestre estos textos o enlaces
// debe importarlos de aquí. Si cambian los documentos, sube la versión:
// el portal volverá a pedir la aceptación a quien aceptó una versión anterior.

// Páginas públicas dentro de sicrecer.com (textos en lib/textosLegales.ts)
export const RUTA_TERMINOS = '/terminos-y-condiciones'
export const RUTA_POLITICA_DATOS = '/politica-de-tratamiento-de-datos'
export const URL_TERMINOS = RUTA_TERMINOS
export const URL_POLITICA_DATOS = RUTA_POLITICA_DATOS

/** Versión vigente de Términos + Política. Si cambia, el portal vuelve a pedir la aceptación. */
export const VERSION_TERMINOS = '2026-10-07b'

export const EMPRESA = 'SiCrecer'
export const RESPONSABLE = 'Fundación Eugenio Mendoza'
export const NIT_RESPONSABLE = '901.484.968-9'
export const CORREO_CONTACTO = 'contacto@fundacioneugeniomendoza.com'
export const SITIO_WEB = 'https://sicrecer.com'

/** Finalidades del tratamiento (Ley 1581/2012 art. 12 b: informar la finalidad). */
export const FINALIDADES_DATOS = [
  'Crear y administrar tu cuenta en el portal y verificar tu identidad (documento y fotografía).',
  'Evaluar, aprobar, desembolsar y administrar tus solicitudes de crédito, incluidas la gestión de pagos y cobranza.',
  'Contactarte sobre el estado de tus solicitudes y créditos.',
  'Cumplir obligaciones legales, contables, tributarias y de prevención de lavado de activos y financiación del terrorismo.',
  'Elaborar estadísticas e informes de impacto con datos agregados o anonimizados.',
]

/** Derechos del titular (Ley 1581/2012 art. 8). */
export const DERECHOS_TITULAR = [
  'Conocer, actualizar y rectificar tus datos personales.',
  'Solicitar prueba de esta autorización.',
  'Ser informado del uso que se ha dado a tus datos.',
  'Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).',
  'Revocar la autorización y/o pedir la supresión de tus datos cuando no exista un deber legal o contractual de conservarlos.',
  'Acceder gratuitamente a tus datos personales.',
]

export const AVISO_DATOS_SENSIBLES =
  'Tu fotografía de verificación (selfie) es un dato biométrico y, por tanto, sensible. No estás obligado a autorizar ' +
  'el tratamiento de datos sensibles (Ley 1581 de 2012, art. 6; Decreto 1377 de 2013, art. 6). Si no deseas hacerlo, ' +
  'puedes verificar tu identidad de forma presencial con un facilitador.'

export const MARCO_LEGAL = {
  colombia: [
    'Constitución Política de Colombia, art. 15 (intimidad y habeas data)',
    'Ley Estatutaria 1581 de 2012 — arts. 4 (principios), 5 y 6 (datos sensibles), 8 (derechos), 9 (autorización previa, expresa e informada) y 12 (deber de informar)',
    'Decreto 1377 de 2013, compilado en el Decreto Único 1074 de 2015 (Libro 2, Parte 2, Título 2, Capítulo 25) — arts. 5 a 8 (autorización y su prueba)',
    'Ley Estatutaria 1266 de 2008 (habeas data financiero), cuando aplique',
  ],
  venezuela: [
    'Constitución de la República Bolivariana de Venezuela, arts. 28 (habeas data) y 60 (privacidad)',
  ],
  internacional: [
    'Estándares de Protección de Datos Personales para los Estados Iberoamericanos (Red Iberoamericana de Protección de Datos, 2017)',
    'Reglamento (UE) 2016/679 (RGPD) — arts. 6, 7 y 13 como referencia de buenas prácticas sobre licitud, consentimiento y transparencia',
  ],
}
