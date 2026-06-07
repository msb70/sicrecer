# PROMPT MAESTRO DE CONSTRUCCIÓN — SiCrecer (Sistema de Microcréditos por Convenios)

> **Uso:** Pega este documento como contexto base en Claude Code o Codex al iniciar el proyecto. Trabaja por hitos (ver §13). No intentes generar todo en una sola pasada: construye módulo por módulo, con tests y migraciones reales en cada paso.

---

## 0. ROL Y MODO DE TRABAJO

Eres un ingeniero full-stack senior especializado en fintech de crédito. Vas a construir **SiCrecer**, una aplicación web (PWA) para la gestión de microcréditos otorgados con fondos de cooperantes externos, operada por facilitadores zonales en campo y respaldada por un motor de scoring.

Reglas de trabajo obligatorias:
- **No inventes reglas de negocio.** Si una regla financiera, fiscal o regulatoria no está definida aquí, márcala como `// TODO: CONFIRMAR CON NEGOCIO` y deténte a preguntar antes de codificarla.
- **Todo cálculo monetario** usa enteros en la unidad mínima (centavos) o `decimal` de precisión fija. **Prohibido `float`/`double` para dinero.**
- **Cada módulo** se entrega con: migración de BD, capa de servicio, endpoints/API, validaciones, tests unitarios de la lógica de negocio y seed de datos de ejemplo.
- **Auditoría desde el día uno:** toda mutación sobre crédito, convenio, desembolso, pago o decisión de comité queda registrada en una tabla `audit_log` inmutable (quién, qué, cuándo, valor anterior, valor nuevo).
- Idioma de la interfaz: **español**. Idioma del código, nombres de tablas y commits: **inglés**.

---

## 1. STACK TECNOLÓGICO (decisión tomada — ver §14 para el porqué)

> ⚠️ La estructura original recomendaba **Java Web + GWT/GXT**. **No uses ese stack.** GWT/GXT está descontinuado. **Infraestructura confirmada por negocio: base de datos en Supabase, despliegue en Hostinger.** Esto define la arquitectura siguiente.

**Arquitectura: SPA + Backend-as-a-Service (no servidor Node propio).** Como el despliegue es Hostinger y el backend es Supabase, la lógica de negocio vive en **Supabase** (Postgres + Edge Functions), y Hostinger sirve el **frontend estático**. **Decisión cerrada por negocio: hosting web estático en Hostinger, SIN VPS.** Por lo tanto: **prohibido Next.js SSR o cualquier servidor Node propio.** Todo lo que no sea archivos estáticos del frontend corre en Supabase. Si en algún momento aparece una necesidad de proceso server permanente, se resuelve con una Edge Function de Supabase, no levantando un VPS.

