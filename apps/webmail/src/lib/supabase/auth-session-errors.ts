/**
 * Erros de sessão Supabase em que o refresh token é inválido ou inexistente —
 * a única saída segura é terminar sessão e voltar ao login.
 */
export function isFatalAuthSessionError(error: unknown): boolean {
  if (error == null) return false;
  if (typeof error !== "object") {
    if (typeof error === "string") {
      return (
        error.includes("Invalid Refresh Token") ||
        error.includes("Refresh Token Not Found") ||
        error.includes("refresh_token_not_found")
      );
    }
    return false;
  }

  const e = error as {
    code?: string;
    message?: string;
    status?: number;
    __isAuthError?: boolean;
  };

  if (e.code === "refresh_token_not_found") return true;
  if (e.code === "invalid_refresh_token") return true;

  const msg = typeof e.message === "string" ? e.message : "";
  if (msg.includes("Invalid Refresh Token")) return true;
  if (msg.includes("Refresh Token Not Found")) return true;

  if (e.__isAuthError === true && e.status === 400 && msg.toLowerCase().includes("refresh")) {
    return true;
  }

  return false;
}
