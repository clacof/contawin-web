import type { Metadata } from "next";
import { getDb } from "@/lib/servidor";
import { requiereEmpresa } from "@/lib/sesion";
import Cliente from "./Cliente";

export const metadata: Metadata = { title: "Centros de costo" };

export default async function Pagina({ searchParams }: { searchParams: Promise<{ orden?: string }> }) {
  const s = await requiereEmpresa();
  const orden = (await searchParams).orden === "nombre" ? "nombre" : "codigo";
  const lista = getDb().ccostos(s.empresaId, orden);
  return (
    <Cliente subtitulo={s.empresa.razon_social} orden={orden} ccostos={lista.map((c) => ({ codigo: c.codigo, nombre: c.nombre }))}
      filas={lista.map((c) => ({ clave: c.codigo, valores: [c.codigo, c.nombre], descripcion: `Código: ${c.codigo}  ${c.nombre}` }))} />
  );
}
