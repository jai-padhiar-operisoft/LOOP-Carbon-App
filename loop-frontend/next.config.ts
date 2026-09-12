import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
      {
        source: "/avatars/:path*",
        destination: "http://localhost:8000/avatars/:path*",
      },
    ];
  },
};

export default nextConfig;
