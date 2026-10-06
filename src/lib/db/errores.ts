/** Error de validación de datos que se muestra al usuario (ErrorDatos). */
export class ErrorDatos extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorDatos";
  }
}

/** Comprueba por nombre (las acciones de servidor pueden cargar dos copias del módulo, y `instanceof` fallaría). */
export function esErrorDatos(e: unknown): e is ErrorDatos {
  return e instanceof ErrorDatos || (e instanceof Error && e.name === "ErrorDatos");
}
