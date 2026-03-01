# Solución de acceso al Dashboard

## Síntomas reportados
- No se podía iniciar sesión o entrar a `/login`.
- Tras iniciar sesión, había redirecciones inesperadas o el Dashboard no cargaba.
- No se podía abrir `/admin/users`.

## Causas raíz encontradas (probables)
- **RLS en `profiles` con recursión**: políticas que consultaban `profiles` dentro de políticas de `profiles` pueden causar errores tipo *infinite recursion detected* en Postgres/Supabase, bloqueando lecturas de perfil y listados.
- **Sesión existente sin permisos**: si un usuario ya tenía una sesión activa pero con rol `user`, el flujo podía parecer “bloqueado” porque la app redirigía al Dashboard y luego el layout lo rechazaba.
- **Desajustes de permisos/roles**: la app depende de `profiles.role` para decidir si el usuario entra a Admin; si no se puede leer `profiles.role`, el usuario se considera sin permisos.

## Cambios aplicados

### 1) RLS robusto para `profiles`
- Se creó `public.is_admin()` como función `SECURITY DEFINER` para comprobar admin sin recursión.
- Se recrearon políticas para:
  - Lectura del propio perfil (`SELECT` own row) – necesario para `AuthContext`.
  - Acceso admin para ver/editar/borrar perfiles.
  - Bloqueo de borrado del `super_admin`.

### 2) Login más predecible
- En `/login` se maneja el caso de sesión activa sin permisos:
  - Si hay sesión pero rol no es `admin`/`editor`, se cierra la sesión y se muestra un mensaje.
- Mensajes de error en español para fallos comunes (credenciales incorrectas, email no confirmado).

### 3) Acceso al Dashboard por rol/permisos
- `AdminLayout` permite acceso a roles `admin` y `editor`.
- El menú y rutas se filtran por permisos para evitar accesos directos no permitidos.

## Cómo probar (Checklist)

### Navegación pública
- Abrir `/` y validar carga de secciones.
- Abrir `/schedule`.
- Probar `/search?q=radio`.

### Login y dashboard
1. Abrir `/login`.
2. Ingresar credenciales válidas.
3. Confirmar navegación a `/admin`.
4. Abrir `/admin/users` con un admin.
5. Probar abrir `/admin/users` con un editor (debe redirigir a `/admin`).

## Notas de seguridad
- No se guardan contraseñas en la tabla `profiles`.
- La creación de usuarios se realiza vía Edge Function con Service Role.
- El usuario `super_admin` queda protegido contra borrado.

