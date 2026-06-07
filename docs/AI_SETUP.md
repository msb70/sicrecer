# SiCrecer — Configuración del Asistente IA

## 1. Obtener API Key de Gemini (gratis)

1. Ve a https://aistudio.google.com/apikey
2. Crea una clave → copia el valor `AIza...`

---

## 2. Agregar el secreto en Supabase

```bash
supabase secrets set GEMINI_API_KEY=AIzaSy...
```

O desde el Dashboard: **Settings → Edge Functions → Secrets → Add secret**
- Name: `GEMINI_API_KEY`
- Value: tu clave

---

## 3. Deploy de la Edge Function

```bash
supabase functions deploy ai-assistant --no-verify-jwt
```

> `--no-verify-jwt` porque la función verifica el JWT internamente con lógica de rol.

---

## 4. Agregar el componente en tu app

En la pantalla principal del facilitador (por ejemplo `src/pages/Dashboard.tsx`):

```tsx
import { AssistenteIA } from "../components/ai/AssistenteIA";

export function Dashboard() {
  return (
    <div>
      {/* ... resto del dashboard ... */}
      <AssistenteIA />
    </div>
  );
}
```

El componente se renderiza como un **botón flotante** en la esquina inferior derecha.
Al hacer clic, abre el panel de chat.

---

## 5. Variables de entorno del frontend

Asegúrate de tener en tu `.env`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Costo estimado

| Uso | Costo aprox. |
|-----|-------------|
| 100 consultas/día | < $0.05/día |
| 3.000 consultas/mes | < $1.50/mes |

Gemini 2.0 Flash: $0.075 por millón de tokens de entrada.
Una consulta típica (contexto + pregunta) consume ~1,500 tokens.

---

## Lo que el asistente puede responder

- Saldos y mora de clientes en la zona del facilitador
- Cuotas que vencen próximamente
- Resumen del portafolio de la zona
- Quién debe más, quién está al día

## Lo que NO puede responder

- Datos de otras zonas (RLS lo bloquea)
- Información que no esté en la base de datos
- Aprobar o rechazar créditos (no tiene permisos de escritura)
