"use client";
import { useRouter } from "next/navigation";
import { Catalogo, type FilaCatalogo } from "@/components/Catalogo";
import { borrarComprobante } from "./acciones";

export default function Lista({ titulo, subtitulo, orden, filas, sel }: { titulo: string; subtitulo: string; orden: string; filas: FilaCatalogo[]; sel: string | null }) {
  const router = useRouter();
  return (
    <Catalogo titulo={titulo} subtitulo={subtitulo} ordenes={[["Número", "numero"], ["Fecha", "fecha"], ["Tipo", "tipo"]]} ordenActual={orden}
      columnas={[{ titulo: "N°", ancho: 80, alinear: "R" }, { titulo: "Tipo", ancho: 60, alinear: "C" }, { titulo: "Fecha", ancho: 110, alinear: "C" },
        { titulo: "Glosa" }, { titulo: "Debe", ancho: 150, alinear: "R" }, { titulo: "Haber", ancho: 150, alinear: "R" }]}
      filas={filas} seleccionInicial={sel}
      onNuevo={() => router.push("/comprobantes/nuevo")}
      onModificar={(id) => router.push(`/comprobantes/${id}`)}
      onBorrar={borrarComprobante}
      extras={[{ texto: "Imprimir comprobante", icono: "imprimir", accion: (id) => window.open(`/api/informe?tipo=comprobante&id=${id}&formato=pdf`, "_blank") }]} />
  );
}
