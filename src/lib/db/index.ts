/**
 * Capa de datos SQLite (mismo archivo y esquema que ContaWinPy).
 *
 *   EMPRESA.DBF -> empresa · RESPAL.DBF -> periodo · CUENTAS.DBF -> cuenta · CCOSTO.DBF -> ccosto
 *   PROVEE -> proveedor · ASIENTOS/DETASIEN/COMPRAS -> asiento/detalle/compra · USUARIO.DBF -> usuario
 *
 * `Database` es la fachada única; se compone por herencia, un repositorio por agregado
 * (equivalente a los mixins de Python):
 *   BaseDatos → UsuariosRepo → EmpresasRepo (+periodos) → CatalogosRepo → AsientosRepo → AperturaRepo → ConsultasRepo
 */
import { ConsultasRepo } from "./consultas";

export class Database extends ConsultasRepo {}

export { ErrorDatos, esErrorDatos } from "./errores";
export { hashClave, verificarClave } from "./seguridad";
export { SCHEMA, USUARIOS_INICIALES } from "./esquema";
export type * from "./tipos";

/** nombre_respaldo: contawin_respaldo_20261005_101500.db */
export function nombreRespaldo(rutaDb: string): string {
  const base = rutaDb.split(/[\\/]/).pop() || "contawin.db";
  const punto = base.lastIndexOf(".");
  const nombre = punto > 0 ? base.slice(0, punto) : base;
  const ext = punto > 0 ? base.slice(punto) : ".db";
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const sello = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `${nombre}_respaldo_${sello}${ext || ".db"}`;
}
