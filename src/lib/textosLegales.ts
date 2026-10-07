// ─── Textos legales publicados en sicrecer.com ───────────────────
// Adaptados de los documentos originales (Términos de Palante/INTAK y
// Política de la Fundación Eugenio Mendoza, vigente desde 2024-09-18) al
// servicio de SiCrecer. Cualquier cambio sustancial: sube VERSION_TERMINOS
// en lib/legal.ts para que el portal vuelva a pedir la aceptación.

import { RESPONSABLE, NIT_RESPONSABLE, CORREO_CONTACTO, SITIO_WEB, EMPRESA } from './legal'

export type Bloque = string | { lista: string[] }
export interface Seccion { titulo: string; bloques: Bloque[] }
export interface DocumentoLegal { titulo: string; vigencia: string; intro: Bloque[]; secciones: Seccion[] }

const R = RESPONSABLE
const S = EMPRESA

export const TERMINOS: DocumentoLegal = {
  titulo: 'Términos y condiciones',
  vigencia: '7 de octubre de 2026',
  intro: [
    `Los presentes Términos y Condiciones delimitan y aclaran las condiciones bajo las cuales se rigen el acceso y uso de los servicios ofrecidos por la ${R}, identificada con NIT ${NIT_RESPONSABLE}, a través del Sitio Web ${SITIO_WEB} y de su portal de solicitantes (en adelante "${S}" o el "Sitio Web"), y enmarcan la relación entre Usted y la ${R}.`,
    `Cualquier persona que desee acceder, registrarse y/o usar el Sitio Web o los Servicios podrá hacerlo sujetándose a estos Términos y Condiciones y a la Política de Tratamiento de Datos y la Información, junto con las demás políticas que rigen a ${S} y que se incorporan directamente o por referencia.`,
    'Las visitas y transacciones que se realicen en este Sitio Web, así como sus efectos jurídicos, se rigen por estas reglas y por la legislación aplicable en la República de Colombia.',
    'Toda persona que no acepte estos Términos y Condiciones y la Política de Tratamiento de Datos, los cuales tienen carácter obligatorio y vinculante, debe abstenerse de utilizar el Sitio Web y los servicios que en él se ofrecen.',
    `El Usuario debe leer, entender y aceptar todas las condiciones establecidas en estos Términos y Condiciones y en la Política de Tratamiento de Datos antes de registrarse como Usuario en el Sitio Web y/o de entregar cualquier dato con cualquier fin. La aceptación se manifiesta marcando la casilla correspondiente en el registro y en el perfil; ${S} conserva la fecha, hora y versión aceptada como prueba.`,
  ],
  secciones: [
    {
      titulo: 'Definiciones',
      bloques: [{ lista: [
        'Contenido: declaraciones, textos, imágenes y demás información contenida en el Sitio Web o en cualquier publicación de SiCrecer.',
        'Dominio: nombre único que identifica a un sitio en Internet.',
        'Política de Tratamiento de Datos: documento que explica cómo la Fundación Eugenio Mendoza recolecta, usa, protege y suprime los datos personales de los Usuarios.',
        `Servicios: el registro en el portal, la verificación de identidad, la solicitud, evaluación y seguimiento de créditos y los demás servicios que ${S} ponga a disposición a través del Sitio Web.`,
        `Sitio Web: conjunto de páginas a las que se accede a través de la dirección ${SITIO_WEB}.`,
        'Solicitud: petición de crédito que el Usuario presenta a través del portal.',
        'Términos y Condiciones: el presente documento, que regula la relación con el Usuario respecto al acceso al contenido y a los servicios del Sitio Web.',
        'Usuario: persona natural que ingresa al Sitio Web para consultar información y/o para solicitar los Servicios.',
      ] }],
    },
    {
      titulo: '1. Capacidad',
      bloques: [
        'Los Servicios sólo están disponibles para personas con capacidad legal para contratar y con al menos 18 años de edad. No podrán utilizar los Servicios las personas que carezcan de dicha capacidad.',
      ],
    },
    {
      titulo: '2. Registro',
      bloques: [
        `Para solicitar un crédito es obligatorio completar el registro y el perfil con datos válidos, exactos y verdaderos ("Datos Personales"), y mantenerlos actualizados. ${S} podrá utilizar diversos medios para verificar la identidad de los Usuarios, incluida la fotografía del documento de identidad y una fotografía de verificación.`,
        `Los Usuarios responden por la exactitud, veracidad, vigencia y autenticidad de los Datos Personales ingresados. Si se verifica o sospecha un uso fraudulento, malintencionado o contrario a estos Términos y Condiciones o a la buena fe, ${S} podrá rechazar o cancelar solicitudes, suspender o dar de baja la cuenta y ejercer las acciones legales que correspondan. Asimismo, podrá solicitar comprobantes o datos adicionales para corroborar la información, y suspender a los Usuarios cuyos datos no puedan confirmarse.`,
        `El Usuario accede con su correo electrónico y una clave secreta (la "Clave"), o con su cuenta de Google. La Clave es personal e intransferible; el Usuario es responsable de su confidencialidad y de todas las operaciones realizadas desde su cuenta. Debe notificar de inmediato a ${S}, al correo ${CORREO_CONTACTO}, cualquier uso no autorizado de su cuenta. Está prohibida la venta, cesión, préstamo o transferencia de la cuenta.`,
        `${S} podrá rechazar una solicitud de registro o cancelar un registro cuando existan motivos fundados (información falsa, suplantación, incumplimiento de estos Términos o requerimiento de autoridad).`,
      ],
    },
    {
      titulo: '3. Solicitudes de crédito',
      bloques: [
        `La presentación de una solicitud no implica su aprobación. Cada solicitud es evaluada por ${S} según las condiciones del producto (montos, plazos, cobertura geográfica, actividad económica y requisitos), la información aportada y, cuando corresponda, la visita de un facilitador y la decisión de un comité de crédito.`,
        'Las condiciones definitivas del crédito (monto, plazo, tasa, cargos, cronograma de pagos y garantías) se informan al Usuario antes del desembolso y constan en los documentos que se suscriban, los cuales prevalecen sobre la información general del Sitio Web.',
        `La consulta y el reporte de información financiera y crediticia ante operadores de información (centrales de riesgo) sólo se realizarán con la autorización previa y expresa del Usuario, otorgada por separado conforme a la Ley 1266 de 2008.`,
        'El Usuario se compromete a usar los recursos del crédito para el destino declarado y a cumplir las obligaciones de pago pactadas.',
      ],
    },
    {
      titulo: '4. Modificaciones',
      bloques: [
        `${S} podrá modificar estos Términos y Condiciones. Los cambios sustanciales se informarán a través del Sitio Web y, cuando afecten la relación con el Usuario, el portal le solicitará aceptar la nueva versión antes de continuar. Las solicitudes y créditos en curso se rigen por las condiciones vigentes al momento de su aprobación.`,
      ],
    },
    {
      titulo: '5. Contenido y uso del Sitio Web',
      bloques: [
        'El Usuario sólo puede utilizar el Sitio Web con fines lícitos. No podrá cargar documentos falsos o de terceros, suplantar identidades, ni publicar o transmitir contenido que infrinja derechos de terceros, constituya delito, sea difamatorio u ofensivo, o vulnere derechos de propiedad intelectual.',
        `La información general publicada en el Sitio Web tiene fines informativos y no constituye asesoramiento legal, financiero ni comercial personalizado. Se recomienda al Usuario consultar con profesionales para su situación particular.`,
      ],
    },
    {
      titulo: '6. Propiedad intelectual',
      bloques: [
        `El Sitio Web, su diseño, textos, gráficos, logotipos, marcas y demás contenidos son propiedad de la ${R} o de terceros que han autorizado su uso, y están protegidos por las normas de propiedad intelectual. El acceso al Sitio Web otorga al Usuario una licencia limitada, revocable e intransferible para su uso personal y no comercial.`,
        `Queda prohibido copiar, modificar, distribuir, vender o explotar cualquier contenido del Sitio Web sin autorización expresa y por escrito. Las solicitudes de permiso pueden enviarse a ${CORREO_CONTACTO}.`,
      ],
    },
    {
      titulo: '7. Disponibilidad del Sitio Web',
      bloques: [
        `${S} hará esfuerzos razonables para que el Sitio Web esté disponible y funcione correctamente, pero no garantiza su funcionamiento ininterrumpido, pues puede estar inactivo por mantenimiento, fallas técnicas o causas ajenas a su control. ${S} podrá modificar o interrumpir funcionalidades del Sitio Web, procurando informar con antelación cuando ello afecte solicitudes en curso.`,
      ],
    },
    {
      titulo: '8. Seguridad de la información',
      bloques: [
        `${S} adopta medidas técnicas, humanas y administrativas razonables para proteger la información de los Usuarios contra pérdida, acceso o uso no autorizado, conforme a la Política de Tratamiento de Datos. Ningún sistema es completamente infalible; en caso de un incidente de seguridad que afecte datos personales, ${S} actuará conforme a la ley, incluida la notificación a la Superintendencia de Industria y Comercio cuando corresponda.`,
        'Cuando intervengan terceros (por ejemplo, proveedores de autenticación como Google o entidades bancarias para desembolsos y pagos), el Usuario también estará sujeto a los términos y políticas de dichos terceros.',
      ],
    },
    {
      titulo: '9. Terminación',
      bloques: [
        `${S} podrá suspender o cancelar el acceso de un Usuario al Sitio Web cuando incumpla estos Términos y Condiciones. La cancelación de la cuenta no extingue las obligaciones derivadas de créditos ya desembolsados.`,
        `El Usuario puede solicitar en cualquier momento el cierre de su cuenta escribiendo a ${CORREO_CONTACTO}.`,
      ],
    },
    {
      titulo: '10. Resolución de controversias',
      bloques: [
        `Cualquier diferencia que surja con ocasión de la interpretación, uso, alcance o terminación de estos Términos y Condiciones se intentará resolver directamente entre el Usuario y la ${R} dentro de los treinta (30) días calendario siguientes a la fecha en que cualquiera de ellos dé aviso por escrito al otro del surgimiento de la controversia.`,
        'Si no se logra un acuerdo, las partes podrán acudir a los mecanismos alternativos de solución de conflictos que acuerden voluntariamente o a la jurisdicción ordinaria colombiana. Nada en estos Términos limita los derechos del Usuario como consumidor financiero ni su facultad de acudir a las autoridades competentes, incluida la Superintendencia de Industria y Comercio.',
      ],
    },
    {
      titulo: '11. Notificaciones',
      bloques: [
        `Cualquier comentario, inquietud o reclamación respecto de estos Términos y Condiciones, la Política de Tratamiento de Datos o su ejecución deberá notificarse por escrito a la ${R} al correo ${CORREO_CONTACTO}.`,
      ],
    },
  ],
}