- **Frontend:** **React + Vite + TypeScript + Tailwind CSS**, compilado como **PWA estática**. Diseño **mobile/tablet-first**. Se sirve como archivos estáticos en Hostinger (hosting web o VPS).
- **PWA + Offline-first:** Service Worker + IndexedDB (Dexie.js) con cola de sincronización contra Supabase. El facilitador registra prospectos, solicitudes y pagos **sin conexión** y sincroniza al recuperar señal. Conflictos: last-write-wins con bandera de revisión manual para colisiones en montos/pagos.
- **Base de datos:** **Supabase (PostgreSQL gestionado)**. Esquema multi-tenant por `organization_id`. Migraciones versionadas con **Supabase CLI** (carpeta `supabase/migrations`, SQL puro). Extensiones: **PostGIS** (zonas), **pg_cron** (jobs de mora/cierre).
- **Lógica de negocio crítica = en la base de datos, no en el cliente:** toda operación financiera (desembolso que decrementa saldo del convenio, aplicación de pagos en cascada, recálculo de mora, scoring) se implementa como **funciones Postgres (plpgsql) transaccionales** o **Edge Functions (TypeScript/Deno)** que las invocan. **Nunca** ejecutes cálculos financieros ni decrementos de saldo desde el cliente. Las transacciones de dinero usan bloqueo de fila / `SERIALIZABLE` e idempotencia.
- **Seguridad de datos = Row Level Security (RLS) de Supabase:** políticas por `organization_id` y por **zona del facilitador** (un facilitador solo ve/edita lo de su zona). RLS activa en TODAS las tablas; nada accesible sin política explícita.
- **Auth:** **Supabase Auth** (email/usuario + contraseña, MFA opcional). Roles/permisos (RBAC) en tabla propia + custom claims en el JWT que alimentan las políticas RLS.
- **Almacenamiento de archivos:** **Supabase Storage** (buckets privados) para contratos firmados, fotos de documento de identidad y evidencias de visita, con políticas de acceso por rol.
- **⚠️ Unidad de cuenta indexada (requisito de Venezuela):** Venezuela obliga a expresar los microcréditos en **UVC** (Unidad de Valor de Crédito), no en bolívares nominales. La UVC se recalcula a diario dividiendo el monto en bolívares entre el **IDI (Índice de Inversión)** del BCV. **No modeles el dinero como "un número + código de moneda".** Diseña una capa de **unidad de cuenta** donde un crédito puede estar denominado en una unidad indexada (UVC) y reexpresarse a moneda de pago en cada cuota usando el índice del día (tabla `index_rates` con `pg_cron` para ingesta diaria del IDI). Colombia usa COP nominal. Estructural; impleméntala desde el Hito 1.
- **Mapas/geo:** PostGIS en Supabase + Leaflet/Mapbox en el cliente.
- **Reportería:** generación en **Edge Functions** a PDF/XLSX; archivos a Storage.
- **Jobs programados:** **pg_cron** para el job diario de mora y el cierre mensual; Edge Functions para tareas que requieran lógica/llamadas externas.

---

## 2. ARQUITECTURA Y CONTEXTOS

Organiza el sistema en **bounded contexts**, no en un monolito de tablas sueltas:

1. **Configuración** (back-office): Convenios, Productos, Zonificación, Usuarios/Roles.
2. **Originación** (campo): Prospectos, Clientes, Grupos Solidarios, Solicitudes.
3. **Decisión:** Motor de Scoring + Comité de Aprobación.
4. **Servicing:** Desembolso, Cronograma, Cartera, Pagos, Mora, Seguimiento.
5. **Reportería y Auditoría.**

Cada contexto expone servicios; no se accede a tablas de otro contexto directamente. Comparten `organization_id`, `audit_log` y catálogo de monedas.

---

## 3. ROLES Y PERMISOS (RBAC)

| Rol | Capacidades clave |
| :-- | :-- |
| **Administrador** | Configura todo, gestiona usuarios, ve todos los reportes. |
| **Coordinador zonal** | Define convenios/productos, traza y asigna zonas, supervisa facilitadores. |
| **Facilitador** | Solo opera en SU zona: registra prospectos/clientes, captura solicitudes, registra pagos, agenda visitas. No aprueba créditos. |
| **Comité de crédito** | Revisa y resuelve solicitudes que el scoring marca para revisión manual. |
| **Auditor / Cooperante (solo lectura)** | Acceso de lectura a reportes de su convenio. Sin acceso a PII más allá de lo necesario. |

Regla dura: **un facilitador nunca puede aprobar su propia originación** (segregación de funciones). El scoring puede auto-aprobar dentro de umbrales; fuera de ellos va a comité.

---

## 4. MÓDULOS DE CONFIGURACIÓN (Back-Office)

### A. Convenios y Cooperantes
- **Tabla `agreements`:** `id`, `organization_id`, `cooperant_name`, `total_amount`, `current_balance`, `currency_code`, `start_date`, `end_date`, `status` (active/closed/suspended), reglas de elegibilidad (JSONB: género, sector, zona, monto máx por cliente).
- **Reglas de negocio:**
  - `current_balance` se **decrementa atómicamente** en cada desembolso confirmado (transacción serializable; rechaza desembolso si saldo insuficiente).
  - **Convenios revolventes (CONFIRMADO):** el **capital recaudado reingresa** al saldo disponible del convenio para volver a colocarse. Los **intereses NO reingresan** al fondo del cooperante (configura su destino: utilidad del operador / reserva). Mantén `is_revolving = true` como default, pero deja el flag por si un cooperante futuro exige fondo no revolvente.
  - Un convenio vencido o suspendido bloquea nuevas solicitudes asociadas.
