import path from "node:path";
import type { NextConfig } from "next";

// Orígenes externos que usa la app: Supabase (API, Storage, Realtime) y Bunny (reproductor y subidas TUS).
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabase.replace(/^http/, "ws");
const dev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  // Next inserta scripts en línea para hidratar; en desarrollo además usa eval.
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabaseWs} https://video.bunnycdn.com`,
  "frame-src https://iframe.mediadelivery.net",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Nadie puede meter la app en un iframe (firma del contrato, contraseñas).
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: { root: path.join(__dirname) },
  async redirects() {
    return [{ source: "/pasos", destination: "/proceso", permanent: true }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
