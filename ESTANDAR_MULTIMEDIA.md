# Estándar Core de Selección Multimedia

Este documento define las reglas obligatorias sobre cómo se deben implementar los selectores de recursos multimedia (imágenes y videos) a lo largo de todos los paneles de administración y formularios interactivos en Antena Florida.

## Regla Universal de las 3 Opciones
Cualquier componente o formulario que requiera al usuario proporcionar una imagen o video **DEBE** obligatoriamente ofrecer tres métodos para su obtención:

1. **URL Externa**: Un campo de texto directo donde el usuario puede pegar un enlace web de la imagen.
2. **Subida de Archivo Local**: Un botón para subir el archivo desde el ordenador o móvil del usuario.
3. **Seleccionar de Galería**: Un botón que abra el modal unificado de la "Galería General" (`ManageGallery.tsx`) y permita seleccionar un recurso previamente subido.

## Almacenamiento Centralizado
- **Todas las subidas locales** (Archivos subidos desde el equipo del usuario) deben guardarse y registrarse ineludiblemente en la **Galería General**.
- Específicamente, esto implica subirlos al *Storage* de Supabase pertinente y dejar un registro en la tabla `gallery_items` (o equivalente) para que estén disponibles de inmediato para su futura reutilización en otras áreas de la aplicación.
- No deben existir "subidas huérfanas"; cualquier imagen cargada para una Noticia, Podcast, Programa, Perfil, etc., pasa a formar parte del banco multimedia de Antena Florida.

## Experiencia de Usuario (UI)
- Estos tres métodos deben estar presentados de forma limpia, equitativa y usualmente presentados en diseño de pestañas, botones integrados u opciones de modal. 
- Los módulos existentes como `ImageUpload` deben adherirse o ser adaptados a respetar la presencia de la "Galería General" como opción nativa.
