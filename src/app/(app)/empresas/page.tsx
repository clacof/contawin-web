import type { Metadata } from "next";
import { getDb } from "@/lib/servidor";
import { requiereUsuario } from "@/lib/sesion";
import * as util from "@/lib/util";
import Cliente from "./Cliente";

export const metadata: Metadata = { title: "Empresas" };

export default async function Pagina({ searchParams }: { searchParams: Promise<{ orden?: string; nuevo?: string }> }) {
  await requiereUsuario();
  const q = await searchParams;
  const orden = q.orden === "rut" ? "rut" : "razon_social";
  const db = getDb();
  const lista = db.empresas(orden);
  return (
    <Cliente orden={orden} abrirNuevo={q.nuevo === "1"}
      empresas={lista.map((e) => ({ id: e.id, rut: e.rut, razon_social: e.razon_social, giro: e.giro, direccion: e.direccion,
        ciudad: e.ciudad, rep_legal: e.rep_legal, sucursal: e.sucursal, honorarios: e.honorarios, directorio: e.directorio }))}
      filas={lista.map((e) => {
        const r = db.resumenEmpresa(e.id);
        return { clave: String(e.id), valores: [util.formatoRut(e.rut), e.razon_social, e.giro, e.directorio],
          descripcion: `${e.razon_social}  (${util.formatoRut(e.rut)})\n\nSe eliminarán también sus ${r.periodos} años y ${r.asientos} asientos.` };
      })} />
  );
}
