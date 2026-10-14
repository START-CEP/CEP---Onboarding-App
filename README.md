# CEP · App de Onboarding y Experiencia del Servicio

Hub para que cada miembro de la pareja (con su propio acceso) vea dónde está en su proceso, qué sigue y qué puede hacer hoy. El equipo (Emilia, psicóloga, Diego, Yasna) y el admin gestionan los servicios y el seguimiento.

## Fases

1. **Diseño visual** — aprobado: propuesta **Ruta** → [`design/propuestas.html`](design/propuestas.html) (proceso real de $3.000: 14 pasos, 10 sesiones, 9 módulos).
2. **Base de datos** — Supabase, motor genérico de servicios → [`docs/fase2-esquema.md`](docs/fase2-esquema.md).
3. **Funcionalidades** — una a una, sobre esta base.

## Stack

- Supabase (Postgres, Auth, Storage, Edge Functions) — local en Docker con la Supabase CLI.
- Video: Bunny Stream.
- App (Fase 3): Next.js en Vercel.

## Arrancar en local

Requisitos: Docker Desktop y la [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
supabase start      # Studio: http://127.0.0.1:55323 · Mailpit: http://127.0.0.1:55324
supabase db reset   # migraciones + datos de demo (Pedro y Andrea en el paso 9)
supabase test db    # tests de motor, privacidad y storage
cp .env.example .env.local
```

Usuarios de demo: `pedro@example.com`, `andrea@example.com`, `emilia@example.com`, `yasna@example.com`, `admin@example.com`… contraseña `cep-demo-2026` (solo local).

## Estructura

```
design/            maquetas aprobadas (Fase 1)
docs/              documentación del esquema (Fase 2)
supabase/
  migrations/      esquema, motor de requisitos, RLS, storage, Bunny
  seed/            usuarios y servicios de demo (no se sube a producción)
  tests/           tests pgTAP
types/database.ts  tipos generados para la app
```
