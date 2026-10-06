"use server";
/** Inicio de sesión (ChkPass / diálogo INICIAL de CONTAB.PRG — ui/inicio.py LoginDialog). */
import { redirect } from "next/navigation";
import { getDb } from "@/lib/servidor";
import { cerrarSesion, guardarIntentos, guardarSesion, leerIntentos } from "@/lib/sesion";

export interface EstadoLogin { error?: string; restantes?: number; bloqueado?: boolean }

const MAX_INTENTOS = 3;

export async function ingresar(_prev: EstadoLogin | undefined, form: FormData): Promise<EstadoLogin> {
  let intentos = await leerIntentos();
  if (intentos >= MAX_INTENTOS)
    return { error: "Acceso no autorizado.\n\nSe superó el número de intentos.", bloqueado: true, restantes: 0 };
  const usuario = String(form.get("usuario") ?? "");
  const clave = String(form.get("clave") ?? "");
  const u = getDb().login(usuario, clave);
  if (!u) {
    intentos += 1;
    await guardarIntentos(intentos);
    const restantes = MAX_INTENTOS - intentos;
    if (intentos >= MAX_INTENTOS)
      return { error: "Acceso no autorizado.\n\nSe superó el número de intentos.", bloqueado: true, restantes: 0 };
    return {
      error: "Usuario o clave incorrectos. " + (restantes > 1 ? `Te quedan ${restantes} intentos.` : "Te queda 1 intento."),
      restantes,
    };
  }
  await guardarIntentos(0);
  await guardarSesion({ u: u.usuario });
  redirect("/seleccionar");
}

/** Salir del sistema. */
export async function salir() {
  await cerrarSesion();
  redirect("/login");
}
