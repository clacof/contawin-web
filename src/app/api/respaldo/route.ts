/** Útiles > Respaldar: copia consistente de la base (sqlite backup) para descargar. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { nombreRespaldo } from "@/lib/db";
import { getDb } from "@/lib/servidor";
import { getSesion } from "@/lib/sesion";

export const runtime = "nodejs";

export async function GET() {
  if (!(await getSesion())) return new Response("No autorizado", { status: 401 });
  const db = getDb();
  const nombre = nombreRespaldo(db.ruta);
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "contawin-")), nombre);
  try {
    await db.respaldar(tmp);
    const datos = fs.readFileSync(tmp);
    return new Response(new Uint8Array(datos), { headers: {
      "content-type": "application/vnd.sqlite3", "content-disposition": `attachment; filename="${nombre}"` } });
  } finally {
    fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  }
}
