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
  logo?: string
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
export interface Requisito {
  id: string
  nombre: string
  descripcion: string
  obligatorio: boolean
}

// ─── ACTIVIDAD ECONÓMICA ──────────────────────────────────────
export interface ActividadEconomica {
  id: string
  nombre: string
  descripcion: string
  sector: string
}

// ─── PRODUCTO ─────────────────────────────────────────────────
export interface ProductoCredito {
  id: string
  convenio_id: string
  nombre: string
  descripcion?: string
  tasa_nominal_anual: number
  metodo_interes: 'flat' | 'declining_balance'
  periodo_gracia_dias: number
  plazo_min: number
  plazo_max: number
  monto_min: number
  monto_max: number
  frecuencia: 'semanal' | 'quincenal' | 'mensual'
  requisito_ids?: string[]
  actividad_economica_ids?: string[]
}

// ─── CLIENTE / PROSPECTO ──────────────────────────────────────
export type EstadoProspecto = 'nuevo' | 'contactado' | 'convertido' | 'descartado'
export type EstadoCliente = 'activo' | 'inactivo' | 'moroso' | 'al_dia'

export interface Prospecto {
  id: string
  nombre: string
  documento: string
  telefono: string
  zona: string
  facilitador_id: string
  estado: EstadoProspecto
  fecha_registro: string
}

export interface Cliente {
  id: string
  nombre: string
  documento: string
  fecha_nacimiento: string
  genero: 'M' | 'F'
  actividad_economica: string
  zona: string
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
  facilitador_id: string
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
  monto_desembolsado: number
  saldo_capital: number
  cuotas_total: number
  cuotas_pagadas: number
  proxima_cuota: string
  dias_mora: number
  estado: EstadoCredito
}
