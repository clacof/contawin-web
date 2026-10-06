import type { Metadata } from "next";
import { PaginaCabeza } from "@/components/Pagina";
import { APP_NAME, VERSION } from "@/lib/config";
import { getDb } from "@/lib/servidor";
import { requiereUsuario } from "@/lib/sesion";

export const metadata: Metadata = { title: "Acerca de" };

export default async function Pagina() {
  await requiereUsuario();
  return (
    <>
      <PaginaCabeza sobretitulo="Acerca de" titulo={`${APP_NAME} v${VERSION}`} />
      <section className="tarjeta columna" style={{ gap: 12, maxWidth: 760 }}>
        <p>ContaWin es obra de <strong>Claudio A. Cofré V.</strong>, escrito originalmente en xHarbour/FiveWin.</p>
        <p className="secundario">Esta es su versión web (Next.js + SQLite), traspasada desde ContaWinPy conservando sus reglas contables.</p>
        <p className="ayuda">Base de datos:<br /><code>{getDb().ruta}</code></p>
      </section>
    </>
  );
}