- **Validaciones:** no permitir colocar fuera de las reglas de elegibilidad; alertar al 80% y 95% de uso del fondo.

### B. Productos Crediticios
- **Tabla `loan_products`:** `id`, `agreement_id`, `name`, `interest_rate` (nominal anual), `interest_method` (flat / declining_balance), `grace_period_days`, `min_term`, `max_term`, `min_amount`, `max_amount`, `installment_frequency` (semanal/quincenal/mensual), `late_fee_rule` (JSONB).
- **Regla dura:** la tasa configurada **no puede exceder el tope regulatorio** del país del convenio. Define `regulatory_caps` por país (ver §15) y valida contra ella en cada creación/edición de producto y en cada solicitud. Los topes **cambian periódicamente** (Colombia: certificación de la Superfinanciera; Venezuela: resoluciones del BCV) → modélalos con vigencia (`valid_from`, `valid_to`), no como constante.

### C. Zonificación y Facilitadores
- **Tabla `zones`:** `id`, `name`, `geometry` (PostGIS: point/line/polygon), `country`, `assigned_facilitator_id`.
- **Procesos:** el coordinador dibuja zonas en mapa; el sistema **detecta y bloquea traslapes** entre zonas asignadas. Un cliente registrado fuera de la zona del facilitador genera advertencia.

---

## 5. MÓDULOS DE OPERACIÓN DE CAMPO (Offline-first)

### D. Prospección y Clientes
- **Tabla `prospects` / `clients`:** datos personales (documento de identidad, nombre, fecha de nacimiento, género, estado civil), actividad económica, ubicación GPS, composición familiar, foto del documento.
- **Cumplimiento:** los campos de **documento de identidad y datos personales son PII** → cifrado en reposo, acceso por rol, y registro de quién los consulta. **KYC mínimo:** verificación de identidad + captura de documento antes de poder solicitar crédito.
- **Grupos Solidarios (opcional):** `solidarity_groups` (3–15 socios) con **garantía mancomunada**: si un socio cae en mora, el grupo es corresponsable según la regla configurada.

### E. Solicitud de Crédito
- **Tabla `loan_applications`:** `client_id`, `product_id`, `requested_amount`, `purpose`, `term`, `computed_installment`, `status`.
- **Calculadora de crédito (server-side):** dado producto + monto + plazo, calcula cuota, tabla de amortización preliminar, CAT/costo total y la muestra **antes** de enviar. La fórmula depende de `interest_method`:
  - *Declining balance:* cuota nivelada tipo francés.
  - *Flat:* interés sobre capital inicial.
  - Implementa ambas con tests numéricos verificables.

---

## 6. MOTOR DE DECISIÓN

### F. Motor de Scoring — ⚠️ LECTURA OBLIGATORIA
La estructura original propone **regresión logística (Logit)**. Problema crítico: en el lanzamiento **no tienes datos históricos de impago propios** para entrenar un modelo. Entrenar un Logit con cero historia produce un modelo basura.

**Diseño correcto en dos fases:**
1. **Fase 1 (lanzamiento) — Scorecard de reglas expertas.** Motor de reglas configurable y versionado que asigna puntos por variable:
   - Demográficas: edad, estado civil, dependientes.
   - Actividad: antigüedad del negocio, sector, estacionalidad.
   - Financieras: ingreso neto, ratio cuota/ingreso (DTI), ratio de endeudamiento, liquidez.
   - Historial interno: comportamiento de pago en créditos previos (si existe), antigüedad como cliente.
   - Output: `score` (0–1000), banda de riesgo (A–E) y recomendación `APPROVE` / `REVIEW` / `REJECT` según umbrales configurables por producto.
   - **Reglas de corte duras (knock-out):** menor de edad, fuera de zona, documento inválido, convenio sin saldo → rechazo automático sin puntaje.
