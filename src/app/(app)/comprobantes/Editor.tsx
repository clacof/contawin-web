"use client";
/**
 * Editor de asiento (GetAsientos / DLG_ASIENTOS), línea de detalle (GetDetalle / DLG_DETALLE)
 * y documento de compra (IngDetCompra / DOCCOMPRA) — ui/asientos.py.
 *
 * UX (docs/ADR-002): la línea se edita en UN panel lateral con dos pasos
 *   1. Cuenta y monto  →  2. Documento de compra (solo si la cuenta «pide documento»)
 * y «Nuevo proveedor» se completa dentro del paso 2. El comprobante, sus líneas y los totales
 * siguen visibles detrás del panel. Validaciones, textos y cálculos son los mismos de antes.
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Combo, FechaInput, MontoInput } from "@/components/Campos";
import { CamposProveedor, enviarProveedor, PROVEEDOR_VACIO } from "@/components/Formularios";
import { Icono } from "@/components/Icono";
import { useMensajes } from "@/components/Mensajes";
import { PaginaCabeza } from "@/components/Pagina";
import { Panel, Stepper } from "@/components/Panel";
import { Tabla } from "@/components/Tabla";
import type { DocumentoCompra, LineaAsiento } from "@/lib/db/tipos";
import * as util from "@/lib/util";
import { type FormProveedor as DatosProveedor, listaProveedores } from "../mantenedores";
import { guardarComprobante } from "./acciones";
import type { DatosEditor } from "./datos";

type Cuenta = DatosEditor["cuentas"][number];

export default function Editor({ d }: { d: DatosEditor }) {
  const m = useMensajes();
  const router = useRouter();
  const [tipo, setTipo] = useState(d.cab.tipo);
  const [fecha, setFecha] = useState(d.cab.fecha);
  const [glosa, setGlosa] = useState(d.cab.glosa);
  const [ccosto, setCcosto] = useState<string>(d.cab.cdcosto);
  const [lineas, setLineas] = useState<LineaAsiento[]>(d.lineas);
  const [sel, setSel] = useState<number | null>(d.lineas.length ? 0 : null);
  const [modificado, setModificado] = useState(false);
  const [panel, setPanel] = useState<{ indice: number | null; sugerencia: [number, number] } | null>(null);
  const [proveedores, setProveedores] = useState(d.proveedores);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const glosaRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const nombres = useMemo(() => Object.fromEntries(d.cuentas.map((c) => [c.codigo, c.nombre])), [d.cuentas]);
  const marcar = <T,>(f: (v: T) => void) => (v: T) => { f(v); setModificado(true); };

  const td = lineas.reduce((s, l) => s + l.debe, 0), th = lineas.reduce((s, l) => s + l.haber, 0);

  useEffect(() => {
    // aviso del navegador si se cierra la pestaña con cambios sin guardar
    const f = (e: BeforeUnloadEvent) => { if (modificado) e.preventDefault(); };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [modificado]);

  const nuevaLinea = useCallback(() => {
    // propone el monto que falta para cuadrar
    setPanel({ indice: null, sugerencia: th > td ? [th - td, 0] : [0, td - th] });
  }, [td, th]);
  const modificarLinea = (i: number | null = sel) => { if (i !== null && lineas[i]) setPanel({ indice: i, sugerencia: [0, 0] }); };
  async function borrarLinea() {
    if (sel === null || !lineas[sel]) return;
    const l = lineas[sel];
    if (await m.confirmar(`¿Borrar la línea ${util.formatoCodigo(l.codigo)} ${nombres[l.codigo] ?? ""}?`, "Pregunta", { accion: "Borrar", peligro: true })) {
      const nuevas = lineas.filter((_, i) => i !== sel);
      setLineas(nuevas);
      setModificado(true);
      setSel(nuevas.length ? Math.min(sel, nuevas.length - 1) : null);
    }
  }

  async function grabar(): Promise<number | null> {
    if (d.ano && fecha && util.anoDe(fecha) !== d.ano) {
      if (!(await m.confirmar(`La fecha ${util.fmtFecha(fecha)} no corresponde al año de trabajo (${d.ano}).\n¿Guardar de todas formas?`)))
        return null;
    }
    const cab = { tipo, fecha, glosa, cdcosto: ccosto || "" };
    const r = await guardarComprobante(d.asientoId, cab, lineas.map((l) => ({
      ...l, documento: l.documento ? { ...l.documento, cdcosto: cab.cdcosto } : null })));
    if (r.error) {
      setErrorGuardar(r.error);
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
      return null;
    }
    setErrorGuardar(null);
    setModificado(false);
    return r.id!;
  }

  function guardar(imprimir = false) {
    // la ventana del PDF se abre antes de esperar al servidor para que el navegador no la bloquee
    const ventana = imprimir ? window.open("about:blank", "_blank") : null;
    iniciar(async () => {
      const id = await grabar();
      if (id === null) { ventana?.close(); return; }
      if (ventana) ventana.location.href = `/api/informe?tipo=comprobante&id=${id}&formato=pdf`;
      router.push(`/comprobantes?sel=${id}`);
      router.refresh();
    });
  }

  async function cerrar() {
    if (modificado && !(await m.confirmar("Hay cambios sin guardar. ¿Cerrar sin guardar?"))) return;
    router.push("/comprobantes");
  }

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        if (!document.querySelector("dialog[open]")) guardar();
      }
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!d.asientoId) glosaRef.current?.focus(); }, [d.asientoId]);

  const cuadrado = td === th;
  return (
    <div className="columna" style={{ gap: 20 }}>
      <PaginaCabeza sobretitulo={`${d.empresa} · Año ${d.ano}`}
        titulo={<span className="fila" style={{ gap: 12 }}>Comprobante N° {util.fmtMonto(d.numero)}<span className={`chip ${d.asientoId ? "neutro" : ""}`}>{d.asientoId ? "Modificando" : "Nuevo"}</span></span>} />

      {errorGuardar && <div ref={errorRef} className="alerta-error" role="alert"><Icono nombre="alerta" /><span>{errorGuardar}</span></div>}

      <section className="tarjeta" aria-labelledby="cab-titulo">
        <h2 id="cab-titulo" className="encabezado" style={{ marginBottom: 16 }}>Cabecera</h2>
        <div className="form-3">
          <div className="campo-grupo">
            <label className="etiqueta" htmlFor="a-tipo">Tipo</label>
            <select id="a-tipo" className="control" value={tipo} onChange={(e) => marcar(setTipo)(e.target.value)}>
              {Object.entries(util.TIPOS_ASIENTO).map(([t, n]) => <option key={t} value={t}>{t} - {n}</option>)}
            </select>
          </div>
          <div className="campo-grupo">
            <label className="etiqueta" htmlFor="a-fecha">Fecha</label>
            <FechaInput id="a-fecha" valor={fecha} onCambio={marcar(setFecha)} />
          </div>
          <div className="campo-grupo">
            <label className="etiqueta" htmlFor="a-cc">Centro de costo</label>
            <Combo id="a-cc" items={d.ccostos} valor={ccosto} onCambio={(c) => marcar(setCcosto)(c ?? "")} permitirVacio textoVacio="(sin centro de costo)" />
          </div>
          <div className="campo-grupo" style={{ gridColumn: "1 / -1" }}>
            <label className="etiqueta" htmlFor="a-glosa">Glosa</label>
            <input id="a-glosa" ref={glosaRef} className="campo" maxLength={60} value={glosa}
              onChange={(e) => marcar(setGlosa)(e.target.value.toUpperCase())} />
          </div>
        </div>
      </section>

      <section className="columna" aria-labelledby="lin-titulo" style={{ gap: 12 }}>
        <div className="fila">
          <h2 id="lin-titulo" className="encabezado">Líneas</h2>
          <span className="chip neutro">{lineas.length}</span>
          <span className="espacio" />
          <button className="boton" title="Enter o doble clic" disabled={sel === null} onClick={() => modificarLinea()}><Icono nombre="editar" />Modificar</button>
          <button className="boton peligro" title="Supr" disabled={sel === null} onClick={borrarLinea}><Icono nombre="borrar" />Borrar</button>
          <button className="boton primario" title="Insert" onClick={nuevaLinea}><Icono nombre="mas" />Nueva línea</button>
        </div>
        <Tabla etiqueta="Líneas del comprobante"
          columnas={[{ titulo: "Código", ancho: 100, mono: true }, { titulo: "Cuenta" }, { titulo: "Debe", ancho: 150, alinear: "R" },
            { titulo: "Haber", ancho: 150, alinear: "R" }, { titulo: "Documento", ancho: 180 }]}
          filas={lineas.map((l, i) => ({ clave: i, valores: [util.formatoCodigo(l.codigo), nombres[l.codigo] ?? "(no existe)",
            util.fmtMonto(l.debe, true), util.fmtMonto(l.haber, true),
            l.documento ? `${util.siglaDocumento(l.documento.tdocum)} N° ${util.fmtMonto(l.documento.numero_doc)}` : ""] }))}
          seleccion={sel} onSeleccion={setSel} onActivar={(i) => modificarLinea(i)} vacio="Sin líneas. Usa «Nueva línea» (Insert)."
          onTecla={(e) => {
            if (e.key === "Insert") { e.preventDefault(); nuevaLinea(); }
            else if (e.key === "Delete") { e.preventDefault(); borrarLinea(); }
          }} />
        <span className="ayuda ocultar-movil"><span className="kbd">Ctrl+S</span> guarda · <span className="kbd">Insert</span> agrega línea · <span className="kbd">Supr</span> borra línea · <span className="kbd">Enter</span> modifica</span>
      </section>

      <div className="barra-pie-fija" role="region" aria-label="Totales y acciones del comprobante">
        <span aria-live="polite">
          {cuadrado ? (td ? <span className="estado ok">✓ Cuadrado</span> : <span className="estado neutro">Sin montos</span>)
            : <span className="estado mal">⚠ Descuadrado · Diferencia {util.fmtPesos(Math.abs(td - th))} en el {td > th ? "Debe" : "Haber"}</span>}
        </span>
        <div className="totales">
          <div className="total-caja"><span className="ayuda">Total debe</span><span className="cifra">{util.fmtPesos(td)}</span></div>
          <div className="total-caja"><span className="ayuda">Total haber</span><span className="cifra">{util.fmtPesos(th)}</span></div>
        </div>
        <span className="espacio" />
        <button className="boton" onClick={cerrar}><Icono nombre="cerrar" />Cerrar</button>
        <button className="boton" disabled={pendiente} onClick={() => guardar(true)}><Icono nombre="imprimir" />Guardar e imprimir</button>
        <button className="boton primario" disabled={pendiente} onClick={() => guardar()}><Icono nombre="guardar" />{pendiente ? "Guardando…" : "Guardar comprobante"}</button>
      </div>

      {panel && (
        <PanelLinea cuentas={d.cuentas} linea={panel.indice !== null ? lineas[panel.indice] : null} sugerencia={panel.sugerencia}
          fechaAsiento={fecha} proveedores={proveedores} numero={d.numero}
          onProveedores={async () => setProveedores(await listaProveedores())}
          onCerrar={(l) => {
            const i = panel.indice;
            setPanel(null);
            if (!l) return;
            if (i === null) { setLineas((x) => [...x, l]); setSel(lineas.length); }
            else { setLineas((x) => x.map((y, j) => (j === i ? l : y))); setSel(i); }
            setModificado(true);
          }} />
      )}
    </div>
  );
}

// ===========================================================================
// Panel de línea: paso 1 (GetDetalle / DLG_DETALLE) y paso 2 (IngDetCompra / DOCCOMPRA)
// ===========================================================================
function PanelLinea({ cuentas, linea, sugerencia, fechaAsiento, proveedores, numero, onProveedores, onCerrar }: {
  cuentas: Cuenta[]; linea: LineaAsiento | null; sugerencia: [number, number]; fechaAsiento: string; numero: number;
  proveedores: [string, string][]; onProveedores: () => Promise<void>; onCerrar: (l?: LineaAsiento) => void;
}) {
  const [codigo, setCodigo] = useState<string | null>(linea?.codigo ?? null);
  const [debe, setDebe] = useState(linea ? linea.debe : sugerencia[0]);
  const [haber, setHaber] = useState(linea ? linea.haber : sugerencia[1]);
  const [paso, setPaso] = useState<0 | 1>(0);
  const [entrada, setEntrada] = useState(0);             // cada vez que se entra al paso 2 se recalcula el documento
  const [error, setError] = useState<string | null>(null);
  const cuenta = cuentas.find((c) => c.codigo === codigo);
  const pide = !!cuenta?.cdocum;
  const items = useMemo(() => cuentas.map((c) => [c.codigo, c.nombre] as const), [cuentas]);
  const titulo = linea ? "Modificar línea" : "Nueva línea";

  function aceptarPaso1(e?: React.FormEvent) {
    e?.preventDefault();
    // mismas validaciones y en el mismo orden que LineaDialog._aceptar
    if (!cuenta) return setError("Selecciona una cuenta del plan de cuentas.");
    if (debe < 0 || haber < 0) return setError("Los montos no pueden ser negativos.");
    if (debe === 0 && haber === 0) return setError("Ingresa un monto en el Debe o en el Haber.");
    if (debe && haber) return setError("Ingresa el monto en el Debe o en el Haber, no en ambos.");
    setError(null);
    if (cuenta.cdocum) { setEntrada((n) => n + 1); setPaso(1); return; }   // pide documento de compra al aceptar
    onCerrar({ codigo: cuenta.codigo, debe, haber, documento: null });
  }

  return (
    <Panel titulo={titulo} subtitulo={`Comprobante N° ${util.fmtMonto(numero)}`} onCerrar={() => onCerrar()} ancho={paso === 1}
      onEsc={paso === 1 ? () => { setError(null); setPaso(0); } : undefined} error={error}
      cabezaExtra={pide && <div style={{ marginTop: 10 }}><Stepper pasos={["Cuenta y monto", "Documento de compra"]} actual={paso} /></div>}
      pie={paso === 0 ? (<>
        <span className="espacio" />
        <button type="button" className="boton" onClick={() => onCerrar()}>Cancelar</button>
        <button type="submit" form="form-linea" className="boton primario">{pide ? <>Siguiente: documento <span aria-hidden="true">→</span></> : "Aceptar"}</button>
      </>) : (<>
        <button type="button" className="boton fantasma" onClick={() => { setError(null); setPaso(0); }}><span aria-hidden="true">←</span> Atrás</button>
        <span className="espacio" />
        <button type="button" className="boton" onClick={() => onCerrar()}>Cancelar</button>
        <button type="submit" form="form-documento" className="boton primario">Aceptar</button>
      </>)}>
      {paso === 0 ? (
        <form id="form-linea" className="form-apilado" onSubmit={aceptarPaso1}>
          <div className="campo-grupo">
            <label className="etiqueta" htmlFor="l-cuenta">Cuenta</label>
            <Combo id="l-cuenta" autoFocus items={items} valor={codigo} onCambio={setCodigo}
              formato={util.formatoCodigo} placeholder="Escribe el código o parte del nombre" />
          </div>
          {pide && <div className="aviso" role="note"><Icono nombre="alerta" />⚠ Esta cuenta pide documento de compra al aceptar.</div>}
          <div className="form-2">
            <div className="campo-grupo"><label className="etiqueta" htmlFor="l-debe">Debe</label><MontoInput id="l-debe" valor={debe} onCambio={setDebe} /></div>
            <div className="campo-grupo"><label className="etiqueta" htmlFor="l-haber">Haber</label><MontoInput id="l-haber" valor={haber} onCambio={setHaber} /></div>
          </div>
          <span className="ayuda">Una línea lleva monto en el Debe o en el Haber, no en ambos.</span>
        </form>
      ) : (
        <PasoDocumento key={entrada} cuenta={cuenta!} debe={debe} haber={haber} doc={linea?.documento ?? null}
          fechaAsiento={fechaAsiento} proveedores={proveedores} onProveedores={onProveedores} setError={setError}
          onListo={(documento) => onCerrar({ codigo: cuenta!.codigo, debe, haber, documento })} />
      )}
    </Panel>
  );
}

function calcularIva(tdocum: number, total: number): [number, number] {
  if (util.DOCS_AFECTOS.has(tdocum)) {
    const neto = util.pyRound(total / (1 + util.TASA_IVA));
    return [neto, total - neto];
  }
  return [total, 0];
}

function PasoDocumento({ cuenta, debe, haber, doc, fechaAsiento, proveedores, onProveedores, setError, onListo }: {
  cuenta: Cuenta; debe: number; haber: number; doc: DocumentoCompra | null; fechaAsiento: string;
  proveedores: [string, string][]; onProveedores: () => Promise<void>; setError: (e: string | null) => void;
  onListo: (d: DocumentoCompra) => void;
}) {
  const total = debe ? debe : haber;
  const [tdocum, setTdocum] = useState(Math.max(1, doc?.tdocum || 1));
  const [numero, setNumero] = useState(doc?.numero_doc ? String(doc.numero_doc) : "");
  const [fechaDoc, setFechaDoc] = useState(util.fromIso(doc?.fecha_doc) || fechaAsiento);
  const [rut, setRut] = useState<string | null>(doc?.rut_prov ?? null);
  const [[neto, iva], setNetoIva] = useState<[number, number]>(() =>
    !doc?.neto && !doc?.iva ? calcularIva(Math.max(1, doc?.tdocum || 1), total) : [doc.neto, doc.iva]);
  const [detalle, setDetalle] = useState(doc?.detalle ?? "");
  const [pagado, setPagado] = useState(!!doc?.fecha_pago);
  const [fechaPago, setFechaPago] = useState(util.fromIso(doc?.fecha_pago) || fechaAsiento);
  const [nuevoProv, setNuevoProv] = useState<DatosProveedor | null>(null);
  const [errorProv, setErrorProv] = useState<string | null>(null);
  const [guardandoProv, iniciarProv] = useTransition();

  function aceptar(e: React.FormEvent) {
    e.preventDefault();
    // mismas validaciones y en el mismo orden que DocumentoCompraDialog._aceptar
    const num = parseInt(numero || "0", 10);
    if (num === 0) return setError("Ingresa el número de documento.");
    if (!rut) return setError("Selecciona un proveedor existente o créalo con «Nuevo proveedor…».");
    if (!detalle.trim()) return setError("Ingresa el detalle del documento.");
    setError(null);
    onListo({ tdocum, numero_doc: num, fecha_doc: fechaDoc, rut_prov: rut, neto, iva, adicional: 0, total,
      cdcosto: "", detalle: detalle.trim().toUpperCase(), fecha_pago: pagado ? fechaPago : null });
  }

  function guardarProveedor() {
    if (!nuevoProv) return;
    iniciarProv(async () => {
      const r = await enviarProveedor(nuevoProv, true);
      if (r.error) return setErrorProv(r.error);
      setErrorProv(null);
      setNuevoProv(null);
      await onProveedores();
      setRut(r.valor!);
    });
  }

  return (
    <form id="form-documento" className="form-apilado" onSubmit={aceptar}>
      <div className="seccion-panel" style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr) minmax(0,1fr)", gap: 10 }}>
        <div className="campo-grupo"><span className="etiqueta">Cuenta</span><input className="campo" readOnly aria-label="Cuenta" value={`${util.formatoCodigo(cuenta.codigo)}  ${cuenta.nombre}`} /></div>
        <div className="campo-grupo"><span className="etiqueta">Debe</span><input className="campo cifra" readOnly aria-label="Debe" value={util.fmtMonto(debe)} /></div>
        <div className="campo-grupo"><span className="etiqueta">Haber</span><input className="campo cifra" readOnly aria-label="Haber" value={util.fmtMonto(haber)} /></div>
      </div>

      <div className="form-2">
        <div className="campo-grupo">
          <label className="etiqueta" htmlFor="d-tipo">Tipo de documento</label>
          <select id="d-tipo" className="control" autoFocus value={tdocum} onChange={(e) => {
            const t = Number(e.target.value);
            setTdocum(t);
            setNetoIva(calcularIva(t, total));
          }}>
            {util.TIPOS_DOCUMENTO.map(([, n], i) => <option key={i} value={i + 1}>{String(i + 1).padStart(2, " ")}.- {n}</option>)}
          </select>
        </div>
        <div className="campo-grupo">
          <label className="etiqueta" htmlFor="d-num">N° de documento</label>
          <input id="d-num" className="campo cifra" style={{ textAlign: "left" }} inputMode="numeric" value={numero}
            onChange={(e) => { if (/^[0-9]{0,12}$/.test(e.target.value)) setNumero(e.target.value); }} />
        </div>
        <div className="campo-grupo">
          <label className="etiqueta" htmlFor="d-fecha">Fecha del documento</label>
          <FechaInput id="d-fecha" valor={fechaDoc} onCambio={setFechaDoc} />
        </div>
      </div>

      <div className="campo-grupo">
        <label className="etiqueta" htmlFor="d-prov">Proveedor</label>
        <div className="fila" style={{ flexWrap: "nowrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}><Combo id="d-prov" items={proveedores} valor={rut} onCambio={setRut} formato={util.formatoRut} /></div>
          {!nuevoProv && <button type="button" className="boton" title="Crear un proveedor nuevo" onClick={() => setNuevoProv(PROVEEDOR_VACIO)}>
            <Icono nombre="mas" />Nuevo proveedor…</button>}
        </div>
      </div>

      {nuevoProv && (
        <fieldset className="seccion-panel" style={{ margin: 0 }} aria-labelledby="np-titulo"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") { e.preventDefault(); guardarProveedor(); } }}>
          <div className="fila"><strong id="np-titulo">Proveedor nuevo</strong><span className="espacio" />
            <button type="button" className="boton fantasma icono-solo" aria-label="Cancelar proveedor nuevo" onClick={() => { setNuevoProv(null); setErrorProv(null); }}><Icono nombre="cerrar" tam={16} /></button></div>
          {errorProv && <div className="alerta-error" role="alert"><Icono nombre="alerta" /><span>{errorProv}</span></div>}
          <div className="form"><CamposProveedor d={nuevoProv} setD={(f) => setNuevoProv((x) => f(x ?? PROVEEDOR_VACIO))} nuevo prefijo="np" /></div>
          <div className="fila-fin">
            <button type="button" className="boton" onClick={() => { setNuevoProv(null); setErrorProv(null); }}>Cancelar</button>
            <button type="button" className="boton primario" disabled={guardandoProv} onClick={guardarProveedor}>{guardandoProv ? "Guardando…" : "Guardar proveedor"}</button>
          </div>
        </fieldset>
      )}

      <div className="campo-grupo">
        <span className="etiqueta" id="montos">Montos</span>
        <div className="form-3" role="group" aria-labelledby="montos">
          <div className="campo-grupo"><label className="ayuda" htmlFor="d-neto">Neto</label><MontoInput id="d-neto" valor={neto} onCambio={(v) => setNetoIva([v, iva])} /></div>
          <div className="campo-grupo"><label className="ayuda" htmlFor="d-iva">IVA</label><MontoInput id="d-iva" valor={iva} onCambio={(v) => setNetoIva([neto, v])} /></div>
          <div className="campo-grupo"><label className="ayuda" htmlFor="d-total">Total</label><MontoInput id="d-total" valor={total} soloLectura /></div>
        </div>
        <div><button type="button" className="boton fantasma" onClick={() => setNetoIva(calcularIva(tdocum, total))}><Icono nombre="balance" />Calcular IVA</button></div>
      </div>

      <div className="campo-grupo">
        <label className="etiqueta" htmlFor="d-det">Detalle</label>
        <input id="d-det" className="campo" maxLength={40} value={detalle} onChange={(e) => setDetalle(e.target.value.toUpperCase())} />
      </div>

      <div className="campo-grupo">
        <span className="etiqueta">Fecha de pago</span>
        <div className="fila">
          <label className="check"><input type="checkbox" checked={pagado} onChange={(e) => setPagado(e.target.checked)} />Pagado el</label>
          <FechaInput valor={fechaPago} onCambio={setFechaPago} deshabilitado={!pagado} />
        </div>
      </div>
    </form>
  );
}