export const POLITICA: DocumentoLegal = {
  titulo: 'Política de tratamiento de datos y la información',
  vigencia: '18 de septiembre de 2024 (actualizada el 7 de octubre de 2026 para SiCrecer)',
  intro: [
    `El objeto de la presente política es poner en conocimiento el tratamiento que la ${R}, identificada con NIT ${NIT_RESPONSABLE}, da a los datos personales que posee en sus bases de datos —incluidos los recolectados a través de ${S} (${SITIO_WEB})—, los derechos que asisten a los titulares y los mecanismos con que cuentan para ejercerlos. Los datos han sido y serán siempre obtenidos con el consentimiento previo de sus titulares.`,
    `Esta política se elabora de conformidad con la Constitución Política, la Ley Estatutaria 1581 de 2012, el Decreto Reglamentario 1377 de 2013 (compilado en el Decreto Único 1074 de 2015) y demás disposiciones complementarias, y será aplicada por la ${R} respecto de la recolección, almacenamiento, uso, circulación, supresión y demás actividades que constituyan tratamiento de datos personales.`,
  ],
  secciones: [
    {
      titulo: 'Introducción',
      bloques: [
        'El artículo 15 de la Constitución Política de Colombia determina que "Todas las personas tienen derecho a su intimidad personal y familiar y a su buen nombre, y el Estado debe respetarlos y hacerlos respetar. De igual modo, tienen derecho a conocer, actualizar y rectificar las informaciones que se hayan recogido sobre ellas en bancos de datos y en archivos de entidades públicas y privadas (…)".',
        'Este precepto consagra tres derechos fundamentales autónomos: intimidad, buen nombre y habeas data. El derecho de habeas data garantiza el conocimiento, actualización, rectificación y oposición respecto de la información personal contenida en bases de datos y archivos, y ha sido desarrollado por la Ley Estatutaria 1581 de 2012.',
      ],
    },
    {
      titulo: 'Definiciones',
      bloques: [{ lista: [
        'Autorización: consentimiento previo, expreso e informado del Titular para llevar a cabo el tratamiento de datos personales (Ley 1581 de 2012).',
        'Base de datos: conjunto organizado de datos personales que sea objeto de tratamiento (Ley 1581 de 2012).',
        'Consulta: derecho de los Titulares o sus causahabientes a conocer la información personal que repose en cualquier base de datos (Ley 1581 de 2012).',
        'Dato personal: cualquier información vinculada o que pueda asociarse a una o varias personas naturales determinadas o determinables.',
        'Dato público: el calificado como tal por la ley o la Constitución, como los relativos al estado civil de las personas (Ley 1266 de 2008).',
        'Dato semiprivado: el que no tiene naturaleza íntima, reservada ni pública y cuyo conocimiento puede interesar a cierto sector, como el dato financiero y crediticio (Ley 1266 de 2008).',
        'Dato privado: el que por su naturaleza íntima o reservada sólo es relevante para el titular (Ley 1266 de 2008).',
        'Datos sensibles: los que afectan la intimidad del Titular o cuyo uso indebido puede generar su discriminación, tales como el origen racial o étnico, la orientación política, las convicciones religiosas o filosóficas, la pertenencia a sindicatos u organizaciones sociales, los datos relativos a la salud y a la vida sexual, y los datos biométricos (Ley 1581 de 2012, art. 5).',
        'Encargado del tratamiento: quien realiza el tratamiento por cuenta del Responsable.',
        'Reclamo: solicitud del Titular o sus causahabientes para corregir, actualizar o suprimir información, o por presunto incumplimiento de los deberes legales (Ley 1581 de 2012).',
        'Responsable del tratamiento: persona natural o jurídica que decide sobre la base de datos y/o el tratamiento de los datos; para esta política, la Fundación Eugenio Mendoza.',
        'Titular: persona natural cuyos datos personales son objeto de tratamiento.',
        'Tratamiento: cualquier operación sobre datos personales, como la recolección, almacenamiento, uso, circulación o supresión.',
      ] }],
    },
    {
      titulo: 'Objetivo',
      bloques: [
        `Este documento informa a colaboradores, aspirantes, practicantes, proveedores, comunidad, usuarios, solicitantes y beneficiarios de los servicios desarrollados por la Fundación —incluidos los Usuarios de ${S}— (en adelante, los "RELACIONADOS"), y en general a todas las personas que hayan facilitado o faciliten sus datos personales a la ${R}, sobre la política de tratamiento de la información personal y el procedimiento para ejercer su derecho de habeas data.`,
      ],
    },
    {
      titulo: 'Responsable del tratamiento',
      bloques: [{ lista: [
        `Razón social: ${R}`,
        `NIT: ${NIT_RESPONSABLE}`,
        `Sitio web: ${SITIO_WEB}`,
        `Correo electrónico: ${CORREO_CONTACTO}`,
      ] },
        `La ${R} se encarga de la recolección y el tratamiento de los datos personales, la autorización y los registros almacenados, impidiendo que se deterioren, pierdan, alteren o se usen sin autorización, y conservándolos con la debida seguridad.`,
      ],
    },
    {
      titulo: 'Datos que recolectamos',
      bloques: [
        `A través de ${S} y de sus demás canales, la ${R} puede recolectar, entre otros:`,
        { lista: [
          'Datos de identificación: nombres, apellidos, tipo y número de documento, fecha de nacimiento, género y nacionalidad.',
          'Datos de contacto: correo electrónico, teléfono y WhatsApp, país, ciudad, localidad y dirección, y usuarios de redes sociales que el Titular decida informar.',
          'Datos socioeconómicos y financieros: actividad económica, ingresos, gastos, flujo del negocio, información de la solicitud de crédito, pagos e historial crediticio con la Fundación.',
          'Imágenes: fotografía del documento de identidad y fotografía de verificación (selfie).',
          'Datos técnicos: dirección IP, tipo de navegador e información de sesión cuando se obtienen por medios electrónicos.',
        ] },
      ],
    },
    {
      titulo: 'Finalidades del tratamiento',
      bloques: [
        `Los datos personales tratados por la ${R} se someterán únicamente a las siguientes finalidades o a las que acepten los titulares al momento de la recolección:`,
        { lista: [
          'Crear y administrar la cuenta del Usuario en el portal y verificar su identidad.',
          'Recibir, evaluar, aprobar o rechazar, desembolsar y administrar solicitudes de crédito, incluida la visita del facilitador, el análisis de capacidad de pago y la decisión del comité de crédito.',
          'Gestionar pagos, cobranza, estados de cuenta y renovaciones.',
          'Contactar al Titular en virtud de la relación existente y para informar sobre el estado de sus solicitudes y créditos.',
          'Informar sobre cambios en productos o servicios y evaluar su calidad.',
          'Enviar información comercial, publicitaria o de campañas, únicamente cuando el Titular lo haya autorizado de forma independiente.',
          'Cumplir obligaciones legales, contables, tributarias y de prevención del lavado de activos y la financiación del terrorismo, y atender requerimientos de autoridades administrativas o judiciales.',
          'Transmitir datos a encargados que presten servicios a la Fundación (alojamiento, bases de datos, autenticación, mensajería), quienes actúan bajo sus instrucciones y con deber de confidencialidad.',
          'Compartir información con aliados financiadores de los programas (por ejemplo, convenios de crédito) cuando sea necesario para ejecutar el crédito o rendir cuentas, en la medida en que el Titular lo autorice o la ley lo permita.',
          'Realizar análisis estadísticos, de impacto y de investigación, preferiblemente con datos agregados o anonimizados.',
          'Cumplir las obligaciones laborales de la Fundación como empleador respecto de sus colaboradores y aspirantes.',
          'Proteger los derechos de la Fundación conforme a las disposiciones legales.',
        ] },
        `La ${R} no venderá datos personales ni los compartirá con terceros distintos a los indicados sin autorización del Titular, salvo requerimiento legal o de autoridad competente.`,
      ],
    },
    {
      titulo: 'Datos sensibles',
      bloques: [
        'La fotografía de verificación (selfie) constituye un dato biométrico y, por tanto, sensible. Su tratamiento requiere autorización explícita y se limita a verificar la identidad del Titular y prevenir el fraude.',
        'De conformidad con el artículo 6 de la Ley 1581 de 2012 y el artículo 6 del Decreto 1377 de 2013, el Titular no está obligado a autorizar el tratamiento de datos sensibles. Quien no desee hacerlo puede verificar su identidad de forma presencial con un facilitador.',
        'La Fundación aplica a los datos sensibles mayores niveles de seguridad y restricciones de acceso por parte de su personal y de terceros.',
      ],
    },
    {
      titulo: 'Datos de niños, niñas y adolescentes',
      bloques: [
        `Los servicios de crédito de ${S} están dirigidos exclusivamente a mayores de edad. Cuando por otros programas la Fundación trate datos de menores, lo hará respetando su interés superior y sus derechos fundamentales, con autorización de su representante legal y teniendo en cuenta su opinión según su madurez.`,
      ],
    },
    {
      titulo: 'Información financiera y centrales de riesgo',
      bloques: [
        'La consulta, reporte y actualización de información financiera, crediticia y comercial ante operadores de información (centrales de riesgo) se rige por la Ley Estatutaria 1266 de 2008 y sólo se realizará con la autorización previa, expresa y separada del Titular. Antes de un reporte negativo, el Titular será informado con la antelación que exige la ley.',
      ],
    },
    {
      titulo: 'Cookies y almacenamiento local',
      bloques: [
        `${S} utiliza el almacenamiento del navegador únicamente para mantener la sesión iniciada y el funcionamiento del portal. No se utilizan cookies de terceros con fines publicitarios. El Usuario puede configurar su navegador para eliminar estos datos, lo que cerrará su sesión.`,
      ],
    },
    {
      titulo: 'Autorización',
      bloques: [
        `Antes o al momento de recolectar el dato personal, la ${R} solicita al Titular su autorización, indicando la finalidad, mediante medios técnicos que permiten conservar prueba de ella (artículo 7 del Decreto 1377 de 2013). En ${S}, la autorización se otorga marcando la casilla correspondiente en el registro y en el perfil; se conservan la fecha, hora y versión aceptadas.`,
        'La autorización para recibir comunicaciones comerciales es independiente y opcional, y puede retirarse en cualquier momento desde el perfil o escribiendo al correo de contacto.',
      ],
    },
    {
      titulo: 'Derechos de los titulares',
      bloques: [
        'De acuerdo con el artículo 8 de la Ley 1581 de 2012, los Titulares tienen derecho a:',
        { lista: [
          'Conocer, actualizar y rectificar sus datos personales.',
          'Solicitar prueba de la autorización otorgada, salvo cuando la ley no la exija.',
          'Ser informados, previa solicitud, del uso que se ha dado a sus datos.',
          'Presentar ante la Superintendencia de Industria y Comercio quejas por infracciones a la ley, una vez agotado el trámite de consulta o reclamo ante la Fundación.',
          'Revocar la autorización y/o solicitar la supresión de sus datos cuando no exista un deber legal o contractual de permanecer en la base de datos.',
          'Acceder en forma gratuita a sus datos personales al menos una vez cada mes calendario y cada vez que existan modificaciones sustanciales de esta política.',
        ] },
      ],
    },
    {
      titulo: 'Procedimiento para consultas y reclamos',
      bloques: [
        `Los Titulares pueden ejercer sus derechos escribiendo al correo ${CORREO_CONTACTO}. Los derechos sólo pueden ejercerse por el Titular, sus causahabientes o su representante, previa acreditación de identidad o representación.`,
        'La solicitud debe contener, como mínimo: el nombre y domicilio del Titular o un medio para recibir la respuesta; los documentos que acrediten su identidad o la representación; y la descripción clara de los datos sobre los que busca ejercer sus derechos y la petición concreta.',
        'Consultas: serán atendidas en un término máximo de diez (10) días hábiles contados a partir de su recibo. Si no es posible atenderlas en ese término, se informarán los motivos y la nueva fecha, que no superará cinco (5) días hábiles adicionales.',
        'Reclamos: si el reclamo está incompleto, se requerirá al interesado dentro de los cinco (5) días siguientes para que lo subsane; transcurridos dos (2) meses sin respuesta, se entenderá desistido. Una vez recibido el reclamo completo, se incluirá en la base de datos la leyenda "reclamo en trámite" en un término no mayor a dos (2) días hábiles. El término máximo para atenderlo es de quince (15) días hábiles contados desde el día siguiente a su recibo; si no es posible, se informarán los motivos y la nueva fecha, que no superará ocho (8) días hábiles adicionales.',
      ],
    },
    {
      titulo: 'Área de protección de datos personales',
      bloques: [
        `La dependencia de la ${R} encargada de la recepción y atención de peticiones, quejas y reclamos relacionados con datos personales puede ser contactada en ${CORREO_CONTACTO}.`,
      ],
    },
    {
      titulo: 'Seguridad y transferencias internacionales',
      bloques: [
        'La Fundación dispone de mecanismos técnicos, legales y organizacionales para proteger la información contra pérdida, acceso, uso, modificación o divulgación no autorizados.',
        'Algunos proveedores tecnológicos de la Fundación pueden alojar información fuera de Colombia. En esos casos, la transmisión se realiza a encargados que ofrecen niveles adecuados de protección y bajo acuerdos que garantizan el cumplimiento de esta política, conforme a los artículos 26 de la Ley 1581 de 2012 y 24 y 25 del Decreto 1377 de 2013.',
      ],
    },
    {
      titulo: 'Usuarios en Venezuela',
      bloques: [
        'Respecto de los Titulares residentes en Venezuela, la Fundación respeta además los derechos de habeas data y privacidad consagrados en los artículos 28 y 60 de la Constitución de la República Bolivariana de Venezuela.',
      ],
    },
    {
      titulo: 'Vigencia',
      bloques: [
        'Esta Política rige desde el 18 de septiembre de 2024 y fue actualizada el 7 de octubre de 2026 para incorporar los servicios de SiCrecer. Los datos personales permanecerán en las bases de datos de la Fundación durante el tiempo necesario para cumplir las finalidades para las que fueron recolectados y las obligaciones legales de conservación.',
      ],
    },
    {
      titulo: 'Modificaciones',
      bloques: [
        `Esta Política podrá ser modificada por la ${R}. Toda modificación sustancial —en particular, las relacionadas con la identificación del Responsable, las finalidades del tratamiento o el ejercicio de los derechos— será comunicada previamente a los Titulares a través del Sitio Web y/o correo electrónico y, cuando la ley lo exija, se solicitará una nueva autorización.`,
      ],
    },
    {
      titulo: 'Notificaciones',
      bloques: [
        `Cualquier comentario, inquietud o reclamación respecto de esta Política o su ejecución deberá notificarse por escrito a la ${R} al correo ${CORREO_CONTACTO}.`,
      ],
    },
  ],
}
