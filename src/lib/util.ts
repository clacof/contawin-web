/**
 * Funciones utilitarias (equivalentes a FUNCIONS.PRG / contawin/util.py).
 *
 * - RUT chileno: validación (ValRut), formato (Ver_Rut / lcVer_Rut)
 * - Códigos de cuenta: formato 99.99.99 (VerCodigos)
 * - Montos: formato con separador de miles "." (Transform + StrTran)
 * - Fechas: conversión entre ISO (SQLite) y dd/mm/aaaa (SET DATE FRENCH)
 *
 * Traducción literal de util.py: mismas reglas, mismos resultados.
 */

// ---------------------------------------------------------------------------
// Tipos de documento de compra (aTDocumen / aTdocL en CONTAB.PRG)
// El índice guardado en COMPRAS.TDOCUM es 1..18
// ---------------------------------------------------------------------------
export const TIPOS_DOCUMENTO: ReadonlyArray<readonly [string, string]> = [
  ["BOL", "Boleta"],
  ["BOLE", "Boleta Exenta"],
  ["BOLH", "Boleta Honorarios"],
  ["BHE", "Boleta Honorarios Exenta"],
  ["FAC", "Factura"],
  ["FACE", "Factura Exenta"],
  ["ODE", "Otro Documento Exento"],
  ["BOLEC", "Boleta Electrónica"],
  ["BOLEX", "Boleta Exenta Electrónica"],
  ["BOLHE", "Boleta Honorario Electrónica"],
  ["FACEL", "Factura Electrónica"],
  ["FACEX", "Factura Electrónica Exenta"],
  ["FIN", "Finiquito"],
  ["BPST", "Bol. Honorarios P. Servicios 3ros"],
  ["BPSTE", "B. Honorarios P.Serv. 3ros Electrónica"],
  ["NOTACRE", "Nota de Crédito"],
  ["PLANILLA", "Planilla Saneamiento Previsional"],
  ["NOTADEB", "Nota de Débito"],
];
/** Documentos afectos a IVA (para el cálculo automático de neto / IVA): Factura, Factura Electrónica, N. Crédito, N. Débito */
export const DOCS_AFECTOS = new Set([5, 11, 16, 18]);
export const TASA_IVA = 0.19;

export const TIPOS_ASIENTO: Record<string, string> = { I: "Ingreso", E: "Egreso", T: "Traspaso" };

export function siglaDocumento(n: number | null | undefined): string {
  if (n && n >= 1 && n <= TIPOS_DOCUMENTO.length) return TIPOS_DOCUMENTO[n - 1][0];
  return "";
}

export function nombreDocumento(n: number | null | undefined): string {
  if (n && n >= 1 && n <= TIPOS_DOCUMENTO.length) return TIPOS_DOCUMENTO[n - 1][1];
  return "";
}

export function nombreTipoAsiento(t: string | null | undefined): string {
  return TIPOS_ASIENTO[(t || "").toUpperCase()] ?? "";
}

// ---------------------------------------------------------------------------
// Redondeo idéntico a round() de Python (mitad al par)
// ---------------------------------------------------------------------------
export function pyRound(x: number): number {
  if (!Number.isFinite(x)) return 0;
  const piso = Math.floor(x);
  const dif = x - piso;
  if (dif > 0.5) return piso + 1;
  if (dif < 0.5) return piso;
  return piso % 2 === 0 ? piso : piso + 1;
}

