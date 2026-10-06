"use client";
/**
 * Panel lateral: la ÚNICA capa de trabajo sobre una página (docs/ADR-002).
 * Escritorio: hoja a la derecha que deja ver la página detrás. Móvil: pantalla completa.
 * Esc cierra el panel (o llama a onEsc, p. ej. para volver al paso anterior). El foco vuelve a donde estaba.
 */
import { useEffect, useRef } from "react";
import { Icono } from "./Icono";

export function Panel({ titulo, subtitulo, children, pie, onCerrar, onEsc, ancho = false, error, cabezaExtra }: {
  titulo: React.ReactNode; subtitulo?: React.ReactNode; children: React.ReactNode; pie?: React.ReactNode;
  onCerrar: () => void; onEsc?: () => void; ancho?: boolean; error?: string | null; cabezaExtra?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => { anterior?.focus?.(); };
  }, []);
  return (
    <dialog ref={ref} className={`panel ${ancho ? "ancho" : ""}`} aria-labelledby="panel-titulo"
      onCancel={(e) => { e.preventDefault(); if (!document.querySelector("dialog.confirmacion[open]")) (onEsc ?? onCerrar)(); }}>
      <div className="panel-cabeza">
        <div className="textos">
          <h2 id="panel-titulo" className="subtitulo">{titulo}</h2>
          {subtitulo && <div className="ayuda">{subtitulo}</div>}
          {cabezaExtra}
        </div>
        <button type="button" className="boton fantasma icono-solo" aria-label="Cerrar" onClick={onCerrar}><Icono nombre="cerrar" /></button>
      </div>
      <div className="panel-cuerpo">
        {error && <div className="alerta-error" role="alert"><Icono nombre="alerta" /><span>{error}</span></div>}
        {children}
      </div>
      {pie && <div className="panel-pie">{pie}</div>}
    </dialog>
  );
}

/** Indicador de pasos dentro de un panel. */
export function Stepper({ pasos, actual }: { pasos: string[]; actual: number }) {
  return (
    <ol className="pasos" aria-label="Pasos">
      {pasos.map((p, i) => (
        <li key={p} className={i < actual ? "hecho" : ""} aria-current={i === actual ? "step" : undefined}>
          <span className="n" aria-hidden="true">{i < actual ? "✓" : i + 1}</span>{p}
        </li>
      ))}
    </ol>
  );
}
