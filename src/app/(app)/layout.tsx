import { Marco } from "@/components/Barra";
import { ProveedorMensajes } from "@/components/Mensajes";
import { requiereUsuario } from "@/lib/sesion";
import * as util from "@/lib/util";

/** Ventana principal (Main() y MenuMain() de CONTAB.PRG — ui/principal.py). */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const s = await requiereUsuario();
  const u = s.usuario;
  const hay = !!(s.empresa && s.periodo);
  const texto = hay ? `${s.empresa!.razon_social} · Año ${s.ano}` : "Selecciona una empresa para trabajar (F2)";
  return (
    <ProveedorMensajes>
      <Marco ctx={{
        empresa: hay ? s.empresa!.razon_social : null, rut: hay ? util.formatoRut(s.empresa!.rut) : null, ano: hay ? s.ano : null,
        usuario: u.usuario, nombre: u.nombre, estado: `Usuario: ${u.usuario}  ·  ${texto}`,
      }}>{children}</Marco>
    </ProveedorMensajes>
  );
}
