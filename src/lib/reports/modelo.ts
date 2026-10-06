/** Modelo de informe (Columna, Fila, Informe) y helpers de encabezado — reports/modelo.py. */
import * as util from "../util";
import type { Empresa } from "../db";

// Estilos de fila
export const NORMAL = "", GRUPO = "grupo", SUBTOTAL = "subtotal", TOTAL = "total", ENCABEZADO_ASIENTO = "asiento";
export type EstiloFila = "" | "grupo" | "subtotal" | "total" | "asiento";
export type Valor = string | number | null;

export interface Columna {
  titulo: string;
  ancho: number;            // peso relativo
  formato: "t" | "m" | "f" | "c" | "r";   // texto, monto, fecha, código cuenta, rut
  alinear: "" | "L" | "R" | "C";
  vacioSiCero: boolean;
}

export function columna(titulo: string, ancho = 1.0, formato: Columna["formato"] = "t",
  opciones: { alinear?: Columna["alinear"]; vacioSiCero?: boolean } = {}): Columna {
  return { titulo, ancho, formato, alinear: opciones.alinear ?? "", vacioSiCero: opciones.vacioSiCero ?? true };
}

export function alineacion(c: Columna): "L" | "R" | "C" {
  return c.alinear || (c.formato === "m" ? "R" : "L");
}

export interface Fila { valores: Valor[]; estilo: EstiloFila; texto: string }

export function fila(valores: Valor[], estilo: EstiloFila = NORMAL, texto = ""): Fila {
  return { valores, estilo, texto };
}

export interface Informe {
  titulo: string;
  columnas: Columna[];
  filas: Fila[];
  subtitulos: string[];
  membrete: string[];          // empresa, rut, ciudad (arriba a la izquierda)
  datosCabecera: string[];     // líneas extra bajo el título
  pie: string[];
  firmas: string[];            // textos bajo líneas de firma
  horizontal: boolean;
  fechaEmision: string | null; // ISO
  totalesPagina: number[];     // columnas a totalizar por página
  nombreArchivo: string;
}

export function informe(d: Partial<Informe> & Pick<Informe, "titulo" | "columnas">): Informe {
  return {
    filas: [], subtitulos: [], membrete: [], datosCabecera: [], pie: [], firmas: [], horizontal: false,
    fechaEmision: null, totalesPagina: [], nombreArchivo: "informe", ...d,
  };
}

export function textoCelda(inf: Informe, i: number, valor: Valor): string {
  const c = inf.columnas[i];
  if (valor === null || valor === undefined || valor === "") return "";
  if (c.formato === "m") return util.fmtMonto(valor, c.vacioSiCero);
  if (c.formato === "f") return util.fmtFecha(String(valor));
  if (c.formato === "c") return util.formatoCodigo(String(valor));
  if (c.formato === "r") return util.formatoRut(String(valor));
  return String(valor);
}

export function textos(inf: Informe, f: Fila): string[] {
  return f.valores.map((v, i) => textoCelda(inf, i, v));
}

export function membrete(emp: Empresa | undefined): string[] {
  if (!emp) return [];
  return [emp.razon_social, "R.U.T. " + util.formatoRut(emp.rut), emp.ciudad];
}

export function rango(desde: util.FechaEntrada, hasta: util.FechaEntrada): string {
  return `DESDE EL < ${util.fmtFecha(desde)} > HASTA EL < ${util.fmtFecha(hasta)} >`;
}

/** mostrar(): solo hay informe si tiene alguna fila normal o de encabezado de asiento. */
export function tieneDatos(inf: Informe): boolean {
  return inf.filas.some((f) => f.estilo === NORMAL || f.estilo === ENCABEZADO_ASIENTO);
}
