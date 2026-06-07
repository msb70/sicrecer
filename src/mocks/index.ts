import type {
  Organizacion, Usuario, Convenio, ProductoCredito,
  Prospecto, Cliente, Solicitud, Credito
} from '../types'

// ─── ORGANIZACIONES ───────────────────────────────────────────
export const ORGANIZACIONES: Organizacion[] = [
  { id: 'org-co-01', nombre: 'Fundación Crecer Colombia', pais: 'CO' },
  { id: 'org-ve-01', nombre: 'MicroFinanzas Venezuela', pais: 'VE' },
]

// ─── USUARIOS MOCK ────────────────────────────────────────────
export const USUARIOS: Usuario[] = [
  {
    id: 'u-01', nombre: 'Ana Torres', email: 'ana@crecer.co',
    rol: 'administrador', organizacion_id: 'org-co-01',
  },
  {
    id: 'u-02', nombre: 'Carlos Mendez', email: 'carlos@crecer.co',
    rol: 'coordinador', zona: 'Zona Norte', organizacion_id: 'org-co-01',
  },
  {
    id: 'u-03', nombre: 'Luisa Ramírez', email: 'luisa@crecer.co',
    rol: 'facilitador', zona: 'Zona Norte', organizacion_id: 'org-co-01',
  },
  {
    id: 'u-04', nombre: 'Pedro Gómez', email: 'pedro@crecer.co',
    rol: 'comite', organizacion_id: 'org-co-01',
  },
  {
    id: 'u-05', nombre: 'Mario Rojas', email: 'mario@crecer.co',
    rol: 'auditor', organizacion_id: 'org-co-01',
  },
]

// ─── CONVENIOS ────────────────────────────────────────────────
export const CONVENIOS: Convenio[] = [
  {
    id: 'conv-01', cooperante: 'Banco Mundial',
    monto_total: 200_000_000, saldo_disponible: 142_500_000,
    moneda: 'COP', fecha_inicio: '2025-01-01', fecha_fin: '2026-12-31',
    estado: 'activo', pais: 'CO', organizacion_id: 'org-co-01',
  },
  {
    id: 'conv-02', cooperante: 'USAID Colombia',
    monto_total: 80_000_000, saldo_disponible: 71_200_000,
    moneda: 'COP', fecha_inicio: '2025-03-01', fecha_fin: '2026-06-30',
    estado: 'activo', pais: 'CO', organizacion_id: 'org-co-01',
  },
  {
    id: 'conv-03', cooperante: 'CAF Venezuela',
    monto_total: 500_000, saldo_disponible: 48_000,
    moneda: 'UVC', fecha_inicio: '2025-06-01', fecha_fin: '2026-05-31',
    estado: 'activo', pais: 'VE', organizacion_id: 'org-ve-01',
  },
  {
    id: 'conv-04', cooperante: 'PNUD',
    monto_total: 50_000_000, saldo_disponible: 0,
    moneda: 'COP', fecha_inicio: '2024-01-01', fecha_fin: '2025-01-01',
    estado: 'cerrado', pais: 'CO', organizacion_id: 'org-co-01',
  },
]

// ─── PRODUCTOS ────────────────────────────────────────────────
export const PRODUCTOS: ProductoCredito[] = [
  {
    id: 'prod-01', convenio_id: 'conv-01', nombre: 'Microcrédito Rural Básico',
    tasa_nominal_anual: 18, metodo_interes: 'declining_balance',
    periodo_gracia_dias: 0, plazo_min: 3, plazo_max: 12,
    monto_min: 500_000, monto_max: 5_000_000, frecuencia: 'mensual',
  },
  {
    id: 'prod-02', convenio_id: 'conv-01', nombre: 'Crédito Grupal Solidario',
    tasa_nominal_anual: 15, metodo_interes: 'flat',
    periodo_gracia_dias: 7, plazo_min: 4, plazo_max: 8,
    monto_min: 300_000, monto_max: 2_000_000, frecuencia: 'quincenal',
  },
  {
    id: 'prod-03', convenio_id: 'conv-02', nombre: 'Capital Semilla Urbano',
    tasa_nominal_anual: 20, metodo_interes: 'declining_balance',
    periodo_gracia_dias: 15, plazo_min: 6, plazo_max: 24,
    monto_min: 1_000_000, monto_max: 10_000_000, frecuencia: 'mensual',
  },
]

// ─── PROSPECTOS ───────────────────────────────────────────────
export const PROSPECTOS: Prospecto[] = [
  {
    id: 'pros-01', nombre: 'María García', documento: '1098765432',
    telefono: '3001234567', zona: 'Zona Norte', facilitador_id: 'u-03',
    estado: 'nuevo', fecha_registro: '2026-06-01',
  },
  {
    id: 'pros-02', nombre: 'José Herrera', documento: '1055432198',
    telefono: '3109876543', zona: 'Zona Norte', facilitador_id: 'u-03',
    estado: 'contactado', fecha_registro: '2026-05-28',
  },
  {
    id: 'pros-03', nombre: 'Sandra López', documento: '1023456789',
    telefono: '3157654321', zona: 'Zona Norte', facilitador_id: 'u-03',
    estado: 'convertido', fecha_registro: '2026-05-20',
  },
]

