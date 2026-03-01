# Analíticas (Supabase)

## Objetivo
Este módulo registra visitas (pageviews) del sitio público y expone métricas agregadas en el dashboard.

## Flujo de datos
1. Frontend (sitio público)
   - En cada navegación pública, el hook `useTrackPageView` invoca la función `track-visit`.
   - Archivo: [useTrackPageView.ts](file:///Users/jegroman/Documents/radio%20web%20tito/radio-wave/src/hooks/useTrackPageView.ts)

   Nota: si `track-visit` no está desplegada o falla por red/CORS, el hook hace fallback a inserción directa en `analytics_events` (con RLS que permite solo `page_view`).

2. Edge Function
   - `track-visit` calcula un `visitor_hash` (hash SHA-256 con salt) y extrae metadatos básicos (país, dispositivo, navegador, sistema, idioma).
   - Inserta un evento `page_view` en `public.analytics_events` usando `service_role` (no depende de RLS).
   - Archivo: [track-visit/index.ts](file:///Users/jegroman/Documents/radio%20web%20tito/radio-wave/supabase/functions/track-visit/index.ts)

3. Base de datos
   - `public.analytics_events`: almacena eventos genéricos (escalable para nuevas métricas).
   - `public.analytics_audit_logs`: registra auditoría de consultas de métricas (quién consultó, qué rango, etc.).
   - Migración: [analytics.sql](file:///Users/jegroman/Documents/radio%20web%20tito/radio-wave/supabase/migrations/analytics.sql)

4. Dashboard
   - La pantalla de estadísticas consulta funciones RPC agregadas (`stats_*`) y renderiza gráficos interactivos.
   - Archivo: [Analytics.tsx](file:///Users/jegroman/Documents/radio%20web%20tito/radio-wave/src/pages/admin/Analytics.tsx)

## Esquema
### `public.analytics_events`
- `occurred_at`: timestamp UTC
- `event_type`: por ahora `page_view`
- `path`: ruta (incluye query/hash)
- `visitor_hash`: identificador pseudónimo (no se guarda IP)
- `properties`: JSON con:
  - `country`, `device`, `browser`, `os`, `lang`, `referrer`

### Auditoría
Las funciones `stats_*` llaman a `public.analytics_log(...)` para dejar evidencia de consultas.

## Seguridad y roles
- RLS habilitado en tablas de analíticas.
- Lectura restringida a administradores mediante `public.is_admin()`.
- Las funciones RPC `stats_*` validan rol admin y fallan con `not authorized` si no corresponde.

### Inserción pública (fallback)
Existe una policy de inserción para permitir registrar `page_view` sin autenticación (solo inserción; lectura sigue restringida a admin).
Migración: [analytics_public_insert.sql](file:///Users/jegroman/Documents/radio%20web%20tito/radio-wave/supabase/migrations/analytics_public_insert.sql)

## RGPD / Privacidad
- No se almacena IP ni user-agent completos.
- Se almacena un hash de visitante (`visitor_hash`) derivado de IP + user-agent + `ANALYTICS_HASH_SALT`.
- El objetivo es métricas agregadas, no seguimiento individual.
- Retención: existe `public.analytics_purge(p_before)` para borrar datos antiguos.
  - Migración: [analytics_retention.sql](file:///Users/jegroman/Documents/radio%20web%20tito/radio-wave/supabase/migrations/analytics_retention.sql)

## Cómo desplegar la Edge Function
En Supabase:
- Crear una función llamada `track-visit` con el contenido de `supabase/functions/track-visit/index.ts`.
- Configurar secrets:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ANALYTICS_HASH_SALT` (recomendado)

## RPC disponibles
- `stats_overview(p_start, p_end)`
- `stats_timeseries(p_bucket, p_start, p_end)` (`day|week|month`)
- `stats_by_country(p_start, p_end, p_limit)`
- `stats_top_pages(p_start, p_end, p_limit)`
- `stats_demographics(p_start, p_end)`
- `analytics_purge(p_before)`
