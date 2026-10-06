"use server";
/** Asiento de apertura (ui/apertura.py — usa db/apertura.ts). */
import { esErrorDatos } from "@/lib/db";
import { getDb } from "@/lib/servidor";
import { requiereEmpresa, requiereUsuario } from "@/lib/sesion";
import * as util from "@/lib/util";

export async function previaApertura(origenId: number, cuenta: string | null) {
  await requiereUsuario();
  const db = getDb();
  try {
    return { lineas: db.lineasApertura(origenId, cuenta), falta: false };
  } catch (e) {
    if (!(esErrorDatos(e))) throw e;
    // falta la cuenta del resultado: muestra solo los saldos
    const sc = db.saldosCierre(origenId);
    return {
      lineas: Object.keys(sc.saldos).sort().map((c) => ({ codigo: c, debe: Math.max(sc.saldos[c], 0), haber: Math.max(-sc.saldos[c], 0) })),
      falta: true,
    };
  }
}

/** Año existente (Ingresos > Asiento de apertura): genera o regenera la apertura del año de trabajo. */
export async function traspasar(origenId: number, cuenta: string | null): Promise<{ error?: string; mensaje?: string }> {
  const s = await requiereEmpresa();
  const db = getDb();
  try {
    const aid = db.traspasarApertura(origenId, s.periodoId, cuenta);
    const a = db.asiento(aid)!;
    return { mensaje: `Asiento de apertura N° ${a.numero} guardado (${util.fmtPesos(a.debe)}).` };
  } catch (e) {
    if (esErrorDatos(e)) return { error: e.message };
    throw e;
  }
}

/** Año nuevo (crear_ano): con apertura o «Crear el año sin apertura». */
export async function crearAnoConApertura(empresaId: number, ano: number, origenId: number, cuenta: string | null, omitir: boolean)
  : Promise<{ error?: string; pid?: number; mensaje?: string }> {
  await requiereUsuario();
  const db = getDb();
  try {
    if (omitir) return { pid: db.crearPeriodo(empresaId, ano) };
    const pid = db.crearPeriodoConApertura(empresaId, ano, origenId, cuenta);
    const a = db.asientoApertura(pid);
    return { pid, mensaje: a ? `Año ${ano} creado con el asiento de apertura N° ${a.numero} (${util.fmtPesos(a.debe)}).` : undefined };
  } catch (e) {
    if (esErrorDatos(e)) return { error: e.message };
    throw e;
  }
}
