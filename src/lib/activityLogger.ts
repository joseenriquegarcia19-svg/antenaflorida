import { supabase } from './supabase';

export type ActionType = 
  | 'Inicio de Sesión'
  | 'Intento Fallido de Login'
  | 'Intento Fallido de Registro'
  | 'Cerrar Sesión'
  | 'Crear Noticia'
  | 'Editar Noticia'
  | 'Eliminar Noticia'
  | 'Crear Podcast'
  | 'Editar Podcast'
  | 'Eliminar Podcast'
  | 'Crear Reel'
  | 'Editar Reel'
  | 'Eliminar Reel'
  | 'Crear Video'
  | 'Editar Video'
  | 'Eliminar Video'
  | 'Crear Sponsor'
  | 'Editar Sponsor'
  | 'Eliminar Sponsor'
  | 'Crear Promoción'
  | 'Editar Promoción'
  | 'Eliminar Promoción'
  | 'Crear Miembro de Equipo'
  | 'Editar Miembro de Equipo'
  | 'Eliminar Miembro de Equipo'
  | 'Crear Programa'
  | 'Editar Programa'
  | 'Eliminar Programa'
  | 'Finalizar Programa'
  | 'Actualizar Programación'
  | 'Crear Invitado'
  | 'Editar Invitado'
  | 'Eliminar Invitado'
  | 'Crear Estación'
  | 'Editar Estación'
  | 'Eliminar Estación'
  | 'Crear Imagen Galería'
  | 'Editar Imagen Galería'
  | 'Eliminar Imagen Galería'
  | 'Aprobar Comentario'
  | 'Desaprobar Comentario'
  | 'Eliminar Comentario'
  | 'Actualizar Ajustes'
  | 'Actualizar Usuario'
  | 'Crear Usuario'
  | 'Eliminar Usuario'
  | 'Eliminar Registro'
  | 'Actualizar Cabecera'
  | 'Visitar Sección'
  | 'Crear Categoría'
  | 'Editar Categoría'
  | 'Eliminar Categoría'
  | 'Crear Etiqueta'
  | 'Editar Etiqueta'
  | 'Eliminar Etiqueta'
  | 'Actualizar Perfil'
  | 'Actualizar Perfil Público'
  | 'Actualizar Accesibilidad'
  | 'Importar Shorts'
  | 'Importar Videos'
  | 'Importar Podcasts'
  | 'Eliminar Todos'
  | 'Actualizar Podcast'
  | 'Eliminar Fuente'
  | 'Sincronizar Fuente'
  | 'Editar Ubicación'
  | 'Crear Ubicación'
  | 'Eliminar Ubicación'
  | 'Error de Sistema'
  | 'Error de Autenticación'
  | 'Error al Guardar'
  | 'Error al Crear'
  | 'Error al Modificar'
  | 'Error al Acceder'
  | 'Error al Eliminar'
  | 'Error de Base de Datos'
  | 'Actualizar Configuración'
  | 'Sincronización Automática'
  | 'Actualizar Widgets';

async function getIpAddress(): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const ipRes = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (ipRes.ok) {
      const ipData = await ipRes.json();
      return ipData.ip;
    }
  } catch (e) {
    console.warn('Could not fetch IP address:', e);
  }
  return 'Unknown';
}

export const logActivity = async (
  actionType: ActionType,
  description?: string
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ipAddress = await getIpAddress();

    const { error } = await supabase
      .from('user_activity_log')
      .insert([
        {
          user_id: user.id,
          action_type: actionType,
          description: description,
          ip_address: ipAddress,
          occurred_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error in logActivity:', error);
  }
};

/**
 * Logs authentication failures (login/signup) WITHOUT requiring an authenticated user.
 * This is used for security monitoring of failed access attempts.
 */
export const logAuthFailure = async (
  actionType: 'Intento Fallido de Login' | 'Intento Fallido de Registro',
  email: string,
  errorMessage: string
) => {
  try {
    const ipAddress = await getIpAddress();

    // Insert directly into the log without user_id (will be NULL)
    const { error } = await supabase
      .from('user_activity_log')
      .insert([
        {
          user_id: null, // No authenticated user for failed attempts
          action_type: actionType,
          description: `Email: ${email} | Error: ${errorMessage}`,
          ip_address: ipAddress,
          occurred_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Error logging auth failure:', error);
    }
  } catch (error) {
    console.error('Error in logAuthFailure:', error);
  }
};

/**
 * Specifically logs system or application errors for troubleshooting.
 */
export const logError = async (
  errorType: 'Error de Sistema' | 'Error de Base de Datos' | 'Error al Guardar' | 'Error al Crear' | 'Error al Modificar' | 'Error al Eliminar' | 'Error al Acceder',
  errorMessage: string,
  context?: string
) => {
  return logActivity(errorType, `${errorMessage}${context ? ` | Contexto: ${context}` : ''}`);
};
