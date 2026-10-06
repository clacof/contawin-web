"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Catalogo, type FilaCatalogo } from "@/components/Catalogo";
import { FormCuenta } from "@/components/Formularios";
import { borrarCuenta } from "../mantenedores";

type Cuenta = { codigo: string; nombre: string; cdocum: number };

export default function Cliente({ subtitulo, orden, cuentas, filas }: { subtitulo: string; orden: string; cuentas: Cuenta[]; filas: FilaCatalogo[] }) {
  const router = useRouter();
  const [form, setForm] = useState<{ cuenta: Cuenta | null } | null>(null);
  const [ultima, setUltima] = useState<string | null>(null);
  return (
    <Catalogo titulo="Plan de cuentas" subtitulo={subtitulo} ordenes={[["Código", "codigo"], ["Nombre", "nombre"]]} ordenActual={orden}
      columnas={[{ titulo: "Código", ancho: 110, mono: true }, { titulo: "Nombre" }, { titulo: "Doc. de compra", ancho: 130, alinear: "C" }]}
      filas={filas} seleccionInicial={ultima} informe="/api/informe?tipo=listado-cuentas"
      onNuevo={() => setForm({ cuenta: null })}
      onModificar={(cod) => setForm({ cuenta: cuentas.find((c) => c.codigo === cod) ?? null })}
      onBorrar={borrarCuenta}>
      {form && <FormCuenta cuenta={form.cuenta} onCerrar={(cod) => {
        setForm(null);
        if (cod) { setUltima(cod); router.refresh(); }
      }} />}
    </Catalogo>
  );
}
