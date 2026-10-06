/** Libro de compras — reports/compras.py. */
import * as util from "../util";
import type { Database, MovimientoCompra } from "../db";
import { columna, fila, GRUPO, informe, Informe, membrete, rango, SUBTOTAL, TOTAL } from "./modelo";

export function netoIvaTotal(c: { neto: number; iva: number; total: number; adicional?: number }): [number, number, number] {
  let neto = c.neto;
  const iva = c.iva, total = c.total;
  if (!neto && !iva) neto = total - (c.adicional !== undefined ? c.adicional : 0);
  return [neto, iva, total];
}

/** cdcosto=null -> todos los centros de costo (cada uno con su subtotal). */
export function libroCompras(db: Database, empresaId: number, periodoId: number, desde: util.FechaEntrada,
  hasta: util.FechaEntrada, cdcosto: string | null = null, emision: string | null = null): Informe {
  const emp = db.empresa(empresaId);
  const compras = db.compras(periodoId, desde, hasta, cdcosto);
  const proveedores = Object.fromEntries(db.proveedores(empresaId).map((p) => [p.rut, p.nombre]));
  const ccostos = Object.fromEntries(db.ccostos(empresaId).map((c) => [c.codigo, c.nombre]));
  const inf = informe({
    titulo: "LIBRO DE COMPRAS", subtitulos: [rango(desde, hasta)], membrete: membrete(emp),
    columnas: [columna("Tipo Doc.", 0.8), columna("Cuenta", 0.8, "c"), columna("N° Documento", 1, "m"),
      columna("Fecha", 0.8, "f"), columna("R.U.T.", 1, "r"), columna("Nombre", 2.4),
      columna("Detalle", 2.4), columna("NETO", 1, "m", { vacioSiCero: false }),
      columna("I.V.A.", 0.9, "m", { vacioSiCero: false }), columna("TOTAL", 1, "m", { vacioSiCero: false }),
      columna("Fec. Pago", 0.8, "f")],
    horizontal: true, fechaEmision: emision || util.hoyIso(), nombreArchivo: "libro_compras",
  });
  const grupos = new Map<string, MovimientoCompra[]>();
  for (const c of compras) {
    const k = c.cdcosto || "";
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(c);
  }
  let gn = 0, gi = 0, gt = 0;
  for (const cc of [...grupos.keys()].sort()) {
    const nom = cc ? (ccostos[cc] ?? "") : "SIN CENTRO DE COSTO";
    inf.filas.push(fila([], GRUPO, `Centro de Costos  ${cc}   ${nom}`));
    let pn = 0, pi = 0, pt = 0;
    for (const c of grupos.get(cc)!) {
      const [neto, iva, total] = netoIvaTotal(c);
      inf.filas.push(fila([util.siglaDocumento(c.tdocum), c.ccuenta, c.numero_doc, c.fecha_doc, c.rut_prov,
        proveedores[c.rut_prov] ?? "", c.detalle, neto, iva, total, c.fecha_pago]));
      pn += neto; pi += iva; pt += total;
    }
    inf.filas.push(fila(["", "", "", "", "", "", "TOTAL CENTRO DE COSTO -->", pn, pi, pt, ""], SUBTOTAL));
    gn += pn; gi += pi; gt += pt;
  }
  inf.filas.push(fila(["", "", "", "", "", "", "TOTAL GENERAL -->", gn, gi, gt, ""], TOTAL));
  return inf;
}
