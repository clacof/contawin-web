import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { generar, INFORMES, TODOS_CC, type TipoInforme } from "@/lib/informes";
import * as reports from "@/lib/reports";
import { getDb } from "@/lib/servidor";
import { requiereEmpresa } from "@/lib/sesion";
import * as util from "@/lib/util";
import Parametros from "./Parametros";
import Visor from "./Visor";

export async function generateMetadata({ params }: { params: Promise<{ tipo: string }> }): Promise<Metadata> {
  const t = (await params).tipo as TipoInforme;
  return { title: INFORMES[t]?.titulo ?? "Informe" };
}

/** Parámetros del informe (DLG_PERINFOR, DLG_PERBALAN, DLG_BALTI, DLG_LIBROXTIPO, DLG_MAYOR, LIBROCOMPRA) y consulta en pantalla. */
export default async function PaginaInforme({ params, searchParams }: {
  params: Promise<{ tipo: string }>; searchParams: Promise<Record<string, string | undefined>>;
}) {
  const tipo = (await params).tipo;
  if (!(tipo in INFORMES)) notFound();
  const cfg = INFORMES[tipo as TipoInforme] as { titulo: string; sinDesde?: boolean; tipo?: boolean; cuentas?: boolean; ccosto?: boolean };
  const s = await requiereEmpresa();
  const q = await searchParams;
  const db = await getDb();
  const [d, h] = tipo === "libro-compras" ? await db.rangoFechasCompras(s.periodoId) : await db.rangoFechas(s.periodoId);
  const cuentas = cfg.cuentas ? (await db.cuentas(s.empresaId)).map((c) => [c.codigo, c.nombre] as [string, string]) : [];
  const ccostos = cfg.ccosto ? (await db.ccostos(s.empresaId)).map((c) => [c.codigo, c.nombre] as [string, string]) : [];
  const valores = {
    desde: q.desde ?? d ?? `${s.ano}-01-01`, hasta: q.hasta ?? h ?? `${s.ano}-12-31`, emision: q.emision ?? util.hoyIso(),
    tipo: q.tipo ?? "I", cdesde: q.cdesde ?? cuentas[0]?.[0] ?? "", chasta: q.chasta ?? cuentas.at(-1)?.[0] ?? "", cc: q.cc ?? TODOS_CC,
  };

  let visor: React.ReactNode = null;
  let error: string | undefined;
  let sinDatos = false;
  if (q.ver === "1") {
    const r = await generar(s, tipo, q);
    if ("error" in r) error = r.error;
    else if (!reports.tieneDatos(r.informe)) sinDatos = true;
    else {
      const inf = r.informe;
      const consulta = new URLSearchParams(Object.entries({ ...q, tipo, ver: undefined }).filter(([, v]) => v !== undefined) as [string, string][]);
      visor = <Visor titulo={inf.titulo} sub={[...inf.subtitulos, ...inf.membrete.slice(0, 1)].filter(Boolean).join("  ·  ")}
        columnas={inf.columnas.map((c) => ({ titulo: c.titulo, ancho: c.ancho >= 2 ? 0 : Math.trunc(70 * c.ancho + 30), alinear: reports.alineacion(c) }))}
        filas={inf.filas.map((f) => ({ estilo: f.estilo, valores: f.estilo === reports.GRUPO ? [f.texto] : reports.textos(inf, f) }))}
        pie={inf.pie} consulta={`/api/informe?${consulta}`} />;
    }
  }
  return (
    <>
      <Parametros titulo={cfg.titulo} subtitulo={`${s.empresa.razon_social} · Año ${s.ano}`} cfg={cfg} valores={valores}
        cuentas={cuentas} ccostos={ccostos}
        error={error} sinDatos={sinDatos} />
      {visor}
    </>
  );
}
