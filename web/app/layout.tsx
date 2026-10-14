import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope, Montserrat } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display" });
// Montserrat: tipografía corporativa de Creciendo en pareja (login y logotipo).
const brand = Montserrat({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-brand" });
const body = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Creciendo en pareja · Su ruta de pareja",
  description: "Dónde están en su proceso, qué sigue y qué pueden hacer hoy.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} ${brand.variable}`}>
      <body>{children}</body>
    </html>
  );
}
