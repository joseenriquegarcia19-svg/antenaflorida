# Manual de Administrador

## Estadísticas
Ruta: `/admin/analytics`

### Qué verás
- **Visitas**: total de pageviews en el rango seleccionado.
- **Únicos**: visitantes únicos aproximados (basado en hash pseudónimo).
- **Países**: cantidad de países detectados.

### Filtros
- **Inicio / Fin**: rango de fechas (UTC).
- **Agrupar**: diario / semanal / mensual.
- **Presets**: accesos rápidos (7/30/90 días).

### Gráficos
- **Tendencia**: líneas de visitas y únicos.
- **Top países**: barras por país.
- **Top páginas**: páginas más visitadas.
- **Demografía básica**: distribución por dispositivo, navegador, sistema e idioma.

### Exportación
- **CSV**: descarga múltiples archivos (overview, series, países, páginas y demografía).
- **PDF**: genera un reporte con tablas (ideal para compartir).

## Notas
- Si las métricas aparecen en 0, verifica que la función `track-visit` esté desplegada en Supabase (es quien inserta los eventos).
- El acceso a estadísticas está restringido a usuarios con rol `admin`.

