"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Catalogo, type FilaCatalogo } from "@/components/Catalogo";
import { FormProveedor } from "@/components/Formularios";
import { borrarProveedor, type FormProveedor as Prov } from "../mantenedores";

export default function Cliente({ subtitulo, orden, proveedores, filas }: { subtitulo: string; orden: string; proveedores: Prov[]; filas: FilaCatalogo[] }) {
  const router = useRouter();
  const [form, setForm] = useState<{ p: Prov | null } | null>(null);
  const [ultimo, setUltimo] = useState<string | null>(null);
  return (
    <Catalogo titulo="Proveedores" subtitulo={subtitulo} ordenes={[["RUT", "rut"], ["Nombre", "nombre"]]} ordenActual={orden}
      columnas={[{ titulo: "RUT", ancho: 130, alinear: "R" }, { titulo: "Razón social" }, { titulo: "Giro", ancho: 220 }, { titulo: "Ciudad", ancho: 140 }]}
      filas={filas} seleccionInicial={ultimo} informe="/api/informe?tipo=listado-proveedores"
      onNuevo={() => setForm({ p: null })}
      onModificar={(rut) => setForm({ p: proveedores.find((p) => p.rut === rut) ?? null })}
      onBorrar={borrarProveedor}>
      {form && <FormProveedor proveedor={form.p} onCerrar={(rut) => {
        setForm(null);
        if (rut) { setUltimo(rut); router.refresh(); }
      }} />}
    </Catalogo>
  );
}
