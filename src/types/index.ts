// ─── ROLES ───────────────────────────────────────────────────
export type Rol =
  | 'administrador'
  | 'coordinador'
  | 'facilitador'
  | 'comite'
  | 'auditor'

export const ROL_LABELS: Record<Rol, string> = {
  administrador: 'Administrador',
  coordinador: 'Coordinador Zonal',
  facilitador: 'Facilitador',
  comite: 'Comité de Crédito',
  auditor: 'Auditor / Cooperante',
}

// ─── ORGANIZACION ─────────────────────────────────────────────
export interface Organizacion {
  id: string
  nombre: string
  pais: 'CO' | 'VE'
  logo?: string | null
  configuracion?: ConfiguracionOrganizacion
}

export interface ConfiguracionOrganizacion {
  general?: { nit?: string; email?: string; telefono?: string; direccion?: string }
  notificaciones?: Record<string, boolean | number>
  regional?: Record<string, string>
}

// ─── USUARIO ──────────────────────────────────────────────────
export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
  zona?: string
  organizacion_id: string
  primer_acceso?: boolean
}

// ─── CONVENIO ─────────────────────────────────────────────────
export type EstadoConvenio = 'activo' | 'cerrado' | 'suspendido'

export interface Convenio {
  id: string
  cooperante: string
  monto_total: number
  saldo_disponible: number
  moneda: 'COP' | 'UVC'
  fecha_inicio: string
  fecha_fin: string
  estado: EstadoConvenio
  pais: 'CO' | 'VE'
  organizacion_id: string
}

// ─── REQUISITO ────────────────────────────────────────────────
export type TipoRequisito = 'archivo' | 'documento_identidad' | 'selfie'
export interface Requisito {
  id: string
  nombre: string
  descripcion: string
  obligatorio: boolean
  /** archivo = el solicitante adjunta un documento; documento_identidad/selfie = lo cubre el perfil */
  tipo?: TipoRequisito
}

// ─── ACTIVIDAD ECONÓMICA ──────────────────────────────────────
export interface ActividadEconomica {
  id: string
  nombre: string
  descripcion: string
  sector: string
}

// ─── BANCO ────────────────────────────────────────────────────
export interface Banco {
  id: string
  nombre: string
  activo: boolean
}

// ─── ACTIVIDAD CRM ────────────────────────────────────────────
export type TipoActividadCRM = 'llamada' | 'visita' | 'whatsapp' | 'nota'

export interface ActividadCRM {
  id: string
  prospecto_id: string
  tipo: TipoActividadCRM
  fecha: string
  descripcion: string
  resultado?: string
  facilitador_id: string
}

// ─── PRODUCTO ─────────────────────────────────────────────────
export interface ProductoCredito {
  id: string
  convenio_id: string
  nombre: string
  descripcion?: string
  tasa_nominal_anual: number
  metodo_interes: 'flat' | 'declining_balance'
  /** OBSOLETO (0006): la primera cuota vence un período después del desembolso */
  periodo_gracia_dias: number
  plazo_min: number
  plazo_max: number
  monto_min: number
  monto_max: number
  frecuencia: 'semanal' | 'quincenal' | 'mensual'
  requisito_ids?: string[]
  actividad_economica_ids?: string[]
  // Reglas de crédito (migración 0006)
  pct_servicios?: number             // % servicios de desarrollo empresarial (descontado al desembolsar)
  pct_mora_periodo?: number          // % mora por período, sobre capital vencido
  pct_gastos_admin_periodo?: number  // % gastos administrativos por período, sobre capital vencido
  dias_gracia_mora?: number          // días tras el vencimiento antes de cobrar mora y gastos
  plazos_permitidos?: number[]       // obsoleto (0008): solo aporta su mayor valor como máximo
  cobertura?: string[]               // ciudades / 'Bogotá|Localidad' / '*otras'; vacío = cualquier lugar
  paises?: Pais[]            // países donde se ofrece (uno o más)
  publico?: boolean          // visible en el portal de solicitantes
  activo?: boolean
}

export type Pais = 'CO' | 'VE'
export const PAIS_LABELS: Record<Pais, string> = { CO: 'Colombia', VE: 'Venezuela' }

// ─── CLIENTE / PROSPECTO ──────────────────────────────────────
export type EstadoProspecto = 'nuevo' | 'contactado' | 'convertido' | 'descartado'
export type EstadoCliente = 'activo' | 'inactivo' | 'moroso' | 'al_dia'

export interface Prospecto {
  id: string
  nombre: string
  documento: string
  telefono: string
  email?: string
  sexo?: 'M' | 'F' | 'otro'
  zona: string
  pais?: string | null
  ciudad?: string | null
  localidad?: string | null
  direccion?: string | null
  facilitador_id: string
  estado: EstadoProspecto
  fecha_registro: string
  canal_preferido?: 'whatsapp' | 'llamada' | 'email' | 'visita'
  canal_captacion?: 'referido' | 'redes_sociales' | 'evento' | 'visita_facilitador' | 'otro'
  lat?: number | null
  lng?: number | null
}

export interface Cliente {
  id: string
  nombre: string
  documento: string
  fecha_nacimiento: string
  genero: 'M' | 'F'
  actividad_economica: string
  zona: string
  pais?: string | null
  ciudad?: string | null
  localidad?: string | null
  direccion?: string | null
  telefono: string
  estado: EstadoCliente
  creditos_activos: number
  total_prestado: number
  facilitador_id: string
}

// ─── SOLICITUD ────────────────────────────────────────────────
export type EstadoSolicitud =
  | 'borrador'
  | 'enviada'
  | 'scoring'
  | 'revision_comite'
  | 'aprobada'
  | 'rechazada'
  | 'firma'
  | 'desembolsada'

