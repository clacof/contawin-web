import type { Metadata } from "next";
import { getDb } from "@/lib/servidor";
import { requiereUsuario } from "@/lib/sesion";
import * as util from "@/lib/util";
import Seleccion from "./Seleccion";

export const metadata: Metadata = { title: "Seleccionar empresa" };

export default async function PaginaSeleccionar({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requiereUsuario();
  const q = await searchParams;
  const empresas = getDb().empresas();
  return (
    <Seleccion
      aviso={q.aviso === "empresa" ? "Primero debes seleccionar una empresa.\n\nUsa «Cambiar empresa» o presiona F2." : undefined}
      mensaje={q.mensaje}
      empresas={empresas.map((e) => ({ id: e.id, valores: [util.formatoRut(e.rut), e.razon_social, e.giro] }))}
      empresaInicial={q.empresa ? Number(q.empresa) : s.empresaId}
      periodoInicial={q.periodo ? Number(q.periodo) : s.periodoId}
      abrirAnos={!!q.empresa}
    />
  );
}