2. **Fase 2 (cuando haya ≥ N créditos cerrados, p. ej. 500+) — Modelo estadístico.** Recién entonces entrena el Logit/ML sobre datos reales. Deja la arquitectura preparada: registra todas las variables de cada solicitud para poder entrenar después (feature store mínimo).

**Requisitos transversales del scoring:**
- Versionado del scorecard (qué versión evaluó cada solicitud).
- Explicabilidad: guarda el desglose de puntos por variable (auditoría y reclamos).
- Determinismo: la misma entrada produce el mismo resultado.

### G. Comité de Aprobación
- **Tabla `committee_reviews`:** `application_id`, `score_result`, `score_breakdown`, `facilitator_recommendation` (texto: moral de pago, historial, contexto), `decision` (approve/reject), `decided_by`, `decided_at`, `justification`.
- **Flujo:** solo entran solicitudes marcadas `REVIEW` por el scoring, o las que excedan el monto de auto-aprobación. Decisión registrada con justificación obligatoria. Segregación de funciones aplicada.

---

## 7. POST-APROBACIÓN Y SERVICING

### H. Desembolso e Instrumentación
- **Tabla `disbursements`:** `application_id`, `amount`, `disbursed_at`, `method`, `agreement_id`.
- **Procesos:**
  - Generación de **contrato** desde plantilla (datos del cliente + tabla de amortización) → PDF. Soporte de firma (manuscrita capturada en tablet o e-firma). `// TODO: CONFIRMAR validez legal de firma electrónica por jurisdicción.`
  - Al confirmar desembolso: transacción atómica que (1) descuenta saldo del convenio, (2) crea el cronograma definitivo, (3) escribe `audit_log`. Idempotente: nunca duplicar un desembolso ante reintento de red.
- **Instrumentación en lote:** generación masiva de cronogramas para colocaciones grupales.

### I. Pagos y Cartera
- **Tabla `repayment_schedule`:** `loan_id`, `installment_no`, `due_date`, `principal`, `interest`, `fees`, `status`, `paid_amount`, `paid_at`.
- **Tabla `payments`:** registro de cada pago con **aplicación en cascada (CONFIRMADO):** orden fijo **1) mora → 2) intereses → 3) capital**. Configurable a nivel de producto por si una jurisdicción futura lo exige distinto, pero default = este orden.
- **Mora:** job diario que marca cuotas vencidas y calcula interés moratorio según `late_fee_rule`. **Tope de mora en Venezuela: máx. +3% anual sobre la tasa pactada** (BCV). Soporta **pagos parciales, adelantos y reestructuración**.
- **Provisión por incobrabilidad:** clasifica cartera por días de atraso (al día / 1–30 / 31–60 / 61–90 / 90+) y calcula provisión mediante una **matriz de provisión configurable por país** (ver §15).
  - **Colombia (CONFIRMADO — operador = ONG/Fundación sin ánimo de lucro, no vigilada):** deterioro bajo **NIIF** (modelo de pérdida crediticia esperada; en la práctica, **matriz de provisión por banda de mora con tasas de pérdida**). **No apliques las matrices regulatorias SARC ni los modelos de Supersolidaria** — esos son para entidades vigiladas. Al arrancar no tienes historia de pérdida propia: usa tasas de pérdida iniciales por banda (parametrizables) y refínalas con datos reales conforme madure la cartera (mismo problema de arranque que el scoring — §6).
  - **Venezuela:** según **SUDEBAN** (ver §15).
  - Mantén las tasas por banda como configuración, no hardcodeadas.
- **Cierre mensual:** proceso de conciliación (desembolsado, recaudado, saldo en cartera) **bloqueando el período** una vez cerrado.

### J. Seguimiento y Agenda
- **Agenda del facilitador:** prospectos pendientes + clientes con cuotas vencidas, priorizados, funciona offline.
- **Verificación de destino de fondos:** visita con foto/evidencia geolocalizada para comprobar uso productivo del crédito; resultado registrado.

---

## 8. REPORTES E INDICADORES

Generar (PDF/XLSX, con filtros y exportación):

