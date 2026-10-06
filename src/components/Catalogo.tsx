"use client";
/**
 * Ventana genérica de mantención (diálogo "BROWSE" del original — ui/catalogo.py):
 * grilla + orden + búsqueda + Nuevo / Modificar / Borrar / Excel / Imprimir / Cerrar.
 * Teclas: Insert = nuevo, Supr = borrar, Enter o doble clic = modificar.
 * Los formularios se abren en un único panel lateral (children); borrar pide una sola confirmación.
 */
import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icono } from "./Icono";
import { useMensajes } from "./Mensajes";
import { PaginaCabeza } from "./Pagina";
import { ColumnaTabla, Tabla } from "./Tabla";

export interface FilaCatalogo { clave: string; valores: string[]; descripcion?: string }
export type Resultado = { error?: string } | void;

export function Catalogo({ titulo, subtitulo, columnas, filas, ordenes, ordenActual, onNuevo, onModificar, onBorrar,
  campoConfirmacion, informe, extras = [], seleccionInicial, children }: {
  titulo: string; subtitulo?: string; columnas: ColumnaTabla[]; filas: FilaCatalogo[];
  ordenes: [string, string][]; ordenActual: string;
  onNuevo?: () => void; onModificar?: (clave: string) => void;
  onBorrar?: (clave: string, textoConfirmacion?: string) => Promise<Resultado>;
  /** Si se indica, la confirmación de borrado pide además escribir un texto (p. ej. el RUT de la empresa). */
  campoConfirmacion?: (clave: string) => string;
  informe?: string;                                        // ruta del listado: /api/informe?tipo=...
  extras?: { texto: string; icono: string; accion: (clave: string) => void }[];
  seleccionInicial?: string | null;
  children?: React.ReactNode;                               // panel de formulario abierto
}) {
  const m = useMensajes();
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();
  const [buscar, setBuscar] = useState("");
  const [sel, setSel] = useState<string | null>(seleccionInicial ?? null);
  const [, iniciar] = useTransition();

  const visibles = useMemo(() => {
    const t = buscar.trim().toLowerCase();
    return t ? filas.filter((f) => f.valores.some((v) => v.toLowerCase().includes(t))) : filas;
  }, [filas, buscar]);

  useEffect(() => {
    if (seleccionInicial && filas.some((f) => f.clave === seleccionInicial)) setSel(seleccionInicial);
  }, [seleccionInicial, filas]);
  useEffect(() => {
    if (!visibles.some((f) => f.clave === sel)) setSel(visibles[0]?.clave ?? null);
  }, [visibles, sel]);

  function cambiarOrden(o: string) {
    const p = new URLSearchParams(params);
    p.set("orden", o);
    router.replace(`${ruta}?${p}`);
  }

  async function borrar() {
    if (!sel || !onBorrar) return;
    const f = filas.find((x) => x.clave === sel);
    const opciones = { detalle: f?.descripcion ?? sel, accion: "Borrar", peligro: true };
    let texto: string | undefined;
    if (campoConfirmacion) {
      const t = await m.confirmarConTexto("¿Borrar este registro?", "Borrar registro", campoConfirmacion(sel), opciones);
      if (t === null) return;
      texto = t;
    } else if (!(await m.confirmar("¿Borrar este registro?", "Borrar registro", opciones))) return;
    const r = await onBorrar(sel, texto);
    if (r && r.error) return m.error(r.error);
    iniciar(() => router.refresh());
  }

  async function exportar(formato: "xlsx" | "pdf") {
    if (!filas.length) return m.error("No hay datos para mostrar.", "Atención");
    window.open(`${informe}${informe!.includes("?") ? "&" : "?"}formato=${formato}`, "_blank");
  }

  function tecla(e: React.KeyboardEvent) {
    if (e.key === "Insert" && onNuevo) { e.preventDefault(); onNuevo(); }
    else if ((e.key === "Delete" || e.key === "Supr") && onBorrar) { e.preventDefault(); borrar(); }
  }

  return (
    <div className="columna" style={{ gap: 20 }}>
      <PaginaCabeza titulo={titulo} subtitulo={subtitulo}
        acciones={onNuevo && <button className="boton primario" title="Insert" onClick={onNuevo}><Icono nombre="mas" />Nuevo</button>} />
      <div className="herramientas">
        <div className="buscar">
          <Icono nombre="buscar" />
          <input className="campo" type="search" aria-label="Buscar" placeholder="Buscar (escribe para filtrar)" value={buscar}
            onChange={(e) => setBuscar(e.target.value)} />
        </div>
        {ordenes.length > 1 && (
          <label className="orden">
            <span className="etiqueta" style={{ margin: 0 }}>Ordenar por</span>
            <select className="control" value={ordenActual} onChange={(e) => cambiarOrden(e.target.value)}>
              {ordenes.map(([et, v]) => <option key={v} value={v}>{et}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="fila" style={{ gap: 6 }}>
        {onModificar && <button className="boton" title="Enter o doble clic" disabled={!sel} onClick={() => sel && onModificar(sel)}><Icono nombre="editar" />Modificar</button>}
        {extras.map((x) => (
          <button key={x.texto} className="boton" disabled={!sel} onClick={() => sel && x.accion(sel)}><Icono nombre={x.icono} />{x.texto}</button>
        ))}
        {onBorrar && <button className="boton peligro" title="Supr" disabled={!sel} onClick={borrar}><Icono nombre="borrar" />Borrar</button>}
        <span className="espacio" />
        {informe && <>
          <button className="boton fantasma" title="Exportar el listado a Excel" onClick={() => exportar("xlsx")}><Icono nombre="excel" />Excel</button>
          <button className="boton fantasma" title="Vista previa e impresión" onClick={() => exportar("pdf")}><Icono nombre="imprimir" />Imprimir</button>
        </>}
      </div>
      <Tabla etiqueta={titulo} columnas={columnas} filas={visibles.map((f) => ({ clave: f.clave, valores: f.valores }))} seleccion={sel}
        onSeleccion={setSel} onActivar={(k) => onModificar?.(k)} onTecla={tecla}
        vacio={buscar ? "Ningún registro coincide con la búsqueda." : "Sin registros"} />
      <div className="fila">
        <span className="contador">{visibles.length} de {filas.length} registros · <span className="kbd">Insert</span> nuevo · <span className="kbd">Enter</span> modificar · <span className="kbd">Supr</span> borrar</span>
        <span className="espacio" />
        <button className="boton" onClick={() => router.push("/")}><Icono nombre="cerrar" />Cerrar</button>
      </div>
      {children}
    </div>
  );
}
