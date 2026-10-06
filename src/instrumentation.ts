/** Registra en error.log los errores inesperados del servidor (como el original). */
import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registrarError } = await import("./lib/registroErrores");
    registrarError(err, `${request.method} ${request.path}`);
  }
};
