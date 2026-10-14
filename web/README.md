# App web (Next.js 16)

Hub de la pareja conectado a Supabase. Por ahora: login individual, **El proceso** (camino de pasos, "la página de hoy", cuadro de áreas, lo que viene) y **Los pasos**. El resto del menú está marcado como "próximamente".

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
| Variables de entorno | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

No hace falta la `SUPABASE_SERVICE_ROLE_KEY` en Vercel para esta versión.

Después del primer despliegue, en Supabase → Authentication → URL Configuration:
- **Site URL**: la URL de Vercel.
- **Redirect URLs**: `http://localhost:3000/**` y `https://<tu-dominio-vercel>/**`.
