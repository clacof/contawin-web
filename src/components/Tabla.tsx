"use client";
/** Grilla de solo lectura con una fila seleccionada (reemplaza TSBrowse — ui/comunes.py Tabla). */
import { useEffect, useRef } from "react";

export interface ColumnaTabla { titulo: string; ancho?: number; alinear?: "L" | "R" | "C"; mono?: boolean }
export interface FilaTabla<K> { clave: K; valores: React.ReactNode[]; estilo?: string; claseValor?: (string | undefined)[] }

export function Tabla<K>({ columnas, filas, seleccion, onSeleccion, onActivar, onTecla, alta = true, vacio, etiqueta }: {
  columnas: ColumnaTabla[]; filas: FilaTabla<K>[]; seleccion?: K | null; onSeleccion?: (k: K) => void;
  onActivar?: (k: K) => void; onTecla?: (e: React.KeyboardEvent) => void; alta?: boolean; vacio?: React.ReactNode; etiqueta?: string;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const idx = filas.findIndex((f) => f.clave === seleccion);
  useEffect(() => {
    caja.current?.querySelector("tr.sel")?.scrollIntoView({ block: "nearest" });
  }, [idx]);
  return (
    <div className={`tabla-caja ${alta ? "alta" : ""}`} ref={caja} tabIndex={0} role="region"
      aria-label={etiqueta ? `${etiqueta} (flechas para moverse, Enter para abrir)` : undefined}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const n = Math.max(0, Math.min(filas.length - 1, (idx < 0 ? -1 : idx) + (e.key === "ArrowDown" ? 1 : -1)));
          if (filas[n]) onSeleccion?.(filas[n].clave);
        } else if (e.key === "Enter" && seleccion !== null && seleccion !== undefined && idx >= 0) {
          e.preventDefault();
          onActivar?.(seleccion);
        } else onTecla?.(e);
      }}>
      <table className="tabla">
        <thead>
          <tr>{columnas.map((c, i) => (
            <th key={i} className={c.alinear === "R" ? "R" : c.alinear === "C" ? "C" : ""} scope="col" style={{ width: c.ancho || undefined, fontFamily: "inherit" }}>{c.titulo}</th>
          ))}</tr>
        </thead>
        <tbody>
          {filas.map((f, r) => (
            <tr key={r} className={`${f.clave === seleccion ? "sel" : ""} ${f.estilo ?? ""}`} aria-selected={f.clave === seleccion}
              onClick={() => onSeleccion?.(f.clave)} onDoubleClick={() => onActivar?.(f.clave)}>
              {f.estilo === "grupo"
                ? <td colSpan={columnas.length}>{f.valores[0]}</td>
                : columnas.map((c, i) => (
                  <td key={i} className={[c.alinear === "R" ? "R" : c.alinear === "C" ? "C" : "", c.mono ? "M" : "", f.claseValor?.[i] ?? ""].join(" ")}
                    title={typeof f.valores[i] === "string" ? (f.valores[i] as string) : undefined}>{f.valores[i]}</td>
                ))}
            </tr>
          ))}
          {!filas.length && vacio && <tr><td colSpan={columnas.length} className="vacio-celda">{vacio}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
