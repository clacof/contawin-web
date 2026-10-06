/** Empresas (EMPRESA.DBF) y años de trabajo (RESPAL.DBF) — db/empresas.py. */
import * as util from "../util";
import { ErrorDatos } from "./errores";
import type { Empresa, Periodo } from "./tipos";
import { UsuariosRepo } from "./usuarios";

export interface DatosEmpresa {
  rut?: string; razon_social?: string; giro?: string; direccion?: string; ciudad?: string; rep_legal?: string;
  sucursal?: string; honorarios?: number | string; directorio?: string;
}

const s = (v: unknown) => String(v ?? "");

export class EmpresasRepo extends UsuariosRepo {
  empresas(orden = "razon_social"): Promise<Empresa[]> {
    orden = ["rut", "razon_social", "directorio"].includes(orden) ? orden : "razon_social";
    return this.q(`SELECT * FROM empresa ORDER BY ${orden}`);
  }

  empresa(empresaId: number): Promise<Empresa | undefined> {
    return this.q1("SELECT * FROM empresa WHERE id=?", [empresaId]);
  }

  empresaPorRut(rut: string): Promise<Empresa | undefined> {
    return this.q1("SELECT * FROM empresa WHERE rut=?", [util.limpiarRut(rut)]);
  }

  async guardarEmpresa(datos: DatosEmpresa, empresaId: number | null = null, anoInicial: number | null = null): Promise<number> {
    const rut = util.limpiarRut(datos.rut);
    if (empresaId === null) {
      if (!util.validarRut(rut)) throw new ErrorDatos("Error en el dígito verificador del R.U.T.");
      if (await this.empresaPorRut(rut)) throw new ErrorDatos("Esta Empresa ya existe.");
      const directorio = s(datos.directorio).trim().toUpperCase();
      if (!directorio) throw new ErrorDatos("Debe indicar el directorio (código corto) de la empresa.");
      if (await this.q1("SELECT 1 FROM empresa WHERE directorio=?", [directorio]))
        throw new ErrorDatos(`El Directorio ${directorio} ya existe.`);
    }
    const campos = ["razon_social", "giro", "direccion", "ciudad", "rep_legal", "sucursal"] as const;
    const valores = campos.map((k) => s(datos[k] || "").trim().toUpperCase());
    const honor = util.pyInt(datos.honorarios || 0);
    return this.transaccion(async (c) => {
      if (empresaId === null) {
        empresaId = await c.execute(
          "INSERT INTO empresa(rut,razon_social,giro,direccion,ciudad,rep_legal,sucursal," +
          "honorarios,directorio) VALUES (?,?,?,?,?,?,?,?,?)",
          [rut, ...valores, honor, s(datos.directorio).trim().toUpperCase()]);
        if (anoInicial) await c.execute("INSERT INTO periodo(empresa_id, ano) VALUES (?,?)", [empresaId, anoInicial]);
      } else {
        await c.execute("UPDATE empresa SET razon_social=?,giro=?,direccion=?,ciudad=?,rep_legal=?," +
          "sucursal=?,honorarios=? WHERE id=?", [...valores, honor, empresaId]);
      }
      return empresaId!;
    });
  }

  async borrarEmpresa(empresaId: number) {
    await this.transaccion(async (c) => {
      for (const p of await c.q<{ id: number }>("SELECT id FROM periodo WHERE empresa_id=?", [empresaId]))
        await c.execute("DELETE FROM parametro WHERE clave=?", [`apertura:${p.id}`]);
      await c.execute("DELETE FROM parametro WHERE clave=?", [`cuenta_resultado:${empresaId}`]);
      await c.execute("DELETE FROM empresa WHERE id=?", [empresaId]);
    });
  }

  async resumenEmpresa(empresaId: number): Promise<{ periodos: number; asientos: number }> {
    return (await this.q1<{ periodos: number; asientos: number }>(`SELECT (SELECT COUNT(*) FROM periodo WHERE empresa_id=?) periodos,
                           (SELECT COUNT(*) FROM asiento a JOIN periodo p ON p.id=a.periodo_id
                             WHERE p.empresa_id=?) asientos`, [empresaId, empresaId]))!;
  }

  // ------------------------------------------------------------------ periodos
  periodos(empresaId: number): Promise<Periodo[]> {
    return this.q("SELECT * FROM periodo WHERE empresa_id=? ORDER BY ano", [empresaId]);
  }

  periodo(periodoId: number): Promise<Periodo | undefined> {
    return this.q1("SELECT * FROM periodo WHERE id=?", [periodoId]);
  }

  async crearPeriodo(empresaId: number, ano: number): Promise<number> {
    if (ano < 1980 || ano > 2200) throw new ErrorDatos("Año inválido.");
    if (await this.q1("SELECT 1 FROM periodo WHERE empresa_id=? AND ano=?", [empresaId, ano]))
      throw new ErrorDatos(`El año ${ano} ya existe para esta empresa.`);
    return this.transaccion((c) => c.execute("INSERT INTO periodo(empresa_id, ano) VALUES (?,?)", [empresaId, ano]));
  }

  /** Último año de la empresa anterior a `ano` (origen de los saldos de apertura). */
  periodoAnterior(empresaId: number, ano: number): Promise<Periodo | undefined> {
    return this.q1("SELECT * FROM periodo WHERE empresa_id=? AND ano<? ORDER BY ano DESC LIMIT 1", [empresaId, ano]);
  }
}
