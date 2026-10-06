/**
 * Informe en PDF (vista previa / imprimir / guardar), Excel (.xlsx) o CSV.
 * GET /api/informe?tipo=libro-diario&desde=…&hasta=…&formato=pdf|xlsx|csv[&descargar=1]
 */
import { generar } from "@/lib/informes";
import { exportarCsv, exportarXlsx } from "@/lib/reports/exportar";
import { informePdf } from "@/lib/reports/pdf";
import { getSesion } from "@/lib/sesion";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const s = await getSesion();
  if (!s) return new Response("No autorizado", { status: 401 });
  const q = Object.fromEntries(new URL(req.url).searchParams);
  const r = generar(s, q.tipo ?? "", q);
  if ("error" in r) return new Response(r.error, { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } });
  const inf = r.informe;
  const nombre = inf.nombreArchivo || "informe";
  const formato = q.formato ?? "pdf";
  if (formato === "xlsx") {
    return new Response(new Uint8Array(await exportarXlsx(inf)), { headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${nombre}.xlsx"` } });
  }
  if (formato === "csv") {
    return new Response(new Uint8Array(exportarCsv(inf)), { headers: {
      "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${nombre}.csv"` } });
  }
  return new Response(new Uint8Array(await informePdf(inf)), { headers: {
    "content-type": "application/pdf",
    "content-disposition": `${q.descargar === "1" ? "attachment" : "inline"}; filename="${nombre}.pdf"` } });
}
