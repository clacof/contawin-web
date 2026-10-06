/** Volcado de informes y reglas de la versión web (mismo formato que dump_py.py). */
import fs from "node:fs";
import * as util from "../../src/lib/util";
import { Database, ErrorDatos } from "../../src/lib/db";
import * as reports from "../../src/lib/reports";
const [src, dst, out] = process.argv.slice(2);
fs.copyFileSync(src, dst);
const db = new Database(dst);
const R: Record<string, unknown> = {};
const al = (c: reports.Columna) => reports.alineacion(c);
const inf2 = (i: reports.Informe) => ({ titulo: i.titulo, columnas: i.columnas.map((c) => [c.titulo, c.ancho, c.formato, al(c), c.vacioSiCero]),
  filas: i.filas.map((f) => [f.valores, f.estilo, f.texto, f.estilo !== "grupo" ? reports.textos(i, f) : []]),
  subtitulos: i.subtitulos, membrete: i.membrete, cab: i.datosCabecera, pie: i.pie, firmas: i.firmas,
  horizontal: i.horizontal, tp: i.totalesPagina, nombre: i.nombreArchivo });
const E = "2026-10-05";
for (const e of db.empresas()) {
  const eid = e.id;
  R[`list_c_${eid}`] = inf2(reports.listadoCuentas(db, eid)); R[`list_cc_${eid}`] = inf2(reports.listadoCcostos(db, eid)); R[`list_p_${eid}`] = inf2(reports.listadoProveedores(db, eid));
  R[`sug_${eid}`] = db.cuentaResultadoSugerida(eid);
  for (const p of db.periodos(eid)) {
    const pid = p.id, a = p.ano, d = `${a}-01-01`, h = `${a}-12-31`;
    R[`rango_${pid}`] = db.rangoFechas(pid); R[`rangoc_${pid}`] = db.rangoFechasCompras(pid);
    R[`diario_${pid}`] = inf2(reports.libroDiario(db, eid, pid, d, h, null, E));
    for (const t of "IET") R[`diario_${t}_${pid}`] = inf2(reports.libroDiario(db, eid, pid, d, h, t, E));
    R[`mayor_${pid}`] = inf2(reports.libroMayor(db, eid, pid, `${a}-03-01`, h, null, null, E));
    R[`mayor2_${pid}`] = inf2(reports.libroMayor(db, eid, pid, d, h, "110000", "299999", E));
    R[`b8_${pid}`] = inf2(reports.balance8Columnas(db, eid, pid, d, h, E));
    R[`b8m_${pid}`] = inf2(reports.balance8Columnas(db, eid, pid, `${a}-02-01`, `${a}-06-30`, E));
    R[`bti_${pid}`] = inf2(reports.balanceTipoInforme(db, eid, pid, `${a}-07-31`, E));
    R[`lc_${pid}`] = inf2(reports.libroCompras(db, eid, pid, d, h, null, E));
    for (const cc of [...db.ccostos(eid).map((c) => c.codigo), ""]) R[`lc_${pid}_${cc}`] = inf2(reports.libroCompras(db, eid, pid, d, h, cc, E));
    R[`sc_${pid}`] = db.saldosCierre(pid);
    R[`desc_${pid}`] = db.cantidadDescuadrados(pid);
    for (const x of db.asientos(pid, "tipo")) {
      R[`comp_${x.id}`] = inf2(reports.comprobante(db, eid, x.id, E));
      R[`det_${x.id}`] = db.detalleAsiento(x.id);
    }
    try { R[`la_${pid}`] = db.lineasApertura(pid, R[`sug_${eid}`] as string | null); } catch (ex) { R[`la_${pid}`] = (ex as ErrorDatos).message; }
  }
}
R.list_e = inf2(reports.listadoEmpresas(db));
R.login = [["admin", "admin"], ["cac", "cac"], ["conta", "conta"], ["admin", "x"]].map(([u, c]) => !!db.login(u, c));
R.usuarios = db.usuarios();
const vals = ["76.127.217-9", "96792430K", "76127217-8", "1", "k", "12.345.678-5", "", "abc", "10.411.341-9", "1-9", "0-0"];
R.rut = vals.map((v) => [util.validarRut(v), util.formatoRut(v), util.formatoRutSimple(v), util.limpiarRut(v)]);
R.mon = [0, 1, -1500, 1234567, 2.5, 3.5, -2.5, 999999999999, "12", "x", null].map((v) => [util.fmtMonto(v), util.fmtMonto(v, true), util.fmtPesos(v)]);
R.parse = ["1.234.567", "-1.500", "12,5", "12,6", "", " - ", "abc", "1e3", "2,5", "3,5", 7.5].map((v) => util.parseMonto(v));
R.fechas = ["20170103", "2017-01-03", "3/1/2017", "03/01/2017", "2023-02-30", "2024-02-29", "", "x"].map((v) => [util.toIso(v), util.fromIso(v), util.fmtFecha(v), util.fechaTexto(v)]);
R.cod = ["100001", "10", "1000011", "10.00.01", "ab-cd.ef.gh", ""].map((v) => [util.formatoCodigo(v), util.limpiarCodigo(v)]);
R.iva = [119000, 1000, 1, 2, 3, 59, 595, 1190, 100, 250, 9999, 123457].map((t) => [t, util.pyRound(t / (1 + util.TASA_IVA))]);
const orden = (o: unknown): unknown => Array.isArray(o) ? o.map(orden) : o && typeof o === "object" ? Object.fromEntries(Object.keys(o as object).sort().map((k) => [k, orden((o as Record<string, unknown>)[k])])) : o;
fs.writeFileSync(out, JSON.stringify(orden(R), null, 0));
