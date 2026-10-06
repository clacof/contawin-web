import type { Metadata } from "next";
import { getDb } from "@/lib/servidor";
import { requiereUsuario } from "@/lib/sesion";
import Cliente from "./Cliente";

export const metadata: Metadata = { title: "Usuarios" };

export default async function Pagina() {
  const s = await requiereUsuario();
  if (!s.esAdmin) return <div className="alerta-error" role="alert">Usuario no autorizado.</div>;
  const lista = getDb().usuarios();
  return (
    <Cliente usuarios={lista.map((u) => ({ usuario: u.usuario, nombre: u.nombre, es_admin: u.es_admin }))}
      filas={lista.map((u) => ({ clave: u.usuario, valores: [u.usuario, u.nombre, u.es_admin ? "Sí" : ""], descripcion: `Usuario ${u.usuario}` }))} />
  );
}
