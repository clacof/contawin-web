/** Comprobante, libro diario (y por tipo) y libro mayor — reports/libros.py. */
import * as util from "../util";
import type { Asiento, Database, Detalle } from "../db";
import { columna, ENCABEZADO_ASIENTO, fila, GRUPO, informe, Informe, membrete, rango, SUBTOTAL, TOTAL } from "./modelo";

// ---------------------------------------------------------------------------
// Comprobante contable
// ---------------------------------------------------------------------------
export function comprobante(db: Database, empresaId: number, asientoId: number, emision: string | null = null): Informe {
  const emp = db.empresa(empresaId);
  const a = db.asiento(asientoId)!;
  const lineas = db.detalleAsiento(asientoId);
  const inf = informe({
    titulo: `COMPROBANTE  ${util.nombreTipoAsiento(a.tipo).toUpperCase()}`,
    membrete: membrete(emp),
    datosCabecera: [
      `Folio N° : ${util.fmtMonto(a.numero)}        Fecha : ${util.fmtFecha(a.fecha)}`,
      `GLOSA : ${a.glosa}`,
      `CENTRO DE COSTO : ${db.nombreCcosto(empresaId, a.cdcosto) || a.cdcosto}`,
    ],
    columnas: [columna("N°", 0.5, "t", { alinear: "C" }), columna("CÓDIGO", 1.1, "c"),
      columna("DESCRIPCIÓN CUENTA", 4), columna("DEBE", 1.6, "m"), columna("HABER", 1.6, "m")],
    fechaEmision: emision || util.hoyIso(),
    nombreArchivo: `comprobante_${a.numero}`,
    firmas: ["DIGITADO", "V°B° CONTABILIDAD"],
  });
  let td = 0, th = 0;
  const detallesDoc: string[] = [];
  lineas.forEach((l, idx) => {
    inf.filas.push(fila([String(idx + 1).padStart(2, "0"), l.codigo, db.nombreCuenta(empresaId, l.codigo), l.debe, l.haber]));
    td += l.debe;
    th += l.haber;
    const d = l.documento;
    if (d) {
      detallesDoc.push(
        `${util.siglaDocumento(d.tdocum)} N° ${util.fmtMonto(d.numero_doc)} del ` +
        `${util.fmtFecha(d.fecha_doc)} - ${util.formatoRut(d.rut_prov)} ` +
        `${db.nombreProveedor(empresaId, d.rut_prov)}` + (d.detalle ? ` - ${d.detalle}` : ""));
    }
  });
  inf.filas.push(fila(["", "", "T O T A L   A S I E N T O", td, th], TOTAL));
  if (detallesDoc.length) inf.pie = ["Documentos:", ...detallesDoc.map((t) => "   " + t)];
  return inf;
}

// ---------------------------------------------------------------------------
// Libro diario (y libro diario por tipo)
// ---------------------------------------------------------------------------
export function libroDiario(db: Database, empresaId: number, periodoId: number, desde: util.FechaEntrada,
  hasta: util.FechaEntrada, tipo: string | null = null, emision: string | null = null): Informe {
  const emp = db.empresa(empresaId);
  const nombres = Object.fromEntries(db.cuentas(empresaId).map((c) => [c.codigo, c.nombre]));
  const sql = ["SELECT * FROM asiento WHERE periodo_id=? AND fecha>=? AND fecha<=?"];
  const p: unknown[] = [periodoId, util.toIso(desde), util.toIso(hasta)];
  if (tipo) {
    sql.push("AND tipo=?");
    p.push(tipo);
    sql.push("ORDER BY tipo, fecha, numero");
  } else {
    sql.push("ORDER BY fecha, numero");
  }
  const asientos = db.q<Asiento>(sql.join(" "), p);

  const titulo = "LIBRO DIARIO" + (tipo ? ` POR TIPO  (${util.nombreTipoAsiento(tipo).toUpperCase()})` : "");
  const inf = informe({
    titulo, subtitulos: [rango(desde, hasta)], membrete: membrete(emp),
    columnas: [columna("Número", 0.8, "t", { alinear: "R" }), columna("Fecha", 1, "f"), columna("Cuenta", 0.9, "c"),
      columna("Nombre / Glosa", 3.6), columna("D E B E", 1.3, "m"), columna("H A B E R", 1.3, "m"),
      columna("Tot. DEBE", 1.3, "m"), columna("Tot. HABER", 1.3, "m")],
    fechaEmision: emision || util.hoyIso(), totalesPagina: [6, 7],
    nombreArchivo: "libro_diario" + (tipo ? `_${tipo}` : ""),
  });
  let gd = 0, gh = 0;
  for (const a of asientos) {
    inf.filas.push(fila([String(a.numero).padStart(6, "0"), a.fecha, "", a.glosa, "", "", a.debe, a.haber], ENCABEZADO_ASIENTO));
    for (const d of db.q<Detalle>("SELECT * FROM detalle WHERE asiento_id=? ORDER BY linea, id", [a.id]))
      inf.filas.push(fila(["", "", d.codigo, nombres[d.codigo] ?? "", d.debe, d.haber, "", ""]));
    gd += a.debe;
    gh += a.haber;
  }
  inf.filas.push(fila(["", "", "", "TOTAL ..............", "", "", gd, gh], TOTAL));
  return inf;
}

