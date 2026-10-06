"use server";
/** Comprobantes (ASIENTOS.PRG — ui/asientos.py). */
import { esErrorDatos, type LineaEntrada } from "@/lib/db";
import { getDb } from "@/lib/servidor";
import { requiereEmpresa } from "@/lib/sesion";

export interface CabeceraForm { tipo: string; fecha: string; glosa: string; cdcosto: string }

/** GAsien(): valida y graba. Solo comprobantes del año de trabajo de la sesión. */
export async function guardarComprobante(asientoId: number | null, cab: CabeceraForm, lineas: LineaEntrada[])
  : Promise<{ error?: string; id?: number }> {
  const s = await requiereEmpresa();
  const db = getDb();
  if (asientoId !== null && db.asiento(asientoId)?.periodo_id !== s.periodoId)
    return { error: "El comprobante no pertenece al año de trabajo." };
  // el centro de costo de la cabecera se propaga a los documentos de compra (como el original)
  for (const l of lineas) if (l.documento) l.documento.cdcosto = cab.cdcosto;
  try {
    return { id: db.guardarAsiento(s.periodoId, cab, lineas, asientoId) };
  } catch (e) {
    if (esErrorDatos(e)) return { error: e.message };
    throw e;
  }
}

export async function borrarComprobante(id: string): Promise<{ error?: string }> {
  const s = await requiereEmpresa();
  const db = getDb();
  if (db.asiento(Number(id))?.periodo_id !== s.periodoId) return { error: "El comprobante no pertenece al año de trabajo." };
  db.borrarAsiento(Number(id));
  return {};
}
