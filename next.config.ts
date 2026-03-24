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
  // Manifest refresh triggered at: 2025-03-24T12:00:00Z
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Allow development resources to be loaded in the Cloud Workstation environment
    allowedDevOrigins: [
      "*.cloudworkstations.dev",
      "localhost:9002"
    ]
  }
};

export default nextConfig;
