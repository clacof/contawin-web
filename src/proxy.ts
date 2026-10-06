/**
 * Comprobación optimista: sin cookie de sesión se va a /login.
 * La verificación real (firma, usuario existente, empresa y año) se hace en cada página,
 * acción de servidor y ruta de API (lib/sesion.ts), no solo aquí.
 */
import { NextResponse, type NextRequest } from "next/server";

const PUBLICAS = ["/login", "/api/usuario"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();
  if (!req.cookies.get("contawin_sesion")) return NextResponse.redirect(new URL("/login", req.nextUrl));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|marca/).*)"],
};
