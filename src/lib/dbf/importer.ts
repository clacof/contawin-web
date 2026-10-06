/**
 * Importador de datos del ContaWin original (archivos DBF) a SQLite — contawin/importer.py.
 *
 * Recorre:
 *   <raíz>/EMPRESA.DBF
 *   <raíz>/<DIRECTORIO>/CUENTAS.DBF, CCOSTO.DBF, RESPAL.DBF
 *   <raíz>/<DIRECTORIO>/TRAaaaa/ASIENTOS.DBF, DETASIEN.DBF, COMPRAS.DBF, PROVEE.DBF
 *
 * Los registros marcados como borrados en los DBF no se importan (SET DELETED ON del original).
 */
import fs from "node:fs";
import path from "node:path";
import * as util from "../util";
import type { Database } from "../db";
import { buscarArchivo, buscarCarpeta, Codificacion, esCarpeta, leer, Registro } from "./reader";

export class Resultado {
  empresas = 0; omitidas = 0; periodos = 0; cuentas = 0; ccostos = 0; proveedores = 0;
  asientos = 0; lineas = 0; compras = 0;
  avisos: string[] = [];

  resumen(): string {
    let t = `Empresas importadas: ${this.empresas}` +
      (this.omitidas ? `  (omitidas por existir: ${this.omitidas})` : "") +
      `\nAños: ${this.periodos}\nCuentas: ${this.cuentas}\nCentros de costo: ${this.ccostos}` +
      `\nProveedores: ${this.proveedores}\nAsientos: ${this.asientos}` +
      `\nLíneas de detalle: ${this.lineas}\nDocumentos de compra: ${this.compras}`;
    if (this.avisos.length) {
      t += `\n\nAvisos (${this.avisos.length}):\n- ` + this.avisos.slice(0, 60).join("\n- ");
      if (this.avisos.length > 60) t += `\n... y ${this.avisos.length - 60} más`;
    }
    return t;
  }
}

const S = (v: unknown) => String(v || "").trim();
const I = (v: unknown) => {
  const f = Number(v || 0);
  return Number.isFinite(f) ? util.pyRound(f) : 0;
};

export function anosDisponibles(carpetaEmpresa: string, encoding: Codificacion = "cp1252"): number[] {
  const anos = new Set<number>();
  for (const r of leer(carpetaEmpresa, "RESPAL.DBF", encoding)) {
    const a = I(r.ANO);
    if (a) anos.add(a);
  }
  if (esCarpeta(carpetaEmpresa)) {
    for (const f of fs.readdirSync(carpetaEmpresa)) {
      const m = /^TRA(\d{4})$/i.exec(f);
      if (m && esCarpeta(path.join(carpetaEmpresa, f))) anos.add(parseInt(m[1], 10));
    }
  }
  return [...anos].sort((a, b) => a - b);
}

/**
 * Importa todas las empresas encontradas en la carpeta raíz de ContaWin.
 * encoding: cp1252 (ContaWin Windows) o cp850 (datos de la versión DOS).
 */
