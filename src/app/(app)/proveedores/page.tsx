import type { Metadata } from "next";
import { getDb } from "@/lib/servidor";
import { requiereEmpresa } from "@/lib/sesion";
import * as util from "@/lib/util";
import Cliente from "./Cliente";

export const metadata: Metadata = { title: "Proveedores" };

export default async function Pagina({ searchParams }: { searchParams: Promise<{ orden?: string }> }) {
  const s = await requiereEmpresa();
  const orden = (await searchParams).orden === "nombre" ? "nombre" : "rut";
  const lista = getDb().proveedores(s.empresaId, orden);
  return (
    <Cliente subtitulo={s.empresa.razon_social} orden={orden}
      proveedores={lista.map(({ empresa_id: _e, ...p }) => p)}
      filas={lista.map((p) => ({ clave: p.rut, valores: [util.formatoRut(p.rut), p.nombre, p.giro, p.ciudad],
        descripcion: `${util.formatoRut(p.rut)}  ${p.nombre}` }))} />
  );
}
