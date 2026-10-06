import type { Metadata } from "next";
import { requiereEmpresa } from "@/lib/sesion";
import { datosEditor } from "../datos";
import Editor from "../Editor";

export const metadata: Metadata = { title: "Nuevo comprobante" };

export default async function Pagina() {
  const s = await requiereEmpresa();
  return <Editor d={datosEditor(s, null)} />;
}
