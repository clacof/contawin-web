"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icono } from "@/components/Icono";
import { useMensajes } from "@/components/Mensajes";
import { PaginaCabeza } from "@/components/Pagina";
import { importarDbf } from "../acciones";

export default function Importar({ inicial, hayEmpresas }: { inicial: string; hayEmpresas: boolean }) {
  const m = useMensajes();
  const router = useRouter();
  const [carpeta, setCarpeta] = useState(inicial);
  const [reemplazar, setReemplazar] = useState(false);     // «No» era la opción por defecto del original
  const [resumen, setResumen] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function ejecutar(reemplazar: boolean) {
    iniciar(async () => {
      const r = await importarDbf(carpeta, reemplazar);
      if (r.error) return void m.error(r.error);
      setResumen(r.resumen!);
      router.refresh();
    });
  }

  return (
    <div className="columna" style={{ gap: 20 }}>
      <PaginaCabeza sobretitulo="Utilidades" titulo="Importar datos del ContaWin antiguo (DBF)"
        subtitulo="Trae empresas, cuentas, centros de costo, años, asientos, compras y proveedores. Los DBF originales no se modifican." />
      <form className="tarjeta columna" style={{ gap: 16 }} onSubmit={(e) => { e.preventDefault(); ejecutar(hayEmpresas && reemplazar); }}>
        <div className="campo-grupo">
          <label className="etiqueta" htmlFor="carpeta">Carpeta CONTAWIN (la que contiene EMPRESA.DBF)</label>
          <input id="carpeta" className="campo mono" value={carpeta} onChange={(e) => setCarpeta(e.target.value)}
            placeholder="D:\Respaldar 24-01-2023\d Disco C\CONTAWIN" aria-describedby="carpeta-ayuda" />
          <span id="carpeta-ayuda" className="ayuda">Ruta en el equipo donde corre el sistema.</span>
        </div>
        {hayEmpresas && (
          <fieldset className="opciones">
            <legend>Ya hay empresas en la base de datos. Las que ya existan (mismo RUT):</legend>
            <label className="check"><input type="radio" name="reemplazar" checked={!reemplazar} onChange={() => setReemplazar(false)} />No reemplazar: importar solo las empresas nuevas</label>
            <label className="check"><input type="radio" name="reemplazar" checked={reemplazar} onChange={() => setReemplazar(true)} />Reemplazar con los datos de los DBF</label>
          </fieldset>
        )}
        <div className="fila">
          <span className="ayuda">También por línea de comandos: <code>npm run importar -- &quot;D:\ruta\CONTAWIN&quot; [--reemplazar] [--cp850]</code></span>
          <span className="espacio" />
          <button type="submit" className="boton primario" disabled={pendiente || !carpeta.trim()}>
            <Icono nombre="importar" />{pendiente ? "Importando…" : "Importar"}
          </button>
        </div>
      </form>
      {resumen && (
        <section className="tarjeta columna" style={{ gap: 10 }} aria-live="polite">
          <h2 className="encabezado">Resultado de la importación</h2>
          <div className="pre">{resumen}</div>
        </section>
      )}
    </div>
  );
}
