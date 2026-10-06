/** Pruebas del núcleo (traducción de tests/test_nucleo.py de ContaWinPy). Ejecutar: npm test */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Database, ErrorDatos } from "../src/lib/db";
import * as reports from "../src/lib/reports";
import { exportarCsv, exportarXlsx } from "../src/lib/reports/exportar";
import { informePdf } from "../src/lib/reports/pdf";
import * as util from "../src/lib/util";

describe("util", () => {
  it("rut", () => {
    expect(util.validarRut("76.127.217-9")).toBe(true);
    expect(util.validarRut("96792430K")).toBe(true);
    expect(util.validarRut("76127217-8")).toBe(false);
    expect(util.formatoRut("761272179")).toBe("76.127.217-9");
    expect(util.limpiarRut("10.411.341-9")).toBe("104113419");
  });
  it("formatos", () => {
    expect(util.formatoCodigo("100001")).toBe("10.00.01");
    expect(util.fmtMonto(1234567)).toBe("1.234.567");
    expect(util.fmtMonto(-1500)).toBe("-1.500");
    expect(util.parseMonto("1.234.567")).toBe(1234567);
    expect(util.toIso("20170103")).toBe("2017-01-03");
    expect(util.fmtFecha("2017-01-03")).toBe("03/01/2017");
    expect(util.pyRound(2.5)).toBe(2);         // round() de Python: mitad al par
    expect(util.pyRound(3.5)).toBe(4);
  });
});

