import "server-only";
import { createHash } from "node:crypto";

/**
 * URL del reproductor embebido de Bunny Stream con Token Authentication.
 * token = SHA256_hex(clave + videoId + expiración). Solo se genera en el servidor
 * y solo después de que la RLS haya permitido leer el asset.
 * Sin clave de firma devuelve null: nunca se entrega una URL sin token.
 */
export function bunnyEmbedUrl(libraryId: string, videoId: string, ttlSeconds = 2 * 60 * 60): string | null {
  const key = process.env.BUNNY_STREAM_TOKEN_AUTH_KEY;
  if (!key) return null;
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const base = `https://iframe.mediadelivery.net/embed/${encodeURIComponent(libraryId)}/${encodeURIComponent(videoId)}`;
  const params = new URLSearchParams({ autoplay: "false", preload: "true", responsive: "true" });
  params.set("token", createHash("sha256").update(key + videoId + expires).digest("hex"));
  params.set("expires", String(expires));
  return `${base}?${params}`;
}
