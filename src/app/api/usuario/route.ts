/** Confirmación del nombre del usuario en la pantalla de ingreso (como el original: CAC -> nombre). */
import { getDb } from "@/lib/servidor";

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u") ?? "";
  const r = u.trim() ? await (await getDb()).usuario(u) : undefined;
  return Response.json({ nombre: r?.nombre ?? null });
}
