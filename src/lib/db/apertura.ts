/** Asiento de apertura: traspaso de saldos al año siguiente — db/apertura.py. */
import * as util from "../util";
import { AsientosRepo } from "./asientos";
import { ErrorDatos } from "./errores";
import type { Asiento, CabeceraAsiento } from "./tipos";

export interface SaldosCierre { saldos: Record<string, number>; resultado: number }
export interface LineaApertura { codigo: string; debe: number; haber: number }

export class AperturaRepo extends AsientosRepo {
  /**
   * Saldos finales del año para el asiento de apertura del siguiente.
   * Las cuentas de resultado (grupos 3 y 4) se cierran: su saldo neto es el resultado
   * del ejercicio (debe - haber: > 0 pérdida, < 0 utilidad). Las demás se traspasan.
   */
  async saldosCierre(periodoId: number): Promise<SaldosCierre> {
    const saldos: Record<string, number> = {};
    let resultado = 0;
    for (const r of await this.q<{ codigo: string; s: number }>(`SELECT d.codigo, SUM(d.debe) - SUM(d.haber) s FROM detalle d
                           JOIN asiento a ON a.id=d.asiento_id WHERE a.periodo_id=?
                           GROUP BY d.codigo ORDER BY d.codigo`, [periodoId])) {
      if (!r.s) continue;
      if (["3", "4"].includes(r.codigo.slice(0, 1))) resultado += r.s;
      else saldos[r.codigo] = r.s;
    }
    return { saldos, resultado };
  }

  async lineasApertura(periodoOrigenId: number, cuentaResultado: string | null): Promise<LineaApertura[]> {
    const sc = await this.saldosCierre(periodoOrigenId);
    const saldos = { ...sc.saldos };
    if (sc.resultado) {
      if (!cuentaResultado)
        throw new ErrorDatos("Debe indicar la cuenta de patrimonio donde se traspasa el resultado del ejercicio.");
      saldos[cuentaResultado] = (saldos[cuentaResultado] ?? 0) + sc.resultado;
    }
    return Object.keys(saldos).sort().filter((c) => saldos[c])
      .map((c) => ({ codigo: c, debe: saldos[c] > 0 ? saldos[c] : 0, haber: saldos[c] < 0 ? -saldos[c] : 0 }));
  }

  /** Asiento de apertura generado por el sistema para el año (o undefined). */
  async asientoApertura(periodoId: number): Promise<Asiento | undefined> {
    const r = await this.q1<{ valor: string }>("SELECT valor FROM parametro WHERE clave=?", [`apertura:${periodoId}`]);
    if (!r) return undefined;
    return this.q1("SELECT * FROM asiento WHERE id=? AND periodo_id=?", [parseInt(r.valor, 10), periodoId]);
  }

  async cuentaResultadoSugerida(empresaId: number): Promise<string | null> {
    const r = await this.q1<{ valor: string }>("SELECT valor FROM parametro WHERE clave=?", [`cuenta_resultado:${empresaId}`]);
    if (r && await this.cuenta(empresaId, r.valor)) return r.valor;
    for (const c of await this.cuentas(empresaId)) {
      const nom = c.nombre;
      if (!["3", "4"].includes(c.codigo.slice(0, 1)) &&
        (nom.includes("RESULTADO") || nom.includes("UTILIDAD") || nom.includes("PERDIDA"))) return c.codigo;
    }
    return null;
  }

  /**
   * Genera (o regenera) el asiento de apertura del año destino con los saldos al cierre
   * del año origen. Si ya existe uno generado por el sistema, lo reemplaza.
   */
  async traspasarApertura(periodoOrigenId: number, periodoDestinoId: number, cuentaResultado: string | null = null): Promise<number> {
    const origen = await this.periodo(periodoOrigenId);
    const destino = await this.periodo(periodoDestinoId);
    if (!origen || !destino || origen.empresa_id !== destino.empresa_id)
      throw new ErrorDatos("Los años de origen y destino deben ser de la misma empresa.");
    if (origen.ano >= destino.ano) throw new ErrorDatos("El año de origen debe ser anterior al año de destino.");
    const empresaId = destino.empresa_id;
    if (cuentaResultado && !(await this.cuenta(empresaId, cuentaResultado)))
      throw new ErrorDatos(`La cuenta ${util.formatoCodigo(cuentaResultado)} no existe en el plan de cuentas.`);
    const lineas = await this.lineasApertura(periodoOrigenId, cuentaResultado);
    if (!lineas.length) throw new ErrorDatos(`El año ${origen.ano} no tiene saldos que traspasar.`);
    const cab: CabeceraAsiento = {
      tipo: "T", fecha: `${destino.ano}-01-01`,
      glosa: `ASIENTO DE APERTURA ${destino.ano} (SALDOS AL 31-12-${origen.ano})`,
    };
    const previo = await this.asientoApertura(periodoDestinoId);
    let asientoId: number;
    if (previo) {
      asientoId = await this.guardarAsiento(periodoDestinoId, cab, lineas.map((l) => ({ ...l, documento: null })), previo.id);
    } else {
      const libre = !(await this.q1("SELECT 1 FROM asiento WHERE periodo_id=? AND numero=1", [periodoDestinoId]));
      cab.numero = libre ? 1 : await this.siguienteNumero(periodoDestinoId);
      asientoId = await this.guardarAsiento(periodoDestinoId, cab, lineas.map((l) => ({ ...l, documento: null })));
    }
    await this.transaccion(async (c) => {
      await c.execute("INSERT OR REPLACE INTO parametro(clave, valor) VALUES (?,?)", [`apertura:${periodoDestinoId}`, String(asientoId)]);
      if (cuentaResultado)
        await c.execute("INSERT OR REPLACE INTO parametro(clave, valor) VALUES (?,?)", [`cuenta_resultado:${empresaId}`, cuentaResultado]);
    });
    return asientoId;
  }

  /** Crea el año y traspasa los saldos; si el traspaso falla, el año no queda creado. */
  async crearPeriodoConApertura(empresaId: number, ano: number, periodoOrigenId: number, cuentaResultado: string | null = null): Promise<number> {
    const pid = await this.crearPeriodo(empresaId, ano);
    try {
      await this.traspasarApertura(periodoOrigenId, pid, cuentaResultado);
    } catch (e) {
      await this.transaccion((c) => c.execute("DELETE FROM periodo WHERE id=?", [pid]));
      throw e;
    }
    return pid;
  }
}
