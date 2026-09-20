import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow this PC's local-network address to load the development client/HMR.
  // This affects `next dev` only; production builds are unchanged.
  allowedDevOrigins: ["192.168.0.18", "127.0.0.1"],
  async headers() {
    return [
      {
        source: "/maps/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
};

export default nextConfig;
