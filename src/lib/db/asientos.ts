/** Comprobantes contables: cabecera, detalle y documento de compra — db/asientos.py. */
import * as util from "../util";
import { CatalogosRepo } from "./catalogos";
import { ErrorDatos } from "./errores";
import type { Asiento, CabeceraAsiento, LineaAsiento, LineaEntrada } from "./tipos";

const n = (v: unknown) => util.pyInt(v || 0);

const SQL_DETALLE = `SELECT d.id detalle_id, d.asiento_id, d.linea, d.codigo, d.debe, d.haber, d.fecha,
                            c.tdocum, c.fecha_doc, c.numero_doc, c.rut_prov, c.neto, c.iva,
                            c.adicional, c.total, c.cdcosto c_cdcosto, c.detalle c_detalle,
                            c.fecha_pago, c.id compra_id
                     FROM detalle d LEFT JOIN compra c ON c.detalle_id=d.id`;

function lineaAsiento(f: Record<string, never>): LineaAsiento {
  return {
    codigo: f.codigo, debe: f.debe, haber: f.haber,
    documento: f.compra_id ? {
      tdocum: f.tdocum, fecha_doc: f.fecha_doc, numero_doc: f.numero_doc, rut_prov: f.rut_prov, neto: f.neto,
      iva: f.iva, adicional: f.adicional, total: f.total, cdcosto: f.c_cdcosto, detalle: f.c_detalle,
      fecha_pago: f.fecha_pago,
    } : null,
  };
}

export class AsientosRepo extends CatalogosRepo {
  asientos(periodoId: number, orden = "numero"): Promise<Asiento[]> {
    const ordenes: Record<string, string> = { numero: "numero", fecha: "fecha, numero", tipo: "tipo, fecha, numero" };
    return this.q(`SELECT * FROM asiento WHERE periodo_id=? ORDER BY ${ordenes[orden] ?? "numero"}`, [periodoId]);
  }

  asiento(asientoId: number): Promise<Asiento | undefined> {
    return this.q1("SELECT * FROM asiento WHERE id=?", [asientoId]);
  }

  async rangoFechas(periodoId: number): Promise<[string | null, string | null]> {
    const r = await this.q1<{ d: string | null; h: string | null }>(
      "SELECT MIN(fecha) d, MAX(fecha) h FROM asiento WHERE periodo_id=? AND fecha IS NOT NULL", [periodoId]);
    return r && r.d ? [util.fromIso(r.d), util.fromIso(r.h)] : [null, null];
  }

  /** Líneas del asiento con su documento de compra (si tiene). */
  async detalleAsiento(asientoId: number): Promise<LineaAsiento[]> {
    return (await this.q<Record<string, never>>(`${SQL_DETALLE} WHERE d.asiento_id=? ORDER BY d.linea, d.id`, [asientoId]))
      .map(lineaAsiento);
  }

  /** detalleAsiento de todos los asientos del año en una sola consulta (asiento_id -> líneas). */
  async detallesPeriodo(periodoId: number): Promise<Map<number, LineaAsiento[]>> {
    const r = new Map<number, LineaAsiento[]>();
    for (const f of await this.q<Record<string, never>>(`${SQL_DETALLE} JOIN asiento a ON a.id=d.asiento_id
                          WHERE a.periodo_id=? ORDER BY d.asiento_id, d.linea, d.id`, [periodoId])) {
      if (!r.has(f.asiento_id)) r.set(f.asiento_id, []);
      r.get(f.asiento_id)!.push(lineaAsiento(f));
    }
    return r;
  }

  async siguienteNumero(periodoId: number): Promise<number> {
    return ((await this.q1<{ m: number | null }>("SELECT MAX(numero) m FROM asiento WHERE periodo_id=?", [periodoId]))!.m || 0) + 1;
  }

  /** Mayor fecha de los asientos del año (puede ser NULL). */
  fechaUltimoAsiento(periodoId: number): Promise<{ f: string | null } | undefined> {
    return this.q1("SELECT MAX(fecha) f FROM asiento WHERE periodo_id=?", [periodoId]);
  }

