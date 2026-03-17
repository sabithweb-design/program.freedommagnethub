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
  // Explicitly set reactStrictMode and trigger chunk manifest refresh
  reactStrictMode: true,
  poweredByHeader: false,
  // Minor change to trigger chunk re-evaluation and manifest refresh
};

export default nextConfig;
