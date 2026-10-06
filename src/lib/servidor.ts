import "server-only";
import { Database } from "./db";
import { config } from "./config";

/** Conexión única a la base (se reutiliza entre peticiones y recargas en desarrollo). */
const g = globalThis as unknown as { __contawinDb?: Promise<Database> };

export function getDb(): Promise<Database> {
  if (!g.__contawinDb) {
    g.__contawinDb = Database.abrir(config.urlBase, config.tokenBase);
    g.__contawinDb.catch(() => { g.__contawinDb = undefined; });   // si falla, se reintenta en la próxima petición
  }
  return g.__contawinDb;
}
