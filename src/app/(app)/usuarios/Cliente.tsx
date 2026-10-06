"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Catalogo, type FilaCatalogo } from "@/components/Catalogo";
import { FormUsuario } from "@/components/Formularios";
import { borrarUsuario } from "../mantenedores";

type U = { usuario: string; nombre: string; es_admin: number };

export default function Cliente({ usuarios, filas }: { usuarios: U[]; filas: FilaCatalogo[] }) {
  const router = useRouter();
  const [form, setForm] = useState<{ u: U | null } | null>(null);
  const [ultimo, setUltimo] = useState<string | null>(null);
  return (
    <Catalogo titulo="Usuarios" ordenes={[["Usuario", "usuario"]]} ordenActual="usuario"
      columnas={[{ titulo: "Usuario", ancho: 130, mono: true }, { titulo: "Nombre" }, { titulo: "Administrador", ancho: 130, alinear: "C" }]}
      filas={filas} seleccionInicial={ultimo}
      onNuevo={() => setForm({ u: null })}
      onModificar={(u) => setForm({ u: usuarios.find((x) => x.usuario === u) ?? null })}
      onBorrar={borrarUsuario}>
      {form && <FormUsuario usuario={form.u} onCerrar={(u) => {
        setForm(null);
        if (u) { setUltimo(u); router.refresh(); }
      }} />}
    </Catalogo>
  );
}
