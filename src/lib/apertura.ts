/** Asiento de apertura: textos de apoyo (contawin/apertura.py). La lógica está en db/apertura.ts. */
import * as util from "./util";

/** resultado = debe - haber de las cuentas 3 y 4 (> 0 pérdida, < 0 utilidad). */
export function resumenResultado(resultado: number): string {
  if (resultado < 0) return `Utilidad del ejercicio: ${util.fmtPesos(-resultado)} (va al Haber de la cuenta elegida)`;
  if (resultado > 0) return `Pérdida del ejercicio: ${util.fmtPesos(resultado)} (va al Debe de la cuenta elegida)`;
  return "El ejercicio no tiene resultado (cuentas 3 y 4 en cero).";
}
