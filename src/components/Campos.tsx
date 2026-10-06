"use client";
/** Controles reutilizables (ui/comunes.py): MontoEdit, RutEdit, CodigoCuentaEdit, FechaEdit y Buscador. */
import { forwardRef, useEffect, useId, useMemo, useRef, useState } from "react";
import * as util from "@/lib/util";

/** Montos enteros con separador de miles (PICTURE "@RE 999,999,999,999"). */
export const MontoInput = forwardRef<HTMLInputElement, {
  valor: number; onCambio?: (v: number) => void; soloLectura?: boolean; id?: string; autoFocus?: boolean; name?: string;
}>(function MontoInput({ valor, onCambio, soloLectura, id, autoFocus, name }, ref) {
  const [texto, setTexto] = useState(util.fmtMonto(valor));
  useEffect(() => { setTexto(util.fmtMonto(valor)); }, [valor]);
  return (
    <input ref={ref} id={id} name={name} className="campo cifra" inputMode="numeric" maxLength={18} readOnly={soloLectura}
      autoFocus={autoFocus} value={texto}
      onChange={(e) => {
        const t = e.target.value;
        if (/^-?[0-9.]{0,17}$/.test(t)) { setTexto(t); onCambio?.(util.parseMonto(t)); }
      }}
      onBlur={() => setTexto(util.fmtMonto(util.parseMonto(texto)))}
      onFocus={(e) => e.target.select()} />
  );
});

export function RutInput({ valor, onCambio, soloLectura, id, autoFocus }: {
  valor: string; onCambio: (v: string) => void; soloLectura?: boolean; id?: string; autoFocus?: boolean;
}) {
  return (
    <input id={id} className="campo cifra" style={{ textAlign: "left" }} placeholder="12.345.678-9" readOnly={soloLectura}
      autoFocus={autoFocus} value={valor} maxLength={13}
      onChange={(e) => { if (/^[0-9kK.\- ]{0,13}$/.test(e.target.value)) onCambio(e.target.value); }}
      onBlur={() => { if (valor) onCambio(util.formatoRut(valor)); }} />
  );
}

/** PICTURE "@R 99.99.99" */
export function CodigoCuentaInput({ valor, onCambio, soloLectura, id, autoFocus }: {
  valor: string; onCambio: (v: string) => void; soloLectura?: boolean; id?: string; autoFocus?: boolean;
}) {
  return (
    <input id={id} className="campo mono" placeholder="99.99.99" readOnly={soloLectura} autoFocus={autoFocus}
      value={util.formatoCodigo(valor)} maxLength={8} style={{ maxWidth: 140 }}
      onChange={(e) => onCambio(e.target.value.replace(/\D/g, "").slice(0, 6))} />
  );
}

/** Fecha dd/mm/aaaa con calendario (reemplaza CALENDARIO()). Valor en ISO. */
export function FechaInput({ valor, onCambio, deshabilitado, id, name }: {
  valor: string; onCambio?: (v: string) => void; deshabilitado?: boolean; id?: string; name?: string;
}) {
  return (
    <input id={id} name={name} type="date" className="campo" style={{ maxWidth: 180 }} value={valor} disabled={deshabilitado}
      min="1900-01-01" max="2200-12-31" required onChange={(e) => onCambio?.(e.target.value)} />
  );
}

export type Item = readonly [codigo: string, nombre: string];

/**
 * Combo con búsqueda por texto (reemplaza Brw_Cuenta / Brw_CCosto / BrowseExiste).
 * Se puede escribir parte del nombre o el código (con o sin puntos/guión).
 */
export function Combo({ items, valor, onCambio, formato = (c) => c, permitirVacio = false, textoVacio = "",
  deshabilitado, id, autoFocus, placeholder }: {
  items: ReadonlyArray<Item>; valor: string | null; onCambio: (codigo: string | null) => void;
  formato?: (c: string) => string; permitirVacio?: boolean; textoVacio?: string; deshabilitado?: boolean; id?: string;
  autoFocus?: boolean; placeholder?: string;
}) {
  const textoDe = (cod: string | null) => {
    if (cod === null || cod === undefined) return "";
    if (cod === "" && permitirVacio) return textoVacio;
    const it = items.find(([c]) => c === cod);
    return it ? `${formato(it[0])}   ${it[1]}` : "";
  };
  const [texto, setTexto] = useState(textoDe(valor));
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const listaId = useId();
  const lista = useRef<HTMLUListElement>(null);
  useEffect(() => { setTexto(textoDe(valor)); }, [valor, items]);   // eslint-disable-line react-hooks/exhaustive-deps

  const opciones = useMemo(() => {
    const base: Item[] = permitirVacio ? [["", textoVacio], ...items] : [...items];
    const t = texto.trim().toLowerCase();
    if (!t || t === textoDe(valor).toLowerCase()) return base;
    return base.filter(([c, n]) => `${formato(c)}   ${n}`.toLowerCase().includes(t) || c.toLowerCase().includes(t.replace(/[.\-\s]/g, "")));
  }, [texto, items, permitirVacio, textoVacio]);   // eslint-disable-line react-hooks/exhaustive-deps

  function elegir(cod: string | null) {
    onCambio(cod);
    setTexto(textoDe(cod));
    setAbierto(false);
  }
  /** Buscador.codigo(): resuelve lo escrito (texto exacto o solo el código). */
  function resolver() {
    const t = texto.trim();
    if (!t) return elegir(permitirVacio ? "" : null);
    const exacto = items.find(([c, n]) => `${formato(c)}   ${n}` === texto);
    if (exacto) return elegir(exacto[0]);
    const primero = t.split(/\s+/)[0];
    const por = items.find(([c]) => c && (c.toUpperCase() === primero.toUpperCase()
      || util.limpiarCodigo(c) === util.limpiarCodigo(primero) || util.limpiarRut(c) === util.limpiarRut(primero)));
    if (por) return elegir(por[0]);
    if (opciones.length === 1) return elegir(opciones[0][0]);
    elegir(null);
  }
  useEffect(() => {
    lista.current?.querySelector("li.activo")?.scrollIntoView({ block: "nearest" });
  }, [activo]);

  return (
    <div className="combo">
      <input id={id} className="campo" role="combobox" aria-expanded={abierto} aria-controls={listaId} autoComplete="off"
        disabled={deshabilitado} autoFocus={autoFocus} placeholder={placeholder} value={texto}
        onChange={(e) => { setTexto(e.target.value); setAbierto(true); setActivo(0); }}
        onFocus={(e) => { e.target.select(); }}
        onClick={() => setAbierto(true)}
        onBlur={() => setTimeout(() => { if (abierto) resolver(); else setTexto(textoDe(valor)); }, 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setAbierto(true); setActivo((a) => Math.min(a + 1, opciones.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter") {
            if (abierto) { e.preventDefault(); if (opciones[activo]) elegir(opciones[activo][0]); else resolver(); }
          } else if (e.key === "Escape" && abierto) { e.preventDefault(); e.stopPropagation(); setAbierto(false); setTexto(textoDe(valor)); }
          else if (e.key === "Tab" && abierto) resolver();
        }} />
      {abierto && opciones.length > 0 && !deshabilitado && (
        <ul className="combo-lista" id={listaId} ref={lista} role="listbox">
          {opciones.slice(0, 300).map(([c, n], i) => (
            <li key={c || "_vacio"} role="option" aria-selected={i === activo} className={i === activo ? "activo" : ""}
              onMouseDown={(e) => { e.preventDefault(); elegir(c); }}>
              {c ? <><span className="cod">{formato(c)}</span>{n}</> : n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
