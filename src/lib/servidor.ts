import "server-only";
import { Database } from "./db";
import { config } from "./config";

/** Conexión única a la base (se reutiliza entre peticiones y recargas en desarrollo). */
const g = globalThis as unknown as { __contawinDb?: Database };

export function getDb(): Database {
  if (!g.__contawinDb) g.__contawinDb = new Database(config.rutaBase);
  return g.__contawinDb;
}
