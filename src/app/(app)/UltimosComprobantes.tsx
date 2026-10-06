"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Tabla } from "@/components/Tabla";

export default function UltimosComprobantes({ filas }: { filas: { id: number; valores: string[]; cuadrado: boolean }[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<number | null>(filas[0]?.id ?? null);
  return (
    <Tabla alta={false} etiqueta="Últimos comprobantes"
      columnas={[{ titulo: "N°", ancho: 64, alinear: "R" }, { titulo: "Fecha", ancho: 100, alinear: "C" }, { titulo: "Tipo", ancho: 90 },
        { titulo: "Glosa" }, { titulo: "Monto", ancho: 140, alinear: "R" }, { titulo: "Estado", ancho: 130 }]}
      filas={filas.map((f) => ({ clave: f.id, valores: f.valores, claseValor: [, , , , , f.cuadrado ? "ok" : "error-txt"] }))}
      seleccion={sel} onSeleccion={setSel} onActivar={(id) => router.push(`/comprobantes/${id}`)} />
  );
}
