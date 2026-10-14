# App web (Next.js 16)

Hub conectado a Supabase con tres áreas:

- **Pareja** (`/`): el proceso, los pasos, bienvenida, contrato (firma), radiografía, módulos (video + tarea), sesiones de terapia (pedir cita) y coaching grupal (grabaciones, recursos, preguntas).
- **Equipo** (`/equipo`): parejas y solicitudes de sesión, ficha de cada pareja (agendar, notas clínicas, qué veremos, requisitos, onboarding, respuestas) y coaching grupal.
- **Admin** (`/equipo/...`): servicios (borrador → publicar, crear y duplicar), videos en Bunny y PDFs, inscribir parejas con invitación.

Acceso: invitación por email → `/auth/aceptar` → crear contraseña; recuperar en `/recuperar`.

## Local

```bash
cd web
npm install
npm run dev        # http://localhost:3000
```

Lee las variables de `web/.env.local` (enlace simbólico a `../.env.local`).

## Desplegar en Vercel

| Ajuste | Valor |
|---|---|
| Framework | Next.js |
| Root Directory | `web` |
| Variables **Config** (públicas) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Variables **Secret** (solo servidor) | `SUPABASE_SERVICE_ROLE_KEY` (inscribir parejas e invitar), `SITE_URL` (dominio de producción, para los enlaces de los correos), `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_API_KEY`, `BUNNY_STREAM_TOKEN_AUTH_KEY` (videos; sin esta clave los videos no se muestran) |

La `SUPABASE_SERVICE_ROLE_KEY` solo la usa el servidor al inscribir, después de comprobar que quien lo pide es ventas o admin.

Después del primer despliegue, en Supabase → Authentication → URL Configuration:
- **Site URL**: la URL de Vercel.
- **Redirect URLs**: exactas, sin comodines: `https://<tu-dominio>/auth/aceptar` (y, solo mientras se pruebe en local, `http://localhost:3000/auth/aceptar`). Un comodín permitiría desviar los enlaces de los correos a otra dirección.
