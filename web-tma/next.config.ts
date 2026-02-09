import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use 'any' to bypass the strict, often lagging, type definitions
  // but keep the logic that makes HMR work over tunnels
  experimental: {
    allowedDevOrigins: ["artistic-marcelene-parodiable.ngrok-free.dev"],
  } as any,

  devIndicators: {
    // If your version doesn't support buildActivity, 
    // simply setting the position is the safest 'valid' way to keep the object
    position: 'bottom-right',
  },
  
  // Keep your logic for the HMR WebSocket if you're using Option 1 (Webpack)
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.devServer = {
        ...config.devServer,
        client: {
          webSocketURL: 'wss://artistic-marcelene-parodiable.ngrok-free.dev/_next/webpack-hmr',
        },
      };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // Fallback to localhost only in development
        destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;