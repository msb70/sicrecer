import { useEffect, useState } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, useLocation } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { Spinner } from '../components/ui'
import { useApp } from '../context/AppContext'
import { puedeAccederCon } from '../lib/permisos'

// Legal (públicas)
import { Terminos, PoliticaDatos } from '../pages/legal/DocumentoLegal'
import { RUTA_TERMINOS, RUTA_POLITICA_DATOS } from '../lib/legal'

// Auth
import Login             from '../pages/auth/Login'
import SeleccionOrg      from '../pages/auth/SeleccionOrg'
import CambiarContrasena from '../pages/auth/CambiarContrasena'

// App
import Dashboard         from '../pages/dashboard/Dashboard'
import Placeholder       from '../pages/Placeholder'

// Sprint 4 — Comité
import ListaComite       from '../pages/comite/ListaComite'
import DetalleComite     from '../pages/comite/DetalleComite'

// Sprint 5-7 — Cartera, Agenda, Reportes
import ListaCartera      from '../pages/cartera/ListaCartera'
import DetalleCredito    from '../pages/cartera/DetalleCredito'
import AgendaFacilitador from '../pages/agenda/AgendaFacilitador'
import Reportes          from '../pages/reportes/Reportes'

// Sprint 8 — Asistente IA y Configuración
import Configuracion     from '../pages/configuracion/Configuracion'

// Calculadora
import Calculadora       from '../pages/calculadora/Calculadora'

// Nuevos módulos
import ListaRequisitos           from '../pages/requisitos/ListaRequisitos'
import ListaActividadesEconomicas from '../pages/actividades/ListaActividadesEconomicas'
import ListaCobranzas            from '../pages/cobranza/ListaCobranzas'
import FormCobranza              from '../pages/cobranza/FormCobranza'
import ListaBancos               from '../pages/bancos/ListaBancos'
import CierreMensual             from '../pages/cierre/CierreMensual'

// Sprint 2 — Back-office
import ListaConvenios    from '../pages/convenios/ListaConvenios'
import DetalleConvenio   from '../pages/convenios/DetalleConvenio'
import FormConvenio      from '../pages/convenios/FormConvenio'
import ListaProductos    from '../pages/productos/ListaProductos'
import FormProducto      from '../pages/productos/FormProducto'
import DetalleProducto from '../pages/productos/DetalleProducto'
import Zonificacion      from '../pages/zonas/Zonificacion'
import ListaUsuarios     from '../pages/usuarios/ListaUsuarios'
import FormUsuario       from '../pages/usuarios/FormUsuario'

// Sprint 3 — Originación
import ListaProspectos   from '../pages/prospectos/ListaProspectos'
import FormProspecto     from '../pages/prospectos/FormProspecto'
import DetalleProspecto  from '../pages/prospectos/DetalleProspecto'
import ListaClientes     from '../pages/clientes/ListaClientes'
import DetalleCliente    from '../pages/clientes/DetalleCliente'
import GruposSolidarios  from '../pages/clientes/GruposSolidarios'
import ConvertirProspecto from '../pages/clientes/ConvertirProspecto'
import ListaSolicitudes  from '../pages/solicitudes/ListaSolicitudes'
import NuevaSolicitud    from '../pages/solicitudes/NuevaSolicitud'
import DetalleSolicitud  from '../pages/solicitudes/DetalleSolicitud'

// Comités (configuración)
import ListaComites      from '../pages/comites/ListaComites'
import FormComite        from '../pages/comites/FormComite'

// Roles y permisos
import ListaRoles        from '../pages/roles/ListaRoles'
import FormRol           from '../pages/roles/FormRol'

// Portal de solicitantes
import Registro                from '../pages/portal/Registro'
import Verificar               from '../pages/portal/Verificar'
import Perfil                  from '../pages/portal/Perfil'
import MisSolicitudes          from '../pages/portal/MisSolicitudes'
import NuevaSolicitudPortal    from '../pages/portal/NuevaSolicitudPortal'
import DetalleSolicitudPortal  from '../pages/portal/DetalleSolicitudPortal'

/**
 * Pantalla mientras se restaura la sesión y se cargan los datos (puede tardar
 * unos segundos). Antes era un texto gris diminuto que parecía una página en
 * blanco; si la carga se alarga, ofrece reintentar o ir al login.
 */
