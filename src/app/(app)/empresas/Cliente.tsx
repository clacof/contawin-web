"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Catalogo, type FilaCatalogo } from "@/components/Catalogo";
import { FormEmpresa } from "@/components/Formularios";
import { useMensajes } from "@/components/Mensajes";
import * as util from "@/lib/util";
import { borrarEmpresa, type FormEmpresa as Datos } from "../mantenedores";

type Emp = Omit<Datos, "ano"> & { id: number };

export default function Cliente({ orden, empresas, filas, abrirNuevo }: { orden: string; empresas: Emp[]; filas: FilaCatalogo[]; abrirNuevo: boolean }) {
  const router = useRouter();
  const m = useMensajes();
  const [form, setForm] = useState<{ e: Emp | null } | null>(abrirNuevo ? { e: null } : null);
  const [ultima, setUltima] = useState<string | null>(null);
  return (
    <Catalogo titulo="Empresas" ordenes={[["Razón social", "razon_social"], ["RUT", "rut"]]} ordenActual={orden}
      columnas={[{ titulo: "RUT", ancho: 130, alinear: "R" }, { titulo: "Razón social" }, { titulo: "Giro", ancho: 220 }, { titulo: "Directorio", ancho: 100 }]}
      filas={filas} seleccionInicial={ultima} informe="/api/informe?tipo=listado-empresas"
      onNuevo={() => setForm({ e: null })}
      onModificar={(id) => setForm({ e: empresas.find((e) => String(e.id) === id) ?? null })}
      campoConfirmacion={(id) => {
        const e = empresas.find((x) => String(x.id) === id)!;
        return `Para confirmar, escribe el RUT de la empresa (${util.formatoRut(e.rut)}):`;
      }}
      onBorrar={async (id, texto) => {
        const e = empresas.find((x) => String(x.id) === id)!;
        if (!texto || util.limpiarRut(texto) !== e.rut) return { error: "Eliminación cancelada." };
        const r = await borrarEmpresa(e.id, texto);
        router.refresh();
        return r;
      }}>
      {form && <FormEmpresa empresa={form.e} onCerrar={async (g) => {
        const nueva = !form.e;
        setForm(null);
        if (!g) return;
        setUltima(String(g.id));
        router.refresh();
        if (nueva) await m.info(`Empresa creada con el año ${g.ano}.\nSelecciónala con «Cambiar empresa» (F2) para trabajar en ella.`);
      }} />}
    </Catalogo>
  );
}
