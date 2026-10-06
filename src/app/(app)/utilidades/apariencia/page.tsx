import type { Metadata } from "next";
import { cookies } from "next/headers";
import { requiereUsuario } from "@/lib/sesion";
import Apariencia from "./Apariencia";

export const metadata: Metadata = { title: "Apariencia" };

export default async function Pagina() {
  await requiereUsuario();
  return <Apariencia actual={(await cookies()).get("contawin_tema")?.value ?? "claro"} />;
}
