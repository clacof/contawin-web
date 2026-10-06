import "server-only";
import { getDb } from "@/lib/servidor";
import type { SesionConEmpresa } from "@/lib/sesion";
import * as util from "@/lib/util";

/** Datos para el editor de asiento (GetAsientos / DLG_ASIENTOS). */
export function datosEditor(s: SesionConEmpresa, asientoId: number | null) {
  const db = getDb();
  const a = asientoId ? db.asiento(asientoId) : undefined;
  return {
    asientoId: a ? a.id : null,
    numero: a?.numero || db.siguienteNumero(s.periodoId),
    cab: { tipo: a?.tipo || "T", fecha: a?.fecha || fechaSugerida(s), glosa: a?.glosa ?? "", cdcosto: a?.cdcosto ?? "" },
    lineas: a ? db.detalleAsiento(a.id) : [],
    cuentas: db.cuentas(s.empresaId).map((c) => ({ codigo: c.codigo, nombre: c.nombre, cdocum: c.cdocum })),
    ccostos: db.ccostos(s.empresaId).map((c) => [c.codigo, c.nombre] as [string, string]),
    proveedores: db.proveedores(s.empresaId, "nombre").map((p) => [p.rut, p.nombre] as [string, string]),
    empresa: s.empresa.razon_social, ano: s.ano,
  };
}

/** _fecha_sugerida: hoy si es del año de trabajo; si no, la del último asiento o el 1 de enero. */
function fechaSugerida(s: SesionConEmpresa): string {
  const hoy = util.hoyIso();
  const ano = s.ano || util.anoDe(hoy);
  if (util.anoDe(hoy) === ano) return hoy;
  const ultimo = getDb().fechaUltimoAsiento(s.periodoId);
  return ultimo && ultimo.f ? util.fromIso(ultimo.f) ?? hoy : `${String(ano).padStart(4, "0")}-01-01`;
}

export type DatosEditor = ReturnType<typeof datosEditor>;