// ─── CLIENTES ─────────────────────────────────────────────────
export const CLIENTES: Cliente[] = [
  {
    id: 'cli-01', nombre: 'Rosa Martínez', documento: '1045678901',
    fecha_nacimiento: '1985-04-12', genero: 'F',
    actividad_economica: 'Venta de abarrotes', zona: 'Zona Norte',
    telefono: '3204567890', estado: 'activo',
    creditos_activos: 1, total_prestado: 2_500_000, facilitador_id: 'u-03',
  },
  {
    id: 'cli-02', nombre: 'Tomás Vargas', documento: '1034567890',
    fecha_nacimiento: '1978-08-22', genero: 'M',
    actividad_economica: 'Taller de carpintería', zona: 'Zona Norte',
    telefono: '3012345678', estado: 'al_dia',
    creditos_activos: 1, total_prestado: 4_000_000, facilitador_id: 'u-03',
  },
  {
    id: 'cli-03', nombre: 'Carmen Ruiz', documento: '1067890123',
    fecha_nacimiento: '1990-11-05', genero: 'F',
    actividad_economica: 'Confección de ropa', zona: 'Zona Norte',
    telefono: '3145678901', estado: 'moroso',
    creditos_activos: 1, total_prestado: 1_500_000, facilitador_id: 'u-03',
  },
  {
    id: 'cli-04', nombre: 'Alberto Núñez', documento: '1089012345',
    fecha_nacimiento: '1982-02-18', genero: 'M',
    actividad_economica: 'Venta de frutas y verduras', zona: 'Zona Norte',
    telefono: '3178901234', estado: 'activo',
    creditos_activos: 0, total_prestado: 3_000_000, facilitador_id: 'u-03',
  },
]

// ─── SOLICITUDES ──────────────────────────────────────────────
export const SOLICITUDES: Solicitud[] = [
  {
    id: 'sol-01', cliente_id: 'cli-01', cliente_nombre: 'Rosa Martínez',
    producto_id: 'prod-01', producto_nombre: 'Microcrédito Rural Básico',
    monto_solicitado: 2_500_000, plazo: 12,
    estado: 'aprobada', score: 720, banda_riesgo: 'B',
    fecha_solicitud: '2026-05-15', facilitador_id: 'u-03',
  },
  {
    id: 'sol-02', cliente_id: 'cli-02', cliente_nombre: 'Tomás Vargas',
    producto_id: 'prod-03', producto_nombre: 'Capital Semilla Urbano',
    monto_solicitado: 4_000_000, plazo: 18,
    estado: 'revision_comite', score: 610, banda_riesgo: 'C',
    fecha_solicitud: '2026-06-01', facilitador_id: 'u-03',
  },
  {
    id: 'sol-03', cliente_id: 'cli-03', cliente_nombre: 'Carmen Ruiz',
    producto_id: 'prod-02', producto_nombre: 'Crédito Grupal Solidario',
    monto_solicitado: 1_500_000, plazo: 8,
    estado: 'rechazada', score: 420, banda_riesgo: 'E',
    fecha_solicitud: '2026-04-10', facilitador_id: 'u-03',
  },
  {
    id: 'sol-04', cliente_id: 'cli-04', cliente_nombre: 'Alberto Núñez',
    producto_id: 'prod-01', producto_nombre: 'Microcrédito Rural Básico',
    monto_solicitado: 3_000_000, plazo: 12,
    estado: 'enviada', fecha_solicitud: '2026-06-05', facilitador_id: 'u-03',
  },
]

// ─── CRÉDITOS ACTIVOS ─────────────────────────────────────────
export const CREDITOS: Credito[] = [
  {
    id: 'cred-01', cliente_id: 'cli-01', cliente_nombre: 'Rosa Martínez',
    producto_nombre: 'Microcrédito Rural Básico',
    monto_desembolsado: 2_500_000, saldo_capital: 1_875_000,
    cuotas_total: 12, cuotas_pagadas: 3,
    proxima_cuota: '2026-06-15', dias_mora: 0, estado: 'al_dia',
  },
  {
    id: 'cred-02', cliente_id: 'cli-02', cliente_nombre: 'Tomás Vargas',
    producto_nombre: 'Capital Semilla Urbano',
    monto_desembolsado: 4_000_000, saldo_capital: 3_200_000,
    cuotas_total: 18, cuotas_pagadas: 4,
    proxima_cuota: '2026-06-20', dias_mora: 0, estado: 'activo',
  },
  {
    id: 'cred-03', cliente_id: 'cli-03', cliente_nombre: 'Carmen Ruiz',
    producto_nombre: 'Crédito Grupal Solidario',
    monto_desembolsado: 1_500_000, saldo_capital: 900_000,
    cuotas_total: 8, cuotas_pagadas: 2,
    proxima_cuota: '2026-05-20', dias_mora: 17, estado: 'en_mora',
  },
]

// ─── HELPERS ──────────────────────────────────────────────────
export const formatCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export const formatUVC = (n: number) =>
  `${new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(n)} UVC`
