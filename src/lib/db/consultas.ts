/** Consultas de lectura usadas por los informes — db/consultas.py. */
import * as util from "../util";
import { AperturaRepo } from "./apertura";
import type { MovimientoCompra } from "./tipos";

export interface Movimiento {
  codigo: string; debe: number; haber: number; fecha: string | null; numero: number; glosa: string; tipo: string;
}

export class ConsultasRepo extends AperturaRepo {
  movimientos(periodoId: number, codigo: string | null = null, desde: util.FechaEntrada = null, hasta: util.FechaEntrada = null): Movimiento[] {
    const sql = [`SELECT d.codigo, d.debe, d.haber, a.fecha, a.numero, a.glosa, a.tipo
                  FROM detalle d JOIN asiento a ON a.id=d.asiento_id WHERE a.periodo_id=?`];
    const p: unknown[] = [periodoId];
    if (codigo) { sql.push("AND d.codigo=?"); p.push(codigo); }
    if (desde) { sql.push("AND a.fecha>=?"); p.push(util.toIso(desde)); }
    if (hasta) { sql.push("AND a.fecha<=?"); p.push(util.toIso(hasta)); }
    sql.push("ORDER BY d.codigo, a.fecha, a.numero, d.linea");
    return this.q(sql.join(" "), p);
  }

  compras(periodoId: number, desde: util.FechaEntrada = null, hasta: util.FechaEntrada = null, cdcosto: string | null = null): MovimientoCompra[] {
    const sql = [`SELECT c.*, a.numero nasiento, a.fecha fecha_asiento, d.codigo ccuenta
                  FROM compra c JOIN detalle d ON d.id=c.detalle_id
                  JOIN asiento a ON a.id=d.asiento_id WHERE a.periodo_id=?`];
    const p: unknown[] = [periodoId];
    if (desde) { sql.push("AND c.fecha_doc>=?"); p.push(util.toIso(desde)); }
    if (hasta) { sql.push("AND c.fecha_doc<=?"); p.push(util.toIso(hasta)); }
    if (cdcosto !== null && cdcosto !== undefined) { sql.push("AND c.cdcosto=?"); p.push(cdcosto); }
    sql.push("ORDER BY c.cdcosto, c.fecha_doc, a.numero");
    return this.q(sql.join(" "), p);
  }

  rangoFechasCompras(periodoId: number): [string | null, string | null] {
    const r = this.q1<{ d: string | null; h: string | null }>(`SELECT MIN(c.fecha_doc) d, MAX(c.fecha_doc) h FROM compra c
                       JOIN detalle d ON d.id=c.detalle_id JOIN asiento a ON a.id=d.asiento_id
                       WHERE a.periodo_id=?`, [periodoId]);
    return r && r.d ? [util.fromIso(r.d), util.fromIso(r.h)] : [null, null];
  }
}