export async function importar(raiz: string, db: Database, reemplazar = false, progreso?: (t: string) => void,
  encoding: Codificacion = "cp1252"): Promise<Resultado> {
  const res = new Resultado();
  if (!buscarArchivo(raiz, "EMPRESA.DBF")) throw new Error(`No se encontró EMPRESA.DBF en:\n${raiz}`);
  const empresas = leer(raiz, "EMPRESA.DBF", encoding);

  for (const e of empresas) {
    const rut = util.limpiarRut(String(e.RUT ?? ""));
    const directorio = S(e.DIRECTORIO).toUpperCase();
    const nombre = S(e.RAZONSOC);
    if (!rut) { res.avisos.push(`Empresa sin RUT omitida: ${nombre}`); continue; }
    progreso?.(`Importando ${nombre} ...`);
    const existente = await db.empresaPorRut(rut);
    if (existente) {
      if (!reemplazar) {
        res.omitidas++;
        res.avisos.push(`${nombre}: ya existe en la base (RUT ${util.formatoRut(rut)}), no se importó.`);
        continue;
      }
      await db.borrarEmpresa(existente.id);
    }

    const carpeta = directorio ? buscarCarpeta(raiz, directorio) : null;
    if (!carpeta) res.avisos.push(`${nombre}: no se encontró la carpeta '${directorio}'; se importa solo la ficha.`);

    await db.transaccion(async (c) => {
      const empId = await c.execute(
        "INSERT INTO empresa(rut,razon_social,giro,direccion,ciudad,rep_legal,sucursal," +
        "honorarios,directorio,impuestos) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [rut, nombre, S(e.GIRO), S(e.DIRECCION), S(e.CIUDAD), S(e.REPLEGAL), S(e.SUCURSAL), I(e.HONORARIOS),
          directorio, I(e.IMPUESTOS)]);
      res.empresas++;
      if (!carpeta) return;

      // --- plan de cuentas
      let vistos = new Set<string>();
      for (const r of leer(carpeta, "CUENTAS.DBF", encoding)) {
        const cod = S(r.CODIGO).toUpperCase();
        if (!cod || vistos.has(cod)) continue;
        vistos.add(cod);
        await c.execute("INSERT INTO cuenta(empresa_id,codigo,nombre,cdocum) VALUES (?,?,?,?)",
          [empId, cod, S(r.NOMBRE), I(r.CDOCUM) === 1 ? 1 : 0]);
        res.cuentas++;
      }

      // --- centros de costo
      vistos = new Set<string>();
      for (const r of leer(carpeta, "CCOSTO.DBF", encoding)) {
        const cod = S(r.CODIGO).toUpperCase();
        if (!cod || vistos.has(cod)) continue;
        vistos.add(cod);
        await c.execute("INSERT INTO ccosto(empresa_id,codigo,nombre) VALUES (?,?,?)", [empId, cod, S(r.NOMBRE)]);
        res.ccostos++;
      }

      // --- años
      const proveedores = new Map<string, Registro>();
      for (const ano of anosDisponibles(carpeta, encoding)) {
        const perId = await c.execute("INSERT INTO periodo(empresa_id,ano) VALUES (?,?)", [empId, ano]);
        res.periodos++;
        const cy = buscarCarpeta(carpeta, `TRA${String(ano).padStart(4, "0")}`);
        if (!cy) continue;

        for (const r of leer(cy, "PROVEE.DBF", encoding)) {
          const rp = util.limpiarRut(String(r.RUT ?? ""));
          if (rp) proveedores.set(rp, r);          // el año más reciente prevalece
        }

        // asientos
        const idPorNumero = new Map<number, number>();
        const fechaPorNumero = new Map<number, string | null>();
        for (const r of leer(cy, "ASIENTOS.DBF", encoding)) {
          const num = I(r.NUMERO);
          if (idPorNumero.has(num)) {
            res.avisos.push(`${nombre} ${ano}: asiento N° ${num} duplicado; se conserva el primero.`);
            continue;
          }
          const tipo = S(r.TIPO).toUpperCase() || "T";
          const fecha = util.toIso(r.FECHA as string);
          const aid = await c.execute(
            "INSERT INTO asiento(periodo_id,numero,tipo,fecha,glosa,debe,haber,cdcosto) VALUES (?,?,?,?,?,?,?,?)",
            [perId, num, tipo, fecha, S(r.GLOSA), I(r.DEBE), I(r.HABER), S(r.CDCOSTO).toUpperCase()]);
          idPorNumero.set(num, aid);
          fechaPorNumero.set(num, fecha);
          res.asientos++;
        }

        // detalle
        const lineasPorAsiento = new Map<number, [number, string][]>();
        const sumas = new Map<number, [number, number]>();
        let huerfanas = 0;
        for (const r of leer(cy, "DETASIEN.DBF", encoding)) {
          const num = I(r.NUMERO);
          const aid = idPorNumero.get(num);
          if (!aid) { huerfanas++; continue; }
          const cod = S(r.CODIGO).toUpperCase();
          const debe = I(r.DEBE), haber = I(r.HABER);
          if (!lineasPorAsiento.has(num)) lineasPorAsiento.set(num, []);
          const nLinea = lineasPorAsiento.get(num)!.length + 1;
          const did = await c.execute("INSERT INTO detalle(asiento_id,linea,codigo,debe,haber,fecha) VALUES (?,?,?,?,?,?)",
            [aid, nLinea, cod, debe, haber, util.toIso(r.FECHA as string) || (fechaPorNumero.get(num) ?? null)]);
          lineasPorAsiento.get(num)!.push([did, cod]);
          const s = sumas.get(num) ?? [0, 0];
          s[0] += debe; s[1] += haber;
          sumas.set(num, s);
          res.lineas++;
        }
        if (huerfanas) res.avisos.push(`${nombre} ${ano}: ${huerfanas} líneas de detalle sin asiento (omitidas).`);
        for (const [num, aid] of idPorNumero) {
          const [d, h] = sumas.get(num) ?? [0, 0];
          if (d !== h)
            res.avisos.push(`${nombre} ${ano}: asiento N° ${num} descuadrado (debe ${util.fmtMonto(d)} / haber ${util.fmtMonto(h)}).`);
          await c.execute("UPDATE asiento SET debe=?, haber=? WHERE id=?", [d, h, aid]);
        }

        // compras (ligadas a la línea con la misma cuenta, como el SEEK numero+cuenta original)
        const usados = new Set<number>();
        for (const r of leer(cy, "COMPRAS.DBF", encoding)) {
          const num = I(r.NASIENTO);
          const cta = S(r.CCUENTA).toUpperCase();
          const candidatos = (lineasPorAsiento.get(num) ?? []).filter(([did, cod]) => cod === cta && !usados.has(did)).map(([did]) => did);
          if (!candidatos.length) {
            res.avisos.push(`${nombre} ${ano}: documento N° ${I(r.NUMEROC)} del asiento ${num} sin línea de cuenta ${util.formatoCodigo(cta)} (omitido).`);
            continue;
          }
          const did = candidatos[0];
          usados.add(did);
          const td = I(r.TDOCUM) || 1;
          await c.execute(
            "INSERT INTO compra(detalle_id,tdocum,fecha_doc,numero_doc,rut_prov,neto,iva,adicional," +
            "total,cdcosto,detalle,fecha_pago) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            [did, td, util.toIso(r.FECHAD as string), I(r.NUMEROC), util.limpiarRut(String(r.RPROVEE ?? "")),
              I(r.NETO), I(r.IVA), I(r.ADICIONAL), I(r.TOTAL), S(r.CDCOSTO).toUpperCase(), S(r.DETALLE),
              util.toIso(r.FECPAGO as string)]);
          res.compras++;
        }
      }

      for (const [rp, r] of proveedores) {
        await c.execute("INSERT INTO proveedor(empresa_id,rut,nombre,direccion,ciudad,giro,telefono,email) VALUES (?,?,?,?,?,?,?,?)",
          [empId, rp, S(r.NOMBRE), S(r.DIRECC), S(r.CIUDAD), S(r.GIRO), S(r.TELEFONO), S(r.EMAIL)]);
        res.proveedores++;
      }
    });
  }
  res.avisos.push("Los usuarios del sistema antiguo no se importan (sus claves están cifradas " +
    "con FiveWin). Use Útiles > Usuarios para crearlos de nuevo.");
  return res;
}
