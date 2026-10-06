"use client";
/** Consulta en pantalla + Vista previa / Imprimir / PDF / Excel (VisorInforme de ui/impresion.py). */
import { useState } from "react";
import { Icono } from "@/components/Icono";
import { Tabla } from "@/components/Tabla";

export default function Visor({ titulo, sub, columnas, filas, pie, consulta }: {
  titulo: string; sub: string; columnas: { titulo: string; ancho: number; alinear: "L" | "R" | "C" }[];
  filas: { estilo: string; valores: string[] }[]; pie: string[]; consulta: string;
}) {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <section className="papel" aria-labelledby="inf-titulo">
      <div className="papel-cabeza">
        <div className="columna" style={{ gap: 4, flex: 1, minWidth: 220 }}>
          <span className="sobretitulo">Informe</span>
          <h2 id="inf-titulo" className="subtitulo">{titulo}</h2>
          {sub && <div className="secundario" style={{ fontSize: 13 }}>{sub}</div>}
        </div>
        <div className="fila">
          <a className="boton primario" href={`${consulta}&formato=pdf`} target="_blank" rel="noopener"><Icono nombre="imprimir" />Vista previa e imprimir</a>
          <a className="boton" href={`${consulta}&formato=pdf&descargar=1`}><Icono nombre="guardar" />Guardar PDF</a>
          <a className="boton" href={`${consulta}&formato=xlsx`}><Icono nombre="excel" />Exportar a Excel</a>
          <a className="boton fantasma" href={`${consulta}&formato=csv`}>CSV</a>
        </div>
      </div>
      <Tabla etiqueta={titulo} alta={false} columnas={columnas.map((c) => ({ titulo: c.titulo, ancho: c.ancho || undefined, alinear: c.alinear }))}
        filas={filas.map((f, i) => ({ clave: i, valores: f.valores,
          estilo: f.estilo === "grupo" ? "grupo" : f.estilo ? `negrita ${f.estilo === "total" ? "total" : ""}` : "" }))}
        seleccion={sel} onSeleccion={setSel} />
      {pie.length > 0 && <div className="papel-pie">{pie.join("\n")}</div>}
    </section>
  );
}
