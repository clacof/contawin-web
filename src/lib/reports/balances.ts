/** Balance de 8 columnas y balance tipo informe — reports/balances.py. */
import * as util from "../util";
import type { Database } from "../db";
import { columna, fila, informe, Informe, membrete, SUBTOTAL, TOTAL } from "./modelo";

export const TEXTO_ART100 = [
  "Artículo 100 Código Tributario: Dejo constancia que la contabilidad de este ejercicio, así como el " +
  "Inventario y Balance",
  "correspondiente, han sido confeccionados por el contador en base a datos fidedignos que le han " +
  "proporcionado.",
];

const CLAVES = ["debitos", "creditos", "deudor", "acreedor", "activo", "pasivo", "perdida", "ganancia"] as const;
type Clave = (typeof CLAVES)[number];
export interface FilaBalance extends Record<Clave, number> { codigo: string; nombre: string }
export interface Balance8 {
  filas: FilaBalance[];
  totales: Partial<Record<Clave, number>>;
  resultado: { activo: number; pasivo: number; perdida: number; ganancia: number };
  es_ganancia: boolean;
  sumas: Partial<Record<Clave, number>>;
}

export function calcularBalance8(db: Database, empresaId: number, periodoId: number, desde: util.FechaEntrada,
  hasta: util.FechaEntrada): Balance8 {
  const filas: FilaBalance[] = [];
  const tot: Partial<Record<Clave, number>> = {};      // defaultdict(int)
  const sums: Record<string, [number, number]> = {};
  for (const r of db.q<{ codigo: string; d: number; h: number }>(
    `SELECT d.codigo, SUM(d.debe) d, SUM(d.haber) h FROM detalle d JOIN asiento a ON a.id=d.asiento_id
           WHERE a.periodo_id=? AND a.fecha>=? AND a.fecha<=? GROUP BY d.codigo`,
    [periodoId, util.toIso(desde), util.toIso(hasta)])) sums[r.codigo] = [r.d, r.h];
  const nombres = Object.fromEntries(db.cuentas(empresaId).map((c) => [c.codigo, c.nombre]));
  for (const codigo of Object.keys(sums).sort()) {
    const [deb, cre] = sums[codigo];
    const dif = deb - cre;
    const [deudor, acreedor] = dif > 0 ? [dif, 0] : [0, -dif];
    let activo = 0, pasivo = 0, perdida = 0, ganancia = 0;
    const t = codigo.slice(0, 1);
    if (t === "1" || t === "2") [activo, pasivo] = [deudor, acreedor];
    else if (t === "3" || t === "4") [perdida, ganancia] = [deudor, acreedor];
    const f: FilaBalance = { codigo, nombre: nombres[codigo] ?? "(cuenta no existe)", debitos: deb, creditos: cre,
      deudor, acreedor, activo, pasivo, perdida, ganancia };
    filas.push(f);
    for (const k of CLAVES) tot[k] = (tot[k] ?? 0) + f[k];
  }
  // Resultado del ejercicio
  const g = (k: Clave) => tot[k] ?? 0;
  const cal2 = g("ganancia") - g("perdida");
  const cal3 = g("activo") - g("pasivo");
  const res = { activo: 0, pasivo: 0, perdida: 0, ganancia: 0 };
  if (cal2 > 0) res.perdida = cal2; else res.ganancia = -cal2;
  if (cal3 > 0) res.pasivo = cal3; else res.activo = -cal3;
  const esGanancia = cal3 > 0;
  const sumas: Partial<Record<Clave, number>> = { ...tot };
  for (const k of ["activo", "pasivo", "perdida", "ganancia"] as const) sumas[k] = g(k) + res[k];
  return { filas, totales: { ...tot }, resultado: res, es_ganancia: esGanancia, sumas };
}

