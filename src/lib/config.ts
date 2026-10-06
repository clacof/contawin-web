/**
 * Configuración (equivale a contawin.ini / CONTAW.ini del original), por variables de entorno:
 *   CONTAWIN_TITULO   título del sistema               (por defecto «Sistema de Contabilidad»)
 *   CONTAWIN_DB       ruta del archivo SQLite           (por defecto ../datos/contawin.db, la misma base de ContaWinPy)
 *   TURSO_DATABASE_URL / TURSO_AUTH_TOKEN  base Turso remota (libsql://…); si está, se usa en vez del archivo
 *   CONTAWIN_DBF      carpeta CONTAWIN con los DBF      (sugerencia para Importar)
 *   CONTAWIN_SECRET   clave para firmar la sesión (mín. 32 caracteres)
 */
import path from "node:path";

export const APP_NAME = "Sistema de Contabilidad";
export const VERSION = "4.0.0";

export const config = {
  get titulo() { return process.env.CONTAWIN_TITULO || APP_NAME; },
  get rutaBase() {
    const r = process.env.CONTAWIN_DB || path.join("..", "datos", "contawin.db");
    return path.isAbsolute(r) ? r : path.resolve(/*turbopackIgnore: true*/ process.cwd(), r);
  },
  /** URL libSQL de la base: Turso si está configurado; si no, el archivo local. */
  get urlBase() { return process.env.TURSO_DATABASE_URL || `file:${this.rutaBase}`; },
  get tokenBase() { return process.env.TURSO_AUTH_TOKEN || undefined; },
  get carpetaDbf() { return process.env.CONTAWIN_DBF || ""; },
};