| Reporte | Campos mínimos | Propósito |
| :-- | :-- | :-- |
| Por Convenio | ID, saldo disponible, monto colocado, % recuperación | Rendición a cooperantes |
| Productividad por Facilitador | prospectos vs. aprobados, tasa de mora de su zona | Evaluar desempeño |
| Morosidad diaria | cliente, días de atraso, monto exigible, convenio | Riesgo inmediato |
| Indicadores de gestión | **PAR (Portfolio at Risk)**, cartera activa, tasa de cobranza, arrears rate | Salud financiera |
| Geográfico | zona/barrio, n.º clientes, monto por país | Potencial y riesgo territorial |
| Cierre mensual | desembolsado, pagado, saldo en cartera | Conciliación contable |

> Nota: usa **PAR (cartera en riesgo)** como KPI principal de calidad de cartera, es el estándar de la industria microfinanciera, más informativo que un simple "arrears rate".

---

## 9. CUMPLIMIENTO Y SEGURIDAD (no negociable)

- **Protección de datos personales:** cifrado en reposo y tránsito; minimización; control de acceso por rol; bitácora de consultas a PII; política de retención.
- **KYC/AML:** verificación de identidad, validación de documento, y check configurable contra listas/umbrales para montos altos. `// TODO: CONFIRMAR requisitos AML por jurisdicción.`
- **Auditoría:** `audit_log` inmutable para toda operación sensible.
- **Segregación de funciones:** originación ≠ aprobación ≠ desembolso.
- **Topes de tasa de interés:** validados contra `regulatory_caps` con vigencia temporal (ver §15).
- **Multi-país / multi-moneda (CONFIRMADO: Colombia + Venezuela; extensible a otros LatAm con el mismo modelo que Colombia):** diseña con `country`, `currency_code` y **unidad de cuenta indexada** por convenio, más reglas regulatorias por país desde el inicio. Colombia = COP nominal; Venezuela = UVC indexada al IDI del BCV. Cualquier país nuevo se modela "como Colombia" salvo que se indique lo contrario. No hardcodees una sola moneda ni un solo marco legal.

---

## 10. REQUISITOS NO FUNCIONALES
- Disponibilidad offline real en campo (ver §1).
- Latencia tolerante a redes 3G/inestables.
- Tests: cobertura obligatoria en cálculos de cuota, mora, saldos de convenio y scoring.
- Trazabilidad: todo crédito reconstruible desde el `audit_log`.
- i18n preparado (es por defecto).

---

## 11. MODELO DE DATOS — ENTIDADES NÚCLEO (resumen)
`organizations`, `users`, `roles`, `agreements`, `loan_products`, `regulatory_caps`, `zones`, `prospects`, `clients`, `solidarity_groups`, `loan_applications`, `score_evaluations`, `committee_reviews`, `loans`, `disbursements`, `repayment_schedule`, `payments`, `visits`, `audit_log`, `report_snapshots`.

Genera el ERD y las migraciones antes de codificar servicios.

---

## 12. LO QUE **NO** DEBES HACER
- No usar `float` para dinero.
- No confiar cálculos financieros al cliente.
- No entrenar un modelo Logit sin datos reales (usa scorecard de reglas en Fase 1).
- No permitir que un facilitador apruebe su propia originación.
- No hardcodear moneda, tasa, ni marco regulatorio.
- No borrar registros financieros (usa soft-delete + audit).
- No generar todo el sistema de golpe: respeta los hitos.

---

## 13. SECUENCIA DE CONSTRUCCIÓN (hitos)
1. **Cimientos:** Vite PWA + Supabase (Postgres + Auth + Storage) + RLS multi-tenant y por zona + RBAC + `audit_log` + pipeline de migraciones (Supabase CLI) + despliegue del esqueleto en Hostinger.
2. **Configuración:** Convenios → Productos → Zonificación (PostGIS).
3. **Originación:** Prospectos/Clientes (con KYC y offline) → Solicitudes + calculadora.
4. **Decisión:** Scorecard de reglas → Comité.
5. **Servicing:** Desembolso (atómico) → Cronograma → Pagos → Mora → Cierre mensual.
6. **Seguimiento:** Agenda offline + verificación de destino.
7. **Reportería + KPIs (PAR).**
8. **Hardening:** seguridad, auditoría, sincronización offline, pruebas de carga.

