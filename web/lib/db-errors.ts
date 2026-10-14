/**
 * Texto de un error de la base para mostrar en pantalla. Solo pasan los mensajes que escribimos nosotros
 * (raise en las funciones: códigos P0001 y 42501) y las reglas conocidas; nunca nombres de tablas ni detalles internos.
 */
export function dbMessage(error: { code?: string; message: string } | null | undefined): string | null {
  if (!error) return null;
  if (error.code === "P0001" || error.code === "42501") return error.message;
  if (error.code === "23514") {
    if (/url|meeting_url|link/.test(error.message)) return "El enlace tiene que empezar por https://.";
    return "Algún dato es demasiado largo o no tiene el formato correcto.";
  }
  if (error.code === "23505") return "Ya existe un registro con esos datos.";
  return null;
}
