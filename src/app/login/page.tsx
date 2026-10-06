import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icono } from "@/components/Icono";
import { config } from "@/lib/config";
import { getSesion, leerIntentos } from "@/lib/sesion";
import FormLogin from "./FormLogin";

export const metadata: Metadata = { title: "Selección de usuario" };

export default async function PaginaLogin() {
  if (await getSesion()) redirect("/");
  const bloqueado = (await leerIntentos()) >= 3;
  return (
    <main className="login-fondo">
      <section className="login-marca" aria-label="ContaWin">
        <div className="fila" style={{ gap: 12 }}>
          <div className="logo" aria-hidden="true"><Icono nombre="comprobante" tam={22} /></div>
          <strong style={{ fontSize: 18 }}>ContaWin</strong>
        </div>
        <div className="columna" style={{ gap: 14 }}>
          <h1>{config.titulo}</h1>
          <p className="solo-escritorio">Comprobantes, libros, balances y compras de cada empresa y año de trabajo, con las mismas reglas de siempre.</p>
        </div>
        <p className="solo-escritorio" style={{ fontSize: 12.5 }}>ContaWin · creado por Claudio A. Cofré V.</p>
      </section>
      <div className="login-lado">
        <div className="login">
          <h2 className="titulo">Ingresar</h2>
          <p className="secundario" style={{ marginBottom: 12 }}>Ingresa con tu usuario y clave.</p>
          <FormLogin bloqueadoInicial={bloqueado} />
        </div>
      </div>
    </main>
  );
}
