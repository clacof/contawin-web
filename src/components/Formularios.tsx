"use client";
/** Formularios de los mantenedores (FormEmpresa, FormCuenta, FormCCosto, FormProveedor, FormUsuario de ui/mantenedores.py). */
import { useState, useTransition } from "react";
import {
  guardarCcosto, guardarCuenta, guardarEmpresa, guardarProveedor, guardarUsuario,
  type FormEmpresa as DatosEmpresa, type FormProveedor as DatosProveedor,
} from "@/app/(app)/mantenedores";
import * as util from "@/lib/util";
import { CodigoCuentaInput, MontoInput, RutInput } from "./Campos";
import { Panel } from "./Panel";

/** Campo de texto; con mayus=true convierte a mayúsculas al escribir (PICTURE "@K!"). */
export function Texto({ valor, onCambio, largo, mayus = true, soloLectura, id, autoFocus, tipo = "text", placeholder, title }: {
  valor: string; onCambio: (v: string) => void; largo: number; mayus?: boolean; soloLectura?: boolean; id?: string;
  autoFocus?: boolean; tipo?: string; placeholder?: string; title?: string;
}) {
  return (
    <input id={id} type={tipo} className="campo" maxLength={largo} readOnly={soloLectura} autoFocus={autoFocus}
      placeholder={placeholder} title={title} value={valor}
      onChange={(e) => onCambio(mayus ? e.target.value.toUpperCase() : e.target.value)} />
  );
}

/**
 * Formulario base en el panel lateral: campos, error en línea (mismo texto de validación) y
 * botones Guardar (primario) / Cancelar fijos al pie.
 */
function Formulario({ titulo, subtitulo, children, onGuardar, onCerrar }: {
  titulo: string; subtitulo?: string; children: React.ReactNode; onGuardar: () => Promise<{ error?: string } | void>; onCerrar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const id = titulo.replace(/\s+/g, "-").toLowerCase();
  return (
    <Panel titulo={titulo} subtitulo={subtitulo} onCerrar={onCerrar} error={error}
      pie={<>
        <span className="espacio" />
        <button type="button" className="boton" onClick={onCerrar}>Cancelar</button>
        <button type="submit" form={id} className="boton primario" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar"}</button>
      </>}>
      <form id={id} className="form" onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await onGuardar();
          setError(r && r.error ? r.error : null);
        });
      }}>{children}</form>
    </Panel>
  );
}

// ===========================================================================
// EMPRESAS
// ===========================================================================
export function FormEmpresa({ empresa, onCerrar }: {
  empresa: (Omit<DatosEmpresa, "ano"> & { id: number }) | null; onCerrar: (guardado?: { id: number; ano?: number | null }) => void;
}) {
  const nueva = !empresa;
  const [d, setD] = useState<DatosEmpresa>(() => empresa
    ? { ...empresa, rut: util.formatoRut(empresa.rut) }
    : { rut: "", razon_social: "", giro: "", direccion: "", ciudad: "", rep_legal: "", sucursal: "", honorarios: 0, directorio: "", ano: new Date().getFullYear() });
  const c = <K extends keyof DatosEmpresa>(k: K) => (v: DatosEmpresa[K]) => setD((x) => ({ ...x, [k]: v }));
  return (
    <Formulario titulo={nueva ? "Empresa nueva" : "Datos de la empresa"} onCerrar={() => onCerrar()} onGuardar={async () => {
      const r = await guardarEmpresa(d, empresa?.id ?? null);
      if (r.error) return r;
      onCerrar({ id: r.valor!, ano: nueva ? d.ano : null });
    }}>
      <label htmlFor="e-rut">RUT</label><RutInput id="e-rut" valor={d.rut} onCambio={c("rut")} soloLectura={!nueva} autoFocus={nueva} />
      <label htmlFor="e-razon">Razón social</label><Texto id="e-razon" largo={40} valor={d.razon_social} onCambio={c("razon_social")} autoFocus={!nueva} />
      <label htmlFor="e-giro">Giro</label><Texto id="e-giro" largo={30} valor={d.giro} onCambio={c("giro")} />
      <label htmlFor="e-dir">Dirección</label><Texto id="e-dir" largo={40} valor={d.direccion} onCambio={c("direccion")} />
      <label htmlFor="e-ciudad">Ciudad</label><Texto id="e-ciudad" largo={20} valor={d.ciudad} onCambio={c("ciudad")} />
      <label htmlFor="e-rep">Representante legal</label><Texto id="e-rep" largo={40} valor={d.rep_legal} onCambio={c("rep_legal")} />
      <label htmlFor="e-suc">Sucursal</label><Texto id="e-suc" largo={40} valor={d.sucursal} onCambio={c("sucursal")} />
      <label htmlFor="e-hon">Honorarios</label><MontoInput id="e-hon" valor={d.honorarios} onCambio={c("honorarios")} />
      <label htmlFor="e-dir2">Directorio</label>
      <Texto id="e-dir2" largo={8} valor={d.directorio} onCambio={c("directorio")} soloLectura={!nueva}
        title="Código corto de la empresa (en el sistema antiguo era su carpeta)." />
      {nueva && <>
        <label htmlFor="e-ano">Año de trabajo inicial</label>
        <input id="e-ano" type="number" className="campo" min={1981} max={2200} style={{ maxWidth: 120 }} value={d.ano ?? ""}
          onChange={(e) => c("ano")(Math.min(2200, Math.max(1981, Number(e.target.value) || 1981)))} />
      </>}
    </Formulario>
  );
}

