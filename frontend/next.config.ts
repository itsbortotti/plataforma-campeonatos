import type { NextConfig } from "next";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4006";

// Compatível com o Next (scripts e estilos inline) e com o iframe do YouTube.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com https://lh3.googleusercontent.com https://*.supabase.co https://*.onrender.com https://sflcampeonato.com.br https://www.sflcampeonato.com.br http://127.0.0.1:4006 http://localhost:4006",
  "font-src 'self' data:",
  "connect-src 'self' https://*.onrender.com https://www.googleapis.com https://sflcampeonato.com.br https://www.sflcampeonato.com.br http://127.0.0.1:4006 http://localhost:4006 ws://127.0.0.1:3000 ws://localhost:3000",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com",
  "media-src 'self' blob: https://www.youtube.com",
  "worker-src 'self'",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=15552000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "lh3.googleusercontent.com" },
      { hostname: "i.ytimg.com" },
      { hostname: "img.youtube.com" },
      { hostname: "127.0.0.1" },
      { hostname: "localhost" },
      { hostname: "*.onrender.com" },
      { hostname: "sflcampeonato.com.br" },
      { hostname: "www.sflcampeonato.com.br" },
      { hostname: "*.supabase.co" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API}/api/:path*`,
      },
      {
        source: "/health",
        destination: `${API}/health`,
      },
    ];
  },
};

export default nextConfig;
