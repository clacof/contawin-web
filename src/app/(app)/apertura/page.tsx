import type { Metadata } from "next";
import Link from "next/link";
import { resumenResultado } from "@/lib/apertura";
import { getDb } from "@/lib/servidor";
import { requiereEmpresa, requiereUsuario } from "@/lib/sesion";
import AperturaForm from "./AperturaForm";

export const metadata: Metadata = { title: "Asiento de apertura" };

/** AperturaDialog: vista previa de los saldos del balance del año anterior y cuenta que recibe el resultado. */
export default async function PaginaApertura({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const db = getDb();
  const crear = !!(q.empresa && q.ano);
  let empresaId: number, anoDestino: number, periodoDestinoId: number | null = null;
  if (crear) {
    await requiereUsuario();
    empresaId = Number(q.empresa);
    anoDestino = Number(q.ano);
  } else {
    const s = await requiereEmpresa();
    empresaId = s.empresaId;
    anoDestino = s.ano;
    periodoDestinoId = s.periodoId;
  }
  const emp = db.empresa(empresaId);
  const origen = emp ? db.periodoAnterior(empresaId, anoDestino) : undefined;
  if (!emp || !origen) {
    return (
      <div className="columna" style={{ gap: 20 }}>
        <h1 className="titulo">Asiento de apertura {anoDestino}</h1>
        <div className="alerta-error" role="alert">No hay un año anterior a {anoDestino}: no hay saldos que traspasar.</div>
        <div><Link className="boton" href="/">Volver</Link></div>
      </div>
    );
  }
  const sc = db.saldosCierre(origen.id);
  const cuentas = db.cuentas(empresaId);
  const descuadrados = db.cantidadDescuadrados(origen.id);
  const avisos: string[] = [];
  if (descuadrados)
    avisos.push(`⚠ El año ${origen.ano} tiene ${descuadrados} comprobante(s) descuadrado(s); corrígelos o la apertura no cuadrará.`);
  const previo = periodoDestinoId ? db.asientoApertura(periodoDestinoId) : undefined;
  if (previo) avisos.push(`Se reemplazará el asiento de apertura N° ${previo.numero} ya existente.`);
  return (
    <AperturaForm
      empresaId={empresaId} razonSocial={emp.razon_social} origen={{ id: origen.id, ano: origen.ano }} anoDestino={anoDestino}
      crear={crear} avisos={avisos} resultado={sc.resultado} resumen={resumenResultado(sc.resultado)}
      nombres={Object.fromEntries(cuentas.map((c) => [c.codigo, c.nombre]))}
      cuentasPatrimonio={cuentas.filter((c) => !["3", "4"].includes(c.codigo.slice(0, 1))).map((c) => [c.codigo, c.nombre] as const)}
      sugerida={db.cuentaResultadoSugerida(empresaId)}
    />
  );
}
