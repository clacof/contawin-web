import "server-only";
import { getDb } from "@/lib/servidor";
import type { SesionConEmpresa } from "@/lib/sesion";
import * as util from "@/lib/util";

/** Datos para el editor de asiento (GetAsientos / DLG_ASIENTOS). */
export async function datosEditor(s: SesionConEmpresa, asientoId: number | null) {
  const db = await getDb();
  const a = asientoId ? await db.asiento(asientoId) : undefined;
  const [numero, fecha, lineas, cuentas, ccostos, proveedores] = await Promise.all([
    a?.numero || db.siguienteNumero(s.periodoId), a?.fecha || fechaSugerida(s), a ? db.detalleAsiento(a.id) : [],
    db.cuentas(s.empresaId), db.ccostos(s.empresaId), db.proveedores(s.empresaId, "nombre")]);
  return {
    asientoId: a ? a.id : null,
    numero,
    cab: { tipo: a?.tipo || "T", fecha, glosa: a?.glosa ?? "", cdcosto: a?.cdcosto ?? "" },
    lineas,
    cuentas: cuentas.map((c) => ({ codigo: c.codigo, nombre: c.nombre, cdocum: c.cdocum })),
    ccostos: ccostos.map((c) => [c.codigo, c.nombre] as [string, string]),
    proveedores: proveedores.map((p) => [p.rut, p.nombre] as [string, string]),
    empresa: s.empresa.razon_social, ano: s.ano,
  };
}

/** _fecha_sugerida: hoy si es del año de trabajo; si no, la del último asiento o el 1 de enero. */
async function fechaSugerida(s: SesionConEmpresa): Promise<string> {
  const hoy = util.hoyIso();
  const ano = s.ano || util.anoDe(hoy);
  if (util.anoDe(hoy) === ano) return hoy;
  const ultimo = await (await getDb()).fechaUltimoAsiento(s.periodoId);
  return ultimo && ultimo.f ? util.fromIso(ultimo.f) ?? hoy : `${String(ano).padStart(4, "0")}-01-01`;
}

export type DatosEditor = Awaited<ReturnType<typeof datosEditor>>;
