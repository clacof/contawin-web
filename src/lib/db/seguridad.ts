/**
 * Hash y verificación de claves de usuario.
 * Formato idéntico a ContaWinPy (db/seguridad.py): "<sal hex>$<pbkdf2-sha256 hex>",
 * 60.000 iteraciones, clave sin espacios en los extremos y en MAYÚSCULAS.
 * Así las claves de la base existente siguen funcionando.
 */
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

export function hashClave(clave: string, sal?: string): string {
  const s = sal || randomBytes(8).toString("hex");
  const h = pbkdf2Sync(Buffer.from(clave.trim().toUpperCase(), "utf-8"), Buffer.from(s, "ascii"), 60000, 32, "sha256")
    .toString("hex");
  return `${s}$${h}`;
}

export function verificarClave(clave: string, guardado: string): boolean {
  const i = guardado.indexOf("$");
  if (i < 0) return false;
  const sal = guardado.slice(0, i);
  const a = Buffer.from(hashClave(clave, sal));
  const b = Buffer.from(guardado);
  return a.length === b.length && timingSafeEqual(a, b);
}
