// Contacto directo con el asistente del equipo (WhatsApp). Sin número configurado, no se muestra el botón.
export function whatsappUrl(text: string): string | null {
  const digits = (process.env.NEXT_PUBLIC_WHATSAPP_ASSISTANT ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
