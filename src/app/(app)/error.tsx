"use client";
/** Error inesperado: se muestra y queda registrado en error.log (en el servidor). */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="tarjeta columna" style={{ gap: 12 }}>
      <h1 className="titulo">Error inesperado</h1>
      <p style={{ margin: 0 }}>Ocurrió un error inesperado (quedó registrado en error.log).</p>
      {error.digest && <p className="ayuda" style={{ margin: 0 }}>Código: {error.digest}</p>}
      <div><button className="boton primario" onClick={reset}>Reintentar</button></div>
    </div>
  );
}
