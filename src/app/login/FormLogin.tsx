"use client";
import { startTransition, useActionState, useRef, useState } from "react";
import { Icono } from "@/components/Icono";
import { ingresar, type EstadoLogin } from "./acciones";

export default function FormLogin({ bloqueadoInicial }: { bloqueadoInicial: boolean }) {
  const [estado, accion, enviando] = useActionState<EstadoLogin | undefined, FormData>(ingresar,
    bloqueadoInicial ? { error: "Acceso no autorizado.\n\nSe superó el número de intentos.", bloqueado: true } : undefined);
  const [nombre, setNombre] = useState<{ texto: string; error: boolean }>({ texto: "", error: false });
  const [ver, setVer] = useState(false);
  const clave = useRef<HTMLInputElement>(null);
  const bloqueado = !!estado?.bloqueado;

  // confirmación del nombre al salir del campo usuario: CAC -> ✓ CLAUDIO COFRE V
  async function mostrarNombre(texto: string) {
    texto = texto.trim();
    if (!texto) return setNombre({ texto: "", error: false });
    const r = await fetch(`/api/usuario?u=${encodeURIComponent(texto)}`).then((x) => x.json()).catch(() => null);
    setNombre(r?.nombre ? { texto: `✓ ${r.nombre}`, error: false } : { texto: "No existe ese usuario.", error: true });
  }

  return (
    <form className="columna" style={{ gap: 6, marginTop: 8 }} onSubmit={(e) => {
      // se envía sin «action» para que el formulario no se limpie: el usuario se conserva, la clave se borra
      e.preventDefault();
      const datos = new FormData(e.currentTarget);
      startTransition(() => accion(datos));
    }}>
      <label className="etiqueta" htmlFor="usuario">Usuario</label>
      <input id="usuario" name="usuario" className="campo" maxLength={10} placeholder="Ej.: CAC" autoFocus
        autoComplete="username" disabled={bloqueado}
        onBlur={(e) => mostrarNombre(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); clave.current?.focus(); } }} />
      <span className={`ayuda ${nombre.error ? "error-txt" : "ok"}`} style={{ minHeight: 20 }} aria-live="polite">{nombre.texto}</span>
      <label className="etiqueta" htmlFor="clave">Clave</label>
      <div className="campo-clave">
        <input id="clave" name="clave" ref={clave} key={estado?.restantes ?? "x"} type={ver ? "text" : "password"}
          className={`campo ${estado?.error ? "con-error" : ""}`} autoComplete="current-password" disabled={bloqueado}
          autoFocus={!!estado?.error} />
        <button type="button" onClick={() => setVer(!ver)} title="Mostrar u ocultar la clave"
          aria-label={ver ? "Ocultar clave" : "Mostrar clave"}>
          <Icono nombre={ver ? "ojo_cerrado" : "ojo"} />
        </button>
      </div>
      <div aria-live="assertive" style={{ minHeight: 8 }}>
        {estado?.error && <div className="alerta-error" role="alert" style={{ marginBottom: 8 }}><Icono nombre="alerta" /><span>{estado.error}</span></div>}
      </div>
      <button className="boton primario ancho" type="submit" disabled={enviando || bloqueado}>Ingresar</button>
    </form>
  );
}