function Cargando() {
  const [lento, setLento] = useState(false)
  useEffect(() => { const t = setTimeout(() => setLento(true), 12000); return () => clearTimeout(t) }, [])
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-gray-50 px-4 text-center">
      <BrandLogo framed imageClassName="w-40" />
      <Spinner size="lg" />
      <div>
        <p className="text-base font-medium text-gray-800">Cargando tu información…</p>
        <p className="text-sm text-gray-500 mt-1">Estamos trayendo tu cartera, solicitudes y créditos.</p>
      </div>
      {lento && (
        <div className="max-w-sm text-sm text-gray-600 space-y-3">
          <p>Está tardando más de lo normal. Revisa tu conexión o vuelve a intentarlo.</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700">Reintentar</button>
            <a href="/login" className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-white">Ir al inicio de sesión</a>
          </div>
        </div>
      )}
    </div>
  )
}

/** Rol sin permiso ni al dashboard (p. ej. rol desactivado mal configurado). */
function SinAcceso() {
  const { logout } = useApp()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
      <BrandLogo framed imageClassName="w-40" />
      <p className="text-base font-medium text-gray-800">Tu rol no tiene pantallas habilitadas.</p>
      <p className="text-sm text-gray-500">Pide al administrador que revise tus permisos en Configuración → Roles.</p>
      <button onClick={logout} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-white">Cerrar sesión</button>
    </div>
  )
}

/** Raíz: decide a dónde va cada tipo de sesión. */
function Inicio() {
  const { autenticado, cargandoSesion, tipoSesion } = useApp()
  if (cargandoSesion) return <Cargando />
  if (!autenticado) return <Navigate to="/login" replace />
  return <Navigate to={tipoSesion === 'solicitante' ? '/portal' : '/dashboard'} replace />
}

