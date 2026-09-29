import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import { AppProvider } from './context/AppContext'
import { AppRouter } from './router'

// La versión vigente arrancó: permite a recarga.js volver a actuar en una próxima actualización.
try { sessionStorage.removeItem('sicrecer-recarga') } catch { /* sin storage */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <AppRouter />
    </AppProvider>
  </StrictMode>
)