// ===========================================================================
// PLAN DE CUENTAS
// ===========================================================================
export function FormCuenta({ cuenta, onCerrar }: {
  cuenta: { codigo: string; nombre: string; cdocum: number } | null; onCerrar: (codigo?: string) => void;
}) {
  const nueva = !cuenta;
  const [codigo, setCodigo] = useState(cuenta?.codigo ?? "");
  const [nombre, setNombre] = useState(cuenta?.nombre ?? "");
  const [cdocum, setCdocum] = useState(!!cuenta?.cdocum);
  return (
    <Formulario titulo={nueva ? "Cuenta nueva" : "Modificar cuenta"} onCerrar={() => onCerrar()} onGuardar={async () => {
      const r = await guardarCuenta(codigo, nombre, cdocum, nueva);
      if (r.error) return r;
      onCerrar(r.valor);
    }}>
      <label htmlFor="c-cod">Código</label><CodigoCuentaInput id="c-cod" valor={codigo} onCambio={setCodigo} soloLectura={!nueva} autoFocus={nueva} />
      <label htmlFor="c-nom">Nombre</label><Texto id="c-nom" largo={30} valor={nombre} onCambio={setNombre} autoFocus={!nueva} />
      <span />
      <label className="check"><input type="checkbox" checked={cdocum} onChange={(e) => setCdocum(e.target.checked)} />
        Pide documento de compra al usarla en un asiento</label>
    </Formulario>
  );
}

// ===========================================================================
// CENTROS DE COSTO
// ===========================================================================
export function FormCCosto({ ccosto, onCerrar }: {
  ccosto: { codigo: string; nombre: string } | null; onCerrar: (codigo?: string) => void;
}) {
  const nuevo = !ccosto;
  const [codigo, setCodigo] = useState(ccosto?.codigo ?? "");
  const [nombre, setNombre] = useState(ccosto?.nombre ?? "");
  return (
    <Formulario titulo={nuevo ? "Centro de costo nuevo" : "Modificar centro de costo"} onCerrar={() => onCerrar()} onGuardar={async () => {
      const r = await guardarCcosto(codigo, nombre, nuevo);
      if (r.error) return r;
      onCerrar(r.valor);
    }}>
      <label htmlFor="cc-cod">Código</label><Texto id="cc-cod" largo={6} valor={codigo} onCambio={setCodigo} soloLectura={!nuevo} autoFocus={nuevo} />
      <label htmlFor="cc-nom">Nombre</label><Texto id="cc-nom" largo={30} valor={nombre} onCambio={setNombre} autoFocus={!nuevo} />
    </Formulario>
  );
}

// ===========================================================================
// PROVEEDORES
// ===========================================================================
export const PROVEEDOR_VACIO: DatosProveedor = { rut: "", nombre: "", direccion: "", ciudad: "", giro: "", email: "", telefono: "" };

