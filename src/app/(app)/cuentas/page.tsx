import type { Metadata } from "next";
import { getDb } from "@/lib/servidor";
import { requiereEmpresa } from "@/lib/sesion";
import * as util from "@/lib/util";
import Cliente from "./Cliente";

export const metadata: Metadata = { title: "Plan de cuentas" };

export default async function Pagina({ searchParams }: { searchParams: Promise<{ orden?: string }> }) {
  const s = await requiereEmpresa();
  const orden = (await searchParams).orden === "nombre" ? "nombre" : "codigo";
  const db = getDb();
  const cuentas = db.cuentas(s.empresaId, orden);
  return (
    <Cliente subtitulo={s.empresa.razon_social} orden={orden}
      cuentas={cuentas.map((c) => ({ codigo: c.codigo, nombre: c.nombre, cdocum: c.cdocum }))}
      filas={cuentas.map((c) => ({ clave: c.codigo, valores: [util.formatoCodigo(c.codigo), c.nombre, c.cdocum ? "Sí" : ""],
        descripcion: `Código: ${util.formatoCodigo(c.codigo)}  ${c.nombre}` }))} />
  );
}
