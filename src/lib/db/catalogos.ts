/** Tablas maestras por empresa: plan de cuentas, centros de costo y proveedores — db/catalogos.py. */
import * as util from "../util";
import { EmpresasRepo } from "./empresas";
import { ErrorDatos } from "./errores";
import type { CCosto, Cuenta, Proveedor } from "./tipos";

export interface DatosProveedor {
  rut?: string; nombre?: string; direccion?: string; ciudad?: string; giro?: string; telefono?: string; email?: string;
}

export class CatalogosRepo extends EmpresasRepo {
  // ------------------------------------------------------------------ cuentas (CUENTAS.DBF)
  cuentas(empresaId: number, orden = "codigo"): Promise<Cuenta[]> {
    orden = orden === "nombre" ? "nombre" : "codigo";
    return this.q(`SELECT * FROM cuenta WHERE empresa_id=? ORDER BY ${orden}`, [empresaId]);
  }

  cuenta(empresaId: number, codigo: string): Promise<Cuenta | undefined> {
    return this.q1("SELECT * FROM cuenta WHERE empresa_id=? AND codigo=?", [empresaId, codigo]);
  }

  async nombreCuenta(empresaId: number, codigo: string): Promise<string> {
    return (await this.cuenta(empresaId, codigo))?.nombre ?? "";
  }

  async guardarCuenta(empresaId: number, codigo: string, nombre: string, cdocum: boolean, nuevo: boolean) {
    codigo = util.limpiarCodigo(codigo);
    if (codigo.length !== 6 || !/^\d+$/.test(codigo))
      throw new ErrorDatos("El código de cuenta debe tener 6 dígitos (99.99.99).");
    await this.transaccion(async (c) => {
      if (nuevo) {
        if (await c.cuenta(empresaId, codigo)) throw new ErrorDatos("Esta Cuenta ya existe.");
        await c.execute("INSERT INTO cuenta(empresa_id,codigo,nombre,cdocum) VALUES (?,?,?,?)",
          [empresaId, codigo, nombre.trim().toUpperCase(), cdocum ? 1 : 0]);
      } else {
        await c.execute("UPDATE cuenta SET nombre=?, cdocum=? WHERE empresa_id=? AND codigo=?",
          [nombre.trim().toUpperCase(), cdocum ? 1 : 0, empresaId, codigo]);
      }
    });
  }

  async usoCuenta(empresaId: number, codigo: string): Promise<number> {
    return (await this.q1<{ n: number }>(`SELECT COUNT(*) n FROM detalle d JOIN asiento a ON a.id=d.asiento_id
                          JOIN periodo p ON p.id=a.periodo_id
                          WHERE p.empresa_id=? AND d.codigo=?`, [empresaId, codigo]))!.n;
  }

  async borrarCuenta(empresaId: number, codigo: string) {
    const n = await this.usoCuenta(empresaId, codigo);
    if (n) throw new ErrorDatos(`La cuenta tiene ${n} movimientos en asientos; no se puede borrar.`);
    await this.transaccion((c) => c.execute("DELETE FROM cuenta WHERE empresa_id=? AND codigo=?", [empresaId, codigo]));
  }

  // ------------------------------------------------------------------ centros de costo (CCOSTO.DBF)
  ccostos(empresaId: number, orden = "codigo"): Promise<CCosto[]> {
    orden = orden === "nombre" ? "nombre" : "codigo";
    return this.q(`SELECT * FROM ccosto WHERE empresa_id=? ORDER BY ${orden}`, [empresaId]);
  }

  ccosto(empresaId: number, codigo: string): Promise<CCosto | undefined> {
    return this.q1("SELECT * FROM ccosto WHERE empresa_id=? AND codigo=?", [empresaId, codigo]);
  }

  async nombreCcosto(empresaId: number, codigo: string): Promise<string> {
    const r = codigo ? await this.ccosto(empresaId, codigo) : undefined;
    return r ? r.nombre : "";
  }

  async guardarCcosto(empresaId: number, codigo: string, nombre: string, nuevo: boolean) {
    codigo = (codigo || "").trim().toUpperCase().slice(0, 6);
    if (!codigo) throw new ErrorDatos("Debe ingresar el código.");
    await this.transaccion(async (c) => {
      if (nuevo) {
        if (await c.ccosto(empresaId, codigo)) throw new ErrorDatos("Este C. de Costo ya existe.");
        await c.execute("INSERT INTO ccosto(empresa_id,codigo,nombre) VALUES (?,?,?)",
          [empresaId, codigo, nombre.trim().toUpperCase()]);
      } else {
        await c.execute("UPDATE ccosto SET nombre=? WHERE empresa_id=? AND codigo=?",
          [nombre.trim().toUpperCase(), empresaId, codigo]);
      }
    });
  }

  async borrarCcosto(empresaId: number, codigo: string) {
    await this.transaccion((c) => c.execute("DELETE FROM ccosto WHERE empresa_id=? AND codigo=?", [empresaId, codigo]));
  }

  // ------------------------------------------------------------------ proveedores (PROVEE.DBF), compartidos entre años
  proveedores(empresaId: number, orden = "rut"): Promise<Proveedor[]> {
    orden = orden === "nombre" ? "nombre" : "rut";
    return this.q(`SELECT * FROM proveedor WHERE empresa_id=? ORDER BY ${orden}`, [empresaId]);
  }

  proveedor(empresaId: number, rut: string): Promise<Proveedor | undefined> {
    return this.q1("SELECT * FROM proveedor WHERE empresa_id=? AND rut=?", [empresaId, util.limpiarRut(rut)]);
  }

  async nombreProveedor(empresaId: number, rut: string): Promise<string> {
    const r = rut ? await this.proveedor(empresaId, rut) : undefined;
    return r ? r.nombre : "";
  }

  async guardarProveedor(empresaId: number, datos: DatosProveedor, nuevo: boolean) {
    const rut = util.limpiarRut(datos.rut);
    if (nuevo) {
      if (!util.validarRut(rut)) throw new ErrorDatos("Error en el dígito verificador del R.U.T.");
      if (await this.proveedor(empresaId, rut)) throw new ErrorDatos("Este PROVEEDOR ya existe.");
    }
    const campos = ["nombre", "direccion", "ciudad", "giro", "telefono", "email"] as const;
    const vals = campos.map((k) => String(datos[k] || "").trim());
    vals[0] = vals[0].toUpperCase();
    await this.transaccion(async (c) => {
      if (nuevo) {
        await c.execute("INSERT INTO proveedor(empresa_id,rut,nombre,direccion,ciudad,giro,telefono,email)" +
          " VALUES (?,?,?,?,?,?,?,?)", [empresaId, rut, ...vals]);
      } else {
        await c.execute("UPDATE proveedor SET nombre=?,direccion=?,ciudad=?,giro=?,telefono=?,email=?" +
          " WHERE empresa_id=? AND rut=?", [...vals, empresaId, rut]);
      }
    });
  }

  async borrarProveedor(empresaId: number, rut: string) {
    await this.transaccion((c) => c.execute("DELETE FROM proveedor WHERE empresa_id=? AND rut=?", [empresaId, util.limpiarRut(rut)]));
  }
}