/** Campos del proveedor (se usan en el mantenedor y, en línea, dentro del documento de compra). */
export function CamposProveedor({ d, setD, nuevo, prefijo = "p" }: {
  d: DatosProveedor; setD: (f: (x: DatosProveedor) => DatosProveedor) => void; nuevo: boolean; prefijo?: string;
}) {
  const c = (k: keyof DatosProveedor) => (v: string) => setD((x) => ({ ...x, [k]: v }));
  return (<>
    <label htmlFor={`${prefijo}-rut`}>RUT</label><RutInput id={`${prefijo}-rut`} valor={d.rut} onCambio={c("rut")} soloLectura={!nuevo} autoFocus={nuevo} />
    <label htmlFor={`${prefijo}-nom`}>Nombre o razón social</label><Texto id={`${prefijo}-nom`} largo={50} valor={d.nombre} onCambio={c("nombre")} autoFocus={!nuevo} />
    <label htmlFor={`${prefijo}-dir`}>Dirección</label><Texto id={`${prefijo}-dir`} largo={40} mayus={false} valor={d.direccion} onCambio={c("direccion")} />
    <label htmlFor={`${prefijo}-ciu`}>Ciudad</label><Texto id={`${prefijo}-ciu`} largo={30} mayus={false} valor={d.ciudad} onCambio={c("ciudad")} />
    <label htmlFor={`${prefijo}-giro`}>Giro</label><Texto id={`${prefijo}-giro`} largo={45} mayus={false} valor={d.giro} onCambio={c("giro")} />
    <label htmlFor={`${prefijo}-mail`}>E-mail</label><Texto id={`${prefijo}-mail`} largo={30} mayus={false} valor={d.email} onCambio={c("email")} />
    <label htmlFor={`${prefijo}-tel`}>Teléfono</label><Texto id={`${prefijo}-tel`} largo={20} mayus={false} valor={d.telefono} onCambio={c("telefono")} tipo="tel" />
  </>);
}

/** Guarda un proveedor nuevo o modificado (misma acción y validaciones que el mantenedor). */
export async function enviarProveedor(d: DatosProveedor, nuevo: boolean) {
  return guardarProveedor({ ...d, rut: util.limpiarRut(d.rut) }, nuevo);
}

export function FormProveedor({ proveedor, onCerrar }: {
  proveedor: DatosProveedor | null; onCerrar: (rut?: string) => void;
}) {
  const nuevo = !proveedor;
  const [d, setD] = useState<DatosProveedor>(() => proveedor ? { ...proveedor, rut: util.formatoRut(proveedor.rut) } : PROVEEDOR_VACIO);
  return (
    <Formulario titulo={nuevo ? "Proveedor nuevo" : "Datos del proveedor"} onCerrar={() => onCerrar()} onGuardar={async () => {
      const r = await enviarProveedor(d, nuevo);
      if (r.error) return r;
      onCerrar(r.valor);
    }}>
      <CamposProveedor d={d} setD={setD} nuevo={nuevo} />
    </Formulario>
  );
}

// ===========================================================================
// USUARIOS
// ===========================================================================
export function FormUsuario({ usuario, onCerrar }: {
  usuario: { usuario: string; nombre: string; es_admin: number } | null; onCerrar: (usuario?: string) => void;
}) {
  const nuevo = !usuario;
  const [u, setU] = useState(usuario?.usuario ?? "");
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [clave, setClave] = useState("");
  const [confirma, setConfirma] = useState("");
  const [admin, setAdmin] = useState(!!usuario?.es_admin);
  return (
    <Formulario titulo={nuevo ? "Usuario nuevo" : "Modificar usuario"} onCerrar={() => onCerrar()} onGuardar={async () => {
      const r = await guardarUsuario(u, nombre, clave, confirma, admin, nuevo);
      if (r.error) return r;
      onCerrar(r.valor);
    }}>
      <label htmlFor="u-u">Usuario</label><Texto id="u-u" largo={10} valor={u} onCambio={setU} soloLectura={!nuevo} autoFocus={nuevo} />
      <label htmlFor="u-n">Nombre</label><Texto id="u-n" largo={35} valor={nombre} onCambio={setNombre} autoFocus={!nuevo} />
      <label htmlFor="u-c">Clave</label>
      <input id="u-c" type="password" className="campo" autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)}
        placeholder={nuevo ? "" : "Déjala en blanco para no cambiarla"} />
      <label htmlFor="u-c2">Confirmar clave</label>
      <input id="u-c2" type="password" className="campo" autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} />
      <span />
      <label className="check"><input type="checkbox" checked={admin} onChange={(e) => setAdmin(e.target.checked)} />
        Administrador (puede mantener usuarios)</label>
    </Formulario>
  );
}
