"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaginaCabeza } from "@/components/Pagina";
import { cambiarTema } from "../acciones";

export default function Apariencia({ actual }: { actual: string }) {
  const router = useRouter();
  const [t, setT] = useState(actual);
  return (
    <div className="columna" style={{ gap: 20 }}>
      <PaginaCabeza sobretitulo="Utilidades" titulo="Apariencia" />
      <fieldset className="tarjeta columna" style={{ gap: 8, margin: 0 }}>
      <legend className="solo-lector">Tema</legend>
      {[["claro", "Claro"], ["oscuro", "Oscuro"], ["automatico", "Según el sistema"]].map(([c, n]) => (
        <label key={c} className="check">
          <input type="radio" name="tema" checked={t === c} onChange={async () => { setT(c); await cambiarTema(c); router.refresh(); }} />{n}
        </label>
      ))}
      </fieldset>
    </div>
  );
}