/** Rutas del portal: solo solicitantes. El personal interno va al dashboard. */
function PortalRoute({ children }: { children: React.ReactNode }) {
  const { autenticado, cargandoSesion, tipoSesion } = useApp()
  if (cargandoSesion) return <Cargando />
  if (!autenticado) return <Navigate to="/login" replace />
  if (tipoSesion === 'interno') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { autenticado, cargandoSesion, permisos, tipoSesion } = useApp()
  const { pathname } = useLocation()

  // Mientras se restaura la sesión (p. ej. tras el redirect de Google),
  // no redirigir a /login todavía.
  if (cargandoSesion) return <Cargando />

  if (!autenticado) return <Navigate to="/login" replace />
  if (tipoSesion === 'solicitante') return <Navigate to="/portal" replace />

  // Guarda por permisos del rol (ver / editar según la ruta): si no está
  // permitida, volver al dashboard. (La barrera real de datos es RLS en la BD.)
  if (!puedeAccederCon(permisos, pathname)) {
    return pathname === '/dashboard' ? <SinAcceso /> : <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

const router = createBrowserRouter([
  { path: '/',                   element: <Inicio /> },
  { path: '/login',              element: <Login /> },
  { path: '/registro',           element: <Registro /> },
  { path: '/verificar',          element: <Verificar /> },
  { path: RUTA_TERMINOS,         element: <Terminos /> },
  { path: RUTA_POLITICA_DATOS,   element: <PoliticaDatos /> },

  // Portal de solicitantes
  { path: '/portal',                 element: <PortalRoute><MisSolicitudes /></PortalRoute> },
  { path: '/portal/perfil',          element: <PortalRoute><Perfil /></PortalRoute> },
  { path: '/portal/nueva',           element: <PortalRoute><NuevaSolicitudPortal /></PortalRoute> },
  { path: '/portal/solicitudes/:id', element: <PortalRoute><DetalleSolicitudPortal /></PortalRoute> },
  { path: '/seleccionar-org',    element: <SeleccionOrg /> },
  { path: '/cambiar-contrasena', element: <CambiarContrasena /> },

  // Dashboard
  { path: '/dashboard', element: <PrivateRoute><Dashboard /></PrivateRoute> },

  // Sprint 2 — Convenios
  { path: '/convenios',              element: <PrivateRoute><ListaConvenios /></PrivateRoute> },
  { path: '/convenios/nuevo',        element: <PrivateRoute><FormConvenio /></PrivateRoute> },
  { path: '/convenios/:id',          element: <PrivateRoute><DetalleConvenio /></PrivateRoute> },
  { path: '/convenios/:id/editar',   element: <PrivateRoute><FormConvenio /></PrivateRoute> },

  // Sprint 2 — Productos
  { path: '/productos',              element: <PrivateRoute><ListaProductos /></PrivateRoute> },
  { path: '/productos/nuevo',        element: <PrivateRoute><FormProducto /></PrivateRoute> },
  { path: '/productos/:id',          element: <PrivateRoute><DetalleProducto /></PrivateRoute> },
  { path: '/productos/:id/editar',   element: <PrivateRoute><FormProducto /></PrivateRoute> },

  // Sprint 2 — Zonificación
  { path: '/zonas', element: <PrivateRoute><Zonificacion /></PrivateRoute> },

  // Sprint 2 — Usuarios
  { path: '/usuarios',             element: <PrivateRoute><ListaUsuarios /></PrivateRoute> },
  { path: '/usuarios/nuevo',       element: <PrivateRoute><FormUsuario /></PrivateRoute> },
  { path: '/usuarios/:id/editar',  element: <PrivateRoute><FormUsuario /></PrivateRoute> },

  // Roles y permisos
  { path: '/roles',             element: <PrivateRoute><ListaRoles /></PrivateRoute> },
  { path: '/roles/nuevo',       element: <PrivateRoute><FormRol /></PrivateRoute> },
  { path: '/roles/:id/editar',  element: <PrivateRoute><FormRol /></PrivateRoute> },

  // Sprint 3 — Prospectos
  { path: '/prospectos',              element: <PrivateRoute><ListaProspectos /></PrivateRoute> },
  { path: '/prospectos/nuevo',        element: <PrivateRoute><FormProspecto /></PrivateRoute> },
  { path: '/prospectos/:id',          element: <PrivateRoute><DetalleProspecto /></PrivateRoute> },
  { path: '/prospectos/:id/editar',   element: <PrivateRoute><FormProspecto /></PrivateRoute> },

  // Sprint 3 — Clientes
  { path: '/clientes',              element: <PrivateRoute><ListaClientes /></PrivateRoute> },
  { path: '/clientes/grupos',       element: <PrivateRoute><GruposSolidarios /></PrivateRoute> },
  { path: '/clientes/nuevo',        element: <PrivateRoute><ConvertirProspecto /></PrivateRoute> },
  { path: '/clientes/:id',          element: <PrivateRoute><DetalleCliente /></PrivateRoute> },

  // Sprint 3 — Solicitudes
  { path: '/solicitudes',           element: <PrivateRoute><ListaSolicitudes /></PrivateRoute> },
  { path: '/solicitudes/nueva',     element: <PrivateRoute><NuevaSolicitud /></PrivateRoute> },
  { path: '/solicitudes/:id',       element: <PrivateRoute><DetalleSolicitud /></PrivateRoute> },

  // Comités (configuración, admin)
  { path: '/comites',            element: <PrivateRoute><ListaComites /></PrivateRoute> },
  { path: '/comites/nuevo',      element: <PrivateRoute><FormComite /></PrivateRoute> },
  { path: '/comites/:id/editar', element: <PrivateRoute><FormComite /></PrivateRoute> },

  // Sprint 4 — Comité
  { path: '/comite',        element: <PrivateRoute><ListaComite /></PrivateRoute> },
  { path: '/comite/:id',    element: <PrivateRoute><DetalleComite /></PrivateRoute> },

  // Sprint 5 — Cartera
  { path: '/cartera',       element: <PrivateRoute><ListaCartera /></PrivateRoute> },
  { path: '/cartera/:id',   element: <PrivateRoute><DetalleCredito /></PrivateRoute> },

  // Sprint 6 — Agenda
  { path: '/agenda',        element: <PrivateRoute><AgendaFacilitador /></PrivateRoute> },

  // Sprint 7 — Reportes
  { path: '/reportes',      element: <PrivateRoute><Reportes /></PrivateRoute> },
  // Sprint 8 — Asistente IA y Configuración
  { path: '/configuracion', element: <PrivateRoute><Configuracion /></PrivateRoute> },

  // Calculadora
  { path: '/calculadora',   element: <PrivateRoute><Calculadora /></PrivateRoute> },

  // Requisitos
  { path: '/requisitos',    element: <PrivateRoute><ListaRequisitos /></PrivateRoute> },

  // Actividades económicas
  { path: '/actividades-economicas', element: <PrivateRoute><ListaActividadesEconomicas /></PrivateRoute> },

  // Cobranza
  { path: '/cobranza',        element: <PrivateRoute><ListaCobranzas /></PrivateRoute> },
  { path: '/cobranza/nueva',  element: <PrivateRoute><FormCobranza /></PrivateRoute> },

  // Bancos
  { path: '/bancos',          element: <PrivateRoute><ListaBancos /></PrivateRoute> },

  // Cierre mensual
  { path: '/cierre-mensual',  element: <PrivateRoute><CierreMensual /></PrivateRoute> },

  { path: '*', element: <Navigate to="/" replace /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
