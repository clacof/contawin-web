import type { Metadata } from "next";
import Image from "next/image";
import paisaje from "@/assets/contawin-paisaje.jpg";
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
        <figure className="acerca-paisaje">
          <Image src={paisaje} alt="Peñón rojizo sobre un lago quieto, con montañas nevadas entre la bruma: la imagen de siempre de ContaWin" placeholder="blur" sizes="(max-width: 860px) 100vw, 760px" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="acerca-marca" src="/marca/contawin-marca.svg" alt="" width={56} height={56} />
        </figure>
        <p>ContaWin es obra de <strong>Claudio A. Cofré V.</strong>, escrito originalmente en xHarbour/FiveWin.</p>
        <p className="secundario">Esta es su versión web (Next.js + SQLite), traspasada desde ContaWinPy conservando sus reglas contables.</p>
        <p className="ayuda">Base de datos:<br /><code>{(await getDb()).ruta}</code></p>
      </section>
    </>
  );
}
