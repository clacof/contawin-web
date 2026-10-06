/** Equivalente a error.log del original (main.py _registrar_error): guarda el error con fecha y hora. */
import fs from "node:fs";
import path from "node:path";

export function registrarError(err: unknown, donde: string) {
  const e = err as Error;
  const ahora = new Date().toLocaleString("es-CL");
  const texto = `\n===== ${ahora}  ${donde}\n${e?.stack ?? String(err)}\n`;
  console.error(texto);
  try {
    fs.appendFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), "error.log"), texto, "utf-8");
  } catch {
    /* sin permisos de escritura: se ignora */
  }
}
