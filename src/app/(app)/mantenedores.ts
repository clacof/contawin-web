"use server";
/**
 * Acciones de los mantenedores (ui/mantenedores.py): Empresas, Plan de cuentas, Centros de costo,
 * Proveedores y Usuarios. Todas verifican la sesión y devuelven { error } con el mensaje de ErrorDatos.
 */
import { esErrorDatos } from "@/lib/db";
import { getDb } from "@/lib/servidor";
import { guardarSesion, requiereEmpresa, requiereUsuario } from "@/lib/sesion";
import * as util from "@/lib/util";

type R<T = void> = { error?: string; valor?: T };

function capturar<T>(fn: () => T): R<T> {
  try {
    return { valor: fn() };
  } catch (e) {
    if (esErrorDatos(e)) return { error: e.message };
    throw e;
  }
}

// ------------------------------------------------------------------ empresas
export interface FormEmpresa {
  rut: string; razon_social: string; giro: string; direccion: string; ciudad: string; rep_legal: string; sucursal: string;
  honorarios: number; directorio: string; ano?: number | null;
}

export async function guardarEmpresa(datos: FormEmpresa, empresaId: number | null): Promise<R<number>> {
  await requiereUsuario();
  if (!datos.razon_social.trim()) return { error: "Debe ingresar la razón social." };
  return capturar(() => getDb().guardarEmpresa({ ...datos, rut: util.limpiarRut(datos.rut) }, empresaId,
    empresaId === null ? datos.ano ?? null : null));
}

/** Borrar empresa: el usuario debe escribir el RUT para confirmar. */
export async function borrarEmpresa(empresaId: number, rutConfirmado: string): Promise<R> {
  const s = await requiereUsuario();
  const db = getDb();
  const e = db.empresa(empresaId);
  if (!e) return {};
  if (util.limpiarRut(rutConfirmado) !== e.rut) return { error: "Eliminación cancelada." };
  db.borrarEmpresa(empresaId);
  if (s.empresaId === empresaId) await guardarSesion({ u: s.usuario.usuario });
  return {};
}

// ------------------------------------------------------------------ plan de cuentas
export async function guardarCuenta(codigo: string, nombre: string, cdocum: boolean, nuevo: boolean): Promise<R<string>> {
  const s = await requiereEmpresa();
  if (!nombre.trim()) return { error: "Debe ingresar el nombre de la cuenta." };
  return capturar(() => {
    getDb().guardarCuenta(s.empresaId, codigo, nombre, cdocum, nuevo);
    return util.limpiarCodigo(codigo);
  });
}

export async function borrarCuenta(codigo: string): Promise<R> {
  const s = await requiereEmpresa();
  return capturar(() => getDb().borrarCuenta(s.empresaId, codigo));
}

// ------------------------------------------------------------------ centros de costo
export async function guardarCcosto(codigo: string, nombre: string, nuevo: boolean): Promise<R<string>> {
  const s = await requiereEmpresa();
  return capturar(() => {
    getDb().guardarCcosto(s.empresaId, codigo, nombre, nuevo);
    return codigo.trim().toUpperCase();
  });
}

export async function borrarCcosto(codigo: string): Promise<R> {
  const s = await requiereEmpresa();
  return capturar(() => getDb().borrarCcosto(s.empresaId, codigo));
}

// ------------------------------------------------------------------ proveedores
export interface FormProveedor { rut: string; nombre: string; direccion: string; ciudad: string; giro: string; email: string; telefono: string }

export async function guardarProveedor(datos: FormProveedor, nuevo: boolean): Promise<R<string>> {
  const s = await requiereEmpresa();
  if (!datos.nombre.trim()) return { error: "Debe ingresar el nombre del proveedor." };
  return capturar(() => {
    getDb().guardarProveedor(s.empresaId, datos, nuevo);
    return util.limpiarRut(datos.rut);
  });
}

export async function borrarProveedor(rut: string): Promise<R> {
  const s = await requiereEmpresa();
  return capturar(() => getDb().borrarProveedor(s.empresaId, rut));
}

export async function listaProveedores(): Promise<[string, string][]> {
  const s = await requiereEmpresa();
  return getDb().proveedores(s.empresaId, "nombre").map((p) => [p.rut, p.nombre]);
}

// ------------------------------------------------------------------ usuarios (solo administradores)
export async function guardarUsuario(usuario: string, nombre: string, clave: string, confirma: string, esAdmin: boolean,
  nuevo: boolean): Promise<R<string>> {
  const s = await requiereUsuario();
  if (!s.esAdmin) return { error: "Usuario no autorizado." };
  if (clave !== confirma) return { error: "Debe ingresar la misma clave en ambos campos." };
  return capturar(() => {
    getDb().guardarUsuario(usuario, nombre, clave || null, esAdmin, nuevo);
    return usuario.trim().toUpperCase();
  });
}

export async function borrarUsuario(usuario: string): Promise<R> {
  const s = await requiereUsuario();
  if (!s.esAdmin) return { error: "Usuario no autorizado." };
  if (usuario === s.usuario.usuario) return { error: "No puede eliminar el usuario con el que está trabajando." };
  return capturar(() => getDb().borrarUsuario(usuario));
}
