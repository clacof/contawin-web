/**
 * Dibujo paginado de un Informe en PDF — ui/impresion.py (_Dibujante).
 * Mismo diseño que la versión de escritorio: carta, vertical u horizontal, membrete a la
 * izquierda, fecha/hora y página a la derecha, títulos centrados, totales por página
 * (libro diario), pie (Art. 100) y líneas de firma.
 */
import PDFDocument from "pdfkit";
import * as util from "../util";
import { alineacion, ENCABEZADO_ASIENTO, Fila, GRUPO, Informe, SUBTOTAL, textos, TOTAL } from "./modelo";

const MM = 72 / 25.4;

export function informePdf(inf: Informe, ahora: Date = new Date()): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "LETTER", layout: inf.horizontal ? "landscape" : "portrait",
    margins: { left: 12 * MM, right: 12 * MM, top: 10 * MM, bottom: 10 * MM },
    autoFirstPage: true, bufferPages: false, info: { Title: inf.titulo, Creator: "ContaWin" },
  });
  const trozos: Buffer[] = [];
  doc.on("data", (b: Buffer) => trozos.push(b));
  const fin = new Promise<Buffer>((ok) => doc.on("end", () => ok(Buffer.concat(trozos))));

  const X0 = doc.page.margins.left, Y0 = doc.page.margins.top;
  const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const H = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
  const base = inf.horizontal || inf.columnas.length > 6 ? 7.5 : 8.5;
  const F = { normal: ["Helvetica", base], bold: ["Helvetica-Bold", base], titulo: ["Helvetica-Bold", base + 4],
    sub: ["Helvetica", base + 1] } as const;
  type Fuente = (typeof F)[keyof typeof F];
  const alto = (f: Fuente) => { doc.font(f[0]).fontSize(f[1]); return doc.currentLineHeight(true); };
  const lh = alto(F.normal) * 1.35;
  doc.font(F.normal[0]).fontSize(F.normal[1]);
  const pad = doc.widthOfString("0") * 0.6;
  const peso = inf.columnas.reduce((s, c) => s + c.ancho, 0) || 1;
  const xs: [number, number][] = [];
  let acc = 0;
  for (const c of inf.columnas) { const w = (W * c.ancho) / peso; xs.push([acc, w]); acc += w; }
  let pagina = 0;
  const p2 = (n: number) => String(n).padStart(2, "0");
  const hora = `${p2(ahora.getHours())}:${p2(ahora.getMinutes())}`;

  function texto(x: number, y: number, w: number, t: string, f: Fuente = F.normal, alinear: "L" | "R" | "C" = "L", h?: number) {
    doc.font(f[0]).fontSize(f[1]);
    let s = String(t);
    w = Math.max(1, w);
    if (doc.widthOfString(s) > w) {                       // elidedText(..., ElideRight)
      while (s.length && doc.widthOfString(s + "…") > w) s = s.slice(0, -1);
      s += "…";
    }
    const altoCaja = h ?? lh;
    const ty = y + (altoCaja - doc.currentLineHeight(true)) / 2;
    doc.fillColor("black").text(s, X0 + x, Y0 + ty, { width: w, align: alinear === "L" ? "left" : alinear === "R" ? "right" : "center", lineBreak: false });
  }
  function linea(y: number, x1 = 0, x2?: number, grosor = 1) {
    doc.save().lineWidth(0.48 * grosor).strokeColor("black")
      .moveTo(X0 + x1, Y0 + y).lineTo(X0 + (x2 ?? W), Y0 + y).stroke().restore();
  }
  function nuevaPagina() { doc.addPage(); }

  function encabezado(): number {
    pagina++;
    let y = 0;
    const anchoDer = W * 0.28;
    const fecha = inf.fechaEmision || util.hoyIso();
    const derecha = [`Fecha : ${util.fmtFecha(fecha)}   ${hora}`, `Página: ${pagina}`];
    const filas = Math.max(inf.membrete.length, derecha.length);
    for (let i = 0; i < filas; i++) {
      if (i < inf.membrete.length) texto(0, y, W - anchoDer, inf.membrete[i], F.bold);
      if (i < derecha.length) texto(W - anchoDer, y, anchoDer, derecha[i], F.bold, "R");
      y += lh;
    }
    y += lh * 0.4;
    const ht = alto(F.titulo);
    texto(0, y, W, inf.titulo, F.titulo, "C", ht * 1.2);
    y += ht * 1.3;
    for (const s of inf.subtitulos) { texto(0, y, W, s, F.sub, "C"); y += lh; }
    for (const s of inf.datosCabecera) { texto(0, y, W, s, F.bold); y += lh; }
    y += lh * 0.3;
    linea(y, 0, undefined, 1.5);
    inf.columnas.forEach((c, i) => { const [x, w] = xs[i]; texto(x + pad, y, w - 2 * pad, c.titulo, F.bold, alineacion(c)); });
    y += lh;
    linea(y, 0, undefined, 1.5);
    return y + lh * 0.2;
  }

  function fila(y: number, f: Fila): number {
    if (f.estilo === GRUPO) {
      y += lh * 0.25;
      texto(pad, y, W - pad, f.texto, F.bold);
      return y + lh;
    }
    const fuente = f.estilo === TOTAL || f.estilo === SUBTOTAL || f.estilo === ENCABEZADO_ASIENTO ? F.bold : F.normal;
    if (f.estilo === TOTAL) linea(y);
    textos(inf, f).forEach((t, i) => {
      if (t) { const [x, w] = xs[i]; texto(x + pad, y, w - 2 * pad, t, fuente, alineacion(inf.columnas[i])); }
    });
    y += lh;
    if (f.estilo === TOTAL) linea(y);
    return y;
  }

  function totalPagina(y: number, sumas: Map<number, number>) {
    linea(y);
    const cols = inf.totalesPagina;
    texto(pad, y, xs[cols[0]][0] - 2 * pad, "TOTAL PÁGINA .......", F.bold, "R");
    for (const i of cols) { const [x, w] = xs[i]; texto(x + pad, y, w - 2 * pad, util.fmtMonto(sumas.get(i) ?? 0), F.bold, "R"); }
  }

  const reserva = inf.totalesPagina.length ? lh * 1.6 : 0;
  const limite = H - reserva;
  let y = encabezado();
  let sumas = new Map<number, number>();
  for (const f of inf.filas) {
    const a = lh * (f.estilo === GRUPO ? 1.25 : 1);
    if (y + a > limite) {
      if (inf.totalesPagina.length) { totalPagina(y + lh * 0.3, sumas); sumas = new Map(); }
      nuevaPagina();
      y = encabezado();
    }
    if (inf.totalesPagina.length && f.estilo !== TOTAL) {
      for (const i of inf.totalesPagina) {
        const v = i < f.valores.length ? f.valores[i] : null;
        if (typeof v === "number") sumas.set(i, (sumas.get(i) ?? 0) + Math.trunc(v));
      }
    }
    y = fila(y, f);
  }
  if (inf.totalesPagina.length && sumas.size) {
    if (y + lh * 1.5 > H) { nuevaPagina(); y = encabezado(); }
    totalPagina(y + lh * 0.3, sumas);
    y += lh * 1.5;
  }
  if (inf.pie.length) {                                   // Pie (detalle, Art. 100, etc.)
    y += lh * 0.6;
    for (const t of inf.pie) {
      if (y + lh > H) { nuevaPagina(); y = encabezado(); }
      texto(0, y, W, t, F.normal);
      y += lh;
    }
  }
  if (inf.firmas.length) {                                // Firmas
    if (y + lh * 5 > H) { nuevaPagina(); y = encabezado(); }
    y += lh * 3.5;
    const ancho = W / inf.firmas.length;
    inf.firmas.forEach((t, i) => {
      const x1 = ancho * i + ancho * 0.12, x2 = ancho * (i + 1) - ancho * 0.12;
      linea(y, x1, x2);
      texto(x1, y + lh * 0.1, x2 - x1, t, F.bold, "C");
    });
  }
  doc.end();
  return fin;
}
