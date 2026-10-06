"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Catalogo, type FilaCatalogo } from "@/components/Catalogo";
import { FormCCosto } from "@/components/Formularios";
import { borrarCcosto } from "../mantenedores";

type CC = { codigo: string; nombre: string };

export default function Cliente({ subtitulo, orden, ccostos, filas }: { subtitulo: string; orden: string; ccostos: CC[]; filas: FilaCatalogo[] }) {
  const router = useRouter();
  const [form, setForm] = useState<{ cc: CC | null } | null>(null);
  const [ultimo, setUltimo] = useState<string | null>(null);
  return (
    <Catalogo titulo="Centros de costo" subtitulo={subtitulo} ordenes={[["Código", "codigo"], ["Nombre", "nombre"]]} ordenActual={orden}
      columnas={[{ titulo: "Código", ancho: 110, mono: true }, { titulo: "Nombre" }]}
      filas={filas} seleccionInicial={ultimo} informe="/api/informe?tipo=listado-ccostos"
      onNuevo={() => setForm({ cc: null })}
      onModificar={(cod) => setForm({ cc: ccostos.find((c) => c.codigo === cod) ?? null })}
      onBorrar={borrarCcosto}>
      {form && <FormCCosto ccosto={form.cc} onCerrar={(cod) => {
        setForm(null);
        if (cod) { setUltimo(cod); router.refresh(); }
      }} />}
    </Catalogo>
  );
}
