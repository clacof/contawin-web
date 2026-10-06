/** Filas de las tablas SQLite (mismas columnas que ContaWinPy). */
export interface Empresa {
  id: number; rut: string; razon_social: string; giro: string; direccion: string; ciudad: string;
  rep_legal: string; sucursal: string; honorarios: number; directorio: string; impuestos: number;
}
export interface Periodo { id: number; empresa_id: number; ano: number }
export interface Cuenta { empresa_id: number; codigo: string; nombre: string; cdocum: number }
export interface CCosto { empresa_id: number; codigo: string; nombre: string }
export interface Proveedor {
  empresa_id: number; rut: string; nombre: string; direccion: string; ciudad: string; giro: string;
  telefono: string; email: string;
}
export interface Asiento {
  id: number; periodo_id: number; numero: number; tipo: string; fecha: string | null; glosa: string;
  debe: number; haber: number; cdcosto: string;
}
export interface Detalle {
  id: number; asiento_id: number; linea: number; codigo: string; debe: number; haber: number; fecha: string | null;
}
export interface Compra {
  id: number; detalle_id: number; tdocum: number; fecha_doc: string | null; numero_doc: number; rut_prov: string;
  neto: number; iva: number; adicional: number; total: number; cdcosto: string; detalle: string; fecha_pago: string | null;
}
export interface Usuario { usuario: string; nombre: string; clave_hash: string; nivel: string; es_admin: number }
export type UsuarioPublico = Omit<Usuario, "clave_hash">;

/** Documento de compra asociado a una línea (como lo devuelve detalle_asiento). */
export interface DocumentoCompra {
  tdocum: number; fecha_doc: string | null; numero_doc: number; rut_prov: string; neto: number; iva: number;
  adicional: number; total: number; cdcosto: string; detalle: string; fecha_pago: string | null;
}
export interface LineaAsiento {
  codigo: string; debe: number; haber: number; documento: DocumentoCompra | null;
}
/** Cabecera para guardar_asiento: tipo, fecha, glosa, cdcosto (y opcionalmente numero). */
export interface CabeceraAsiento {
  tipo?: string | null; fecha?: string | Date | null; glosa?: string | null; cdcosto?: string | null; numero?: number | null;
}
export interface LineaEntrada {
  codigo: string; debe?: number | null; haber?: number | null;
  documento?: Partial<DocumentoCompra> | null;
}
export type MovimientoCompra = Compra & { nasiento: number; fecha_asiento: string | null; ccuenta: string };