export interface Solicitud {
  id: string
  cliente_id: string
  cliente_nombre: string
  producto_id: string
  producto_nombre: string
  monto_solicitado: number
  plazo: number
  estado: EstadoSolicitud
  score?: number
  banda_riesgo?: 'A' | 'B' | 'C' | 'D' | 'E'
  fecha_solicitud: string
  facilitador_id: string | null
  // Flujo externo (portal) y decisión del comité
  solicitante_id?: string | null
  origen?: 'interno' | 'externo'
  pais?: string | null
  proposito?: string | null
  requisitos_confirmados?: string[]
  comite_id?: string | null
  motivo_rechazo?: string | null
  monto_aprobado?: number | null
  plazo_aprobado?: number | null
  fecha_decision?: string | null
  decidido_por?: string | null
  enviada_comite_en?: string | null
  enviada_comite_por?: string | null
}

// ─── SOLICITANTE (usuario externo del portal) ─────────────────
export interface Solicitante {
  id: string
  email: string
  nombre: string
  tipo_documento: string
  documento: string
  fecha_nacimiento?: string | null
  genero?: 'M' | 'F' | 'otro' | null
  telefono?: string | null
  pais: Pais
  ciudad?: string | null
  localidad?: string | null
  direccion?: string | null
  actividad_economica_id?: string | null
  estado: 'registrado' | 'cliente'
  cliente_id?: string | null
  creado_en?: string
}

export type TipoDocumentoFoto = 'documento' | 'selfie'

// ─── COMITÉ ───────────────────────────────────────────────────
export interface Comite {
  id: string
  nombre: string
  producto_id: string
  organizacion_id: string
  activo: boolean
}

export interface ComiteMiembro {
  comite_id: string
  usuario_id: string
}

export interface ComiteVoto {
  id: number
  solicitud_id: string
  comite_id: string
  usuario_id: string
  decision: 'aprobado' | 'rechazado'
  comentario?: string | null
  monto_propuesto?: number | null
  plazo_propuesto?: number | null
  fecha: string
}

// ─── COBRANZA ─────────────────────────────────────────────────
export interface Cobranza {
  id: string
  cliente_id: string
  cliente_nombre: string
  credito_id: string
  fecha: string
  banco: string
  numero_deposito: string
  monto: number
  cuotas_aplicadas: number[]   // índices (1-based) de cuotas que cubre
  creado_por: string           // facilitador_id
}

// ─── CREDITO ──────────────────────────────────────────────────
export type EstadoCredito = 'activo' | 'al_dia' | 'en_mora' | 'cancelado' | 'castigado'

export interface Credito {
  id: string
  cliente_id: string
  cliente_nombre: string
  producto_nombre: string
  convenio_id?: string
  fecha_desembolso?: string
  /** Monto del crédito: capital adeudado (incluye servicios) */
  monto_desembolsado: number
  saldo_capital: number
  cuotas_total: number
  cuotas_pagadas: number
  proxima_cuota: string
  dias_mora: number
  estado: EstadoCredito
  // Condiciones congeladas al desembolso (0006)
  producto_id?: string | null
  solicitud_id?: string | null
  tasa_nominal_anual?: number | null
  metodo_interes?: 'flat' | 'declining_balance' | null
  frecuencia?: 'semanal' | 'quincenal' | 'mensual' | null
  pct_servicios?: number
  monto_servicios?: number
  monto_entregado?: number | null
  pct_mora_periodo?: number
  pct_gastos_admin_periodo?: number
  dias_gracia_mora?: number
  cuota_actual?: number | null
}

// ─── ESTADO DE CUENTA (rpc estado_cuenta) ─────────────────────
export interface CuotaCronograma {
  id: number
  credito_id: string
  num: number
  fecha_vencimiento: string
  cuota: number
  capital: number
  interes: number
  saldo_posterior: number
  monto_pagado: number
  interes_pagado: number
  capital_pagado: number
  estado: 'pendiente' | 'parcial' | 'pagada' | 'vencida'
  pagada_en: string | null
}

export interface CargoAtraso {
  id: number
  credito_id: string
  cuota_num: number
  tipo: 'gastos_admin' | 'mora'
  periodo: number
  fecha: string
  base_capital: number
  porcentaje: number
  monto: number
  monto_pagado: number
  estado: 'pendiente' | 'pagado'
}

export interface PagoRegistro {
  id: string
  credito_id: string
  cuota_num: number
  fecha: string
  monto_capital: number
  monto_interes: number
  monto_gastos: number
  monto_mora: number
  monto_total: number
  metodo: 'efectivo' | 'transferencia' | 'pse'
  referencia: string | null
  registrado_por: string | null
  tipo: 'cuota' | 'cargos' | 'anticipo'
  cobranza_id: string | null
}

export interface ResumenCuenta {
  fecha: string
  gastos_pendientes: number
  mora_pendiente: number
  interes_vencido: number
  capital_vencido: number
  cuota_corriente_num: number | null
  cuota_corriente_pendiente: number
  capital_posterior: number
  total_para_ponerse_al_dia: number
  total_para_cancelar: number
}

export interface EstadoCuenta {
  credito: Credito
  cuotas: CuotaCronograma[]
  cargos: CargoAtraso[]
  pagos: PagoRegistro[]
  resumen: ResumenCuenta
}

/** Resultado de aplicar_pago / simular_pago */
export interface ResultadoPagoServidor {
  cobranza_id?: string
  duplicado?: boolean
  monto_recibido: number
  gastos_admin: number
  mora: number
  interes: number
  capital: number
  anticipo: number
  excedente: number
  cuotas_completadas: number[]
  cuota_nueva: number | null
  saldo_capital: number
  estado_credito: EstadoCredito
}
