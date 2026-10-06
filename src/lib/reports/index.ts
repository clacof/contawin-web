/**
 * Informes contables (lógica pura, sin interfaz) — paquete reports de ContaWinPy.
 *
 *   Lib_Diario()  LIBRO.PRG   -> libroDiario()        Lib_DxTipo() LIBROXT.PRG -> libroDiario(tipo)
 *   Lib_Mayor()   MAYOR.PRG   -> libroMayor()         Bal8Win()    BAL8WIN.PRG -> balance8Columnas()
 *   Bal_TInfor()  BALTI.PRG   -> balanceTipoInforme() LibroC()     LIBROC.PRG  -> libroCompras()
 *   Lo_Imprime()  ASIENTOS.PRG-> comprobante()        Imprime*()   M*.PRG      -> listado*()
 */
export * from "./modelo";
export { comprobante, libroDiario, libroMayor, saldoTxt } from "./libros";
export { MODOS_BALANCE, TEXTO_ART100, balance8Columnas, balanceTipoInforme, calcularBalance8, modoBalance } from "./balances";
export type { ModoBalance } from "./balances";
export { libroCompras, netoIvaTotal } from "./compras";
export { listadoCcostos, listadoCuentas, listadoEmpresas, listadoProveedores } from "./listados";
