import type { Metadata } from "next";
import { Icono } from "@/components/Icono";
import { PaginaCabeza } from "@/components/Pagina";
import { getDb } from "@/lib/servidor";
import { requiereUsuario } from "@/lib/sesion";

export const metadata: Metadata = { title: "Respaldar base de datos" };

export default async function Pagina() {
  await requiereUsuario();
  return (
    <>
      <PaginaCabeza sobretitulo="Utilidades" titulo="Respaldar base de datos"
        subtitulo="Guarda una copia de seguridad de todos los datos (empresas, años, asientos, compras y usuarios)." />
      <section className="tarjeta columna" style={{ gap: 16 }}>
        <div><a className="boton primario" href="/api/respaldo"><Icono nombre="respaldar" />Descargar respaldo</a></div>
        <div className="alerta-info"><Icono nombre="info" /><span>Para restaurarlo, detenga el sistema y copie el archivo sobre:<br /><code>{(await getDb()).ruta}</code></span></div>
      </section>
    </>
  );
}
