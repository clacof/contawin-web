/** Listados de mantenedores (empresas, cuentas, centros de costo, proveedores) — reports/listados.py. */
import * as util from "../util";
import type { Database } from "../db";
import { columna, fila, informe, Informe, membrete } from "./modelo";

export async function listadoEmpresas(db: Database): Promise<Informe> {
  const inf = informe({
    titulo: "INFORME GENERAL DATOS EMPRESAS",
    columnas: [columna("Razón Social", 3), columna("R.U.T.", 1.2, "r"), columna("Dirección", 3),
      columna("Ciudad", 1.4), columna("Directorio", 1)],
    fechaEmision: util.hoyIso(), nombreArchivo: "empresas",
  });
  for (const e of await db.empresas()) inf.filas.push(fila([e.razon_social, e.rut, e.direccion, e.ciudad, e.directorio]));
  return inf;
}

export async function listadoCuentas(db: Database, empresaId: number): Promise<Informe> {
  const inf = informe({
    titulo: "INFORME GENERAL PLAN DE CUENTAS", membrete: membrete(await db.empresa(empresaId)),
    columnas: [columna("CÓDIGO", 1, "c"), columna("Nombre", 4), columna("Pide documento", 1.2, "t", { alinear: "C" })],
    fechaEmision: util.hoyIso(), nombreArchivo: "plan_de_cuentas",
  });
  for (const c of await db.cuentas(empresaId)) inf.filas.push(fila([c.codigo, c.nombre, c.cdocum ? "Sí" : ""]));
  return inf;
}

export async function listadoCcostos(db: Database, empresaId: number): Promise<Informe> {
  const inf = informe({
    titulo: "INFORME GENERAL CENTRO DE COSTO", membrete: membrete(await db.empresa(empresaId)),
    columnas: [columna("CÓDIGO", 1), columna("Nombre", 4)],
    fechaEmision: util.hoyIso(), nombreArchivo: "centros_de_costo",
  });
  for (const c of await db.ccostos(empresaId)) inf.filas.push(fila([c.codigo, c.nombre]));
  return inf;
}

export async function listadoProveedores(db: Database, empresaId: number): Promise<Informe> {
  const inf = informe({
    titulo: "INFORME GENERAL PROVEEDORES", membrete: membrete(await db.empresa(empresaId)),
    columnas: [columna("R.U.T.", 1.2, "r"), columna("Nombre", 3), columna("Dirección", 2.4),
      columna("Ciudad", 1.3), columna("Teléfono", 1.2), columna("E-mail", 1.8)],
    horizontal: true, fechaEmision: util.hoyIso(), nombreArchivo: "proveedores",
  });
  for (const p of await db.proveedores(empresaId, "nombre"))
    inf.filas.push(fila([p.rut, p.nombre, p.direccion, p.ciudad, p.telefono, p.email]));
  return inf;
}
