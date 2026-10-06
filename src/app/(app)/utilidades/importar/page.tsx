import type { Metadata } from "next";
import { cookies } from "next/headers";
import { config } from "@/lib/config";
import { getDb } from "@/lib/servidor";
import { requiereUsuario } from "@/lib/sesion";
import Importar from "./Importar";

export const metadata: Metadata = { title: "Importar datos DBF" };

export default async function Pagina() {
  await requiereUsuario();
  const inicial = (await cookies()).get("contawin_dbf")?.value || config.carpetaDbf;
  return <Importar inicial={inicial} hayEmpresas={getDb().empresas().length > 0} />;
}
