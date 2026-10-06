import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // módulos nativos / con archivos de datos: se cargan desde node_modules en el servidor
  serverExternalPackages: ["@libsql/client", "libsql", "pdfkit", "exceljs"],
  poweredByHeader: false,
  // En desarrollo, Next solo acepta el recargado en vivo (HMR) desde localhost. Para abrirlo desde otro
  // equipo de la red (ej. http://192.168.1.122:3000) se autorizan esas IP; se pueden agregar más en
  // CONTAWIN_DEV_ORIGINS separadas por coma.
  allowedDevOrigins: ["192.168.1.122", ...(process.env.CONTAWIN_DEV_ORIGINS ?? "").split(",").map((x) => x.trim()).filter(Boolean)],
};

export default nextConfig;
