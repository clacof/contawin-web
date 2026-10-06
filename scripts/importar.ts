/**
 * Importador de los DBF del ContaWin original desde la línea de comandos (python -m contawin.importer).
 *
 *   npm run importar -- "D:\ruta\CONTAWIN" [base.db] [--reemplazar] [--cp850]
 *
 * Sin base indicada usa CONTAWIN_DB o ../datos/contawin.db (la misma de la aplicación).
 */
import { config } from "../src/lib/config";
import { Database } from "../src/lib/db";
import { importar } from "../src/lib/dbf/importer";

const argv = process.argv.slice(2);
const reemplazar = argv.includes("--reemplazar");
const encoding = argv.includes("--cp850") ? "cp850" : "cp1252";
const args = argv.filter((a) => a !== "--reemplazar" && a !== "--cp850");
if (!args.length) {
  console.log('Uso: npm run importar -- "D:\\ruta\\CONTAWIN" [base.db] [--reemplazar] [--cp850]');
  process.exit(1);
}
const rutaDb = args[1] ?? config.rutaBase;

async function main() {
  const db = await Database.abrir(`file:${rutaDb}`);
  try {
    const res = await importar(args[0], db, reemplazar, (t) => console.log(t), encoding);
    console.log("\n" + res.resumen());
    console.log(`\nBase de datos: ${rutaDb}`);
  } finally {
    db.close();
  }
}

void main();