  /** Cantidad de asientos del año con debe distinto de haber. */
  async cantidadDescuadrados(periodoId: number): Promise<number> {
    return (await this.q1<{ n: number }>("SELECT COUNT(*) n FROM asiento WHERE periodo_id=? AND debe<>haber", [periodoId]))!.n;
  }

  /**
   * GAsien(): valida cuadratura y graba cabecera + detalle + compras.
   * cab: tipo, fecha, glosa, cdcosto — lineas: [{codigo, debe, haber, documento}]
   */
  async guardarAsiento(periodoId: number, cab: CabeceraAsiento, lineas: LineaEntrada[], asientoId: number | null = null): Promise<number> {
    const totDebe = lineas.reduce((s, l) => s + n(l.debe), 0);
    const totHaber = lineas.reduce((s, l) => s + n(l.haber), 0);
    if (totDebe !== totHaber)
      throw new ErrorDatos("Las sumas del comprobante no están cuadradas.\nRevise e inténtelo nuevamente.");
    if (!lineas.length) throw new ErrorDatos("El asiento no tiene líneas de detalle.");
    const tipo = (cab.tipo || "").toUpperCase();
    if (!(tipo in util.TIPOS_ASIENTO))
      throw new ErrorDatos("El tipo de asiento debe ser I (Ingreso), E (Egreso) o T (Traspaso).");
    const fecha = util.toIso(cab.fecha);
    if (!fecha) throw new ErrorDatos("Debe ingresar la fecha.");
    const glosa = (cab.glosa || "").trim().toUpperCase();
    if (!glosa) throw new ErrorDatos("Debe ingresar la glosa.");
    const cdcosto = (cab.cdcosto || "").trim().toUpperCase();
    return this.transaccion(async (c) => {
      if (asientoId === null) {
        const numero = cab.numero || await c.siguienteNumero(periodoId);
        asientoId = await c.execute(
          "INSERT INTO asiento(periodo_id,numero,tipo,fecha,glosa,debe,haber,cdcosto) VALUES (?,?,?,?,?,?,?,?)",
          [periodoId, numero, tipo, fecha, glosa, totDebe, totHaber, cdcosto]);
      } else {
        await c.execute("UPDATE asiento SET tipo=?,fecha=?,glosa=?,debe=?,haber=?,cdcosto=? WHERE id=?",
          [tipo, fecha, glosa, totDebe, totHaber, cdcosto, asientoId]);
        await c.execute("DELETE FROM detalle WHERE asiento_id=?", [asientoId]);
      }
      for (const [i, l] of lineas.entries()) {
        const detId = await c.execute(
          "INSERT INTO detalle(asiento_id,linea,codigo,debe,haber,fecha) VALUES (?,?,?,?,?,?)",
          [asientoId, i + 1, l.codigo, n(l.debe), n(l.haber), fecha]);
        const d = l.documento;
        if (d && n(d.numero_doc) !== 0) {
          await c.execute(
            "INSERT INTO compra(detalle_id,tdocum,fecha_doc,numero_doc,rut_prov,neto,iva," +
            "adicional,total,cdcosto,detalle,fecha_pago) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            [detId, util.pyInt(d.tdocum || 1), util.toIso(d.fecha_doc), n(d.numero_doc), util.limpiarRut(d.rut_prov),
              n(d.neto), n(d.iva), n(d.adicional), n(d.total), (d.cdcosto || cdcosto || "").trim().toUpperCase(),
              (d.detalle || "").trim().toUpperCase(), util.toIso(d.fecha_pago)]);
        }
      }
      return asientoId!;
    });
  }

  async borrarAsiento(asientoId: number) {
    await this.transaccion(async (c) => {
      await c.execute("DELETE FROM asiento WHERE id=?", [asientoId]);
      await c.execute("DELETE FROM parametro WHERE clave LIKE 'apertura:%' AND valor=?", [String(asientoId)]);
    });
  }
}
