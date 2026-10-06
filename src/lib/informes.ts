import "server-only";
/**
 * Generación de informes a partir de parámetros (diálogos de ui/informes_dlg.py y listados de los mantenedores).
 * La usan la página de consulta en pantalla y la ruta /api/informe (PDF / Excel / CSV).
 */
import * as reports from "./reports";
import { getDb } from "./servidor";
import type { Sesion } from "./sesion";
import * as util from "./util";

export const INFORMES = {
  "balance-8": { titulo: "Balance de 8 columnas" },
  "balance-tipo-informe": { titulo: "Balance tipo informe", sinDesde: true },
  "libro-diario": { titulo: "Libro diario" },
  "libro-diario-tipo": { titulo: "Libro diario por tipo", tipo: true },
  "libro-mayor": { titulo: "Movimientos de mayor", cuentas: true },
  "libro-compras": { titulo: "Libro de compras", ccosto: true },
} as const satisfies Record<string, { titulo: string; sinDesde?: boolean; tipo?: boolean; cuentas?: boolean; ccosto?: boolean }>;
export type TipoInforme = keyof typeof INFORMES;

export type Parametros = Record<string, string | undefined>;
type R = { error: string } | { informe: reports.Informe };

/** TODOS = «Todos los centros de costo» (cdcosto=None en Python). */
export const TODOS_CC = "__todos";

export function generar(s: Sesion, tipo: string, p: Parametros): R {
  const db = getDb();
  if (tipo === "listado-empresas") return { informe: reports.listadoEmpresas(db) };
  if (!s.empresaId || !s.periodoId) return { error: "Primero debes seleccionar una empresa.\n\nUsa «Cambiar empresa» o presiona F2." };
  const e = s.empresaId, per = s.periodoId;
  switch (tipo) {
    case "listado-cuentas": return { informe: reports.listadoCuentas(db, e) };
    case "listado-ccostos": return { informe: reports.listadoCcostos(db, e) };
    case "listado-proveedores": return { informe: reports.listadoProveedores(db, e) };
    case "comprobante": {
      const id = Number(p.id);
      if (db.asiento(id)?.periodo_id !== per) return { error: "El comprobante no pertenece al año de trabajo." };
      return { informe: reports.comprobante(db, e, id) };
    }
  }
  if (!(tipo in INFORMES)) return { error: "Informe desconocido." };
  const cfg = INFORMES[tipo as TipoInforme] as { sinDesde?: boolean; tipo?: boolean; cuentas?: boolean; ccosto?: boolean };
  const desde = cfg.sinDesde ? null : util.fromIso(p.desde);
  const hasta = util.fromIso(p.hasta);
  const emision = util.fromIso(p.emision) || util.hoyIso();
  if ((!cfg.sinDesde && !desde) || !hasta) return { error: "Ingresa las fechas del informe." };
  if (desde && hasta < desde) return { error: "La fecha Hasta debe ser mayor o igual a Desde." };
  switch (tipo as TipoInforme) {
    case "libro-diario": return { informe: reports.libroDiario(db, e, per, desde, hasta, null, emision) };
    case "libro-diario-tipo": {
      const t = (p.tipo || "").toUpperCase();
      if (!(t in util.TIPOS_ASIENTO)) return { error: "Selecciona el tipo de asiento." };
      return { informe: reports.libroDiario(db, e, per, desde, hasta, t, emision) };
    }
    case "libro-mayor": {
      if (!p.cdesde || !p.chasta) return { error: "Selecciona las cuentas desde y hasta." };
      const [d, h] = [p.cdesde, p.chasta].sort();
      return { informe: reports.libroMayor(db, e, per, desde, hasta, d, h, emision) };
    }
    case "balance-8": return { informe: reports.balance8Columnas(db, e, per, desde, hasta, emision) };
    case "balance-tipo-informe": return { informe: reports.balanceTipoInforme(db, e, per, hasta, emision) };
    case "libro-compras": {
      const cc = p.cc === undefined || p.cc === TODOS_CC ? null : p.cc;
      return { informe: reports.libroCompras(db, e, per, desde, hasta, cc, emision) };
    }
  }
}
