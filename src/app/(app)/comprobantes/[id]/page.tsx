import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/servidor";
import { requiereEmpresa } from "@/lib/sesion";
import { datosEditor } from "../datos";
import Editor from "../Editor";

export const metadata: Metadata = { title: "Modificar comprobante" };

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const s = await requiereEmpresa();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || (await (await getDb()).asiento(id))?.periodo_id !== s.periodoId) notFound();
  return <Editor d={await datosEditor(s, id)} />;
}
