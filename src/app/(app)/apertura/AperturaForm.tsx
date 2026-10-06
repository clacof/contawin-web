"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Combo } from "@/components/Campos";
import { Icono } from "@/components/Icono";
import { useMensajes } from "@/components/Mensajes";
import { PaginaCabeza } from "@/components/Pagina";
import { Tabla } from "@/components/Tabla";
import * as util from "@/lib/util";
import { crearAnoConApertura, previaApertura, traspasar } from "./acciones";

type Linea = { codigo: string; debe: number; haber: number };

export default function AperturaForm(p: {
  empresaId: number; razonSocial: string; origen: { id: number; ano: number }; anoDestino: number; crear: boolean;
  avisos: string[]; resultado: number; resumen: string; nombres: Record<string, string>;
  cuentasPatrimonio: (readonly [string, string])[]; sugerida: string | null;
}) {
  const m = useMensajes();
  const router = useRouter();
  const [cuenta, setCuenta] = useState<string | null>(p.sugerida);
  const [previa, setPrevia] = useState<{ lineas: Linea[]; falta: boolean } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const codigo = p.resultado ? cuenta || null : null;

  useEffect(() => {
    let vigente = true;
    previaApertura(p.origen.id, codigo).then((r) => { if (vigente) setPrevia(r); });
    return () => { vigente = false; };
  }, [codigo, p.origen.id]);

  const det = previa?.lineas ?? [];
  const td = det.reduce((s, l) => s + l.debe, 0), th = det.reduce((s, l) => s + l.haber, 0);

  async function aceptar(omitir = false) {
    setError(null);
    if (!omitir) {
      if (p.resultado && !codigo) return setError("Elige la cuenta de patrimonio donde se traspasa el resultado del ejercicio.");
      if (codigo && codigo.startsWith("1") && !(await m.confirmar(
        `La cuenta ${util.formatoCodigo(codigo)} ${p.nombres[codigo] ?? ""} es de activo.\n` +
        "El resultado normalmente va a una cuenta de patrimonio (resultados acumulados).\n\n¿Usarla de todas formas?",
        "Cuenta del resultado"))) return;
    }
    iniciar(async () => {
      if (p.crear) {
        const r = await crearAnoConApertura(p.empresaId, p.anoDestino, p.origen.id, codigo, omitir);
        if (r.error) return void setError(r.error);
        const q = new URLSearchParams({ empresa: String(p.empresaId), periodo: String(r.pid) });
        if (r.mensaje) q.set("mensaje", r.mensaje);
        router.push(`/seleccionar?${q}`);
      } else {
        const r = await traspasar(p.origen.id, codigo);
        if (r.error) return void setError(r.error);
        await m.info(r.mensaje!, "Asiento de apertura");
        router.push("/");
        router.refresh();
      }
    });
  }

  return (
    <div className="columna" style={{ gap: 20 }}>
      <PaginaCabeza sobretitulo={p.razonSocial} titulo={`Asiento de apertura ${p.anoDestino}`}
        subtitulo={`Saldos del balance al 31-12-${p.origen.ano}`} />
      {error && <div className="alerta-error" role="alert"><Icono nombre="alerta" /><span>{error}</span></div>}
      {p.avisos.map((a) => <div key={a} className="aviso" role="note"><Icono nombre="alerta" /><span>{a}</span></div>)}
      <section className="tarjeta columna" style={{ gap: 8 }} aria-labelledby="cta-res">
        <label id="cta-res" className="etiqueta" htmlFor="cuenta-resultado">Cuenta de patrimonio donde se traspasa el resultado</label>
        <Combo id="cuenta-resultado" items={p.cuentasPatrimonio} valor={cuenta} onCambio={setCuenta} formato={util.formatoCodigo}
          deshabilitado={!p.resultado} />
        <span className={`estado ${p.resultado < 0 ? "ok" : p.resultado > 0 ? "mal" : "neutro"}`} style={{ alignSelf: "flex-start" }}>{p.resumen}</span>
      </section>
      <Tabla etiqueta="Líneas del asiento de apertura" columnas={[{ titulo: "Código", ancho: 110, mono: true }, { titulo: "Cuenta" }, { titulo: "Debe", ancho: 160, alinear: "R" }, { titulo: "Haber", ancho: 160, alinear: "R" }]}
        filas={det.map((l, i) => ({ clave: i, valores: [util.formatoCodigo(l.codigo), p.nombres[l.codigo] ?? "(cuenta no existe)",
          util.fmtMonto(l.debe, true), util.fmtMonto(l.haber, true)] }))} vacio="Calculando…" />
      <div className="barra-pie-fija" role="region" aria-label="Totales y acciones">
        <span aria-live="polite">{previa && (previa.falta ? <span className="estado mal">Falta elegir la cuenta para el resultado</span>
          : td === th ? <span className="estado ok">✓ Cuadrado · {det.length} cuentas</span>
            : <span className="estado mal">⚠ Descuadrado · Diferencia {util.fmtPesos(Math.abs(td - th))}</span>)}</span>
        <div className="totales">
          <div className="total-caja"><span className="ayuda">Total debe</span><span className="cifra">{util.fmtPesos(td)}</span></div>
          <div className="total-caja"><span className="ayuda">Total haber</span><span className="cifra">{util.fmtPesos(th)}</span></div>
        </div>
        <span className="espacio" />
        {p.crear && <button className="boton" disabled={pendiente} onClick={() => aceptar(true)}>Crear el año sin apertura</button>}
        <button className="boton" onClick={() => router.back()}>Cancelar</button>
        <button className="boton primario" disabled={pendiente} onClick={() => aceptar(false)}><Icono nombre="importar" />Traspasar saldos</button>
      </div>
    </div>
  );
}
