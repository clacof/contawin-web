import type { Metadata } from "next";
import { getDb } from "@/lib/servidor";
import { requiereEmpresa } from "@/lib/sesion";
import * as util from "@/lib/util";
import Lista from "./Lista";

export const metadata: Metadata = { title: "Comprobantes" };

/** Lista de asientos (Asientos() / diálogo BROWSE). */
export default async function Pagina({ searchParams }: { searchParams: Promise<{ orden?: string; sel?: string }> }) {
  const s = await requiereEmpresa();
  const q = await searchParams;
  const orden = ["numero", "fecha", "tipo"].includes(q.orden ?? "") ? q.orden! : "numero";
  const db = await getDb();
  const [asientos, detalles, cuentas] = await Promise.all([
    db.asientos(s.periodoId, orden), db.detallesPeriodo(s.periodoId), db.cuentas(s.empresaId)]);
  const nombres = Object.fromEntries(cuentas.map((c) => [c.codigo, c.nombre]));
  const filas = asientos.map((a) => {
    const lineas = detalles.get(a.id) ?? [];
    const det = lineas.map((l) => `   ${util.formatoCodigo(l.codigo)}  ${(nombres[l.codigo] ?? "").slice(0, 28).padEnd(28)}` +
      `  D ${util.fmtMonto(l.debe).padStart(12)}  H ${util.fmtMonto(l.haber).padStart(12)}`).join("\n");
    return {
      clave: String(a.id),
      valores: [util.fmtMonto(a.numero), a.tipo, util.fmtFecha(a.fecha), a.glosa, util.fmtMonto(a.debe), util.fmtMonto(a.haber)],
      descripcion: `Asiento N° ${a.numero}  (${util.nombreTipoAsiento(a.tipo)})  ${util.fmtFecha(a.fecha)}\n${a.glosa}\n\n${det}\n\n` +
        "Se eliminarán también sus documentos de compra.",
    };
  });
  return <Lista titulo="Comprobantes" subtitulo={`${s.empresa.razon_social} · Año ${s.ano}`} orden={orden} filas={filas} sel={q.sel ?? null} />;
}
