export function getServerApiBase() {
  return (
    process.env.API_PROXY_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000"
  ).replace(/\/$/, "");
}

/** En el navegador usa URL relativa solo si el API comparte el mismo origen (ngrok/túnel). */
export function getClientRequestBase() {
  const apiUrl = (
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
  ).replace(/\/$/, "");

  if (typeof window === "undefined") {
    return apiUrl;
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