// ---------------------------------------------------------------------------
// Libro mayor
// ---------------------------------------------------------------------------
export function saldoTxt(saldo: number): string {
  if (saldo === 0) return "0";
  return `${util.fmtMonto(Math.abs(saldo))} ${saldo > 0 ? "D" : "A"}`;
}

/** Movimientos por cuenta con saldo anterior (arrastre) y saldo acumulado (Deudor D / Acreedor A = Debe - Haber). */
export function libroMayor(db: Database, empresaId: number, periodoId: number, desde: util.FechaEntrada,
  hasta: util.FechaEntrada, codDesde: string | null = null, codHasta: string | null = null,
  emision: string | null = null): Informe {
  const emp = db.empresa(empresaId);
  const desdeIso = util.toIso(desde), hastaIso = util.toIso(hasta);
  let cuentas = db.cuentas(empresaId);
  if (codDesde) cuentas = cuentas.filter((c) => c.codigo >= codDesde);
  if (codHasta) cuentas = cuentas.filter((c) => c.codigo <= codHasta);
  const inf = informe({
    titulo: "LIBRO MAYOR", subtitulos: [rango(desde, hasta)], membrete: membrete(emp),
    columnas: [columna("Número", 0.8, "t", { alinear: "R" }), columna("Fecha", 1, "f"), columna("G l o s a", 4.2),
      columna("D e b e", 1.4, "m"), columna("H a b e r", 1.4, "m"), columna("S a l d o", 1.6, "t", { alinear: "R" })],
    fechaEmision: emision || util.hoyIso(), nombreArchivo: "libro_mayor",
  });
  for (const c of cuentas) {
    const movs = db.q<{ numero: number; fecha: string; glosa: string; debe: number; haber: number }>(
      `SELECT a.numero, a.fecha, a.glosa, d.debe, d.haber FROM detalle d
                       JOIN asiento a ON a.id=d.asiento_id
                       WHERE a.periodo_id=? AND d.codigo=? AND a.fecha>=? AND a.fecha<=?
                       ORDER BY a.fecha, a.numero, d.linea`, [periodoId, c.codigo, desdeIso, hastaIso]);
    if (!movs.length) continue;
    const ant = db.q1<{ d: number; h: number }>(`SELECT COALESCE(SUM(d.debe),0) d, COALESCE(SUM(d.haber),0) h FROM detalle d
                       JOIN asiento a ON a.id=d.asiento_id
                       WHERE a.periodo_id=? AND d.codigo=? AND a.fecha<?`, [periodoId, c.codigo, desdeIso])!;
    let saldo = ant.d - ant.h;
    inf.filas.push(fila([], GRUPO, `${util.formatoCodigo(c.codigo)}   ${c.nombre}`));
    inf.filas.push(fila(["", "", " A R R A S T R E  (saldo anterior)", ant.d, ant.h, saldoTxt(saldo)], SUBTOTAL));
    let td = 0, th = 0;
    for (const m of movs) {
      saldo += m.debe - m.haber;
      td += m.debe;
      th += m.haber;
      inf.filas.push(fila([util.fmtMonto(m.numero), m.fecha, m.glosa, m.debe, m.haber, saldoTxt(saldo)]));
    }
    inf.filas.push(fila(["", "", " TOTAL PERÍODO / S A L D O", td, th, saldoTxt(saldo)], TOTAL));
  }
  return inf;
}
