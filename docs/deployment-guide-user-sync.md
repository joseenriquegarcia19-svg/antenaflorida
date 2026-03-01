# Guía de Despliegue: Sincronización de Usuarios (Admin Delete User)

Se ha implementado una nueva funcionalidad para asegurar la eliminación completa de usuarios tanto del Dashboard como de la base de datos de autenticación de Supabase (`auth.users`).

## Nueva Edge Function: `admin-delete-user`

Esta función permite eliminar usuarios de forma segura utilizando la API de administración de Supabase.

### Pasos para desplegar

1.  **Asegúrate de tener Supabase CLI instalado y logueado.**
    ```bash
    npx supabase login
    ```

2.  **Despliega la nueva función.**
    Ejecuta el siguiente comando en la raíz del proyecto:
    ```bash
    npx supabase functions deploy admin-delete-user
    ```
    
    Si usas Deno directamente o tienes otra configuración de scripts, asegúrate de desplegar la carpeta `supabase/functions/admin-delete-user`.

3.  **Configura las variables de entorno (si es necesario).**
    La función utiliza `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. Estas suelen estar configuradas por defecto en el entorno de Edge Functions de Supabase, pero verifica en el panel de control de Supabase > Edge Functions > admin-delete-user > Secrets si necesitas añadirlas manualmente.

## Verificación

1.  Ve al Dashboard de Administración (`/admin/users`).
2.  Intenta eliminar un usuario de prueba (NO el tuyo ni el Super Admin).
3.  Deberías ver un mensaje de confirmación advirtiendo sobre la eliminación permanente.
4.  Tras confirmar, el usuario debería desaparecer de la lista.
5.  **Validación en Supabase:**
    - Ve a la tabla `Authentication` > `Users` y verifica que el usuario ya no existe.
    - Ve a la tabla `public` > `profiles` y verifica que el registro correspondiente también se ha eliminado (gracias a `ON DELETE CASCADE`).

## Solución de Problemas

- **Error 404 al eliminar:** Significa que la función no está desplegada. Sigue el paso 2 de despliegue.
- **Error 403 Unauthorized:** Asegúrate de que estás intentando eliminar el usuario con una cuenta de Administrador.
- **Error de conexión:** Verifica que `VITE_SUPABASE_URL` en tu archivo `.env` del frontend sea correcta.
