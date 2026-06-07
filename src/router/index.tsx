import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

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
import AsistenteIA       from '../pages/asistente/AsistenteIA'
import Configuracion     from '../pages/configuracion/Configuracion'

// Calculadora
import Calculadora       from '../pages/calculadora/Calculadora'

// Sprint 2 — Back-office
import ListaConvenios    from '../pages/convenios/ListaConvenios'
import DetalleConvenio   from '../pages/convenios/DetalleConvenio'
import FormConvenio      from '../pages/convenios/FormConvenio'
import ListaProductos    from '../pages/productos/ListaProductos'
import FormProducto      from '../pages/productos/FormProducto'
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
import ListaSolicitudes  from '../pages/solicitudes/ListaSolicitudes'
import NuevaSolicitud    from '../pages/solicitudes/NuevaSolicitud'
import DetalleSolicitud  from '../pages/solicitudes/DetalleSolicitud'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { autenticado } = useApp()
  return autenticado ? <>{children}</> : <Navigate to="/login" replace />
}

const router = createBrowserRouter([
  { path: '/',                   element: <Navigate to="/login" replace /> },
  { path: '/login',              element: <Login /> },
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
  { path: '/productos/:id',          element: <PrivateRoute><Placeholder titulo="Detalle producto" /></PrivateRoute> },
  { path: '/productos/:id/editar',   element: <PrivateRoute><FormProducto /></PrivateRoute> },

  // Sprint 2 — Zonificación
  { path: '/zonas', element: <PrivateRoute><Zonificacion /></PrivateRoute> },

  // Sprint 2 — Usuarios
  { path: '/usuarios',             element: <PrivateRoute><ListaUsuarios /></PrivateRoute> },
  { path: '/usuarios/nuevo',       element: <PrivateRoute><FormUsuario /></PrivateRoute> },
  { path: '/usuarios/:id/editar',  element: <PrivateRoute><FormUsuario /></PrivateRoute> },

  // Sprint 3 — Prospectos
  { path: '/prospectos',              element: <PrivateRoute><ListaProspectos /></PrivateRoute> },
  { path: '/prospectos/nuevo',        element: <PrivateRoute><FormProspecto /></PrivateRoute> },
  { path: '/prospectos/:id',          element: <PrivateRoute><DetalleProspecto /></PrivateRoute> },
  { path: '/prospectos/:id/editar',   element: <PrivateRoute><FormProspecto /></PrivateRoute> },

  // Sprint 3 — Clientes
  { path: '/clientes',              element: <PrivateRoute><ListaClientes /></PrivateRoute> },
  { path: '/clientes/grupos',       element: <PrivateRoute><GruposSolidarios /></PrivateRoute> },
  { path: '/clientes/nuevo',        element: <PrivateRoute><Placeholder titulo="Convertir prospecto a cliente" /></PrivateRoute> },
  { path: '/clientes/:id',          element: <PrivateRoute><DetalleCliente /></PrivateRoute> },

  // Sprint 3 — Solicitudes
  { path: '/solicitudes',           element: <PrivateRoute><ListaSolicitudes /></PrivateRoute> },
  { path: '/solicitudes/nueva',     element: <PrivateRoute><NuevaSolicitud /></PrivateRoute> },
  { path: '/solicitudes/:id',       element: <PrivateRoute><DetalleSolicitud /></PrivateRoute> },

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
  { path: '/asistente',     element: <PrivateRoute><AsistenteIA /></PrivateRoute> },
  { path: '/configuracion', element: <PrivateRoute><Configuracion /></PrivateRoute> },

  // Calculadora
  { path: '/calculadora',   element: <PrivateRoute><Calculadora /></PrivateRoute> },

  { path: '*', element: <Navigate to="/login" replace /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
