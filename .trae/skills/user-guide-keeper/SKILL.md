---
name: "User Guide Keeper"
description: "Mantiene actualizada la guía de usuario PDF. Invocar al añadir nuevas funciones, páginas o módulos para actualizar `generateUserGuide.ts`."
---

# User Guide Keeper

## Descripción
Este skill se encarga de mantener sincronizada la documentación generada en PDF (`src/lib/generateUserGuide.ts`) con las funcionalidades reales del proyecto.

## Cuándo usar
- Después de crear una nueva página en `src/pages`.
- Al añadir una nueva funcionalidad importante (ej: nuevo módulo de admin, integración nueva).
- Cuando el usuario pida "actualizar la guía" o "documentar los cambios".
- Antes de un deploy importante para asegurar que el manual esté al día.

## Instrucciones
1. **Analizar Cambios:** Revisar `src/pages` y `src/components` para identificar nuevas características no documentadas.
2. **Leer Guía Actual:** Leer `src/lib/generateUserGuide.ts` para ver qué está incluido actualmente.
3. **Actualizar Arrays:**
   - Si es una tecnología nueva, añadir a `techData`.
   - Si es una función pública, añadir a `publicFeatures`.
   - Si es una función de administración, añadir a `adminFeatures`.
   - Si requiere una nueva sección, añadir lógica de `autoTable` nueva.
4. **Verificar:** Asegurarse de que el PDF se sigue generando correctamente sin errores de sintaxis.

## Archivo Objetivo
- `src/lib/generateUserGuide.ts`