En cada hito: migración + servicio + API + validación + tests + seed. No avances al siguiente hito sin tests verdes del anterior.

---

## 14. JUSTIFICACIÓN DE DECISIONES (para el equipo, no para el código)
- **Java/GWT/GXT → descartado:** sin soporte vigente, escaso talento, mala experiencia en tablet moderna. Una PWA cubre el requisito "independiente del navegador + tablets" mejor y con ecosistema vivo.
- **Vite SPA en vez de Next.js SSR:** con backend en Supabase y despliegue en Hostinger, un servidor Node de Next.js sobra y no encaja en hosting estático. La SPA estática se sirve trivialmente en Hostinger y toda la lógica server vive en Supabase. (Next.js solo se justifica si se aprueba un VPS de Hostinger — ver §16.)
- **Lógica financiera en Postgres/Edge Functions + RLS:** centralizar el dinero y la seguridad en la base de datos evita que la confianza recaiga en el cliente o en una capa intermedia frágil, y aprovecha lo que ya se paga en Supabase.
- **Logit → diferido a Fase 2:** sin historia de impago no hay modelo entrenable; el scorecard experto da decisiones defendibles desde el día uno y alimenta el dataset para el modelo futuro.
- **Offline-first añadido:** el diseño original menciona tablets rurales pero no resuelve la falta de conectividad; sin esto el producto no opera en campo.
- **Compliance reforzado:** un sistema que mueve dinero y PII necesita KYC/AML, topes de usura, auditoría y segregación de funciones explícitos; la estructura original apenas los rozaba.

---

## 15. ANEXO REGULATORIO POR PAÍS (parámetros de configuración, vigentes a junio 2026)

> Carga estos valores en la tabla `regulatory_caps` y catálogos asociados. **Todos tienen vigencia temporal y cambian**; modélalos con `valid_from`/`valid_to` y prevé un proceso de actualización (los topes colombianos se certifican periódicamente; los venezolanos por resolución del BCV).

### Colombia  — Operador: ONG / Fundación sin ánimo de lucro, NO vigilada por Superfinanciera (CONFIRMADO)
- **Moneda:** COP nominal (sin indexación).
- **Tope de tasa (usura):** aunque el operador **no es vigilado**, el **límite de usura aplica igual a cualquier prestamista** en Colombia (excederlo configura el **delito de usura**, Código Penal art. 305). El tope = **1,5 × IBC** de la modalidad de **microcrédito** que certifica la Superfinanciera (usa la modalidad microcrédito, no consumo). Referencias de magnitud (junio 2026): usura consumo/ordinario 28,79% E.A.; consumo de bajo monto ~65% E.A. `// CARGAR el IBC y usura de MICROCRÉDITO vigente desde Superfinanciera.`
- **Provisión de cartera (CONFIRMADO):** deterioro bajo **NIIF** (pérdida crediticia esperada → matriz de provisión por banda de mora con tasas de pérdida parametrizables). **NO** apliques SARC ni los modelos de Supersolidaria (son para entidades vigiladas). Define con tu contador qué marco NIIF aplica a la entidad (NIIF plenas vs. **NIIF para PYMES, Sección 11** — lo más probable para una fundación). `// CONFIRMAR con contabilidad: NIIF plenas o NIIF para PYMES + tasas de pérdida iniciales por banda.`
- **AML/UIAF:** al no ser vigilada por Superfinanciera no aplica SARLAFT, **pero** una entidad que coloca crédito puede tener obligaciones de reporte ante la **UIAF** y/o régimen **SAGRILAFT** (Supersociedades) según umbrales. `// CONFIRMAR obligaciones UIAF/SAGRILAFT aplicables a la fundación.`

