import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.1.7", "localhost", "127.0.0.1"],
  images: {
    localPatterns: [
      {
        pathname: "/**",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static-meclivros.mec.gov.br",
      },
    ],
  },
};

export default nextConfig;
