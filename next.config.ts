import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: { 
    unoptimized: true 
  },
  // Ensure the app directory is the primary focus
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