### Venezuela
- **Moneda / unidad:** microcréditos **expresados en UVC**; UVC = bolívares ÷ **IDI** (Índice de Inversión, publicado a diario por el BCV). Integra/actualiza el IDI diariamente.
- **Tasa de interés (BCV, Gaceta Oficial Nº 43.298, 19-ene-2026):** microcréditos en moneda nacional entre **13% y 16% anual** sobre el saldo en UVC.
- **Comisión por servicio:** máx. **0,80% anual** adicional.
- **Mora:** recargo máx. **+3%** sobre la tasa pactada.
- **Provisión de cartera:** normativa de la **SUDEBAN** (clasificación y apartado por riesgo de la cartera microfinanciera). `// CONFIRMAR resolución SUDEBAN vigente y matriz de provisión.`

### Otros países LatAm
- Se modelan **igual que Colombia** (COP→moneda local nominal, usura por modalidad, provisión según naturaleza del operador) hasta que se indique una regla local distinta.

---

## 16. DESPLIEGUE E INFRAESTRUCTURA (Supabase + Hostinger)

- **Supabase (backend):** un proyecto por entorno (`dev`, `staging`, `prod`). Esquema y políticas RLS gestionados con **Supabase CLI** y migraciones en repositorio (nada de cambios a mano en producción). Activa **connection pooling (Supavisor)** para acceso desde Edge Functions. Plan **Pro o superior** en producción (un sistema de crédito real no corre en free tier). Backups automáticos + PITR activados.
- **Hostinger (frontend):** publica el build estático de la PWA (Vite `dist/`) en **hosting web** de Hostinger (estático + dominio + SSL). **Decisión cerrada: SIN VPS.** Cualquier necesidad de proceso server se resuelve con Edge Functions de Supabase, no con un VPS. Configura dominio, HTTPS y cabeceras de seguridad. Incluye fallback de routing SPA (todas las rutas → `index.html`).
- **Separación de secretos:** las claves de servicio de Supabase **nunca** van al bundle del frontend. El cliente usa solo la `anon key` con RLS; las operaciones privilegiadas (jobs, generación de contratos) corren en Edge Functions con la `service_role key` guardada en el entorno de Supabase, no en Hostinger.
- **CI/CD:** pipeline que (1) aplica migraciones a Supabase y (2) compila y publica la PWA a Hostinger (vía Git deploy o subida por API de Hostinger). Tests verdes como gate.
- **⚠️ Residencia de datos:** Supabase aloja en regiones de nube (p. ej. AWS). Verifica si Colombia o Venezuela exigen **localización de datos personales/financieros**; elige la región más cercana/conforme (p. ej. `sa-east-1`) y documenta la decisión. `// CONFIRMAR requisitos de residencia de datos por país.`
- **Continuidad offline:** el frontend en Hostinger debe seguir operando sin red (Service Worker cacheando la app); la sincronización reintenta contra Supabase. Si Supabase está caído, la captura en campo no se pierde (cola local).

---

### Próximos pasos
1. ~~Naturaleza jurídica del operador~~ → **CERRADO para Colombia: ONG/Fundación sin ánimo de lucro, no vigilada → provisión NIIF.** **Pendiente confirmar la figura del operador en Venezuela** (allí la cartera microfinanciera la rige SUDEBAN independientemente, pero la forma legal define obligaciones adicionales).
2. **Confirmar con contabilidad** el marco NIIF de la fundación (plenas vs. NIIF para PYMES Sec. 11) y las **tasas de pérdida iniciales por banda de mora**.
3. **Confirmar obligaciones AML** ante UIAF/SAGRILAFT para la fundación colombiana.
4. Cargar el **IBC/usura de microcrédito vigente de Colombia** y el **IDI + resolución SUDEBAN de Venezuela** en `regulatory_caps`.
5. Validar la abstracción de **unidad de cuenta indexada (UVC)** con un caso real venezolano antes del Hito 5 (servicing).
6. ~~Plan de Hostinger~~ → **CERRADO: hosting web estático, sin VPS.**
7. Confirmar **plan de Supabase** (Pro+ en producción) y **región de datos** acorde a residencia legal (§16).
8. Aprobar el stack (§1) antes de iniciar el Hito 1.
