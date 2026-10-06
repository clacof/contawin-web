import Link from "next/link";
import { Icono } from "@/components/Icono";
import { PaginaCabeza } from "@/components/Pagina";
import { getDb } from "@/lib/servidor";
import { requiereUsuario } from "@/lib/sesion";
import * as util from "@/lib/util";
import UltimosComprobantes from "./UltimosComprobantes";

/** Tablero del área de trabajo (_actualizar_tablero de ui/principal.py). */
export default async function Tablero() {
  const s = await requiereUsuario();
  if (!s.empresa || !s.periodo) {
    return (
      <div className="tarjeta vacio" style={{ padding: "56px 24px" }}>
        <Icono nombre="empresa" tam={40} />
        <h1 className="titulo" style={{ color: "var(--ink)" }}>Selecciona una empresa para comenzar</h1>
        <p>Elige la empresa y el año contable con los que vas a trabajar.</p>
        <Link href="/seleccionar" className="boton primario" title="F2"><Icono nombre="cambiar" />Seleccionar empresa</Link>
      </div>
    );
  }
  const db = getDb();
  const lista = db.asientos(s.periodo.id);
  const debe = lista.reduce((t, a) => t + a.debe, 0);
  const haber = lista.reduce((t, a) => t + a.haber, 0);
  const descuadrados = lista.filter((a) => a.debe !== a.haber).length;
  const [d, h] = db.rangoFechas(s.periodo.id);
  const ultimos = [...lista].sort((a, b) => b.numero - a.numero).slice(0, 8);
  return (
    <>
      <PaginaCabeza sobretitulo={s.empresa.razon_social} titulo={`Resumen del año ${s.ano}`}
        subtitulo={d ? `Movimientos del ${util.fmtFecha(d)} al ${util.fmtFecha(h)}` : undefined}
        acciones={<Link className="boton primario" href="/comprobantes/nuevo" title="Ctrl+N"><Icono nombre="mas" />Nuevo comprobante</Link>} />

      <section aria-label="Estado del período" className="columna" style={{ gap: 12 }}>
        <div className="fila">
          <h2 className="encabezado">Estado del período</h2>
          {!lista.length ? <span className="estado neutro">Sin comprobantes todavía.</span>
            : descuadrados ? <span className="estado mal">⚠ {descuadrados} comprobante{descuadrados > 1 ? "s" : ""} descuadrado{descuadrados > 1 ? "s" : ""}</span>
              : <span className="estado ok">✓ Todos los comprobantes están cuadrados</span>}
        </div>
        <div className="rejilla-kpi">
          {([["Comprobantes", util.fmtMonto(lista.length), "comprobante"], ["Total debe", util.fmtPesos(debe), "balance"], ["Total haber", util.fmtPesos(haber), "balance"]] as const).map(([t, v, ic]) => (
            <div key={t} className="kpi">
              <span className="fila ayuda" style={{ gap: 6 }}><Icono nombre={ic} tam={16} />{t}</span>
              <span className="cifra-grande">{v}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="rejilla-2">
        <section className="tarjeta" aria-labelledby="ult">
          <div className="tarjeta-cabeza"><h2 id="ult" className="encabezado">Últimos comprobantes</h2><span className="espacio" />
            <Link className="boton enlace" href="/comprobantes">Ver todos (F3)</Link></div>
          {ultimos.length ? (
            <UltimosComprobantes filas={ultimos.map((a) => ({
              id: a.id, valores: [util.fmtMonto(a.numero), util.fmtFecha(a.fecha), util.nombreTipoAsiento(a.tipo), a.glosa,
                util.fmtPesos(Math.max(a.debe, a.haber)), a.debe === a.haber ? "✓ Cuadrado" : "⚠ Descuadrado"],
              cuadrado: a.debe === a.haber,
            }))} />
          ) : <div className="vacio"><Icono nombre="comprobante" tam={32} /><p>Aún no hay comprobantes en este año. Usa «Nuevo comprobante» para ingresar el primero.</p></div>}
        </section>
        <section className="tarjeta columna" aria-labelledby="acc" style={{ gap: 10 }}>
          <h2 id="acc" className="encabezado" style={{ marginBottom: 6 }}>Accesos rápidos</h2>
          {([["/comprobantes", "comprobante", "Comprobantes", "F3"], ["/cuentas", "cuentas", "Plan de cuentas", "F4"],
            ["/informes/libro-diario", "diario", "Libro diario", ""], ["/informes/balance-8", "balance", "Balance 8 columnas", ""],
            ["/informes/libro-compras", "compras", "Libro de compras", ""]] as const).map(([href, ic, t, k]) => (
            <Link key={href} href={href} className="boton" style={{ justifyContent: "flex-start" }}>
              <Icono nombre={ic} />{t}{k && <span className="kbd" style={{ marginLeft: "auto" }}>{k}</span>}
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
