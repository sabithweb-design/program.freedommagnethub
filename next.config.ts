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
  // Manifest refresh triggered at: 2024-05-20T12:00:00Z
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