export function balance8Columnas(db: Database, empresaId: number, periodoId: number, desde: util.FechaEntrada,
  hasta: util.FechaEntrada, emision: string | null = null): Informe {
  const emp = db.empresa(empresaId)!;
  const b = calcularBalance8(db, empresaId, periodoId, desde, hasta);
  const inf = informe({
    titulo: "B A L A N C E    G E N E R A L",
    subtitulos: [`Ejercicio  DESDE : ${util.fmtFecha(desde)}   HASTA : ${util.fmtFecha(hasta)}`],
    datosCabecera: [`Empresa   : ${emp.razon_social}`, `R.U.T.    : ${util.formatoRut(emp.rut)}`,
      `Dirección : ${emp.direccion}`, `Ciudad    : ${emp.ciudad}`, `Giro      : ${emp.giro}`,
      "S A L D O S  (Deudor / Acreedor)  ·  I N V E N T A R I O  (Activo / Pasivo)  ·  " +
      "R E S U L T A D O  (Pérdida / Ganancia)"],
    columnas: [columna("CÓDIGO", 0.9, "c"), columna("C U E N T A", 2.4),
      ...["DÉBITOS", "CRÉDITOS", "DEUDOR", "ACREEDOR", "ACTIVO", "PASIVO", "PÉRDIDA", "GANANCIA"].map((t) => columna(t, 1.15, "m"))],
    horizontal: true, fechaEmision: emision || util.hoyIso(), nombreArchivo: "balance_8_columnas",
    pie: TEXTO_ART100, firmas: ["CONTADOR", "CONTRIBUYENTE O REPRESENTANTE LEGAL"],
  });
  for (const f of b.filas) inf.filas.push(fila([f.codigo, f.nombre, ...CLAVES.map((k) => f[k])]));
  const t = b.totales;
  inf.filas.push(fila(["", "T O T A L E S", ...CLAVES.map((k) => t[k] ?? 0)], TOTAL));
  const r = b.resultado;
  inf.filas.push(fila(["", b.es_ganancia ? "G A N A N C I A" : "P E R D I D A", "", "", "", "",
    r.activo, r.pasivo, r.perdida, r.ganancia], SUBTOTAL));
  const s = b.sumas;
  inf.filas.push(fila(["", "S U M A S", ...CLAVES.map((k) => s[k] ?? 0)], TOTAL));
  return inf;
}

/**
 * Saldo de cada cuenta desde el inicio del año hasta la fecha, agrupado por el primer
 * dígito del código. Grupo 1: Debe - Haber; resto: Haber - Debe.
 */
export function balanceTipoInforme(db: Database, empresaId: number, periodoId: number, hasta: util.FechaEntrada,
  emision: string | null = null): Informe {
  const emp = db.empresa(empresaId)!;
  const sums: Record<string, [number, number]> = {};
  for (const r of db.q<{ codigo: string; d: number; h: number }>(
    `SELECT d.codigo, SUM(d.debe) d, SUM(d.haber) h FROM detalle d JOIN asiento a ON a.id=d.asiento_id
           WHERE a.periodo_id=? AND a.fecha<=? GROUP BY d.codigo`, [periodoId, util.toIso(hasta)])) sums[r.codigo] = [r.d, r.h];
  const inf = informe({
    titulo: `BALANCE TIPO INFORME   HASTA EL < ${util.fmtFecha(hasta)} >`, subtitulos: [emp.razon_social],
    membrete: membrete(emp),
    columnas: [columna("Código", 1, "c"), columna("Cuenta", 4), columna("S a l d o", 1.6, "m"), columna("SubTotal", 1.6, "m")],
    fechaEmision: emision || util.hoyIso(), nombreArchivo: "balance_tipo_informe",
  });
  let grupoActual: string | null = null, sub = 0, subTiene = false;
  for (const c of db.cuentas(empresaId)) {
    const [d, h] = sums[c.codigo] ?? [0, 0];
    const g = c.codigo.slice(0, 1);
    if (grupoActual !== null && g !== grupoActual && subTiene) inf.filas.push(fila(["", "", "", sub], SUBTOTAL));
    if (g !== grupoActual) { grupoActual = g; sub = 0; subTiene = false; }
    const total = g === "1" ? d - h : h - d;
    if (total !== 0) {
      inf.filas.push(fila([c.codigo, c.nombre, total, ""]));
      sub += total;
      subTiene = true;
    }
  }
  if (grupoActual !== null && subTiene) inf.filas.push(fila(["", "", "", sub], SUBTOTAL));
  return inf;
}
