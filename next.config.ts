import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the workspace root so a stray lockfile in a parent folder isn't picked up.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