/** int() de Python sobre un número: trunca hacia cero. */
export function pyInt(x: unknown): number {
  const n = Number(x ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
}

// ---------------------------------------------------------------------------
// RUT
// ---------------------------------------------------------------------------
/** Deja el RUT como en el DBF original: dígitos + dígito verificador, sin puntos ni guión, en mayúsculas. */
export function limpiarRut(rut: string | null | undefined): string {
  if (!rut) return "";
  return String(rut).replace(/[^0-9Kk]/g, "").toUpperCase();
}

export function digitoVerificador(cuerpo: string): string {
  let suma = 0;
  let factor = 2;
  for (const c of cuerpo.split("").reverse()) {
    suma += parseInt(c, 10) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  return resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
}

export function validarRut(rut: string | null | undefined): boolean {
  const r = limpiarRut(rut);
  if (r.length < 2) return false;
  const cuerpo = r.slice(0, -1);
  const dv = r.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
  return digitoVerificador(cuerpo) === dv;
}

function miles(n: number | bigint): string {
  // f"{n:,}".replace(",", ".")
  const s = (typeof n === "bigint" ? n : BigInt(Math.trunc(n))).toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Ver_Rut: 761272179 -> 76.127.217-9 */
export function formatoRut(rut: string | null | undefined): string {
  const r = limpiarRut(rut);
  if (r.length < 2) return r;
  let cuerpo = r.slice(0, -1);
  const dv = r.slice(-1);
  if (/^\d+$/.test(cuerpo)) cuerpo = miles(BigInt(cuerpo));
  return `${cuerpo}-${dv}`;
}

/** lcVer_Rut: 761272179 -> 76127217-9 */
export function formatoRutSimple(rut: string | null | undefined): string {
  const r = limpiarRut(rut);
  if (r.length < 2) return r;
  return `${r.slice(0, -1)}-${r.slice(-1)}`;
}

// ---------------------------------------------------------------------------
// Códigos de cuenta
// ---------------------------------------------------------------------------
/** VerCodigos: '100001' -> '10.00.01' */
export function formatoCodigo(codigo: string | null | undefined): string {
  const c = (codigo || "").trim();
  if (c.length <= 2) return c;
  const partes: string[] = [];
  for (let i = 0; i < c.length; i += 2) partes.push(c.slice(i, i + 2));
  return partes.join(".");
}

export function limpiarCodigo(codigo: string | null | undefined): string {
  return (codigo || "").replace(/[^0-9A-Za-z]/g, "").toUpperCase().slice(0, 6);
}

// ---------------------------------------------------------------------------
// Montos
// ---------------------------------------------------------------------------
function aEntero(valor: unknown): number {
  const f = Number(valor || 0);
  if (valor !== null && valor !== undefined && typeof valor === "string" && valor.trim() !== "" && Number.isNaN(f)) return 0;
  if (!Number.isFinite(f)) return 0;
  return pyRound(f);
}

/** Transform(n, '999,999,999,999') con StrTran(',', '.') */
export function fmtMonto(valor: unknown, vacioSiCero = false): string {
  const n = aEntero(valor);
  if (vacioSiCero && n === 0) return "";
  const s = miles(Math.abs(n));
  return n < 0 ? `-${s}` : s;
}

/** Monto con signo peso y separador de miles: «$ 1.250.300», «−$ 45.000» (sistema de diseño). */
export function fmtPesos(valor: unknown): string {
  const n = aEntero(valor);
  const s = `$ ${miles(Math.abs(n))}`;
  return n < 0 ? `−${s}` : s;
}

export function parseMonto(texto: unknown): number {
  if (texto === null || texto === undefined) return 0;
  if (typeof texto === "number") return pyRound(texto);
  const t = String(texto).trim().replace(/\./g, "").replace(/ /g, "").replace(/,/g, ".");
  if (!t || t === "-" || t === "+") return 0;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return 0;
  const f = parseFloat(t);
  return Number.isFinite(f) ? pyRound(f) : 0;
}

// ---------------------------------------------------------------------------
// Fechas (se manejan como texto ISO aaaa-mm-dd, igual que en SQLite)
// ---------------------------------------------------------------------------
export type FechaEntrada = string | Date | null | undefined;

function pad(n: number, largo = 2) {
  return String(n).padStart(largo, "0");
}

export function toIso(d: FechaEntrada): string | null {
  if (d === null || d === undefined || d === "") return null;
  if (d instanceof Date) {
    if (Number.isNaN(d.getTime())) return null;
    return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  const s = String(d).trim();
  if (!s) return null;
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}`; // DTOS / DBF
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return `${pad(parseInt(m[3], 10), 4)}-${pad(parseInt(m[2], 10))}-${pad(parseInt(m[1], 10))}`;
  return null;
}

function fechaValida(a: number, m: number, d: number): boolean {
  if (a < 1 || m < 1 || m > 12 || d < 1) return false;
  const dias = new Date(Date.UTC(2000, m, 0)).getUTCDate();
  const bisiesto = (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
  const max = m === 2 ? (bisiesto ? 29 : 28) : dias;
  return d <= max;
}

/** Devuelve la fecha ISO solo si es una fecha válida (date.fromisoformat). */
export function fromIso(s: FechaEntrada): string | null {
  const iso = toIso(s);
  if (!iso) return null;
  const [a, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  return fechaValida(a, m, d) ? iso : null;
}

/** DToC con SET DATE FRENCH / SET CENTURY ON -> dd/mm/aaaa */
export function fmtFecha(d: FechaEntrada): string {
  const f = fromIso(d);
  if (!f) return "";
  const [a, m, dia] = f.split("-");
  return `${dia}/${m}/${a}`;
}

export const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio",
  "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

/** Fec_Tex: 04 de Octubre de 2026 */
export function fechaTexto(d: FechaEntrada): string {
  const f = fromIso(d);
  if (!f) return "";
  const [a, m, dia] = f.split("-").map((x) => parseInt(x, 10));
  return `${pad(dia)} de ${MESES[m - 1]} de ${a}`;
}

export function anoDe(iso: string): number {
  return parseInt(iso.slice(0, 4), 10);
}

/** Fecha de hoy (zona horaria local del servidor) en ISO. */
export function hoyIso(): string {
  return toIso(new Date())!;
}
