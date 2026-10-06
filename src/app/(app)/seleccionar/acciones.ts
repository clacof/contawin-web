"use server";
/** Selección de empresa y año (Sel_Empresa / SLaEmpresa) y creación de año (ui/inicio.py + ui/apertura.crear_ano). */
import { redirect } from "next/navigation";
import { esErrorDatos } from "@/lib/db";
import { getDb } from "@/lib/servidor";
import { guardarSesion, requiereUsuario } from "@/lib/sesion";

export async function elegirTrabajo(empresaId: number, periodoId: number) {
  const s = await requiereUsuario();
  const db = await getDb();
  const p = await db.periodo(periodoId);
  if (!p || p.empresa_id !== empresaId) return { error: "El año seleccionado no existe." };
  await guardarSesion({ u: s.usuario.usuario, e: empresaId, p: periodoId });
  redirect("/");
}

export async function periodosDe(empresaId: number) {
  await requiereUsuario();
  return (await (await getDb()).periodos(empresaId)).map((p) => ({ id: p.id, ano: p.ano }));
}

/**
 * crear_ano(): si hay un año anterior con saldos, se ofrece el asiento de apertura
 * (devuelve apertura=true para abrir esa pantalla); si no, crea el año de inmediato.
 */
export async function crearAno(empresaId: number, ano: number): Promise<{ error?: string; pid?: number; apertura?: boolean }> {
  await requiereUsuario();
  const db = await getDb();
  const origen = await db.periodoAnterior(empresaId, ano);
  let haySaldos = false;
  if (origen) {
    const sc = await db.saldosCierre(origen.id);
    haySaldos = Object.keys(sc.saldos).length > 0 || !!sc.resultado;
  }
  if (haySaldos) {
    // se valida antes de mostrar la apertura (mismos errores que crear_periodo)
    if (ano < 1980 || ano > 2200) return { error: "Año inválido." };
    if ((await db.periodos(empresaId)).some((p) => p.ano === ano)) return { error: `El año ${ano} ya existe para esta empresa.` };
    return { apertura: true };
  }
  try {
    return { pid: await db.crearPeriodo(empresaId, ano) };
  } catch (e) {
    if (esErrorDatos(e)) return { error: e.message };
    throw e;
  }
}
