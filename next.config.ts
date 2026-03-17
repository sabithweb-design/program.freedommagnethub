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
  // Minor change to trigger chunk re-evaluation and manifest refresh
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
