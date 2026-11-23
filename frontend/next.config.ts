import type { NextConfig } from "next";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4006";

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
    ],
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
