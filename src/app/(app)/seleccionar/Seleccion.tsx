"use client";
/**
 * SeleccionEmpresaDialog + SeleccionAnoDialog (ui/inicio.py) como una sola página maestro-detalle:
 * empresas a la izquierda, años de la empresa marcada a la derecha (docs/ADR-002).
 * «Crear nuevo año…» se completa en línea; el aviso del asiento de apertura es una notificación.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Icono } from "@/components/Icono";
import { useMensajes } from "@/components/Mensajes";
import { PaginaCabeza } from "@/components/Pagina";
import { Tabla } from "@/components/Tabla";
import { crearAno, elegirTrabajo, periodosDe } from "./acciones";

interface FilaEmpresa { id: number; valores: string[] }

export default function Seleccion({ aviso, mensaje, empresas, empresaInicial, periodoInicial, abrirAnos }: {
  aviso?: string; mensaje?: string; empresas: FilaEmpresa[]; empresaInicial: number | null; periodoInicial: number | null;
  abrirAnos: boolean;
}) {
  const m = useMensajes();
  const router = useRouter();
  const [buscar, setBuscar] = useState("");
  const [sel, setSel] = useState<number | null>(
    empresaInicial && empresas.some((e) => e.id === empresaInicial) ? empresaInicial : empresas[0]?.id ?? null);
  const [anos, setAnos] = useState<{ empresaId: number; lista: { id: number; ano: number }[] } | null>(null);
  const [selAno, setSelAno] = useState<number | null>(null);
  const [creando, setCreando] = useState<string | null>(null);       // texto del año nuevo en edición
  const [errorAno, setErrorAno] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const detalle = useRef<HTMLElement>(null);

  const visibles = useMemo(() => {
    const t = buscar.trim().toLowerCase();
    return t ? empresas.filter((e) => e.valores.some((v) => v.toLowerCase().includes(t))) : empresas;
  }, [buscar, empresas]);

  async function abrirAnosDe(empresaId: number, seleccionar?: number | null, enfocar = false) {
    const lista = await periodosDe(empresaId);
    setAnos({ empresaId, lista });
    setCreando(null);
    setErrorAno(null);
    setSelAno(seleccionar && lista.some((p) => p.id === seleccionar) ? seleccionar : lista.at(-1)?.id ?? null);   // el año más reciente
    if (enfocar) setTimeout(() => detalle.current?.querySelector<HTMLElement>("[aria-pressed=true], button")?.focus(), 0);
  }
  // al marcar una empresa se muestran sus años
  useEffect(() => {
    if (sel !== null && (!anos || anos.empresaId !== sel)) abrirAnosDe(sel, sel === empresaInicial ? periodoInicial : null);
  }, [sel]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mensaje) m.info(mensaje, "Asiento de apertura");
    if (abrirAnos && empresaInicial) setTimeout(() => detalle.current?.querySelector<HTMLElement>("[aria-pressed=true]")?.focus(), 300);
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  async function nuevoAno(e: React.FormEvent) {
    e.preventDefault();
    if (!anos || creando === null) return;
    const ano = parseInt(creando, 10);
    if (Number.isNaN(ano) || ano < 1981 || ano > 2200) return setErrorAno("Año inválido.");
    const r = await crearAno(anos.empresaId, ano);
    if (r.error) return setErrorAno(r.error);
    if (r.apertura) return router.push(`/apertura?empresa=${anos.empresaId}&ano=${ano}`);
    await abrirAnosDe(anos.empresaId, r.pid);
  }

  function aceptarAno(pid: number | null = selAno) {
    if (!anos) return;
    if (pid === null) return setErrorAno("La empresa no tiene años de trabajo. Crea uno con el botón «Crear nuevo año…».");
    iniciar(async () => {
      const r = await elegirTrabajo(anos.empresaId, pid);
      if (r?.error) setErrorAno(r.error);
    });
  }

  if (!empresas.length) {
    return (
      <div className="tarjeta vacio" style={{ padding: "56px 24px" }}>
        <Icono nombre="empresa" tam={40} />
        <h1 className="titulo" style={{ color: "var(--ink)" }}>No hay empresas en la base de datos</h1>
        <p>¿Quieres importar los datos del ContaWin antiguo (archivos DBF) o crear una empresa nueva?</p>
        <div className="fila" style={{ justifyContent: "center" }}>
          <Link className="boton primario" href="/utilidades/importar"><Icono nombre="importar" />Importar datos DBF</Link>
          <Link className="boton" href="/empresas?nuevo=1"><Icono nombre="mas" />Crear empresa nueva</Link>
        </div>
      </div>
    );
  }

  const empresaAnos = anos ? empresas.find((e) => e.id === anos.empresaId) : null;
  return (
    <div className="columna" style={{ gap: 20 }}>
      {aviso && <div className="alerta-error" role="alert"><Icono nombre="alerta" /><span>{aviso}</span></div>}
      <PaginaCabeza titulo="Selecciona la empresa y el año de trabajo"
        subtitulo="Marca una empresa para ver sus años. Doble clic o Enter en un año para trabajar en él." />
      <div className="maestro-detalle">
        <section className="columna" aria-label="Empresas" style={{ gap: 12 }}>
          <div className="buscar">
            <Icono nombre="buscar" />
            <input className="campo" type="search" autoFocus aria-label="Buscar empresa" placeholder="Buscar por RUT, razón social o giro" value={buscar}
              onChange={(e) => setBuscar(e.target.value)} />
          </div>
          <Tabla etiqueta="Empresas" columnas={[{ titulo: "RUT", ancho: 130, alinear: "R" }, { titulo: "Razón social" }, { titulo: "Giro", ancho: 220 }]}
            filas={visibles.map((e) => ({ clave: e.id, valores: e.valores }))} seleccion={sel} onSeleccion={setSel}
            onActivar={(id) => abrirAnosDe(id, null, true)} vacio="Ninguna empresa coincide con la búsqueda." />
        </section>

        <section ref={detalle} className="tarjeta columna" aria-labelledby="anos-titulo" style={{ gap: 14 }}>
          <div>
            <h2 id="anos-titulo" className="subtitulo">Año de trabajo</h2>
            <div className="secundario" style={{ fontSize: 13 }}>{empresaAnos?.valores[1] ?? "Marca una empresa"}</div>
          </div>
          {errorAno && <div className="alerta-error" role="alert"><Icono nombre="alerta" /><span>{errorAno}</span></div>}
          {anos && (anos.lista.length ? (
            <ul className="lista-anos" aria-label="Años">
              {[...anos.lista].reverse().map((p) => (
                <li key={p.id}>
                  <button aria-pressed={p.id === selAno} onClick={() => setSelAno(p.id)} onDoubleClick={() => aceptarAno(p.id)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); aceptarAno(p.id); } }}>
                    <Icono nombre="calendario" tam={18} />{p.ano}
                    {p.id === selAno && <Icono nombre="check" tam={18} className="ok" />}
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="secundario">Sin años de trabajo.</p>)}
          {creando === null ? (
            <button className="boton" onClick={() => { setErrorAno(null); setCreando(String(new Date().getFullYear())); }} disabled={!anos}>
              <Icono nombre="mas" />Crear nuevo año…</button>
          ) : (
            <form className="seccion-panel" onSubmit={nuevoAno} aria-label="Crear nuevo año">
              <div className="campo-grupo">
                <label className="etiqueta" htmlFor="ano-nuevo">Año de trabajo:</label>
                <input id="ano-nuevo" className="campo cifra" style={{ textAlign: "left", maxWidth: 140 }} inputMode="numeric" autoFocus
                  value={creando} onChange={(e) => { if (/^\d{0,4}$/.test(e.target.value)) setCreando(e.target.value); }} />
              </div>
              <div className="fila-fin">
                <button type="button" className="boton" onClick={() => { setCreando(null); setErrorAno(null); }}>Cancelar</button>
                <button type="submit" className="boton primario">Crear año</button>
              </div>
            </form>
          )}
          <div className="fila-fin" style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <button className="boton" onClick={() => router.push("/")}>Cancelar</button>
            <button className="boton primario" disabled={pendiente || !anos} onClick={() => aceptarAno()}>
              {pendiente ? "Abriendo…" : "Trabajar en este año"}</button>
          </div>
        </section>
      </div>
    </div>
  );
}
