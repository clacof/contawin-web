"use client";
/** Parámetros del informe como barra de filtros; los mensajes se muestran en línea (docs/ADR-002). */
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Combo, FechaInput } from "@/components/Campos";
import { Icono } from "@/components/Icono";
import { PaginaCabeza } from "@/components/Pagina";
import { MODOS_BALANCE } from "@/lib/reports/balances";
import * as util from "@/lib/util";

const TODOS = "__todos";

export default function Parametros({ titulo, subtitulo, cfg, valores, cuentas, ccostos, error, sinDatos }: {
  titulo: string; subtitulo: string; cfg: { sinDesde?: boolean; tipo?: boolean; cuentas?: boolean; ccosto?: boolean; modo?: boolean };
  valores: Record<string, string>; cuentas: [string, string][]; ccostos: [string, string][]; error?: string; sinDatos: boolean;
}) {
  const router = useRouter();
  const ruta = usePathname();
  const [v, setV] = useState(valores);
  const [aviso, setAviso] = useState<string | null>(error ?? null);
  const c = (k: string) => (x: string | null) => setV((o) => ({ ...o, [k]: x ?? "" }));
  const todos = v.cc === TODOS;
  useEffect(() => { setAviso(error ?? null); }, [error, sinDatos]);

  function generar(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg.sinDesde && v.hasta < v.desde) return setAviso("La fecha Hasta debe ser mayor o igual a Desde.");
    if (cfg.cuentas && (!v.cdesde || !v.chasta)) return setAviso("Selecciona las cuentas desde y hasta.");
    setAviso(null);
    const q = new URLSearchParams({ ver: "1", hasta: v.hasta, emision: v.emision });
    if (!cfg.sinDesde) q.set("desde", v.desde);
    if (cfg.tipo) q.set("tipo", v.tipo);
    if (cfg.cuentas) { q.set("cdesde", v.cdesde); q.set("chasta", v.chasta); }
    if (cfg.ccosto) q.set("cc", v.cc);
    if (cfg.modo) q.set("modo", v.modo);
    router.push(`${ruta}?${q}`);
  }

  return (
    <div className="columna no-imprimir" style={{ gap: 16 }}>
      <PaginaCabeza sobretitulo={subtitulo} titulo={titulo} />
      <form className="tarjeta columna" style={{ gap: 16 }} onSubmit={generar} aria-label="Parámetros del informe">
        <div className="filtros">
          {cfg.tipo && (
            <div className="campo-grupo">
              <label className="etiqueta" htmlFor="i-tipo">Tipo de asiento</label>
              <select id="i-tipo" className="control" value={v.tipo} onChange={(e) => c("tipo")(e.target.value)}>
                {Object.entries(util.TIPOS_ASIENTO).map(([t, n]) => <option key={t} value={t}>{t} - {n}</option>)}
              </select>
            </div>
          )}
          {cfg.modo && (
            <div className="campo-grupo">
              <label className="etiqueta" htmlFor="i-modo">Tipo de balance</label>
              <select id="i-modo" className="control" value={v.modo} onChange={(e) => c("modo")(e.target.value)}>
                {Object.entries(MODOS_BALANCE).map(([m, n]) => <option key={m} value={m}>{n}</option>)}
              </select>
            </div>
          )}
          {!cfg.sinDesde && <div className="campo-grupo"><label className="etiqueta" htmlFor="i-desde">Desde</label><FechaInput id="i-desde" valor={v.desde} onCambio={c("desde")} /></div>}
          <div className="campo-grupo"><label className="etiqueta" htmlFor="i-hasta">Hasta</label><FechaInput id="i-hasta" valor={v.hasta} onCambio={c("hasta")} /></div>
          {cfg.cuentas && <>
            <div className="campo-grupo"><label className="etiqueta" htmlFor="i-cd">Cuenta desde</label><Combo id="i-cd" items={cuentas} valor={v.cdesde || null} onCambio={c("cdesde")} formato={util.formatoCodigo} /></div>
            <div className="campo-grupo"><label className="etiqueta" htmlFor="i-ch">Cuenta hasta</label><Combo id="i-ch" items={cuentas} valor={v.chasta || null} onCambio={c("chasta")} formato={util.formatoCodigo} /></div>
          </>}
          {cfg.ccosto && (
            <div className="campo-grupo" style={{ gridColumn: "span 2" }}>
              <label className="etiqueta" htmlFor="i-cc">Centro de costo</label>
              <div className="fila" style={{ flexWrap: "nowrap" }}>
                <label className="check" style={{ whiteSpace: "nowrap" }}><input type="checkbox" checked={todos} onChange={(e) => c("cc")(e.target.checked ? TODOS : "")} />Todos los centros de costo</label>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Combo id="i-cc" items={ccostos} valor={todos ? "" : v.cc} onCambio={(x) => c("cc")(x ?? "")} permitirVacio textoVacio="(sin centro de costo)" deshabilitado={todos} />
                </div>
              </div>
            </div>
          )}
          <div className="campo-grupo"><label className="etiqueta" htmlFor="i-emi">Fecha de emisión</label><FechaInput id="i-emi" valor={v.emision} onCambio={c("emision")} /></div>
        </div>
        {aviso && <div className="alerta-error" role="alert"><Icono nombre="alerta" /><span>{aviso}</span></div>}
        {!aviso && sinDatos && <div className="alerta-info" role="status"><Icono nombre="info" /><span>No existen datos en este período.</span></div>}
        <div className="fila-fin">
          <button type="button" className="boton" onClick={() => router.push("/")}>Cancelar</button>
          <button type="submit" className="boton primario"><Icono nombre="informe" />Generar informe</button>
        </div>
      </form>
    </div>
  );
}
