"use server";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { importar } from "@/lib/dbf/importer";
import { buscarArchivo } from "@/lib/dbf/reader";
import { getDb } from "@/lib/servidor";
import { guardarSesion, requiereUsuario } from "@/lib/sesion";

/** Útiles > Importar datos del ContaWin antiguo (DBF). */
export async function importarDbf(carpeta: string, reemplazar: boolean): Promise<{ error?: string; resumen?: string }> {
  const s = await requiereUsuario();
  carpeta = carpeta.trim();
  if (!carpeta) return { error: "Indica la carpeta CONTAWIN (la que contiene EMPRESA.DBF)." };
  const ruta = path.resolve(carpeta);
  if (!fs.existsSync(ruta) || !fs.statSync(ruta).isDirectory()) return { error: `No existe la carpeta:\n${ruta}` };
  if (!buscarArchivo(ruta, "EMPRESA.DBF")) return { error: "En esa carpeta no está el archivo EMPRESA.DBF." };
  if (reemplazar) await guardarSesion({ u: s.usuario.usuario });       // la empresa de trabajo puede ser reemplazada
  let resumen: string;
  try {
    resumen = (await importar(ruta, await getDb(), reemplazar)).resumen();
  } catch (e) {
    return { error: `No se pudo importar:\n${(e as Error).message}` };
  }
  (await cookies()).set("contawin_dbf", ruta, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return { resumen };
}

/** Útiles > Apariencia: claro, oscuro o automático (según el sistema). */
export async function cambiarTema(tema: string) {
  await requiereUsuario();
  const t = ["claro", "oscuro", "automatico"].includes(tema) ? tema : "claro";
  (await cookies()).set("contawin_tema", t, { sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
}