describe("contabilidad", () => {
  let tmp: string, db: Database, emp: number, per: number;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cw-"));
    db = new Database(path.join(tmp, "t.db"));
    emp = db.guardarEmpresa({ rut: "76.127.217-9", razon_social: "Empresa de prueba", directorio: "PRUEBA", ciudad: "Chillán" }, null, 2026);
    per = db.periodos(emp)[0].id;
    for (const [cod, nom, doc] of [["110101", "CAJA", 0], ["110201", "BANCO", 0], ["210101", "PROVEEDORES", 0],
      ["310101", "MATERIALES", 1], ["410101", "VENTAS", 0]] as const) db.guardarCuenta(emp, cod, nom, !!doc, true);
    db.guardarCcosto(emp, "01", "General", true);
    db.guardarProveedor(emp, { rut: "96792430-K", nombre: "Sodimac" }, true);
  });
  afterEach(() => { db.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

  const asientos = () => {
    db.guardarAsiento(per, { tipo: "I", fecha: "2026-01-02", glosa: "apertura" }, [
      { codigo: "110101", debe: 500000, haber: 0 }, { codigo: "410101", debe: 0, haber: 500000 }]);
    db.guardarAsiento(per, { tipo: "E", fecha: "2026-02-10", glosa: "compra", cdcosto: "01" }, [
      { codigo: "310101", debe: 119000, haber: 0,
        documento: { tdocum: 11, numero_doc: 555, fecha_doc: "2026-02-09", rut_prov: "96792430K", neto: 100000, iva: 19000, total: 119000, detalle: "pintura" } },
      { codigo: "110101", debe: 0, haber: 119000 }]);
  };

  it("descuadrado", () => {
    expect(() => db.guardarAsiento(per, { tipo: "T", fecha: "2026-01-01", glosa: "x" }, [{ codigo: "110101", debe: 10, haber: 0 }]))
      .toThrow(ErrorDatos);
  });

  it("numeración y modificación", () => {
    asientos();
    expect(db.asientos(per).map((a) => a.numero)).toEqual([1, 2]);
    const a2 = db.asientos(per)[1];
    const lineas = db.detalleAsiento(a2.id);
    expect(lineas[0].documento).not.toBeNull();
    for (const l of lineas) l.documento = null;           // modificar sin documento: la compra debe desaparecer
    db.guardarAsiento(per, a2, lineas, a2.id);
    expect(db.compras(per).length).toBe(0);
    db.borrarAsiento(a2.id);
    expect(db.q1<{ n: number }>("SELECT COUNT(*) n FROM detalle")!.n).toBe(2);
  });

  it("balance 8 columnas", () => {
    asientos();
    const b = reports.calcularBalance8(db, emp, per, "2026-01-01", "2026-12-31");
    expect(b.totales.debitos).toBe(b.totales.creditos);
    expect(b.totales.deudor).toBe(b.totales.acreedor);
    expect(b.sumas.activo).toBe(b.sumas.pasivo);
    expect(b.sumas.perdida).toBe(b.sumas.ganancia);
    expect(b.es_ganancia).toBe(true);                     // utilidad 381.000
    expect(b.resultado.pasivo).toBe(381000);
    expect(b.resultado.perdida).toBe(381000);
  });

  it("informes y exportación", async () => {
    asientos();
    const a = db.asientos(per)[1];
    for (const inf of [
      reports.comprobante(db, emp, a.id),
      reports.libroDiario(db, emp, per, "2026-01-01", "2026-12-31"),
      reports.libroDiario(db, emp, per, "2026-01-01", "2026-12-31", "E"),
      reports.libroMayor(db, emp, per, "2026-02-01", "2026-12-31"),
      reports.balance8Columnas(db, emp, per, "2026-01-01", "2026-12-31"),
      reports.balanceTipoInforme(db, emp, per, "2026-12-31"),
      reports.libroCompras(db, emp, per, "2026-01-01", "2026-12-31"),
      reports.listadoEmpresas(db), reports.listadoCuentas(db, emp), reports.listadoCcostos(db, emp), reports.listadoProveedores(db, emp),
    ]) {
      expect(inf.filas.length, inf.titulo).toBeGreaterThan(0);
      for (const f of inf.filas) if (f.estilo !== reports.GRUPO) expect(f.valores.length, inf.titulo).toBe(inf.columnas.length);
      expect((await exportarXlsx(inf)).length).toBeGreaterThan(0);
      expect(exportarCsv(inf).length).toBeGreaterThan(0);
      expect((await informePdf(inf)).subarray(0, 5).toString()).toBe("%PDF-");
    }
    const mayor = reports.libroMayor(db, emp, per, "2026-02-01", "2026-12-31", "110101", "110101");
    const textos = mayor.filas.filter((f) => f.estilo !== reports.GRUPO).map((f) => f.valores);
    expect(textos[0].at(-1)).toBe("500.000 D");          // arrastre de enero
    expect(textos.at(-1)!.at(-1)).toBe("381.000 D");     // saldo final
  });

  it("apertura del nuevo año", () => {
    asientos();
    db.guardarCuenta(emp, "220101", "RESULTADOS ACUMULADOS", false, true);
    expect(() => db.crearPeriodoConApertura(emp, 2027, per)).toThrow(ErrorDatos);   // sin cuenta para el resultado
    expect(db.periodos(emp).map((p) => p.ano)).toEqual([2026]);
    expect(db.cuentaResultadoSugerida(emp)).toBe("220101");

    const p27 = db.crearPeriodoConApertura(emp, 2027, per, "220101");
    const [a] = db.asientos(p27);
    expect([a.numero, a.tipo, a.fecha]).toEqual([1, "T", "2027-01-01"]);
    const lineas = (id: number) => Object.fromEntries(db.detalleAsiento(id).map((l) => [l.codigo, [l.debe, l.haber]]));
    expect(lineas(a.id)).toEqual({ "110101": [381000, 0], "220101": [0, 381000] });

    db.guardarAsiento(per, { tipo: "T", fecha: "2026-12-31", glosa: "deposito" }, [
      { codigo: "110201", debe: 100000, haber: 0 }, { codigo: "110101", debe: 0, haber: 100000 }]);
    db.guardarAsiento(p27, { tipo: "I", fecha: "2027-01-05", glosa: "venta" }, [
      { codigo: "110101", debe: 1000, haber: 0 }, { codigo: "410101", debe: 0, haber: 1000 }]);
    const aid = db.traspasarApertura(per, p27, "220101");    // regenera: reemplaza el mismo asiento
    expect(aid).toBe(a.id);
    expect(db.asientos(p27).map((x) => x.numero)).toEqual([1, 2]);
    expect(lineas(aid)).toEqual({ "110101": [281000, 0], "110201": [100000, 0], "220101": [0, 381000] });
    expect(() => db.traspasarApertura(p27, per, "220101")).toThrow(ErrorDatos);
  });

  it("usuarios", () => {
    expect(db.login("admin", "admin")).toBeTruthy();
    expect(db.login("admin", "otra")).toBeFalsy();
    db.guardarUsuario("pepe", "Pepe", "1234", false, true);
    expect(db.login("PEPE", "1234")).toBeTruthy();
  });
});
