/** Íconos de línea del sistema de diseño ContaWin (1.5 px, 24×24) — copiados de ui/tema.py. */
const TRAZOS: Record<string, string> = {
  "inicio": "<path d=\"M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z\"/>",
  "empresa": "<rect x=\"4\" y=\"3\" width=\"16\" height=\"18\" rx=\"2\"/><path d=\"M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3\"/>",
  "comprobante": "<path d=\"M6 3h12v18l-3-2-3 2-3-2-3 2z\"/><path d=\"M9 8h6M9 12h6M9 16h3\"/>",
  "cuentas": "<path d=\"M4 5v14M4 5h3M4 12h3M4 19h3M10 5h10M10 12h10M10 19h10\"/>",
  "proveedor": "<path d=\"M3 6h11v10H3z\"/><path d=\"M14 9h4l3 3v4h-7\"/><circle cx=\"7\" cy=\"18\" r=\"2\"/><circle cx=\"17\" cy=\"18\" r=\"2\"/>",
  "ccosto": "<circle cx=\"12\" cy=\"12\" r=\"8\"/><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 12h.01\"/>",
  "balance": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M3 9h18M9 4v16M15 4v16\"/>",
  "informe": "<path d=\"M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z\"/><path d=\"M14 3v5h5M9 13h6M9 17h6\"/>",
  "diario": "<path d=\"M5 19.5V4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5 1.5 1.5 0 0 0 6.5 21H19v-3\"/><path d=\"M9 8h6M9 12h4\"/>",
  "tipo": "<path d=\"M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z\"/><circle cx=\"8\" cy=\"8\" r=\"1.5\"/>",
  "mayor": "<path d=\"M12 4v16M8 20h8M5 7h14\"/><path d=\"M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z\"/>",
  "compras": "<path d=\"M3 4h2l2.4 11h10.2L20 8H6.2\"/><circle cx=\"9\" cy=\"19\" r=\"1.5\"/><circle cx=\"17\" cy=\"19\" r=\"1.5\"/>",
  "usuarios": "<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M3 20a6 6 0 0 1 12 0\"/><path d=\"M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6 6 0 0 1 3 5.5\"/>",
  "importar": "<path d=\"M12 4v11M7 10l5 5 5-5M5 20h14\"/>",
  "respaldar": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"5\" rx=\"1\"/><path d=\"M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4\"/>",
  "info": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v5M12 8h.01\"/>",
  "salir": "<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9\"/>",
  "cambiar": "<path d=\"M4 8h14l-3-3M20 16H6l3 3\"/>",
  "mas": "<path d=\"M12 5v14M5 12h14\"/>",
  "editar": "<path d=\"M16 4l4 4L8 20H4v-4z\"/>",
  "borrar": "<path d=\"M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3\"/>",
  "imprimir": "<path d=\"M7 9V3h10v6\"/><rect x=\"3\" y=\"9\" width=\"18\" height=\"8\" rx=\"2\"/><path d=\"M7 14h10v7H7z\"/>",
  "excel": "<rect x=\"4\" y=\"3\" width=\"16\" height=\"18\" rx=\"2\"/><path d=\"M4 9h16M4 15h16M10 9v12\"/>",
  "guardar": "<path d=\"M5 3h11l3 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z\"/><path d=\"M8 3v5h7M8 21v-6h8v6\"/>",
  "cerrar": "<path d=\"M6 6l12 12M18 6L6 18\"/>",
  "buscar": "<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M20 20l-4-4\"/>",
  "ojo": "<path d=\"M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  "ojo_cerrado": "<path d=\"M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M4 4l16 16\"/>",
  "ok": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8 12l3 3 5-6\"/>",
  "alerta": "<path d=\"M12 4l9 16H3z\"/><path d=\"M12 10v4M12 17h.01\"/>",
  "calendario": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M3 10h18M8 3v4M16 3v4\"/>",
  "vista": "<path d=\"M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  "chevron_abajo": "<path d=\"M6 9l6 6 6-6\"/>",
  "chevron_arriba": "<path d=\"M6 15l6-6 6 6\"/>",
  "check": "<path d=\"M5 12.5l4.5 4.5L19 7.5\"/>"
};

export type NombreIcono = keyof typeof TRAZOS | string;

export function Icono({ nombre, tam = 18, className }: { nombre: NombreIcono; tam?: number; className?: string }) {
  const d = TRAZOS[nombre] ?? TRAZOS.info;
  return (
    <svg className={className ? `icono ${className}` : "icono"} width={tam} height={tam} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: d }} />
  );
}
