/** Encabezado de página: sobretítulo opcional, título, contexto y acciones principales. */
export function PaginaCabeza({ titulo, subtitulo, sobretitulo, acciones }: {
  titulo: React.ReactNode; subtitulo?: React.ReactNode; sobretitulo?: React.ReactNode; acciones?: React.ReactNode;
}) {
  return (
    <div className="pagina-cabeza">
      <div className="textos">
        {sobretitulo && <span className="sobretitulo">{sobretitulo}</span>}
        <h1 className="titulo">{titulo}</h1>
        {subtitulo && <div className="secundario">{subtitulo}</div>}
      </div>
      {acciones && <div className="acciones">{acciones}</div>}
    </div>
  );
}
