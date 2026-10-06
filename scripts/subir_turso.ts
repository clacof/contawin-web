/**
 * Copia la base local (archivo SQLite) a la base Turso que usa la versión publicada en Vercel.
 *
 *   TURSO_DATABASE_URL=libsql://… TURSO_AUTH_TOKEN=… npm run subir-turso -- [base.db] [--reemplazar]
 *
 * Sin base indicada usa CONTAWIN_DB o ../datos/contawin.db. Si la base Turso ya tiene empresas o asientos,
 * no hace nada salvo que se indique --reemplazar (borra todo lo de Turso y lo reemplaza por la copia local).
 */
import { createClient } from "@libsql/client";
import { config } from "../src/lib/config";
import { Database } from "../src/lib/db";
import { copiarTablas } from "../src/lib/db/base";
import { CASCADAS, SCHEMA, TABLAS } from "../src/lib/db/esquema";

const argv = process.argv.slice(2);
const reemplazar = argv.includes("--reemplazar");
const rutaDb = argv.find((a) => !a.startsWith("--")) ?? config.rutaBase;

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("Falta TURSO_DATABASE_URL (y TURSO_AUTH_TOKEN).");
  const local = await Database.abrir(`file:${rutaDb}`);
  const remoto = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  try {
    await remoto.executeMultiple(SCHEMA + CASCADAS);
    const n = async (t: string) => Number((await remoto.execute(`SELECT COUNT(*) n FROM ${t}`)).rows[0].n);
    if ((await n("empresa")) || (await n("asiento"))) {
      if (!reemplazar) throw new Error("La base Turso ya tiene datos. Use --reemplazar para sobrescribirlos.");
    }
    // se vacía todo (también los usuarios iniciales que crea la aplicación al abrir una base nueva)
    await remoto.batch([...TABLAS].reverse().map((t) => `DELETE FROM ${t}`), "write");
    console.log(`Copiando ${rutaDb} -> ${url}`);
    await copiarTablas(local, remoto, (t) => console.log("  " + t));
    console.log("Listo.");
  } finally {
    local.close();
    remoto.close();
  }
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
