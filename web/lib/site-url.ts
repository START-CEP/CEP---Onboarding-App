import "server-only";

/**
 * Dirección pública de la app para los enlaces de los correos (invitación, recuperar contraseña).
 * Sale de la configuración, nunca de las cabeceras de la petición: con un Host manipulado, el enlace
 * del correo podría apuntar a otro dominio.
 */
export function siteUrl(): string {
  const configured = process.env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  // Vercel expone el dominio de producción del proyecto (sin protocolo).
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  throw new Error("Falta SITE_URL en el servidor.");
}
