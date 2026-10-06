"use client";
/**
 * Mensajes (Alert / MsgYesNo / MsgStop del original — info, error y confirmar de ui/comunes.py).
 *
 * Regla de UX (docs/ADR-002): nunca hay más de una capa sobre el área de trabajo.
 *  - confirmar / confirmarConTexto: única capa modal permitida (preguntas y acciones destructivas).
 *  - info / error: notificaciones no bloqueantes (aria-live), con el mismo texto que antes.
 *    Los errores de validación de un formulario se muestran dentro del formulario (ver Panel).
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Icono } from "./Icono";

interface OpcionesConfirmar { detalle?: string; accion?: string; peligro?: boolean }
interface Pregunta {
  titulo: string; texto: string; opciones: OpcionesConfirmar; campo?: string;
  resolver: (v: boolean | string | null) => void;
}
interface Noti { id: number; tipo: "ok" | "error"; titulo: string; texto: string }
interface Api {
  info(texto: string, titulo?: string): Promise<void>;
  error(texto: string, titulo?: string): Promise<void>;
  confirmar(texto: string, titulo?: string, opciones?: OpcionesConfirmar): Promise<boolean>;
  /** Confirmación con un campo de texto (p. ej. escribir el RUT para borrar). null = canceló. */
  confirmarConTexto(texto: string, titulo: string, campo: string, opciones?: OpcionesConfirmar): Promise<string | null>;
}

const Ctx = createContext<Api | null>(null);

export function useMensajes(): Api {
  const c = useContext(Ctx);
  if (!c) throw new Error("useMensajes fuera de <ProveedorMensajes>");
  return c;
}

let siguienteId = 1;

export function ProveedorMensajes({ children }: { children: React.ReactNode }) {
  const [pregunta, setPregunta] = useState<Pregunta | null>(null);
  const [notis, setNotis] = useState<Noti[]>([]);

  const notificar = useCallback((tipo: Noti["tipo"], titulo: string, texto: string) => {
    const id = siguienteId++;
    setNotis((n) => [...n.slice(-3), { id, tipo, titulo, texto }]);
    setTimeout(() => setNotis((n) => n.filter((x) => x.id !== id)), tipo === "error" ? 9000 : 6000);
    return Promise.resolve();
  }, []);

  const api: Api = {
    info: (texto, titulo = "Atención") => notificar("ok", titulo, texto),
    error: (texto, titulo = "Error") => notificar("error", titulo, texto),
    confirmar: (texto, titulo = "Pregunta", opciones = {}) =>
      new Promise<boolean>((r) => setPregunta({ titulo, texto, opciones, resolver: (v) => r(v === true) })),
    confirmarConTexto: (texto, titulo, campo, opciones = {}) =>
      new Promise<string | null>((r) => setPregunta({ titulo, texto, opciones, campo, resolver: (v) => r(typeof v === "string" ? v : null) })),
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      {pregunta && <Confirmacion p={pregunta} cerrar={(v) => { pregunta.resolver(v); setPregunta(null); }} />}
      <div className="notificaciones" aria-live="polite" role="status">
        {notis.map((n) => (
          <div key={n.id} className={`notificacion ${n.tipo === "error" ? "error" : ""}`} role={n.tipo === "error" ? "alert" : undefined}>
            <Icono nombre={n.tipo === "error" ? "alerta" : "ok"} tam={20} />
            <div className="cuerpo"><strong>{n.titulo}</strong><span>{n.texto}</span></div>
            <button className="boton fantasma icono-solo" aria-label="Cerrar aviso" style={{ minHeight: 28, width: 28 }}
              onClick={() => setNotis((x) => x.filter((y) => y.id !== n.id))}><Icono nombre="cerrar" tam={16} /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

function Confirmacion({ p, cerrar }: { p: Pregunta; cerrar: (v: boolean | string | null) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [valor, setValor] = useState("");
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => anterior?.focus?.();
  }, []);
  const cancelar = () => cerrar(p.campo !== undefined ? null : false);
  return (
    <dialog ref={ref} className="confirmacion" aria-labelledby="conf-titulo" aria-describedby="conf-texto"
      onCancel={(e) => { e.preventDefault(); cancelar(); }}>
      <form className="confirmacion-cuerpo" onSubmit={(e) => { e.preventDefault(); cerrar(p.campo !== undefined ? valor : true); }}>
        <div className="fila" style={{ gap: 10, flexWrap: "nowrap", alignItems: "flex-start" }}>
          <Icono nombre={p.opciones.peligro ? "alerta" : "info"} tam={22} className={p.opciones.peligro ? "error-txt" : "secundario"} />
          <div className="columna" style={{ gap: 6, minWidth: 0 }}>
            <h2 id="conf-titulo" className="subtitulo">{p.titulo}</h2>
            <p id="conf-texto" style={{ whiteSpace: "pre-line" }}>{p.texto}</p>
          </div>
        </div>
        {p.opciones.detalle && <div className="detalle">{p.opciones.detalle}</div>}
        {p.campo !== undefined && (
          <div className="campo-grupo">
            <label className="etiqueta" htmlFor="conf-campo">{p.campo}</label>
            <input id="conf-campo" className="campo" autoFocus value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
        )}
        <div className="fila-fin">
          <button type="button" className="boton" onClick={cancelar} autoFocus={p.campo === undefined}>{p.campo !== undefined ? "Cancelar" : "No"}</button>
          <button type="submit" className={`boton ${p.opciones.peligro ? "peligro-lleno" : "primario"}`}>{p.opciones.accion ?? "Sí"}</button>
        </div>
      </form>
    </dialog>
  );
}
