import { getClientRequestBase } from "@/lib/api-base";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "pdv_token";
const COOKIE_NAME = "pdv_token";

export function getToken() {
  if (typeof window === "undefined") return null;
  const fromStorage = localStorage.getItem(TOKEN_KEY);
  if (fromStorage) return fromStorage;

  const match = document.cookie.match(/(?:^|; )pdv_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=43200; SameSite=Lax${secure}`;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

export function getApiUrl() {
  return API_URL;
}

function isNgrokHost() {
  if (typeof window !== "undefined") {
    return window.location.hostname.includes("ngrok");
  }
  return API_URL.includes("ngrok");
}

function requestBase() {
  return getClientRequestBase();
}

function withNgrokHeaders(headers: Headers) {
  if (isNgrokHost()) {
    headers.set("ngrok-skip-browser-warning", "1");
  }
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  withNgrokHeaders(headers);

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${requestBase()}${path}`, {
    ...options,
    headers,
  });
}

export async function fetchApiHealth() {
  const headers = new Headers();
  withNgrokHeaders(headers);
  return fetch(`${requestBase()}/health`, { headers });
}
