/**
 * Lector mínimo de archivos DBF (dBase III / FoxPro / Clipper DBFCDX) — dbf_reader.py.
 * Sin dependencias. ContaWin para Windows (FiveWin) graba los textos en ANSI (cp1252);
 * los datos de la versión DOS usan cp850. Solo lectura; los índices .CDX se ignoran.
 */
import fs from "node:fs";
import path from "node:path";
import { pyRound } from "../util";

export type Codificacion = "cp1252" | "cp850";
export interface Campo { nombre: string; tipo: string; largo: number; decimales: number }
export type Registro = Record<string, string | number | boolean>;

const CP850_ALTO = "\u00c7\u00fc\u00e9\u00e2\u00e4\u00e0\u00e5\u00e7\u00ea\u00eb\u00e8\u00ef\u00ee\u00ec\u00c4\u00c5\u00c9\u00e6\u00c6\u00f4\u00f6\u00f2\u00fb\u00f9\u00ff\u00d6\u00dc\u00f8\u00a3\u00d8\u00d7\u0192\u00e1\u00ed\u00f3\u00fa\u00f1\u00d1\u00aa\u00ba\u00bf\u00ae\u00ac\u00bd\u00bc\u00a1\u00ab\u00bb\u2591\u2592\u2593\u2502\u2524\u00c1\u00c2\u00c0\u00a9\u2563\u2551\u2557\u255d\u00a2\u00a5\u2510\u2514\u2534\u252c\u251c\u2500\u253c\u00e3\u00c3\u255a\u2554\u2569\u2566\u2560\u2550\u256c\u00a4\u00f0\u00d0\u00ca\u00cb\u00c8\u0131\u00cd\u00ce\u00cf\u2518\u250c\u2588\u2584\u00a6\u00cc\u2580\u00d3\u00df\u00d4\u00d2\u00f5\u00d5\u00b5\u00fe\u00de\u00da\u00db\u00d9\u00fd\u00dd\u00af\u00b4\u00ad\u00b1\u2017\u00be\u00b6\u00a7\u00f7\u00b8\u00b0\u00a8\u00b7\u00b9\u00b3\u00b2\u25a0\u00a0";
// cp1252 (0x80-0x9F distintos de latin-1; U+FFFD en los 5 bytes sin definir, como Python con "replace")
const CP1252_80_9F = "\u20ac\ufffd\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\ufffd\u017d\ufffd\ufffd\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\ufffd\u017e\u0178";

function decodificar(b: Uint8Array, enc: Codificacion): string {
  let s = "";
  if (enc === "cp1252") {
    for (const x of b) s += x >= 0x80 && x < 0xa0 ? CP1252_80_9F[x - 0x80] : String.fromCharCode(x);
    return s;
  }
  for (const x of b) s += x < 128 ? String.fromCharCode(x) : CP850_ALTO[x - 128];
  return s;
}
const ascii = (b: Uint8Array) => Array.from(b, (x) => (x < 128 ? String.fromCharCode(x) : "\uFFFD")).join("");
const quitarFinal = (s: string) => s.replace(/[ \x00]+$/, "");

export class DBF {
  readonly campos: Campo[] = [];
  readonly nRegistros: number;
  readonly largoHeader: number;
  readonly largoRegistro: number;
  private data: Buffer;

  constructor(readonly ruta: string, readonly encoding: Codificacion = "cp1252") {
    const d = fs.readFileSync(ruta);
    this.data = d;
    if (d.length < 32) throw new Error(`Archivo DBF inválido: ${ruta}`);
    this.nRegistros = d.readUInt32LE(4);
    this.largoHeader = d.readUInt16LE(8);
    this.largoRegistro = d.readUInt16LE(10);
    let pos = 32;
    while (pos + 32 <= d.length && d[pos] !== 0x0d) {
      const bloque = d.subarray(pos, pos + 32);
      const crudo = bloque.subarray(0, 11);
      const cero = crudo.indexOf(0);
      const nombre = ascii(cero >= 0 ? crudo.subarray(0, cero) : crudo).trim().toUpperCase();
      this.campos.push({ nombre, tipo: String.fromCharCode(bloque[11]), largo: bloque[16], decimales: bloque[17] });
      pos += 32;
    }
  }

  get nombres() { return this.campos.map((c) => c.nombre); }

  private convertir(c: Campo, raw: Buffer): string | number | boolean {
    const t = c.tipo;
    if (t === "C" || t === "V") return quitarFinal(decodificar(raw, this.encoding));
    if (t === "N" || t === "F") {
      const s = ascii(raw).trim().replace(",", ".");
      if (!s || s.includes("*")) return 0;
      if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return 0;
      const v = parseFloat(s);
      if (!Number.isFinite(v)) return 0;
      return c.decimales ? v : pyRound(v);
    }
    if (t === "D") {
      const s = ascii(raw).trim();
      return s.length === 8 && /^\d+$/.test(s) && s !== "00000000" ? s : "";
    }
    if (t === "L") return ["T", "t", "Y", "y"].includes(String.fromCharCode(raw[0] ?? 0));
    if (t === "I") return raw.readInt32LE(0);
    return decodificar(raw, this.encoding).trim();
  }

  /** Registros como objeto. Por defecto omite los borrados (SET DELETED ON del original). */
  *registros(incluirBorrados = false): Generator<Registro> {
    const d = this.data;
    for (let i = 0; i < this.nRegistros; i++) {
      const ini = this.largoHeader + i * this.largoRegistro;
      const reg = d.subarray(ini, ini + this.largoRegistro);
      if (reg.length < this.largoRegistro) break;
      const borrado = reg[0] === 0x2a;
      if (borrado && !incluirBorrados) continue;
      let o = 1;
      const fila: Registro = {};
      for (const c of this.campos) {
        fila[c.nombre] = this.convertir(c, reg.subarray(o, o + c.largo));
        o += c.largo;
      }
      if (incluirBorrados) fila._BORRADO = borrado;
      yield fila;
    }
  }

  [Symbol.iterator]() { return this.registros(); }
}

/** Busca un archivo sin distinguir mayúsculas/minúsculas (COMPRAS.DBF, compras.dbf, DetAsien.dbf…). */
export function buscarArchivo(carpeta: string | null, nombre: string): string | null {
  if (!carpeta || !esCarpeta(carpeta)) return null;
  const objetivo = nombre.toLowerCase();
  for (const f of fs.readdirSync(carpeta)) if (f.toLowerCase() === objetivo) return path.join(carpeta, f);
  return null;
}

export function buscarCarpeta(base: string | null, nombre: string): string | null {
  if (!base || !esCarpeta(base)) return null;
  const objetivo = nombre.trim().toLowerCase();
  for (const f of fs.readdirSync(base)) {
    const p = path.join(base, f);
    if (f.toLowerCase() === objetivo && esCarpeta(p)) return p;
  }
  return null;
}

export function esCarpeta(p: string): boolean {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

export function leer(carpeta: string | null, nombre: string, encoding: Codificacion = "cp1252"): Registro[] {
  const ruta = buscarArchivo(carpeta, nombre);
  if (!ruta) return [];
  return Array.from(new DBF(ruta, encoding));
}
