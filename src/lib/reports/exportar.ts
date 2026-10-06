/** Exportación de un Informe a Excel (.xlsx) o CSV — reports/exportar.py. */
import ExcelJS from "exceljs";
import * as util from "../util";
import { alineacion, ENCABEZADO_ASIENTO, GRUPO, Informe, SUBTOTAL, textoCelda, TOTAL, Valor } from "./modelo";

type ValorExcel = string | number | Date | null;

/** _valor_excel: montos como número, fechas como fecha, el resto como texto formateado. */
export function valorExcel(inf: Informe, i: number, v: Valor): ValorExcel {
  const c = inf.columnas[i];
  if (v === null || v === undefined || v === "") return null;
  if (c.formato === "m") return typeof v === "number" ? Math.trunc(v) : v;
  if (c.formato === "f") {
    const iso = util.fromIso(String(v));
    if (!iso) return v;
    const [a, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(a, m - 1, d));
  }
  return textoCelda(inf, i, v);
}

function celdaCsv(v: ValorExcel): string {
  if (v === null) return "";
  let s: string;
  if (v instanceof Date) s = v.toISOString().slice(0, 10);   // csv de Python escribe str(date) = aaaa-mm-dd
  else s = String(v);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV separado por «;» en UTF-8 con BOM (lo abre Excel). */
export function exportarCsv(inf: Informe): Buffer {
  const lineas: string[] = [];
  const fila = (vals: ValorExcel[]) => lineas.push(vals.map(celdaCsv).join(";"));
  fila([inf.titulo]);
  for (const s of [...inf.membrete, ...inf.subtitulos]) fila([s]);
  fila([]);
  fila(inf.columnas.map((c) => c.titulo));
  for (const f of inf.filas) {
    if (f.estilo === GRUPO) { fila([f.texto]); continue; }
    fila(f.valores.map((v, i) => valorExcel(inf, i, v)));
  }
  return Buffer.from("﻿" + lineas.map((l) => l + "\r\n").join(""), "utf-8");
}

export async function exportarXlsx(inf: Informe): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(inf.nombreArchivo.slice(0, 30) || "Informe");
  ws.addRow([inf.titulo]);
  ws.getCell("A1").font = { name: "Arial", size: 14, bold: true };
  for (const s of [...inf.membrete, ...inf.subtitulos]) ws.addRow([s]);
  ws.addRow([]);
  ws.addRow(inf.columnas.map((c) => c.titulo));
  const filaTitulos = ws.rowCount;
  for (let i = 1; i <= inf.columnas.length; i++) {
    const cel = ws.getRow(filaTitulos).getCell(i);
    cel.font = { bold: true };
    cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    cel.border = { bottom: { style: "thin" } };
  }
  for (const f of inf.filas) {
    if (f.estilo === GRUPO) {
      const r = ws.addRow([f.texto]);
      r.getCell(1).font = { bold: true, color: { argb: "FF1F3864" } };
      continue;
    }
    const r = ws.addRow(f.valores.map((v, i) => valorExcel(inf, i, v)));
    inf.columnas.forEach((c, idx) => {
      const cel = r.getCell(idx + 1);
      if (c.formato === "m" && typeof cel.value === "number") cel.numFmt = "#,##0";
      else if (c.formato === "f" && cel.value instanceof Date) cel.numFmt = "DD/MM/YYYY";
      if (alineacion(c) === "R") cel.alignment = { horizontal: "right" };
      if (f.estilo === TOTAL || f.estilo === SUBTOTAL || f.estilo === ENCABEZADO_ASIENTO) cel.font = { bold: true };
    });
  }
  inf.columnas.forEach((c, i) => {
    ws.getColumn(i + 1).width = Math.max(10, Math.min(60, Math.trunc(c.ancho * 12)));
  });
  ws.views = [{ state: "frozen", ySplit: filaTitulos, xSplit: 0 }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}
