export function getServerApiBase() {
  return (
    process.env.API_PROXY_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000"
  ).replace(/\/$/, "");
}

/** En el navegador usa URL relativa si el API comparte el mismo origen (ngrok/túnel). */
export function getClientRequestBase() {
  const apiUrl = (
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
  ).replace(/\/$/, "");

  if (typeof window === "undefined") {
    return apiUrl;
  }

  // Vercel: same-origin /api/* rewrites to Railway (evita CORS)
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_API_URL) {
    return "";
  }

  try {
    if (new URL(apiUrl).origin === window.location.origin) {
      return "";
    }
  } catch {
    /* ignore */
  }

  return apiUrl;
}
