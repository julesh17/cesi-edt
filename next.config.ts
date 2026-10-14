// FICHIER : next.config.ts (racine du projet)
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'peoplespheres.com',
      },
    ],
  },
};

export default nextConfig;
