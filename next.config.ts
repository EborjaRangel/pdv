import type { NextConfig } from "next";

const apiProxy =
  process.env.API_PROXY_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

const tunnelHost = (() => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.ngrok-free.dev",
    "*.ngrok-free.app",
    ...(tunnelHost ? [tunnelHost] : []),
  ],
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiProxy}/api/:path*` },
      { source: "/health", destination: `${apiProxy}/health` },
    ];
  },
};

export default nextConfig;
