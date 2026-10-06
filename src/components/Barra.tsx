"use client";
/**
 * Marco de la aplicación (Main() / MenuMain() de CONTAB.PRG): barra lateral con los módulos, cabecera con
 * el contexto de trabajo y atajos globales F2 / F3 / F4 / Ctrl+N. En pantallas angostas la barra es un menú deslizable.
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { salir } from "@/app/login/acciones";
import { Icono } from "./Icono";
import { useMensajes } from "./Mensajes";

const SECCIONES: [string, [string, string, string, string?][]][] = [
  ["Ingresos", [["/comprobantes", "comprobante", "Comprobantes", "F3"], ["/apertura", "importar", "Asiento de apertura"],
    ["/cuentas", "cuentas", "Plan de cuentas", "F4"], ["/proveedores", "proveedor", "Proveedores"], ["/ccostos", "ccosto", "Centros de costo"]]],
  ["Informes", [["/informes/balance-8", "balance", "Balance de 8 columnas"], ["/informes/balance-tipo-informe", "informe", "Balance tipo informe"],
    ["/informes/libro-diario", "diario", "Libro diario"], ["/informes/libro-diario-tipo", "tipo", "Diario por tipo"],
    ["/informes/libro-mayor", "mayor", "Mayor"]]],
  ["Compras", [["/informes/libro-compras", "compras", "Libro de compras"]]],
  ["Utilidades", [["/empresas", "empresa", "Empresas"], ["/usuarios", "usuarios", "Usuarios"],
    ["/utilidades/importar", "importar", "Importar desde DBF"], ["/utilidades/respaldar", "respaldar", "Respaldar datos"],
    ["/utilidades/apariencia", "vista", "Apariencia"], ["/utilidades/acerca", "info", "Acerca de ContaWin"]]],
];

export interface Contexto {
  empresa: string | null; rut: string | null; ano: number | null; usuario: string; nombre: string; estado: string;
}

export function Marco({ ctx, children }: { ctx: Contexto; children: React.ReactNode }) {
  const ruta = usePathname();
  const router = useRouter();
  const m = useMensajes();
  const [menu, setMenu] = useState(false);

  useEffect(() => { setMenu(false); }, [ruta]);
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (document.querySelector("dialog[open]")) return;      // con un panel abierto no se navega
      if (e.key === "Escape" && menu) setMenu(false);
      if (e.key === "F2") { e.preventDefault(); router.push("/seleccionar"); }
      else if (e.key === "F3") { e.preventDefault(); router.push("/comprobantes"); }
      else if (e.key === "F4") { e.preventDefault(); router.push("/cuentas"); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === "n" || e.key === "N") && !e.shiftKey) {
        e.preventDefault(); router.push("/comprobantes/nuevo");
      }
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [router, menu]);

  const activo = (href: string) => ruta === href || ruta.startsWith(href + "/");
  const iniciales = (ctx.nombre || ctx.usuario).split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
  return (
    <div className={`app ${menu ? "menu-abierto" : ""}`}>
      <nav className="barra no-imprimir" aria-label="Módulos" id="menu-principal">
        <div className="barra-marca">
          <div className="logo" aria-hidden="true"><Icono nombre="comprobante" tam={18} /></div>
          <div><strong>ContaWin</strong><span>Sistema de Contabilidad</span></div>
        </div>
        <div className="barra-lista">
          <Link href="/" className={`nav ${ruta === "/" ? "activo" : ""}`} aria-current={ruta === "/" ? "page" : undefined}><Icono nombre="inicio" />Inicio</Link>
          {SECCIONES.map(([titulo, items]) => (
            <div key={titulo} role="group" aria-labelledby={`sec-${titulo}`} style={{ display: "contents" }}>
              <div className="seccion" id={`sec-${titulo}`}>{titulo}</div>
              {items.map(([href, ic, texto, atajo]) => (
                <Link key={href} href={href} className={`nav ${activo(href) ? "activo" : ""}`} prefetch={false}
                  aria-current={activo(href) ? "page" : undefined}>
                  <Icono nombre={ic} />{texto}{atajo && <span className="atajo" aria-label={`atajo ${atajo}`}>{atajo}</span>}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="barra-pie">
          <button className="nav" style={{ width: "calc(100% - 20px)" }} onClick={async () => {
            if (await m.confirmar("¿Salir del sistema?")) await salir();
          }}><Icono nombre="salir" />Salir</button>
        </div>
      </nav>
      <div className="velo-menu" onClick={() => setMenu(false)} aria-hidden="true" />
      <div className="principal">
        <header className="cabecera no-imprimir">
          <button className="boton fantasma icono-solo boton-menu" aria-label="Abrir menú" aria-expanded={menu} aria-controls="menu-principal"
            onClick={() => setMenu(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <div className="contexto">
            <div className="contexto-texto">
              <strong>{ctx.empresa ?? "Sin empresa seleccionada"}</strong>
              <span className="ayuda">{ctx.empresa ? `RUT ${ctx.rut}` : "Presiona F2 para elegir empresa y año"}</span>
            </div>
            {ctx.ano && <span className="chip">Año {ctx.ano}</span>}
          </div>
          <span className="espacio" />
          <Link className="boton" href="/seleccionar" title="Selecciona otra empresa o año (F2)">
            <Icono nombre="cambiar" /><span className="ocultar-movil">Cambiar empresa</span>
          </Link>
          <div className="usuario">
            <div className="datos"><strong style={{ fontSize: 13 }}>{ctx.nombre || ctx.usuario}</strong><span className="ayuda">{ctx.usuario}</span></div>
            <span className="avatar" aria-hidden="true">{iniciales}</span>
          </div>
        </header>
        <main className="lienzo" id="contenido">{children}</main>
        <footer className="pie-estado no-imprimir">{ctx.estado}</footer>
      </div>
    </div>
  );
}
