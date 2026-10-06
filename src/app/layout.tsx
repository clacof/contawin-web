import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ContaWin", template: "%s · ContaWin" },
  description: "Sistema de Contabilidad ContaWin",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tema = (await cookies()).get("contawin_tema")?.value ?? "claro";
  const dataTheme = tema === "oscuro" ? "dark" : tema === "automatico" ? undefined : "light";
  return (
    <html lang="es-CL" data-theme={dataTheme}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
