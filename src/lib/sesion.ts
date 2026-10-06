import "server-only";
/**
 * Sesión de trabajo (usuario, empresa y año) — equivalente a contawin/sesion.py.
 *
 * Se guarda en una cookie httpOnly firmada (JWT HS256 con `jose`), sin estado en el servidor.
 * En cada petición se vuelve a leer el usuario, la empresa y el año desde la base
 * (como Sesion.refrescar_empresa): si alguno ya no existe, deja de estar seleccionado.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, SignJWT } from "jose";
import { config } from "./config";
import type { Empresa, Periodo, UsuarioPublico } from "./db";
import { getDb } from "./servidor";

export const COOKIE_SESION = "contawin_sesion";
export const COOKIE_INTENTOS = "contawin_intentos";
const DURACION_SESION = 60 * 60 * 10;          // 10 horas (una jornada de trabajo)
export const BLOQUEO_INTENTOS = 60 * 5;         // tras 3 intentos fallidos: 5 minutos

let secreto: Uint8Array | null = null;
/** CONTAWIN_SECRET, o una clave aleatoria guardada junto a la base (se crea la primera vez). */
function claveSecreta(): Uint8Array {
  if (secreto) return secreto;
  let s = process.env.CONTAWIN_SECRET || "";
  if (s.length < 32) {
    const archivo = path.join(path.dirname(config.rutaBase), ".contawin_secret");
    try {
      s = fs.readFileSync(archivo, "utf-8").trim();
    } catch {
      s = crypto.randomBytes(48).toString("base64url");
      fs.mkdirSync(path.dirname(archivo), { recursive: true });
      fs.writeFileSync(archivo, s, { mode: 0o600 });
    }
  }
  secreto = new TextEncoder().encode(s);
  return secreto;
}

export interface DatosSesion { u: string; e?: number | null; p?: number | null }

export async function firmar(datos: object, segundos: number): Promise<string> {
  return new SignJWT({ ...datos }).setProtectedHeader({ alg: "HS256" }).setIssuedAt()
    .setExpirationTime(`${segundos}s`).sign(claveSecreta());
}

export async function verificar<T>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, claveSecreta(), { algorithms: ["HS256"] });
    return payload as T;
  } catch {
    return null;
  }
}

const opcionesCookie = (maxAge: number) => ({
  httpOnly: true, sameSite: "lax" as const, path: "/", maxAge,
  // Se usa en red local por http; con HTTPS (detrás de un proxy) active CONTAWIN_COOKIE_SEGURA=1
  secure: process.env.CONTAWIN_COOKIE_SEGURA === "1",
});

export async function guardarSesion(datos: DatosSesion) {
  (await cookies()).set(COOKIE_SESION, await firmar(datos, DURACION_SESION), opcionesCookie(DURACION_SESION));
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE_SESION);
}

export async function leerIntentos(): Promise<number> {
  const t = await verificar<{ n: number }>((await cookies()).get(COOKIE_INTENTOS)?.value);
  return t?.n ?? 0;
}

export async function guardarIntentos(n: number) {
  const c = await cookies();
  if (n <= 0) c.delete(COOKIE_INTENTOS);
  else c.set(COOKIE_INTENTOS, await firmar({ n }, BLOQUEO_INTENTOS), opcionesCookie(BLOQUEO_INTENTOS));
}

export interface Sesion {
  usuario: UsuarioPublico;
  empresa: Empresa | null;
  periodo: Periodo | null;
  esAdmin: boolean;
  empresaId: number | null;
  periodoId: number | null;
  ano: number | null;
}

/** Sesión actual (o null). Se calcula una vez por petición. */
export const getSesion = cache(async (): Promise<Sesion | null> => {
  const d = await verificar<DatosSesion>((await cookies()).get(COOKIE_SESION)?.value);
  if (!d?.u) return null;
  const db = getDb();
  const u = db.usuario(d.u);
  if (!u) return null;
  const { clave_hash: _omitida, ...usuario } = u;
  void _omitida;
  let empresa = d.e ? db.empresa(d.e) ?? null : null;
  let periodo = empresa && d.p ? db.periodo(d.p) ?? null : null;
  if (periodo && periodo.empresa_id !== empresa!.id) periodo = null;
  if (!periodo) empresa = null;           // sin año no hay empresa de trabajo
  return {
    usuario, empresa, periodo, esAdmin: !!usuario.es_admin,
    empresaId: empresa?.id ?? null, periodoId: periodo?.id ?? null, ano: periodo?.ano ?? null,
  };
});

/** Exige usuario conectado (si no, a la pantalla de ingreso). */
export async function requiereUsuario(): Promise<Sesion> {
  const s = await getSesion();
  if (!s) redirect("/login");
  return s;
}

export type SesionConEmpresa = Sesion & { empresa: Empresa; periodo: Periodo; empresaId: number; periodoId: number; ano: number };

/** _ejecutar(..., requiere_empresa=True): «Primero debes seleccionar una empresa». */
export async function requiereEmpresa(): Promise<SesionConEmpresa> {
  const s = await requiereUsuario();
  if (!s.empresa || !s.periodo) redirect("/seleccionar?aviso=empresa");
  return s as SesionConEmpresa;
}
